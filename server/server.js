import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http'; // ✅ NEW: Import HTTP server
import { Server } from 'socket.io';  // ✅ NEW: Import Socket.io

import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import { submitContactForm } from './controllers/contactController.js';
import { errorHandler } from './middleware/errorHandler.js';
import quizRoutes from './routes/quizRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1); 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2. Security & Global Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ... (Keep all your existing Rate Limiting code exactly as it was) ...
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { success: false, message: "Too many login attempts, please try again later." }, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 15, message: { success: false, message: "AI generation limit reached. Please try again later." }, standardHeaders: true, legacyHeaders: false });
const registrationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: "Too many registration attempts. Please try again later." }, standardHeaders: true, legacyHeaders: false });
const claimLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: "Too many activation attempts. Please try again later." }, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth/register', registrationLimiter);
app.use('/api/auth/claim', claimLimiter);

// 4. Routes
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.post('/api/contact', submitContactForm);
app.use('/api/ai/generate', aiLimiter);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/', (req, res) => {
    res.json({ success: true, message: '✅ Noted Backend API is running smoothly!' });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

app.use(errorHandler);

// ==========================================
// ✅ NEW: SOCKET.IO SETUP
// ==========================================
const PORT = process.env.PORT || 5000;
const server = createServer(app); // Wrap express app with HTTP server

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active games in memory: { "G-CODE123": { status: 'waiting', players: [], scores: {}, activeCard: null } }
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 A user connected: ${socket.id}`);

  // 1. Student joins a game room
  socket.on('join_game', ({ code, playerName }) => {
    socket.join(code);
    
    if (!activeGames.has(code)) {
      activeGames.set(code, { status: 'waiting', players: [], scores: {}, activeCard: null, activityLog: [] });
    }
    
    const game = activeGames.get(code);
    if (!game.players.includes(playerName)) {
      game.players.push(playerName);
      game.scores[playerName] = 0;
    }

    // Notify everyone in the room that a player joined
    io.to(code).emit('player_joined', { players: game.players, status: game.status });
    console.log(`👤 ${playerName} joined game ${code}`);
    socket.emit('game_state', game); // Send current state to the joining player
  });

  // 2. Admin starts the match
  socket.on('admin_start_game', ({ code }) => {
    const game = activeGames.get(code);
    if (game) {
      game.status = 'live';
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: "🚀 Match Started!" });
      io.to(code).emit('game_started', game);
    }
  });

  // 3. Student picks a card
  socket.on('pick_card', ({ code, cardIndex, playerName }) => {
    const game = activeGames.get(code);
    if (game && game.status === 'live' && !game.activeCard) {
      game.activeCard = { index: cardIndex, player: playerName };
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `${playerName} picked Card ${cardIndex + 1}` });
      
      // Tell everyone the card is locked and who picked it
      io.to(code).emit('card_locked', { cardIndex, playerName });
    }
  });

  // 4. Student submits an answer
  socket.on('submit_answer', ({ code, cardIndex, isCorrect, isSteal, playerName }) => {
    const game = activeGames.get(code);
    if (game && game.activeCard && game.activeCard.index === cardIndex) {
      
      if (isCorrect) {
        const points = isSteal ? game.quizData?.bonusMarks || 5 : game.quizData?.baseMarks || 10;
        game.scores[playerName] = (game.scores[playerName] || 0) + points;
        game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `✅ ${playerName} got it right! (+${points} pts)` });
      } else {
        game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `❌ ${playerName} missed it.` });
      }

      game.activeCard = null; // Unlock the board
      io.to(code).emit('answer_result', { isCorrect, isSteal, scores: game.scores, activityLog: game.activityLog });
    }
  });

  // 5. Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.id}`);
    // Optional: You can add logic here to remove the player from the game if needed
  });
});
// ==========================================

// 8. Database Connection
const MONGO_URI = process.env.MONGO_URI;
const mongooseOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
};

mongoose.connect(MONGO_URI, mongooseOptions)
    .then(() => {
        console.log('✅ Successfully connected to MongoDB Atlas!');
        // ✅ CHANGED: Listen on the HTTP server, not the express app
        server.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log(`🔌 Socket.io is ready for real-time connections!`);
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

// ✅ NEW: Export io so we can attach quiz data to the game room later if needed
export { io, activeGames };
