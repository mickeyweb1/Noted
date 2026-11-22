import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Clipboard, ClipboardCheck, DoorOpen,
  Loader2, Monitor, RefreshCw, Users, Wifi, WifiOff, XCircle,
} from 'lucide-react';
import { createKahootSocket } from '../utils/socket';

const statusLabel = (status) => {
  if (status === 'completed') return 'Completed';
  if (status === 'in_progress' || status === 'feedback') return 'In progress';
  if (status === 'waiting') return 'Waiting';
  if (status === 'not_used') return 'Not used';
  return status || 'Not used';
};

const statusClass = (status) => {
  if (status === 'completed') return 'bg-green-500/15 text-green-300';
  if (status === 'in_progress' || status === 'feedback') return 'bg-blue-500/15 text-blue-300';
  if (status === 'waiting') return 'bg-yellow-500/15 text-yellow-300';
  return 'bg-slate-700 text-slate-300';
};

export default function TeacherGameHost() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [connection, setConnection] = useState('connecting');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const socket = createKahootSocket();
    socketRef.current = socket;
    const token = localStorage.getItem('userToken') || localStorage.getItem('token');

    const joinAsHost = () => {
      if (!token) {
        setError('Your login session was not found. Please sign in again.');
        setConnection('disconnected');
        return;
      }
      socket.emit('host_join', { quizId, token });
    };

    socket.on('connect', () => {
      if (!active) return;
      setConnection('connected');
      setError('');
      joinAsHost();
    });
    socket.on('connect_error', (socketError) => {
      if (!active) return;
      console.error('[Kahoot teacher dashboard] Socket error:', socketError.message);
      setConnection('disconnected');
      setError('Cannot reach the quiz server. Reconnecting...');
    });
    socket.on('disconnect', () => {
      if (active) setConnection('disconnected');
    });
    socket.on('host_state', (state) => {
      if (!active) return;
      setGameState(state);
      setError('');
      setBusy(false);
    });
    socket.on('host_notice', ({ message } = {}) => {
      if (active) setNotice(message || 'The quiz was updated.');
      setBusy(false);
    });
    socket.on('game_error', (gameError) => {
      if (!active) return;
      setError(gameError?.message || 'The quiz server returned an error.');
      setBusy(false);
    });

    if (socket.connected) joinAsHost();
    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [quizId]);

  const emitAction = (eventName) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      setError('The server is reconnecting. Try again when the connection returns.');
      return;
    }
    setError('');
    setNotice('');
    setBusy(true);
    socket.emit(eventName, { quizId });
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(''), 1600);
    } catch {
      setError(`Could not copy ${code}. Select and copy it manually.`);
    }
  };

  if (!gameState && error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-white">
        <section className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <h1 className="text-xl font-bold">Unable to open this Kahoot</h1>
          <p className="mt-2 text-sm text-slate-300">{error}</p>
          <button type="button" onClick={() => navigate('/admin/quiz-results')} className="mt-5 rounded-lg bg-brand px-4 py-2 font-semibold text-white">Back to results</button>
        </section>
      </main>
    );
  }

  if (!gameState) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-brand" />
        <p className="text-slate-300">Opening teacher Kahoot dashboard...</p>
      </main>
    );
  }

  const summary = gameState.summary || {};
  const codes = Array.isArray(gameState.codes) ? gameState.codes : [];
  const isOpen = Boolean(gameState.isOpen);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Monitor className="h-9 w-9 text-brand" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Noted Kahoot</p>
              <h1 className="text-xl font-black md:text-2xl">{gameState.title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-2 text-xs ${connection === 'connected' ? 'text-green-300' : 'text-yellow-300'}`}>
              {connection === 'connected' ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {connection === 'connected' ? 'Live updates connected' : 'Reconnecting'}
            </span>
            <button type="button" onClick={() => navigate(`/admin/quiz/${quizId}/results`)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">View results</button>
          </div>
        </header>

        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div>}

        <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-brand/40 bg-brand/10 p-6 text-center md:p-9">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand">Student join page</p>
            <p className="mt-2 text-lg font-bold">{window.location.origin}/game-join</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-4 py-2 text-sm font-bold">
              <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? 'bg-green-400' : 'bg-yellow-400'}`} />
              {isOpen ? 'Quiz is open' : gameState.status === 'closed' ? 'Quiz is closed' : 'Waiting for teacher to open'}
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {!isOpen && (
                <button type="button" disabled={busy || connection !== 'connected'} onClick={() => emitAction('host_start')} className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-black text-white hover:bg-green-500 disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />} {gameState.status === 'closed' ? 'Reopen quiz for students' : 'Open quiz for students'}
                </button>
              )}
              {isOpen && (
                <button type="button" disabled={busy || connection !== 'connected'} onClick={() => emitAction('host_end')} className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-6 py-3 font-bold text-white hover:bg-red-500 disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Close new attempts
                </button>
              )}
              {gameState.status === 'closed' && <p className="text-sm text-slate-300">New students are blocked until you reopen the quiz. Students who already started can finish.</p>}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              {gameState.autoStart ? 'Automatic mode: the quiz is available as soon as it is created.' : 'Teacher-controlled mode: open the quiz here before students can begin.'}
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-2"><Users className="h-5 w-5 text-brand" /><h2 className="text-lg font-bold">Class progress</h2></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                ['Total codes', summary.total ?? codes.length],
                ['Not started', summary.notStarted ?? 0],
                ['In progress', summary.inProgress ?? 0],
                ['Completed', summary.completed ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-800 p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 text-3xl font-black tabular-nums">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">Progress updates automatically as each student joins, answers and completes the quiz.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold">Individual student codes</h2>
              <p className="mt-1 text-sm text-slate-400">Give each student one different code. A code can only be used by its assigned attempt.</p>
            </div>
            <button type="button" onClick={() => socketRef.current?.connected && socketRef.current.emit('host_join', { quizId, token: localStorage.getItem('userToken') || localStorage.getItem('token') })} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-800">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="px-3 py-3">#</th><th className="px-3 py-3">Student code</th><th className="px-3 py-3">Student</th><th className="px-3 py-3">Progress</th><th className="px-3 py-3">Score</th><th className="px-3 py-3">Copy</th></tr>
              </thead>
              <tbody>
                {codes.map((entry, index) => (
                  <tr key={entry.code} className="border-t border-slate-800">
                    <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-3 py-3 font-mono font-bold tracking-wider">{entry.code}</td>
                    <td className="px-3 py-3">{entry.studentName || '—'}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(entry.status)}`}>{statusLabel(entry.status)}</span></td>
                    <td className="px-3 py-3 tabular-nums">{entry.score ?? 0}</td>
                    <td className="px-3 py-3"><button type="button" onClick={() => copyCode(entry.code)} className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1.5 text-xs hover:bg-slate-800">{copiedCode === entry.code ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}{copiedCode === entry.code ? 'Copied' : 'Copy'}</button></td>
                  </tr>
                ))}
                {codes.length === 0 && <tr><td colSpan="6" className="px-3 py-8 text-center text-slate-500">No student codes were generated.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-center text-xs text-slate-500">You can leave this page and return from the Kahoot results page. Each student's saved attempt continues independently.</p>
      </div>
    </main>
  );
}
