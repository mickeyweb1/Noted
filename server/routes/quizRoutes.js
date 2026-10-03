import express from 'express';
import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { QuizSession } from '../models/QuizSession.js';
import { generateWithGroq } from '../config/grok.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { protect } from '../middleware/protect.js';

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'noted_quizzes',
    allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const generateAccessCode = (mode = 'test') => {
  const prefix = mode === 'gameShow' ? 'G-' : 'T-';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const normalizeCode = (code) => (typeof code === 'string' ? code.trim().toUpperCase() : '');

const getOwnedQuiz = async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ success: false, message: 'Quiz not found' });
    return null;
  }
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) {
    res.status(404).json({ success: false, message: 'Quiz not found' });
    return null;
  }
  if (String(quiz.createdBy) !== String(req.user._id)) {
    res.status(403).json({ success: false, message: 'You do not have access to this quiz' });
    return null;
  }
  return quiz;
};

// 🎯 1. AI Generate Questions PREVIEW
router.post('/generate-ai-preview', protect, async (req, res, next) => {
  try {
    const { notes, difficulty, numQuestions } = req.body;
    if (typeof notes !== 'string' || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide some notes.' });
    }
    const count = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 1), 30);
    
    const systemPrompt = `You are an expert examiner. Generate ${count} multiple-choice questions based on the provided notes. Difficulty: ${difficulty}. 
    Output VALID JSON ONLY in this exact format: 
    { 
      "questions": [
        { 
          "question": "The question text?", 
          "options": ["Exact text of option A", "Exact text of option B", "Exact text of option C", "Exact text of option D"], 
          "correctAnswer": "Exact text of the correct option (MUST exactly match one of the strings in the options array. DO NOT output 'A', 'B', 'C', or 'D')", 
          "explanation": "Brief explanation why" 
        }
      ] 
    }`;
    
    const strictPrompt = systemPrompt + " CRITICAL: Keep explanations to ONE short sentence maximum to fit token limits.";
    
    // ✅ FIX: Dynamic token limit and strict JSON mode
    const response = await generateWithGroq(
      [
        { role: 'system', content: strictPrompt }, 
        { role: 'user', content: `Notes:\n${notes.slice(0, 8000)}` }
      ], 
      { max_tokens: Math.min(150 * count + 200, 3500), json: true } 
    );
    
    let parsed;
    try {
      // ✅ FIX: Safely extract JSON even if the AI adds conversational text
      const jsonStr = response.slice(response.indexOf('{'), response.lastIndexOf('}') + 1);
      parsed = JSON.parse(jsonStr);
      if (!Array.isArray(parsed.questions)) throw new Error('No questions array found');
    } catch (parseError) {
      console.error("❌ AI JSON Parse Error:", parseError);
      console.error("❌ The AI returned this invalid text:", response);
      return res.status(400).json({ 
        success: false, 
        message: "AI generated an invalid response. Please try again with fewer notes or fewer questions." 
      });
    }
    
    res.json({ success: true, data: { questions: parsed.questions } });
  } catch (error) {
    next(error);
  }
});

// 🎯 2. Finalize Quiz
router.post('/create-manual', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { title, difficulty, numStudents, timeLimit, timeUnit, timeType, maxTabSwitches, questions, gameMode = 'test', baseMarks = 10, bonusMarks = 5 } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'A quiz needs at least one question.' });
    }

    const mode = gameMode === 'gameShow' ? 'gameShow' : 'test';
    const studentCount = Math.min(Math.max(parseInt(numStudents, 10) || 1, 1), 500);

    const accessCodes = [];
    for (let i = 0; i < studentCount; i++) {
      let code = generateAccessCode(mode);
      while (accessCodes.includes(code)) code = generateAccessCode(mode);
      accessCodes.push(code);
    }

    const quiz = await Quiz.create({
      title, difficulty, timeLimit, timeUnit, timeType, maxTabSwitches: maxTabSwitches || null,
      numberOfStudents: studentCount,
      gameMode: mode,
      baseMarks: Number(baseMarks) || 10,
      bonusMarks: Number(bonusMarks) || 5,
      questions, accessCodes, createdBy: userId
    });
    res.json({ success: true, data: quiz, accessCodes });
  } catch (error) {
    next(error);
  }
});

// 🎯 3. Start (or RESUME) a Quiz Session
router.post('/session/start', async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    if (!code) return res.status(400).json({ success: false, message: 'Access code is required' });

    const quiz = await Quiz.findOne({ accessCodes: code });
    if (!quiz) return res.status(404).json({ success: false, message: 'Invalid access code' });
    
    const existingSubmission = await QuizSubmission.findOne({ quiz: quiz._id, accessCode: code });
    if (existingSubmission) return res.status(400).json({ success: false, message: 'This code has already been used.' });

    let session = await QuizSession.findOne({ code });
    if (!session) {
      try {
        session = await QuizSession.create({ 
          code, 
          quizId: quiz._id, 
          startTime: Date.now(), 
          tabSwitchCount: 0,
          answers: []
        });
      } catch (err) {
        if (err.code === 11000) session = await QuizSession.findOne({ code });
        else throw err;
      }
    }

    res.json({ 
      success: true, 
      data: { 
        startTime: session.startTime, 
        tabSwitchCount: session.tabSwitchCount,
        maxTabSwitches: quiz.maxTabSwitches,
        timeLimit: quiz.timeLimit,
        timeUnit: quiz.timeUnit,
        timeType: quiz.timeType,
        title: quiz.title,
        difficulty: quiz.difficulty,
        // ✅ FIX: Removed correctAnswer so students can't cheat
        questions: quiz.questions.map(q => ({ 
          _id: q._id, 
          question: q.question, 
          options: q.options, 
          imageUrl: q.imageUrl
        })),
        savedAnswers: session.answers || [],
        savedStudentInfo: session.studentName ? {
          name: session.studentName,
          surname: session.studentSurname,
          className: session.studentClass
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// 🎯 3.5 Save Progress
router.post('/session/save-progress', async (req, res, next) => {
  try {
    const { code, studentName, studentSurname, studentClass, answers } = req.body;
    const normalizedCode = normalizeCode(code);
    
    await QuizSession.findOneAndUpdate(
      { code: normalizedCode },
      { 
        studentName, 
        studentSurname, 
        studentClass, 
        $set: { answers: answers.map(a => ({ questionId: a.questionId, selectedAnswer: a.selectedAnswer })) }
      },
      { new: true }
    );
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// 🎯 4. Update Tab Switch Count
router.post('/session/update-tab', async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    const session = await QuizSession.findOneAndUpdate({ code }, { $inc: { tabSwitchCount: 1 } }, { new: true });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const quiz = await Quiz.findById(session.quizId);
    const shouldAutoSubmit = Boolean(quiz?.maxTabSwitches) && session.tabSwitchCount >= quiz.maxTabSwitches;

    res.json({ success: true, tabSwitchCount: session.tabSwitchCount, shouldAutoSubmit });
  } catch (error) {
    next(error);
  }
});

// 🎯 5. Submit Quiz
router.post('/submit', async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    const { studentName, studentSurname, studentClass, answers } = req.body || {};

    if (!code) return res.status(400).json({ success: false, message: 'Access code is required.' });
    if (typeof studentName !== 'string' || !studentName.trim() || typeof studentSurname !== 'string' || !studentSurname.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your first name and surname.' });
    }
    if (!Array.isArray(answers)) return res.status(400).json({ success: false, message: 'Answers are missing.' });

    const session = await QuizSession.findOne({ code });
    if (!session) return res.status(404).json({ success: false, message: 'Invalid or expired session.' });

    const quiz = await Quiz.findById(session.quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

    const timeTakenSeconds = Math.max(0, Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000));

    const provided = new Map();
    for (const ans of answers) {
      const qid = String(ans?.questionId ?? '');
      if (qid && !provided.has(qid)) provided.set(qid, ans);
    }

    let score = 0;
    const submissionAnswers = quiz.questions.map((question) => {
      const ans = provided.get(String(question._id));
      const selectedAnswer = typeof ans?.selectedAnswer === 'string' ? ans.selectedAnswer : '';
      const isCorrect = selectedAnswer !== '' && selectedAnswer === question.correctAnswer;
      if (isCorrect) score++;
      return { questionId: question._id, selectedAnswer, isCorrect };
    });

    try {
      await QuizSubmission.create({
        quiz: quiz._id,
        studentName: studentName.trim().slice(0, 100),
        studentSurname: studentSurname.trim().slice(0, 100),
        studentClass: typeof studentClass === 'string' ? studentClass.trim().slice(0, 100) : undefined,
        accessCode: code,
        answers: submissionAnswers, score, totalQuestions: quiz.questions.length,
        timeTaken: timeTakenSeconds, tabSwitchCount: session.tabSwitchCount
      });
    } catch (err) {
      if (err.code === 11000) {
        await QuizSession.deleteOne({ _id: session._id });
        return res.status(409).json({ success: false, message: 'This code has already been used.' });
      }
      throw err;
    }

    await QuizSession.deleteOne({ _id: session._id });

    res.json({ success: true, message: 'Quiz submitted successfully!', score, totalQuestions: quiz.questions.length, tabSwitchCount: session.tabSwitchCount });
  } catch (error) {
    next(error);
  }
});

// 🎯 6. Regenerate a single new code
router.post('/:id/regenerate-code', protect, async (req, res, next) => {
  try {
    const quiz = await getOwnedQuiz(req, res);
    if (!quiz) return;
    
    let newCode = generateAccessCode(quiz.gameMode || 'test');
    while (quiz.accessCodes.includes(newCode)) {
      newCode = generateAccessCode(quiz.gameMode || 'test');
    }
    
    quiz.accessCodes.push(newCode);
    quiz.numberOfStudents += 1;
    await quiz.save();
    
    res.json({ success: true, newCode });
  } catch (error) {
    next(error);
  }
});

// 🎯 7. Get detailed results
router.get('/:id/results', protect, async (req, res, next) => {
  try {
    const quiz = await getOwnedQuiz(req, res);
    if (!quiz) return;
    const submissions = await QuizSubmission.find({ quiz: quiz._id }).sort({ submittedAt: -1 });
    res.json({ success: true, data: { quiz, submissions } });
  } catch (error) {
    next(error);
  }
});

// 🎯 8. Upload quiz image to Cloudinary
router.post('/upload/quiz-image', protect, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({ success: true, imageUrl: req.file.path });
});

router.get('/admin/quizzes', protect, async (req, res, next) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .select('title difficulty numberOfStudents createdAt gameMode accessCodes')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: quizzes });
  } catch (error) { 
    next(error); 
  }
});

// 🎯 Validate access code
router.post('/validate-code', async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    if (!code) return res.status(400).json({ success: false, message: 'Access code is required' });

    const quiz = await Quiz.findOne({ accessCodes: code });
    
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Invalid access code' });
    }

    const existingSubmission = await QuizSubmission.findOne({ quiz: quiz._id, accessCode: code });

    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'This access code has already been used' 
      });
    }

    res.json({ 
      success: true, 
      data: {
        quizId: quiz._id.toString(),
        title: quiz.title,
        gameMode: quiz.gameMode,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        timeUnit: quiz.timeUnit,
        timeType: quiz.timeType,
        maxTabSwitches: quiz.maxTabSwitches,
        bonusMarks: quiz.bonusMarks,
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

// 🎯 9. Get Game Show details by code (Admin only)
router.get('/game-show/:code', protect, async (req, res, next) => {
  try {
    const code = normalizeCode(req.params.code);
    const quiz = await Quiz.findOne({ accessCodes: code, createdBy: req.user._id });
    
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Game show not found or you do not have access' });
    }

    res.json({ 
      success: true, 
      data: {
        quizId: quiz._id.toString(),
        title: quiz.title,
        gameMode: quiz.gameMode,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        timeUnit: quiz.timeUnit,
        timeType: quiz.timeType,
        maxTabSwitches: quiz.maxTabSwitches,
        bonusMarks: quiz.bonusMarks,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          question: q.question,
          options: q.options,
          imageUrl: q.imageUrl,
          correctAnswer: q.correctAnswer,  
          explanation: q.explanation 
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
