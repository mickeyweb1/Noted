import { SupportTicket } from '../models/SupportTicket.js';
import { sendContactEmail } from '../utils/sendEmail.js';

export const submitContactForm = async (req, res, next) => {
  try {
    const { firstName, lastName, email, role, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    // ✅ NEW: Save the message to the SupportTicket database 
    // so it shows up in your Super Admin Support Inbox!
    await SupportTicket.create({
      userId: null, // Guest submission (not logged in)
      userRole: 'guest',
      userName: `${firstName} ${lastName}`,
      contactEmail: email,
      contactPhone: '', // Can be added to the frontend form later if you want
      subject: role ? `Contact Form: ${role}` : 'General Inquiry',
      message: message,
      status: 'pending'
    });

    // Send the email in the background (keeping your existing functionality)
    sendContactEmail(firstName, lastName, email, role, message).catch(err => {
      console.error("Contact email notification failed:", err.message);
    });

    res.status(200).json({ 
      success: true, 
      message: "Thank you for reaching out! We will get back to you shortly." 
    });

  } catch (error) {
    next(error);
  }
};
