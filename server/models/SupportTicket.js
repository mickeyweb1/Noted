import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userRole: { type: String, enum: ['student', 'school_admin', 'personal_user', 'super_admin'], required: true },
  userName: { type: String, required: true },
  
  // ✅ Optional contact info for follow-up
  contactEmail: { type: String, trim: true },
  contactPhone: { type: String, trim: true },
  
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  
  status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
  adminReply: { type: String, default: '' }, // For when you reply to them later
}, { timestamps: true });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
