import express from 'express';
import mongoose from 'mongoose';
import { Quiz } from '../models/Quiz.js';
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
const NOTES_MAX = 20000; // keep in sync with the frontend

const generateAccessCode = (mode = 'test') => {
  const prefix = mode === 'gameShow' ? 'G-' : 'T-';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 8; i++) code += chars.charAt(crypto.randomInt(chars.length));
  return code;
};

const normalizeCode = (code) => (typeof code === 'string' ? code.trim().toUpperCase() : '');

// Access codes are stored as { code, createdAt }. The frontend wants plain strings.
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

// True if the quiz creator's plan removes the "Noted AI" branding. Missing creator = keep branding.
const hasBranding = async (creatorId) => {
  const creator = await User.findById(creatorId).select(PLAN_FIELDS);
  if (!creator) return true;
  return (await resolvePlan(creator)).branding;
};

// Is `user` the school owner of the teacher who created a quiz?
const isSchoolOwnerOf = async (user, creatorId) => {
  if (user.role === 'super_admin') return true;
  if (user.role !== 'school_admin') return false;
  const creator = await User.findById(creatorId).select('role schoolId schoolOwnerId');
  if (!creator || creator.role !== 'teacher') return false;
  if (creator.schoolOwnerId && String(creator.schoolOwnerId) === String(user._id)) return true;
  const org = await Organization.findOne({ adminId: user._id }).select('_id');
  return Boolean(org && creator.schoolId && String(creator.schoolId) === String(org._id));
};

// Loads a quiz the user may access. Sends the error response itself and returns null on failure.
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

// Makes AI output safe for scoring: correctAnswer must exactly match one option (models sometimes return "B" or odd casing)
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
/* 0. My limits (the frontend uses this to show/prefill real limits)   */
/* ------------------------------------------------------------------ */
router.get('/my-limits', protect, async (req, res, next) => {
  try {
    const plan = await resolvePlan(req.user);
    const finite = (v) => (Number.isFinite(v) ? v : null); // null = unlimited
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
/* 1. AI preview                                                       */
/* ------------------------------------------------------------------ */

router.post('/generate-ai-preview', protect, async (req, res, next) => {
  try {
    const { notes, focusTopics, difficulty, numQuestions, gameMode } = req.body || {};
    if (typeof notes !== 'string' || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide some notes.' });
    }
    if (notes.length > NOTES_MAX) {
      return res.status(400).json({ success: false, message: `Your notes are too long. Keep them under ${NOTES_MAX.toLocaleString()} characters.` });
    }
    const count = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 1), 50);

    const plan = await resolvePlan(req.user);
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });

    if (count > plan.maxQ) {
      return res.status(403).json({ success: false, message: `Your plan allows up to ${plan.maxQ} AI questions per quiz. Upgrade to generate more!` });
    }

    // Game Show previews are blocked up front, so free users don't burn credits on something they can't create.
    if (gameMode === 'gameShow') {
      const quotaError = await gameShowQuotaError(req.user, plan);
      if (quotaError) return res.status(403).json({ success: false, message: quotaError });
    }

    // Charge credits BEFORE calling the AI (atomic). Refunded below if the AI fails.
    const charged = await spendCredits(req.user, plan, count);
    if (!charged) {
      const fresh = await User.findById(req.user._id).select('aiCreditsUsed creditsPeriodStart');
      const info = getCreditsInfo(fresh || req.user, plan);
      return res.status(403).json({
        success: false,
        message: `Not enough AI credits this month (${info.remaining} left, this quiz needs ${count}). Upgrade your plan or wait for your credits to refresh.`,
      });
    }

    const topics = typeof focusTopics === 'string' ? focusTopics.trim().slice(0, 200) : '';
    const topicInstruction = topics ? `\n\nCRITICAL INSTRUCTION: ONLY generate questions about these specific topics: "${topics}". Ignore all other parts of the notes.` : '';
    const level = typeof difficulty === 'string' ? difficulty.slice(0, 30) : 'Intermediate';

    const systemPrompt = `You are an expert examiner. Generate EXACTLY ${count} multiple-choice questions based on the provided notes. Difficulty: ${level}.${topicInstruction}

IMPORTANT FORMATTING RULES:
1. Output VALID JSON ONLY. Do not include markdown like \`\`\`json.
2. For mathematical expressions, use LaTeX wrapped in single dollar signs, e.g., $\\frac{numerator}{denominator}$, $\\sqrt{x}$, $x^{2}$.
3. Ordinary words and sentences must stay OUTSIDE the dollar signs.
4. Keep explanations to ONE short sentence maximum.
5. Each question has exactly 4 options and "correctAnswer" must be the EXACT text of one option (never just a letter).

Required JSON format:
{ "questions": [ { "question": "...", "options": ["...", "...", "...", "..."], "correctAnswer": "exact option text", "explanation": "..." } ] }`;

    let questions;
    try {
      const response = await generateWithGroq(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Notes:\n${notes}` }],
        { max_tokens: Math.min(250 * count + 500, 8000), json: true }
      );
      const parsed = JSON.parse(response.slice(response.indexOf('{'), response.lastIndexOf('}') + 1));
      questions = (parsed.questions || []).map(normalizeQuestion).filter(Boolean);
      if (questions.length === 0) throw new Error('No usable questions');
    } catch (aiError) {
      await refundCredits(req.user._id, count);
      console.error('❌ AI generation failed:', aiError.message);
      return res.status(502).json({ success: false, message: 'The AI could not generate usable questions. No credits were used. Try again with fewer notes or fewer questions.' });
    }

    // Only charge for questions actually returned.
    if (questions.length < count) await refundCredits(req.user._id, count - questions.length);

    res.json({ success: true, data: { questions } });
  } catch (error) { next(error); }
});


/* ------------------------------------------------------------------ */
/* 2. Finalize quiz                                                    */
/* ------------------------------------------------------------------ */
router.post('/create-manual', protect, async (req, res, next) => {
  try {
    const { title, difficulty, numStudents, timeLimit, timeUnit, timeType, maxTabSwitches, layoutMode = 'scroll', showAnswersAfterSubmission = true, passMark = 50, questions, gameMode = 'test', baseMarks = 10, bonusMarks = 5 } = req.body || {};

    if (typeof title !== 'string' || !title.trim()) return res.status(400).json({ success: false, message: 'A title is required.' });
    if (!(Number(timeLimit) > 0)) return res.status(400).json({ success: false, message: 'Please set a valid time limit.' });
    if (!Number.isInteger(Number(passMark)) || Number(passMark) < 0 || Number(passMark) > 100) {
      return res.status(400).json({ success: false, message: 'Pass mark must be a whole number from 0 to 100.' });
    }
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ success: false, message: 'A quiz needs at least one question.' });

    const cleanQuestions = questions.slice(0, 200).map(normalizeQuestion);
    if (cleanQuestions.some((q) => !q)) {
      return res.status(400).json({ success: false, message: 'Every question needs text, at least 2 options, and a correct answer that matches one option.' });
    }

    const mode = gameMode === 'gameShow' ? 'gameShow' : 'test';
    // Game Show is always a 1v1 (2 team codes); a client can't ask for more.
    const studentCount = mode === 'gameShow' ? 2 : Math.min(Math.max(parseInt(numStudents, 10) || 1, 1), 500);

    const plan = await resolvePlan(req.user);
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });

    if (studentCount > plan.codes) {
      return res.status(403).json({ success: false, message: `Your plan allows up to ${plan.codes} student codes per test. Upgrade to add more!` });
    }

    if (mode === 'gameShow') {
      const quotaError = await gameShowQuotaError(req.user, plan);
      if (quotaError) return res.status(403).json({ success: false, message: quotaError });
    }

    const used = new Set();
    const accessCodes = Array.from({ length: studentCount }, () => ({ code: uniqueCode(mode, used), createdAt: new Date() }));

    const quiz = await Quiz.create({
      title: title.trim().slice(0, 160),
      difficulty, timeLimit: Number(timeLimit), timeUnit, timeType,
      maxTabSwitches: maxTabSwitches || null,
      layoutMode: layoutMode === 'paginated' ? 'paginated' : 'scroll',
      showAnswersAfterSubmission: showAnswersAfterSubmission !== false,
      passMark: Number(passMark),
      numberOfStudents: studentCount,
      gameMode: mode,
      baseMarks: Number(baseMarks) || 10,
      bonusMarks: Number(bonusMarks) || 5,
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

    // Branding follows the creator's REAL plan (school teachers inherit their school's plan)
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
        isFreeTier, // true = show the Noted AI watermark
      },
    });
  } catch (error) { next(error); }
});

router.post('/session/save-progress', async (req, res, next) => {
  try {
    const { code, studentName, studentSurname, studentClass, answers, currentQuestionIndex } = req.body || {};
    if (!Array.isArray(answers)) return res.status(400).json({ success: false, message: 'Answers must be a list.' });
    await QuizSession.findOneAndUpdate(
      { code: normalizeCode(code) },
      {
        studentName: typeof studentName === 'string' ? studentName.slice(0, 100) : undefined,
        studentSurname: typeof studentSurname === 'string' ? studentSurname.slice(0, 100) : undefined,
        studentClass: typeof studentClass === 'string' ? studentClass.slice(0, 100) : undefined,
        $set: {
          answers: answers.slice(0, 500).map((a) => ({
            questionId: a?.questionId,
            selectedAnswer: typeof a?.selectedAnswer === 'string' ? a.selectedAnswer : null,
            confidence: ['low', 'medium', 'high'].includes(a?.confidence) ? a.confidence : null,
          })),
          ...(Number.isInteger(currentQuestionIndex) ? { currentQuestionIndex: Math.max(0, Math.min(currentQuestionIndex, 500)) } : {}),
        },
        $currentDate: { createdAt: true, progressSavedAt: true },
      }
    );
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
      // No session usually means "already submitted" (e.g. the background send landed first)
      if (await QuizSubmission.exists({ accessCode: code })) return res.status(409).json({ success: false, message: 'This code has already been used.' });
      return res.status(404).json({ success: false, message: 'Invalid or expired session.' });
    }

    const quiz = await Quiz.findById(session.quizId);
    if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });

    // Server-side time cap (a client can't fake a faster time)
    const maxTimeSeconds = (quiz.timeType === 'perQuestion' ? quiz.timeLimit * quiz.questions.length : quiz.timeLimit) * (quiz.timeUnit === 'minutes' ? 60 : 1);
    const rawTaken = Math.floor((Date.now() - new Date(session.startTime).getTime()) / 1000);
    const timeTakenSeconds = Math.min(maxTimeSeconds, Math.max(0, rawTaken));

    // The client's own tab count counts too (it keeps counting offline); never lower than the server's
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

// Loads the plan of whoever CREATED the quiz (a school owner adding a code uses the teacher's limits, not unlimited).
const planOfQuizCreator = async (req, quiz) => {
  const creator = String(quiz.createdBy) === String(req.user._id)
    ? req.user
    : await User.findById(quiz.createdBy).select(PLAN_FIELDS);
  if (!creator) return null;
  return resolvePlan(creator);
};

router.post('/:id/regenerate-code', protect, async (req, res, next) => {
  try {
    const quiz = await loadQuiz(req, res, { allowSchoolOwner: true }); // creator OR school owner
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
    const quiz = await loadQuiz(req, res, { allowSchoolOwner: true }); // creator OR the teacher's school owner
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

    if (user.role === 'school_admin' || user.role === 'super_admin') {
      const org = await Organization.findOne({ adminId: user._id }).select('_id');
      const filters = [{ schoolOwnerId: user._id }];
      if (org) filters.push({ schoolId: org._id });
      const teachers = await User.find({ role: 'teacher', $or: filters }).select('_id fullName').lean();
      const names = new Map(teachers.map((t) => [String(t._id), t.fullName]));

      const [own, theirs] = await Promise.all([
        Quiz.find({ createdBy: user._id }).select(select).lean(),
        teachers.length ? Quiz.find({ createdBy: { $in: teachers.map((t) => t._id) } }).select(select).lean() : [],
      ]);

      // .lean() objects keep these flags (flags set on Mongoose documents are dropped when serialized)
      const data = [
        ...own.map((q) => shape(q, { isOwnerQuiz: true })),
        ...theirs.map((q) => shape(q, { isOwnerQuiz: false, teacherName: names.get(String(q.createdBy)) || 'Teacher' })),
      ].sort(byNewest);
      return res.json({ success: true, data, hasTeacherSection: true });
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
    if (await QuizSubmission.exists({ quiz: quiz._id, accessCode: code })) {
      return res.status(400).json({ success: false, message: 'This access code has already been used' });
    }

    const hasActiveSession = Boolean(await QuizSession.exists({ code }));

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
        layoutMode: quiz.layoutMode || 'scroll',
        showAnswersAfterSubmission: quiz.showAnswersAfterSubmission !== false,
        passMark: quiz.passMark ?? 50,
        hasActiveSession,
        isFreeTier, // true = show the Noted AI watermark
        questions: quiz.questions.map((q) => ({ _id: q._id, question: q.question, options: q.options, imageUrl: q.imageUrl })),
      },
    });
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
        accessCodes: codesOf(quiz), // the board shows these as Team 1 / Team 2 codes
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

// Teacher A: Generate a share code for selected quizzes (paid plans only)
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

    // Verify the user owns these quizzes
    const ownedCount = await Quiz.countDocuments({ _id: { $in: ids }, createdBy: req.user._id });
    if (ownedCount !== ids.length) {
      return res.status(403).json({ success: false, message: 'You can only share quizzes you created.' });
    }

    // Generate a unique share code (cryptographically random)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let shareCode = 'SHARE-';
    for (let i = 0; i < 8; i++) shareCode += chars.charAt(crypto.randomInt(chars.length));

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const share = await QuizShare.create({
      shareCode,
      ownerId: req.user._id,
      quizIds: ids,
      expiresAt,
      isActive: true
    });

    res.json({ success: true, data: { shareCode: share.shareCode, expiresAt: share.expiresAt } });
  } catch (error) { next(error); }
});

router.get('/:id/shares', protect, async (req, res, next) => {
  try {
    const quiz = await loadQuiz(req, res); // Must be owner
    if (!quiz) return;

    const shares = await QuizShare.find({ quizIds: { $in: [quiz._id] }, isActive: true })
      .select('shareCode expiresAt createdAt')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: shares });
  } catch (error) { next(error); }
});

// Teacher A: Revoke a share code
router.delete('/share/:code', protect, async (req, res, next) => {
  try {
    const share = await QuizShare.findOne({ shareCode: req.params.code.toUpperCase(), ownerId: req.user._id });
    if (!share) return res.status(404).json({ success: false, message: 'Share code not found or you do not own it.' });

    share.isActive = false;
    await share.save();

    res.json({ success: true, message: 'Share code revoked successfully.' });
  } catch (error) { next(error); }
});

// Teacher B: Get shared quiz results using the share code
// NOTE: still public (anyone with the code can read student results). Add `protect` here if your
// shared-results page is only used by logged-in teachers.
router.get('/shared-results', async (req, res, next) => {
  try {
    const { shareCode } = req.query;
    if (!shareCode || typeof shareCode !== 'string') return res.status(400).json({ success: false, message: 'Share code is required.' });

    const share = await QuizShare.findOne({ shareCode: shareCode.trim().toUpperCase(), isActive: true });
    if (!share) return res.status(404).json({ success: false, message: 'Invalid, expired, or revoked share code.' });

    if (new Date() > share.expiresAt) {
      share.isActive = false;
      await share.save();
      return res.status(400).json({ success: false, message: 'This share code has expired.' });
    }

    const quizzes = await Quiz.find({ _id: { $in: share.quizIds } }).populate('createdBy', 'fullName');
    const submissions = await QuizSubmission.find({ quiz: { $in: share.quizIds } }).sort({ submittedAt: -1 });

    res.json({
      success: true,
      data: {
        quizzes: quizzes.map(q => ({
          ...q.toObject(),
          accessCodes: (q.accessCodes || []).map(ac => typeof ac === 'string' ? ac : ac.code)
        })),
        submissions
      }
    });
  } catch (error) { next(error); }
});

// Teacher B: Generate a new student access code for a specific shared quiz.
// Now requires login, and is capped by the quiz CREATOR's plan (it was unlimited before).
router.post('/shared-regenerate', protect, async (req, res, next) => {
  try {
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
/* 6. Duplicate / Edit & Duplicate Quiz (Premium plans only)          */
/* ------------------------------------------------------------------ */
router.post('/:id/duplicate', protect, async (req, res, next) => {
  try {
    const originalQuiz = await loadQuiz(req, res); // Must be owner
    if (!originalQuiz) return;

    const plan = await resolvePlan(req.user);
    if (plan.locked) return res.status(403).json({ success: false, message: plan.locked });
    if (!plan.duplicate) {
      return res.status(403).json({ success: false, message: 'Duplicate quiz is available on Teacher Premium and School Premium. Upgrade to unlock it!' });
    }

    const isGameShow = originalQuiz.gameMode === 'gameShow';
    if (isGameShow) {
      const quotaError = await gameShowQuotaError(req.user, plan);
      if (quotaError) return res.status(403).json({ success: false, message: quotaError });
    }

    const { title, questions } = req.body || {};

    // Edited questions go through the same validation as a new quiz; otherwise copy the originals.
    let newQuestions;
    if (Array.isArray(questions) && questions.length > 0) {
      newQuestions = questions.slice(0, 200).map((q) => {
        const correctIdx = parseInt(q?.correctOptionIndex, 10);
        const fromIndex = Array.isArray(q?.options) && Number.isInteger(correctIdx) ? q.options[correctIdx] : undefined;
        return normalizeQuestion({ ...q, correctAnswer: fromIndex ?? q?.correctAnswer });
      });
      if (newQuestions.some((q) => !q)) {
        return res.status(400).json({ success: false, message: 'Every question needs text, at least 2 options, and a correct answer that matches one option.' });
      }
    } else {
      newQuestions = originalQuiz.questions.map((q) => normalizeQuestion(q.toObject())).filter(Boolean);
    }

    // Fresh access codes, never more than the plan allows
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
