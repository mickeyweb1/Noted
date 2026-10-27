import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReview } from '../utils/sm2.js';

test('two mock quizzes schedule correct and missed questions persistently', () => {
  const now = new Date('2026-10-27T12:00:00.000Z');
  const mockQuizzes = [
    { title: 'Biology', questions: [{ interval: 0, ease: 2.5, repetitions: 0 }] },
    { title: 'History', questions: [{ interval: 6, ease: 2.5, repetitions: 2 }] },
  ];
  const biology = applyReview(mockQuizzes[0].questions[0], true, now);
  const history = applyReview(mockQuizzes[1].questions[0], false, now);
  assert.equal(biology.interval, 1);
  assert.equal(biology.repetitions, 1);
  assert.equal(biology.lastResult, 'correct');
  assert.equal(biology.nextReviewDate.toISOString(), '2026-10-28T12:00:00.000Z');
  assert.equal(history.interval, 1);
  assert.equal(history.repetitions, 0);
  assert.equal(history.ease, 2.3);
  assert.equal(history.lastResult, 'incorrect');
  assert.equal(history.nextReviewDate.toISOString(), '2026-10-28T12:00:00.000Z');
});

test('SM-2 advances intervals and enforces the ease floor', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const second = applyReview({ interval: 1, ease: 2.6, repetitions: 1 }, true, now);
  const third = applyReview(second, true, now);
  const missed = applyReview({ interval: 12, ease: 1.35, repetitions: 5 }, false, now);
  assert.equal(second.interval, 6);
  assert.equal(Number(third.interval.toFixed(1)), 16.2);
  assert.equal(missed.ease, 1.3);
});
