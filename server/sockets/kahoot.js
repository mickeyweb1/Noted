// Live Noted Quiz Show engine. Uses a dedicated Socket.IO namespace: /kahoot.
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { User } from '../models/User.js';

const MAX_PLAYERS = 500;
const NAME_MAX = 20;
const AUTO_START_DELAY_MS = 3000;
const AUTO_ADVANCE_MS = 4000;
const ANSWER_GRACE_MS = 400;
const FINISHED_TTL_MS = 30 * 60 * 1000;
const STALE_GAME_MS = 6 * 60 * 60 * 1000;
const DISCONNECT_GRACE_MS = 45 * 1000;

const games = new Map();
const pendingGameLoads = new Map();

const cleanName = (value) => String(value ?? '')
  .replace(/[\u0000-\u001f<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, NAME_MAX);

const pointsFor = (elapsedMs, durationMs, streak) => {
  const base = Math.round(1000 * (1 - Math.min(elapsedMs, durationMs) / durationMs / 2));
  const bonus = streak >= 2 ? Math.min(streak - 1, 5) * 100 : 0;
  return base + bonus;
};

const publicPlayer = (player) => ({
  id: player.id,
  name: player.name,
  score: player.score,
  connected: player.connected,
});

const ranked = (game) => [...game.players.values()].sort((a, b) =>
  b.score - a.score || a.totalMs - b.totalMs || a.name.localeCompare(b.name)
);

const leaderboard = (game, limit = 5) => ranked(game).slice(0, limit).map((player, index) => ({
  rank: index + 1,
  id: player.id,
  name: player.name,
  score: player.score,
}));

const connectedCount = (game) => [...game.players.values()].filter((player) => player.connected).length;
const room = (game) => `kahoot:${game.quizId}`;
const hostRoom = (game) => `kahoot:${game.quizId}:host`;

const questionPayload = (game) => {
  const question = game.questions[game.index];
  if (!question) return null;
  return {
    index: game.index,
    total: game.questions.length,
    question: question.question,
    options: question.options,
    imageUrl: question.imageUrl,
    endsAt: game.endsAt,
    durationMs: game.durationMs,
    serverNow: Date.now(),
  };
};

const verifyHost = async (token, game) => {
  if (!token || typeof token !== 'string') return false;

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return false;
  }

  // Noted's authController signs tokens with { id }.
  const userId = payload.id || payload._id || payload.userId || payload.sub;
  if (!mongoose.isValidObjectId(userId)) return false;

  const user = await User.findById(userId).select('role isActive');
  if (!user || user.isActive === false) return false;
  return user.role === 'super_admin' || String(user._id) === game.createdBy;
};

const buildGame = (quiz) => {
  const code = (quiz.accessCodes || []).map((entry) => entry?.code).find(Boolean) || '';
  const seconds = quiz.timeUnit === 'minutes' ? Number(quiz.timeLimit) * 60 : Number(quiz.timeLimit);
  const maxPlayers = Math.max(1, Math.min(Number(quiz.numberOfStudents) || MAX_PLAYERS, MAX_PLAYERS));

  return {
    quizId: String(quiz._id),
    createdBy: String(quiz.createdBy),
    createdAt: Date.now(),
    code,
    title: quiz.title,
    autoStart: Boolean(quiz.autoStart),
    maxPlayers,
    durationMs: Math.max(5, Math.min(seconds || 20, 120)) * 1000,
    questions: (quiz.questions || []).map((question) => ({
      id: String(question._id),
      question: question.question,
      options: question.options,
      correctIndex: question.options.indexOf(question.correctAnswer),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      imageUrl: question.imageUrl || '',
    })),
    status: 'lobby',
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
    savingResults: false,
    saveRetryTimer: null,
  };
};

const loadGame = async (quizId) => {
  const key = String(quizId);
  const existing = games.get(key);
  if (existing) return existing;

  // Prevent two students joining at the same time from creating two in-memory game objects.
  const pending = pendingGameLoads.get(key);
  if (pending) return pending;

  const loading = (async () => {
    const quiz = await Quiz.findOne({ _id: key, gameMode: 'kahoot' });
    if (!quiz) return null;

    const alreadyLoaded = games.get(key);
    if (alreadyLoaded) return alreadyLoaded;

    const game = buildGame(quiz);
    games.set(key, game);
    return game;
  })();

  pendingGameLoads.set(key, loading);
  try {
    return await loading;
  } finally {
    pendingGameLoads.delete(key);
  }
};

export function registerKahootGame(io) {
  const nsp = io.of('/kahoot');

  const hostView = (game) => ({
    quizId: game.quizId,
    code: game.code,
    title: game.title,
    status: game.status,
    autoStart: game.autoStart,
    maxPlayers: game.maxPlayers,
    total: game.questions.length,
    index: game.index,
    players: [...game.players.values()].map(publicPlayer),
    question: game.index >= 0 && game.status !== 'lobby' ? questionPayload(game) : null,
    answered: game.answers.size,
    connectedPlayers: connectedCount(game),
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
      answeredChoice: game.status === 'question' && game.answers.has(player.id)
        ? game.answers.get(player.id).choice
        : null,
      reveal: ['reveal', 'finished'].includes(game.status) ? game.lastReveal : null,
      lastResult: ['reveal', 'finished'].includes(game.status) ? player.lastResult : null,
      leaderboard: leaderboard(game, game.status === 'finished' ? 50 : 5),
      me: {
        id: player.id,
        name: player.name,
        score: player.score,
        rank: board.findIndex((entry) => entry.id === player.id) + 1,
      },
    };
  };

  const broadcastPlayers = (game) => {
    nsp.to(room(game)).emit('players_update', {
      players: [...game.players.values()].map(publicPlayer),
      count: game.players.size,
      connectedCount: connectedCount(game),
    });
  };

  // Upserts make result saving safe to retry if MongoDB temporarily rejects a write.
  const saveResults = async (game) => {
    if (game.savedResults || game.savingResults) return;
    game.savingResults = true;

    try {
      const board = ranked(game);
      const operations = board.map((player) => {
        const accessCode = `KAHOOT-${game.code}-${player.id}`;
        const submission = {
          quiz: game.quizId,
          studentName: player.name,
          studentSurname: '-',
          studentClass: 'Live game',
          accessCode,
          gameMode: 'kahoot',
          score: player.correctCount,
          maxScore: game.questions.length,
          gamePoints: player.score,
          totalQuestions: game.questions.length,
          timeTaken: Math.round(player.totalMs / 1000),
          tabSwitchCount: 0,
          answers: game.questions.map((question, questionIndex) => {
            const answer = player.history[questionIndex];
            return {
              questionId: question.id,
              selectedAnswer: answer && answer.choice !== null
                ? question.options[answer.choice] || ''
                : '',
              isCorrect: Boolean(answer?.correct),
              confidence: null,
            };
          }),
        };

        return {
          updateOne: {
            filter: { quiz: game.quizId, accessCode },
            update: { $setOnInsert: submission },
            upsert: true,
          },
        };
      });

      if (operations.length) {
        await QuizSubmission.bulkWrite(operations, { ordered: false });
      }
      game.savedResults = true;
      if (game.saveRetryTimer) clearTimeout(game.saveRetryTimer);
      game.saveRetryTimer = null;
    } catch (error) {
      console.error('[Kahoot] Could not save results; a retry will be attempted:', error.message);
      if (!game.saveRetryTimer) {
        game.saveRetryTimer = setTimeout(() => {
          game.saveRetryTimer = null;
          saveResults(game);
        }, 5000);
        game.saveRetryTimer.unref?.();
      }
    } finally {
      game.savingResults = false;
    }
  };

  const endQuestion = (game) => {
    if (game.status !== 'question') return;
    clearTimeout(game.timer);
    game.timer = null;
    game.status = 'reveal';

    const question = game.questions[game.index];
    const counts = question.options.map(() => 0);
    for (const answer of game.answers.values()) {
      if (Number.isInteger(answer.choice) && counts[answer.choice] !== undefined) counts[answer.choice] += 1;
    }

    for (const player of game.players.values()) {
      const answer = game.answers.get(player.id);
      const correct = Boolean(answer && answer.choice === question.correctIndex);
      let points = 0;

      if (correct) {
        player.streak += 1;
        points = pointsFor(answer.ms, game.durationMs, player.streak);
        player.score += points;
        player.correctCount += 1;
      } else {
        player.streak = 0;
      }

      player.totalMs += answer ? answer.ms : game.durationMs;
      player.history[game.index] = { choice: answer ? answer.choice : null, correct };
      player.lastResult = {
        correct,
        points,
        choice: answer ? answer.choice : null,
        timedOut: !answer,
        streak: player.streak,
      };
    }

    const board = ranked(game);
    const rankOf = new Map(board.map((player, index) => [player.id, index + 1]));
    game.lastReveal = {
      index: game.index,
      total: game.questions.length,
      correctIndex: question.correctIndex,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      counts,
      leaderboard: leaderboard(game, 5),
      isLast: game.index === game.questions.length - 1,
    };

    nsp.to(room(game)).emit('question_end', game.lastReveal);
    for (const player of game.players.values()) {
      if (!player.connected || !player.socketId) continue;
      nsp.to(player.socketId).emit('answer_result', {
        ...player.lastResult,
        score: player.score,
        rank: rankOf.get(player.id),
        players: board.length,
        correctCount: player.correctCount,
        leaderboard: leaderboard(game, 5),
        correctIndex: question.correctIndex,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });
    }

    if (game.autoStart) {
      clearTimeout(game.advanceTimer);
      game.advanceTimer = setTimeout(() => advance(game), AUTO_ADVANCE_MS);
      game.advanceTimer.unref?.();
    }
  };

  const startQuestion = (game, index) => {
    clearTimeout(game.timer);
    clearTimeout(game.advanceTimer);
    game.advanceTimer = null;
    game.index = index;
    game.status = 'question';
    game.answers = new Map();
    game.startedAt = Date.now();
    game.endsAt = game.startedAt + game.durationMs;
    game.lastReveal = null;

    for (const player of game.players.values()) player.lastResult = null;

    nsp.to(room(game)).emit('question_start', questionPayload(game));
    nsp.to(hostRoom(game)).emit('answer_count', { answered: 0, total: connectedCount(game) });
    game.timer = setTimeout(() => endQuestion(game), game.durationMs + ANSWER_GRACE_MS);
    game.timer.unref?.();
  };

  const finishGame = (game) => {
    if (game.status === 'finished') return;
    clearTimeout(game.autoTimer);
    clearTimeout(game.advanceTimer);
    game.autoTimer = null;
    game.advanceTimer = null;

    if (game.status === 'question') endQuestion(game);
    clearTimeout(game.advanceTimer);
    game.advanceTimer = null;
    game.status = 'finished';

    const board = ranked(game);
    const rankOf = new Map(board.map((player, index) => [player.id, index + 1]));
    const finalBoard = leaderboard(game, 50);

    nsp.to(room(game)).emit('game_finished', { leaderboard: finalBoard, players: board.length });
    for (const player of game.players.values()) {
      if (player.connected && player.socketId) {
        nsp.to(player.socketId).emit('final_result', {
          rank: rankOf.get(player.id),
          score: player.score,
          correctCount: player.correctCount,
          totalQuestions: game.questions.length,
          players: board.length,
        });
      }
    }

    void saveResults(game);
    const cleanupTimer = setTimeout(() => {
      clearTimeout(game.saveRetryTimer);
      games.delete(game.quizId);
    }, FINISHED_TTL_MS);
    cleanupTimer.unref?.();
  };

  const advance = (game) => {
    if (game.status !== 'reveal') return;
    clearTimeout(game.advanceTimer);
    game.advanceTimer = null;
    if (game.index + 1 >= game.questions.length) return finishGame(game);
    startQuestion(game, game.index + 1);
  };

  const startGame = (game) => {
    if (game.status !== 'lobby' || connectedCount(game) === 0) return false;
    clearTimeout(game.autoTimer);
    game.autoTimer = null;
    nsp.to(room(game)).emit('game_started');
    startQuestion(game, 0);
    return true;
  };

  nsp.on('connection', (socket) => {
    const hostGame = (quizId) => {
      const game = games.get(String(quizId));
      return game && game.hostSocketId === socket.id ? game : null;
    };

    // Teacher host
    socket.on('host_join', async ({ quizId, token } = {}) => {
      try {
        if (!mongoose.isValidObjectId(quizId)) {
          return socket.emit('game_error', { code: 'BAD_QUIZ', message: 'This game link is not valid.' });
        }

        const game = await loadGame(String(quizId));
        if (!game) {
          return socket.emit('game_error', { code: 'NO_QUIZ', message: 'This Kahoot game was not found.' });
        }
        if (!game.code) {
          return socket.emit('game_error', { code: 'NO_CODE', message: 'This game has no join PIN. Create it again.' });
        }
        if (!(await verifyHost(token, game))) {
          return socket.emit('game_error', { code: 'UNAUTHORIZED', message: 'Please sign in again to host this game.' });
        }

        game.hostSocketId = socket.id;
        socket.data.role = 'host';
        socket.data.quizId = game.quizId;
        socket.join(room(game));
        socket.join(hostRoom(game));
        socket.emit('host_state', hostView(game));
      } catch (error) {
        console.error('[Kahoot] host_join failed:', error.message);
        socket.emit('game_error', { code: 'SERVER', message: 'Could not open the game. Please try again.' });
      }
    });

    socket.on('host_start', ({ quizId } = {}) => {
      const game = hostGame(quizId);
      if (!game || game.status !== 'lobby') return;
      if (!startGame(game)) {
        socket.emit('game_error', { code: 'NO_PLAYERS', message: 'Wait for at least one connected student to join.' });
      }
    });

    socket.on('host_skip', ({ quizId } = {}) => {
      const game = hostGame(quizId);
      if (game) endQuestion(game);
    });

    socket.on('host_next', ({ quizId } = {}) => {
      const game = hostGame(quizId);
      if (game) advance(game);
    });

    socket.on('host_end', ({ quizId } = {}) => {
      const game = hostGame(quizId);
      if (game) finishGame(game);
    });

    // Student join. loadGame() here removes the race where a student joins before the host socket loads it.
    socket.on('player_join', async ({ code, name, playerId } = {}) => {
      try {
        const cleanCode = String(code || '').trim().toUpperCase();
        if (!cleanCode) {
          return socket.emit('game_error', { code: 'BAD_CODE', message: 'Enter a valid game PIN.' });
        }

        const quiz = await Quiz.findOne({ 'accessCodes.code': cleanCode, gameMode: 'kahoot' }).select('_id');
        if (!quiz) {
          return socket.emit('game_error', { code: 'BAD_CODE', message: 'That game PIN is not valid.' });
        }

        const game = await loadGame(String(quiz._id));
        if (!game) {
          return socket.emit('game_error', { code: 'NO_GAME', message: 'This game is not available.' });
        }

        const pid = String(playerId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || crypto.randomUUID();
        let player = game.players.get(pid);

        if (!player) {
          const nick = cleanName(name);
          if (!nick) {
            return socket.emit('game_error', { code: 'BAD_NAME', message: 'Please enter a valid name.' });
          }
          if (game.status !== 'lobby') {
            return socket.emit('game_error', { code: 'STARTED', message: 'This game has already started.' });
          }
          if (game.players.size >= game.maxPlayers) {
            return socket.emit('game_error', { code: 'FULL', message: 'This game has reached its student limit.' });
          }
          if ([...game.players.values()].some((entry) => entry.name.toLowerCase() === nick.toLowerCase())) {
            return socket.emit('game_error', { code: 'NAME_TAKEN', message: 'That name is already in use. Choose another one.' });
          }

          player = {
            id: pid,
            name: nick,
            score: 0,
            streak: 0,
            correctCount: 0,
            totalMs: 0,
            history: [],
            lastResult: null,
            socketId: socket.id,
            connected: true,
            disconnectTimer: null,
          };
          game.players.set(pid, player);
        } else {
          clearTimeout(player.disconnectTimer);
          player.disconnectTimer = null;
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
          game.autoTimer = setTimeout(() => {
            game.autoTimer = null;
            startGame(game);
          }, AUTO_START_DELAY_MS);
          game.autoTimer.unref?.();
        }
      } catch (error) {
        console.error('[Kahoot] player_join failed:', error.message);
        socket.emit('game_error', { code: 'SERVER', message: 'Could not join the game. Please try again.' });
      }
    });

    socket.on('player_answer', ({ choice } = {}) => {
      if (socket.data.role !== 'player') return;
      const game = games.get(socket.data.quizId);
      const player = game?.players.get(socket.data.playerId);
      if (!game || !player || !player.connected) return;
      if (game.status !== 'question' || Date.now() > game.endsAt + ANSWER_GRACE_MS) return;
      if (game.answers.has(player.id)) return;

      const question = game.questions[game.index];
      if (!Number.isInteger(choice) || choice < 0 || choice >= question.options.length) return;

      game.answers.set(player.id, {
        choice,
        ms: Math.max(0, Date.now() - game.startedAt),
      });
      socket.emit('answer_locked', { choice });
      nsp.to(hostRoom(game)).emit('answer_count', {
        answered: game.answers.size,
        total: connectedCount(game),
      });

      const online = connectedCount(game);
      if (online > 0 && game.answers.size >= online) endQuestion(game);
    });

    socket.on('disconnect', () => {
      const game = games.get(socket.data?.quizId);
      if (!game) return;

      if (socket.data.role === 'host' && game.hostSocketId === socket.id) {
        game.hostSocketId = null;
        return;
      }

      if (socket.data.role !== 'player') return;
      const player = game.players.get(socket.data.playerId);
      if (!player || player.socketId !== socket.id) return;

      player.connected = false;
      // Keep a lobby player briefly so a normal page refresh can reconnect with the same ID.
      if (game.status === 'lobby') {
        clearTimeout(player.disconnectTimer);
        player.disconnectTimer = setTimeout(() => {
          player.disconnectTimer = null;
          if (game.status === 'lobby' && !player.connected) {
            game.players.delete(player.id);
            broadcastPlayers(game);
          }
        }, DISCONNECT_GRACE_MS);
        player.disconnectTimer.unref?.();
      }

      broadcastPlayers(game);
      if (game.status === 'question') {
        const online = connectedCount(game);
        nsp.to(hostRoom(game)).emit('answer_count', { answered: game.answers.size, total: online });
        if (online > 0 && game.answers.size >= online) endQuestion(game);
      }
    });
  });

  // Remove abandoned in-memory games. Completed results are persisted separately.
  const staleTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, game] of games) {
      if (game.status !== 'finished' && now - game.createdAt > STALE_GAME_MS) {
        clearTimeout(game.timer);
        clearTimeout(game.autoTimer);
        clearTimeout(game.advanceTimer);
        for (const player of game.players.values()) clearTimeout(player.disconnectTimer);
        games.delete(id);
      }
    }
  }, 10 * 60 * 1000);
  staleTimer.unref?.();
}
