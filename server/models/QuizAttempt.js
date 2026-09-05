import mongoose from "mongoose";

const quizAttemptSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true }, // Links to the generated quiz
  title: { type: String, required: true },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  percentage: { type: Number, required: true },
  answers: [{
    question: String,
    selected: String,
    correct: String,
    isCorrect: Boolean
  }]
}, { timestamps: true });

export const QuizAttempt = mongoose.model("QuizAttempt", quizAttemptSchema);