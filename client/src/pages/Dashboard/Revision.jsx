import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, CircleCheck, Clock3, Flame, Loader2, RotateCcw, X } from 'lucide-react';
import api from '../../utils/api';

const card = 'rounded-2xl border border-border bg-card shadow-sm';

export default function Revision() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState({ dueCount: 0, masteredCount: 0, streak: 0, nextReviewDate: null });
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [dueResponse, statsResponse] = await Promise.all([api.get('/revision/due'), api.get('/revision/stats')]);
      const groups = dueResponse.data?.data?.groups || [];
      setQueue(groups.flatMap((group) => group.questions.map((question) => ({ ...question, parentId: group.parentId, title: group.title, sourceType: group.sourceType }))));
      setStats(statsResponse.data?.data || { dueCount: 0, masteredCount: 0, streak: 0, nextReviewDate: dueResponse.data?.data?.nextReviewDate });
      setIndex(0); setChoice(null); setResult(null);
    } catch { setError('Revision could not load. Check your connection and try again.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const current = queue[index];
  const options = useMemo(() => current?.options || [], [current]);
  const progress = queue.length ? ((index + (result ? 1 : 0)) / queue.length) * 100 : 0;

  const submit = async () => {
    if (!current || choice === null || saving) return;
    const correct = choice === current.correctAnswer;
    setResult({ correct }); setSaving(true);
    try {
      await api.post(`/quiz/${current.parentId}/review`, { questionIndex: current.questionIndex, correct });
      window.dispatchEvent(new Event('revision-updated'));
      setStats((previous) => ({ ...previous, dueCount: Math.max(0, previous.dueCount - 1) }));
      window.setTimeout(() => {
        setIndex((previous) => previous + 1); setChoice(null); setResult(null); setSaving(false);
        if (index + 1 >= queue.length) load();
      }, 1000);
    } catch {
      setError('Your answer could not be saved. Please try again.'); setResult(null); setSaving(false);
    }
  };

  if (loading) return <div className={`${card} flex min-h-72 items-center justify-center text-muted-foreground`}><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading revision…</div>;
  const allCaughtUp = !current;

  return <main className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-sm font-semibold text-brand">SMART REVISION</p><h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">Today's Revision <span className="text-muted-foreground">· {stats.dueCount} due</span></h1><p className="mt-2 text-sm text-muted-foreground">A little review today helps ideas stick.</p></div>
      <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"><Flame className="h-5 w-5 text-orange-500" /> {stats.streak} day streak</div>
    </header>
    {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
    {allCaughtUp ? <section className={`${card} flex flex-col items-center px-5 py-12 text-center sm:py-16`}>
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand"><CircleCheck className="h-9 w-9" /></span>
      <h2 className="mt-5 text-2xl font-bold text-foreground">All caught up</h2><p className="mt-2 max-w-md text-muted-foreground">Your revision queue is clear. Come back when the next questions are ready.</p>
      {stats.nextReviewDate && <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" /> Next review {new Date(stats.nextReviewDate).toLocaleString()}</p>}
      <p className="mt-3 text-sm text-muted-foreground">{stats.masteredCount} mastered question{stats.masteredCount === 1 ? '' : 's'}</p>
    </section> : <section className={`${card} overflow-hidden`}>
      <div className="space-y-3 border-b border-border p-4 sm:p-6"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-foreground">Question {index + 1} of {queue.length}</span><span className="truncate text-muted-foreground">{current.title}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${progress}%` }} /></div></div>
      <div className="p-4 sm:p-7"><h2 className="text-xl font-semibold leading-relaxed text-foreground sm:text-2xl">{current.question}</h2>
        <div className="mt-6 grid gap-3">{options.map((option, i) => { const selected = choice === option; const right = result && option === current.correctAnswer; const wrong = result && selected && !result.correct; return <button key={`${i}-${option}`} type="button" disabled={Boolean(result)} onClick={() => setChoice(option)} className={`flex min-h-14 items-center gap-3 rounded-xl border p-3 text-left transition-colors ${right ? 'border-green-500 bg-green-500/10 text-foreground' : wrong ? 'border-destructive bg-destructive/10 text-foreground' : selected ? 'border-brand bg-brand/10 text-foreground' : 'border-border bg-background text-foreground hover:bg-accent'} disabled:cursor-default`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/20 text-sm font-semibold">{String.fromCharCode(65 + i)}</span><span className="min-w-0 flex-1 break-words">{option}</span>{right && <Check className="h-5 w-5 text-green-600" />}{wrong && <X className="h-5 w-5 text-destructive" />}</button>; })}</div>
        {result && <div className={`mt-5 rounded-xl border p-4 ${result.correct ? 'border-green-500/30 bg-green-500/5' : 'border-orange-500/30 bg-orange-500/5'}`} role="status"><p className="font-semibold text-foreground">{result.correct ? 'Correct!' : `Not quite. Correct answer: ${current.correctAnswer}`}</p>{current.explanation && <p className="mt-1 text-sm text-muted-foreground">{current.explanation}</p>}</div>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Your progress saves after each answer.</p>{!result ? <button disabled={choice === null || saving} onClick={submit} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 font-semibold text-brand-foreground hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Check answer</button> : <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-muted px-5 text-sm font-semibold text-foreground"><RotateCcw className="h-4 w-4" /> Next question shortly</span>}</div>
      </div>
    </section>}
  </main>;
}
