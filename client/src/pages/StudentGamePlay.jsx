import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';

const createPlayerKey = () => {
  try {
    return window.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  } catch {
    return `p-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
};

export default function StudentGameJoin() {
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (event) => {
    event.preventDefault();
    const code = gameCode.trim().toUpperCase();
    const name = playerName.trim().replace(/\s+/g, ' ');

    if (!/^K-[A-Z0-9]{8}$/.test(code)) {
      setError('Enter the individual student code given to you by your teacher.');
      return;
    }
    if (!name) {
      setError('Enter your name before joining.');
      return;
    }
    if (name.length > 40) {
      setError('Your name must be 40 characters or fewer.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Keep a different resume key for each student code. This lets the same student
    // resume after a refresh without allowing another browser to take over that code.
    const storageKey = `kahoot_playerKey:${code}`;
    const playerKey = localStorage.getItem(storageKey) || createPlayerKey();
    localStorage.setItem(storageKey, playerKey);

    try {
      const response = await api.post('/quiz/validate-code', { code, playerId: playerKey });
      const quiz = response.data?.data;
      if (!quiz?.quizId || quiz.gameMode !== 'kahoot') {
        throw new Error('This code is not for a Noted Kahoot quiz.');
      }

      sessionStorage.setItem('kahoot_code', code);
      sessionStorage.setItem('kahoot_quizId', String(quiz.quizId));
      sessionStorage.setItem('kahoot_title', quiz.title || 'Noted Kahoot');
      sessionStorage.setItem('kahoot_playerKey', playerKey);
      sessionStorage.setItem('kahoot_playerId', playerKey);
      sessionStorage.setItem('playerName', name);
      navigate('/game-play');
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
        requestError.message ||
        'We could not validate this student code. Check it and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand/10 to-background p-4">
      <section className="w-full max-w-md space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Gamepad2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Noted Kahoot</h1>
          <p className="text-sm text-muted-foreground">
            Enter the personal code assigned to you. Each student has a different code and an independent attempt.
          </p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="kahoot-code" className="text-sm font-medium text-foreground">Your student code</label>
            <input
              id="kahoot-code"
              type="text"
              value={gameCode}
              onChange={(event) => {
                setError('');
                setGameCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 10));
              }}
              placeholder="K-ABC12345"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center text-2xl font-bold tracking-widest text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-brand"
              maxLength={10}
              autoComplete="off"
              autoCapitalize="characters"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="kahoot-player-name" className="text-sm font-medium text-foreground">Your name</label>
            <input
              id="kahoot-player-name"
              type="text"
              value={playerName}
              onChange={(event) => {
                setError('');
                setPlayerName(event.target.value.slice(0, 40));
              }}
              placeholder="Enter your name"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
              maxLength={40}
              autoComplete="name"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !/^K-[A-Z0-9]{8}$/.test(gameCode.trim().toUpperCase()) || !playerName.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Checking code...</> : <>Continue<ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </section>
    </main>
  );
}
