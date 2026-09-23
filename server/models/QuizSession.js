import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  startTime: { type: Date, required: true },
  tabSwitchCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24 hours
});

export const QuizSession = mongoose.model('QuizSession', sessionSchema);