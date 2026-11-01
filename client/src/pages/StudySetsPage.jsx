import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Check, ChevronRight, Clock3, FileText, Loader2,
  MessageCircle, RotateCw, Sparkles, Upload, Video,
} from 'lucide-react';
import api from '../utils/api';
import * as Tesseract from 'tesseract.js';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 font-semibold text-brand-foreground transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60';
const panelClass = 'rounded-2xl border border-border bg-card p-5 shadow-sm';
const tabs = [
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'flashcards', label: 'Flashcards', icon: RotateCw },
  { id: 'quiz', label: 'Practice quiz', icon: Check },
  { id: 'tutor', label: 'AI tutor', icon: MessageCircle },
  { id: 'plan', label: 'Study plan', icon: Clock3 },
];

export default function StudySetsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [sets, setSets] = useState([]);
  const [studySet, setStudySet] = useState(null);
  const [sourceMode, setSourceMode] = useState('text');
  const [notesMode, setNotesMode] = useState('summarized');
  const [activeTab, setActiveTab] = useState('notes');
  const [text, setText] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [cardIndex, setCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [tutorInput, setTutorInput] = useState('');
  const [tutorMode, setTutorMode] = useState('simple');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadSets = useCallback(async () => {
    try {
      const response = await api.get('/study-sets');
      setSets(response.data?.data || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Study Sets could not be loaded.');
    }
  }, []);

  const loadStudySet = useCallback(async (setId) => {
    try {
      setBusy(true);
      setError('');
      const response = await api.get(`/study-sets/${setId}`);
      setStudySet(response.data.data);
      setActiveTab('notes');
      setCardIndex(0);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'This Study Set could not be loaded.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (id) void loadStudySet(id);
      else void loadSets();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, loadSets, loadStudySet]);

  const masteredCount = useMemo(
    () => studySet?.flashcards?.filter((card) => card.repetitions >= 3).length || 0,
    [studySet],
  );
  const masteryPercent = studySet?.flashcards?.length
    ? Math.round((masteredCount / studySet.flashcards.length) * 100)
    : 0;
  const currentCard = studySet?.flashcards?.[cardIndex];
  const notes = notesMode === 'comprehensive' ? studySet?.notes?.comprehensive : studySet?.notes?.summarized;

  const chooseFile = (event) => {
    setFile(event.target.files?.[0] || null);
    setError('');
  };

  const createSet = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      let response;
      if (sourceMode === 'upload') {
        if (!file) throw new Error('Choose a document or image first.');
        if (file.size > 8 * 1024 * 1024) throw new Error('Files must be 8 MB or smaller.');
        const form = new FormData();
        form.append('file', file);
        form.append('title', title);
        form.append('subject', subject);
        try {
          response = await api.post('/study-sets/upload', form);
        } catch (uploadError) {
          if (!file.type.startsWith('image/')) throw uploadError;
          let extractedText = '';
          try {
            const result = await Tesseract.recognize(file, 'eng');
            extractedText = result.data.text.trim();
          } catch (ocrError) {
            console.error('Local image OCR failed:', ocrError);
          }
          if (!extractedText) {
            throw new Error(uploadError.response?.data?.message || 'No text could be extracted from this image.');
          }
          response = await api.post('/study-sets', {
            text: extractedText,
            title,
            subject,
            source: { type: 'upload', name: file.name },
          });
        }
      } else if (sourceMode === 'youtube') {
        response = await api.post('/study-sets', {
          title,
          subject,
          source: { type: 'youtube', url: sourceUrl },
        });
      } else {
        response = await api.post('/study-sets', {
          text,
          title,
          subject,
          source: { type: 'text' },
        });
      }
      navigate(`/study-sets/${response.data.data._id}`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'The Study Set could not be created.');
    } finally {
      setBusy(false);
    }
  };

  const submitTutorMessage = async (event) => {
    event.preventDefault();
    if (!tutorInput.trim() || busy || !studySet) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.post(`/study-sets/${studySet._id}/tutor`, {
        message: tutorInput.trim(),
        mode: tutorMode,
      });
      setStudySet((current) => ({ ...current, tutorMessages: response.data.data.messages }));
      setTutorInput('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'The tutor could not respond. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const reviewCurrentCard = async (correct) => {
    if (!currentCard || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await api.post(`/study-sets/${studySet._id}/cards/${currentCard._id}/review`, { correct });
      const review = response.data.data;
      setStudySet((current) => ({
        ...current,
        flashcards: current.flashcards.map((card) => card._id === currentCard._id
          ? { ...card, repetitions: review.repetitions, interval: review.interval, nextReviewDate: review.nextReviewDate }
          : card),
      }));
      setCardIndex((current) => (current + 1) % studySet.flashcards.length);
      setShowAnswer(false);
      window.dispatchEvent(new Event('revision-updated'));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Your review could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  if (id && (!studySet || String(studySet._id) !== id)) {
    if (busy) return <div className="flex min-h-64 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-brand" aria-label="Loading Study Set" /></div>;
    return <div className="mx-auto max-w-4xl space-y-4"><Link to="/study-sets" className="inline-flex items-center gap-2 text-sm text-brand"><ArrowLeft size={16} /> All Study Sets</Link>{error && <p role="alert" className="text-destructive">{error}</p>}</div>;
  }

  if (!id) {
    return (
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand"><Sparkles size={16} /> One source, a complete study set</div>
          <h1 className="text-3xl font-bold text-foreground md:text-4xl">Study Sets</h1>
          <p className="max-w-2xl text-muted-foreground">Turn lecture notes, documents, images, or a YouTube video into notes, flashcards, a practice quiz, a study plan, and a grounded AI tutor.</p>
        </header>

        <form onSubmit={createSet} className={`${panelClass} space-y-5`}>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Source type">
            {[
              ['text', 'Paste notes', FileText],
              ['upload', 'Upload file', Upload],
              ['youtube', 'YouTube link', Video],
            ].map(([mode, label, Icon]) => (
              <button key={mode} type="button" onClick={() => setSourceMode(mode)} aria-pressed={sourceMode === mode}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${sourceMode === mode ? 'border-brand bg-brand/10 text-brand' : 'border-border text-muted-foreground hover:bg-accent'}`}>
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
          {sourceMode === 'text' && (
            <label className="block space-y-2 text-sm font-medium">
              Source notes <span className="text-muted-foreground">(up to 50,000 characters)</span>
              <textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={50000} required rows={10}
                className="w-full rounded-xl border border-input bg-background p-3 text-foreground outline-none focus:ring-2 focus:ring-brand"
                placeholder="Paste your lecture notes or study material..." />
            </label>
          )}
          {sourceMode === 'upload' && (
            <label className="block space-y-2 text-sm font-medium">
              Upload a source file
              <input type="file" accept=".pdf,.docx,.pptx,image/*" onChange={chooseFile} required
                className="block w-full rounded-xl border border-input bg-background p-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand/10 file:px-3 file:py-2 file:font-semibold file:text-brand" />
              <span className="block text-xs font-normal text-muted-foreground">PDF, DOCX, PPTX, or common image formats; up to 8 MB. Images use the configured OCR service with a local fallback.</span>
            </label>
          )}
          {sourceMode === 'youtube' && (
            <label className="block space-y-2 text-sm font-medium">
              YouTube URL
              <input type="url" required value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-xl border border-input bg-background p-3 text-foreground outline-none focus:ring-2 focus:ring-brand" />
              <span className="block text-xs font-normal text-muted-foreground">The video must have an available transcript or captions.</span>
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium">Title (optional)
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} className="w-full rounded-lg border border-input bg-background p-3" placeholder="Generated from your material" />
            </label>
            <label className="space-y-2 text-sm font-medium">Subject (optional)
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={100} className="w-full rounded-lg border border-input bg-background p-3" placeholder="Biology, history..." />
            </label>
          </div>
          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Uses 8 AI credits to generate the full set.</p>
            <button type="submit" disabled={busy} className={buttonClass}>
              {busy ? <><Loader2 size={17} className="animate-spin" /> Creating study set...</> : <><Sparkles size={17} /> Create complete Study Set</>}
            </button>
          </div>
        </form>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Your Study Sets</h2>
          {sets.length === 0 ? <p className="text-sm text-muted-foreground">Your created sets will appear here.</p> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {sets.map((set) => (
                <Link key={set._id} to={`/study-sets/${set._id}`} className={`${panelClass} flex items-center justify-between gap-4 transition hover:border-brand/50`}>
                  <span className="min-w-0"><span className="block truncate font-semibold">{set.title}</span><span className="text-sm text-muted-foreground">{set.subject || 'General'} · {set.flashcards?.length || 0} cards</span></span>
                  <ChevronRight className="shrink-0 text-muted-foreground" size={18} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link to="/study-sets" className="inline-flex items-center gap-2 text-sm font-medium text-brand"><ArrowLeft size={16} /> All Study Sets</Link>
      <header className={`${panelClass} flex flex-wrap items-start justify-between gap-4`}>
        <div>
          <p className="text-sm font-medium text-brand">{studySet.subject || 'General'} · {studySet.source?.name || studySet.source?.type}</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">{studySet.title}</h1>
          {studySet.source?.url && <a className="mt-2 inline-block text-sm text-muted-foreground underline" href={studySet.source.url} target="_blank" rel="noreferrer">Open original video</a>}
        </div>
        <div className="min-w-44">
          <div className="mb-1 flex justify-between text-xs"><span>You know</span><span>{masteryPercent}% · {masteredCount}/{studySet.flashcards.length}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Study Set mastery" aria-valuemin={0} aria-valuemax={studySet.flashcards.length} aria-valuenow={masteredCount}>
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${studySet.flashcards.length ? masteredCount / studySet.flashcards.length * 100 : 0}%` }} />
          </div>
        </div>
      </header>
      <nav className="flex gap-2 overflow-x-auto pb-1" aria-label="Study modes">
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button key={tabId} type="button" onClick={() => setActiveTab(tabId)} aria-pressed={activeTab === tabId}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${activeTab === tabId ? 'border-brand bg-brand text-brand-foreground' : 'border-border bg-card text-muted-foreground hover:bg-accent'}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {activeTab === 'notes' && (
        <section className={`${panelClass} space-y-4`}>
          <div className="flex flex-wrap gap-2">
            {['summarized', 'comprehensive'].map((mode) => (
              <button key={mode} type="button" onClick={() => setNotesMode(mode)} aria-pressed={notesMode === mode}
                className={`rounded-lg px-3 py-2 text-sm font-medium capitalize ${notesMode === mode ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground'}`}>{mode} notes</button>
            ))}
          </div>
          <div className="prose prose-sm max-w-none break-words leading-7 text-foreground dark:prose-invert [&_.katex-display]:overflow-x-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{notes || ''}</ReactMarkdown>
          </div>
        </section>
      )}

      {activeTab === 'flashcards' && currentCard && (
        <section className={`${panelClass} mx-auto max-w-2xl space-y-5 text-center`}>
          <div className="flex justify-between text-sm text-muted-foreground"><span>Flashcard {cardIndex + 1} of {studySet.flashcards.length}</span><span>{masteredCount} mastered</span></div>
          <button type="button" onClick={() => setShowAnswer((visible) => !visible)} className="flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-border bg-background p-6 text-xl font-medium leading-relaxed hover:border-brand/50">
            <span className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand">{showAnswer ? 'Answer' : 'Question'} · click to flip</span>
            {showAnswer ? currentCard.back : currentCard.front}
          </button>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className="rounded-xl border border-border px-4 py-2.5 font-semibold hover:bg-accent" disabled={busy || !showAnswer} onClick={() => reviewCurrentCard(false)}>Review again</button>
            <button type="button" className={buttonClass} disabled={busy || !showAnswer} onClick={() => reviewCurrentCard(true)}><Check size={17} /> I know this</button>
          </div>
          <div className="flex justify-center gap-3 text-sm">
            <button type="button" className="text-brand" onClick={() => { setCardIndex((index) => (index + studySet.flashcards.length - 1) % studySet.flashcards.length); setShowAnswer(false); }}>Previous</button>
            <button type="button" className="text-brand" onClick={() => { setCardIndex((index) => (index + 1) % studySet.flashcards.length); setShowAnswer(false); }}>Next</button>
          </div>
        </section>
      )}

      {activeTab === 'quiz' && (
        <section className="space-y-4">
          {studySet.quiz.map((question, index) => (
            <article key={`${index}-${question.question}`} className={`${panelClass} space-y-3`}>
              <h2 className="font-semibold">{index + 1}. {question.question}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {question.options.map((option) => (
                  <button key={option} type="button" onClick={() => setQuizAnswers((answers) => ({ ...answers, [index]: option }))}
                    className={`rounded-lg border p-3 text-left text-sm ${quizAnswers[index] === option ? 'border-brand bg-brand/10' : 'border-border hover:bg-accent'}`}>{option}</button>
                ))}
              </div>
              {quizAnswers[index] && (
                <p className={`text-sm ${quizAnswers[index] === question.correctAnswer ? 'text-emerald-600' : 'text-destructive'}`}>
                  {quizAnswers[index] === question.correctAnswer ? 'Correct. ' : `Answer: ${question.correctAnswer}. `}
                  {question.explanation}
                </p>
              )}
            </article>
          ))}
        </section>
      )}

      {activeTab === 'tutor' && (
        <section className={`${panelClass} space-y-4`}>
          <div className="flex flex-wrap gap-2">
            {[['simple', 'Simple explanation'], ['exam', 'Exam mode'], ['deep_dive', 'Deep dive']].map(([mode, label]) => (
              <button key={mode} type="button" onClick={() => setTutorMode(mode)} aria-pressed={tutorMode === mode}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${tutorMode === mode ? 'bg-brand/10 text-brand' : 'bg-muted text-muted-foreground'}`}>{label}</button>
            ))}
          </div>
          <div className="max-h-[55vh] min-h-48 space-y-3 overflow-y-auto rounded-xl bg-background p-3" aria-live="polite">
            {(studySet.tutorMessages || []).map((message, index) => (
              <div key={`${message.createdAt}-${index}`} className={`max-w-[90%] rounded-xl p-3 text-sm leading-6 ${message.role === 'user' ? 'ml-auto bg-brand text-brand-foreground' : 'bg-muted text-foreground'}`}>
                <span className="mb-1 block text-[10px] font-semibold uppercase opacity-70">{message.role === 'user' ? 'You' : 'Noted Tutor'}</span>
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{message.content}</ReactMarkdown>
              </div>
            ))}
            {!studySet.tutorMessages?.length && <p className="pt-12 text-center text-sm text-muted-foreground">Ask about this material, request practice, or share an answer for feedback.</p>}
          </div>
          <form onSubmit={submitTutorMessage} className="flex gap-2">
            <input value={tutorInput} onChange={(event) => setTutorInput(event.target.value)} maxLength={2000}
              placeholder="Ask a question based on this study set..." className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5" />
            <button type="submit" disabled={busy || !tutorInput.trim()} className={buttonClass}>{busy ? <Loader2 className="animate-spin" size={17} /> : 'Send'}</button>
          </form>
          <p className="text-xs text-muted-foreground">Tutor replies use this Study Set and cost 1 AI credit each.</p>
        </section>
      )}

      {activeTab === 'plan' && (
        <section className={`${panelClass} space-y-3`}>
          <h2 className="text-xl font-semibold">Your short study plan</h2>
          {studySet.studyPlan.map((task, index) => (
            <div key={`${index}-${task.task}`} className="flex items-start gap-3 rounded-xl bg-background p-4">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand">{index + 1}</span>
              <div className="flex-1"><p className="font-medium">{task.task}</p><p className="mt-1 text-sm text-muted-foreground">{task.durationMinutes} minutes</p></div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
