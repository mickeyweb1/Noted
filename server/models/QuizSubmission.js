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
  tabSwitchCount: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now }
});

// One submission per access code. A double-click / double-request now fails
// with a duplicate-key error (handled in /submit) instead of saving twice.
// NOTE: if you already have duplicate submissions in the database, MongoDB
// can't build this index until you delete the duplicates.
submissionSchema.index({ quiz: 1, accessCode: 1 }, { unique: true });

export const QuizSubmission = mongoose.model('QuizSubmission', submissionSchema);
