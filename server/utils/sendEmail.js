import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create a reusable transporter object using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Uses the App Password, not your real password
  },
});

export const sendFeedbackNotification = async (studentName, type, rating, message) => {
  // Define the email content
  const mailOptions = {
    from: `"Noted AI App" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER, // Sends the email to yourself
    subject: `🔔 New ${type} from ${studentName} (${rating} Stars)`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">New Student Feedback</h2>
        <p><strong>Student:</strong> ${studentName}</p>
        <p><strong>Type:</strong> ${type}</p>
        <p><strong>Rating:</strong> ${'⭐'.repeat(rating)}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <h3>Message:</h3>
        <p style="background: #f9fafb; padding: 15px; border-radius: 5px; font-style: italic;">"${message}"</p>
        <p style="font-size: 12px; color: #888; margin-top: 30px;">Sent automatically by the Noted AI Feedback System.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Feedback email notification sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send email notification:', error.message);
  }
};

export const sendContactEmail = async (firstName, lastName, email, role, message) => {
  const mailOptions = {
    from: `"Noted AI Contact" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `📩 New Contact Message from ${role || 'Visitor'}: ${firstName} ${lastName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4f46e5;">New Website Contact</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Role:</strong> ${role || 'Not specified'}</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <h3>Message:</h3>
        <p style="background: #f9fafb; padding: 15px; border-radius: 5px; font-style: italic;">"${message}"</p>
        <p style="font-size: 12px; color: #888; margin-top: 30px;">Sent from the Noted AI Contact Page.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Contact email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send contact email:', error.message);
  }
};