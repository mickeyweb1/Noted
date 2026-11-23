
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Sparkles, FileText, Plus, Trash2, Loader2, CheckCircle2, ArrowLeft, Zap, Users, Copy,
  ChevronUp, ChevronDown, Clock, Check, X,
} from "lucide-react";
import api from "../utils/api";
import useMyLimits from "../hooks/useMyLimits";
import {
  focusRing, inputCls, card, primaryBtn, iconBtnDanger,
  Field, NumberInput, ErrorNote, newId, readInt,
} from "../components/QuizFormKit";
import MathEditor from "../components/MathEditor";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */
const DRAFT_KEY = "noted_kahoot_draft_v1";
const PREFS_KEY = "noted_kahoot_prefs_v1";
const NOTES_MAX = 20000;
const MAX_AI_QUESTIONS = 150;
const MAX_QUESTIONS = 200;
const TIME_PRESETS = [10, 20, 30, 60];

const KAHOOT_COLORS = [
  { bg: "bg-red-500", shape: "▲", name: "red triangle" },
  { bg: "bg-blue-500", shape: "◆", name: "blue diamond" },
  { bg: "bg-yellow-500", shape: "●", name: "yellow circle" },
  { bg: "bg-green-500", shape: "■", name: "green square" },
];

const TABS = [
  { id: "manual", label: "Questions", Icon: FileText },
  { id: "ai", label: "AI generate", Icon: Sparkles },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or unavailable.
  }
};

const removeKey = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors.
  }
};

const blankQuestion = () => ({
  id: newId(),
  type: "quiz",
  text: "",
  options: ["", "", "", ""],
  correctIndex: null,
});

const isBlank = (q) =>
  !q.text.trim() &&
  q.correctIndex === null &&
  (q.type === "truefalse" || q.options.every((o) => !o.trim()));

const checkQuestion = (q) => {
  if (!q.text.trim()) return "needs question text";

  const filled = q.options.map((o) => o.trim());
  const last = filled.reduce((acc, o, i) => (o ? i : acc), -1);

  if (filled.filter(Boolean).length < 2) {
    return "needs at least 2 answer options";
  }

  if (filled.slice(0, last + 1).some((o) => !o)) {
    return "has an empty option between filled ones (fill options in order)";
  }

  if (q.correctIndex === null) {
    return "needs a correct answer (tap an option)";
  }

  if (!filled[q.correctIndex]) {
    return "has an empty correct answer";
  }

  return "";
};

const restoreQuestions = (saved) => {
  if (!Array.isArray(saved) || saved.length === 0) {
    return [blankQuestion()];
  }

  return saved.slice(0, MAX_QUESTIONS).map((q) => {
    const type = q?.type === "truefalse" ? "truefalse" : "quiz";

    const options =
      type === "truefalse"
        ? ["True", "False"]
        : Array.isArray(q?.options) && q.options.length === 4
          ? q.options.map((o) => String(o ?? ""))
          : ["", "", "", ""];

    const idx =
      Number.isInteger(q?.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex < options.length
        ? q.correctIndex
        : null;

    return {
      id: q?.id || newId(),
      type,
      text: String(q?.text ?? ""),
      options,
      correctIndex: idx,
    };
  });
};

const hasDraftContent = (d) =>
  Boolean(
    d &&
      (
        (d.title || "").trim() ||
        (d.notes || "").trim() ||
        (
          Array.isArray(d.questions) &&
          d.questions.some((q) => (q?.text || "").trim())
        )
      )
  );

/*
 * Removes common AI option prefixes:
 * A) Answer
 * A. Answer
 * A: Answer
 * Option A: Answer
 */
const stripPrefix = (value) =>
  String(value ?? "")
    .replace(/^\s*(?:option\s*)?[a-d]\s*[\).:\-]\s*/i, "")
    .trim();

/*
 * Converts different AI answer formats into a Kahoot question.
 * Supports:
 * - Correct answer as the full option text.
 * - Correct answer as A, B, C, or D.
 * - Correct answer as "Option B".
 * - Correct answer as "B. Answer text".
 */
const mapAiQuestion = (q) => {
  if (
    !q ||
    typeof q.question !== "string" ||
    !q.question.trim() ||
    !Array.isArray(q.options)
  ) {
    return null;
  }

  const originalOptions = q.options
    .map((option) => String(option ?? "").trim())
    .filter(Boolean)
    .slice(0, 4);

  if (originalOptions.length < 2) return null;

  const options = originalOptions.map(stripPrefix);
  const rawAnswer = String(q.correctAnswer ?? "").trim();

  if (!rawAnswer) return null;

  const normalizedAnswer = stripPrefix(rawAnswer).toLowerCase();

  // First, match the answer against the actual option text.
  let correctIndex = options.findIndex(
    (option) => option.toLowerCase() === normalizedAnswer
  );

  // If the AI returned only a letter, use its position.
  if (correctIndex === -1) {
    const letterMatch = rawAnswer.match(
      /^\s*(?:option\s*)?([a-d])\s*[\).:\-]?\s*$/i
    );

    if (letterMatch) {
      const index =
        letterMatch[1].toUpperCase().charCodeAt(0) - 65;

      if (index < originalOptions.length) {
        correctIndex = index;
      }
    }
  }

  // Also support answers such as "B. Paris".
  if (correctIndex === -1) {
    const letterAndTextMatch = rawAnswer.match(
      /^\s*(?:option\s*)?([a-d])\s*[\).:\-]\s*(.+)$/i
    );

    if (letterAndTextMatch) {
      const index =
        letterAndTextMatch[1].toUpperCase().charCodeAt(0) - 65;

      const answerText = stripPrefix(letterAndTextMatch[2]).toLowerCase();

      if (
        index < originalOptions.length &&
        options[index].toLowerCase() === answerText
      ) {
        correctIndex = index;
      }
    }
  }

  // Final fallback: compare against the original option strings.
  if (correctIndex === -1) {
    correctIndex = originalOptions.findIndex(
      (option) => option.toLowerCase() === rawAnswer.toLowerCase()
    );
  }

  const isTrueFalse =
    options.length === 2 &&
    options.every((option) => /^(true|false)$/i.test(option));

  return {
    id: newId(),
    type: isTrueFalse ? "truefalse" : "quiz",
    text: q.question.trim(),
    options: isTrueFalse
      ? options
      : [...options, ...Array(4 - options.length).fill("")],
    correctIndex: correctIndex >= 0 ? correctIndex : null,
  };
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function KahootCreator() {
  const navigate = useNavigate();
  const { limits, refresh: refreshLimits } = useMyLimits();

  const [draft] = useState(() => readJson(DRAFT_KEY));
  const [prefs] = useState(() => readJson(PREFS_KEY));

  const [activeTab, setActiveTab] = useState(
    draft?.activeTab === "ai" ? "ai" : "manual"
  );

  const [title, setTitle] = useState(
    typeof draft?.title === "string" ? draft.title : ""
  );

  const [timeLimit, setTimeLimit] = useState(
    String(draft?.timeLimit ?? prefs?.timeLimit ?? 20)
  );

  const [numStudents, setNumStudents] = useState(
    String(draft?.numStudents ?? prefs?.numStudents ?? 30)
  );

  const [numQuestions, setNumQuestions] = useState(
    String(draft?.numQuestions ?? 10)
  );

  const [notes, setNotes] = useState(
    typeof draft?.notes === "string" ? draft.notes : ""
  );

  const [questions, setQuestions] = useState(() =>
    restoreQuestions(draft?.questions)
  );

  const [draftNotice, setDraftNotice] = useState(() =>
    hasDraftContent(draft)
  );

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSeconds, setAiSeconds] = useState(0);
  const [creating, setCreating] = useState(false);
  const [autoStart, setAutoStart] = useState(Boolean(draft?.autoStart));

  /* ---------------- plan limits ---------------- */

  const maxQ = Math.min(
    limits?.maxQuestionsPerQuiz ?? 50,
    MAX_QUESTIONS
  );

  const maxS = limits?.maxStudents ?? 500;
  const maxAi = Math.min(MAX_AI_QUESTIONS, maxQ);

  const creditsLeft = limits?.credits?.remaining ?? null;
  const aiRequested = Number(numQuestions) || 0;

  const notEnoughCredits =
    creditsLeft !== null && aiRequested > creditsLeft;

  const notesOver = notes.length - NOTES_MAX;
  const liveGamesLocked = limits?.gameShowsPerMonth === 0;

  /* ---------------- autosave ---------------- */

  useEffect(() => {
    const timer = setTimeout(() => {
      const dirty =
        title.trim() ||
        notes.trim() ||
        questions.some((q) => !isBlank(q));

      if (!dirty) {
        removeKey(DRAFT_KEY);
        return;
      }

      writeJson(DRAFT_KEY, {
        title,
        timeLimit,
        numStudents,
        numQuestions,
        notes,
        questions,
        activeTab,
        autoStart,
        savedAt: Date.now(),
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    title,
    timeLimit,
    numStudents,
    numQuestions,
    notes,
    questions,
    activeTab,
    autoStart,
  ]);

  useEffect(() => {
    if (!aiBusy) {
      setAiSeconds(0);
      return undefined;
    }

    const timer = setInterval(() => {
      setAiSeconds((seconds) => seconds + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [aiBusy]);

  useEffect(() => {
    if (!aiBusy && !creating) return undefined;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [aiBusy, creating]);

  /* ---------------- question editing ---------------- */

  const patchQuestion = (id, patch) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  };

  const setOption = (id, index, value) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              options: q.options.map((option, optionIndex) =>
                optionIndex === index ? value : option
              ),
            }
          : q
      )
    );
  };

  const changeType = (id, type) => {
    patchQuestion(
      id,
      type === "truefalse"
        ? {
            type,
            options: ["True", "False"],
            correctIndex: null,
          }
        : {
            type,
            options: ["", "", "", ""],
            correctIndex: null,
          }
    );
  };

  const scrollToQuestion = (id) =>
    requestAnimationFrame(() =>
      document
        .getElementById(`kq-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    );

  const addQuestion = () => {
    if (questions.length >= maxQ) {
      return setError(
        `Your plan allows up to ${maxQ} questions per quiz.`
      );
    }

    const question = blankQuestion();

    setError("");
    setQuestions((prev) => [...prev, question]);
    scrollToQuestion(question.id);
  };

  const duplicateQuestion = (id) => {
    if (questions.length >= maxQ) {
      return setError(
        `Your plan allows up to ${maxQ} questions per quiz.`
      );
    }

    const newQuestionId = newId();

    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === id);

      if (index < 0) return prev;

      return [
        ...prev.slice(0, index + 1),
        {
          ...prev[index],
          id: newQuestionId,
          options: [...prev[index].options],
        },
        ...prev.slice(index + 1),
      ];
    });

    scrollToQuestion(newQuestionId);
  };

  const moveQuestion = (id, direction) =>
    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === id);
      const nextIndex = index + direction;

      if (
        index < 0 ||
        nextIndex < 0 ||
        nextIndex >= prev.length
      ) {
        return prev;
      }

      const next = [...prev];
      [next[index], next[nextIndex]] = [
        next[nextIndex],
        next[index],
      ];

      return next;
    });

  const removeQuestion = (id) => {
    setQuestions((prev) =>
      prev.length <= 1
        ? [blankQuestion()]
        : prev.filter((q) => q.id !== id)
    );
  };

  /* ---------------- AI generation ---------------- */

  const handleAIGenerate = async () => {
    setError("");
    setNotice("");

    if (liveGamesLocked) {
      return setError(
        "Live Quiz Shows are not included in your current plan. Please upgrade."
      );
    }

    const count = readInt(
      numQuestions,
      "Number of questions",
      1,
      maxAi
    );

    if (count.error) return setError(count.error);

    if (!notes.trim()) {
      return setError("Paste some notes for the AI first.");
    }

    if (notesOver > 0) {
      return setError(
        `Your notes are too long. Keep them under ${NOTES_MAX.toLocaleString()} characters.`
      );
    }

    if (
      creditsLeft !== null &&
      count.value > creditsLeft
    ) {
      return setError(
        `You only have ${creditsLeft} AI credit${creditsLeft === 1 ? "" : "s"} left this month. Ask for fewer questions or upgrade your plan.`
      );
    }

    const existingCount = questions.filter(
      (q) => !isBlank(q)
    ).length;

    const room = maxQ - existingCount;

    if (count.value > room) {
      return setError(
        `Your plan allows ${maxQ} questions per quiz and you already have ${existingCount}. Ask for ${Math.max(room, 0)} or fewer.`
      );
    }

    setAiBusy(true);

    try {
      const res = await api.post(
        "/quiz/generate-ai-preview",
        {
          notes,
          difficulty: "Intermediate",
          numQuestions: count.value,
          gameMode: "kahoot",
        },
        { timeout: 180000 }
      );

      const rawQuestions = res.data?.data?.questions;

      if (!Array.isArray(rawQuestions)) {
        throw new Error(
          "The AI response did not contain a valid question list."
        );
      }

      const mapped = rawQuestions
        .map(mapAiQuestion)
        .filter(Boolean);

      if (mapped.length === 0) {
        return setError(
          "The AI couldn't make usable questions from those notes. Try adding more detail or generating fewer questions."
        );
      }

      setQuestions((prev) =>
        [
          ...prev.filter((q) => !isBlank(q)),
          ...mapped,
        ].slice(0, maxQ)
      );

      setActiveTab("manual");

      setNotice(
        `Added ${mapped.length} AI question${mapped.length === 1 ? "" : "s"}. Review each question and confirm its correct answer before creating the game.`
      );
    } catch (err) {
      console.error("Kahoot AI generation failed:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "AI generation failed. Please try again."
      );
    } finally {
      setAiBusy(false);
      refreshLimits();
    }
  };

  /* ---------------- create Kahoot ---------------- */

  const handleCreate = async () => {
    setError("");
    setNotice("");

    if (liveGamesLocked) {
      return setError(
        "Live Quiz Shows are not included in your current plan. Please upgrade."
      );
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      return setError("Give your Kahoot a title.");
    }

    const time = readInt(
      timeLimit,
      "Time per question",
      5,
      120
    );

    const students = readInt(
      numStudents,
      "Number of students",
      1,
      maxS
    );

    const bad = [time, students].find((result) => result.error);

    if (bad) return setError(bad.error);

    const used = questions
      .map((q, index) => ({ q, index }))
      .filter(({ q }) => !isBlank(q));

    if (used.length === 0) {
      return setError("Add at least one question.");
    }

    if (used.length > maxQ) {
      return setError(
        `Your plan allows up to ${maxQ} questions per quiz.`
      );
    }

    for (const { q, index } of used) {
      const problem = checkQuestion(q);

      if (problem) {
        scrollToQuestion(q.id);
        return setError(
          `Question ${index + 1} ${problem}.`
        );
      }
    }

    setCreating(true);

    try {
      const payload = used.map(({ q }) => {
        const options = q.options
          .map((option) => option.trim())
          .filter(Boolean);

        return {
          question: q.text.trim(),
          options,
          correctAnswer: q.options[q.correctIndex].trim(),
          explanation: "",
          topic: "",
          imageUrl: "",
        };
      });

      const res = await api.post("/quiz/create-manual", {
        title: cleanTitle,
        difficulty: "Intermediate",
        numStudents: students.value,
        timeLimit: time.value,
        timeUnit: "seconds",
        timeType: "perQuestion",
        gameMode: "kahoot",
        layoutMode: "kahoot",
        showAnswersAfterSubmission: true,
        passMark: 50,
        autoStart,
        questions: payload,
      });

      const id = res.data?.data?._id;

      if (!id) {
        throw new Error("The server did not return a quiz ID.");
      }

      writeJson(PREFS_KEY, {
        timeLimit: time.value,
        numStudents: students.value,
      });

      removeKey(DRAFT_KEY);

      navigate(`/game-host/${id}`);
    } catch (err) {
      console.error("Kahoot creation failed:", err);

      setError(
        err.response?.data?.message ||
          err.message ||
          "Couldn't create the Kahoot. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  /* ---------------- reset draft ---------------- */

  const startFresh = () => {
    removeKey(DRAFT_KEY);

    setTitle("");
    setTimeLimit(String(prefs?.timeLimit ?? 20));
    setNumStudents(String(prefs?.numStudents ?? 30));
    setNumQuestions("10");
    setNotes("");
    setQuestions([blankQuestion()]);
    setAutoStart(false);
    setActiveTab("manual");

    setDraftNotice(false);
    setError("");
    setNotice("");
  };

  const readyCount = useMemo(
    () =>
      questions.filter(
        (q) => !isBlank(q) && !checkQuestion(q)
      ).length,
    [questions]
  );

  const usedCount = useMemo(
    () => questions.filter((q) => !isBlank(q)).length,
    [questions]
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="min-h-dvh bg-background p-4 pb-28 md:p-8 md:pb-28">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/dashboard")}
            aria-label="Back to dashboard"
            className={`shrink-0 rounded-xl border border-border bg-card p-2.5 text-foreground transition hover:bg-accent ${focusRing}`}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-2xl font-black text-foreground sm:text-3xl">
              <Zap className="h-7 w-7 shrink-0 fill-yellow-500 text-yellow-500" />
              Kahoot creator
            </h1>

            <p className="text-sm text-muted-foreground">
              Build a self-paced classroom quiz with one personal code per student.
            </p>
          </div>
        </div>

        <ErrorNote>{error}</ErrorNote>

        {notice && (
          <p
            role="status"
            className="flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
          >
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {notice}
          </p>
        )}

        {liveGamesLocked && (
          <p className="rounded-xl border border-brand/20 bg-brand-soft px-3 py-2 text-sm text-foreground">
            Live games are part of Teacher Pro and the School plans.{" "}
            <Link
              to="/pricing"
              className="font-semibold text-brand underline-offset-4 hover:underline"
            >
              See plans
            </Link>
          </p>
        )}

        {draftNotice && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand-soft p-3 text-sm text-foreground"
          >
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-brand" />
              We restored your unsaved draft.
            </span>

            <span className="flex gap-2">
              <button
                onClick={startFresh}
                className={`rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold transition hover:bg-accent ${focusRing}`}
              >
                Start fresh
              </button>

              <button
                onClick={() => setDraftNotice(false)}
                aria-label="Dismiss"
                className={`rounded-lg p-1.5 text-muted-foreground transition hover:text-foreground ${focusRing}`}
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          </div>
        )}

        {/* Game settings */}
        <div className={`${card} space-y-5`}>
          <h2 className="text-lg font-semibold text-foreground">
            Game settings
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field
              label="Kahoot title"
              htmlFor="k-title"
              className="md:col-span-2"
            >
              <input
                id="k-title"
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => {
                  setError("");
                  setTitle(e.target.value);
                }}
                placeholder="e.g., Math Battle!"
                className={`${inputCls} text-lg font-bold`}
              />
            </Field>

            <Field
              label="Time per question (seconds)"
              htmlFor="k-time"
              hint="5 to 120 seconds."
            >
              <div className="space-y-2">
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <NumberInput
                    id="k-time"
                    aria-describedby="k-time-hint"
                    value={timeLimit}
                    onChange={setTimeLimit}
                    className="pl-10"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {TIME_PRESETS.map((seconds) => (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => setTimeLimit(String(seconds))}
                      aria-pressed={timeLimit === String(seconds)}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${focusRing} ${
                        timeLimit === String(seconds)
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            <Field
              label="Number of students"
              htmlFor="k-students"
              hint={`1 to ${maxS} on your plan.`}
            >
              <div className="relative">
                <Users className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <NumberInput
                  id="k-students"
                  aria-describedby="k-students-hint"
                  value={numStudents}
                  onChange={setNumStudents}
                  className="pl-10"
                />
              </div>
            </Field>

            {/* Auto-start setting */}
            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 transition-colors hover:bg-accent/40">
                <input
                  type="checkbox"
                  checked={autoStart}
                  onChange={(e) => setAutoStart(e.target.checked)}
                  className="mt-1 h-4 w-4 shrink-0 accent-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                />

                <span>
                  <span className="block text-sm font-semibold text-foreground">
                    Make the quiz available immediately
                  </span>

                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    Enabled: each student can start immediately with their personal code. Disabled: students wait until you open the quiz from the teacher dashboard.
                  </span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="How to add questions"
          className="flex w-full gap-1 rounded-xl border border-border bg-card p-1 sm:w-fit"
        >
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              id={`ktab-${id}`}
              aria-selected={activeTab === id}
              aria-controls={`kpanel-${id}`}
              onClick={() => {
                setActiveTab(id);
                setError("");
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition sm:flex-none ${focusRing} ${
                activeTab === id
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}

              {id === "manual" && (
                <span className="rounded-full bg-background/20 px-1.5 text-xs tabular-nums">
                  {usedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* AI generator */}
        {activeTab === "ai" && (
          <div
            role="tabpanel"
            id="kpanel-ai"
            aria-labelledby="ktab-ai"
            className={`${card} space-y-4`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <Sparkles className="h-5 w-5 text-brand" />
                AI question generator
              </h2>

              {limits?.credits?.total != null && (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    creditsLeft <= 0
                      ? "bg-destructive/10 text-destructive"
                      : "bg-brand-soft text-brand"
                  }`}
                >
                  {creditsLeft} / {limits.credits.total} AI credits left
                </span>
              )}
            </div>

            <Field
              label="How many questions?"
              htmlFor="k-count"
              hint={`1 to ${maxAi} on your plan.`}
            >
              <NumberInput
                id="k-count"
                aria-describedby="k-count-hint"
                value={numQuestions}
                onChange={setNumQuestions}
                className="sm:max-w-[10rem]"
              />
            </Field>

            <textarea
              value={notes}
              onChange={(e) => {
                setError("");
                setNotes(e.target.value);
              }}
              rows={8}
              aria-label="Notes"
              placeholder="Paste your notes, textbook text, or topics here. The questions are added to your list so you can review them."
              className={`${inputCls} p-4`}
            />

            <p
              className={`text-right text-xs ${
                notesOver > 0
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {notes.length.toLocaleString()} / {NOTES_MAX.toLocaleString()} characters

              {notesOver > 0 && (
                <> · trim {notesOver.toLocaleString()} to continue</>
              )}
            </p>

            {creditsLeft !== null && aiRequested > 0 && (
              <p
                className={`text-sm ${
                  notEnoughCredits
                    ? "font-medium text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {notEnoughCredits
                  ? `This needs ${aiRequested} credits but you have ${creditsLeft}.`
                  : `This will use up to ${aiRequested} AI credit${aiRequested === 1 ? "" : "s"} (only questions returned are charged).`}
              </p>
            )}

            {aiBusy && (
              <p
                role="status"
                className="text-center text-sm text-muted-foreground"
              >
                {aiRequested > 25
                  ? "Generating in batches. This can take 1–2 minutes. Keep this page open."
                  : "Generating your questions…"}{" "}
                ({aiSeconds}s)
              </p>
            )}

            <button
              onClick={handleAIGenerate}
              disabled={
                aiBusy ||
                !notes.trim() ||
                notesOver > 0 ||
                notEnoughCredits ||
                maxAi < 1
              }
              className={`${primaryBtn} w-full`}
            >
              {aiBusy ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}

              {aiBusy
                ? "Generating…"
                : `Generate ${aiRequested || ""} question${aiRequested === 1 ? "" : "s"} with AI`}
            </button>
          </div>
        )}

        {/* Questions */}
        {activeTab === "manual" && (
          <div
            role="tabpanel"
            id="kpanel-manual"
            aria-labelledby="ktab-manual"
            className="space-y-5"
          >
            {questions.map((q, qIdx) => {
              const problem = !isBlank(q)
                ? checkQuestion(q)
                : "needs question text";

              const ready = !problem;

              return (
                <div
                  key={q.id}
                  id={`kq-${q.id}`}
                  className="scroll-mt-24 space-y-4 rounded-2xl border-2 border-border bg-card p-4 shadow-sm transition hover:border-brand/30 sm:p-6"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="flex items-center gap-3 font-bold text-foreground">
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${
                          ready
                            ? "bg-green-500/15 text-green-700 dark:text-green-400"
                            : "bg-brand-soft text-brand"
                        }`}
                      >
                        {ready ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          qIdx + 1
                        )}
                      </span>

                      Question {qIdx + 1}
                    </h3>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => moveQuestion(q.id, -1)}
                        disabled={qIdx === 0}
                        aria-label={`Move question ${qIdx + 1} up`}
                        className={`rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-30 ${focusRing}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => moveQuestion(q.id, 1)}
                        disabled={qIdx === questions.length - 1}
                        aria-label={`Move question ${qIdx + 1} down`}
                        className={`rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-30 ${focusRing}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => duplicateQuestion(q.id)}
                        aria-label={`Duplicate question ${qIdx + 1}`}
                        className={`rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground ${focusRing}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => removeQuestion(q.id)}
                        aria-label={`Delete question ${qIdx + 1}`}
                        className={iconBtnDanger}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div
                    role="group"
                    aria-label="Question type"
                    className="inline-flex rounded-lg border border-border bg-background p-0.5 text-sm font-semibold"
                  >
                    {[
                      { id: "quiz", label: "4 options" },
                      { id: "truefalse", label: "True / False" },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        aria-pressed={q.type === type.id}
                        onClick={() =>
                          q.type !== type.id &&
                          changeType(q.id, type.id)
                        }
                        className={`rounded-md px-3 py-1.5 transition ${focusRing} ${
                          q.type === type.id
                            ? "bg-brand text-brand-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  <MathEditor
                    value={q.text}
                    onChange={(value) => {
                      setError("");
                      patchQuestion(q.id, { text: value });
                    }}
                    placeholder="Type your question here (use the toolbar or $...$ for math)"
                  />

                  <div
                    role="radiogroup"
                    aria-label={`Answer options for question ${qIdx + 1}. Choose the correct one.`}
                    className={`grid gap-3 ${
                      q.type === "truefalse"
                        ? "grid-cols-2"
                        : "grid-cols-1 md:grid-cols-2"
                    }`}
                  >
                    {q.options.map((option, optionIndex) => {
                      const correct =
                        q.correctIndex === optionIndex;

                      return (
                        <div
                          key={optionIndex}
                          role="radio"
                          aria-checked={correct}
                          tabIndex={0}
                          onClick={() =>
                            patchQuestion(q.id, {
                              correctIndex: optionIndex,
                            })
                          }
                          onKeyDown={(e) => {
                            if (
                              e.key === " " ||
                              e.key === "Enter"
                            ) {
                              e.preventDefault();

                              patchQuestion(q.id, {
                                correctIndex: optionIndex,
                              });
                            }
                          }}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all ${focusRing} ${
                            correct
                              ? "border-green-500 bg-green-500/10 shadow-md ring-2 ring-green-500/40"
                              : "border-transparent bg-muted/50 hover:bg-muted"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-xl font-bold text-white ${KAHOOT_COLORS[optionIndex].bg}`}
                          >
                            {KAHOOT_COLORS[optionIndex].shape}
                          </span>

                          <input
                            type="text"
                            value={option}
                            aria-label={`Option ${optionIndex + 1} (${KAHOOT_COLORS[optionIndex].name})`}
                            onChange={(e) => {
                              setError("");
                              setOption(
                                q.id,
                                optionIndex,
                                e.target.value
                              );
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            placeholder={`Option ${optionIndex + 1}`}
                            readOnly={q.type === "truefalse"}
                            className="min-w-0 flex-1 bg-transparent text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />

                          {correct && (
                            <CheckCircle2
                              className="h-6 w-6 shrink-0 text-green-500"
                              aria-label="Correct answer"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Tap an option to mark it as the correct answer.
                  </p>
                </div>
              );
            })}

            <button
              onClick={addQuestion}
              disabled={questions.length >= maxQ}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 font-bold text-muted-foreground transition hover:border-brand hover:text-brand disabled:opacity-50 ${focusRing}`}
            >
              <Plus className="h-5 w-5" />
              Add question{" "}

              {maxQ < MAX_QUESTIONS && (
                <span className="text-xs font-normal">
                  ({questions.length}/{maxQ})
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <p className="hidden min-w-0 flex-1 text-sm text-muted-foreground sm:block">
            <span className="font-semibold text-foreground">
              {readyCount}
            </span>{" "}
            of {usedCount} question{usedCount === 1 ? "" : "s"} ready · saved on this device
          </p>

          <button
            onClick={handleCreate}
            disabled={creating || aiBusy || liveGamesLocked}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3.5 text-base font-black text-white shadow-lg transition hover:bg-green-500 active:scale-[0.99] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none sm:text-lg"
          >
            {creating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Zap className="h-5 w-5 fill-current" />
            )}

            {creating ? "Creating…" : "Create Kahoot"}
          </button>
        </div>
      </div>
    </div>
  );
}
