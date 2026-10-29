import test from 'node:test';
import assert from 'node:assert/strict';
import { applyReview } from '../utils/sm2.js';

test('SM-2 handles repeated success and resets on incorrect review', () => {
  const initial = {
    interval: 0,
    ease: 2.5,
    repetitions: 0,
    lastResult: null,
  };

  // 1st correct review
  const first = applyReview(initial, true);
  assert.equal(first.repetitions, 1);
  assert.equal(first.interval, 1);
  assert.equal(first.ease, 2.6);
  assert.equal(first.lastResult, 'correct');

  // 2nd correct review
  const second = applyReview(first, true);
  assert.equal(second.repetitions, 2);
  assert.equal(second.interval, 6);
  assert.equal(second.ease, 2.7);

  // 3rd correct review
  const third = applyReview(second, true);
  assert.equal(third.repetitions, 3);
  assert.equal(third.interval, 6 * 2.7);

  // Incorrect review resets repetitions to 0 and interval to 1
  const failed = applyReview(third, false);
  assert.equal(failed.repetitions, 0);
  assert.equal(failed.interval, 1);
  assert.equal(failed.lastResult, 'incorrect');
  assert.ok(failed.ease >= 1.3);
});
