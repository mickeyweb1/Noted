import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/protect.js';
import { Content } from '../models/Content.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';

const router = express.Router();
router.use(protect);

function parseQuestions(content) {
  try {
    const value = JSON.parse(content.generatedText || '{}');
    return Array.isArray(value.questions) ? value.questions : [];
  } catch { return []; }
}

router.post('/queue', async (req, res, next) => {
  try {
    const { contentId, quizId } = req.body || {};
    if (contentId && mongoose.isValidObjectId(contentId)) {
      const content = await Content.findOne({ _id: contentId, userId: req.user._id, type: 'quiz' });
      if (!content) return res.status(404).json({ success: false, message: 'Quiz not found.' });
      if (!content.revisionQuestions.length) {
        content.revisionQuestions = parseQuestions(content).map((q, questionIndex) => ({
          questionIndex, question: q.question, options: q.options || [],
          correctAnswer: q.correctAnswer || q.answer, explanation: q.explanation || '',
        })).filter((q) => q.question && q.correctAnswer);
        await content.save();
      }
      return res.json({ success: true, data: { queued: content.revisionQuestions.length, alreadyQueued: false } });
    }
    if (quizId && mongoose.isValidObjectId(quizId)) {
      const quiz = await Quiz.findOne({ _id: quizId, createdBy: req.user._id });
      if (!quiz) return res.status(404).json({ success: false, message: 'Quiz not found.' });
      const alreadyQueued = quiz.questions.every((q) => q.revisionQueued);
      quiz.questions.forEach((q) => { q.revisionQueued = true; });
      await quiz.save();
      return res.json({ success: true, data: { queued: quiz.questions.length, alreadyQueued } });
    }
    return res.status(400).json({ success: false, message: 'Provide a valid contentId or quizId.' });
  } catch (error) { next(error); }
});

router.get('/due', async (req, res, next) => {
  try {
    const now = new Date();
    const [contents, quizzes] = await Promise.all([
      Content.find({ userId: req.user._id, type: 'quiz', 'revisionQuestions.0': { $exists: true } }).select('title revisionQuestions'),
      Quiz.find({ createdBy: req.user._id, 'questions.revisionQueued': true }).select('title questions'),
    ]);
    const due = [];
    let totalDue = 0;
    let nextReviewDate = null;
    const add = (parentId, title, sourceType, q, index) => {
      if (new Date(q.nextReviewDate) <= now) {
        totalDue += 1;
        due.push({ parentId: String(parentId), title, sourceType, questionIndex: q.questionIndex ?? index, question: q.question, options: q.options, correctAnswer: q.correctAnswer, explanation: q.explanation, nextReviewDate: q.nextReviewDate });
      } else if (!nextReviewDate || new Date(q.nextReviewDate) < nextReviewDate) nextReviewDate = new Date(q.nextReviewDate);
    };
    contents.forEach((c) => c.revisionQuestions.forEach((q, i) => add(c._id, c.title, 'content', q, i)));
    quizzes.forEach((quiz) => quiz.questions.forEach((q, i) => { if (q.revisionQueued) add(quiz._id, quiz.title, 'quiz', q, i); }));
    due.sort((a, b) => new Date(a.nextReviewDate) - new Date(b.nextReviewDate));
    const limited = due.slice(0, 20);
    const grouped = new Map();
    limited.forEach(({ parentId, title, sourceType, ...question }) => {
      const key = `${sourceType}:${parentId}`;
      if (!grouped.has(key)) grouped.set(key, { parentId, title, sourceType, questions: [] });
      grouped.get(key).questions.push(question);
    });
    res.json({ success: true, data: { groups: [...grouped.values()], dueCount: totalDue, nextReviewDate } });
  } catch (error) { next(error); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const [contents, quizzes, user] = await Promise.all([
      Content.find({ userId: req.user._id, type: 'quiz', 'revisionQuestions.0': { $exists: true } }).select('revisionQuestions'),
      Quiz.find({ createdBy: req.user._id, 'questions.revisionQueued': true }).select('questions'),
      User.findById(req.user._id).select('revisionActivityDates'),
    ]);
    const schedules = contents.flatMap((c) => c.revisionQuestions).concat(quizzes.flatMap((q) => q.questions.filter((x) => x.revisionQueued)));
    const dates = new Set(user?.revisionActivityDates || []);
    let streak = 0;
    const day = new Date(); day.setUTCHours(0, 0, 0, 0);
    if (!dates.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1);
    while (dates.has(day.toISOString().slice(0, 10))) { streak += 1; day.setUTCDate(day.getUTCDate() - 1); }
    res.json({ success: true, data: {
      dueCount: schedules.filter((q) => new Date(q.nextReviewDate) <= now).length,
      masteredCount: schedules.filter((q) => q.repetitions >= 3).length,
      streak,
      nextReviewDate: schedules.filter((q) => new Date(q.nextReviewDate) > now).map((q) => q.nextReviewDate).sort((a, b) => new Date(a) - new Date(b))[0] || null,
    } });
  } catch (error) { next(error); }
});

export default router;
