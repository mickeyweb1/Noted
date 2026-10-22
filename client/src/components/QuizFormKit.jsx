import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Copy, Pencil, Trash2 } from "lucide-react";
import MathRenderer from "../components/MathRenderer"; // ✅ ADD THIS IMPORT

/* ------------------------------------------------------------------ */
/* Shared styles                                                       */
/* ------------------------------------------------------------------ */
export const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";
export const inputCls = `w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-foreground placeholder:text-muted-foreground transition focus:outline-none focus:ring-2 focus:ring-brand disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;
export const card = "rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6";
export const primaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;
export const secondaryBtn = `inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 font-semibold text-foreground transition hover:bg-accent disabled:opacity-50 ${focusRing}`;
export const iconBtn = `rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground ${focusRing}`;
export const iconBtnDanger = `rounded-lg p-2 text-destructive transition hover:bg-destructive/10 ${focusRing}`;

/* ------------------------------------------------------------------ */
/* Ids and number parsing                                              */
/* ------------------------------------------------------------------ */
let idCounter = 0;
export const newId = () => `c${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export function readInt(raw, label, min, max) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return { error: `${label} is required.` };
  if (n < min || n > max) return { error: `${label} must be between ${min} and ${max}.` };
  return { value: n };
}

/* ------------------------------------------------------------------ */
/* Question helpers                                                    */
/* ------------------------------------------------------------------ */
export function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((q) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length >= 2)
    .map((q) => ({
      ...q,
      cid: newId(),
      question: q.question.trim(),
      options: q.options.map((o) => String(o ?? "").trim()),
      correctAnswer: typeof q.correctAnswer === "string" ? q.correctAnswer.trim() : "",
      explanation: typeof q.explanation === "string" ? q.explanation : "",
    }));
}

export function validateQuestions(list) {
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    const n = i + 1;
    if (!q.question?.trim()) return `Question ${n} is missing its text.`;
    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.some((o) => !o.trim())) {
      return `Question ${n} needs every option filled in.`;
    }
    const unique = new Set(q.options.map((o) => o.trim().toLowerCase()));
    if (unique.size !== q.options.length) return `Question ${n} has two identical options.`;
    if (!q.options.some((o) => o.trim() === (q.correctAnswer || "").trim())) {
      return `Choose the correct answer for question ${n}.`;
    }
  }
  return null;
}

export function toPayloadQuestion(q) {
  const { cid, ...rest } = q;
  return {
    ...rest,
    question: q.question.trim(),
    options: q.options.map((o) => o.trim()),
    correctAnswer: q.correctAnswer.trim(),
    explanation: (q.explanation || "").trim(),
  };
}

/* ------------------------------------------------------------------ */
/* Clipboard                                                           */
/* ------------------------------------------------------------------ */
function fallbackCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function useClipboard() {
  const [copiedKey, setCopiedKey] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async (text, key = "default") => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopy(text);
    }
    if (ok) {
      setCopiedKey(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), 1500);
    }
    return ok;
  }, []);

  return { copy, copiedKey };
}

/* ------------------------------------------------------------------ */
/* Form pieces                                                         */
/* ------------------------------------------------------------------ */
export function Field({ label, htmlFor, hint, className = "", children }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function SelectField({ id, value, onChange, label, children }) {
  return (
    <div className="relative">
      <select id={id} aria-label={label} value={value} onChange={onChange} className={`${inputCls} appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

export function NumberInput({ value, onChange, className = "", ...props }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 5))}
      className={`${inputCls} ${className}`}
      {...props}
    />
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="sticky top-3 z-30 rounded-xl bg-background shadow-md">
      <p className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{children}</span>
      </p>
    </div>
  );
}

export function CodeChip({ code, label, copied, onCopy }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={`Copy code ${code}${label ? ` (${label})` : ""}`}
      className={`flex flex-col items-center gap-0.5 rounded-lg border border-border bg-muted p-2 text-center transition hover:bg-accent ${focusRing}`}
    >
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <span className="font-mono text-sm tracking-wider text-foreground">{code}</span>
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Editable review list for generated questions                        */
/* ------------------------------------------------------------------ */
export function QuestionReviewList({ questions, onChange }) {
  const [editingId, setEditingId] = useState(null);

  const update = (cid, patch) =>
    onChange(
      questions.map((q) =>
        q.cid === cid ? { ...q, ...(typeof patch === "function" ? patch(q) : patch) } : q
      )
    );

  const remove = (cid) => {
    onChange(questions.filter((q) => q.cid !== cid));
    setEditingId((id) => (id === cid ? null : id));
  };

  const setOption = (cid, optIdx, value) =>
    update(cid, (q) => ({
      options: q.options.map((o, i) => (i === optIdx ? value : o)),
      correctAnswer:
        q.correctAnswer !== "" && q.options[optIdx] === q.correctAnswer ? value : q.correctAnswer,
    }));

  return (
    <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
      {questions.map((q, idx) => {
        const editing = editingId === q.cid;
        const correctIdx = q.options.findIndex((o) => o === q.correctAnswer);
        return (
          <div key={q.cid} className="rounded-xl border border-border bg-muted/50 p-4">
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
                {idx + 1}
              </span>
              {editing ? (
                <textarea
                  aria-label={`Question ${idx + 1} text`}
                  value={q.question}
                  rows={2}
                  onChange={(e) => update(q.cid, { question: e.target.value })}
                  className={`${inputCls} min-w-0 flex-1 text-sm`}
                />
              ) : (
                <p className="min-w-0 flex-1 break-words pt-0.5 font-medium text-foreground">
                  <MathRenderer>{q.question}</MathRenderer>
                </p>
              )}
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => setEditingId(editing ? null : q.cid)}
                  aria-label={editing ? `Finish editing question ${idx + 1}` : `Edit question ${idx + 1}`}
                  className={iconBtn}
                >
                  {editing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </button>
                <button onClick={() => remove(q.cid)} aria-label={`Remove question ${idx + 1}`} className={iconBtnDanger}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {editing ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Select the circle next to the correct answer.</p>
                {q.options.map((opt, optIdx) => (
                  <div key={optIdx} className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name={`correct-${q.cid}`}
                      aria-label={`Mark option ${String.fromCharCode(65 + optIdx)} as correct`}
                      checked={correctIdx === optIdx}
                      onChange={() => update(q.cid, { correctAnswer: q.options[optIdx] })}
                      className="h-4 w-4 shrink-0 accent-brand"
                    />
                    <input
                      type="text"
                      aria-label={`Option ${String.fromCharCode(65 + optIdx)}`}
                      value={opt}
                      onChange={(e) => setOption(q.cid, optIdx, e.target.value)}
                      className={`${inputCls} min-w-0 flex-1 py-2 text-sm`}
                    />
                  </div>
                ))}
                <input
                  type="text"
                  aria-label="Explanation"
                  placeholder="Explanation (optional)"
                  value={q.explanation}
                  onChange={(e) => update(q.cid, { explanation: e.target.value })}
                  className={`${inputCls} py-2 text-sm`}
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = optIdx === correctIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                          isCorrect
                            ? "border-green-500/40 bg-green-500/10 font-medium text-green-700 dark:text-green-400"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        <span className="font-bold">{String.fromCharCode(65 + optIdx)}.</span>
                        <span className="min-w-0 flex-1 break-words">
                          <MathRenderer>{opt}</MathRenderer>
                        </span>
                        {isCorrect && <Check className="h-4 w-4 shrink-0" aria-label="Correct answer" />}
                      </div>
                    );
                  })}
                </div>
                {correctIdx === -1 && (
                  <p className="mt-2 text-xs text-destructive">
                    No option matches the correct answer. Edit this question to choose one.
                  </p>
                )}
                {q.explanation && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <MathRenderer>{q.explanation}</MathRenderer>
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}