import path from 'path';
import { mkdir, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Quiz } from './models/Quiz.js';
import { QuizSubmission } from './models/QuizSubmission.js'; 
import supportRoutes from './routes/supportRoutes.js'; 
import { User } from './models/User.js';

import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import { submitContactForm } from './controllers/contactController.js';
import { errorHandler } from './middleware/errorHandler.js';
import quizRoutes from './routes/quizRoutes.js';
import revisionRoutes from './routes/revisionRoutes.js';
import academicRoutes from './routes/academicRoutes.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1); 
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5174", 
  "https://www.usenotedai.com",
  "https://usenotedai.com",
  process.env.CLIENT_URL
].filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true, allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Session'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 15, message: { success: false, message: "Too many sign-in attempts. Please wait 15 minutes and try again." }, standardHeaders: true, legacyHeaders: false });
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: { success: false, message: "AI limit reached." }, standardHeaders: true, legacyHeaders: false });
const registrationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, message: { success: false, message: "Too many registration attempts." }, standardHeaders: true, legacyHeaders: false });
const claimLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: "Too many activation attempts." }, standardHeaders: true, legacyHeaders: false });

app.use('/api/auth/register', registrationLimiter);
app.use('/api/auth/claim', claimLimiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/feedback', feedbackRoutes);
app.post('/api/contact', submitContactForm);
app.use('/api/ai/generate', aiLimiter);
app.use('/api/quiz/generate-ai-preview', aiLimiter);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/revision', revisionRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/support', supportRoutes); 

app.get('/', (req, res) => res.json({ success: true, message: '✅ Noted Backend API is running!' }));
app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = createServer(app);

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true }
});

const activeGames = new Map();
const cardTimers = new Map();
const gameShowOutboxDir = process.env.GAME_SHOW_OUTBOX_DIR || path.join(__dirname, 'data', 'game-show-outbox');
const activeGameSnapshotsDir = path.join(gameShowOutboxDir, 'active-games');
let gameShowOutboxRetryTimer = null;

const persistActiveGameSnapshot = async (game) => {
  await mkdir(activeGameSnapshotsDir, { recursive: true, mode: 0o700 });
  const snapshotPath = path.join(activeGameSnapshotsDir, `${game.quizId}.json`);
  const tempPath = `${snapshotPath}.${process.pid}.${Date.now()}.tmp`;
  const snapshot = {
    ...game,
    adminSocketId: null,
    savingToDb: false,
    saveRetryTimer: null,
    players: game.players.map((player) => ({ ...player, id: null }))
  };
  await writeFile(tempPath, JSON.stringify(snapshot), { mode: 0o600 });
  await rename(tempPath, snapshotPath);
};

const removeActiveGameSnapshot = async (quizId) => {
  try {
    await unlink(path.join(activeGameSnapshotsDir, `${quizId}.json`));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
};

const loadActiveGameSnapshots = async () => {
  let filenames = [];
  try {
    filenames = (await readdir(activeGameSnapshotsDir)).filter((name) => name.endsWith('.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Failed to read active Game Show snapshots:', error);
    return;
  }

  for (const filename of filenames) {
    try {
      const snapshot = JSON.parse(await readFile(path.join(activeGameSnapshotsDir, filename), 'utf8'));
      if (!snapshot.quizId || !Array.isArray(snapshot.questions) || !Array.isArray(snapshot.players)) {
        throw new Error('Invalid active Game Show snapshot');
      }
      snapshot.players = snapshot.players.map((player) => ({ ...player, id: null }));
      snapshot.adminSocketId = null;
      snapshot.savingToDb = false;
      snapshot.savedToDb = false;
      snapshot.saveRetryTimer = null;
      if (snapshot.activeCard) {
        snapshot.activeCard = null;
        snapshot.lastPicker = null;
        snapshot.activityLog.push({ time: new Date().toLocaleTimeString(), message: 'Match resumed after a server restart. The interrupted card is available again.' });
      }
      activeGames.set(snapshot.quizId, snapshot);
      await persistActiveGameSnapshot(snapshot);
      console.log(`✅ Restored active Game Show for quiz ${snapshot.quizId}`);
      if (snapshot.completedCards.length === snapshot.questions.length) void saveGameShowResults(snapshot);
    } catch (error) {
      console.error(`Failed to restore active Game Show snapshot ${filename}:`, error);
    }
  }
};

const persistGameShowSubmissions = async (submissions) => {
  for (const submission of submissions) {
    const { quiz, accessCode, ...values } = submission;
    await QuizSubmission.findOneAndUpdate(
      { quiz, accessCode },
      { quiz, accessCode, ...values },
      { upsert: true, returnDocument: 'after' }
    );
  }
};

const queueGameShowSubmissions = async (quizId, submissions, complete = false) => {
  await mkdir(gameShowOutboxDir, { recursive: true, mode: 0o700 });
  const outboxPath = path.join(gameShowOutboxDir, `${quizId}-${randomUUID()}.json`);
  const tempPath = `${outboxPath}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempPath, JSON.stringify({ quizId, submissions, complete }), { mode: 0o600 });
  await rename(tempPath, outboxPath);
  return outboxPath;
};

const flushGameShowOutbox = async () => {
  let failed = false;
  let filenames = [];
  try {
    filenames = (await readdir(gameShowOutboxDir)).filter((name) => name.endsWith('.json'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      failed = true;
      console.error('Failed to read Game Show result outbox:', error);
    }
  }

  for (const filename of filenames) {
    const outboxPath = path.join(gameShowOutboxDir, filename);
    try {
      const record = JSON.parse(await readFile(outboxPath, 'utf8'));
      if (!record.quizId || !Array.isArray(record.submissions)) {
        throw new Error('Invalid Game Show result outbox record');
      }
      await persistGameShowSubmissions(record.submissions);
      await unlink(outboxPath);
      if (record.complete) await removeActiveGameSnapshot(record.quizId);
      console.log(`✅ Recovered pending Game Show results for quiz ${record.quizId}`);
    } catch (error) {
      failed = true;
      console.error(`Failed to flush Game Show result outbox file ${filename}:`, error);
    }
  }

  if (failed && !gameShowOutboxRetryTimer) {
    gameShowOutboxRetryTimer = setTimeout(() => {
      gameShowOutboxRetryTimer = null;
      void flushGameShowOutbox();
    }, 30_000);
  }
};

const saveGameShowResults = async (game) => {
  if (game.completedCards.length !== game.questions.length || game.savedToDb || game.savingToDb) return;

  game.savingToDb = true;
  try {
    const maxScore = game.questions.length * (game.baseMarks || 10);
    const submissions = [];
    
    for (const player of game.players) {
      if (player.name === "Admin" || player.name.toLowerCase() === "admin") continue;
      
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

      const safeAccessCode = `GS_${game.quizId}_${player.name.replace(/[^a-zA-Z0-9]/g, '')}`;

      submissions.push({
        quiz: game.quizId,
        studentName: player.name,
        studentSurname: "GameShow",
        studentClass: "Live Match",
        accessCode: safeAccessCode,
        answers: submissionAnswers,
        score: totalScore,
        totalQuestions: game.questions.length,
        maxScore,
        timeTaken: 0,
        tabSwitchCount: 0,
        gameMode: 'gameShow'
      });
    }

    const outboxPath = await queueGameShowSubmissions(game.quizId, submissions, true);
    await removeActiveGameSnapshot(game.quizId);
    await persistGameShowSubmissions(submissions);
    await unlink(outboxPath);
    game.savedToDb = true;
    console.log(`✅ Game show results permanently saved to database for quiz ${game.quizId}`);
    if (activeGames.get(game.quizId) === game) activeGames.delete(game.quizId);
  } catch (err) {
    console.error(`Failed to save all game show results for quiz ${game.quizId}; retrying in 30 seconds:`, err);
    if (!game.saveRetryTimer && activeGames.get(game.quizId) === game) {
      game.saveRetryTimer = setTimeout(() => {
        game.saveRetryTimer = null;
        void saveGameShowResults(game);
      }, 30_000);
    }
  } finally {
    game.savingToDb = false;
  }
};

io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on('join_game', async ({ code, playerName, role = 'student', quizId, token }) => {
    try {
     const quiz = await Quiz.findOne({ 'accessCodes.code': code.toUpperCase() });
      if (!quiz) {
        socket.emit('error', 'Invalid game code');
        return;
      }

      if (role === 'admin') {
        const authToken = token || socket.handshake.auth?.token;
        try {
          const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id || decoded._id || decoded.userId).select('_id');
          if (!user || String(quiz.createdBy) !== String(user._id)) {
            console.log(`⚠️ Unauthorized admin attempt. User ID: ${user?._id}, Quiz Creator: ${quiz.createdBy}`);
            socket.emit('error', 'Unauthorized: You are not the creator of this game');
            return;
          }
        } catch (err) {
          console.log(`⚠️ JWT verify failed for admin:`, err.message);
          socket.emit('error', 'Unauthorized: Invalid token');
          return;
        }
      }

      const actualQuizId = quiz._id.toString();
      socket.join(actualQuizId);

      if (!activeGames.has(actualQuizId)) {
        activeGames.set(actualQuizId, {
          quizId: actualQuizId,
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
          lastPicker: null,
          disqualified: [], // ✅ RENAMED for frontend compatibility
          questions: quiz.questions
        });
      }

      const game = activeGames.get(actualQuizId);

      if (role === 'admin') {
        game.adminSocketId = socket.id;
        socket.data.role = 'admin';
      } else {
        socket.data.role = 'student';
        socket.data.playerName = playerName;
        
        const existingPlayer = game.players.find(p => p.name.toLowerCase() === playerName.toLowerCase());
        if (!existingPlayer) {
          game.players.push({ id: socket.id, name: playerName, score: 0 });
          game.scores[playerName] = 0;
        } else {
          existingPlayer.id = socket.id;
        }
      }

      await persistActiveGameSnapshot(game);
      io.to(actualQuizId).emit('player_joined', { players: game.players, status: game.status });

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

  socket.on('admin_start_game', async ({ quizId }) => {
    const game = activeGames.get(quizId);
    if (game && socket.id === game.adminSocketId) {
      game.status = 'live';
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: "🚀 Match Started!" });
      await persistActiveGameSnapshot(game);
      
      const studentSafeState = { ...game };
      studentSafeState.questions = game.questions.map(q => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        imageUrl: q.imageUrl
      }));
      
      io.to(quizId).emit('game_started', studentSafeState);
    }
  });

  // ✅ UPDATED: Accepts boolean and broadcasts to all clients
  socket.on('disqualify_player', async ({ quizId, playerName, disqualified }) => {
    const game = activeGames.get(quizId);
    if (game && socket.id === game.adminSocketId) {
      if (disqualified) {
        if (!game.disqualified.includes(playerName)) {
          game.disqualified.push(playerName);
        }
      } else {
        game.disqualified = game.disqualified.filter(p => p !== playerName);
      }
      await persistActiveGameSnapshot(game);
      io.to(quizId).emit('player_disqualified', { disqualified: game.disqualified });
    }
  });

socket.on('pick_card', async ({ quizId, cardIndex }) => {
  const game = activeGames.get(quizId);
  const playerName = socket.data.playerName;
    const player = game?.players.find((candidate) => candidate.id === socket.id && candidate.name === playerName);
  
  // ✅ FIX: Check if game exists FIRST
  if (!game || game.status !== 'live' || !player || !Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= game.questions.length || game.activeCard || game.completedCards.includes(cardIndex)) return;

  // ✅ NOW it's safe to check disqualified
  if (game.disqualified.includes(playerName)) {
    console.log(`🚫 Disqualified player ${playerName} tried to pick a card. Blocked.`);
    return;
  }
      
  if (game.lastPicker === playerName && game.completedCards.length > 0) return; 

    game.activeCard = { index: cardIndex, player: playerName, attempt: 1, pickedAt: Date.now() };
    game.lastPicker = playerName;
    game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `${playerName} picked Card ${cardIndex + 1}` });
    await persistActiveGameSnapshot(game);
    
    const timeLimitMs = 30000;
    // ✅ SEND remainingMs for accurate frontend timers
    io.to(quizId).emit('card_locked', { cardIndex, playerName, remainingMs: timeLimitMs });
    
    if (cardTimers.has(quizId)) clearTimeout(cardTimers.get(quizId));
    
    const timeoutId = setTimeout(async () => {
      if (game.activeCard && game.activeCard.index === cardIndex) {
        game.cardResults.push({ cardIndex, player: playerName, result: 'timeout', points: 0, selectedAnswer: 'Skipped' });
        game.completedCards.push(cardIndex);
        game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `⏰ ${playerName} ran out of time on Card ${cardIndex + 1}` });
        game.activeCard = null;
        cardTimers.delete(quizId);
        await persistActiveGameSnapshot(game);
        
        if (game.completedCards.length === game.questions.length) saveGameShowResults(game);
        
        // ✅ ENRICHED payload
        io.to(quizId).emit('answer_result', { 
          isCorrect: false, 
          isTimeout: true, 
          cardIndex,
          answeredBy: playerName,
          scores: game.scores, 
          completedCards: game.completedCards, 
          cardResults: game.cardResults, 
          activityLog: game.activityLog 
        });
      }
    }, timeLimitMs);
    
    cardTimers.set(quizId, timeoutId);
  });

  socket.on('submit_answer', async ({ quizId, cardIndex, selectedAnswerIndex }) => {
    const game = activeGames.get(quizId);
    const playerName = socket.data.playerName;
    
    if (!game || !game.activeCard || game.activeCard.index !== cardIndex) return;

    const player = game.players.find((candidate) => candidate.id === socket.id && candidate.name.toLowerCase() === playerName?.toLowerCase());
    const activePlayerLower = game.activeCard.player?.toLowerCase();
    const stealPlayerLower = game.activeCard.stealPlayer ? game.activeCard.stealPlayer.toLowerCase() : null;
    const submitterLower = player?.name.toLowerCase();
    if (!player || (activePlayerLower !== submitterLower && stealPlayerLower !== submitterLower)) return;

    const question = game.questions[cardIndex];
    if (!question || !Array.isArray(question.options) || !Number.isInteger(selectedAnswerIndex) || (selectedAnswerIndex !== -1 && (selectedAnswerIndex < 0 || selectedAnswerIndex >= question.options.length))) return;

    if (cardTimers.has(quizId)) {
      clearTimeout(cardTimers.get(quizId));
      cardTimers.delete(quizId);
    }

    const isCorrect = selectedAnswerIndex !== -1 && question.options[selectedAnswerIndex] === question.correctAnswer;
    const exactPlayerName = player.name;

    if (isCorrect) {
      const points = game.activeCard.attempt === 2 ? (game.bonusMarks || 5) : (game.baseMarks || 10);
      const resultType = game.activeCard.attempt === 2 ? 'steal' : 'correct';
      
      game.scores[exactPlayerName] = (game.scores[exactPlayerName] || 0) + points;
      game.cardResults.push({ cardIndex, player: exactPlayerName, result: resultType, points, selectedAnswer: selectedAnswerIndex !== -1 ? question.options[selectedAnswerIndex] : 'Skipped' });
      game.completedCards.push(cardIndex);
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `✅ ${exactPlayerName} got it right! (+${points} pts)` });
      
      game.activeCard = null;
      if (game.completedCards.length === game.questions.length) await saveGameShowResults(game);

      // ✅ ENRICHED payload
      io.to(quizId).emit('answer_result', { 
        isCorrect: true, 
        points, 
        cardIndex,
        answeredBy: exactPlayerName,
        scores: game.scores, 
        completedCards: game.completedCards, 
        cardResults: game.cardResults, 
        activityLog: game.activityLog 
      });
    } else {
      if (game.activeCard.attempt === 1 && !game.activeCard.stealPlayer) {
        const otherPlayer = game.players.find(p => p.name.toLowerCase() !== activePlayerLower && p.name.toLowerCase() !== "admin");
        if (otherPlayer) {
          game.activeCard.attempt = 2;
          game.activeCard.stealPlayer = otherPlayer.name;
          game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `❌ ${exactPlayerName} missed! ${otherPlayer.name} can STEAL for +${game.bonusMarks || 5} pts!` });

          const stealTimeoutId = setTimeout(async () => {
            if (!game.activeCard || game.activeCard.index !== cardIndex || game.activeCard.attempt !== 2) return;
            game.cardResults.push({ cardIndex, player: otherPlayer.name, result: 'timeout', points: 0, selectedAnswer: 'Skipped' });
            game.completedCards.push(cardIndex);
            game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `⏰ ${otherPlayer.name} ran out of time on Card ${cardIndex + 1}` });
            game.activeCard = null;
            cardTimers.delete(quizId);
            if (game.completedCards.length === game.questions.length) await saveGameShowResults(game);
            io.to(quizId).emit('answer_result', {
              isCorrect: false,
              isTimeout: true,
              cardIndex,
              answeredBy: otherPlayer.name,
              scores: game.scores,
              completedCards: game.completedCards,
              cardResults: game.cardResults,
              activityLog: game.activityLog
            });
          }, 15000);
          cardTimers.set(quizId, stealTimeoutId);
          
          // ✅ ENRICHED payload for steal
          io.to(quizId).emit('answer_result', { 
            isCorrect: false, 
            isStealOpportunity: true, 
            stealPlayer: otherPlayer.name,
            cardIndex,
            answeredBy: exactPlayerName,
            stealPoints: game.bonusMarks || 5,
            remainingMs: 15000, // 15 seconds for steal
            scores: game.scores, 
            activityLog: game.activityLog 
          });
          return; 
        }
      }
      
      game.cardResults.push({ cardIndex, player: exactPlayerName, result: 'wrong', points: 0, selectedAnswer: selectedAnswerIndex !== -1 ? question.options[selectedAnswerIndex] : 'Skipped' });
      game.completedCards.push(cardIndex);
      game.activityLog.push({ time: new Date().toLocaleTimeString(), message: `❌ ${exactPlayerName} missed it. Card closed.` });
      
      game.activeCard = null;
      if (game.completedCards.length === game.questions.length) await saveGameShowResults(game);

      // ✅ ENRICHED payload
      io.to(quizId).emit('answer_result', { 
        isCorrect: false, 
        cardIndex,
        answeredBy: exactPlayerName,
        scores: game.scores, 
        completedCards: game.completedCards, 
        cardResults: game.cardResults, 
        activityLog: game.activityLog 
      });
    }
  });

  socket.on('disconnect', async () => {
    console.log(`🔌 Disconnected: ${socket.id}`);
    for (const [quizId, game] of activeGames.entries()) {
      const player = game.players.find(p => p.id === socket.id);
      if (player && game.status === 'live') {
        const playerResults = game.cardResults.filter(r => r.player === player.name);
        const totalScore = playerResults.reduce((sum, r) => sum + r.points, 0);
        const submissionAnswers = game.questions.map((q, idx) => {
          const result = playerResults.find(r => r.cardIndex === idx);
          return { questionId: q._id, selectedAnswer: result ? result.selectedAnswer : 'Skipped', isCorrect: result ? (result.result === 'correct' || result.result === 'steal') : false };
        });

        const safeAccessCode = `GS_${game.quizId}_${player.name.replace(/[^a-zA-Z0-9]/g, '')}`;
        const maxScore = game.questions.length * (game.baseMarks || 10);

        try {
          await QuizSubmission.findOneAndUpdate(
            { quiz: game.quizId, accessCode: safeAccessCode },
            { quiz: game.quizId, studentName: player.name, studentSurname: "GameShow", studentClass: "Live Match", accessCode: safeAccessCode, answers: submissionAnswers, score: totalScore, totalQuestions: game.questions.length, maxScore: maxScore, timeTaken: 0, tabSwitchCount: 0, gameMode: 'gameShow' },
            { upsert: true, returnDocument: 'after' }
          );
        } catch (err) {
          console.error("Failed to auto-save disconnected player result:", err);
        }
      }
    }
  });
});

const MONGO_URI = process.env.MONGO_URI;
if (!process.env.JWT_SECRET) {
  console.error('❌ Missing required environment variable: JWT_SECRET');
  process.exit(1);
}

if (!MONGO_URI) {
  console.error('❌ Missing required environment variable: MONGO_URI');
  process.exit(1);
}

mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 })
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas!');
    await flushGameShowOutbox();
    await loadActiveGameSnapshots();
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
