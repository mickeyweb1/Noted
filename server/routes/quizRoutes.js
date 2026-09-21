import express from 'express';
import { Quiz } from '../models/Quiz.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { generateWithGroq } from '../config/grok.js';
import { requireUser } from '../middleware/auth.js';

const router = express.Router();

// ✅ Generate access codes
const generateAccessCode = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// 🎯 AI Generate Questions
router.post('/generate-ai', requireUser, async (req, res) => {
  try {
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

    const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
    
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
      createdBy: req.user._id
    });

    res.json({ success: true, data: quiz, accessCodes });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

//  Manual Questions (with AI autocomplete)
router.post('/create-manual', requireUser, async (req, res) => {
  try {
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

      const parsed = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
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
      createdBy: req.user._id
    });

    res.json({ success: true, data: quiz, accessCodes });
  } catch (error) {
    console.error('Manual creation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

//  Validate access code and get quiz
router.post('/validate-code', async (req, res) => {
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🎯 Submit quiz answers
router.post('/submit', async (req, res) => {
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
      const isCorrect = question.correctAnswer === ans.selectedAnswer;
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🎯 Get quiz results (Admin only)
router.get('/:id/results', requireUser, async (req, res) => {
  try {
    const submissions = await QuizSubmission.find({ quiz: req.params.id })
      .populate('quiz', 'title')
      .sort({ submittedAt: -1 });

    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 🎯 Get all quizzes (Admin)
router.get('/admin/quizzes', requireUser, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ createdBy: req.user._id })
      .select('title difficulty numberOfStudents createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: quizzes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;