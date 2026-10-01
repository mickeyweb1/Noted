import express from 'express';
import { SupportTicket } from '../models/SupportTicket.js';
import { protect } from '../middleware/protect.js';

const router = express.Router();

// 🎯 1. Submit a new Support Ticket
router.post('/ticket', protect, async (req, res, next) => {
  try {
    const { subject, message, contactEmail, contactPhone } = req.body;
    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required.' });
    }

    const newTicket = await SupportTicket.create({
      userId: req.user._id,
      userRole: req.user.role,
      userName: req.user.fullName || req.user.email,
      contactEmail: contactEmail || req.user.email,
      contactPhone: contactPhone || '',
      subject,
      message,
      status: 'pending'
    });

    res.json({ success: true, message: 'Support ticket submitted successfully!', data: newTicket });
  } catch (error) {
    next(error);
  }
});

// 🎯 2. Get all Support Tickets (✅ TEMPORARY FIX: Allows school_admin too)
router.get('/tickets', protect, async (req, res, next) => {
  try {
    // ✅ CHANGED THIS LINE to allow school_admin to see tickets for testing
    if (req.user.role !== 'super_admin' && req.user.role !== 'school_admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const tickets = await SupportTicket.find().sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
});

// 🎯 3. Update a Ticket Status / Add Reply
router.patch('/tickets/:id', protect, async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin' && req.user.role !== 'school_admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const { status, adminReply } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (adminReply !== undefined) updateData.adminReply = adminReply;

    const updatedTicket = await SupportTicket.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedTicket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    res.json({ success: true, message: 'Ticket updated successfully!', data: updatedTicket });
  } catch (error) {
    next(error);
  }
});

export default router;
