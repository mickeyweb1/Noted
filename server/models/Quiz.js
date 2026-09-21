import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['Basic', 'Intermediate', 'Hard', 'Max'], required: true },
  timeLimit: { type: Number, required: true }, // in minutes
  timeType: { type: String, enum: ['perQuestion', 'total'], default: 'total' },
  numberOfStudents: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String }
  }],
  accessCodes: [{ type: String }], // 10-digit codes
  createdAt: { type: Date, default: Date.now }
});

export const Quiz = mongoose.model('Quiz', quizSchema);