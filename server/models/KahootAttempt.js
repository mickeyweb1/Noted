import mongoose from 'mongoose';

const kahootAnswerSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  questionIndex: { type: Number, required: true },
  selectedIndex: { type: Number, default: null },
  selectedAnswer: { type: String, default: '' },
  isCorrect: { type: Boolean, default: false },
  timedOut: { type: Boolean, default: false },
  points: { type: Number, default: 0 },
  timeTakenMs: { type: Number, default: 0 },
  answeredAt: { type: Date, default: Date.now },
}, { _id: false });

const kahootAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
    index: true,
  },
  // The individual access code assigned to this student.
  code: { type: String, required: true, uppercase: true, trim: true },
  // Stable browser/session identifier used only to resume this code's attempt.
  // It is not an authentication credential and must never be exposed in host results.
  playerKey: { type: String, required: true, trim: true, maxlength: 80 },
  studentName: { type: String, required: true, trim: true, maxlength: 40 },
  status: {
    type: String,
    enum: ['waiting', 'in_progress', 'feedback', 'completed'],
    default: 'waiting',
    index: true,
  },
  currentQuestionIndex: { type: Number, default: 0, min: 0 },
  currentQuestionAnswered: { type: Boolean, default: false },
  answers: { type: [kahootAnswerSchema], default: [] },
  score: { type: Number, default: 0, min: 0 },
  correctCount: { type: Number, default: 0, min: 0 },
  questionStartedAt: { type: Date, default: null },
  questionEndsAt: { type: Date, default: null },
  feedbackEndsAt: { type: Date, default: null },
  lastResult: { type: mongoose.Schema.Types.Mixed, default: null },
  startedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  lastSeenAt: { type: Date, default: Date.now },
  submissionSavedAt: { type: Date, default: null },
  submissionSaveAttempts: { type: Number, default: 0, min: 0 },
  submissionSaveError: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });

// A code can create exactly one attempt. A matching playerKey can reconnect to it.
kahootAttemptSchema.index({ quiz: 1, code: 1 }, { unique: true });
kahootAttemptSchema.index({ quiz: 1, status: 1, updatedAt: -1 });
kahootAttemptSchema.index({ status: 1, submissionSavedAt: 1, completedAt: 1 });

export const KahootAttempt = mongoose.model('KahootAttempt', kahootAttemptSchema);
