import mongoose from 'mongoose';

const quizShareSchema = new mongoose.Schema({
  shareCode: { type: String, required: true, unique: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true }],
  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const QuizShare = mongoose.model('QuizShare', quizShareSchema);