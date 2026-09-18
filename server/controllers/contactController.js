import { sendContactEmail } from '../utils/sendEmail.js';

export const submitContactForm = async (req, res, next) => {
  try {
    const { firstName, lastName, email, role, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ success: false, message: "Please fill in all required fields." });
    }

    // Send the email in the background
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