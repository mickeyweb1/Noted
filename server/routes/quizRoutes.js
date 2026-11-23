import express from 'express';
import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
import { KahootAttempt } from '../models/KahootAttempt.js';
import { QuizSubmission } from '../models/QuizSubmission.js';
import { QuizSession } from '../models/QuizSession.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { generateWithGroq } from '../config/grok.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { protect } from '../middleware/protect.js';
import { Content } from '../models/Content.js';
import { applyReview } from '../utils/sm2.js';
import { QuizShare } from '../models/QuizShare.js';
import crypto from 'crypto';
import {
  PLAN_FIELDS,
  resolvePlan,
  getCreditsInfo,
  spendCredits,
  refundCredits,
  gameShowQuotaError,
  countGameShowsThisMonth,
} from '../config/plans.js';

const router = express.Router();

// Update a queued teacher quiz question or generated library quiz question.
router.post('/:id/review', protect, async (req, res, next) => {
  try {
    const { questionIndex, correct } = req.body || {};
    if (!Number.isInteger(questionIndex) || typeof correct !== 'boolean') {
      return res.status(400).json({ success: false, message: 'questionIndex and boolean correct are required.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid quiz ID.' });
    }
    const quiz = await Quiz.findOne({ _id: req.params.id, createdBy: req.user._id });
    let target;
    if (quiz) {
      target = quiz.questions[questionIndex];
      if (!target || !target.revisionQueued) return res.status(404).json({ success: false, message: 'Queued question not found.' });
      Object.assign(target, applyReview(target.toObject(), correct));
      await quiz.save();
    } else {
      const content = await Content.findOne({ _id: req.params.id, userId: req.user._id, type: 'quiz' });
      target = content?.revisionQuestions.find((q) => q.questionIndex === questionIndex);
      if (!target) return res.status(404).json({ success: false, message: 'Queued question not found.' });
      Object.assign(target, applyReview(target.toObject(), correct));
      await content.save();
    }
    const today = new Date().toISOString().slice(0, 10);
    await User.updateOne({ _id: req.user._id }, { $addToSet: { revisionActivityDates: today } });
    return res.json({ success: true, data: { nextReviewDate: target.nextReviewDate, interval: target.interval, ease: target.ease, repetitions: target.repetitions, lastResult: target.lastResult } });
  } catch (error) { next(error); }
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = {
  _handleFile(req, file, callback) {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'noted_quizzes', allowed_formats: ['jpeg', 'jpg', 'png', 'gif', 'webp'] },
      (error, result) => {
        if (error) return callback(error);
        callback(null, {
          path: result.secure_url,
          size: result.bytes,
          filename: result.public_id,
        });
      },
    );
    file.stream.pipe(uploadStream);
  },
  _removeFile(req, file, callback) {
    cloudinary.uploader.destroy(file.filename, { invalidate: true }, callback);
  },
};
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const CODE_LIFETIME_DAYS = 30;
const NOTES_MAX = 20000;
const MAX_QUESTIONS_PER_QUIZ = 200;          // hard cap for ANY quiz (manual, AI and custom questions together)
const MAX_AI_QUESTIONS_PER_REQUEST = 150;    // the plan's maxQ can only lower this
const LATE_GRACE_SECONDS = 60;
const DIFFICULTIES = ['Basic', 'Intermediate', 'Hard', 'Max'];
const SHARE_ROLES = ['teacher', 'hod', 'school_admin', 'super_admin'];

const generateAccessCode = (mode = 'test') => {
  const prefix = mode === 'gameShow' ? 'G-' : (mode === 'kahoot' ? 'K-' : 'T-'); // ✅ Added K- for Kahoot
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 8; i++) code += chars.charAt(crypto.randomInt(chars.length));
  return code;
};

const normalizeCode = (code) => (typeof code === 'string' ? code.trim().toUpperCase() : '');

const codesOf = (quiz) => (quiz?.accessCodes || []).map((ac) => (typeof ac === 'string' ? ac : ac?.code)).filter(Boolean);

const getAccessCodeHistory = (quiz) => {
  return (quiz?.accessCodes || [])
    .map((ac) => {
      const code = typeof ac === 'string' ? ac : ac.code;
      const createdAt = typeof ac === 'string' ? quiz.createdAt : ac.createdAt;
      const expiresAt = new Date(new Date(createdAt).getTime() + CODE_LIFETIME_DAYS * 86400000);
      return { code, createdAt, expiresAt };
    })
    .filter((ac) => ac.code);
};

const findQuizByCode = (code) => Quiz.findOne({ 'accessCodes.code': code });

const isCodeExpired = (quiz, code) => {
  const entry = (quiz.accessCodes || []).find((ac) => ac?.code === code);
  const created = new Date(entry?.createdAt || quiz.createdAt).getTime();
  return (Date.now() - created) / 86400000 > CODE_LIFETIME_DAYS;
};

const uniqueCode = (mode, existing) => {
  let code = generateAccessCode(mode);
  while (existing.has(code)) code = generateAccessCode(mode);
  existing.add(code);
  return code;
};

// True when the quiz creator's plan still shows the "Powered by Noted AI" badge
const hasBranding = async (creatorId) => {
  const creator = await User.findById(creatorId).select(PLAN_FIELDS);
  if (!creator) return true;
  return (await resolvePlan(creator)).branding;
};

// Can `user` see the results of a quiz made by `creatorId`?
//   super admin  -> everyone
//   school owner -> their teachers AND their heads of department
//   HOD          -> only the teachers assigned to them
const isSchoolOwnerOf = async (user, creatorId) => {
  if (user.role === 'super_admin') return true;
  if (user.role !== 'school_admin' && user.role !== 'hod') return false;

  const creator = await User.findById(creatorId).select('role schoolOwnerId hodId schoolId');
  if (!creator || !['teacher', 'hod'].includes(creator.role)) return false;

  if (user.role === 'hod') {
    return creator.role === 'teacher' && String(creator.hodId) === String(user._id);
  }

  if (creator.schoolOwnerId && String(creator.schoolOwnerId) === String(user._id)) return true;
  const org = await Organization.findOne({ adminId: user._id }).select('_id');
  return Boolean(org && creator.schoolId && String(creator.schoolId) === String(org._id));
};

const loadQuiz = async (req, res, { allowSchoolOwner = false } = {}) => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(404).json({ success: false, message: 'Quiz not found' }); return null; }
  const quiz = await Quiz.findById(req.params.id);
  if (!quiz) { res.status(404).json({ success: false, message: 'Quiz not found' }); return null; }
  const isCreator = String(quiz.createdBy) === String(req.user._id);
  if (!isCreator && !(allowSchoolOwner && (await isSchoolOwnerOf(req.user, quiz.createdBy)))) {
    res.status(403).json({ success: false, message: 'You do not have access to this quiz' });
    return null;
  }
  return quiz;
};

// Makes AI/manual output safe for scoring: correctAnswer must match exactly one option
const normalizeQuestion = (q) => {
  if (!q || typeof q.question !== 'string' || !Array.isArray(q.options)) return null;
  const options = q.options.map((o) => String(o ?? '').trim()).filter(Boolean);
  if (options.length < 2) return null;
  const correct = String(q.correctAnswer ?? '').trim();
  let idx = options.findIndex((o) => o === correct);
  const letter = correct.match(/^\(?([A-D])\)?[.):]?$/i);
  if (idx === -1 && letter) idx = letter[1].toUpperCase().charCodeAt(0) - 65;
  if (idx === -1) idx = options.findIndex((o) => o.toLowerCase() === correct.toLowerCase());
  if (idx < 0 || idx >= options.length) return null;
  return {
    question: q.question.trim(),
    topic: typeof q.topic === 'string' ? q.topic.trim().slice(0, 80) : '',
    options,
    correctAnswer: options[idx],
    explanation: typeof q.explanation === 'string' ? q.explanation.trim() : '',
    ...(typeof q.imageUrl === 'string' && q.imageUrl ? { imageUrl: q.imageUrl } : {}),
  };
};

/* ------------------------------------------------------------------ */
/* 0. My limits                                                        */
/* ------------------------------------------------------------------ */
router.get('/my-limits', protect, async (req, res, next) => {
  try {
    const plan = await resolvePlan(req.user);
    const finite = (v) => (Number.isFinite(v) ? v : null);
    const gameShowsUsed = await countGameShowsThisMonth(req.user._id);
    res.json({
      success: true,
      data: {
        plan: plan.key,
        planLabel: plan.label,
        locked: plan.locked,
        maxQuestionsPerQuiz: plan.maxQ,
        maxStudents: plan.codes,
        gameShowsPerMonth: finite(plan.gameShows),
        gameShowsUsed,
        credits: getCreditsInfo(req.user, plan),
        features: {
          share: plan.share,
          duplicate: plan.duplicate,
          insights: plan.insights,
          removeBranding: !plan.branding,
        },
      },
    });
  } catch (error) { next(error); }
});

/* ------------------------------------------------------------------ */
/* 1. AI preview (batched, retried, de-duplicated, time-boxed)         */
/* ------------------------------------------------------------------ */
const generating = new Set(); // user ids with an AI run in progress (stops double-click double-charging; per server instance)

router.post('/generate-ai-preview', protect, async (req, res, next) => {
  let lockKey = null;
  let held = 0; // credits charged but not yet settled (refunded if anything unexpected throws)

  try {
    const { notes, focusTopics, difficulty, numQuestions, gameMode } = req.body || {};
    if (typeof notes !== 'string' || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide some notes.' });
    }
    if (notes.length > NOTES_MAX) {
      return res.status(400).json({ success: false, message: `Your notes are too long. Keep them under ${NOTES_MAX.toLocaleString()} characters.` });
    }

    const count = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 1), MAX_AI_QUESTIONS_PER_REQUEST);

    const plan = await resolvePlan(req.user);
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });

    if (count > plan.maxQ) {
      return res.status(403).json({ success: false, message: `Your plan allows up to ${plan.maxQ} AI questions per quiz. Upgrade to generate more!` });
    }

if (gameMode === 'gameShow' || gameMode === 'kahoot') {
  const quotaError = await gameShowQuotaError(req.user, plan);
  if (quotaError) return res.status(403).json({ success: false, message: quotaError });
}

    // One AI run per user at a time
    lockKey = String(req.user._id);
    if (generating.has(lockKey)) {
      lockKey = null;
      return res.status(429).json({ success: false, message: 'Your previous generation is still running. Please wait for it to finish.' });
    }
    generating.add(lockKey);

    const charged = await spendCredits(req.user, plan, count);
    if (!charged) {
      const fresh = await User.findById(req.user._id).select('aiCreditsUsed creditsPeriodStart');
      const info = getCreditsInfo(fresh || req.user, plan);
      return res.status(403).json({
        success: false,
        message: `Not enough AI credits this month (${info.remaining} left, this quiz needs ${count}). Upgrade your plan or wait for your credits to refresh.`,
      });
    }
    held = count;

    const topics = typeof focusTopics === 'string' ? focusTopics.trim().slice(0, 200) : '';
    const topicInstruction = topics ? `\n\nCRITICAL INSTRUCTION: ONLY generate questions about these specific topics: "${topics}". Ignore all other parts of the notes.` : '';
    const level = DIFFICULTIES.includes(difficulty) ? difficulty : 'Intermediate';

    const BATCH = 30;                 // 25 x 300 tokens + 500 = 8000 (the max_tokens cap)
    const TIME_BUDGET_MS = 80_000;    // proxies cut a request at ~100s: stop STARTING new batches after this
    const startedAt = Date.now();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const keyOf = (q) => q.question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 90);

    const questions = [];
    const seen = new Set();

    const buildPrompt = (n, avoidText) => `You are an expert examiner and mathematics teacher. Generate EXACTLY ${n} multiple-choice questions based on the provided notes. Difficulty: ${level}.${topicInstruction}

IMPORTANT FORMATTING RULES FOR MATH AND SHAPES:
1. You MUST use LaTeX for ALL mathematical expressions, formulas, and geometry symbols.
2. Use single dollar signs for inline math: $\\sin(\\theta)$, $\\triangle ABC$, $\\angle 90^\\circ$, $\\frac{a}{b}$.
3. Use double dollar signs for block equations if needed: $$ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} $$
4. For geometry, use standard LaTeX symbols: \\triangle for triangle, \\angle for angle, \\circ for degrees, \\perp for perpendicular.
5. If a question involves a geometric construction or complex diagram, describe the steps clearly in text and use LaTeX for all labels.
6. Output VALID JSON ONLY. Do not include markdown like \`\`\`json.
7. Each question has exactly 4 options and "correctAnswer" must be the EXACT text of one option.
8. Keep each explanation to ONE short sentence.${avoidText ? `\n\nCRITICAL: Do NOT repeat or generate questions similar to these already generated questions:\n${avoidText}` : ''}

Required JSON format:
{ "questions": [ { "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "exact option text", "explanation": "..." } ] }`;

    const runBatch = async (n) => {
      const avoidText = questions.slice(-60).map((q) => q.question).join('\n');
      const response = await generateWithGroq(
        [{ role: 'system', content: buildPrompt(n, avoidText) }, { role: 'user', content: `Notes:\n${notes}` }],
        { max_tokens: Math.min(300 * n + 500, 8000), json: true }
      );
      const parsed = JSON.parse(response.slice(response.indexOf('{'), response.lastIndexOf('}') + 1));
      return (parsed.questions || []).map(normalizeQuestion).filter(Boolean).slice(0, n);
    };

    let failures = 0;
    let lastError = null;
    const maxAttempts = Math.ceil(count / BATCH) + 3; // +3 = top-ups for duplicates or failed batches

    for (let attempt = 0; attempt < maxAttempts && questions.length < count; attempt++) {
      if (attempt > 0 && Date.now() - startedAt > TIME_BUDGET_MS) break;
      const n = Math.min(BATCH, count - questions.length);
      try {
        let batch;
        try {
          batch = await runBatch(n);
        } catch (err) {
          // one retry, with a longer pause when the AI provider is rate limiting us
          await sleep(/429|rate/i.test(String(err.message)) ? 8000 : 2000);
          batch = await runBatch(n);
        }
        for (const q of batch) {
          const k = keyOf(q);
          if (!seen.has(k) && questions.length < count) { seen.add(k); questions.push(q); }
        }
        failures = 0;
      } catch (err) {
        lastError = err;
        console.error('❌ AI batch failed:', err.message);
        if (++failures >= 2) break;
      }
    }

    if (questions.length === 0) {
      console.error('❌ AI generation failed:', lastError?.message);
      await refundCredits(req.user._id, count);
      held = 0;
      return res.status(502).json({ success: false, message: 'The AI could not generate usable questions. No credits were used. Try again with fewer notes or fewer questions.' });
    }

    // Only charge for what was actually returned (refunded exactly once)
    const shortfall = count - questions.length;
    if (shortfall > 0) await refundCredits(req.user._id, shortfall);
    held = 0;

    return res.json({ success: true, data: { questions }, partial: shortfall > 0, creditsUsed: questions.length });
  } catch (error) {
    if (held > 0) await refundCredits(req.user._id, held).catch(() => {});
    next(error);
  } finally {
    if (lockKey) generating.delete(lockKey);
  }
});

/* ------------------------------------------------------------------ */
/* 2. Finalize quiz                                                    */
/* ------------------------------------------------------------------ */
router.post('/create-manual', protect, async (req, res, next) => {
  try {
    const { title, difficulty, numStudents, timeLimit, timeUnit, timeType, maxTabSwitches, layoutMode = 'scroll', showAnswersAfterSubmission = true, passMark = 50, questions, gameMode = 'test', baseMarks = 10, bonusMarks = 5, autoStart = false } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ success: false, message: 'A title is required.' });

    const unit = timeUnit === 'seconds' ? 'seconds' : 'minutes';
    const type = timeType === 'perQuestion' ? 'perQuestion' : 'total';
    const limit = Number(timeLimit);
    const maxTime = unit === 'minutes' ? 600 : 3600;
    if (!(limit > 0) || limit > maxTime) {
      return res.status(400).json({ success: false, message: `Please set a time limit between 1 and ${maxTime} ${unit}.` });
    }
    if (!Number.isInteger(Number(passMark)) || Number(passMark) < 0 || Number(passMark) > 100) {
      return res.status(400).json({ success: false, message: 'Pass mark must be a whole number from 0 to 100.' });
    }
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ success: false, message: 'A quiz needs at least one question.' });

    // One limit for every kind of quiz. The plan's maxQ only limits AI generation (see /generate-ai-preview).
    if (questions.length > MAX_QUESTIONS_PER_QUIZ) {
      return res.status(400).json({ success: false, message: `A quiz can have at most ${MAX_QUESTIONS_PER_QUIZ} questions.` });
    }

    const cleanQuestions = questions.map(normalizeQuestion);
    const badIndex = cleanQuestions.findIndex((q) => !q);
    if (badIndex !== -1) {
      return res.status(400).json({ success: false, message: `Question ${badIndex + 1} needs text, at least 2 options, and a correct answer that matches one option.` });
    }

const mode = gameMode === 'gameShow' ? 'gameShow' : (gameMode === 'kahoot' ? 'kahoot' : 'test');
    const studentCount = mode === 'gameShow' ? 2 : Math.min(Math.max(parseInt(numStudents, 10) || 1, 1), 500);

    const plan = await resolvePlan(req.user);
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });

    if (studentCount > plan.codes) {
      return res.status(403).json({ success: false, message: `Your plan allows up to ${plan.codes} student codes per test. Upgrade to add more!` });
    }

if (mode === 'gameShow' || mode === 'kahoot') {
  const quotaError = await gameShowQuotaError(req.user, plan);
  if (quotaError) return res.status(403).json({ success: false, message: quotaError });
}

    const tabs = parseInt(maxTabSwitches, 10);
    const tabLimit = Number.isInteger(tabs) && tabs > 0 ? Math.min(tabs, 100) : null;

const used = new Set();
const accessCodeCount = studentCount;
const accessCodes = Array.from({ length: accessCodeCount }, () => ({
  code: uniqueCode(mode, used),
  createdAt: new Date(),
}));
    const quiz = await Quiz.create({
      title: title.trim().slice(0, 160),
      difficulty: DIFFICULTIES.includes(difficulty) ? difficulty : 'Intermediate',
      timeLimit: limit, timeUnit: unit, timeType: type,
      maxTabSwitches: tabLimit,
      layoutMode: layoutMode === 'paginated' ? 'paginated' : 'scroll',
      showAnswersAfterSubmission: showAnswersAfterSubmission !== false,
      passMark: Number(passMark),
      numberOfStudents: studentCount,
      gameMode: mode,
      baseMarks: Number(baseMarks) || 10,
      bonusMarks: Number(bonusMarks) || 5,
      autoStart: Boolean(autoStart),
      kahootIsOpen: mode === 'kahoot' && Boolean(autoStart),
      kahootOpenedAt: mode === 'kahoot' && Boolean(autoStart) ? new Date() : null,
      kahootClosedAt: null,
      questions: cleanQuestions,
      accessCodes,
      createdBy: req.user._id,
    });

    res.json({ success: true, data: quiz, accessCodes: codesOf(quiz) });
  } catch (error) { next(error); }
});

/* ------------------------------------------------------------------ */
/* 3. Student session                                                  */
/* ------------------------------------------------------------------ */
router.post('/session/start', async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    if (!code) return res.status(400).json({ success: false, message: 'Access code is required' });

    const quiz = await findQuizByCode(code);
    if (!quiz) return res.status(404).json({ success: false, message: 'Invalid access code' });

    if (quiz.gameMode === 'kahoot') {
  return res.status(400).json({
    success: false,
    message: 'Kahoot quizzes must be joined through the Kahoot join page.'
  });
}

    const isFreeTier = await hasBranding(quiz.createdBy);
    let session = await QuizSession.findOne({ code });
    const resumed = Boolean(session);

    if (!session && isCodeExpired(quiz, code)) {
      return res.status(400).json({ success: false, message: `This access code has expired (older than ${CODE_LIFETIME_DAYS} days).` });
    }
    if (await QuizSubmission.exists({ quiz: quiz._id, accessCode: code })) {
      return res.status(400).json({ success: false, message: 'This code has already been used.' });
    }

    if (!session) {
      try {
        session = await QuizSession.create({ code, quizId: quiz._id, startTime: Date.now(), tabSwitchCount: 0, answers: [] });
      } catch (err) {
        if (err.code === 11000) session = await QuizSession.findOne({ code });
        else throw err;
      }
    } else {
      // Keep the session's TTL alive. Do NOT touch progressSavedAt here: the app compares it with the
      // student's local draft to decide which answers are newer, so bumping it would discard offline answers.
      session.createdAt = new Date();
      await session.save();
    }

    res.json({
      success: true,
      data: {
        startTime: session.startTime,
        tabSwitchCount: session.tabSwitchCount,
        maxTabSwitches: quiz.maxTabSwitches,
        timeLimit: quiz.timeLimit,
        timeUnit: quiz.timeUnit,
        timeType: quiz.timeType,
        title: quiz.title,
        difficulty: quiz.difficulty,
        layoutMode: quiz.layoutMode || 'scroll',
        showAnswersAfterSubmission: quiz.showAnswersAfterSubmission !== false,
        passMark: quiz.passMark ?? 50,
        questions: quiz.questions.map((q) => ({ _id: q._id, question: q.question, options: q.options, imageUrl: q.imageUrl })),
        savedAnswers: session.answers || [],
        progressSavedAt: session.progressSavedAt || null,
        currentQuestionIndex: session.currentQuestionIndex || 0,
        savedStudentInfo: session.studentName ? { name: session.studentName, surname: session.studentSurname, className: session.studentClass } : null,
        resumed,
        isFreeTier,
      },
    });
  } catch (error) { next(error); }
});

router.post('/session/save-progress', async (req, res, next) => {
  try {
    const { code, studentName, studentSurname, studentClass, answers, currentQuestionIndex } = req.body || {};
    if (!Array.isArray(answers)) return res.status(400).json({ success: false, message: 'Answers must be a list.' });

    // Ignore anything that isn't a real question id (a bad id used to crash this route with a cast error)
    const cleanAnswers = answers
      .slice(0, 500)
      .filter((a) => mongoose.isValidObjectId(a?.questionId))
      .map((a) => ({
        questionId: a.questionId,
        selectedAnswer: typeof a?.selectedAnswer === 'string' ? a.selectedAnswer : null,
        confidence: ['low', 'medium', 'high'].includes(a?.confidence) ? a.confidence : null,
      }));

    const session = await QuizSession.findOneAndUpdate(
      { code: normalizeCode(code) },
      {
        $set: {
          studentName: typeof studentName === 'string' ? studentName.slice(0, 100) : undefined,
          studentSurname: typeof studentSurname === 'string' ? studentSurname.slice(0, 100) : undefined,
          studentClass: typeof studentClass === 'string' ? studentClass.slice(0, 100) : undefined,
          answers: cleanAnswers,
          ...(Number.isInteger(currentQuestionIndex) ? { currentQuestionIndex: Math.max(0, Math.min(currentQuestionIndex, 500)) } : {}),
        },
        $currentDate: { createdAt: true, progressSavedAt: true },
      },
      { returnDocument: 'after' }
    );

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    res.json({ success: true });
  } catch (error) { next(error); }
});

router.post('/session/update-tab', async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    const session = await QuizSession.findOneAndUpdate(
      { code },
      { $inc: { tabSwitchCount: 1 }, $currentDate: { createdAt: true } },
      { returnDocument: 'after' },
    );
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    const quiz = await Quiz.findById(session.quizId).select('maxTabSwitches');
    const shouldAutoSubmit = Boolean(quiz?.maxTabSwitches) && session.tabSwitchCount >= quiz.maxTabSwitches;
    res.json({ success: true, tabSwitchCount: session.tabSwitchCount, shouldAutoSubmit });
  } catch (error) { next(error); }
});

router.post('/submit', async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    const { studentName, studentSurname, studentClass, answers } = req.body || {};
    if (!code) return res.status(400).json({ success: false, message: 'Access code is required.' });
    if (typeof studentName !== 'string' || !studentName.trim() || typeof studentSurname !== 'string' || !studentSurname.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your first name and surname.' });
    }
    if (!Array.isArray(answers)) return res.status(400).json({ success: false, message: 'Answers are missing.' });

    const session = await QuizSession.findOne({ code });
    if (!session) {
      if (await QuizSubmission.exists({ accessCode: code })) return res.status(409).json({ success: false, message: 'This code has already been used.' });
      return res.status(404).json({ success: false, message: 'Invalid or expired session.' });
    }

    const quiz = await Quiz.findById(session.quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

    const maxTimeSeconds = (quiz.timeType === 'perQuestion' ? quiz.timeLimit * quiz.questions.length : quiz.timeLimit) * (quiz.timeUnit === 'minutes' ? 60 : 1);
    const rawTaken = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    const timeTakenSeconds = Math.min(maxTimeSeconds, Math.max(0, rawTaken));
    // Late submissions are accepted (students who were offline must not lose their quiz) but flagged for the teacher
    const isLate = rawTaken > maxTimeSeconds + LATE_GRACE_SECONDS;

    const clientTabs = Math.min(Math.max(parseInt(req.body?.tabSwitchCount, 10) || 0, 0), 1000);
    const finalTabs = Math.max(session.tabSwitchCount || 0, clientTabs);

    const provided = new Map();
    for (const ans of answers) {
      const qid = String(ans?.questionId ?? '');
      if (qid && !provided.has(qid)) provided.set(qid, ans);
    }

    let score = 0;
    const submissionAnswers = quiz.questions.map((question) => {
      const ans = provided.get(String(question._id));
      const selectedAnswer = typeof ans?.selectedAnswer === 'string' ? ans.selectedAnswer : '';
      const isCorrect = selectedAnswer !== '' && selectedAnswer === question.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: question._id,
        selectedAnswer,
        isCorrect,
        confidence: ['low', 'medium', 'high'].includes(ans?.confidence) ? ans.confidence : null,
      };
    });

    try {
      await QuizSubmission.create({
        quiz: quiz._id,
        studentName: studentName.trim().slice(0, 100),
        studentSurname: studentSurname.trim().slice(0, 100),
        studentClass: typeof studentClass === 'string' ? studentClass.trim().slice(0, 100) : undefined,
        accessCode: code,
        answers: submissionAnswers,
        score,
        totalQuestions: quiz.questions.length,
        timeTaken: timeTakenSeconds,
        tabSwitchCount: finalTabs,
        isLate, // add `isLate: { type: Boolean, default: false }` to the QuizSubmission schema to store it
      });
    } catch (err) {
      if (err.code === 11000) {
        await QuizSession.deleteOne({ _id: session._id });
        return res.status(409).json({ success: false, message: 'This code has already been used.' });
      }
      throw err;
    }

    await QuizSession.deleteOne({ _id: session._id });
    const review = quiz.questions.map((question, index) => ({
      questionId: question._id,
      question: question.question,
      imageUrl: question.imageUrl || null,
      selectedAnswer: submissionAnswers[index].selectedAnswer || null,
      correctAnswer: question.correctAnswer,
      isCorrect: submissionAnswers[index].isCorrect,
      explanation: question.explanation || '',
    }));

    res.json({
      success: true,
      message: 'Quiz submitted successfully!',
      score,
      totalQuestions: quiz.questions.length,
      timeTaken: timeTakenSeconds,
      tabSwitchCount: finalTabs,
      showAnswersAfterSubmission: quiz.showAnswersAfterSubmission !== false,
      passMark: quiz.passMark ?? 50,
      review: quiz.showAnswersAfterSubmission === false ? [] : review,
    });
  } catch (error) { next(error); }
});

/* ------------------------------------------------------------------ */
/* 4. Teacher / admin endpoints                                        */
/* ------------------------------------------------------------------ */

// A school owner adding a code is limited by the CREATOR's plan, not treated as unlimited
const planOfQuizCreator = async (req, quiz) => {
  const creator = String(quiz.createdBy) === String(req.user._id)
    ? req.user
    : await User.findById(quiz.createdBy).select(PLAN_FIELDS);
  if (!creator) return null;
  return resolvePlan(creator);
};

router.post('/:id/regenerate-code', protect, async (req, res, next) => {
  try {
    const quiz = await loadQuiz(req, res, { allowSchoolOwner: true });
    if (!quiz) return;

    const plan = await planOfQuizCreator(req, quiz);
    if (!plan) return res.status(404).json({ success: false, message: 'Quiz creator not found.' });
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });

    if (quiz.accessCodes.length >= plan.codes) {
      return res.status(403).json({ success: false, message: `Your plan allows up to ${plan.codes} access codes per quiz. Upgrade to add more!` });
    }

    const newCode = uniqueCode(quiz.gameMode || 'test', new Set(codesOf(quiz)));
    await Quiz.updateOne({ _id: quiz._id }, { $push: { accessCodes: { code: newCode, createdAt: new Date() } }, $inc: { numberOfStudents: 1 } });
    res.json({ success: true, newCode });
  } catch (error) { next(error); }
});

router.get('/:id/results', protect, async (req, res, next) => {
  try {
    const quiz = await loadQuiz(req, res, { allowSchoolOwner: true });
    if (!quiz) return;
    const submissions = await QuizSubmission.find({ quiz: quiz._id }).sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: {
        quiz: {
          ...quiz.toObject(),
          accessCodes: codesOf(quiz),
          accessCodeHistory: getAccessCodeHistory(quiz),
        },
        submissions
      }
    });
  } catch (error) { next(error); }
});

router.post('/upload/quiz-image', protect, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
  res.json({ success: true, imageUrl: req.file.path });
});

router.get('/admin/quizzes', protect, async (req, res, next) => {
  try {
    const user = req.user;
    const select = 'title difficulty numberOfStudents createdAt gameMode accessCodes createdBy';
    const shape = (q, extra = {}) => ({ ...q, accessCodes: codesOf(q), ...extra });
    const byNewest = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);

    // The user's own quizzes plus the quizzes of the given teachers
    const withTeachers = async (teachers) => {
      const names = new Map(teachers.map((t) => [String(t._id), t.fullName]));
      const [own, theirs] = await Promise.all([
        Quiz.find({ createdBy: user._id }).select(select).lean(),
        teachers.length ? Quiz.find({ createdBy: { $in: teachers.map((t) => t._id) } }).select(select).lean() : [],
      ]);
      const data = [
        ...own.map((q) => shape(q, { isOwnerQuiz: true })),
        ...theirs.map((q) => shape(q, { isOwnerQuiz: false, teacherName: names.get(String(q.createdBy)) || 'Teacher' })),
      ].sort(byNewest);
      return res.json({ success: true, data, hasTeacherSection: true });
    };

    if (user.role === 'school_admin' || user.role === 'super_admin') {
      const org = await Organization.findOne({ adminId: user._id }).select('_id');
      const filters = [{ schoolOwnerId: user._id }];
      if (org) filters.push({ schoolId: org._id });
      const teachers = await User.find({ role: { $in: ['teacher', 'hod'] }, $or: filters }).select('_id fullName').lean();
      return withTeachers(teachers);
    }

    if (user.role === 'hod') {
      const teachers = await User.find({ role: 'teacher', hodId: user._id }).select('_id fullName').lean();
      return withTeachers(teachers);
    }

    const mine = await Quiz.find({ createdBy: user._id }).select(select).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: mine.map((q) => shape(q, { isOwnerQuiz: true })), hasTeacherSection: false });
  } catch (error) { next(error); }
});

router.post('/validate-code', async (req, res, next) => {
  try {
    const code = normalizeCode(req.body?.code);
    if (!code) return res.status(400).json({ success: false, message: 'Access code is required' });

    const quiz = await findQuizByCode(code);
    if (!quiz) return res.status(404).json({ success: false, message: 'Invalid access code' });

    const isFreeTier = await hasBranding(quiz.createdBy);

    if (isCodeExpired(quiz, code)) {
      return res.status(400).json({ success: false, message: `This access code has expired (older than ${CODE_LIFETIME_DAYS} days).` });
    }
    if (quiz.gameMode === 'kahoot') {
      const playerKey = String(req.body?.playerId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
      if (!playerKey) {
        return res.status(400).json({ success: false, message: 'Refresh the page and enter your student code again.' });
      }
      const existingAttempt = await KahootAttempt.findOne({ quiz: quiz._id, code });
      if (existingAttempt && existingAttempt.playerKey !== playerKey) {
        return res.status(409).json({ success: false, message: 'This student code has already been assigned to another attempt. Ask your teacher for your own code.' });
      }
      if (quiz.kahootClosedAt && !existingAttempt) {
        return res.status(400).json({ success: false, message: 'This Kahoot has been closed by the teacher.' });
      }
    } else if (await QuizSubmission.exists({ quiz: quiz._id, accessCode: code })) {
      return res.status(400).json({ success: false, message: 'This access code has already been used' });
    }

    const hasActiveSession = Boolean(await QuizSession.exists({ code }));

    const responseData = {
      quizId: quiz._id.toString(),
      title: quiz.title,
      gameMode: quiz.gameMode,
      difficulty: quiz.difficulty,
      timeLimit: quiz.timeLimit,
      timeUnit: quiz.timeUnit,
      timeType: quiz.timeType,
      maxTabSwitches: quiz.maxTabSwitches,
      bonusMarks: quiz.bonusMarks,
      layoutMode: quiz.layoutMode || 'scroll',
      showAnswersAfterSubmission: quiz.showAnswersAfterSubmission !== false,
      passMark: quiz.passMark ?? 50,
      hasActiveSession,
      isOpen: quiz.gameMode === 'kahoot'
        ? (!quiz.kahootClosedAt && Boolean(quiz.autoStart || quiz.kahootIsOpen))
        : undefined,
      isFreeTier,
    };

    if (quiz.gameMode !== 'kahoot') {
      responseData.questions = quiz.questions.map((q) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        imageUrl: q.imageUrl,
      }));
    }

    res.json({ success: true, data: responseData });
  } catch (error) { next(error); }
});

router.get('/game-show/:code', protect, async (req, res, next) => {
  try {
    const code = normalizeCode(req.params.code);
    const quiz = await Quiz.findOne({ 'accessCodes.code': code, createdBy: req.user._id });
    if (!quiz) return res.status(404).json({ success: false, message: 'Game show not found or you do not have access' });
    res.json({
      success: true,
      data: {
        quizId: quiz._id.toString(),
        title: quiz.title,
        gameMode: quiz.gameMode,
        difficulty: quiz.difficulty,
        timeLimit: quiz.timeLimit,
        timeUnit: quiz.timeUnit,
        timeType: quiz.timeType,
        maxTabSwitches: quiz.maxTabSwitches,
        bonusMarks: quiz.bonusMarks,
        baseMarks: quiz.baseMarks,
        accessCodes: codesOf(quiz),
        questions: quiz.questions.map((q) => ({ _id: q._id, question: q.question, options: q.options, imageUrl: q.imageUrl, correctAnswer: q.correctAnswer, explanation: q.explanation })),
      },
    });
  } catch (error) { next(error); }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const quiz = await loadQuiz(req, res); // only the creator can delete
    if (!quiz) return;
    await Promise.all([
      Quiz.deleteOne({ _id: quiz._id }),
      QuizSubmission.deleteMany({ quiz: quiz._id }),
      QuizSession.deleteMany({ quizId: quiz._id }),
    ]);
    res.json({ success: true, message: 'Quiz deleted successfully' });
  } catch (error) { next(error); }
});

/* ------------------------------------------------------------------ */
/* 5. Quiz Sharing Management                                         */
/* ------------------------------------------------------------------ */

router.post('/share', protect, async (req, res, next) => {
  try {
    const plan = await resolvePlan(req.user);
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });
    if (!plan.share) {
      return res.status(403).json({ success: false, message: 'Secure result sharing is available on Teacher Pro and School plans. Upgrade to unlock it!' });
    }

    const { quizIds, daysValid = 7 } = req.body || {};
    const ids = Array.isArray(quizIds) ? [...new Set(quizIds.map(String))] : [];
    if (ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one quiz to share.' });
    }
    if (ids.length > 50 || ids.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ success: false, message: 'One or more selected quizzes are invalid.' });
    }
    const days = Math.min(Math.max(parseInt(daysValid, 10) || 7, 1), 30);

    const ownedCount = await Quiz.countDocuments({ _id: { $in: ids }, createdBy: req.user._id });
    if (ownedCount !== ids.length) {
      return res.status(403).json({ success: false, message: 'You can only share quizzes you created.' });
    }

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const makeShareCode = () => {
      let code = 'SHARE-';
      for (let i = 0; i < 8; i++) code += chars.charAt(crypto.randomInt(chars.length));
      return code;
    };

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    // Retry on the (very unlikely) duplicate-code error instead of failing the request
    let share;
    for (let attempt = 0; attempt < 3 && !share; attempt++) {
      try {
        share = await QuizShare.create({ shareCode: makeShareCode(), ownerId: req.user._id, quizIds: ids, expiresAt, isActive: true });
      } catch (err) {
        if (err.code !== 11000 || attempt === 2) throw err;
      }
    }

    res.json({ success: true, data: { shareCode: share.shareCode, expiresAt: share.expiresAt } });
  } catch (error) { next(error); }
});

router.get('/:id/shares', protect, async (req, res, next) => {
  try {
    const quiz = await loadQuiz(req, res);
    if (!quiz) return;

    const shares = await QuizShare.find({ quizIds: { $in: [quiz._id] }, isActive: true, ownerId: req.user._id })
      .select('shareCode expiresAt createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: shares });
  } catch (error) { next(error); }
});

router.delete('/share/:code', protect, async (req, res, next) => {
  try {
    const share = await QuizShare.findOne({ shareCode: req.params.code.toUpperCase(), ownerId: req.user._id });
    if (!share) return res.status(404).json({ success: false, message: 'Share code not found or you do not own it.' });

    share.isActive = false;
    await share.save();

    res.json({ success: true, message: 'Share code revoked successfully.' });
  } catch (error) { next(error); }
});

// Now requires login: the response contains student names, scores and the correct answers.
router.get('/shared-results', protect, async (req, res, next) => {
  try {
    if (!SHARE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only teachers and school staff can open shared results.' });
    }

    const { shareCode } = req.query;
    if (!shareCode || typeof shareCode !== 'string') return res.status(400).json({ success: false, message: 'Share code is required.' });

    const share = await QuizShare.findOne({ shareCode: shareCode.trim().toUpperCase(), isActive: true });
    if (!share) return res.status(404).json({ success: false, message: 'Invalid, expired, or revoked share code.' });

    if (new Date() > share.expiresAt) {
      share.isActive = false;
      await share.save();
      return res.status(400).json({ success: false, message: 'This share code has expired.' });
    }

    const [quizzes, submissions, owner] = await Promise.all([
      Quiz.find({ _id: { $in: share.quizIds } }).populate('createdBy', 'fullName'),
      QuizSubmission.find({ quiz: { $in: share.quizIds } }).sort({ submittedAt: -1 }),
      User.findById(share.ownerId).select('fullName'),
    ]);

    res.json({
      success: true,
      data: {
        quizzes: quizzes.map((q) => ({
          ...q.toObject(),
          accessCodes: codesOf(q),
        })),
        submissions,
        sharedBy: owner?.fullName || '',
        expiresAt: share.expiresAt,
      }
    });
  } catch (error) { next(error); }
});

router.post('/shared-regenerate', protect, async (req, res, next) => {
  try {
    if (!SHARE_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only teachers and school staff can add codes to a shared quiz.' });
    }

    const { shareCode, quizId } = req.body || {};
    if (typeof shareCode !== 'string' || !shareCode || !mongoose.isValidObjectId(quizId)) {
      return res.status(400).json({ success: false, message: 'Share code and quiz ID are required.' });
    }

    const share = await QuizShare.findOne({ shareCode: shareCode.trim().toUpperCase(), isActive: true });
    if (!share || new Date() > share.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invalid or expired share code.' });
    }

    if (!share.quizIds.some((id) => String(id) === String(quizId))) {
      return res.status(403).json({ success: false, message: 'You do not have access to generate codes for this quiz.' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

    const plan = await planOfQuizCreator(req, quiz);
    if (!plan) return res.status(404).json({ success: false, message: 'Quiz creator not found.' });
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });
    if (quiz.accessCodes.length >= plan.codes) {
      return res.status(403).json({ success: false, message: `This quiz already has the maximum of ${plan.codes} access codes for its plan.` });
    }

    const newCode = uniqueCode(quiz.gameMode || 'test', new Set(codesOf(quiz)));
    await Quiz.updateOne(
      { _id: quizId },
      { $push: { accessCodes: { code: newCode, createdAt: new Date() } }, $inc: { numberOfStudents: 1 } }
    );

    res.json({ success: true, newCode, quizId });
  } catch (error) { next(error); }
});

/* ------------------------------------------------------------------ */
/* 6. Duplicate / Edit & Duplicate Quiz                               */
/* ------------------------------------------------------------------ */
router.post('/:id/duplicate', protect, async (req, res, next) => {
  try {
    const originalQuiz = await loadQuiz(req, res);
    if (!originalQuiz) return;

    const plan = await resolvePlan(req.user);
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });
    if (!plan.duplicate) {
      return res.status(403).json({ success: false, message: 'Duplicate quiz is available on Teacher Premium and School Premium. Upgrade to unlock it!' });
    }

    const isGameShow = originalQuiz.gameMode === 'gameShow';
    const isKahoot = originalQuiz.gameMode === 'kahoot';
    if (isGameShow || isKahoot) {
      const quotaError = await gameShowQuotaError(req.user, plan);
      if (quotaError) return res.status(403).json({ success: false, message: quotaError });
    }

    const { title, questions } = req.body || {};

    let newQuestions;
    if (Array.isArray(questions) && questions.length > 0) {
      if (questions.length > MAX_QUESTIONS_PER_QUIZ) {
        return res.status(400).json({ success: false, message: `A quiz can have at most ${MAX_QUESTIONS_PER_QUIZ} questions.` });
      }
      newQuestions = questions.map((q) => {
        const correctIdx = parseInt(q?.correctOptionIndex, 10);
        const fromIndex = Array.isArray(q?.options) && Number.isInteger(correctIdx) ? q.options[correctIdx] : undefined;
        return normalizeQuestion({ ...q, correctAnswer: fromIndex ?? q?.correctAnswer });
      });
      const badIndex = newQuestions.findIndex((q) => !q);
      if (badIndex !== -1) {
        return res.status(400).json({ success: false, message: `Question ${badIndex + 1} needs text, at least 2 options, and a correct answer that matches one option.` });
      }
    } else {
      newQuestions = originalQuiz.questions.map((q) => normalizeQuestion(q.toObject())).filter(Boolean);
    }

    const codeCount = isGameShow ? 2 : Math.min(originalQuiz.numberOfStudents || 1, plan.codes);
    const used = new Set();
    const newCodes = Array.from({ length: codeCount }, () => ({
      code: uniqueCode(originalQuiz.gameMode || 'test', used),
      createdAt: new Date(),
    }));

    const base = originalQuiz.toObject();
    delete base._id;
    delete base.__v;
    delete base.createdAt; // so the copy counts toward monthly Game Show limits
    delete base.updatedAt;

    const newQuiz = await Quiz.create({
      ...base,
      title: (typeof title === 'string' && title.trim() ? title.trim() : `${originalQuiz.title} (Copy)`).slice(0, 160),
      questions: newQuestions,
      accessCodes: newCodes,
      numberOfStudents: codeCount,
      kahootIsOpen: isKahoot && Boolean(originalQuiz.autoStart),
      kahootOpenedAt: isKahoot && Boolean(originalQuiz.autoStart) ? new Date() : null,
      kahootClosedAt: null,
      createdBy: req.user._id,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: title ? 'New quiz created successfully!' : 'Quiz duplicated successfully!',
      data: {
        newQuizId: newQuiz._id,
        accessCodes: codesOf(newQuiz)
      }
    });
  } catch (error) { next(error); }
});

export default router;