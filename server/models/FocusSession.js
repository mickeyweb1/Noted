import mongoose from 'mongoose';

const focusSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  durationMinutes: { type: Number, required: true, min: 1, max: 180 },
  startedAt: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['active', 'completed', 'cancelled', 'expired'], default: 'active' },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

focusSessionSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);
focusSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export const FocusSession = mongoose.model('FocusSession', focusSessionSchema);
