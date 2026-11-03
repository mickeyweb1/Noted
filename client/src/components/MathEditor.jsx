import { useRef } from "react";
import MathRenderer from "./MathRenderer";

// Common math snippets teachers need
const MATH_SNIPPETS = [
  { label: "a/b", icon: "⅟", insert: "\\frac{a}{b}", title: "Fraction" },
  { label: "√x", icon: "√", insert: "\\sqrt{x}", title: "Square Root" },
  { label: "x²", icon: "x²", insert: "x^{2}", title: "Exponent" },
  { label: "Matrix", icon: "▦", insert: "\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}", title: "2x2 Matrix" },
  { label: "θ", icon: "θ", insert: "\\theta", title: "Theta" },
  { label: "π", icon: "π", insert: "\\pi", title: "Pi" },
  { label: "∑", icon: "∑", insert: "\\sum", title: "Summation" },
  { label: "∫", icon: "∫", insert: "\\int", title: "Integral" },
];

export default function MathEditor({ value, onChange, placeholder }) {
  const textareaRef = useRef(null);

  // Inserts text exactly where the user's cursor is
  const insertAtCursor = (textToInsert) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const newValue = text.substring(0, start) + textToInsert + text.substring(end);
    
    onChange(newValue);

    // Restore cursor position after the inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 0);
  };

  return (
    <div className="space-y-2">
      {/* 1. Math Toolbar */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted p-1.5">
        {MATH_SNIPPETS.map((snippet, i) => (
          <button
            key={i}
            type="button"
            title={snippet.title}
            onClick={() => insertAtCursor(snippet.insert)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-semibold text-foreground transition hover:bg-background hover:text-brand"
          >
            {snippet.icon}
          </button>
        ))}
        
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <span className="hidden sm:inline">Wrap math in</span>
          <code className="rounded bg-background px-1 py-0.5 font-mono text-brand">$...$</code>
        </div>
        
        <button
          type="button"
          onClick={() => insertAtCursor(" $ $ ")}
          className="flex h-8 items-center gap-1 rounded-md border border-border bg-background px-2 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          Insert Math
        </button>
      </div>

      {/* 2. Text Input */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand min-h-[100px] resize-y"
      />

      {/* 3. Live Preview (Only shows if there is math in the text) */}
      {value && value.includes("$") && (
        <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand">Live Math Preview</p>
          <div className="text-sm text-foreground">
            <MathRenderer>{value}</MathRenderer>
          </div>
        </div>
      )}
    </div>
  );
}