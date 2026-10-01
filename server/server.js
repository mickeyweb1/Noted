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
import { Quiz } from './models/Quiz.js';
import { QuizSubmission } from './models/QuizSubmission.js'; 
import supportRoutes from './routes/supportRoutes.js'; 

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

const allowedOrigins = ["http://localhost:5173", "http://localhost:5174", process.env.CLIENT_URL].filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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
app.use('/api/support', supportRoutes); 

app.get('/', (req, res) => res.json({ success: true, message: '✅ Noted Backend API is running!' }));
app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` }));
app.use(errorHandler);

// ==========================================
// ✅ PREMIUM & SECURED SOCKET.IO SETUP
// ==========================================
const PORT = process.env.PORT || 5000;
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true }
});

const activeGames = new Map();

// ✅ Automatically save game show results to the database when the game ends
const saveGameShowResults = async (game) => {
  if (game.completedCards.length === game.questions.length && !game.savedToDb) {
    game.savedToDb = true; 
    
    for (const player of game.players) {
      if (player.name === "Admin") continue;
      
      const playerResults = game.cardResults.filter(r => r.player === player.name);
      const totalScore = playerResults.reduce((sum, r) => sum + r.points, 0);
      
      const submissionAnswers = game.questions.map((q, idx) => {
        const result = playerResults.find(r => r.cardIndex === idx);
        return {
          questionId: q._id,
          selectedAnswer: result ? result.selectedAnswer : 'Skipped',
          isCorrect: result ? (result.result === 'correct' || result.result === 'steal') : false
        };
      });

      try {
        await QuizSubmission.create({
          quiz: game.quizId,
          studentName: player.name,
          studentSurname: "GameShow", 
          studentClass: "Live Match",
          accessCode: `GS_${game.quizId}_${player.name.replace(/[^a-zA-Z0-9]/g, '')}`, 
          answers: submissionAnswers,
          score: totalScore,
          totalQuestions: game.questions.length,
          timeTaken: 0,
          tabSwitchCount: 0,
          gameMode: 'gameShow' 
        });
      } catch (err) {
        console.error("Failed to save game show result:", err);
      }
    }
    console.log(`✅ Game show results permanently saved to database for quiz ${game.quizId}`);
  }
};

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

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
          baseMarks: quiz.baseMarks || 10,
          bonusMarks: quiz.bonusMarks || 5,
          status: 'waiting',
          players: [],
          scores: {},
          activeCard: null,
          completedCards: [],
          cardResults: [],
          activityLog: [],
          questions: quiz.questions
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
          existingPlayer.id = socket.id;
        }
      }

      io.to(quizId).emit('player_joined', { players: game.players, status: game.status });

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

  socket.on('admin_start_game', ({ quizId }) => {
    const game = activeGames.get(quizId);
    if (game && socket.id === game.adminSocketId) {
      game.status = 'live';
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: "🚀 Match Started!" });
      io.to(quizId).emit('game_started', game);
    }
  });

  socket.on('pick_card', ({ quizId, cardIndex, playerName }) => {
    const game = activeGames.get(quizId);
    if (game && game.status === 'live' && !game.activeCard && !game.completedCards.includes(cardIndex)) {
      game.activeCard = { index: cardIndex, player: playerName, attempt: 1 };
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `${playerName} picked Card ${cardIndex + 1}` });
      io.to(quizId).emit('card_locked', { cardIndex, playerName });
    }
  });

  socket.on('submit_answer', async ({ quizId, cardIndex, selectedAnswerIndex, playerName }) => {
    const game = activeGames.get(quizId);
    if (!game || !game.activeCard || game.activeCard.index !== cardIndex) return;

    const activePlayerLower = game.activeCard.player.toLowerCase();
    const stealPlayerLower = game.activeCard.stealPlayer ? game.activeCard.stealPlayer.toLowerCase() : null;
    const submitterLower = playerName.toLowerCase();

    if (activePlayerLower !== submitterLower && stealPlayerLower !== submitterLower) {
      return; 
    }

    const question = game.questions[cardIndex];
    const isCorrect = selectedAnswerIndex !== -1 && question.options[selectedAnswerIndex] === question.correctAnswer;
    const exactPlayerName = game.players.find(p => p.name.toLowerCase() === submitterLower)?.name || playerName;

    if (isCorrect) {
      const points = game.activeCard.attempt === 2 ? (game.bonusMarks || 5) : (game.baseMarks || 10);
      const resultType = game.activeCard.attempt === 2 ? 'steal' : 'correct';
      
      game.scores[exactPlayerName] = (game.scores[exactPlayerName] || 0) + points;
      game.cardResults.push({ 
        cardIndex, 
        player: exactPlayerName, 
        result: resultType, 
        points,
        selectedAnswer: selectedAnswerIndex !== -1 ? question.options[selectedAnswerIndex] : 'Skipped' 
      });
      game.completedCards.push(cardIndex);
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `✅ ${exactPlayerName} got it right! (+${points} pts)` });
      
      game.activeCard = null;
      await saveGameShowResults(game); 

      io.to(quizId).emit('answer_result', { 
        isCorrect: true, points, scores: game.scores, 
        completedCards: game.completedCards, cardResults: game.cardResults,
        activityLog: game.activityLog 
      });
    } else {
      if (game.activeCard.attempt === 1 && !game.activeCard.stealPlayer) {
        const otherPlayer = game.players.find(p => p.name.toLowerCase() !== activePlayerLower && p.name !== "Admin");
        if (otherPlayer) {
          game.activeCard.attempt = 2;
          game.activeCard.stealPlayer = otherPlayer.name;
          game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `❌ ${exactPlayerName} missed! ${otherPlayer.name} can STEAL for +${game.bonusMarks || 5} pts!` });
          
          io.to(quizId).emit('answer_result', { 
            isCorrect: false, isStealOpportunity: true, stealPlayer: otherPlayer.name,
            scores: game.scores, activityLog: game.activityLog 
          });
          return; 
        }
      }
      
      game.cardResults.push({ 
        cardIndex, 
        player: exactPlayerName, 
        result: 'wrong', 
        points: 0,
        selectedAnswer: selectedAnswerIndex !== -1 ? question.options[selectedAnswerIndex] : 'Skipped' 
      });
      game.completedCards.push(cardIndex);
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `❌ ${exactPlayerName} missed it. Card closed.` });
      
      game.activeCard = null;
      await saveGameShowResults(game); 

      io.to(quizId).emit('answer_result', { 
        isCorrect: false, scores: game.scores, 
        completedCards: game.completedCards, cardResults: game.cardResults,
        activityLog: game.activityLog 
      });
    }
  });

  // ✅ SAFETY NET: If a student disconnects mid-game, save their current score immediately!
  socket.on('disconnect', async () => {
    console.log(`🔌 Disconnected: ${socket.id}`);
    
    for (const [quizId, game] of activeGames.entries()) {
      const player = game.players.find(p => p.id === socket.id);
      if (player && game.status === 'live') {
        console.log(`💾 Saving progress for disconnected player: ${player.name}`);
        
        const playerResults = game.cardResults.filter(r => r.player === player.name);
        const totalScore = playerResults.reduce((sum, r) => sum + r.points, 0);
        
        const submissionAnswers = game.questions.map((q, idx) => {
          const result = playerResults.find(r => r.cardIndex === idx);
          return {
            questionId: q._id,
            selectedAnswer: result ? result.selectedAnswer : 'Skipped',
            isCorrect: result ? (result.result === 'correct' || result.result === 'steal') : false
          };
        });

        try {
          await QuizSubmission.create({
            quiz: game.quizId,
            studentName: player.name,
            studentSurname: "GameShow", 
            studentClass: "Live Match",
            accessCode: `GS_${game.quizId}_${player.name.replace(/[^a-zA-Z0-9]/g, '')}`,
            answers: submissionAnswers,
            score: totalScore,
            totalQuestions: game.questions.length,
            timeTaken: 0,
            tabSwitchCount: 0,
            gameMode: 'gameShow'
          });
        } catch (err) {
          console.error("Failed to save disconnected player result:", err);
        }
      }
    }
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
