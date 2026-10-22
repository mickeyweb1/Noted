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
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    selectedAnswer: String
  }],
  
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24 hours
});

export const QuizSession = mongoose.model('QuizSession', sessionSchema);
