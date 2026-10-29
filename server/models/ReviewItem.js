import mongoose from 'mongoose';

const reviewItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceKey: { type: String, required: true, maxlength: 200 },
  type: { type: String, enum: ['flashcard', 'question'], required: true },
  front: { type: String, required: true, maxlength: 5000 },
  back: { type: String, required: true, maxlength: 5000 },
  sourceTitle: { type: String, default: 'Study item', maxlength: 160 },
  nextReviewDate: { type: Date, required: true, default: Date.now },
  interval: { type: Number, min: 0, default: 0 },
  ease: { type: Number, min: 1.3, default: 2.5 },
  repetitions: { type: Number, min: 0, default: 0 },
  lastResult: { type: String, enum: ['correct', 'incorrect', null], default: null },
  lastReviewedAt: { type: Date, default: null },
}, { timestamps: true });

reviewItemSchema.index({ userId: 1, sourceKey: 1 }, { unique: true });
reviewItemSchema.index({ userId: 1, nextReviewDate: 1 });

export const ReviewItem = mongoose.model('ReviewItem', reviewItemSchema);
