import { Feedback } from '../models/Feedback.js';
import { sendFeedbackNotification } from '../utils/sendEmail.js'; // ✅ Import the email function

// @desc    Submit new feedback
// @route   POST /api/feedback
export const submitFeedback = async (req, res, next) => {
  try {
    const { type, rating, message } = req.body;
    const user = req.user; // Comes from the 'protect' middleware

    if (!type || !rating || !message) {
      return res.status(400).json({ success: false, message: "Please fill in all fields." });
    }

    // 1. Save to Database
    const newFeedback = await Feedback.create({
      userId: user._id,
      studentName: user.fullName,
      email: user.email,
      type,
      rating,
      message
    });

    // 2. Send Email Notification (The magic part!)
    // We do this in the background so it doesn't slow down the UI
    sendFeedbackNotification(user.fullName, type, rating, message).catch(err => {
      console.error("Email notification failed:", err.message);
    });

    res.status(201).json({ 
      success: true, 
      message: "Thank you for your feedback! It has been sent to the admin." 
    });

  } catch (error) {
    next(error);
  }
};

// @desc    Get all feedback (For Admin Dashboard)
// @route   GET /api/feedback
export const getAllFeedback = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: feedbacks });
  } catch (error) {
    next(error);
  }
};