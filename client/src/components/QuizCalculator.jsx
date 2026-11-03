import { useState, useEffect, useRef } from "react";
import { Calculator, X, Delete } from "lucide-react";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/* ------------------------------------------------------------------ */
/* Math engine. A small parser, so nothing is ever run with eval().     */
/* Supports + - × ÷ ^ ( ), sin cos tan log ln √, π, e, Ans, and         */
/* implicit multiplication such as 2π, 3(4+5) or 2sin(30).              */
/* ------------------------------------------------------------------ */
const tokenize = (src) => {
  const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-").replace(/\s+/g, "");
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const rest = s.slice(i);
    let m;
    if ((m = rest.match(/^(\d+\.?\d*|\.\d+)/))) {
      tokens.push({ t: "num", v: parseFloat(m[1]) });
      i += m[1].length;
    } else if ((m = rest.match(/^(sin|cos|tan|log|ln|Ans)/))) {
      tokens.push(m[1] === "Ans" ? { t: "ans" } : { t: "fn", v: m[1] });
      i += m[1].length;
    } else if (rest[0] === "√") {
      tokens.push({ t: "fn", v: "sqrt" });
      i += 1;
    } else if (rest[0] === "π") {
      tokens.push({ t: "const", v: Math.PI });
      i += 1;
    } else if (rest[0] === "e") {
      tokens.push({ t: "const", v: Math.E });
      i += 1;
    } else if ("+-*/^()".includes(rest[0])) {
      tokens.push({ t: rest[0] });
      i += 1;
    } else {
      throw new Error("Syntax error");
    }
  }
  return tokens;
};

const tidyTrig = (v) => (Math.abs(v) < 1e-12 ? 0 : v); // sin(180°) should be 0, not 1.2e-16

const evaluate = (src, { degrees, ans }) => {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++];
  const toRad = (x) => (degrees ? (x * Math.PI) / 180 : x);
  const startsOperand = (tok) => tok && ["num", "const", "ans", "fn", "("].includes(tok.t);

  const applyFn = (name, x) => {
    switch (name) {
      case "sin": return tidyTrig(Math.sin(toRad(x)));
      case "cos": return tidyTrig(Math.cos(toRad(x)));
      case "tan": {
        const c = Math.cos(toRad(x));
        if (Math.abs(c) < 1e-12) throw new Error("Undefined");
        return tidyTrig(Math.sin(toRad(x)) / c);
      }
      case "log":
        if (x <= 0) throw new Error("Invalid input");
        return Math.log10(x);
      case "ln":
        if (x <= 0) throw new Error("Invalid input");
        return Math.log(x);
      case "sqrt":
        if (x < 0) throw new Error("Invalid input");
        return Math.sqrt(x);
      default:
        throw new Error("Syntax error");
    }
  };

  const parseExpr = () => {
    let v = parseTerm();
    while (peek() && (peek().t === "+" || peek().t === "-")) {
      const op = next().t;
      const r = parseTerm();
      v = op === "+" ? v + r : v - r;
    }
    return v;
  };

  const parseTerm = () => {
    let v = parseUnary();
    for (;;) {
      const tok = peek();
      if (tok && (tok.t === "*" || tok.t === "/")) {
        next();
        const r = parseUnary();
        if (tok.t === "/") {
          if (r === 0) throw new Error("Cannot divide by zero");
          v /= r;
        } else {
          v *= r;
        }
      } else if (startsOperand(tok)) {
        v *= parseUnary(); // implicit multiplication
      } else {
        break;
      }
    }
    return v;
  };

  const parseUnary = () => {
    const tok = peek();
    if (tok && tok.t === "-") { next(); return -parseUnary(); }
    if (tok && tok.t === "+") { next(); return parseUnary(); }
    return parsePower();
  };

  const parsePower = () => {
    const base = parsePrimary();
    if (peek() && peek().t === "^") {
      next();
      return Math.pow(base, parseUnary());
    }
    return base;
  };

  const parsePrimary = () => {
    const tok = next();
    if (!tok) throw new Error("Incomplete expression");
    if (tok.t === "num" || tok.t === "const") return tok.v;
    if (tok.t === "ans") {
      if (ans == null) throw new Error("No previous answer");
      return ans;
    }
    if (tok.t === "(") {
      const v = parseExpr();
      if (peek() && peek().t === ")") next(); // a missing ")" at the end is closed for you
      return v;
    }
    if (tok.t === "fn") {
      if (!peek() || peek().t !== "(") throw new Error("Syntax error");
      next();
      const arg = parseExpr();
      if (peek() && peek().t === ")") next();
      return applyFn(tok.v, arg);
    }
    throw new Error("Syntax error");
  };

  const result = parseExpr();
  if (pos < tokens.length) throw new Error("Syntax error");
  if (!Number.isFinite(result)) throw new Error("Math error");
  return result;
};

const cleanNumber = (n) => (Math.abs(n) < 1e-12 ? 0 : Number(n.toPrecision(12)));

const formatNumber = (n) => {
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-6)) return n.toExponential(6).replace(/\.?0+e/, "e");
  return String(n);
};

/* ------------------------------------------------------------------ */
/* UI                                                                   */
/* ------------------------------------------------------------------ */
const TONES = {
  num: "bg-muted text-foreground hover:bg-accent",
  op: "bg-brand-soft text-brand hover:bg-brand/20",
  fn: "border border-border bg-card text-sm text-foreground hover:bg-accent",
  clear: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  eq: "bg-brand text-brand-foreground hover:bg-brand/90",
};

function Key({ children, onClick, tone = "num", label, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-10 items-center justify-center rounded-lg text-base font-semibold transition active:scale-95 ${focusRing} ${TONES[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Floating calculator for the quiz page.
 * `raised` lifts the button so it sits above the Previous/Next bar in one-by-one quizzes.
 * It is not a full-screen modal: the question stays visible while the student calculates.
 */
export default function QuizCalculator({ raised = false }) {
  const [open, setOpen] = useState(false);
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  const [ans, setAns] = useState(null);
  const [degrees, setDegrees] = useState(true); // most school exams use degrees
  const [error, setError] = useState("");
  const [done, setDone] = useState(false); // true right after "="

  const panelRef = useRef(null);
  const openButtonRef = useRef(null);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    // give focus back to the button the student opened it from
    setTimeout(() => openButtonRef.current?.focus(), 0);
  };

  // After "=", a number or function starts a new sum; an operator carries on from the answer.
  const insert = (text, isOperator = false) => {
    setError("");
    setResult("");
    setExpr((prev) => (done ? (isOperator ? `Ans${text}` : text) : prev + text));
    setDone(false);
  };

  const point = () => {
    if (!done && /\d*\.\d*$/.test(expr)) return; // this number already has a decimal point
    insert(done || !/\d$/.test(expr) ? "0." : ".");
  };

  const clearAll = () => {
    setExpr("");
    setResult("");
    setError("");
    setDone(false);
  };

  const backspace = () => {
    setError("");
    setResult("");
    setDone(false);
    setExpr((prev) => prev.replace(/(sin\(|cos\(|tan\(|log\(|ln\(|√\(|Ans|.)$/, ""));
  };

  const equals = () => {
    if (!expr.trim()) return;
    try {
      const value = cleanNumber(evaluate(expr, { degrees, ans }));
      setAns(value);
      setResult(formatNumber(value));
      setError("");
      setDone(true);
    } catch (err) {
      setError(err.message || "Error");
      setResult("");
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const onButton = e.target.tagName === "BUTTON"; // let Enter/Space still press the focused button
    const k = e.key;
    if (/^\d$/.test(k)) { e.preventDefault(); insert(k); }
    else if (k === ".") { e.preventDefault(); point(); }
    else if (k === "+") { e.preventDefault(); insert("+", true); }
    else if (k === "-") { e.preventDefault(); insert("−", true); }
    else if (k === "*") { e.preventDefault(); insert("×", true); }
    else if (k === "/") { e.preventDefault(); insert("÷", true); }
    else if (k === "^") { e.preventDefault(); insert("^", true); }
    else if (k === "(" || k === ")") { e.preventDefault(); insert(k); }
    else if (k === "=" || (k === "Enter" && !onButton)) { e.preventDefault(); equals(); }
    else if (k === "Backspace") { e.preventDefault(); backspace(); }
    else if (k === "Delete") { e.preventDefault(); clearAll(); }
  };

  if (!open) {
    return (
      <button
        ref={openButtonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open calculator"
        title="Calculator"
        className={`fixed right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition hover:bg-brand/90 active:scale-95 ${focusRing} ${
          raised ? "bottom-24" : "bottom-4"
        }`}
      >
        <Calculator className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label="Calculator"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={`fixed right-4 z-40 max-h-[85dvh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-2xl focus:outline-none animate-in fade-in zoom-in-95 duration-150 ${
        raised ? "bottom-24" : "bottom-4"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calculator className="h-4 w-4 text-brand" /> Calculator
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDegrees((d) => !d)}
            aria-pressed={degrees}
            aria-label={degrees ? "Angles in degrees. Switch to radians" : "Angles in radians. Switch to degrees"}
            className={`rounded-md border border-border px-2 py-1 text-xs font-bold text-foreground transition hover:bg-accent ${focusRing}`}
          >
            {degrees ? "DEG" : "RAD"}
          </button>
          <button
            type="button"
            onClick={close}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground ${focusRing}`}
          >
            <X className="h-3.5 w-3.5" /> Close
          </button>
        </div>
      </div>

      <div className="mb-3 rounded-xl bg-muted p-3 text-right" aria-live="polite">
        <p className="min-h-5 break-all font-mono text-sm text-muted-foreground">{expr || "\u00A0"}</p>
        <p className={`min-h-8 break-all font-mono font-bold ${error ? "text-base text-destructive" : "text-2xl text-foreground"}`}>
          {error || result || (expr ? "\u00A0" : "0")}
        </p>
      </div>

      <div className="mb-2 grid grid-cols-5 gap-1.5">
        <Key tone="fn" onClick={() => insert("sin(")} label="Sine">sin</Key>
        <Key tone="fn" onClick={() => insert("cos(")} label="Cosine">cos</Key>
        <Key tone="fn" onClick={() => insert("tan(")} label="Tangent">tan</Key>
        <Key tone="fn" onClick={() => insert("log(")} label="Log base 10">log</Key>
        <Key tone="fn" onClick={() => insert("ln(")} label="Natural log">ln</Key>
        <Key tone="fn" onClick={() => insert("√(")} label="Square root">√</Key>
        <Key tone="fn" onClick={() => insert("^2", true)} label="Square">x²</Key>
        <Key tone="fn" onClick={() => insert("^", true)} label="Power">xʸ</Key>
        <Key tone="fn" onClick={() => insert("π")} label="Pi">π</Key>
        <Key tone="fn" onClick={() => insert("e")} label="Euler's number">e</Key>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Key tone="clear" onClick={clearAll} label="Clear">C</Key>
        <Key tone="op" onClick={backspace} label="Backspace"><Delete className="h-4 w-4" /></Key>
        <Key tone="op" onClick={() => insert("(")} label="Open bracket">(</Key>
        <Key tone="op" onClick={() => insert(")")} label="Close bracket">)</Key>

        <Key onClick={() => insert("7")}>7</Key>
        <Key onClick={() => insert("8")}>8</Key>
        <Key onClick={() => insert("9")}>9</Key>
        <Key tone="op" onClick={() => insert("÷", true)} label="Divide">÷</Key>

        <Key onClick={() => insert("4")}>4</Key>
        <Key onClick={() => insert("5")}>5</Key>
        <Key onClick={() => insert("6")}>6</Key>
        <Key tone="op" onClick={() => insert("×", true)} label="Multiply">×</Key>

        <Key onClick={() => insert("1")}>1</Key>
        <Key onClick={() => insert("2")}>2</Key>
        <Key onClick={() => insert("3")}>3</Key>
        <Key tone="op" onClick={() => insert("−", true)} label="Subtract">−</Key>

        <Key onClick={() => insert("0")}>0</Key>
        <Key onClick={point} label="Decimal point">.</Key>
        <Key tone="op" onClick={() => insert("Ans")} label="Previous answer">Ans</Key>
        <Key tone="op" onClick={() => insert("+", true)} label="Add">+</Key>

        <Key tone="eq" onClick={equals} label="Equals" className="col-span-4">=</Key>
      </div>
    </div>
  );
}
