import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle, Check, Clock3, Trophy, Wifi, WifiOff, X,
  Volume2, VolumeX, Loader2,
} from 'lucide-react';
import { createKahootSocket } from '../utils/socket';
import MathRenderer from "../components/MathRenderer";

const SHAPES = [
  { symbol: '▲', base: 'bg-red-600', hover: 'hover:bg-red-500' },
  { symbol: '◆', base: 'bg-blue-600', hover: 'hover:bg-blue-500' },
  { symbol: '●', base: 'bg-yellow-500', hover: 'hover:bg-yellow-400' },
  { symbol: '■', base: 'bg-green-600', hover: 'hover:bg-green-500' },
];

const getStatus = (status) => {
  if (status === 'in_progress') return 'playing';
  if (status === 'feedback') return 'feedback';
  if (status === 'completed') return 'finished';
  return 'waiting';
};

export default function StudentGamePlay() {
  const navigate = useNavigate();
  const code = sessionStorage.getItem('kahoot_code');
  const [playerName] = useState(() => sessionStorage.getItem('playerName') || '');
  const [playerKey] = useState(() => (
    sessionStorage.getItem('kahoot_playerKey') || sessionStorage.getItem('kahoot_playerId') || ''
  ));

  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const musicTimerRef = useRef(null);
  const [gameState, setGameState] = useState('waiting');
  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [stats, setStats] = useState({ score: 0, correctCount: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
const [myRank, setMyRank] = useState(null);
  const [connection, setConnection] = useState('connecting');
  const [error, setError] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);
  const [answerSending, setAnswerSending] = useState(false);

  const clearMusicTimer = useCallback(() => {
    if (musicTimerRef.current) {
      window.clearInterval(musicTimerRef.current);
      musicTimerRef.current = null;
    }
  }, []);

  const tone = useCallback((frequency, duration = 0.2, waveform = 'sine', volume = 0.045) => {
    const context = audioContextRef.current;
    if (!context || context.state !== 'running') return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }, []);

  const enableSound = async () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        setError('This browser does not support in-game audio.');
        return;
      }
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
      await audioContextRef.current.resume();
      soundEnabledRef.current = true;
      setSoundEnabled(true);
      setError('');
    } catch {
      setError('The browser blocked audio. Tap the sound button again to enable it.');
    }
  };

  const disableSound = () => {
    soundEnabledRef.current = false;
    setSoundEnabled(false);
    clearMusicTimer();
    if (audioContextRef.current?.state === 'running') {
      audioContextRef.current.suspend().catch(() => {});
    }
  };

  useEffect(() => {
    if (!soundEnabled || gameState === 'finished') {
      clearMusicTimer();
      return undefined;
    }
    const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
    let step = 0;
    tone(melody[0], 0.28, 'triangle', 0.018);
    musicTimerRef.current = window.setInterval(() => {
      tone(melody[step % melody.length], 0.28, 'triangle', 0.018);
      step += 1;
    }, 430);
    return clearMusicTimer;
  }, [soundEnabled, gameState, clearMusicTimer, tone]);

  useEffect(() => () => {
    clearMusicTimer();
    if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
  }, [clearMusicTimer]);

  useEffect(() => {
    if (!code || !playerName || !playerKey) {
      navigate('/game-join', { replace: true });
      return undefined;
    }

    let active = true;
    const socket = createKahootSocket();
    socketRef.current = socket;

    const applySnapshot = (snapshot) => {
      if (!active) return;
      const nextState = getStatus(snapshot.status);
      setGameState(nextState);
      setQuestion(snapshot.question || null);
      setLastResult(snapshot.lastResult || null);
      setSelectedChoice(snapshot.lastResult?.selectedIndex ?? null);
      setStats({
        score: Number(snapshot.me?.score) || 0,
        correctCount: Number(snapshot.me?.correctCount) || 0,
      });
      if (snapshot.question?.endsAt) {
        setTimeLeft(Math.max(0, Math.ceil((snapshot.question.endsAt - Date.now()) / 1000)));
      }
    };

    const join = () => {
      if (!active) return;
      setConnection('connected');
      setError('');
      socket.emit('player_join', { code, name: playerName, playerId: playerKey });
    };

    socket.on('connect', join);
    socket.on('connect_error', () => {
      if (active) setConnection('disconnected');
    });
    socket.on('disconnect', () => {
      if (active) setConnection('disconnected');
    });
    socket.on('joined', applySnapshot);
    socket.on('attempt_question', (nextQuestion) => {
      if (!active) return;
      setQuestion(nextQuestion);
      setGameState('playing');
      setSelectedChoice(null);
      setLastResult(null);
      setAnswerSending(false);
      setTimeLeft(Math.max(0, Math.ceil((nextQuestion.endsAt - Date.now()) / 1000)));
    });
    socket.on('answer_result', (result) => {
      setLeaderboard(result.leaderboard || []);
setMyRank(result.rank ?? null);


socket.on('leaderboard_update', (data) => {
  if (!active) return;

  setLeaderboard(data.leaderboard || []);
  setMyRank(data.rank ?? null);
});

      if (!active) return;
      setLastResult(result);
      setSelectedChoice(result.selectedIndex ?? null);
      setStats({ score: Number(result.score) || 0, correctCount: Number(result.correctCount) || 0 });
      setGameState('feedback');
      setAnswerSending(false);
      if (soundEnabledRef.current) {
        if (result.correct) {
          tone(783.99, 0.16, 'sine', 0.055);
          window.setTimeout(() => tone(987.77, 0.2, 'sine', 0.045), 120);
        } else {
          tone(196, 0.3, 'triangle', 0.055);
        }
      }
    });
    socket.on('attempt_finished', (result) => {
      if (!active) return;
      setStats({ score: Number(result.score) || 0, correctCount: Number(result.correctCount) || 0 });
      setGameState('finished');
      setTimeLeft(0);
    });
    socket.on('game_error', (gameError) => {
      if (!active) return;
      setError(gameError?.message || 'The quiz returned an error.');
      setAnswerSending(false);
      if (gameError?.code === 'ANSWER_FAILED') setSelectedChoice(null);
    });

    if (socket.connected) join();
    return () => {
      active = false;
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [code, playerName, playerKey, navigate, tone]);

  useEffect(() => {
    if (gameState !== 'playing' || !question?.endsAt) return undefined;
    const update = () => setTimeLeft(Math.max(0, Math.ceil((question.endsAt - Date.now()) / 1000)));
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [gameState, question?.endsAt]);

  const answer = (index) => {
    const socket = socketRef.current;
    if (gameState !== 'playing' || selectedChoice !== null || answerSending || !socket?.connected || timeLeft <= 0) return;
    setSelectedChoice(index);
    setAnswerSending(true);
    socket.emit('player_answer', { choice: index });
  };

  if (!code) return null;

  const isFeedback = gameState === 'feedback' && Boolean(lastResult);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <style>{`
        @keyframes kahoot-pop { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes kahoot-correct { 0% { transform: scale(.96); } 60% { transform: scale(1.025); } 100% { transform: scale(1); } }
        .kahoot-enter { animation: kahoot-pop .32s ease-out both; }
        .kahoot-correct { animation: kahoot-correct .45s ease-out both; }
      `}</style>

      <header className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center gap-2"><Trophy className="h-5 w-5 text-yellow-400" /><span className="font-black">{stats.correctCount} correct</span></div>
        <div className="min-w-0 text-center">
          <p className="truncate font-black text-brand">{playerName}</p>
          <p className={`inline-flex items-center gap-1 text-xs ${connection === 'connected' ? 'text-green-300' : 'text-yellow-300'}`}>
            {connection === 'connected' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {connection === 'connected' ? 'Connected' : 'Reconnecting'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-black tabular-nums">{stats.score.toLocaleString()}</span>
          <button
            type="button"
            onClick={soundEnabled ? disableSound : enableSound}
            aria-label={soundEnabled ? 'Turn game music off' : 'Turn game music on'}
            title={soundEnabled ? 'Turn music off' : 'Turn music on'}
            className="rounded-lg border border-slate-700 p-2 text-slate-200 hover:bg-slate-800"
          >
            {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {error && <div role="alert" className="mx-auto mt-4 flex max-w-2xl items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>}

      <section className="flex min-h-[calc(100vh-72px)] flex-col items-center justify-center gap-6 p-4">
        {gameState === 'waiting' && (
          <div className="kahoot-enter max-w-xl text-center">
            <Loader2 className="mx-auto mb-5 h-14 w-14 animate-spin text-brand" />
            <h2 className="text-3xl font-black">You're registered!</h2>
            <p className="mt-3 text-slate-400">{connection === 'connected' ? 'Your teacher has not opened this quiz yet. Keep this page open.' : 'Reconnecting to your quiz...'}</p>
            <p className="mt-5 text-xs text-slate-500">Your code is reserved for you. Refreshing this page will not erase your progress.</p>
          </div>
        )}

        {(gameState === 'playing' || isFeedback) && question && (
          <div key={question.index} className="kahoot-enter w-full max-w-4xl space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-4 py-2 text-xl font-black text-red-300">
                <Clock3 className="h-5 w-5" /> {isFeedback ? 'Answer checked' : `${timeLeft}s`}
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Question {(question.index ?? 0) + 1} of {question.total || '—'}</p>
              <h2 className="mt-3 text-2xl font-black leading-tight md:text-4xl">
  <MathRenderer>{question.question}</MathRenderer>
</h2>
            </div>

            {question.imageUrl && <img src={question.imageUrl} alt="Question illustration" className="mx-auto max-h-64 w-full rounded-xl bg-slate-800 object-contain" />}

            {isFeedback && (
              <div role="status" className={`kahoot-enter rounded-xl px-4 py-3 text-center text-xl font-black ${lastResult.correct ? 'bg-blue-600/20 text-blue-200 ring-1 ring-blue-400/40' : 'bg-red-600/20 text-red-200 ring-1 ring-red-400/40'}`}>
                {lastResult.timedOut ? "Time's up!" : lastResult.correct ? '✓ Correct!' : '✕ Wrong answer'}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {(question.options || []).map((option, index) => {
                const shape = SHAPES[index] || { symbol: String(index + 1), base: 'bg-slate-700', hover: 'hover:bg-slate-600' };
                const isCorrect = isFeedback && index === lastResult.correctIndex;
                const isWrongSelection = isFeedback && index === lastResult.selectedIndex && !lastResult.correct;
                const isDimmed = isFeedback && !isCorrect && !isWrongSelection;
                const isSelected = selectedChoice === index;
                const colorClass = isCorrect ? 'bg-blue-600 ring-2 ring-blue-300' : isWrongSelection ? 'bg-red-600 ring-2 ring-red-300' : shape.base;
                return (
                  <button
                    key={`${index}-${option}`}
                    type="button"
                    onClick={() => answer(index)}
                    disabled={gameState !== 'playing' || selectedChoice !== null || answerSending || timeLeft <= 0 || connection !== 'connected'}
                    aria-pressed={isSelected}
                    className={`flex min-h-24 items-center gap-4 rounded-2xl p-4 text-left text-lg font-bold text-white shadow-lg transition duration-200 disabled:cursor-not-allowed ${colorClass} ${!isFeedback ? shape.hover : ''} ${isDimmed ? 'opacity-50' : ''} ${isSelected && !isFeedback ? 'ring-4 ring-white' : ''}`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-black/20 text-2xl font-black">{shape.symbol}</span>
                    <span className="break-words">
  <MathRenderer>{option}</MathRenderer>
</span>
                    {isCorrect && <Check className="ml-auto h-6 w-6 shrink-0" />}
                    {isWrongSelection && <X className="ml-auto h-6 w-6 shrink-0" />}
                    {isSelected && answerSending && <Loader2 className="ml-auto h-5 w-5 animate-spin" />}
                  </button>
                );
              })}
            </div>

            {isFeedback && (
              <div className={`kahoot-enter rounded-2xl p-5 text-center ${lastResult.correct ? 'kahoot-correct border border-blue-400/40 bg-blue-500/15' : 'border border-red-400/40 bg-red-500/15'}`}>
                <h3 className={`text-3xl font-black ${lastResult.correct ? 'text-blue-300' : 'text-red-300'}`}>
                  {lastResult.timedOut ? "Time's up!" : lastResult.correct ? 'Correct!' : 'Wrong answer'}
                </h3>
                {!lastResult.correct && <p className="mt-2 text-slate-200">Correct answer: <strong className="text-blue-300">{lastResult.correctAnswer}</strong></p>}
                {lastResult.correct && <p className="mt-2 text-blue-200">+{lastResult.points} points</p>}
                {lastResult.explanation && <p className="mt-2 text-sm text-slate-300">{lastResult.explanation}</p>}
                <p className="mt-3 text-xs text-slate-400">Loading your next question...</p>
              </div>
            )}
          </div>
        )}

        {gameState === 'finished' && (
          <div className="kahoot-enter w-full max-w-xl rounded-3xl border border-yellow-500/30 bg-slate-900 p-8 text-center">
            <Trophy className="mx-auto h-16 w-16 text-yellow-400" />
            <h2 className="mt-4 text-3xl font-black">Quiz completed!</h2>
            <p className="mt-2 text-slate-300">Your answers have been saved.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-800 p-4"><p className="text-sm text-slate-400">Correct</p><p className="mt-1 text-3xl font-black text-blue-300">{stats.correctCount}</p></div>
              <div className="rounded-xl bg-slate-800 p-4"><p className="text-sm text-slate-400">Points</p><p className="mt-1 text-3xl font-black text-yellow-300">{stats.score.toLocaleString()}</p></div>
            </div>
            <button type="button" onClick={() => navigate('/')} className="mt-6 w-full rounded-xl bg-brand py-3 font-bold text-white">Return to Noted</button>
          </div>
        )}
      </section>
    </main>
  );
}
