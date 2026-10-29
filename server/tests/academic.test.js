import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSubjectSummary, calculateTermSummary } from '../utils/academicCalculations.js';

test('distinguishes missing assessment score from a score of zero', () => {
  // Case A: Missing score (null) should NOT lower the average to 0
  const subjectWithPending = {
    name: 'Mathematics',
    targetScore: 80,
    assessments: [
      { title: 'Quiz 1', maxScore: 20, score: 18, weight: 1 },
      { title: 'Exam 1', maxScore: 100, score: null, weight: 2 }, // Pending/missing
    ],
  };

  const summaryPending = calculateSubjectSummary(subjectWithPending);
  assert.equal(summaryPending.scoredAssessmentsCount, 1);
  assert.equal(summaryPending.pendingAssessmentsCount, 1);
  assert.equal(summaryPending.currentAverage, 90); // 18/20 = 90%
  assert.equal(summaryPending.status, 'on_track');

  // Case B: Actual score of 0 DOES count
  const subjectWithZero = {
    name: 'Mathematics',
    targetScore: 80,
    assessments: [
      { title: 'Quiz 1', maxScore: 20, score: 20, weight: 1 }, // 100%
      { title: 'Quiz 2', maxScore: 20, score: 0, weight: 1 },  // 0%
    ],
  };

  const summaryZero = calculateSubjectSummary(subjectWithZero);
  assert.equal(summaryZero.scoredAssessmentsCount, 2);
  assert.equal(summaryZero.pendingAssessmentsCount, 0);
  assert.equal(summaryZero.currentAverage, 50); // average of 100% and 0%
  assert.equal(summaryZero.status, 'below_target');
});

test('handles subject with no recorded marks gracefully', () => {
  const subject = {
    name: 'History',
    targetScore: 75,
    assessments: [
      { title: 'Paper 1', maxScore: 50, score: null },
    ],
  };

  const summary = calculateSubjectSummary(subject);
  assert.equal(summary.currentAverage, null);
  assert.equal(summary.status, 'pending');
  assert.equal(summary.scoredAssessmentsCount, 0);
  assert.equal(summary.pendingAssessmentsCount, 1);
});

test('calculates term summary and target tracking across multiple subjects', () => {
  const term = {
    name: 'Term 1',
    year: '2025/2026',
    subjects: [
      {
        name: 'Math',
        targetScore: 80,
        creditHours: 3,
        assessments: [{ title: 'Final', maxScore: 100, score: 85, weight: 1 }],
      },
      {
        name: 'Physics',
        targetScore: 80,
        creditHours: 3,
        assessments: [{ title: 'Midterm', maxScore: 100, score: 65, weight: 1 }],
      },
      {
        name: 'Art',
        targetScore: null,
        creditHours: 1,
        assessments: [{ title: 'Project 1', maxScore: 50, score: null }], // pending
      },
    ],
  };

  const summary = calculateTermSummary(term);
  assert.equal(summary.totalSubjects, 3);
  assert.equal(summary.onTrackCount, 1); // Math (85 >= 80)
  assert.equal(summary.belowTargetCount, 1); // Physics (65 < 80)
  // Term average = (85 * 3 + 65 * 3) / (3 + 3) = (255 + 195) / 6 = 75
  assert.equal(summary.termAverage, 75);
});
