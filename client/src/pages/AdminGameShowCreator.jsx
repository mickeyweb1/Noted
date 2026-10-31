import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Plus, Sparkles, Loader2, CheckCircle2, Copy, Check, Users, Clock,
  AlertTriangle, ArrowLeft, Trophy, Play, RefreshCw,
} from "lucide-react";
import api from "../utils/api";
import useMyLimits from "../hooks/useMyLimits";
import {
  focusRing, inputCls, card, primaryBtn, secondaryBtn,
  Field, SelectField, NumberInput, ErrorNote, CodeChip, QuestionReviewList,
  useClipboard, readInt, normalizeQuestions, validateQuestions, toPayloadQuestion,
} from "../components/QuizFormKit";

/* ------------------------------------------------------------------ */
/* Hard caps. The user's PLAN limits (from /quiz/my-limits) can only   */
/* make these smaller. Keep in sync with the backend validation.       */
/* ------------------------------------------------------------------ */
const MAX_QUESTIONS = 50;
const NOTES_MAX = 20000;

// Same colours as the live board, so a team looks the same everywhere.
const TEAM_STYLES = [
  { name: "Team 1", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400", soft: "bg-rose-500/10", border: "border-rose-500/30" },
  { name: "Team 2", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400", soft: "bg-sky-500/10", border: "border-sky-500/30" },
];
const codeLabel = (i) => (i < 2 ? TEAM_STYLES[i].name : "Replacement");

// Numbers are kept as strings while typing and converted when submitting.
const INITIAL = {
  title: "",
  difficulty: "Intermediate",
  numQuestions: "10",
  timeLimit: "30",
  baseMarks: "10",
  bonusMarks: "5",
};

export default function AdminGameShowCreator() {
  const navigate = useNavigate();
  const { copy, copiedKey } = useClipboard();
  const { limits, refresh: refreshLimits } = useMyLimits();

  const [errorMessage, setErrorMessage] = useState("");
  const [metadata, setMetadata] = useState(INITIAL);
  const [notes, setNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingCode, setIsAddingCode] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [accessCodes, setAccessCodes] = useState([]);
  const [previewQuestions, setPreviewQuestions] = useState([]);
  const [requestedCount, setRequestedCount] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);

  /* ---------------- plan limits ---------------- */
  const maxQ = Math.min(MAX_QUESTIONS, limits?.maxQuestionsPerQuiz ?? MAX_QUESTIONS);
  const creditsLeft = limits?.credits?.remaining ?? null; // null = unlimited / not loaded
  const outOfCredits = creditsLeft !== null && creditsLeft <= 0;
  const planLocked = Boolean(limits?.locked);

  // Game Show access: 0 = not on this plan, null = unlimited, number = per-month cap.
  const perMonth = limits?.gameShowsPerMonth; // undefined until loaded
  const notOnPlan = limits != null && perMonth === 0;
  const gameShowsLeft =
    limits == null || perMonth === null ? null : Math.max(perMonth - (limits.gameShowsUsed ?? 0), 0);
  const quotaReached = limits != null && perMonth > 0 && gameShowsLeft <= 0;
  const blocked = planLocked || notOnPlan || quotaReached;

  // Keep the default question count inside what the plan allows.
  useEffect(() => {
    if (!limits) return;
    setMetadata((prev) => ({
      ...prev,
      numQuestions: String(Math.min(Number(prev.numQuestions) || 1, maxQ)),
    }));
  }, [limits, maxQ]);

  const setField = (field) => (value) => {
    setErrorMessage("");
    setMetadata((prev) => ({ ...prev, [field]: value }));
  };

  // Warn before leaving with reviewed-but-not-created questions.
  useEffect(() => {
    if (!isReviewing || generatedQuiz) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isReviewing, generatedQuiz]);

  const handleCopy = async (text, key) => {
    const ok = await copy(text, key);
    if (!ok) setErrorMessage("Couldn't copy. Select the text and copy it manually.");
  };

  /* ---------------- validation ---------------- */
  const readSettings = (needQuestionCount) => {
    const title = metadata.title.trim();
    if (!title) return { error: "Enter a game show title." };
    const numQuestions = needQuestionCount
      ? readInt(metadata.numQuestions, "Number of questions", 1, maxQ)
      : { value: 0 };
    const timeLimit = readInt(metadata.timeLimit, "Time per question", 5, 600);
    const baseMarks = readInt(metadata.baseMarks, "Base marks", 1, 1000);
    const bonusMarks = readInt(metadata.bonusMarks, "Steal bonus", 1, 1000);
    const bad = [numQuestions, timeLimit, baseMarks, bonusMarks].find((r) => r.error);
    if (bad) return { error: bad.error };
    return {
      value: {
        title,
        difficulty: metadata.difficulty,
        numQuestions: numQuestions.value,
        timeLimit: timeLimit.value,
        baseMarks: baseMarks.value,
        bonusMarks: bonusMarks.value,
      },
    };
  };

  /* ---------------- actions ---------------- */
  const handleAIGenerate = async () => {
    if (blocked) {
      return setErrorMessage(
        planLocked
          ? limits.locked
          : notOnPlan
            ? "Game Show mode needs Teacher Pro or a School plan."
            : "You've used all your Game Shows for this month."
      );
    }
    const s = readSettings(true);
    if (s.error) return setErrorMessage(s.error);
    if (!notes.trim()) return setErrorMessage("Enter the topic or notes for the AI to write questions from.");
    if (notes.length > NOTES_MAX) {
      return setErrorMessage(`Your notes are too long. Keep them under ${NOTES_MAX.toLocaleString()} characters.`);
    }
    // Friendly early check; the server is still the real gate.
    if (creditsLeft !== null && s.value.numQuestions > creditsLeft) {
      return setErrorMessage(
        `You only have ${creditsLeft} AI credit${creditsLeft === 1 ? "" : "s"} left this month. Ask for fewer questions or upgrade your plan.`
      );
    }

    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/generate-ai-preview", {
        notes,
        difficulty: s.value.difficulty,
        numQuestions: s.value.numQuestions,
        gameMode: "gameShow", // lets the server block plans without Game Shows before spending credits
      });
      const questions = normalizeQuestions(res.data?.data?.questions);
      if (questions.length === 0) {
        return setErrorMessage("The AI didn't return usable questions. Add more detail to your notes and try again.");
      }
      setPreviewQuestions(questions);
      setRequestedCount(s.value.numQuestions);
      setIsReviewing(true);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Couldn't generate questions. Try again.");
    } finally {
      setIsGenerating(false);
      refreshLimits(); // credits changed (spent, or refunded after a failure)
    }
  };

  const handleFinalizeQuiz = async () => {
    if (blocked) return setErrorMessage(planLocked ? limits.locked : "Your plan can't create another Game Show right now.");
    const s = readSettings(false);
    if (s.error) return setErrorMessage(s.error);
    if (previewQuestions.length === 0) return setErrorMessage("There are no questions to create the game with.");
    const questionError = validateQuestions(previewQuestions);
    if (questionError) return setErrorMessage(questionError);

    setIsGenerating(true);
    setErrorMessage("");
    try {
      const res = await api.post("/quiz/create-manual", {
        title: s.value.title,
        difficulty: s.value.difficulty,
        numStudents: 2, // 1v1 battle
        timeLimit: s.value.timeLimit,
        timeUnit: "seconds",
        timeType: "perQuestion",
        baseMarks: s.value.baseMarks,
        bonusMarks: s.value.bonusMarks,
        gameMode: "gameShow",
        numQuestions: previewQuestions.length,
        questions: previewQuestions.map(toPayloadQuestion),
      });
      const codes = res.data?.accessCodes ?? [];
      setGeneratedQuiz(res.data.data);
      setAccessCodes(codes);
      setIsReviewing(false);
      refreshLimits(); // Game Shows used this month changed
      if (codes.length < 2) {
        setErrorMessage("The game was created, but fewer than 2 team codes came back. Check the server before starting.");
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Couldn't create the game show. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const codeLimitReached = limits != null && accessCodes.length >= limits.maxStudents;

  const handleAddReplacementCode = async () => {
    const quizId = generatedQuiz?._id ?? generatedQuiz?.quizId;
    if (!quizId || isAddingCode) return;
    setIsAddingCode(true);
    setErrorMessage("");
    try {
      const res = await api.post(`/quiz/${quizId}/regenerate-code`);
      setAccessCodes((prev) => [...prev, res.data.newCode]);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || "Couldn't generate a new code. Try again.");
    } finally {
      setIsAddingCode(false);
    }
  };

  const resetAll = () => {
    setGeneratedQuiz(null);
    setAccessCodes([]);
    setPreviewQuestions([]);
    setRequestedCount(null);
    setNotes("");
    setIsReviewing(false);
    setErrorMessage("");
    refreshLimits();
  };

  const locked = !!generatedQuiz || isGenerating;
  const allCodesText = accessCodes.map((c, i) => `${codeLabel(i)}: ${c}`).join("\n");

  return (
    <div className="min-h-dvh bg-background p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
              <Trophy className="h-8 w-8 text-brand" /> Game show creator
            </h1>
            <p className="mt-1 text-muted-foreground">Create a live classroom quiz with steal rounds.</p>
          </div>
          <button
            onClick={() => navigate("/admin/quizzes")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-foreground ${focusRing}`}
          >
            <ArrowLeft className="h-4 w-4" /> Back to formal quizzes
          </button>
        </div>

        <ErrorNote>{errorMessage}</ErrorNote>
        {planLocked && <ErrorNote>{limits.locked}</ErrorNote>}
        {notOnPlan && !planLocked && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-brand-soft p-4">
            <p className="text-sm font-medium text-foreground">
              Game Show mode is available on Teacher Pro and School plans.
            </p>
            <button onClick={() => navigate("/pricing")} className={`${primaryBtn} py-2 text-sm`}>
              See plans
            </button>
          </div>
        )}
        {quotaReached && !planLocked && (
          <ErrorNote>{`You've used all ${perMonth} Game Shows for this month. Upgrade for more.`}</ErrorNote>
        )}

        {/* Plan usage */}
        {limits && !notOnPlan && (
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            {perMonth !== null && (
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand">
                {limits.gameShowsUsed} / {perMonth} Game Shows this month
              </span>
            )}
            {limits.credits?.total != null && (
              <span
                className={`rounded-full px-2.5 py-1 ${
                  outOfCredits ? "bg-destructive/10 text-destructive" : "bg-brand-soft text-brand"
                }`}
              >
                {creditsLeft} / {limits.credits.total} AI credits left
              </span>
            )}
          </div>
        )}

        {/* Settings */}
        <div className={`${card} space-y-5`}>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Sparkles className="h-5 w-5 text-brand" /> Game settings
            </h2>
            <p className="text-sm text-muted-foreground">
              {generatedQuiz ? "These settings are locked because the game is already created." : "Set the rules for your live game."}
            </p>
          </div>

          <fieldset disabled={locked} className="m-0 min-w-0 border-0 p-0">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Game show title" htmlFor="quiz-title" className="md:col-span-2">
                <input
                  id="quiz-title"
                  type="text"
                  maxLength={120}
                  placeholder="e.g., Photosynthesis live battle"
                  value={metadata.title}
                  onChange={(e) => setField("title")(e.target.value)}
                  className={inputCls}
                />
              </Field>

              <Field label="Difficulty" htmlFor="quiz-difficulty">
                <SelectField id="quiz-difficulty" value={metadata.difficulty} onChange={(e) => setField("difficulty")(e.target.value)}>
                  <option>Basic</option><option>Intermediate</option><option>Hard</option><option>Max</option>
                </SelectField>
              </Field>

              <Field label="Number of questions" htmlFor="quiz-questions" hint={`1 to ${maxQ} on your plan. Each question becomes one card.`}>
                <NumberInput id="quiz-questions" aria-describedby="quiz-questions-hint" value={metadata.numQuestions} onChange={setField("numQuestions")} placeholder="e.g., 10" />
              </Field>

              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">Teams</p>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted px-3.5 py-2.5 text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>2 teams, head to head</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Game show mode is built for a 1v1 battle.</p>
              </div>

              <Field label="Time per question (seconds)" htmlFor="quiz-time" hint="The student who steals gets half this time.">
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <NumberInput id="quiz-time" aria-describedby="quiz-time-hint" value={metadata.timeLimit} onChange={setField("timeLimit")} className="pl-10" />
                </div>
              </Field>

              <Field label="Base marks (correct answer)" htmlFor="base-marks">
                <NumberInput id="base-marks" value={metadata.baseMarks} onChange={setField("baseMarks")} />
              </Field>

              <Field label="Bonus marks (steal)" htmlFor="bonus-marks" hint="Points for the other student if they steal after a wrong answer.">
                <NumberInput id="bonus-marks" aria-describedby="bonus-marks-hint" value={metadata.bonusMarks} onChange={setField("bonusMarks")} />
              </Field>
            </div>
          </fieldset>
        </div>

        {/* Review */}
        {isReviewing && !generatedQuiz && (
          <div className="space-y-4 rounded-2xl border border-brand/30 bg-card p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-brand" /> Review generated questions
              </h2>
              <span className="shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
                {previewQuestions.length} questions
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Check every answer before you create the game. Use the pencil to fix a question or its correct answer.
              {requestedCount !== null && previewQuestions.length !== requestedCount && (
                <> You asked for {requestedCount}.</>
              )}
            </p>

            <QuestionReviewList questions={previewQuestions} onChange={setPreviewQuestions} />

            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <button onClick={() => { setIsReviewing(false); setErrorMessage(""); }} disabled={isGenerating} className={`${secondaryBtn} flex-1`}>
                Back to notes
              </button>
              <button onClick={handleFinalizeQuiz} disabled={isGenerating || blocked || previewQuestions.length === 0} className={`${primaryBtn} flex-1`}>
                {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                Create game and get codes
              </button>
            </div>
          </div>
        )}

        {/* Generator */}
        {!isReviewing && !generatedQuiz && (
          <div className={`${card} space-y-4`}>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Brain className="h-5 w-5 text-brand" /> AI question generator
            </h2>
            <div className="relative">
              <textarea
                value={notes}
                onChange={(e) => { setErrorMessage(""); setNotes(e.target.value); }}
                rows={8}
                aria-label="Notes"
                placeholder="Paste the topic, textbook text or lecture summary here for the AI to write questions from…"
                className={`${inputCls} p-4 pr-16`}
              />
              {notes && (
                <button
                  onClick={() => setNotes("")}
                  className={`absolute right-3 top-3 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:text-destructive ${focusRing}`}
                >
                  Clear
                </button>
              )}
            </div>
            <p className={`text-right text-xs ${notes.length > NOTES_MAX ? "text-destructive" : "text-muted-foreground"}`}>
              {notes.length.toLocaleString()} / {NOTES_MAX.toLocaleString()} characters
            </p>
            <button
              onClick={handleAIGenerate}
              disabled={isGenerating || blocked || outOfCredits || !notes.trim() || notes.length > NOTES_MAX}
              className={`${primaryBtn} w-full`}
            >
              {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {isGenerating ? "Generating…" : outOfCredits ? "Out of AI credits" : "Generate questions for review"}
            </button>
          </div>
        )}

        {/* Created */}
        {generatedQuiz && (
          <div className="space-y-6 rounded-2xl border border-green-500/30 bg-green-500/5 p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" /> Game show created
              </h2>
              <button onClick={resetAll} className={`${secondaryBtn} py-2 text-sm`}>
                <Plus className="h-4 w-4" /> Create another
              </button>
            </div>

            <div className="rounded-xl border border-border bg-background p-4">
              <h3 className="mb-3 font-semibold text-foreground">{generatedQuiz.title}</h3>
              <div className="flex flex-wrap gap-2 text-xs font-medium">
                <span className="rounded-full bg-muted px-2.5 py-1 text-foreground">{generatedQuiz.questions?.length ?? previewQuestions.length} questions</span>
                <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand">{metadata.difficulty}</span>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-purple-700 dark:text-purple-400">
                  Base {metadata.baseMarks} pts, steal {metadata.bonusMarks} pts
                </span>
              </div>
            </div>

            <div>
              <button
                onClick={() => navigate(`/game-show?code=${encodeURIComponent(accessCodes[0])}`)}
                disabled={!accessCodes[0]}
                className={`${primaryBtn} w-full py-4 text-lg`}
              >
                <Play className="h-5 w-5" /> Open the live match dashboard
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Students join with their team's code. You run the match from the dashboard.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                  <Users className="h-4 w-4" /> Access codes ({accessCodes.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddReplacementCode}
                    disabled={isAddingCode || codeLimitReached}
                    title={codeLimitReached ? "Your plan's code limit for this game is reached" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent disabled:opacity-60 ${focusRing}`}
                  >
                    {isAddingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Add replacement code
                  </button>
                  <button
                    onClick={() => handleCopy(allCodesText, "all")}
                    className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-brand transition hover:bg-accent ${focusRing}`}
                  >
                    {copiedKey === "all" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === "all" ? "Copied" : "Copy all"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {accessCodes.slice(0, 2).map((code, i) => {
                  const t = TEAM_STYLES[i];
                  return (
                    <div key={code} className={`rounded-2xl border-2 p-4 ${t.border} ${t.soft}`}>
                      <p className={`mb-2 flex items-center gap-2 font-semibold ${t.text}`}>
                        <span className={`h-3 w-3 rounded-full ${t.dot}`} aria-hidden="true" />
                        {t.name} access code
                      </p>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3">
                        <span className="break-all font-mono text-xl font-bold tracking-wider text-foreground">{code}</span>
                        <button
                          onClick={() => handleCopy(code, `team-${i}`)}
                          aria-label={`Copy ${t.name} code`}
                          className={`shrink-0 rounded-lg border border-border p-2.5 transition hover:bg-accent ${focusRing}`}
                        >
                          {copiedKey === `team-${i}` ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {accessCodes.length > 2 && (
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background p-2 sm:grid-cols-4 md:grid-cols-5">
                  {accessCodes.slice(2).map((code, i) => (
                    <CodeChip
                      key={code}
                      code={code}
                      label={codeLabel(i + 2)}
                      copied={copiedKey === `extra-${i}`}
                      onCopy={() => handleCopy(code, `extra-${i}`)}
                    />
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Give each student the code for their team. Each code can only be used once, so use a replacement code if a student disconnects.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
