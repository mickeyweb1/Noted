import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  // ✅ Made optional so guests on the Contact Page can submit without being logged in
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
  
  // ✅ Added 'guest' to the allowed roles
  userRole: { type: String, enum: ['student', 'school_admin', 'personal_user', 'super_admin', 'guest'], default: 'guest' },
  
  userName: { type: String, required: true }, 
  
  // ✅ Now required so we have a way to reply to contact form users
  contactEmail: { type: String, required: true, trim: true }, 
  contactPhone: { type: String, trim: true },
  
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  
  status: { type: String, enum: ['pending', 'in_progress', 'resolved'], default: 'pending' },
  adminReply: { type: String, default: '' }, 
}, { timestamps: true });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
