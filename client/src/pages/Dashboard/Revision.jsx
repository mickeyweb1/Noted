import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Brain,
  Check,
  CircleCheck,
  Clock3,
  Flame,
  GraduationCap,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import api from '../../utils/api';
import MathRenderer from '../../components/MathRenderer';
import { syncPendingReviewItems } from '../../utils/spacedReview';

const card = 'rounded-2xl border border-border bg-card shadow-sm';
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

export default function Revision() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ dueCount: 0, masteredCount: 0, streak: 0, nextReviewDate: null });
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastFailedSubmission, setLastFailedSubmission] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setLastFailedSubmission(null);
    try {
      // Sync any local pending review items first so account is up to date
      await syncPendingReviewItems().catch(() => {});

      const [dueResponse, statsResponse] = await Promise.all([
        api.get('/revision/due'),
        api.get('/revision/stats'),
      ]);

      const groups = dueResponse.data?.data?.groups || [];
      const groupQuestions = groups.flatMap((group) =>
        group.questions.map((question) => ({
          ...question,
          parentId: group.parentId,
          title: group.title,
          sourceType: group.sourceType || 'quiz',
          hasMultipleChoice: Array.isArray(question.options) && question.options.length > 0,
        }))
      );

      const items = (dueResponse.data?.data?.items || []).map((item) => ({
        ...item,
        parentId: null,
        reviewItemId: item.reviewItemId || item.id,
        hasMultipleChoice: false,
        sourceType: item.sourceType || 'flashcard',
      }));

      const combinedQueue = [...groupQuestions, ...items];
      setQueue(combinedQueue);
      setStats(
        statsResponse.data?.data || {
          dueCount: dueResponse.data?.data?.dueCount || combinedQueue.length,
          masteredCount: 0,
          streak: 0,
          nextReviewDate: dueResponse.data?.data?.nextReviewDate,
        }
      );
      setIndex(0);
      setChoice(null);
      setResult(null);
      setShowAnswer(false);
    } catch {
      setError('Revision could not load. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = queue[index];
  const options = useMemo(() => current?.options || [], [current]);
  const progress = queue.length ? ((index + (result ? 1 : 0)) / queue.length) * 100 : 0;

  const saveReviewResult = async (isCorrect) => {
    if (!current || saving) return;
    setSaving(true);
    setError('');
    setLastFailedSubmission(null);

    try {
      if (current.reviewItemId) {
        await api.post(`/revision/items/${current.reviewItemId}/review`, { correct: isCorrect });
      } else if (current.parentId) {
        await api.post(`/quiz/${current.parentId}/review`, {
          questionIndex: current.questionIndex,
          correct: isCorrect,
        });
      } else {
        throw new Error('Unrecognized review target');
      }

      window.dispatchEvent(new Event('revision-updated'));
      setStats((previous) => ({ ...previous, dueCount: Math.max(0, previous.dueCount - 1) }));

      window.setTimeout(() => {
        setIndex((previous) => previous + 1);
        setChoice(null);
        setResult(null);
        setShowAnswer(false);
        setSaving(false);
        if (index + 1 >= queue.length) {
          load();
        }
      }, 900);
    } catch {
      setError('Your answer could not be saved to your account. Please retry.');
      setLastFailedSubmission(isCorrect);
      setSaving(false);
    }
  };

  const handleMultipleChoiceSubmit = () => {
    if (!current || choice === null || saving) return;
    const isCorrect = choice === current.correctAnswer;
    setResult({ correct: isCorrect });
    saveReviewResult(isCorrect);
  };

  const handleFlashcardRate = (remembered) => {
    if (!current || saving) return;
    saveReviewResult(remembered);
  };

  if (loading) {
    return (
      <div className={`${card} flex min-h-72 items-center justify-center text-muted-foreground`}>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading your account review queue…
      </div>
    );
  }

  const allCaughtUp = !current;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            Account-Synced Revision
          </div>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
            Today's Review <span className="text-muted-foreground">· {stats.dueCount} due</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Spaced repetition synced to your Noted account across devices.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground">
          <Flame className="h-5 w-5 text-orange-500" /> {stats.streak} day streak
        </div>
      </header>

      {error && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          {lastFailedSubmission !== null ? (
            <button
              type="button"
              onClick={() => saveReviewResult(lastFailedSubmission)}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 font-semibold text-white hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Retry save
            </button>
          ) : (
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-destructive/40 bg-card px-3 py-1.5 font-semibold text-destructive hover:bg-destructive/10"
            >
              <RotateCcw className="h-4 w-4" />
              Reload queue
            </button>
          )}
        </div>
      )}

      {allCaughtUp ? (
        <section className={`${card} flex flex-col items-center px-5 py-12 text-center sm:py-16`}>
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
            <CircleCheck className="h-9 w-9" />
          </span>
          <h2 className="mt-5 text-2xl font-bold text-foreground">All caught up!</h2>
          <p className="mt-2 max-w-md text-muted-foreground">
            Your review queue is clear. Your spaced repetitions have been saved to your account.
          </p>
          {stats.nextReviewDate && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4" /> Next review {new Date(stats.nextReviewDate).toLocaleString()}
            </p>
          )}
          <p className="mt-3 text-sm text-muted-foreground">
            {stats.masteredCount} mastered item{stats.masteredCount === 1 ? '' : 's'}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/ai-flashcards"
              className={`inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent ${focusRing}`}
            >
              <BookOpen className="h-4 w-4" /> Study flashcards
            </Link>
            <Link
              to="/quiz"
              className={`inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent ${focusRing}`}
            >
              <Brain className="h-4 w-4" /> Practice quizzes
            </Link>
            <Link
              to="/academic-progress"
              className={`inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground hover:bg-brand/90 ${focusRing}`}
            >
              <GraduationCap className="h-4 w-4" /> Academic Progress
            </Link>
          </div>
        </section>
      ) : (
        <section className={`${card} overflow-hidden`}>
          <div className="space-y-3 border-b border-border p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-foreground">
                Item {index + 1} of {queue.length}
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                  {current.hasMultipleChoice ? 'Quiz Question' : current.sourceType === 'flashcard' ? 'Flashcard' : 'Review Card'}
                </span>
                <span className="max-w-[180px] truncate text-muted-foreground sm:max-w-xs">
                  {current.title}
                </span>
              </div>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="p-4 sm:p-7">
            {/* Question / Front */}
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {current.hasMultipleChoice ? 'Question' : 'Front / Prompt'}
            </div>
            <div className="break-words text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">
              <MathRenderer>{current.question || current.front}</MathRenderer>
            </div>

            {/* Multiple Choice Options */}
            {current.hasMultipleChoice ? (
              <>
                <div className="mt-6 grid gap-3">
                  {options.map((option, i) => {
                    const selected = choice === option;
                    const right = result && option === current.correctAnswer;
                    const wrong = result && selected && !result.correct;
                    return (
                      <button
                        key={`${i}-${option}`}
                        type="button"
                        disabled={Boolean(result) || saving}
                        onClick={() => setChoice(option)}
                        className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                          right
                            ? 'border-green-500 bg-green-500/10 text-foreground'
                            : wrong
                            ? 'border-destructive bg-destructive/10 text-foreground'
                            : selected
                            ? 'border-brand bg-brand/10 text-foreground'
                            : 'border-border bg-background text-foreground hover:bg-accent'
                        } disabled:cursor-default`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/20 text-sm font-semibold">
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="min-w-0 flex-1 break-words">
                          <MathRenderer>{option}</MathRenderer>
                        </span>
                        {right && <Check className="h-5 w-5 text-green-600" />}
                        {wrong && <X className="h-5 w-5 text-destructive" />}
                      </button>
                    );
                  })}
                </div>

                {result && (
                  <div
                    className={`mt-5 rounded-xl border p-4 ${
                      result.correct
                        ? 'border-green-500/30 bg-green-500/5'
                        : 'border-orange-500/30 bg-orange-500/5'
                    }`}
                    role="status"
                  >
                    <p className="font-semibold text-foreground">
                      {result.correct ? 'Correct!' : `Not quite. Correct answer: ${current.correctAnswer}`}
                    </p>
                    {current.explanation && (
                      <p className="mt-1 text-sm text-muted-foreground">{current.explanation}</p>
                    )}
                  </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">Your progress saves after each answer.</p>
                  {!result ? (
                    <button
                      type="button"
                      disabled={choice === null || saving}
                      onClick={handleMultipleChoiceSubmit}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-semibold text-brand-foreground hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />} Check answer
                    </button>
                  ) : (
                    <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-muted px-5 text-sm font-semibold text-foreground">
                      <RotateCcw className="h-4 w-4" /> Next question shortly
                    </span>
                  )}
                </div>
              </>
            ) : (
              /* Flashcard / Open Question Answer Reveal & Rating */
              <div className="mt-6 space-y-5">
                {showAnswer ? (
                  <div className="rounded-2xl border border-border bg-muted/40 p-5">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-brand">
                      Answer / Back
                    </p>
                    <div className="break-words text-base leading-7 text-foreground">
                      <MathRenderer>{current.back || current.correctAnswer}</MathRenderer>
                    </div>
                  </div>
                ) : null}

                {!showAnswer ? (
                  <button
                    type="button"
                    onClick={() => setShowAnswer(true)}
                    className={`w-full rounded-xl bg-brand px-5 py-3.5 font-semibold text-brand-foreground hover:bg-brand/90 ${focusRing}`}
                  >
                    Show answer
                  </button>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleFlashcardRate(false)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground hover:bg-accent disabled:opacity-50 ${focusRing}`}
                    >
                      <RotateCcw className="h-4 w-4" /> Review tomorrow
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleFlashcardRate(true)}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground hover:bg-brand/90 disabled:opacity-50 ${focusRing}`}
                    >
                      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                      <Check className="h-4 w-4" /> Got it · review in a few days
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-center sm:text-left">
                  Responses update your spaced repetition interval and sync to your account.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
