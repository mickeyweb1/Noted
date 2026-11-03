import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Info } from "lucide-react";
import MathRenderer from "./MathRenderer";

/*
 * Export questions as a PDF, keeping the formatting (matrices, fractions, roots, images).
 *
 * Why this works: the questions are drawn with the same <MathRenderer> used everywhere else, and the
 * browser prints exactly what it shows. "Save as PDF" in the print window keeps the maths looking
 * like it does on screen, instead of turning it into raw text such as \begin{bmatrix}.
 * Printing the main window (not a pop-up or iframe) also works on phones.
 */

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

// Injected while the export screen is open, removed when it closes.
const EXPORT_CSS = `
  /* The paper is always black on white, even in dark mode. */
  .export-paper, .export-paper * { color: #111 !important; }
  .export-paper .export-muted, .export-paper .export-muted * { color: #555 !important; }
  .export-paper, .export-paper * { print-color-adjust: exact; -webkit-print-color-adjust: exact; }

  @page { size: A4; margin: 14mm; }
  @media print {
    html, body { background: #fff !important; height: auto !important; overflow: visible !important; }
    body > *:not(#quiz-export-root) { display: none !important; }
    #quiz-export-root { position: static !important; display: block !important; background: #fff !important; }
    #quiz-export-root .export-toolbar { display: none !important; }
    #quiz-export-root .export-scroll { overflow: visible !important; height: auto !important; padding: 0 !important; }
    #quiz-export-root .export-paper { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; padding: 0 !important; max-width: none !important; width: auto !important; }
  }
`;

const letter = (i) => String.fromCharCode(65 + i);
const sameText = (a, b) => (a ?? "").trim() === (b ?? "").trim();

function QuestionBlock({ q, number, highlightAnswer, showExplanation }) {
  const options = q.options ?? [];
  // Short options sit in two columns; long ones and matrices get a full line each.
  const twoColumns = options.every((o) => (o ?? "").length <= 28 && !(o ?? "").includes("\\begin"));

  return (
    <section style={{ breakInside: "avoid" }} className="mb-5">
      <div className="flex gap-2">
        <span className="font-bold">{number}.</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-relaxed">
            <MathRenderer>{q.question}</MathRenderer>
          </div>

          {q.imageUrl && (
            <img src={q.imageUrl} alt="" className="my-2 max-h-56 max-w-full rounded border border-neutral-300 object-contain" />
          )}

          <ol className={`mt-2 grid gap-1.5 ${twoColumns ? "grid-cols-2" : "grid-cols-1"}`}>
            {options.map((opt, i) => {
              const isCorrect = highlightAnswer && sameText(opt, q.correctAnswer);
              return (
                <li
                  key={i}
                  style={isCorrect ? { background: "#dcfce7", borderColor: "#16a34a" } : undefined}
                  className="flex items-start gap-2 rounded border border-neutral-300 px-2 py-1 text-sm"
                >
                  <span className="font-bold">{letter(i)}.</span>
                  <span className="min-w-0 flex-1 break-words">
                    <MathRenderer>{opt}</MathRenderer>
                  </span>
                  {isCorrect && <span className="font-bold">✓</span>}
                </li>
              );
            })}
          </ol>

          {highlightAnswer && showExplanation && q.explanation && (
            <div className="export-muted mt-2 text-sm">
              <span className="font-semibold">Explanation: </span>
              <MathRenderer>{q.explanation}</MathRenderer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AnswerKey({ questions, showExplanation }) {
  return (
    <section style={{ breakBefore: "page" }} className="mt-10 border-t-2 border-dashed border-neutral-400 pt-6">
      <h2 className="mb-3 text-xl font-bold">Answer key</h2>
      <ol className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm sm:grid-cols-5">
        {questions.map((q, i) => {
          const idx = (q.options ?? []).findIndex((o) => sameText(o, q.correctAnswer));
          return (
            <li key={q._id ?? i} className="flex gap-1">
              <span className="font-semibold">{i + 1}.</span>
              {idx >= 0 ? <span>{letter(idx)}</span> : <MathRenderer>{q.correctAnswer}</MathRenderer>}
            </li>
          );
        })}
      </ol>

      {showExplanation && questions.some((q) => q.explanation) && (
        <div className="mt-6 space-y-2 text-sm">
          <h3 className="font-bold">Explanations</h3>
          {questions.map((q, i) =>
            q.explanation ? (
              <div key={q._id ?? i} style={{ breakInside: "avoid" }} className="flex gap-2">
                <span className="font-semibold">{i + 1}.</span>
                <div className="min-w-0 flex-1"><MathRenderer>{q.explanation}</MathRenderer></div>
              </div>
            ) : null
          )}
        </div>
      )}
    </section>
  );
}

export default function QuestionsExport({ quiz, questions, onClose }) {
  const [answerMode, setAnswerMode] = useState("none"); // none | inline | key
  const [showExplanations, setShowExplanations] = useState(false);
  const [studentLines, setStudentLines] = useState(true);

  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "quiz-export-style";
    style.textContent = EXPORT_CSS;
    document.head.appendChild(style);

    // The browser uses the page title as the default PDF file name.
    const previousTitle = document.title;
    document.title = `${quiz?.title || "Quiz"} - Questions`;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      document.title = previousTitle;
      style.remove();
    };
  }, [quiz?.title]);

  const total = questions.length;
  const meta = [
    `${total} question${total === 1 ? "" : "s"}`,
    quiz?.timeLimit ? `Time: ${quiz.timeLimit} ${quiz.timeUnit || "minutes"}${quiz.timeType === "perQuestion" ? " per question" : ""}` : null,
    quiz?.difficulty ? `Difficulty: ${quiz.difficulty}` : null,
  ].filter(Boolean).join("  ·  ");

  const modes = [
    { id: "none", label: "Questions only" },
    { id: "inline", label: "Answers highlighted" },
    { id: "key", label: "Questions + answer key page" },
  ];

  return createPortal(
    <div
      id="quiz-export-root"
      role="dialog"
      aria-modal="true"
      aria-label="Export questions"
      className="fixed inset-0 z-[100] flex flex-col bg-neutral-200 dark:bg-neutral-900"
    >
      <div className="export-toolbar space-y-3 border-b border-border bg-card p-3 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-foreground sm:text-lg">Download / Export questions</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className={`inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 ${focusRing}`}
            >
              <Printer className="h-4 w-4" /> Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent ${focusRing}`}
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground">
          <div role="radiogroup" aria-label="What to include" className="flex flex-wrap gap-x-4 gap-y-1">
            {modes.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="export-mode"
                  checked={answerMode === m.id}
                  onChange={() => setAnswerMode(m.id)}
                  className="h-4 w-4 accent-brand"
                />
                {m.label}
              </label>
            ))}
          </div>
          <label className={`flex items-center gap-1.5 ${answerMode === "none" ? "opacity-50" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={showExplanations}
              disabled={answerMode === "none"}
              onChange={(e) => setShowExplanations(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Include explanations
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={studentLines}
              onChange={(e) => setStudentLines(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Name / class / date lines
          </label>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Tap <strong>Print / Save as PDF</strong>, then choose <strong>Save as PDF</strong> as the printer (on iPhone: Share, then Save to Files).
            The maths will look exactly like this preview.
          </span>
        </p>
      </div>

      <div className="export-scroll flex-1 overflow-y-auto p-3 sm:p-6">
        <article className="export-paper mx-auto w-full max-w-[210mm] rounded-lg bg-white p-6 text-black shadow-lg sm:p-10">
          <header className="mb-6 border-b-2 border-black pb-4 text-center">
            <h1 className="break-words text-2xl font-bold">{quiz?.title || "Quiz"}</h1>
            {meta && <p className="export-muted mt-1 text-sm">{meta}</p>}
          </header>

          {studentLines && (
            <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {["Name", "Class", "Date", "Score"].map((label) => (
                <div key={label} className="flex items-end gap-2">
                  <span className="font-semibold">{label}:</span>
                  <span className="flex-1 border-b border-black">&nbsp;</span>
                </div>
              ))}
            </div>
          )}

          {questions.map((q, i) => (
            <QuestionBlock
              key={q._id ?? i}
              q={q}
              number={i + 1}
              highlightAnswer={answerMode === "inline"}
              showExplanation={showExplanations}
            />
          ))}

          {answerMode === "key" && <AnswerKey questions={questions} showExplanation={showExplanations} />}
        </article>
      </div>
    </div>,
    document.body
  );
}