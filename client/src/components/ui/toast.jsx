import { useEffect, useState } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';

export const toast = {
  success: (message) => window.dispatchEvent(new CustomEvent('noted:toast', { detail: { message, type: 'success' } })),
  info: (message) => window.dispatchEvent(new CustomEvent('noted:toast', { detail: { message, type: 'info' } })),
};

export function ToastViewport() {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    const show = (event) => {
      setNotice(event.detail);
      window.setTimeout(() => setNotice((current) => current === event.detail ? null : current), 3500);
    };
    window.addEventListener('noted:toast', show);
    return () => window.removeEventListener('noted:toast', show);
  }, []);

  if (!notice) return null;
  const Icon = notice.type === 'success' ? CheckCircle2 : Info;
  return <div className="fixed right-4 top-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-xl" role="status" aria-live="polite">
    <Icon className={`h-5 w-5 shrink-0 ${notice.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-brand'}`} aria-hidden="true" />
    <span>{notice.message}</span>
    <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss notification" className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
  </div>;
}
