import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet'; // ✅ ADDED: Missing import
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js'; // ✅ ADDED
// At the top of server.js with other imports
import ocrRoutes from './routes/aiRoutes.js';

dotenv.config();

const app = express();

// 2. Security & Global Middleware (Must be early)
app.use(helmet()); // ✅ SECURE: Sets secure HTTP headers automatically
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
   app.use(express.json({ limit: '10mb' }));
   app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Rate Limiting (Protects against brute force & API drain)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, 
  message: { success: false, message: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Increased slightly to 15 so users don't hit it too fast during demo
  message: { success: false, message: "AI generation limit reached. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ SECURE: Limit registration attempts
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, 
  message: { success: false, message: "Too many registration attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ SECURE: Limit account claim attempts
const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, 
  message: { success: false, message: "Too many activation attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply them (Add these lines where your other app.use statements are)
app.use('/api/auth/register', registrationLimiter);
app.use('/api/auth/claim', claimLimiter);
app.use('/api/ocr', ocrRoutes); 

// 4. Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);

app.use('/api/ai/generate', aiLimiter);
app.use('/api/ai', aiRoutes);

app.use('/api/admin', adminRoutes);

// 5. Test Route
app.get('/', (req, res) => {
    res.json({ success: true, message: '✅ Noted Backend API is running smoothly!' });
});

// 6. 404 Catch-All (MUST be after all routes)
app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// 7. Global Error Handler (MUST BE THE VERY LAST THING)
app.use(errorHandler);

// 8. Database Connection with AUTO-RECONNECT Logic
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

mongoose.connect(MONGO_URI, mongooseOptions)
    .then(() => {
        console.log('✅ Successfully connected to MongoDB Atlas!');
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('❌ Initial MongoDB connection failed. Check your MONGO_URI in .env');
        console.error('Error details:', error.message);
        process.exit(1);
    });

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected! Mongoose will automatically attempt to reconnect...');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected successfully!');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB connection error:', err.message);
});