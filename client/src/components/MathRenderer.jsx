import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function MathRenderer({ children, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && children) {
      try {
        katex.render(children, ref.current, {
          throwOnError: false,
          displayMode: true,
          strict: false,
        });
      } catch (e) {
        console.error('KaTeX render error:', e);
        if (ref.current) {
          ref.current.textContent = children;
        }
      }
    }
  }, [children]);

  return <span ref={ref} className={className} />;
}
