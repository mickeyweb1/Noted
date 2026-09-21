import express from 'express';
import { Quiz } from '../models/Quiz.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { generateWithGroq } from '../config/grok.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/protect.js'; // ✅ CRITICAL FIX: Import the protect middleware

const router = express.Router();

// ✅ Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './public/uploads/quizzes';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'question-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// ✅ Generate alphanumeric access codes (e.g., "A7K9M2P4Q1")
const generateAccessCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// 🎯 AI Generate Questions (✅ ADDED protect middleware)
router.post('/generate-ai', protect, async (req, res, next) => {
  try {
    const userId = req.user._id; // ✅ Now this will work because 'protect' ran first!
    const { notes, difficulty, numQuestions, numStudents, timeLimit, timeUnit, timeType, title } = req.body;
    
    const systemPrompt = `You are an expert examiner. Generate ${numQuestions} multiple-choice questions based on the provided notes.
    Difficulty: ${difficulty}
    
    Output format (VALID JSON ONLY):
    {
      "questions": [
        {
          "question": "Question text?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Why this is correct"
        }
      ]
    }`;

    const response = await generateWithGroq([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Notes:\n${notes}` }
    ], { max_tokens: 4096 });

    const cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    const accessCodes = [];
    for (let i = 0; i < numStudents; i++) {
      let code = generateAccessCode();
      while (accessCodes.includes(code)) {
        code = generateAccessCode();
      }
      accessCodes.push(code);
    }

    const quiz = await Quiz.create({
      title,
      difficulty,
      timeLimit,
      timeUnit,
      timeType,
      numberOfStudents: numStudents,
      questions: parsed.questions,
      accessCodes,
      createdBy: userId
    });

    res.json({ success: true, data: quiz, accessCodes });
  } catch (error) {
    console.error('AI generation error:', error);
    next(error);
  }
});

// 🎯 Manual Questions (✅ ADDED protect middleware)
router.post('/create-manual', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { title, difficulty, numQuestions, numStudents, timeLimit, timeUnit, timeType, questions, useAIAutocomplete } = req.body;
    
    let finalQuestions = questions || [];
    
    if (useAIAutocomplete && finalQuestions.length < numQuestions) {
      const remainingCount = numQuestions - finalQuestions.length;
      const systemPrompt = `Generate ${remainingCount} additional multiple-choice questions. Difficulty: ${difficulty}. Output VALID JSON ONLY with "questions" array.`;

      const response = await generateWithGroq([
        { role: 'system', content: systemPrompt }
      ], { max_tokens: 4096 });

      const cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      finalQuestions = [...finalQuestions, ...parsed.questions];
    }

    const accessCodes = [];
    for (let i = 0; i < numStudents; i++) {
      let code = generateAccessCode();
      while (accessCodes.includes(code)) {
        code = generateAccessCode();
      }
      accessCodes.push(code);
    }

    const quiz = await Quiz.create({
      title,
      difficulty,
      timeLimit,
      timeUnit,
      timeType,
      numberOfStudents: numStudents,
      questions: finalQuestions,
      accessCodes,
      createdBy: userId
    });

    res.json({ success: true, data: quiz, accessCodes });
  } catch (error) {
    console.error('Manual creation error:', error);
    next(error);
  }
});

// 🎯 Image Upload Endpoint (✅ ADDED protect middleware)
router.post('/upload/quiz-image', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/quizzes/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🎯 Validate access code and get quiz (NO AUTH REQUIRED for students)
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

// 🎯 Submit quiz answers (NO AUTH REQUIRED for students)
router.post('/submit', async (req, res, next) => {
  try {
    const { code, studentName, studentSurname, studentClass, answers, timeTaken } = req.body;
    
    const quiz = await Quiz.findOne({ accessCodes: code.toUpperCase() });
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Invalid access code' });
    }

    let score = 0;
    const submissionAnswers = answers.map(ans => {
      const question = quiz.questions.id(ans.questionId);
      const isCorrect = question && question.correctAnswer === ans.selectedAnswer;
      if (isCorrect) score++;
      
      return {
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        isCorrect
      };
    });

    await QuizSubmission.create({
      quiz: quiz._id,
      studentName,
      studentSurname,
      studentClass,
      accessCode: code.toUpperCase(),
      answers: submissionAnswers,
      score,
      totalQuestions: quiz.questions.length,
      timeTaken
    });

    res.json({ success: true, message: 'Quiz submitted successfully!', score, totalQuestions: quiz.questions.length });
  } catch (error) {
    next(error);
  }
});

// 🎯 Get all quizzes for admin (✅ ADDED protect middleware)
router.get('/admin/quizzes', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const quizzes = await Quiz.find({ createdBy: userId })
      .select('title difficulty numberOfStudents createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
});

// 🎯 Get quiz results by quiz ID (✅ ADDED protect middleware)
router.get('/:id/results', protect, async (req, res, next) => {
  try {
    const submissions = await QuizSubmission.find({ quiz: req.params.id })
      .sort({ submittedAt: -1 });

    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
});

export default router;
