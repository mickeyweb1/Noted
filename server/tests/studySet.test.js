import test from 'node:test';
import assert from 'node:assert/strict';
import { getYoutubeVideoId, sanitizeSharedStudySet, validateGeneratedSet } from '../controllers/studySetController.js';

const generatedSet = () => ({
  title: 'Cell Biology',
  summarizedNotes: 'Summary notes',
  comprehensiveNotes: 'Detailed notes',
  flashcards: Array.from({ length: 12 }, (_, index) => ({ front: `Question ${index}`, back: `Answer ${index}` })),
  quiz: Array.from({ length: 8 }, (_, index) => ({
    question: `Quiz question ${index}`,
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: ' A ',
    explanation: 'A is correct.',
  })),
  studyPlan: Array.from({ length: 3 }, (_, index) => ({ task: `Study task ${index}`, durationMinutes: 15 })),
});

test('validates the full generated Study Set and normalizes quiz answers', () => {
  const result = validateGeneratedSet(generatedSet());
  assert.equal(result.flashcards.length, 12);
  assert.equal(result.quiz.length, 8);
  assert.equal(result.quiz[0].correctAnswer, 'A');
  assert.equal(result.studyPlan.length, 3);
});

test('rejects incomplete or malformed generated content', () => {
  const invalid = generatedSet();
  invalid.quiz.pop();
  assert.throws(() => validateGeneratedSet(invalid), { status: 502 });

  const invalidAnswer = generatedSet();
  invalidAnswer.quiz[0].correctAnswer = 'Not an option';
  assert.throws(() => validateGeneratedSet(invalidAnswer), { status: 502 });
});

test('accepts supported YouTube URL forms and rejects other hosts', () => {
  assert.equal(getYoutubeVideoId('https://www.youtube.com/watch?v=abcdefghijk'), 'abcdefghijk');
  assert.equal(getYoutubeVideoId('https://youtu.be/abcdefghijk'), 'abcdefghijk');
  assert.equal(getYoutubeVideoId('https://youtube.com/shorts/abcdefghijk'), 'abcdefghijk');
  assert.throws(() => getYoutubeVideoId('https://youtube.com.attacker.example/watch?v=abcdefghijk'), { status: 400 });
});

test('sanitizes shared Study Sets without exposing source text or tutor history', () => {
  const sharedSet = sanitizeSharedStudySet({
    _id: 'set-id',
    userId: 'owner-id',
    schoolId: 'school-id',
    sourceText: 'Private uploaded source',
    tutorMessages: [{ role: 'user', content: 'Private tutor question' }],
    notes: { summarized: 'Shared notes' },
    flashcards: [{ front: 'Question', back: 'Answer' }],
  });

  assert.equal(sharedSet.canEdit, false);
  assert.equal(sharedSet.notes.summarized, 'Shared notes');
  assert.equal('sourceText' in sharedSet, false);
  assert.equal('tutorMessages' in sharedSet, false);
  assert.equal('userId' in sharedSet, false);
  assert.equal('schoolId' in sharedSet, false);
});
