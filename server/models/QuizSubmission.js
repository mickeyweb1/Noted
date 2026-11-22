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
    isCorrect: Boolean,
    confidence: { type: String, enum: ['low', 'medium', 'high'], default: null },
  }],
  gameMode: { type: String, enum: ['test', 'gameShow', 'kahoot'], default: 'test' },
  score: { type: Number, required: true },
  maxScore: { type: Number },
  gamePoints: { type: Number, default: 0 },
  totalQuestions: { type: Number, required: true },
  timeTaken: { type: Number, required: true },
  tabSwitchCount: { type: Number, default: 0 },
  isLate: { type: Boolean, default: false },
  submittedAt: { type: Date, default: Date.now },
});

submissionSchema.index({ quiz: 1, accessCode: 1 }, { unique: true });

export const QuizSubmission = mongoose.model('QuizSubmission', submissionSchema);
