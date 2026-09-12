import { QuizAttempt } from '../models/QuizAttempt.js';

// Save a completed quiz attempt
export const saveQuizAttempt = async (req, res, next) => {
  try {
    const { contentId, title, score, totalQuestions, percentage, answers } = req.body;
    
    const newAttempt = await QuizAttempt.create({
      userId: req.user._id,
      contentId,
      title,
      score,
      totalQuestions,
      percentage,
      answers
    });

    res.status(201).json({ success: true, data: newAttempt });
  } catch (error) {
    next(error);
  }
};

// Get attempts for a specific quiz (for the "View" button)
export const getQuizAttempt = async (req, res, next) => {
  try {
    const attempt = await QuizAttempt.findOne({ 
      _id: req.params.id, 
      userId: req.user._id 
    });
    
    if (!attempt) {
      const error = new Error("Attempt not found"); error.status = 404; throw error;
    }
    res.status(200).json({ success: true, data: attempt });
  } catch (error) {
    next(error);
  }
};