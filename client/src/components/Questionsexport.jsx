import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Info, Loader2 } from "lucide-react";
import MathRenderer from "./MathRenderer";

/*
 * QuestionsExport
 * - Uses the same MathRenderer as the quiz UI, so equations remain rendered in PDFs.
 * - Prints only the export document (not the application behind the modal).
 * - Waits for web fonts and question images before opening the browser print dialog.
 * - Keeps the existing public API: <QuestionsExport quiz={...} questions={...} onClose={...} />
 */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const EXPORT_CSS = `
  #quiz-export-root,
  #quiz-export-root * { box-sizing: border-box; }

  .export-paper {
    color: #111 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .export-paper * { color: #111 !important; }
  .export-paper .export-muted,
  .export-paper .export-muted * { color: #555 !important; }
  .export-paper .export-correct {
    background: #dcfce7 !important;
    border-color: #16a34a !important;
  }
  .export-paper img {
    max-width: 100%;
    height: auto;
    object-fit: contain;
  }
  .export-question { break-inside: avoid-page; page-break-inside: avoid; }
  .export-question-image { break-inside: avoid; page-break-inside: avoid; }
  .export-answer-key { break-before: page; page-break-before: always; }

  @page { size: A4; margin: 14mm; }

  @media print {
    html, body {
      width: auto !important;
      height: auto !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }

    body > *:not(#quiz-export-root) { display: none !important; }

    #quiz-export-root {
      position: static !important;
      inset: auto !important;
      display: block !important;
      width: auto !important;
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      padding: 0 !important;
      background: #fff !important;
    }

    #quiz-export-root .export-toolbar { display: none !important; }
    #quiz-export-root .export-scroll {
      display: block !important;
      width: auto !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      padding: 0 !important;
    }

    #quiz-export-root .export-paper {
      width: auto !important;
      max-width: none !important;
      min-height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    #quiz-export-root .export-question,
    #quiz-export-root .export-question-image,
    #quiz-export-root li {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    a { color: #111 !important; text-decoration: none !important; }
  }
`;

const toText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const normalizeAnswer = (value) => toText(value).trim().replace(/\s+/g, " ");
const sameText = (a, b) => normalizeAnswer(a) === normalizeAnswer(b);

// Excel-style option labels: A ... Z, AA, AB, etc.
const optionLetter = (index) => {
  let value = index + 1;
  let label = "";
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
};

const isCompactOption = (option) => {
  const value = toText(option).trim();
  if (!value || value.length > 26) return false;
  // Keep common mathematical expressions and display-math structures on their own line.
  const mathTokens = ["\\begin", "\\end", "\\frac", "\\sqrt", "\\sum", "\\int", "\\lim", "\\matrix", "\\pmatrix", "\\[", "\\(", "\\\\"];
  return !mathTokens.some((token) => value.includes(token));
};

function QuestionBlock({ question, number, highlightAnswer, showExplanation }) {
  const options = Array.isArray(question?.options) ? question.options : [];
  const twoColumns = options.length >= 2 && options.every(isCompactOption);
  const correctAnswer = question?.correctAnswer;
  const questionText = toText(question?.question);
  const imageUrl = typeof question?.imageUrl === "string" ? question.imageUrl : "";

  return (
    <section className="export-question mb-5">
      <div className="flex items-start gap-2">
        <span className="shrink-0 font-bold">{number}.</span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-relaxed">
            <MathRenderer>{questionText}</MathRenderer>
          </div>

          {imageUrl && (
            <div className="export-question-image my-3">
              <img
                src={imageUrl}
                alt={`Illustration for question ${number}`}
                loading="eager"
                decoding="async"
                className="max-h-64 max-w-full rounded border border-neutral-300 object-contain"
              />
            </div>
          )}

          {options.length > 0 && (
            <ol className={`mt-2 grid gap-1.5 ${twoColumns ? "grid-cols-2" : "grid-cols-1"}`}>
              {options.map((option, index) => {
                const optionText = toText(option);
                const isCorrect = highlightAnswer && sameText(optionText, correctAnswer);

                return (
                  <li
                    key={`${number}-option-${index}`}
                    className={`flex min-w-0 items-start gap-2 rounded border border-neutral-300 px-2 py-1.5 text-sm ${
                      isCorrect ? "export-correct" : ""
                    }`}
                  >
                    <span className="shrink-0 font-bold">{optionLetter(index)}.</span>
                    <span className="min-w-0 flex-1 break-words">
                      <MathRenderer>{optionText}</MathRenderer>
                    </span>
                    {isCorrect && (
                      <span className="shrink-0 font-bold" aria-label="Correct answer">
                        ✓
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {highlightAnswer && showExplanation && question?.explanation && (
            <div className="export-muted mt-2 text-sm leading-relaxed">
              <span className="font-semibold">Explanation: </span>
              <MathRenderer>{toText(question.explanation)}</MathRenderer>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AnswerKey({ questions, showExplanation }) {
  return (
    <section className="export-answer-key mt-10 border-t-2 border-dashed border-neutral-400 pt-6">
      <h2 className="mb-3 text-xl font-bold">Answer key</h2>
      <ol className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm sm:grid-cols-5">
        {questions.map((question, index) => {
          const options = Array.isArray(question?.options) ? question.options : [];
          const correctAnswer = question?.correctAnswer;
          const optionIndex = options.findIndex((option) => sameText(option, correctAnswer));
          const hasAnswer = normalizeAnswer(correctAnswer).length > 0;

          return (
            <li key={question?._id ?? index} className="flex min-w-0 items-start gap-1">
              <span className="shrink-0 font-semibold">{index + 1}.</span>
              {optionIndex >= 0 ? (
                <span>{optionLetter(optionIndex)}</span>
              ) : hasAnswer ? (
                <span className="min-w-0 break-words">
                  <MathRenderer>{toText(correctAnswer)}</MathRenderer>
                </span>
              ) : (
                <span className="export-muted">Not provided</span>
              )}
            </li>
          );
        })}
      </ol>

      {showExplanation && questions.some((question) => Boolean(question?.explanation)) && (
        <div className="mt-6 space-y-3 text-sm leading-relaxed">
          <h3 className="font-bold">Explanations</h3>
          {questions.map((question, index) =>
            question?.explanation ? (
              <div key={question?._id ?? index} className="flex items-start gap-2" style={{ breakInside: "avoid" }}>
                <span className="shrink-0 font-semibold">{index + 1}.</span>
                <div className="min-w-0 flex-1">
                  <MathRenderer>{toText(question.explanation)}</MathRenderer>
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </section>
  );
}

async function waitForPrintAssets(root) {
  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  if (!root) return;

  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      if (typeof image.decode === "function") {
        try {
          await image.decode();
          return;
        } catch {
          // A broken image should not prevent the user from printing the rest of the quiz.
        }
      }

      if (image.complete) return;

      await new Promise((resolve) => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    })
  );

  // Give React and the browser a chance to finish layout before print capture.
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

export default function QuestionsExport({ quiz, questions, onClose }) {
  const [answerMode, setAnswerMode] = useState("none"); // none | inline | key
  const [showExplanations, setShowExplanations] = useState(false);
  const [studentLines, setStudentLines] = useState(true);
  const [isPreparingPrint, setIsPreparingPrint] = useState(false);

  const dialogRef = useRef(null);
  const paperRef = useRef(null);
  const closeButtonRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const safeQuestions = useMemo(
    () => (Array.isArray(questions) ? questions : []),
    [questions]
  );

  const total = safeQuestions.length;
  const safeTitle = useMemo(() => {
    const title = toText(quiz?.title).trim() || "Quiz";
    return title.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120);
  }, [quiz?.title]);

  const meta = useMemo(() => {
    const parts = [`${total} question${total === 1 ? "" : "s"}`];

    if (quiz?.timeLimit !== null && quiz?.timeLimit !== undefined && quiz.timeLimit !== "") {
      const unit = quiz.timeUnit || "minutes";
      const perQuestion = quiz.timeType === "perQuestion" ? " per question" : "";
      parts.push(`Time: ${quiz.timeLimit} ${unit}${perQuestion}`);
    }

    if (quiz?.difficulty) parts.push(`Difficulty: ${quiz.difficulty}`);
    if (quiz?.subject) parts.push(`Subject: ${quiz.subject}`);

    return parts.join("  ·  ");
  }, [quiz?.difficulty, quiz?.subject, quiz?.timeLimit, quiz?.timeType, quiz?.timeUnit, total]);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "quiz-export-style";
    style.textContent = EXPORT_CSS;
    document.head.appendChild(style);

    const previousTitle = document.title;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousActiveElement = document.activeElement;

    document.title = `${safeTitle} - Questions`;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeRef.current?.();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(dialog.querySelectorAll(focusableSelector)).filter(
        (element) => element.getClientRects().length > 0
      );

      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.title = previousTitle;
      style.remove();
      if (previousActiveElement instanceof HTMLElement) previousActiveElement.focus();
    };
  }, [safeTitle]);

  const handlePrint = useCallback(async () => {
    if (isPreparingPrint) return;

    setIsPreparingPrint(true);
    try {
      await waitForPrintAssets(paperRef.current);
      setIsPreparingPrint(false);
      requestAnimationFrame(() => window.print());
    } catch (error) {
      console.error("Unable to prepare the quiz for printing:", error);
      setIsPreparingPrint(false);
      window.print();
    }
  }, [isPreparingPrint]);

  const modes = [
    { id: "none", label: "Questions only" },
    { id: "inline", label: "Highlight correct answers" },
    { id: "key", label: "Add a separate answer key" },
  ];

  if (typeof document === "undefined" || !document.body) return null;

  return createPortal(
    <div
      id="quiz-export-root"
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-export-title"
      aria-describedby="quiz-export-help"
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex flex-col bg-neutral-200 dark:bg-neutral-900"
    >
      <div className="export-toolbar space-y-3 border-b border-border bg-card p-3 shadow-sm sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="quiz-export-title" className="text-base font-bold text-foreground sm:text-lg">
            Export questions
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPreparingPrint || total === 0}
              className={`inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS_RING}`}
            >
              {isPreparingPrint ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
              {isPreparingPrint ? "Preparing PDF…" : "Print / Save as PDF"}
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className={`inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent ${FOCUS_RING}`}
            >
              <X className="h-4 w-4" /> Close
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-foreground">
          <fieldset className="min-w-0">
            <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Answer format
            </legend>
            <div role="radiogroup" aria-label="Answer format" className="flex flex-wrap gap-x-4 gap-y-2">
              {modes.map((mode) => (
                <label key={mode.id} className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="radio"
                    name="export-mode"
                    value={mode.id}
                    checked={answerMode === mode.id}
                    onChange={() => setAnswerMode(mode.id)}
                    className="h-4 w-4 accent-brand"
                  />
                  {mode.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className={`flex items-center gap-1.5 ${answerMode === "none" ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={showExplanations}
              disabled={answerMode === "none"}
              onChange={(event) => setShowExplanations(event.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Include explanations
          </label>

          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={studentLines}
              onChange={(event) => setStudentLines(event.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Name / class / date / score lines
          </label>
        </div>

        <p id="quiz-export-help" className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Choose <strong>Print / Save as PDF</strong>, then select <strong>Save as PDF</strong> in your print options.
            On iPhone or iPad, use the Share option in the print preview and save the document to Files.
            Images and mathematical notation are prepared before printing.
          </span>
        </p>
      </div>

      <div className="export-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
        <article
          ref={paperRef}
          className="export-paper mx-auto min-h-[297mm] w-full max-w-[210mm] rounded-lg bg-white p-6 text-black shadow-lg sm:p-10"
        >
          <header className="mb-6 border-b-2 border-black pb-4 text-center">
            <h1 className="break-words text-2xl font-bold">{toText(quiz?.title).trim() || "Quiz"}</h1>
            {meta && <p className="export-muted mt-1 text-sm">{meta}</p>}
          </header>

          {studentLines && (
            <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {["Name", "Class", "Date", "Score"].map((label) => (
                <div key={label} className="flex min-w-0 items-end gap-2">
                  <span className="shrink-0 font-semibold">{label}:</span>
                  <span className="min-w-0 flex-1 border-b border-black">&nbsp;</span>
                </div>
              ))}
            </div>
          )}

          {total > 0 ? (
            safeQuestions.map((question, index) => (
              <QuestionBlock
                key={question?._id ?? index}
                question={question}
                number={index + 1}
                highlightAnswer={answerMode === "inline"}
                showExplanation={showExplanations}
              />
            ))
          ) : (
            <p className="export-muted py-12 text-center text-sm">There are no questions to export.</p>
          )}

          {answerMode === "key" && total > 0 && (
            <AnswerKey questions={safeQuestions} showExplanation={showExplanations} />
          )}
        </article>
      </div>
    </div>,
    document.body
  );
}
