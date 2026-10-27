/** Apply one quality-5/0 SM-2 review result to a question schedule. */
export function applyReview(schedule, correct, now = new Date()) {
  const next = { ...schedule };
  if (correct) {
    next.repetitions = (Number(next.repetitions) || 0) + 1;
    next.interval = next.repetitions === 1 ? 1 : next.repetitions === 2 ? 6 : (Number(next.interval) || 0) * (Number(next.ease) || 2.5);
    next.ease = (Number(next.ease) || 2.5) + 0.1;
    next.lastResult = 'correct';
  } else {
    next.repetitions = 0;
    next.interval = 1;
    next.ease = Math.max(1.3, (Number(next.ease) || 2.5) - 0.2);
    next.lastResult = 'incorrect';
  }
  next.nextReviewDate = new Date(now.getTime() + next.interval * 86400000);
  return next;
}
