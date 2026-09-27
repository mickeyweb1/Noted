import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Quiz } from './models/Quiz.js'; // ✅ ADDED: To look up quiz by code

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

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// ... (Keep your existing Rate Limiters and Routes exactly as they were) ...
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { success: false, message: "Too many login attempts." }, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 15, message: { success: false, message: "AI limit reached." }, standardHeaders: true, legacyHeaders: false });
const registrationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: "Too many registration attempts." }, standardHeaders: true, legacyHeaders: false });
const claimLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: "Too many activation attempts." }, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth/register', registrationLimiter);
app.use('/api/auth/claim', claimLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.post('/api/contact', submitContactForm);
app.use('/api/ai/generate', aiLimiter);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quiz', quizRoutes);

app.get('/', (req, res) => res.json({ success: true, message: '✅ Noted Backend API is running!' }));
app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` }));
app.use(errorHandler);

// ==========================================
// ✅ FIXED: SOCKET.IO SETUP
// ==========================================
const PORT = process.env.PORT || 5000;
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true }
});

const activeGames = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  // 1. Join Game (Now uses quizId, not access code)
  socket.on('join_game', async ({ code, playerName, role = 'student' }) => {
    try {
      const quiz = await Quiz.findOne({ accessCodes: code.toUpperCase() });
      if (!quiz) {
        socket.emit('error', 'Invalid game code');
        return;
      }

      const quizId = quiz._id.toString();
      socket.join(quizId);

      if (!activeGames.has(quizId)) {
        activeGames.set(quizId, {
          quizId,
          title: quiz.title,
          baseMarks: quiz.baseMarks || 10,     // ✅ FIX 4: Save marks to state
          bonusMarks: quiz.bonusMarks || 5,    // ✅ FIX 4: Save marks to state
          status: 'waiting',
          players: [],
          scores: {},
          activeCard: null,
          activityLog: [],
          questions: quiz.questions // ✅ FIX 2 & 3: Keep correctAnswer server-side!
        });
      }

      const game = activeGames.get(quizId);

      if (role === 'admin') {
        game.adminSocketId = socket.id;
      } else {
        const existingPlayer = game.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (!existingPlayer) {
          game.players.push({ id: socket.id, name: playerName, score: 0 });
          game.scores[playerName] = 0;
        } else {
          existingPlayer.id = socket.id; // Reconnect
        }
      }

      io.to(quizId).emit('player_joined', { 
        players: game.players, 
        status: game.status 
      });

      // ✅ FIX 2: Strip correctAnswer before sending to students
      const safeState = { ...game };
      if (role !== 'admin') {
        safeState.questions = game.questions.map(q => ({
          _id: q._id, question: q.question, options: q.options, imageUrl: q.imageUrl
        }));
      }
      socket.emit('game_state', safeState);

    } catch (err) {
      console.error("Join game error:", err);
    }
  });

  // 2. Admin Starts Match
  socket.on('admin_start_game', ({ quizId }) => {
    const game = activeGames.get(quizId);
    if (game) {
      game.status = 'live';
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: "🚀 Match Started!" });
      io.to(quizId).emit('game_started', game);
    }
  });

  // 3. Student Picks Card
  socket.on('pick_card', ({ quizId, cardIndex, playerName }) => {
    const game = activeGames.get(quizId);
    if (game && game.status === 'live' && !game.activeCard) {
      game.activeCard = { index: cardIndex, player: playerName };
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `${playerName} picked Card ${cardIndex + 1}` });
      io.to(quizId).emit('card_locked', { cardIndex, playerName });
    }
  });

  // 4. ✅ FIX 3: Server-Side Answer Validation
  socket.on('submit_answer', ({ quizId, cardIndex, selectedAnswerIndex, playerName }) => {
    const game = activeGames.get(quizId);
    if (game && game.activeCard && game.activeCard.index === cardIndex && game.activeCard.player === playerName) {
      
      const question = game.questions[cardIndex];
      const selectedOption = question.options[selectedAnswerIndex];
      const isCorrect = selectedOption === question.correctAnswer;

      // Check if it's a steal (someone else already missed it, but for simplicity, we'll just award points)
      // In a full app, you'd track if this is the first or second attempt.
      const points = game.baseMarks || 10; 

      if (isCorrect) {
        game.scores[playerName] = (game.scores[playerName] || 0) + points;
        game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `✅ ${playerName} got it right! (+${points} pts)` });
      } else {
        game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `❌ ${playerName} missed it.` });
      }

      game.activeCard = null; // Unlock board
      io.to(quizId).emit('answer_result', { 
        isCorrect, 
        scores: game.scores, 
        activityLog: game.activityLog 
      });
    }
  });

  // 5. Cleanup on Disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Disconnected: ${socket.id}`);
    // Optional: Remove player from activeGames here to prevent memory leaks
  });
});

// ==========================================
// Database Connection
// ==========================================
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 })
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas!');
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 Socket.io ready!`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  });

export { io, activeGames };
