import { Fragment, useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function findClosingDollar(text, from) {
  if (from >= text.length || /\s/.test(text[from])) return -1;
  for (let j = from; j < text.length; j++) {
    const ch = text[j];
    if (ch === "\\") { j++; continue; }
    if (ch === "$") {
      if (/\s/.test(text[j - 1])) return -1;
      if (/[0-9]/.test(text[j + 1] ?? "")) continue;
      return j;
    }
  }
  return -1;
}

function splitMath(text) {
  const out = []; let buf = ""; let i = 0;
  const flush = () => { if (buf) { out.push({ type: "text", value: buf }); buf = ""; } };
  const pushMath = (value, display, raw) => { flush(); out.push({ type: "math", value, display, raw }); };
  while (i < text.length) {
    const two = text.slice(i, i + 2);
    if (two === "\\$") { buf += "$"; i += 2; continue; }
    if (two === "$$") {
      const end = text.indexOf("$$", i + 2);
      if (end > i + 2) { pushMath(text.slice(i + 2, end), true, text.slice(i, end + 2)); i = end + 2; continue; }
    }
    if (two === "\\[") {
      const end = text.indexOf("\\]", i + 2);
      if (end > -1) { pushMath(text.slice(i + 2, end), true, text.slice(i, end + 2)); i = end + 2; continue; }
    }
    if (two === "\\(") {
      const end = text.indexOf("\\)", i + 2);
      if (end > -1) { pushMath(text.slice(i + 2, end), false, text.slice(i, end + 2)); i = end + 2; continue; }
    }
    if (text[i] === "$") {
      const end = findClosingDollar(text, i + 1);
      if (end !== -1) { pushMath(text.slice(i + 1, end), false, text.slice(i, end + 1)); i = end + 1; continue; }
    }
    buf += text[i]; i++;
  }
  flush(); return out;
}

const LATEX_HINT = /\\[a-zA-Z]{2,}|[A-Za-z0-9][\^_]\{/;
function matchBrace(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "\\") { i++; continue; }
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function matchLatexRun(text, start) {
  const isCommand = text[start] === "\\" && /[a-zA-Z]{2}/.test(text.slice(start + 1, start + 3));
  const isScript = /[A-Za-z0-9]/.test(text[start]) && /^[\^_]\{/.test(text.slice(start + 1, start + 3));
  if (!isCommand && !isScript) return start;
  let i = start;
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\" && /[a-zA-Z]/.test(text[i + 1] ?? "")) { i++; while (/[a-zA-Z]/.test(text[i] ?? "")) i++; }
    else if (ch === "{") { const close = matchBrace(text, i); if (close < 0) break; i = close + 1; }
    else if (ch === "^" || ch === "_") { i++; if (text[i] !== "{" && /[A-Za-z0-9]/.test(text[i] ?? "")) i++; }
    else if (i === start && /[A-Za-z0-9]/.test(ch)) { i++; }
    else { break; }
  }
  return i;
}

function autoWrapLatex(text) {
  let out = ""; let i = 0;
  while (i < text.length) {
    const end = matchLatexRun(text, i);
    if (end > i) { out += `$${text.slice(i, end)}$`; i = end; }
    else { out += text[i]; i++; }
  }
  return out;
}

const repairControlChars = (s) => s.replace(/\f/g, "\\f").replace(/\x08/g, "\\b").replace(/\t/g, "\\t").replace(/\r/g, "\\r");

function toHtml(value, display) {
  try {
    return katex.renderToString(value, { throwOnError: false, displayMode: display, strict: false, output: "htmlAndMathml" });
  } catch { return null; }
}

export default function MathRenderer({ children, className = "" }) {
  const text = children == null ? "" : String(children);
  const parts = useMemo(() => {
    const cleaned = repairControlChars(text);
    let segments = splitMath(cleaned);
    if (!segments.some((s) => s.type === "math") && LATEX_HINT.test(cleaned)) {
      segments = splitMath(autoWrapLatex(cleaned));
    }
    return segments.map((seg) => (seg.type === "math" ? { ...seg, html: toHtml(seg.value, seg.display) } : seg));
  }, [text]);

  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.type === "math" && p.html ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: p.html }} />
        ) : (
          <Fragment key={i}>{p.type === "math" ? p.raw : p.value}</Fragment>
        )
      )}
    </span>
  );
}
