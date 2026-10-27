import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  startTime: { type: Number, required: true }, // Changed to Number to match Date.now()
  tabSwitchCount: { type: Number, default: 0 },
  
  // ✅ NEW: Fields to allow cross-device resume
  studentName: { type: String },
  studentSurname: { type: String },
  studentClass: { type: String },
  progressSavedAt: { type: Date },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedAnswer: String
  }],
  
  // Keep an unfinished attempt resumable for as long as its access code is valid.
  createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 }
});

export const QuizSession = mongoose.model('QuizSession', sessionSchema);
