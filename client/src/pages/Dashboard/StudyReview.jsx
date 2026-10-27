import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BookOpen, Check, Clock3, RotateCcw } from "lucide-react";
import MathRenderer from "../../components/MathRenderer";
import { getDueReviewItems, getNextReviewItem, updateReviewSchedule } from "../../utils/spacedReview";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";

export default function StudyReview() {
  const [items, setItems] = useState(() => getDueReviewItems());
  const [upcoming, setUpcoming] = useState(() => getNextReviewItem());
  const [showAnswer, setShowAnswer] = useState(false);
  const current = items[0];

  useEffect(() => {
    const refresh = () => {
      setItems(getDueReviewItems());
      setUpcoming(getNextReviewItem());
    };
    window.addEventListener("noted-spaced-review-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("noted-spaced-review-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const rateCurrent = (remembered) => {
    if (!current) return;
    updateReviewSchedule(current.id, remembered);
    setItems(getDueReviewItems());
    setShowAnswer(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/dashboard" aria-label="Back to dashboard" className={`rounded-xl border border-border bg-card p-2.5 text-foreground hover:bg-accent ${focusRing}`}><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Spaced review</h1>
          <p className="text-sm text-muted-foreground">A few quick reviews help ideas stick. Take them at your own pace.</p>
        </div>
      </div>

      {current ? (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8" aria-labelledby="review-count">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p id="review-count" className="text-sm font-semibold text-muted-foreground">{items.length} due for review</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand"><Clock3 className="h-3.5 w-3.5" /> {current.sourceTitle || "Study item"}</span>
          </div>
          <div className="min-h-48 rounded-2xl bg-muted/60 p-5 sm:p-7">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-brand">Question</p>
            <div className="break-words text-lg font-semibold leading-7 text-foreground"><MathRenderer>{current.front}</MathRenderer></div>
            {showAnswer && (
              <div className="mt-6 border-t border-border pt-5">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-green-700 dark:text-green-400">Answer</p>
                <div className="break-words text-base leading-7 text-foreground"><MathRenderer>{current.back}</MathRenderer></div>
              </div>
            )}
          </div>

          {!showAnswer ? (
            <button type="button" onClick={() => setShowAnswer(true)} className={`mt-5 w-full rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground hover:bg-brand/90 ${focusRing}`}>Show answer</button>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => rateCurrent(false)} className={`inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground hover:bg-accent ${focusRing}`}><RotateCcw className="h-4 w-4" /> Review tomorrow</button>
              <button type="button" onClick={() => rateCurrent(true)} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground hover:bg-brand/90 ${focusRing}`}><Check className="h-4 w-4" /> Got it · review in a few days</button>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><Check className="h-7 w-7" /></div>
          <h2 className="text-xl font-bold text-foreground">You’re all caught up</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {upcoming ? `Your next review is due ${new Date(upcoming.dueAt).toLocaleDateString()}. Until then, take a break or keep studying if you feel like it.` : "Add missed quiz questions or flashcards to review them again over the next few days."}
          </p>
          <Link to="/ai-flashcards" className={`mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground hover:bg-brand/90 ${focusRing}`}><BookOpen className="h-4 w-4" /> Study flashcards</Link>
        </section>
      )}
    </div>
  );
}

