// server/sockets/kahoot.js
//
// Live "Kahoot" game engine. It runs on its OWN socket.io namespace (/kahoot), so it can't clash with your
// existing game-show handlers on the default namespace.
//
// Register it once in server.js, after `io` is created:
//   import { registerKahootGame } from './sockets/kahoot.js';
//   registerKahootGame(io);
//
// Requirements: socket.io v4+, JWT_SECRET in the environment (same secret your `protect` middleware uses).

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { User } from '../models/User.js';

const MAX_PLAYERS = 300;
const NAME_MAX = 20;
const AUTO_START_DELAY_MS = 3000;   // quiz.autoStart: start 3s after the first student joins
const AUTO_ADVANCE_MS = 8000;       // quiz.autoStart: move to the next question by itself after the reveal
const ANSWER_GRACE_MS = 400;        // network grace when an answer arrives right at the buzzer
const FINISHED_TTL_MS = 30 * 60 * 1000;
const STALE_GAME_MS = 6 * 60 * 60 * 1000;

const games = new Map(); // quizId -> game

/* ---------------- helpers ---------------- */
const cleanName = (s) => String(s ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

const pointsFor = (ms, durationMs, streak) => {
  const base = Math.round(1000 * (1 - Math.min(ms, durationMs) / durationMs / 2)); // 500..1000
  const bonus = streak >= 2 ? Math.min(streak - 1, 5) * 100 : 0;                    // streak bonus
  return base + bonus;
};

const publicPlayer = (p) => ({ id: p.id, name: p.name, score: p.score, connected: p.connected });
const ranked = (game) =>
  [...game.players.values()].sort((a, b) => b.score - a.score || a.totalMs - b.totalMs || a.name.localeCompare(b.name));
const leaderboard = (game, n = 5) => ranked(game).slice(0, n).map((p, i) => ({ rank: i + 1, id: p.id, name: p.name, score: p.score }));
const connectedCount = (game) => [...game.players.values()].filter((p) => p.connected).length;

const room = (game) => `kahoot:${game.quizId}`;
const hostRoom = (game) => `kahoot:${game.quizId}:host`;

const questionPayload = (game) => {
  const q = game.questions[game.index];
  return {
    index: game.index,
    total: game.questions.length,
    question: q.question,
    options: q.options,
    imageUrl: q.imageUrl,
    endsAt: game.endsAt,
    durationMs: game.durationMs,
    serverNow: Date.now(),
  };
};

const verifyHost = async (token, game) => {
  if (!token || typeof token !== 'string') return false;
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); } catch { return false; }
  // If your token stores the user id under another key (see middleware/protect.js), add it here.
  const userId = payload.id || payload._id || payload.userId || payload.sub;
  if (!mongoose.isValidObjectId(userId)) return false;
  const user = await User.findById(userId).select('role isActive');
  if (!user || user.isActive === false) return false;
  return user.role === 'super_admin' || String(user._id) === game.createdBy;
};

const loadGame = async (quizId) => {
  const existing = games.get(quizId);
  if (existing) return existing;

  const quiz = await Quiz.findOne({ _id: quizId, gameMode: 'kahoot' });
  if (!quiz) return null;

  const code = (quiz.accessCodes || []).map((ac) => ac?.code).filter(Boolean)[0] || '';
  const seconds = quiz.timeUnit === 'minutes' ? quiz.timeLimit * 60 : quiz.timeLimit;

  const game = {
    quizId: String(quiz._id),
    createdBy: String(quiz.createdBy),
    createdAt: Date.now(),
    code,
    title: quiz.title,
    autoStart: Boolean(quiz.autoStart),
    durationMs: Math.max(5, Math.min(seconds || 20, 120)) * 1000,
    questions: quiz.questions.map((q) => ({
      id: String(q._id),
      question: q.question,
      options: q.options,
      correctIndex: q.options.indexOf(q.correctAnswer),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      imageUrl: q.imageUrl || '',
    })),
    status: 'lobby', // lobby | question | reveal | finished
    index: -1,
    players: new Map(),
    answers: new Map(),
    startedAt: 0,
    endsAt: 0,
    lastReveal: null,
    hostSocketId: null,
    timer: null,
    autoTimer: null,
    advanceTimer: null,
    savedResults: false,
  };
  games.set(game.quizId, game);
  return game;
};

/* ---------------- engine ---------------- */
export function registerKahootGame(io) {
    console.log("🚀 Attempting to register /kahoot namespace...");
  const nsp = io.of('/kahoot');
    console.log("✅ /kahoot namespace registered successfully!")

  const hostView = (game) => ({
    quizId: game.quizId,
    code: game.code,
    title: game.title,
    status: game.status,
    autoStart: game.autoStart,
    total: game.questions.length,
    index: game.index,
    players: [...game.players.values()].map(publicPlayer),
    question: game.index >= 0 && game.status !== 'lobby' ? questionPayload(game) : null,
    answered: game.answers.size,
    reveal: game.lastReveal,
    leaderboard: leaderboard(game, 10),
    serverNow: Date.now(),
  });

  const playerSnapshot = (game, player) => {
    const board = ranked(game);
    return {
      status: game.status,
      title: game.title,
      total: game.questions.length,
      index: game.index,
      playerCount: game.players.size,
      question: game.status === 'question' ? questionPayload(game) : null,
      answeredChoice: game.status === 'question' && game.answers.has(player.id) ? game.answers.get(player.id).choice : null,
      reveal: game.status === 'reveal' || game.status === 'finished' ? game.lastReveal : null,
      lastResult: game.status === 'reveal' ? player.lastResult : null,
      leaderboard: leaderboard(game, game.status === 'finished' ? 50 : 5),
      me: { id: player.id, name: player.name, score: player.score, rank: board.findIndex((p) => p.id === player.id) + 1 },
    };
  };

  const broadcastPlayers = (game) =>
    nsp.to(room(game)).emit('players_update', { players: [...game.players.values()].map(publicPlayer), count: game.players.size });

  const saveResults = async (game) => {
    if (game.savedResults) return;
    game.savedResults = true;
    try {
      const board = ranked(game);
      if (board.length === 0) return;
      const docs = board.map((p, i) => ({
        quiz: game.quizId,
        studentName: p.name,
        studentSurname: '-',
        studentClass: 'Live game',
        accessCode: `${game.code}#${String(i + 1).padStart(3, '0')}-${p.id.slice(0, 6)}`,
        answers: game.questions.map((q, qi) => {
          const h = p.history[qi];
          return {
            questionId: q.id,
            selectedAnswer: h && h.choice !== null ? q.options[h.choice] || '' : '',
            isCorrect: Boolean(h?.correct),
            confidence: null,
          };
        }),
        score: p.correctCount,
        totalQuestions: game.questions.length,
        timeTaken: Math.round(p.totalMs / 1000),
        tabSwitchCount: 0,
      }));
      await QuizSubmission.insertMany(docs, { ordered: false });
    } catch (err) {
      console.error('Kahoot: could not save results:', err.message);
    }
  };

  const finishGame = (game) => {
    if (game.status === 'finished') return;
    clearTimeout(game.autoTimer);
    clearTimeout(game.advanceTimer);
    if (game.status === 'question') endQuestion(game); // settle the running question first
    clearTimeout(game.advanceTimer);
    game.status = 'finished';

    const board = ranked(game);
    const rankOf = new Map(board.map((p, i) => [p.id, i + 1]));
    nsp.to(room(game)).emit('game_finished', { leaderboard: leaderboard(game, 50), players: board.length });
    for (const p of game.players.values()) {
      if (p.connected && p.socketId) {
        nsp.to(p.socketId).emit('final_result', {
          rank: rankOf.get(p.id),
          score: p.score,
          correctCount: p.correctCount,
          totalQuestions: game.questions.length,
          players: board.length,
        });
      }
    }
    saveResults(game);
    setTimeout(() => games.delete(game.quizId), FINISHED_TTL_MS).unref?.();
  };

  const endQuestion = (game) => {
    if (game.status !== 'question') return;
    clearTimeout(game.timer);
    game.status = 'reveal';

    const q = game.questions[game.index];
    const counts = q.options.map(() => 0);
    for (const a of game.answers.values()) counts[a.choice] += 1;

    for (const p of game.players.values()) {
      const a = game.answers.get(p.id);
      let correct = false;
      let points = 0;
      if (a && a.choice === q.correctIndex) {
        correct = true;
        p.streak += 1;
        points = pointsFor(a.ms, game.durationMs, p.streak);
        p.score += points;
        p.correctCount += 1;
      } else {
        p.streak = 0;
      }
      p.totalMs += a ? a.ms : game.durationMs;
      p.history.push({ choice: a ? a.choice : null, correct });
      p.lastResult = { correct, points, choice: a ? a.choice : null, timedOut: !a, streak: p.streak };
    }

    const board = ranked(game);
    const rankOf = new Map(board.map((p, i) => [p.id, i + 1]));
    game.lastReveal = {
      index: game.index,
      total: game.questions.length,
      correctIndex: q.correctIndex,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      counts,
      leaderboard: leaderboard(game, 5),
      isLast: game.index === game.questions.length - 1,
    };

    nsp.to(room(game)).emit('question_end', game.lastReveal);
    for (const p of game.players.values()) {
      if (p.connected && p.socketId) {
        nsp.to(p.socketId).emit('answer_result', {
          ...p.lastResult,
          score: p.score,
          rank: rankOf.get(p.id),
          players: board.length,
          correctCount: p.correctCount,
          leaderboard: leaderboard(game, 5), // ✅ FIX: Send the actual leaderboard array
          correctIndex: q.correctIndex,       // ✅ FIX: So frontend knows which was right
          correctAnswer: q.correctAnswer,     // ✅ FIX: So frontend can display the right answer
        });
      }
    }

    if (game.autoStart) game.advanceTimer = setTimeout(() => advance(game), AUTO_ADVANCE_MS);
  };

  const startQuestion = (game, index) => {
    clearTimeout(game.timer);
    clearTimeout(game.advanceTimer);
    game.index = index;
    game.status = 'question';
    game.answers = new Map();
    game.startedAt = Date.now();
    game.endsAt = game.startedAt + game.durationMs;
    game.lastReveal = null;
    for (const p of game.players.values()) p.lastResult = null;

    nsp.to(room(game)).emit('question_start', questionPayload(game));
    nsp.to(hostRoom(game)).emit('answer_count', { answered: 0, total: connectedCount(game) });
    game.timer = setTimeout(() => endQuestion(game), game.durationMs + ANSWER_GRACE_MS);
  };

  const advance = (game) => {
    if (game.status !== 'reveal') return;
    clearTimeout(game.advanceTimer);
    if (game.index + 1 >= game.questions.length) return finishGame(game);
    return startQuestion(game, game.index + 1);
  };

  const startGame = (game) => {
    if (game.status !== 'lobby' || game.players.size === 0) return;
    clearTimeout(game.autoTimer);
    game.autoTimer = null;
    nsp.to(room(game)).emit('game_started');
    startQuestion(game, 0);
  };

  nsp.on('connection', (socket) => {
    const hostGame = (quizId) => {
      const game = games.get(String(quizId));
      return game && game.hostSocketId === socket.id ? game : null;
    };

    /* ---- host ---- */
    socket.on('host_join', async ({ quizId, token } = {}) => {
      console.log("📥 Backend received host_join for quizId:", quizId); // <-- ADD THIS LINE
      try {
        if (!mongoose.isValidObjectId(quizId)) {
          console.log("⚠️ Invalid quizId format"); // <-- ADD THIS LINE
          return socket.emit('game_error', { code: 'BAD_QUIZ', message: 'This game link is not valid.' });
        }
        const game = await loadGame(String(quizId));
        if (!game) {
          console.log("⚠️ Game not found in DB for quizId:", quizId); // <-- ADD THIS LINE
          return socket.emit('game_error', { code: 'NO_QUIZ', message: 'This Kahoot game was not found.' });
        }
        if (!game.code) {
          console.log("⚠️ Game has no access code"); // <-- ADD THIS LINE
          return socket.emit('game_error', { code: 'NO_CODE', message: 'This game has no join code. Create it again.' });
        }
        if (!(await verifyHost(token, game))) {
          console.log("⚠️ Host verification failed"); // <-- ADD THIS LINE
          return socket.emit('game_error', { code: 'UNAUTHORIZED', message: 'Please log in again to host this game.' });
        }
        
        console.log("✅ Host verified successfully. Sending host_state..."); // <-- ADD THIS LINE
        game.hostSocketId = socket.id;
        socket.data.role = 'host';
        socket.data.quizId = game.quizId;
        socket.join(room(game));
        socket.join(hostRoom(game));
        socket.emit('host_state', hostView(game));
      } catch (err) {
        console.error('❌ Kahoot host_join failed:', err.message); // <-- ADD THIS LINE
        socket.emit('game_error', { code: 'SERVER', message: 'Could not open the game. Please try again.' });
      }
    });

    socket.on('host_start', ({ quizId } = {}) => {
      const game = hostGame(quizId);
      if (!game || game.status !== 'lobby') return;
      if (game.players.size === 0) return socket.emit('game_error', { code: 'NO_PLAYERS', message: 'Wait for at least one student to join.' });
      startGame(game);
    });

    socket.on('host_skip', ({ quizId } = {}) => { const g = hostGame(quizId); if (g) endQuestion(g); });   // close the question now
    socket.on('host_next', ({ quizId } = {}) => { const g = hostGame(quizId); if (g) advance(g); });      // next question / final results
    socket.on('host_end', ({ quizId } = {}) => { const g = hostGame(quizId); if (g) finishGame(g); });

    /* ---- students ---- */
    socket.on('player_join', async ({ code, name, playerId } = {}) => {
      try {
        const cleanCode = String(code || '').trim().toUpperCase();
        const quiz = await Quiz.findOne({ 'accessCodes.code': cleanCode, gameMode: 'kahoot' }).select('_id');
        if (!quiz) return socket.emit('game_error', { code: 'BAD_CODE', message: 'That game code is not valid.' });

        const game = games.get(String(quiz._id));
        if (!game) return socket.emit('game_error', { code: 'NO_GAME', message: "Your teacher hasn't opened this game yet. Hang tight, we'll keep trying." });

        const pid = String(playerId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || crypto.randomUUID();
        let player = game.players.get(pid);

        if (!player) {
          const nick = cleanName(name);
          if (!nick) return socket.emit('game_error', { code: 'BAD_NAME', message: 'Please enter a nickname.' });
          if (game.status !== 'lobby') return socket.emit('game_error', { code: 'STARTED', message: 'This game has already started.' });
          if (game.players.size >= MAX_PLAYERS) return socket.emit('game_error', { code: 'FULL', message: 'This game is full.' });
          if ([...game.players.values()].some((p) => p.name.toLowerCase() === nick.toLowerCase())) {
            return socket.emit('game_error', { code: 'NAME_TAKEN', message: 'That nickname is taken. Pick another one.' });
          }
          player = { id: pid, name: nick, score: 0, streak: 0, correctCount: 0, totalMs: 0, history: [], lastResult: null, socketId: socket.id, connected: true };
          game.players.set(pid, player);
        } else {
          player.socketId = socket.id;
          player.connected = true;
        }

        socket.data.role = 'player';
        socket.data.quizId = game.quizId;
        socket.data.playerId = pid;
        socket.join(room(game));
        socket.emit('joined', playerSnapshot(game, player));
        broadcastPlayers(game);

        if (game.autoStart && game.status === 'lobby' && !game.autoTimer) {
          game.autoTimer = setTimeout(() => startGame(game), AUTO_START_DELAY_MS);
        }
      } catch (err) {
        console.error('Kahoot player_join failed:', err.message);
        socket.emit('game_error', { code: 'SERVER', message: 'Could not join the game. Please try again.' });
      }
    });

    socket.on('player_answer', ({ choice } = {}) => {
      if (socket.data.role !== 'player') return;
      const game = games.get(socket.data.quizId);
      const player = game?.players.get(socket.data.playerId);
      if (!game || !player) return;
      if (game.status !== 'question' || Date.now() > game.endsAt + ANSWER_GRACE_MS) return;
      if (game.answers.has(player.id)) return; // one answer per question

      const q = game.questions[game.index];
      if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return;

      game.answers.set(player.id, { choice, ms: Math.max(0, Date.now() - game.startedAt) });
      socket.emit('answer_locked', { choice });
      nsp.to(hostRoom(game)).emit('answer_count', { answered: game.answers.size, total: connectedCount(game) });

      if (game.answers.size >= connectedCount(game)) endQuestion(game); // everyone answered: no need to wait
    });

    socket.on('disconnect', () => {
      const game = games.get(socket.data?.quizId);
      if (!game) return;

      if (socket.data.role === 'host' && game.hostSocketId === socket.id) {
        game.hostSocketId = null;
        return;
      }

      if (socket.data.role === 'player') {
        const p = game.players.get(socket.data.playerId);
        if (!p || p.socketId !== socket.id) return;
        p.connected = false;
        if (game.status === 'lobby') game.players.delete(p.id); // left before the start: remove from the lobby
        broadcastPlayers(game);
        if (game.status === 'question') {
          const online = connectedCount(game);
          nsp.to(hostRoom(game)).emit('answer_count', { answered: game.answers.size, total: online });
          if (online > 0 && game.answers.size >= online) endQuestion(game);
        }
      }
    });
  });

  // Drop abandoned games (host closed the tab and never came back)
  setInterval(() => {
    const now = Date.now();
    for (const [id, g] of games) if (now - g.createdAt > STALE_GAME_MS) games.delete(id);
  }, 10 * 60 * 1000).unref?.();
}

