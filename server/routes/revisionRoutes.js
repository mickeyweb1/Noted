import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/protect.js';
import { Content } from '../models/Content.js';
import { Quiz } from '../models/Quiz.js';
import { User } from '../models/User.js';
import { ReviewItem } from '../models/ReviewItem.js';
import { applyReview } from '../utils/sm2.js';

const router = express.Router();
router.use(protect);

function parseQuestions(content) {
  try {
    const value = JSON.parse(content.generatedText || '{}');
    return Array.isArray(value.questions) ? value.questions : [];
  } catch { return []; }
}

const normalizeReviewItem = (item) => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const sourceKey = typeof item.id === 'string' ? item.id.trim() : '';
  const front = typeof item.front === 'string' ? item.front.trim() : '';
  const back = typeof item.back === 'string' ? item.back.trim() : '';
  const type = item.type === 'flashcard' ? 'flashcard' : item.type === 'quiz-question' ? 'question' : null;
  const dueAt = Number(item.dueAt);
  const nextReviewDate = Number.isFinite(dueAt) && dueAt > 0 ? new Date(dueAt) : new Date(Date.now() + 86400000);
  const repetitions = Number(item.repetitions);
  const intervalDays = Number(item.intervalDays);
  const createdAt = Number(item.createdAt);
  const lastReviewedAt = Number(item.lastReviewedAt);

  if (!sourceKey || sourceKey.length > 200 || !type || !front || !back || front.length > 5000 || back.length > 5000) return null;

  return {
    sourceKey,
    type,
    front,
    back,
    sourceTitle: typeof item.sourceTitle === 'string' ? item.sourceTitle.trim().slice(0, 160) : 'Study item',
    nextReviewDate,
    interval: Number.isFinite(intervalDays) && intervalDays >= 0 ? intervalDays : 0,
    ease: 2.5,
    repetitions: Number.isInteger(repetitions) && repetitions >= 0 ? repetitions : 0,
    lastResult: null,
    lastReviewedAt: Number.isFinite(lastReviewedAt) && lastReviewedAt > 0 ? new Date(lastReviewedAt) : null,
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? new Date(createdAt) : undefined,
  };
};

router.post('/items', async (req, res, next) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
      return res.status(400).json({ success: false, message: 'Provide between 1 and 500 review items.' });
    }

    const normalized = items.map(normalizeReviewItem);
    if (normalized.some((item) => !item)) {
      return res.status(400).json({ success: false, message: 'Each item needs a valid id, type, front, and back.' });
    }

    const uniqueItems = [...new Map(normalized.map((item) => [item.sourceKey, item])).values()];
    await ReviewItem.bulkWrite(uniqueItems.map((item) => {
      const { sourceKey, ...fields } = item;
      return {
        updateOne: {
          filter: { userId: req.user._id, sourceKey },
          update: { $setOnInsert: { userId: req.user._id, sourceKey, ...fields } },
          upsert: true,
        },
      };
    }));

    res.status(200).json({ success: true, data: { imported: uniqueItems.length } });
  } catch (error) {
    next(error);
  }
});

router.post('/items/:id/review', async (req, res, next) => {
  try {
    const { correct } = req.body || {};
    if (typeof correct !== 'boolean') {
      return res.status(400).json({ success: false, message: 'A boolean correct value is required.' });
    }
    const item = await ReviewItem.findOne({ _id: req.params.id, userId: req.user._id });
    if (!item) return res.status(404).json({ success: false, message: 'Review item not found.' });

    Object.assign(item, applyReview(item.toObject(), correct));
    item.lastReviewedAt = new Date();
    await item.save();

    const today = new Date().toISOString().slice(0, 10);
    await User.updateOne({ _id: req.user._id }, { $addToSet: { revisionActivityDates: today } });
    res.json({
      success: true,
      data: {
        nextReviewDate: item.nextReviewDate,
        interval: item.interval,
        repetitions: item.repetitions,
        lastResult: item.lastResult,
      },
    });
  } catch (error) {
    next(error);
  }
});

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
    const [contents, quizzes, reviewItems, totalReviewDue, futureReviewItem] = await Promise.all([
      Content.find({ userId: req.user._id, type: 'quiz', 'revisionQuestions.0': { $exists: true } }).select('title revisionQuestions'),
      Quiz.find({ createdBy: req.user._id, 'questions.revisionQueued': true }).select('title questions'),
      ReviewItem.find({ userId: req.user._id, nextReviewDate: { $lte: now } }).sort({ nextReviewDate: 1 }).limit(20),
      ReviewItem.countDocuments({ userId: req.user._id, nextReviewDate: { $lte: now } }),
      ReviewItem.findOne({ userId: req.user._id, nextReviewDate: { $gt: now } }).sort({ nextReviewDate: 1 }).select('nextReviewDate'),
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

    if (futureReviewItem && (!nextReviewDate || new Date(futureReviewItem.nextReviewDate) < new Date(nextReviewDate))) {
      nextReviewDate = futureReviewItem.nextReviewDate;
    }

    res.json({
      success: true,
      data: {
        groups: [...grouped.values()],
        items: reviewItems.map((item) => ({
          id: String(item._id),
          question: item.front,
          correctAnswer: item.back,
          options: [],
          explanation: '',
          title: item.sourceTitle,
          sourceType: item.type,
          nextReviewDate: item.nextReviewDate,
          reviewItemId: String(item._id),
        })),
        dueCount: totalDue + totalReviewDue,
        nextReviewDate,
      },
    });
  } catch (error) { next(error); }
});

router.get('/stats', async (req, res, next) => {
  try {
    const now = new Date();
    const [contents, quizzes, reviewItems, user] = await Promise.all([
      Content.find({ userId: req.user._id, type: 'quiz', 'revisionQuestions.0': { $exists: true } }).select('revisionQuestions'),
      Quiz.find({ createdBy: req.user._id, 'questions.revisionQueued': true }).select('questions'),
      ReviewItem.find({ userId: req.user._id }).select('nextReviewDate repetitions'),
      User.findById(req.user._id).select('revisionActivityDates'),
    ]);
    const schedules = contents.flatMap((c) => c.revisionQuestions).concat(quizzes.flatMap((q) => q.questions.filter((x) => x.revisionQueued)));
    const dates = new Set(user?.revisionActivityDates || []);
    let streak = 0;
    const day = new Date(); day.setUTCHours(0, 0, 0, 0);
    if (!dates.has(day.toISOString().slice(0, 10))) day.setUTCDate(day.getUTCDate() - 1);
    while (dates.has(day.toISOString().slice(0, 10))) { streak += 1; day.setUTCDate(day.getUTCDate() - 1); }
    res.json({ success: true, data: {
      dueCount: schedules.filter((q) => new Date(q.nextReviewDate) <= now).length
        + reviewItems.filter((q) => new Date(q.nextReviewDate) <= now).length,
      masteredCount: schedules.filter((q) => q.repetitions >= 3).length
        + reviewItems.filter((q) => q.repetitions >= 3).length,
      streak,
      nextReviewDate: schedules.map((q) => q.nextReviewDate)
        .concat(reviewItems.map((q) => q.nextReviewDate))
        .filter((date) => new Date(date) > now)
        .sort((a, b) => new Date(a) - new Date(b))[0] || null,
    } });
  } catch (error) { next(error); }
});

export default router;
