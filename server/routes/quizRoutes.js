import express from 'express';
import { Quiz } from '../models/Quiz.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { generateWithGroq } from '../config/grok.js';

const router = express.Router();

// ✅ Define requireUser directly here to avoid missing file errors
const requireUser = (req) => {
  if (!req.user?._id) {
    const error = new Error("Not authorized.");
    error.status = 401;
    throw error;
  }
  return req.user._id;
};

// ✅ Generate access codes helper
const generateAccessCode = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// 🎯 AI Generate Questions
router.post('/generate-ai', async (req, res, next) => {
  try {
    const userId = requireUser(req);
    const { notes, difficulty, numQuestions, numStudents, timeLimit, timeType, title } = req.body;
    
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
    
    // Generate unique access codes
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

// 🎯 Manual Questions (with AI autocomplete)
router.post('/create-manual', async (req, res, next) => {
  try {
    const userId = requireUser(req);
    const { title, difficulty, numQuestions, numStudents, timeLimit, timeType, questions, useAIAutocomplete } = req.body;
    
    let finalQuestions = questions || [];
    
    // If using AI autocomplete and questions array is incomplete
    if (useAIAutocomplete && finalQuestions.length < numQuestions) {
      const remainingCount = numQuestions - finalQuestions.length;
      
      const systemPrompt = `Generate ${remainingCount} additional multiple-choice questions.
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
        { role: 'system', content: systemPrompt }
      ], { max_tokens: 4096 });

      const cleaned = response.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      finalQuestions = [...finalQuestions, ...parsed.questions];
    }

    // Generate access codes
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

// 🎯 Validate access code and get quiz (NO AUTH REQUIRED for students)
router.post('/validate-code', async (req, res, next) => {
  try {
    const { code } = req.body;
    
    const quiz = await Quiz.findOne({ accessCodes: code });
    
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Invalid access code' });
    }

    // Check if this code has already been used
    const existingSubmission = await QuizSubmission.findOne({ 
      quiz: quiz._id, 
      accessCode: code 
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
        timeType: quiz.timeType,
        questions: quiz.questions.map(q => ({
          _id: q._id,
          question: q.question,
          options: q.options
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
    
    const quiz = await Quiz.findOne({ accessCodes: code });
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Invalid access code' });
    }

    // Calculate score
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
      accessCode: code,
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

// 🎯 Get quiz results (Admin only)
router.get('/:id/results', async (req, res, next) => {
  try {
    requireUser(req); // Ensure only logged-in admins can see this
    const submissions = await QuizSubmission.find({ quiz: req.params.id })
      .populate('quiz', 'title')
      .sort({ submittedAt: -1 });

    res.json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
});

// 🎯 Get all quizzes (Admin only)
router.get('/admin/quizzes', async (req, res, next) => {
  try {
    const userId = requireUser(req);
    const quizzes = await Quiz.find({ createdBy: userId })
      .select('title difficulty numberOfStudents createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: quizzes });
  } catch (error) {
    next(error);
  }
});

export default router;
