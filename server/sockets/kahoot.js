// Independent, resumable Kahoot attempts.
// A quiz is shared by the class, but every access code owns its own question timer and progress.
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { KahootAttempt } from '../models/KahootAttempt.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { User } from '../models/User.js';

const MAX_PLAYERS = 500;
const NAME_MAX = 40;
const PLAYER_KEY_MAX = 80;
const FEEDBACK_DELAY_MS = 2600;
const QUESTION_MIN_SECONDS = 5;
const QUESTION_MAX_SECONDS = 120;
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Timers are an optimization only. The actual deadline/status is persisted in MongoDB,
// so a disconnected student or a server restart cannot reset a submitted answer.
const attemptTimers = new Map();
const activeAttemptSockets = new Map();
const activeHostSockets = new Map();
const pendingTimerLoads = new Set();

const cleanName = (value) => String(value ?? '')
  .replace(/[\u0000-\u001f<>]/g, '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, NAME_MAX);

const cleanPlayerKey = (value) => String(value ?? '')
  .replace(/[^a-zA-Z0-9_-]/g, '')
  .slice(0, PLAYER_KEY_MAX);

const normalizeCode = (value) => String(value ?? '').trim().toUpperCase();
const attemptRoom = (attemptId) => `kahoot:attempt:${attemptId}`;
const hostRoom = (quizId) => `kahoot:${quizId}:host`;
const hostSocketKey = (quizId) => String(quizId);

const durationMsFor = (quiz) => {
  const raw = Number(quiz.timeLimit) || 20;
  const seconds = quiz.timeUnit === 'minutes' ? raw * 60 : raw;
  return Math.max(QUESTION_MIN_SECONDS, Math.min(seconds, QUESTION_MAX_SECONDS)) * 1000;
};

const makeAccessCode = (existing = new Set()) => {
  let code;
  do {
    let suffix = '';
    for (let i = 0; i < 8; i += 1) suffix += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)];
    code = `K-${suffix}`;
  } while (existing.has(code));
  existing.add(code);
  return code;
};

const questionForStudent = (quiz, index, attempt) => {
  const question = quiz.questions?.[index];
  if (!question) return null;
  return {
    index,
    total: quiz.questions.length,
    question: question.question,
    options: question.options,
    imageUrl: question.imageUrl || '',
    endsAt: attempt.questionEndsAt ? new Date(attempt.questionEndsAt).getTime() : null,
    durationMs: durationMsFor(quiz),
    serverNow: Date.now(),
  };
};

const publicAttemptForTeacher = (attempt, connected) => ({
  id: String(attempt._id),
  code: attempt.code,
  studentName: attempt.studentName,
  status: attempt.status,
  currentQuestionIndex: attempt.currentQuestionIndex,
  totalQuestions: attempt.totalQuestions,
  score: attempt.score,
  correctCount: attempt.correctCount,
  connected,
  startedAt: attempt.startedAt,
  completedAt: attempt.completedAt,
  lastSeenAt: attempt.lastSeenAt,
});

const verifyHost = async (token, quiz) => {
  if (!token || typeof token !== 'string') return false;
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return false;
  }

  const userId = payload.id || payload._id || payload.userId || payload.sub;
  if (!mongoose.isValidObjectId(userId)) return false;
  const user = await User.findById(userId).select('role isActive');
  if (!user || user.isActive === false) return false;
  return user.role === 'super_admin' || String(user._id) === String(quiz.createdBy);
};

const clearAttemptTimer = (attemptId) => {
  const key = String(attemptId);
  const timer = attemptTimers.get(key);
  if (timer) clearTimeout(timer);
  attemptTimers.delete(key);
};

export function registerKahootGame(io) {
  const nsp = io.of('/kahoot');

  const emitHostState = async (quizId) => {
    const key = String(quizId);
    const quiz = await Quiz.findOne({ _id: key, gameMode: 'kahoot' }).lean();
    if (!quiz) return;

    const attempts = await KahootAttempt.find({ quiz: key })
      .select('code studentName status currentQuestionIndex score correctCount startedAt completedAt lastSeenAt')
      .sort({ createdAt: 1 })
      .lean();
    const attemptsByCode = new Map(attempts.map((attempt) => [attempt.code, attempt]));
    const connectedByAttempt = (code) => {
      const attempt = attemptsByCode.get(code);
      return attempt ? activeAttemptSockets.has(String(attempt._id)) : false;
    };

    const codes = (quiz.accessCodes || []).map((entry) => {
      const code = typeof entry === 'string' ? entry : entry?.code;
      const attempt = attemptsByCode.get(code);
      return {
        code,
        studentName: attempt?.studentName || null,
        status: attempt?.status || 'not_used',
        connected: attempt ? connectedByAttempt(code) : false,
        score: attempt?.score ?? 0,
        currentQuestionIndex: attempt?.currentQuestionIndex ?? 0,
      };
    }).filter((entry) => entry.code);

    const connected = attempts.filter((attempt) => activeAttemptSockets.has(String(attempt._id))).length;
    const summary = {
      total: codes.length,
      notStarted: attempts.filter((attempt) => attempt.status === 'waiting').length + codes.filter((code) => code.status === 'not_used').length,
      inProgress: attempts.filter((attempt) => attempt.status === 'in_progress' || attempt.status === 'feedback').length,
      completed: attempts.filter((attempt) => attempt.status === 'completed').length,
      connected,
    };

    const state = {
      quizId: String(quiz._id),
      title: quiz.title,
      status: quiz.kahootClosedAt ? 'closed' : (quiz.autoStart || quiz.kahootIsOpen ? 'open' : 'waiting_for_teacher'),
      autoStart: Boolean(quiz.autoStart),
      isOpen: !quiz.kahootClosedAt && Boolean(quiz.autoStart || quiz.kahootIsOpen),
      openedAt: quiz.kahootOpenedAt || null,
      closedAt: quiz.kahootClosedAt || null,
      totalQuestions: quiz.questions?.length || 0,
      timeLimit: quiz.timeLimit,
      timeUnit: quiz.timeUnit,
      codes,
      attempts: attempts.map((attempt) => publicAttemptForTeacher(
        attempt,
        activeAttemptSockets.has(String(attempt._id)),
      )),
      summary,
      serverNow: Date.now(),
    };
    nsp.to(hostRoom(key)).emit('host_state', state);
  };

  const sendQuestion = (attempt, quiz) => {
    const payload = questionForStudent(quiz, attempt.currentQuestionIndex, attempt);
    if (payload) nsp.to(attemptRoom(attempt._id)).emit('attempt_question', payload);
  };

  const studentSnapshot = (attempt, quiz) => {
    const status = attempt.status;
    const question = ['in_progress', 'feedback'].includes(status)
      ? questionForStudent(quiz, attempt.currentQuestionIndex, attempt)
      : null;
    return {
      status,
      title: quiz.title,
      total: quiz.questions.length,
      question,
      lastResult: status === 'feedback' ? attempt.lastResult : null,
      feedbackEndsAt: attempt.feedbackEndsAt ? new Date(attempt.feedbackEndsAt).getTime() : null,
      me: {
        name: attempt.studentName,
        score: attempt.score,
        correctCount: attempt.correctCount,
        currentQuestionIndex: attempt.currentQuestionIndex,
      },
      serverNow: Date.now(),
    };
  };

  const saveSubmission = async (attempt, quiz) => {
    const answersByIndex = new Map((attempt.answers || []).map((answer) => [answer.questionIndex, answer]));
    const submission = {
      quiz: quiz._id,
      studentName: attempt.studentName,
      studentSurname: '-',
      studentClass: 'Kahoot',
      accessCode: attempt.code,
      gameMode: 'kahoot',
      score: attempt.correctCount,
      maxScore: quiz.questions.length,
      gamePoints: attempt.score,
      totalQuestions: quiz.questions.length,
      timeTaken: Math.round((attempt.answers || []).reduce((sum, answer) => sum + (answer.timeTakenMs || 0), 0) / 1000),
      tabSwitchCount: 0,
      answers: quiz.questions.map((question, index) => {
        const answer = answersByIndex.get(index);
        return {
          questionId: question._id,
          selectedAnswer: answer?.selectedAnswer || '',
          isCorrect: Boolean(answer?.isCorrect),
          confidence: null,
        };
      }),
    };

    await QuizSubmission.updateOne(
      { quiz: quiz._id, accessCode: attempt.code },
      { $set: submission },
      { upsert: true, runValidators: true },
    );
  };

  const finishAttempt = async (attempt, quiz) => {
    if (attempt.status === 'completed') return;
    clearAttemptTimer(attempt._id);
    attempt.status = 'completed';
    attempt.completedAt = new Date();
    attempt.questionEndsAt = null;
    attempt.feedbackEndsAt = null;
    attempt.lastSeenAt = new Date();
    await attempt.save();

    try {
      await saveSubmission(attempt, quiz);
    } catch (error) {
      // The attempt itself is already durable. A reconnect or teacher refresh can safely retry.
      console.error('[Kahoot] Result save failed; it will be retried on the next sync:', error.message);
    }

    nsp.to(attemptRoom(attempt._id)).emit('attempt_finished', {
      score: attempt.score,
      correctCount: attempt.correctCount,
      totalQuestions: quiz.questions.length,
      completedAt: attempt.completedAt,
    });
    await emitHostState(quiz._id);
  };

  const scheduleAttemptTimer = (attempt) => {
    clearAttemptTimer(attempt._id);
    let target = null;
    let callback = null;
    if (attempt.status === 'in_progress' && attempt.questionEndsAt) {
      target = new Date(attempt.questionEndsAt).getTime();
      callback = () => processTimeout(attempt._id);
    } else if (attempt.status === 'feedback' && attempt.feedbackEndsAt) {
      target = new Date(attempt.feedbackEndsAt).getTime();
      callback = () => advanceAttempt(attempt._id);
    }
    if (!target || !callback) return;
    const timer = setTimeout(() => {
      attemptTimers.delete(String(attempt._id));
      void callback();
    }, Math.max(0, target - Date.now()));
    timer.unref?.();
    attemptTimers.set(String(attempt._id), timer);
  };

  const beginAttempt = async (attempt, quiz) => {
    if (!attempt || attempt.status !== 'waiting') return attempt;
    if (!quiz.questions?.length) return attempt;
    const now = new Date();
    attempt.status = 'in_progress';
    attempt.currentQuestionIndex = 0;
    attempt.currentQuestionAnswered = false;
    attempt.startedAt = attempt.startedAt || now;
    attempt.questionStartedAt = now;
    attempt.questionEndsAt = new Date(now.getTime() + durationMsFor(quiz));
    attempt.feedbackEndsAt = null;
    attempt.lastResult = null;
    await attempt.save();
    sendQuestion(attempt, quiz);
    scheduleAttemptTimer(attempt);
    await emitHostState(quiz._id);
    return attempt;
  };

  const recordAnswer = async (attemptId, selectedIndex, timedOut = false) => {
    const attempt = await KahootAttempt.findById(attemptId);
    if (!attempt || attempt.status !== 'in_progress') return null;
    const quiz = await Quiz.findById(attempt.quiz);
    if (!quiz) return null;

    const questionIndex = attempt.currentQuestionIndex;
    const question = quiz.questions[questionIndex];
    if (!question) return null;

    const now = new Date();
    const deadline = attempt.questionEndsAt ? new Date(attempt.questionEndsAt).getTime() : 0;
    if (!timedOut && deadline && now.getTime() > deadline + 500) return null;

    // The atomic flag prevents two tabs/connections from submitting twice for one question.
    const locked = await KahootAttempt.findOneAndUpdate(
      {
        _id: attempt._id,
        status: 'in_progress',
        currentQuestionIndex: questionIndex,
        currentQuestionAnswered: false,
      },
      { $set: { currentQuestionAnswered: true } },
      { new: true },
    );
    if (!locked) return null;

    const duration = durationMsFor(quiz);
    const started = locked.questionStartedAt ? new Date(locked.questionStartedAt).getTime() : now.getTime();
    const timeTakenMs = timedOut ? duration : Math.max(0, Math.min(duration, now.getTime() - started));
    const validSelection = Number.isInteger(selectedIndex)
      && selectedIndex >= 0
      && selectedIndex < question.options.length;
    const chosenIndex = validSelection && !timedOut ? selectedIndex : null;
    const correctIndex = question.options.findIndex((option) => option === question.correctAnswer);
    const isCorrect = chosenIndex !== null && chosenIndex === correctIndex;
    const points = isCorrect
      ? Math.max(100, Math.round(1000 * (1 - (timeTakenMs / duration) * 0.5)))
      : 0;

    locked.answers.push({
      questionId: question._id,
      questionIndex,
      selectedIndex: chosenIndex,
      selectedAnswer: chosenIndex === null ? '' : question.options[chosenIndex],
      isCorrect,
      timedOut: Boolean(timedOut),
      points,
      timeTakenMs,
      answeredAt: now,
    });
    locked.score += points;
    if (isCorrect) locked.correctCount += 1;
    locked.status = 'feedback';
    locked.feedbackEndsAt = new Date(now.getTime() + FEEDBACK_DELAY_MS);
    locked.questionEndsAt = null;
    locked.lastSeenAt = now;
    locked.lastResult = {
      correct: isCorrect,
      isCorrect,
      timedOut: Boolean(timedOut),
      selectedIndex: chosenIndex,
      correctIndex,
      selectedAnswer: chosenIndex === null ? '' : question.options[chosenIndex],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
      points,
      score: locked.score,
      correctCount: locked.correctCount,
      questionIndex,
      totalQuestions: quiz.questions.length,
      feedbackEndsAt: locked.feedbackEndsAt.getTime(),
    };
    await locked.save();

    clearAttemptTimer(locked._id);
    nsp.to(attemptRoom(locked._id)).emit('answer_result', locked.lastResult);
    scheduleAttemptTimer(locked);
    await emitHostState(quiz._id);
    return locked;
  };

  async function processTimeout(attemptId) {
    try {
      const attempt = await KahootAttempt.findById(attemptId);
      if (!attempt || attempt.status !== 'in_progress') return;
      const deadline = attempt.questionEndsAt ? new Date(attempt.questionEndsAt).getTime() : 0;
      if (deadline > Date.now()) return scheduleAttemptTimer(attempt);
      await recordAnswer(attempt._id, null, true);
    } catch (error) {
      console.error('[Kahoot] Question timeout failed:', error.message);
    }
  }

  async function advanceAttempt(attemptId) {
    try {
      const attempt = await KahootAttempt.findById(attemptId);
      if (!attempt || attempt.status !== 'feedback') return;
      const feedbackEnd = attempt.feedbackEndsAt ? new Date(attempt.feedbackEndsAt).getTime() : 0;
      if (feedbackEnd > Date.now()) return scheduleAttemptTimer(attempt);
      const quiz = await Quiz.findById(attempt.quiz);
      if (!quiz) return;

      const nextIndex = attempt.currentQuestionIndex + 1;
      if (nextIndex >= quiz.questions.length) return finishAttempt(attempt, quiz);

      const now = new Date();
      attempt.status = 'in_progress';
      attempt.currentQuestionIndex = nextIndex;
      attempt.currentQuestionAnswered = false;
      attempt.questionStartedAt = now;
      attempt.questionEndsAt = new Date(now.getTime() + durationMsFor(quiz));
      attempt.feedbackEndsAt = null;
      attempt.lastResult = null;
      attempt.lastSeenAt = now;
      await attempt.save();
      sendQuestion(attempt, quiz);
      scheduleAttemptTimer(attempt);
      await emitHostState(quiz._id);
    } catch (error) {
      console.error('[Kahoot] Could not advance student attempt:', error.message);
    }
  }

  const loadOrCreateAttempt = async ({ quiz, code, playerKey, studentName }) => {
    let attempt = await KahootAttempt.findOne({ quiz: quiz._id, code });
    if (attempt) {
      if (attempt.playerKey !== playerKey) {
        const error = new Error('This student code has already been assigned to another attempt. Ask your teacher for your own code.');
        error.code = 'CODE_USED';
        throw error;
      }
      return attempt;
    }

    if (quiz.kahootClosedAt) {
      const error = new Error('This quiz has been closed by the teacher.');
      error.code = 'CLOSED';
      throw error;
    }

    const isOpen = !quiz.kahootClosedAt && Boolean(quiz.autoStart || quiz.kahootIsOpen);
    try {
      attempt = await KahootAttempt.create({
        quiz: quiz._id,
        code,
        playerKey,
        studentName,
        status: isOpen ? 'in_progress' : 'waiting',
        currentQuestionIndex: 0,
        currentQuestionAnswered: false,
        startedAt: isOpen ? new Date() : null,
        questionStartedAt: isOpen ? new Date() : null,
        questionEndsAt: isOpen ? new Date(Date.now() + durationMsFor(quiz)) : null,
      });
      return attempt;
    } catch (error) {
      if (error.code !== 11000) throw error;
      attempt = await KahootAttempt.findOne({ quiz: quiz._id, code });
      if (!attempt || attempt.playerKey !== playerKey) {
        const conflict = new Error('This student code has already been used. Ask your teacher for another code.');
        conflict.code = 'CODE_USED';
        throw conflict;
      }
      return attempt;
    }
  };

  const ensureKahootCodes = async (quiz) => {
    const entries = Array.isArray(quiz.accessCodes) ? quiz.accessCodes : [];
    const existing = new Set(entries.map((entry) => typeof entry === 'string' ? entry : entry?.code).filter(Boolean));
    const desired = Math.max(1, Math.min(Number(quiz.numberOfStudents) || 1, MAX_PLAYERS));
    let changed = false;
    while (existing.size < desired) {
      quiz.accessCodes.push({ code: makeAccessCode(existing), createdAt: new Date() });
      changed = true;
    }
    if (changed) await quiz.save();
  };

  const joinAttempt = async (socket, { code, name, playerId } = {}) => {
    const normalizedCode = normalizeCode(code);
    const playerKey = cleanPlayerKey(playerId);
    const studentName = cleanName(name);
    if (!normalizedCode || !playerKey || !studentName) {
      socket.emit('game_error', { code: 'BAD_JOIN', message: 'Enter your student code and name again.' });
      return;
    }

    const quiz = await Quiz.findOne({
      gameMode: 'kahoot',
      'accessCodes.code': normalizedCode,
    });
    if (!quiz) {
      socket.emit('game_error', { code: 'BAD_CODE', message: 'That student code is not valid.' });
      return;
    }

    let attempt;
    try {
      attempt = await loadOrCreateAttempt({
        quiz,
        code: normalizedCode,
        playerKey,
        studentName,
      });
    } catch (error) {
      socket.emit('game_error', { code: error.code || 'JOIN_FAILED', message: error.message || 'Could not join this quiz.' });
      return;
    }

    // Re-read the quiz after reserving the code. This closes the small race where
    // the teacher opens the quiz while this student is joining.
    const latestQuiz = await Quiz.findById(quiz._id);
    if (!latestQuiz) {
      socket.emit('game_error', { code: 'NO_QUIZ', message: 'This Kahoot is no longer available.' });
      return;
    }

    if (attempt.status !== 'completed' && attempt.studentName !== studentName) {
      attempt.studentName = studentName;
    }
    attempt.lastSeenAt = new Date();
    await attempt.save();

    socket.data.role = 'player';
    socket.data.quizId = String(latestQuiz._id);
    socket.data.attemptId = String(attempt._id);
    socket.data.playerKey = playerKey;
    socket.join(attemptRoom(attempt._id));
    activeAttemptSockets.set(String(attempt._id), socket.id);

    const isOpen = !latestQuiz.kahootClosedAt && Boolean(latestQuiz.autoStart || latestQuiz.kahootIsOpen);
    if (attempt.status === 'waiting' && isOpen) {
      attempt = await beginAttempt(attempt, latestQuiz);
    } else if (attempt.status === 'in_progress' && !attempt.questionEndsAt) {
      attempt.questionStartedAt = new Date();
      attempt.questionEndsAt = new Date(Date.now() + durationMsFor(latestQuiz));
      await attempt.save();
    }

    if (attempt.status === 'completed') {
      try { await saveSubmission(attempt, latestQuiz); } catch (error) {
        console.error('[Kahoot] Could not retry completed result save:', error.message);
      }
    }
    socket.emit('joined', studentSnapshot(attempt, latestQuiz));
    if (attempt.status === 'in_progress') scheduleAttemptTimer(attempt);
    if (attempt.status === 'feedback') scheduleAttemptTimer(attempt);
    await emitHostState(latestQuiz._id);
  };

  nsp.on('connection', (socket) => {
    socket.on('host_join', async ({ quizId, token } = {}) => {
      try {
        if (!mongoose.isValidObjectId(quizId)) {
          socket.emit('game_error', { code: 'BAD_QUIZ', message: 'This Kahoot link is not valid.' });
          return;
        }
        const quiz = await Quiz.findOne({ _id: quizId, gameMode: 'kahoot' });
        if (!quiz) {
          socket.emit('game_error', { code: 'NO_QUIZ', message: 'This Kahoot was not found.' });
          return;
        }
        if (!(await verifyHost(token, quiz))) {
          socket.emit('game_error', { code: 'UNAUTHORIZED', message: 'Please sign in again or open a quiz you created.' });
          return;
        }

        await ensureKahootCodes(quiz);
        activeHostSockets.set(hostSocketKey(quiz._id), socket.id);
        socket.data.role = 'host';
        socket.data.quizId = String(quiz._id);
        socket.join(hostRoom(quiz._id));
        await emitHostState(quiz._id);
      } catch (error) {
        console.error('[Kahoot] host_join failed:', error.message);
        socket.emit('game_error', { code: 'SERVER', message: 'Could not open the teacher dashboard. Please try again.' });
      }
    });

    socket.on('host_start', async ({ quizId } = {}) => {
      const id = String(quizId || socket.data.quizId || '');
      if (socket.data.role !== 'host' || activeHostSockets.get(hostSocketKey(id)) !== socket.id) return;
      try {
        const quiz = await Quiz.findOne({ _id: id, gameMode: 'kahoot' });
        if (!quiz) return socket.emit('game_error', { code: 'NO_QUIZ', message: 'Kahoot not found.' });
        quiz.kahootIsOpen = true;
        quiz.kahootOpenedAt = quiz.kahootOpenedAt || new Date();
        quiz.kahootClosedAt = null;
        await quiz.save();

        const waitingAttempts = await KahootAttempt.find({ quiz: quiz._id, status: 'waiting' });
        for (const attempt of waitingAttempts) await beginAttempt(attempt, quiz);
        await emitHostState(quiz._id);
        socket.emit('host_notice', { message: 'Quiz opened. Students can now start using their individual codes.' });
      } catch (error) {
        console.error('[Kahoot] host_start failed:', error.message);
        socket.emit('game_error', { code: 'SERVER', message: 'Could not open the quiz. Please try again.' });
      }
    });

    socket.on('host_end', async ({ quizId } = {}) => {
      const id = String(quizId || socket.data.quizId || '');
      if (socket.data.role !== 'host' || activeHostSockets.get(hostSocketKey(id)) !== socket.id) return;
      try {
        await Quiz.updateOne(
          { _id: id, gameMode: 'kahoot' },
          { $set: { kahootIsOpen: false, kahootClosedAt: new Date() } },
        );
        await emitHostState(id);
        socket.emit('host_notice', { message: 'New attempts are closed. Students who already started can finish.' });
      } catch (error) {
        console.error('[Kahoot] host_end failed:', error.message);
        socket.emit('game_error', { code: 'SERVER', message: 'Could not close new attempts.' });
      }
    });

    socket.on('player_join', async (payload = {}) => {
      try {
        await joinAttempt(socket, payload);
      } catch (error) {
        console.error('[Kahoot] player_join failed:', error.message);
        socket.emit('game_error', { code: 'SERVER', message: 'Could not join the quiz. Please try again.' });
      }
    });

    socket.on('player_answer', async ({ choice } = {}) => {
      if (socket.data.role !== 'player') return;
      const attemptId = String(socket.data.attemptId || '');
      if (!attemptId || activeAttemptSockets.get(attemptId) !== socket.id) return;
      if (!Number.isInteger(choice)) return;
      try {
        await recordAnswer(attemptId, choice, false);
      } catch (error) {
        console.error('[Kahoot] player_answer failed:', error.message);
        socket.emit('game_error', { code: 'ANSWER_FAILED', message: 'Your answer could not be saved. Please reconnect and try again.' });
      }
    });

    socket.on('disconnect', () => {
      if (socket.data.role === 'player' && socket.data.attemptId) {
        const attemptId = String(socket.data.attemptId);
        if (activeAttemptSockets.get(attemptId) === socket.id) {
          activeAttemptSockets.delete(attemptId);
          void emitHostState(socket.data.quizId);
        }
      }
      if (socket.data.role === 'host' && socket.data.quizId) {
        const key = hostSocketKey(socket.data.quizId);
        if (activeHostSockets.get(key) === socket.id) activeHostSockets.delete(key);
      }
    });
  });

  const hydrateTimers = async () => {
    if (pendingTimerLoads.has('loaded')) return;
    pendingTimerLoads.add('loaded');
    try {
      const active = await KahootAttempt.find({ status: { $in: ['in_progress', 'feedback'] } })
        .select('_id status questionEndsAt feedbackEndsAt');
      for (const attempt of active) scheduleAttemptTimer(attempt);
    } catch (error) {
      console.error('[Kahoot] Could not restore attempt timers:', error.message);
      pendingTimerLoads.delete('loaded');
    }
  };

  if (mongoose.connection.readyState === 1) {
    void hydrateTimers();
  } else {
    mongoose.connection.once('connected', () => { void hydrateTimers(); });
  }
}
