import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, 
  },
});

const mailOptions = {
  from: process.env.EMAIL_USER,
  to: process.env.EMAIL_USER, // Sending it to yourself
  subject: '🚀 NOTED AI TEST EMAIL',
  text: 'If you are reading this, your Nodemailer setup is 100% working!'
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('❌ Error:', error);
  } else {
    console.log('✅ Email sent! Message ID:', info.messageId);
  }
});