import mongoose from 'mongoose';

const rateLimitCounterSchema = new mongoose.Schema({
  _id: { type: String },
  hits: { type: Number, required: true, default: 0 },
  resetAt: { type: Date, required: true }
}, { versionKey: false });

rateLimitCounterSchema.index({ resetAt: 1 }, { expireAfterSeconds: 0 });

export const RateLimitCounter = mongoose.model('RateLimitCounter', rateLimitCounterSchema);
