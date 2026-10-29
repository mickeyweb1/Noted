import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    category: {
      type: String,
      enum: ['exam', 'quiz', 'assignment', 'project', 'homework', 'other'],
      default: 'assignment',
    },
    maxScore: { type: Number, required: true, min: 0.1 },
    weight: { type: Number, default: 1, min: 0 },
    score: { type: Number, default: null }, // null = pending/unscored; 0 = actual zero
    date: { type: Date, default: Date.now },
    feedback: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true }
);

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    code: { type: String, trim: true, maxlength: 30, default: '' },
    color: { type: String, default: '#4F46E5', maxlength: 30 },
    targetScore: { type: Number, min: 0, max: 100, default: null },
    creditHours: { type: Number, min: 0.5, max: 20, default: 1 },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    linkedContentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
    assessments: [assessmentSchema],
  },
  { timestamps: true }
);

const academicTermSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    year: { type: String, required: true, trim: true, maxlength: 30 },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    isCurrent: { type: Boolean, default: false },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    subjects: [subjectSchema],
  },
  { timestamps: true }
);

academicTermSchema.index({ userId: 1, year: 1, name: 1 });

export const AcademicTerm = mongoose.model('AcademicTerm', academicTermSchema);
