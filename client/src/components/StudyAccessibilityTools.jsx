
import { useEffect } from 'react';
import {
  Accessibility,
  Minus,
  Plus,
  Square,
  Volume2,
} from 'lucide-react';

const buttonClass =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';

export default function StudyAccessibilityTools({
  speechText,
  readableMode,
  onReadableModeChange,
  readerScale,
  onReaderScaleChange,
}) {
  const canSpeak =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  // Stop speech when the current study item changes or this component unmounts.
  useEffect(() => {
    return () => {
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, [speechText]);

  const readAloud = () => {
    if (!canSpeak || !speechText?.trim()) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
      speechText.trim()
    );

    utterance.lang =
      typeof navigator !== 'undefined'
        ? navigator.language || 'en'
        : 'en';

    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
  };

  const stopReading = () => {
    if (canSpeak) {
      window.speechSynthesis.cancel();
    }
  };

  const changeScale = (amount) => {
    const nextScale = Number(
      Math.min(
        1.35,
        Math.max(0.85, readerScale + amount)
      ).toFixed(2)
    );

    onReaderScaleChange(nextScale);
  };

  return (
    <section
      aria-label="Study accessibility tools"
      className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Accessibility className="h-5 w-5 text-brand" />

          <div>
            <h2 className="font-semibold text-foreground">
              Reading tools
            </h2>

            <p className="text-xs text-muted-foreground">
              Make revision work for you.
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-pressed={readableMode}
          onClick={() => onReadableModeChange(!readableMode)}
          className={`${buttonClass} ${
            readableMode
              ? 'border-brand bg-brand/10 text-brand'
              : ''
          }`}
        >
          {readableMode
            ? 'Readable mode: On'
            : 'Enable readable mode'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!readableMode || readerScale <= 0.85}
          onClick={() => changeScale(-0.1)}
          className={buttonClass}
          aria-label="Decrease study text size"
        >
          <Minus className="h-4 w-4" />
          Smaller
        </button>

        <span
          className="min-w-12 text-center text-sm font-medium text-muted-foreground"
          aria-live="polite"
        >
          {Math.round(readerScale * 100)}%
        </span>

        <button
          type="button"
          disabled={!readableMode || readerScale >= 1.35}
          onClick={() => changeScale(0.1)}
          className={buttonClass}
          aria-label="Increase study text size"
        >
          <Plus className="h-4 w-4" />
          Larger
        </button>

        <button
          type="button"
          disabled={!canSpeak || !speechText?.trim()}
          onClick={readAloud}
          className={buttonClass}
        >
          <Volume2 className="h-4 w-4" />
          Read aloud
        </button>

        <button
          type="button"
          disabled={!canSpeak}
          onClick={stopReading}
          className={buttonClass}
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </button>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Readable mode increases spacing and uses a high-legibility
        font when available. Read aloud uses your browser's speech
        support. Available voices depend on your device.
      </p>
    </section>
  );
}
