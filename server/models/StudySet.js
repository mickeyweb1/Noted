import mongoose from 'mongoose';

const studySetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 160 },
  subject: { type: String, trim: true, maxlength: 100, default: 'General' },
  source: {
    type: { type: String, enum: ['text', 'upload', 'youtube'], required: true },
    name: { type: String, trim: true, maxlength: 255, default: '' },
    url: { type: String, trim: true, maxlength: 500, default: '' },
  },
  sourceText: { type: String, required: true, maxlength: 50000 },
  notes: {
    summarized: { type: String, required: true, maxlength: 30000 },
    comprehensive: { type: String, required: true, maxlength: 30000 },
  },
  flashcards: [{
    front: { type: String, required: true, maxlength: 2000 },
    back: { type: String, required: true, maxlength: 3000 },
    nextReviewDate: { type: Date, default: Date.now },
    interval: { type: Number, min: 0, default: 0 },
    ease: { type: Number, min: 1.3, default: 2.5 },
    repetitions: { type: Number, min: 0, default: 0 },
    lastResult: { type: String, enum: ['correct', 'incorrect', null], default: null },
    lastReviewedAt: { type: Date, default: null },
  }],
  quiz: [{
    question: { type: String, required: true, maxlength: 2000 },
    options: [{ type: String, required: true, maxlength: 1000 }],
    correctAnswer: { type: String, required: true, maxlength: 1000 },
    explanation: { type: String, maxlength: 3000, default: '' },
  }],
  studyPlan: [{
    task: { type: String, required: true, maxlength: 500 },
    durationMinutes: { type: Number, min: 1, max: 180, required: true },
  }],
  tutorMessages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 5000 },
    mode: { type: String, enum: ['simple', 'exam', 'deep_dive'], default: 'simple' },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

studySetSchema.index({ userId: 1, createdAt: -1 });

export const StudySet = mongoose.model('StudySet', studySetSchema);
