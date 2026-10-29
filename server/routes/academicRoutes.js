import express from 'express';
import mongoose from 'mongoose';
import { protect } from '../middleware/protect.js';
import { AcademicTerm } from '../models/AcademicTerm.js';
import { calculateTermSummary } from '../utils/academicCalculations.js';

const router = express.Router();
router.use(protect);

// -------------------------------------------------------------
// TERMS
// -------------------------------------------------------------

// GET all terms for the user
router.get('/terms', async (req, res, next) => {
  try {
    const terms = await AcademicTerm.find({ userId: req.user._id })
      .populate('subjects.linkedContentIds', 'title type createdAt')
      .sort({ isCurrent: -1, createdAt: -1 });

    const summaries = terms.map(calculateTermSummary);
    res.json({ success: true, data: summaries });
  } catch (error) {
    next(error);
  }
});

// GET dashboard summary
router.get('/summary', async (req, res, next) => {
  try {
    let term = await AcademicTerm.findOne({ userId: req.user._id, isCurrent: true })
      .populate('subjects.linkedContentIds', 'title type createdAt');

    if (!term) {
      term = await AcademicTerm.findOne({ userId: req.user._id })
        .populate('subjects.linkedContentIds', 'title type createdAt')
        .sort({ createdAt: -1 });
    }

    if (!term) {
      return res.json({
        success: true,
        data: {
          hasTerms: false,
          currentTerm: null,
          termAverage: null,
          belowTargetSubjects: [],
          onTrackCount: 0,
          totalSubjects: 0,
        },
      });
    }

    const summary = calculateTermSummary(term);
    const belowTargetSubjects = summary.subjects.filter((s) => s.status === 'below_target');

    res.json({
      success: true,
      data: {
        hasTerms: true,
        currentTerm: {
          id: String(summary._id),
          name: summary.name,
          year: summary.year,
          isCurrent: summary.isCurrent,
        },
        termAverage: summary.termAverage,
        onTrackCount: summary.onTrackCount,
        belowTargetCount: summary.belowTargetCount,
        totalSubjects: summary.totalSubjects,
        belowTargetSubjects: belowTargetSubjects.map((s) => ({
          id: String(s._id),
          name: s.name,
          code: s.code,
          currentAverage: s.currentAverage,
          targetScore: s.targetScore,
          linkedContentIds: s.linkedContentIds,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST create term
router.post('/terms', async (req, res, next) => {
  try {
    const { year, name, isCurrent, startDate, endDate } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Term name is required.' });
    }
    const cleanYear = typeof year === 'string' && year.trim() ? year.trim() : `${new Date().getFullYear()}`;

    if (isCurrent) {
      await AcademicTerm.updateMany({ userId: req.user._id }, { $set: { isCurrent: false } });
    }

    const term = await AcademicTerm.create({
      userId: req.user._id,
      name: name.trim(),
      year: cleanYear,
      isCurrent: Boolean(isCurrent),
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      subjects: [],
    });

    res.status(201).json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

// GET single term
router.get('/terms/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid term ID.' });
    }
    const term = await AcademicTerm.findOne({ _id: req.params.id, userId: req.user._id })
      .populate('subjects.linkedContentIds', 'title type createdAt');
    if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    res.json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

// PUT update term
router.put('/terms/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid term ID.' });
    }
    const { year, name, isCurrent, startDate, endDate } = req.body || {};

    if (isCurrent) {
      await AcademicTerm.updateMany({ userId: req.user._id, _id: { $ne: req.params.id } }, { $set: { isCurrent: false } });
    }

    const updateFields = {};
    if (typeof name === 'string' && name.trim()) updateFields.name = name.trim();
    if (typeof year === 'string' && year.trim()) updateFields.year = year.trim();
    if (typeof isCurrent === 'boolean') updateFields.isCurrent = isCurrent;
    if (startDate !== undefined) updateFields.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateFields.endDate = endDate ? new Date(endDate) : null;

    const term = await AcademicTerm.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updateFields },
      { new: true }
    ).populate('subjects.linkedContentIds', 'title type createdAt');

    if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    res.json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

// DELETE term
router.delete('/terms/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid term ID.' });
    }
    const deleted = await AcademicTerm.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!deleted) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    res.json({ success: true, message: 'Academic term deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// SUBJECTS
// -------------------------------------------------------------

// POST add subject to term
router.post('/terms/:termId/subjects', async (req, res, next) => {
  try {
    const { termId } = req.params;
    if (!mongoose.isValidObjectId(termId)) {
      return res.status(400).json({ success: false, message: 'Invalid term ID.' });
    }

    const { name, code, color, targetScore, creditHours, notes, linkedContentIds } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Subject name is required.' });
    }

    const term = await AcademicTerm.findOne({ _id: termId, userId: req.user._id });
    if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    const newSubject = {
      name: name.trim(),
      code: typeof code === 'string' ? code.trim() : '',
      color: typeof color === 'string' && color.trim() ? color.trim() : '#4F46E5',
      targetScore: Number.isFinite(Number(targetScore)) ? Math.min(100, Math.max(0, Number(targetScore))) : null,
      creditHours: Number.isFinite(Number(creditHours)) && Number(creditHours) > 0 ? Number(creditHours) : 1,
      notes: typeof notes === 'string' ? notes.trim() : '',
      linkedContentIds: Array.isArray(linkedContentIds)
        ? linkedContentIds.filter((id) => mongoose.isValidObjectId(id))
        : [],
      assessments: [],
    };

    term.subjects.push(newSubject);
    await term.save();
    await term.populate('subjects.linkedContentIds', 'title type createdAt');

    res.status(201).json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

// PUT update subject
router.put('/terms/:termId/subjects/:subjectId', async (req, res, next) => {
  try {
    const { termId, subjectId } = req.params;
    if (!mongoose.isValidObjectId(termId) || !mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs provided.' });
    }

    const term = await AcademicTerm.findOne({ _id: termId, userId: req.user._id });
    if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    const subject = term.subjects.id(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const { name, code, color, targetScore, creditHours, notes, linkedContentIds } = req.body || {};
    if (typeof name === 'string' && name.trim()) subject.name = name.trim();
    if (typeof code === 'string') subject.code = code.trim();
    if (typeof color === 'string' && color.trim()) subject.color = color.trim();
    if (targetScore !== undefined) {
      subject.targetScore = targetScore === null || targetScore === '' ? null : Math.min(100, Math.max(0, Number(targetScore)));
    }
    if (creditHours !== undefined && Number(creditHours) > 0) {
      subject.creditHours = Number(creditHours);
    }
    if (typeof notes === 'string') subject.notes = notes.trim();
    if (Array.isArray(linkedContentIds)) {
      subject.linkedContentIds = linkedContentIds.filter((id) => mongoose.isValidObjectId(id));
    }

    await term.save();
    await term.populate('subjects.linkedContentIds', 'title type createdAt');

    res.json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

// DELETE subject
router.delete('/terms/:termId/subjects/:subjectId', async (req, res, next) => {
  try {
    const { termId, subjectId } = req.params;
    if (!mongoose.isValidObjectId(termId) || !mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs provided.' });
    }

    const term = await AcademicTerm.findOne({ _id: termId, userId: req.user._id });
    if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    term.subjects.pull({ _id: subjectId });
    await term.save();
    await term.populate('subjects.linkedContentIds', 'title type createdAt');

    res.json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// ASSESSMENTS
// -------------------------------------------------------------

// POST add assessment
router.post('/terms/:termId/subjects/:subjectId/assessments', async (req, res, next) => {
  try {
    const { termId, subjectId } = req.params;
    if (!mongoose.isValidObjectId(termId) || !mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ success: false, message: 'Invalid IDs provided.' });
    }

    const { title, category, maxScore, weight, score, date, feedback } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Assessment title is required.' });
    }

    const parsedMax = Number(maxScore);
    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      return res.status(400).json({ success: false, message: 'Maximum score must be greater than 0.' });
    }

    const term = await AcademicTerm.findOne({ _id: termId, userId: req.user._id });
    if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    const subject = term.subjects.id(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    // Distinct null (pending) vs 0 (actual zero)
    let cleanScore = null;
    if (score !== null && score !== undefined && score !== '') {
      const num = Number(score);
      if (Number.isFinite(num) && num >= 0) {
        cleanScore = num;
      }
    }

    const newAssessment = {
      title: title.trim(),
      category: ['exam', 'quiz', 'assignment', 'project', 'homework', 'other'].includes(category)
        ? category
        : 'assignment',
      maxScore: parsedMax,
      weight: Number.isFinite(Number(weight)) && Number(weight) >= 0 ? Number(weight) : 1,
      score: cleanScore,
      date: date ? new Date(date) : new Date(),
      feedback: typeof feedback === 'string' ? feedback.trim() : '',
    };

    subject.assessments.push(newAssessment);
    await term.save();
    await term.populate('subjects.linkedContentIds', 'title type createdAt');

    res.status(201).json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

// PUT update assessment
router.put('/terms/:termId/subjects/:subjectId/assessments/:assessmentId', async (req, res, next) => {
  try {
    const { termId, subjectId, assessmentId } = req.params;
    if (
      !mongoose.isValidObjectId(termId) ||
      !mongoose.isValidObjectId(subjectId) ||
      !mongoose.isValidObjectId(assessmentId)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid IDs provided.' });
    }

    const term = await AcademicTerm.findOne({ _id: termId, userId: req.user._id });
    if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    const subject = term.subjects.id(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const assessment = subject.assessments.id(assessmentId);
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found.' });

    const { title, category, maxScore, weight, score, date, feedback } = req.body || {};

    if (typeof title === 'string' && title.trim()) assessment.title = title.trim();
    if (category && ['exam', 'quiz', 'assignment', 'project', 'homework', 'other'].includes(category)) {
      assessment.category = category;
    }
    if (maxScore !== undefined) {
      const parsedMax = Number(maxScore);
      if (Number.isFinite(parsedMax) && parsedMax > 0) assessment.maxScore = parsedMax;
    }
    if (weight !== undefined) {
      const parsedWeight = Number(weight);
      if (Number.isFinite(parsedWeight) && parsedWeight >= 0) assessment.weight = parsedWeight;
    }
    if (score !== undefined) {
      if (score === null || score === '' || score === undefined) {
        assessment.score = null; // Unscored / pending
      } else {
        const num = Number(score);
        if (Number.isFinite(num) && num >= 0) {
          assessment.score = num;
        }
      }
    }
    if (date !== undefined) assessment.date = date ? new Date(date) : assessment.date;
    if (typeof feedback === 'string') assessment.feedback = feedback.trim();

    await term.save();
    await term.populate('subjects.linkedContentIds', 'title type createdAt');

    res.json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

// DELETE assessment
router.delete('/terms/:termId/subjects/:subjectId/assessments/:assessmentId', async (req, res, next) => {
  try {
    const { termId, subjectId, assessmentId } = req.params;
    if (
      !mongoose.isValidObjectId(termId) ||
      !mongoose.isValidObjectId(subjectId) ||
      !mongoose.isValidObjectId(assessmentId)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid IDs provided.' });
    }

    const term = await AcademicTerm.findOne({ _id: termId, userId: req.user._id });
    if (!term) return res.status(404).json({ success: false, message: 'Academic term not found.' });

    const subject = term.subjects.id(subjectId);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    subject.assessments.pull({ _id: assessmentId });
    await term.save();
    await term.populate('subjects.linkedContentIds', 'title type createdAt');

    res.json({ success: true, data: calculateTermSummary(term) });
  } catch (error) {
    next(error);
  }
});

export default router;
