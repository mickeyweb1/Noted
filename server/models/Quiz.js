import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true },
  difficulty: { type: String, enum: ['Basic', 'Intermediate', 'Hard', 'Max'], required: true },
  timeLimit: { type: Number, required: true },
  timeUnit: { type: String, enum: ['minutes', 'seconds'], default: 'minutes' },
  timeType: { type: String, enum: ['perQuestion', 'total'], default: 'total' },
  maxTabSwitches: { type: Number, default: null },
  numberOfStudents: { type: Number, required: true },
  gameMode: { type: String, enum: ['test', 'gameShow'], default: 'test' },
  baseMarks: { type: Number, default: 10 },
  bonusMarks: { type: Number, default: 5 },
  
  // ✅ ADD THIS NEW FIELD HERE:
  layoutMode: { 
    type: String, 
    enum: ['scroll', 'paginated'], 
    default: 'scroll' 
  },
  showAnswersAfterSubmission: { type: Boolean, default: true },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },
    explanation: { type: String },
    imageUrl: { type: String }
  }],
  accessCodes: [{
    code: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

quizSchema.index({ 'accessCodes.code': 1 });

export const Quiz = mongoose.model('Quiz', quizSchema);
