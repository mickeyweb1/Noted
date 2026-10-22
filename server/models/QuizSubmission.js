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
  gameMode: { type: String, enum: ['test', 'gameShow'], default: 'test' },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  maxScore: { type: Number }, // ✅ NEW: For game show percentage calculation
  timeTaken: { type: Number, required: true },
  tabSwitchCount: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now }
});

submissionSchema.index({ quiz: 1, accessCode: 1 }, { unique: true });

export const QuizSubmission = mongoose.model('QuizSubmission', submissionSchema);
