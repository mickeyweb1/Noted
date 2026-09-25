import express from 'express';
import { Quiz } from '../models/Quiz.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { QuizSession } from '../models/QuizSession.js';
import { generateWithGroq } from '../config/grok.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/protect.js';

const router = express.Router();

// ... (Keep your existing multer configuration exactly as it is) ...
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './public/uploads/quizzes';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'question-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    if (allowedTypes.test(path.extname(file.originalname).toLowerCase()) && allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// ✅ UPDATED: Generates codes with T- or G- prefix
const generateAccessCode = (mode = 'test') => {
  const prefix = mode === 'gameShow' ? 'G-' : 'T-';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};


// 🎯 1. AI Generate Questions PREVIEW (Does not save to DB yet, allows review)
router.post('/generate-ai-preview', protect, async (req, res, next) => {
  try {
    const { notes, difficulty, numQuestions } = req.body;
    const systemPrompt = `You are an expert examiner. Generate ${numQuestions} multiple-choice questions based on the provided notes. Difficulty: ${difficulty}. Output VALID JSON ONLY: { "questions": [{ "question": "Text?", "options": ["A", "B", "C", "D"], "correctAnswer": "A", "explanation": "Why" }] }`;
    const response = await generateWithGroq([{ role: 'system', content: systemPrompt }, { role: 'user', content: `Notes:\n${notes}` }], { max_tokens: 4096 });
    const cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    res.json({ success: true, data: { questions: parsed.questions } });
  } catch (error) {
    next(error);
  }
});

// 🎯 2. Finalize Quiz (Saves to DB with filtered questions)
router.post('/create-manual', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { title, difficulty, numQuestions, numStudents, timeLimit, timeUnit, timeType, maxTabSwitches, questions, gameMode = 'test', baseMarks = 10, bonusMarks = 5 } = req.body;
    
    const accessCodes = [];
    for (let i = 0; i < numStudents; i++) {
      let code = generateAccessCode(gameMode); // ✅ Pass the mode here
      while (accessCodes.includes(code)) code = generateAccessCode(gameMode);
      accessCodes.push(code);
    }

    const quiz = await Quiz.create({
      title, difficulty, timeLimit, timeUnit, timeType, maxTabSwitches: maxTabSwitches || null,
      numberOfStudents: numStudents, 
      gameMode, baseMarks, bonusMarks, // ✅ Save the new fields
      questions, accessCodes, createdBy: userId
    });
    res.json({ success: true, data: quiz, accessCodes });
  } catch (error) {
    next(error);
  }
});


// 🎯 3. Start Quiz Session (Server-side timer & anti-cheat init)
router.post('/session/start', async (req, res, next) => {
  try {
    const { code } = req.body;
    const quiz = await Quiz.findOne({ accessCodes: code.toUpperCase() });
    if (!quiz) return res.status(404).json({ success: false, message: 'Invalid access code' });
    
    const existingSubmission = await QuizSubmission.findOne({ quiz: quiz._id, accessCode: code.toUpperCase() });
    if (existingSubmission) return res.status(400).json({ success: false, message: 'This code has already been used.' });

    const session = await QuizSession.create({
      code: code.toUpperCase(),
      quizId: quiz._id,
      startTime: Date.now(),
      tabSwitchCount: 0
    });

    res.json({ 
      success: true, 
      data: { 
        startTime: session.startTime, 
        maxTabSwitches: quiz.maxTabSwitches,
        timeLimit: quiz.timeLimit,
        timeUnit: quiz.timeUnit,
        timeType: quiz.timeType,
        title: quiz.title,
        difficulty: quiz.difficulty,
        questions: quiz.questions.map(q => ({ _id: q._id, question: q.question, options: q.options, imageUrl: q.imageUrl }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// 🎯 4. Update Tab Switch Count (Anti-cheat)
router.post('/session/update-tab', async (req, res, next) => {
  try {
    const { code } = req.body;
    const session = await QuizSession.findOne({ code: code.toUpperCase() });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    session.tabSwitchCount += 1;
    await session.save();

    const quiz = await Quiz.findById(session.quizId);
    const shouldAutoSubmit = quiz.maxTabSwitches && session.tabSwitchCount >= quiz.maxTabSwitches;

    res.json({ success: true, tabSwitchCount: session.tabSwitchCount, shouldAutoSubmit });
  } catch (error) {
    next(error);
  }
});

// 🎯 5. Submit Quiz (Strict validation)
router.post('/submit', async (req, res, next) => {
  try {
    const { code, studentName, studentSurname, studentClass, answers } = req.body;
    const session = await QuizSession.findOne({ code: code.toUpperCase() });
    if (!session) return res.status(404).json({ success: false, message: 'Invalid or expired session.' });

    const quiz = await Quiz.findById(session.quizId);
    const timeTakenSeconds = Math.floor((Date.now() - session.startTime) / 1000);

    let score = 0;
    const submissionAnswers = answers.map(ans => {
      const question = quiz.questions.id(ans.questionId);
      const isCorrect = question && question.correctAnswer === ans.selectedAnswer;
      if (isCorrect) score++;
      return { questionId: ans.questionId, selectedAnswer: ans.selectedAnswer, isCorrect };
    });

    await QuizSubmission.create({
      quiz: quiz._id, studentName, studentSurname, studentClass, accessCode: code.toUpperCase(),
      answers: submissionAnswers, score, totalQuestions: quiz.questions.length,
      timeTaken: timeTakenSeconds, tabSwitchCount: session.tabSwitchCount
    });

    await QuizSession.deleteOne({ _id: session._id }); // Destroy session so code can't be reused

    res.json({ success: true, message: 'Quiz submitted successfully!', score, totalQuestions: quiz.questions.length, tabSwitchCount: session.tabSwitchCount });
  } catch (error) {
    next(error);
  }
});

// 🎯 6. Regenerate a single new code for an existing quiz
router.post('/:id/regenerate-code', protect, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found' });
    
    let newCode = generateAccessCode();
    while (quiz.accessCodes.includes(newCode)) newCode = generateAccessCode();
    
    quiz.accessCodes.push(newCode);
    quiz.numberOfStudents += 1;
    await quiz.save();
    
    res.json({ success: true, newCode });
  } catch (error) {
    next(error);
  }
});

// 🎯 7. Get detailed results (includes answers for breakdown)
router.get('/:id/results', protect, async (req, res, next) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    const submissions = await QuizSubmission.find({ quiz: req.params.id }).sort({ submittedAt: -1 });
    res.json({ success: true, data: { quiz, submissions } });
  } catch (error) {
    next(error);
  }
});

// ... (Keep your existing /upload/quiz-image, /admin/quizzes endpoints as they were) ...
router.post('/upload/quiz-image', protect, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({ success: true, imageUrl: `/uploads/quizzes/${req.file.filename}` });
});

router.get('/admin/quizzes', protect, async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user._id }).select('title difficulty numberOfStudents createdAt').sort({ createdAt: -1 });
    res.json({ success: true, data: quizzes });
  } catch (error) { next(error); }
});

// 🎯 Validate access code and get quiz info (NO AUTH REQUIRED for students)
router.post('/validate-code', async (req, res, next) => {
  try {
    const { code } = req.body;
    const quiz = await Quiz.findOne({ accessCodes: code.toUpperCase() });
    
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Invalid access code' });
    }

    const existingSubmission = await QuizSubmission.findOne({ 
      quiz: quiz._id, 
      accessCode: code.toUpperCase() 
    });

    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'This access code has already been used' 
      });
    }

    res.json({ 
      success: true, 
      data: {
        title: quiz.title,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        timeUnit: quiz.timeUnit,
        timeType: quiz.timeType,
        maxTabSwitches: quiz.maxTabSwitches,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          imageUrl: q.imageUrl
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});


export default router;