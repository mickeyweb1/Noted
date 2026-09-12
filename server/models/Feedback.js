import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  email: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['Bug Report', 'Feature Request', 'General Praise'], 
    required: true 
  },
  rating: { type: Number, min: 1, max: 5, required: true },
  message: { type: String, required: true, maxlength: 1000 },
  status: { type: String, enum: ['new', 'read'], default: 'new' }
}, { timestamps: true });

export const Feedback = mongoose.model('Feedback', feedbackSchema);