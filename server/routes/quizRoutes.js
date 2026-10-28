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

const router = express.Router();

// Update a queued teacher quiz question or generated library quiz question.
router.post('/:id/review', protect, async (req, res, next) => {
  try {
    const { questionIndex, correct } = req.body || {};
    if (!Number.isInteger(questionIndex) || typeof correct !== 'boolean') {
      return res.status(400).json({ success: false, message: 'questionIndex and boolean correct are required.' });
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

// Plan limits (this was missing from the last version, so nothing was being enforced)
const getLimits = (user) => {
  const active = !user.subscriptionStatus || user.subscriptionStatus === 'active';
  if (user.role === 'super_admin' || (active && user.subscriptionTier === 'school_owner')) {
    return { maxQuestions: 9999, maxStudents: 9999, maxGameShows: 9999, isUnlimited: true };
  }
  if (active && user.subscriptionTier === 'pro') return { maxQuestions: 60, maxStudents: 40, maxGameShows: 12, isUnlimited: false };
  if (user.role === 'teacher' && user.schoolOwnerId) return { maxQuestions: 50, maxStudents: 30, maxGameShows: 8, isUnlimited: false };
  return { maxQuestions: 40, maxStudents: 25, maxGameShows: 0, isUnlimited: false };
};

const generateAccessCode = (mode = 'test') => {
  const prefix = mode === 'gameShow' ? 'G-' : 'T-';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = prefix;
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
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
      const expiresAt = new Date(new Date(createdAt).getTime() + 30 * 86400000); // 30 days
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
/* 1. AI preview                                                       */
/* ------------------------------------------------------------------ */
router.post('/generate-ai-preview', protect, async (req, res, next) => {
  try {
    const { notes, focusTopics, difficulty, numQuestions } = req.body || {};
    if (typeof notes !== 'string' || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Please provide some notes.' });
    }
    const count = Math.min(Math.max(parseInt(numQuestions, 10) || 5, 1), 50);

    const limits = getLimits(req.user);
    if (count > limits.maxQuestions) {
      return res.status(403).json({ success: false, message: `Your plan allows up to ${limits.maxQuestions} AI questions per quiz. Upgrade to generate more!` });
    }

    // Free users: 5 AI tests per week (teachers added under a school owner are exempt)
    if (!limits.isUnlimited && req.user.subscriptionTier === 'free' && !req.user.schoolOwnerId) {
      const weekAgo = new Date(Date.now() - 7 * 86400000);
      const weekly = await Quiz.countDocuments({ createdBy: req.user._id, createdAt: { $gte: weekAgo }, gameMode: 'test' });
      if (weekly >= 5) {
        return res.status(403).json({ success: false, message: 'Free plan limit reached: max 5 AI tests per week. Upgrade to Pro for unlimited tests!' });
      }
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

    const response = await generateWithGroq(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: `Notes:\n${notes.slice(0, 8000)}` }],
      { max_tokens: Math.min(250 * count + 500, 8000), json: true }
    );

    let questions;
    try {
      const parsed = JSON.parse(response.slice(response.indexOf('{'), response.lastIndexOf('}') + 1));
      questions = (parsed.questions || []).map(normalizeQuestion).filter(Boolean);
      if (questions.length === 0) throw new Error('No usable questions');
    } catch (parseError) {
      console.error('❌ AI JSON Parse Error:', parseError.message);
      return res.status(502).json({ success: false, message: 'The AI returned an unusable response. Please try again with fewer notes or fewer questions.' });
    }

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
    const studentCount = Math.min(Math.max(parseInt(numStudents, 10) || 1, 1), 500);
    const limits = getLimits(req.user);

    if (studentCount > limits.maxStudents) {
      return res.status(403).json({ success: false, message: `Your plan allows up to ${limits.maxStudents} student codes per test. Upgrade to add more!` });
    }

    if (mode === 'gameShow' && !limits.isUnlimited) {
      if (limits.maxGameShows === 0) {
        return res.status(403).json({ success: false, message: 'Game Show mode is available on Teacher Pro and School plans. Upgrade to unlock it!' });
      }
      const monthAgo = new Date(Date.now() - 30 * 86400000);
      const monthly = await Quiz.countDocuments({ createdBy: req.user._id, createdAt: { $gte: monthAgo }, gameMode: 'gameShow' });
      if (monthly >= limits.maxGameShows) {
        return res.status(403).json({ success: false, message: `Your plan allows ${limits.maxGameShows} Game Shows per month. Upgrade for more!` });
      }
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

    // `accessCodes` in the response is a list of plain strings (what the frontend pages expect)
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

    let session = await QuizSession.findOne({ code });
    const resumed = Boolean(session);
    // A brand-new start on an expired code is refused; a student already mid-quiz may continue
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
      // Refresh the retention window when a student reopens the attempt.
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
router.post('/:id/regenerate-code', protect, async (req, res, next) => {
  try {
    const quiz = await loadQuiz(req, res, { allowSchoolOwner: true }); // ✅ Allow creator OR school owner
    if (!quiz) return;

    const limits = getLimits(req.user);
    if (!limits.isUnlimited && quiz.accessCodes.length >= limits.maxStudents) {
      return res.status(403).json({ success: false, message: `Your plan allows up to ${limits.maxStudents} access codes per quiz. Upgrade to add more!` });
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
          accessCodes: codesOf(quiz), // Keep for backward compatibility
          accessCodeHistory: getAccessCodeHistory(quiz) // ✅ NEW: Send full history to frontend
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

export default router;
