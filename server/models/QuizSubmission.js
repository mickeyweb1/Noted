import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  studentName: { type: String, required: true },
  studentSurname: { type: String, required: true },
  studentClass: { type: String },
  accessCode: { type: String, required: true },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedAnswer: String,
    isCorrect: Boolean
  }],
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeTaken: { type: Number, required: true }, // in seconds
  tabSwitchCount: { type: Number, default: 0 }, // ✅ NEW
  submittedAt: { type: Date, default: Date.now }
});

export const QuizSubmission = mongoose.model('QuizSubmission', submissionSchema);