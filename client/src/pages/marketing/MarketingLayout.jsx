import { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "../../components/themeToggle";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/school", label: "For School" },
  { to: "/student", label: "For Student" },
  { to: "/personal", label: "For Personal" },
  { to: "/pricing", label: "Pricing" },
  { to: "/contact", label: "Contact" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export default function MarketingLayout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the menu whenever the page changes
  useEffect(() => { setIsMenuOpen(false); }, [pathname]);

  // While the menu is open: Escape closes it and the page behind doesn't scroll
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setIsMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-brand-foreground">
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">

          {/* Logo (the word "Noted" hides on very small screens to make room for the buttons) */}
          <Link to="/" className={`flex shrink-0 items-center gap-2.5 rounded-lg ${focusRing}`} aria-label="Noted home">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="h-9 w-9 rounded-xl shadow-soft" />
            <span className="font-display text-lg font-bold tracking-tight max-[359px]:hidden">Noted</span>
          </Link>

          {/* Desktop navigation */}
          <nav aria-label="Main" className="hidden items-center gap-6 min-[1200px]:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `rounded text-sm transition-colors ${focusRing} ${isActive ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden items-center gap-3 min-[1200px]:flex">
            <ThemeToggle />
            <Link to="/login" className={`rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent ${focusRing}`}>Login</Link>
            <Link to="/signup" className={`inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground shadow-soft transition hover:bg-brand/90 ${focusRing}`}>
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Phone / tablet: Login and Get started stay visible; the menu button only holds the page links */}
          <div className="flex items-center gap-1.5 min-[1200px]:hidden sm:gap-2">
            <div className="hidden sm:block"><ThemeToggle /></div>
            <Link to="/login" className={`inline-flex h-10 items-center rounded-full px-3 text-sm font-medium text-foreground transition hover:bg-accent ${focusRing}`}>
              Login
            </Link>
            <Link to="/signup" className={`inline-flex h-10 items-center rounded-full bg-brand px-3.5 text-sm font-semibold text-brand-foreground shadow-soft transition hover:bg-brand/90 sm:px-4 ${focusRing}`}>
              Get started
            </Link>
            <button
              type="button"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => setIsMenuOpen((open) => !open)}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background transition hover:bg-accent ${focusRing}`}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu: page links only (scrolls if the screen is short) */}
        {isMenuOpen && (
          <div id="mobile-menu" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-4 py-3 shadow-lg animate-in fade-in slide-in-from-top-2 min-[1200px]:hidden">
            <nav aria-label="Mobile" className="flex flex-col">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `flex min-h-12 items-center rounded-xl px-3 text-base font-medium transition-colors ${focusRing} ${isActive ? "bg-brand-soft text-brand" : "text-foreground hover:bg-accent"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-2 flex items-center justify-between border-t border-border px-3 pt-3 sm:hidden">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        )}
      </header>

      <main id="main">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-10 sm:px-6 lg:px-8 lg:pt-14">
          <div className="landing-interactive group relative isolate overflow-hidden rounded-[28px] border border-white/10 bg-slate-900 px-6 py-10 shadow-2xl sm:px-10 lg:px-12 lg:py-12">
            <img
              src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1800&q=80"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 z-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-slate-950/90 via-slate-950/75 to-slate-950/55" />

            <div className="relative z-10 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <Link to="/" className={`mb-5 inline-flex items-center gap-3 rounded-lg ${focusRing}`} aria-label="Noted home">
                  <img src="/favicon.svg" alt="" aria-hidden="true" className="h-10 w-10 rounded-xl shadow-soft" />
                  <span className="font-display text-2xl font-bold tracking-tight">Noted</span>
                </Link>
                <p className="text-sm leading-6 text-white/80 sm:text-base">
                  Study smarter with clear notes, useful summaries, and tools that help you focus.
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-3 min-[420px]:flex-row">
                <Link to="/signup" className={`inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-brand shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-white/90 ${focusRing}`}>Start learning</Link>
                <Link to="/contact" className={`inline-flex items-center justify-center rounded-full border border-white/40 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:bg-white/20 ${focusRing}`}>Talk to us</Link>
              </div>
            </div>

            <a
              href="https://unsplash.com/license"
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-3 right-4 z-10 text-xs text-white/60 underline underline-offset-2 transition-colors hover:text-white"
            >
              Photo via Unsplash
            </a>
          </div>

          <div className="flex flex-col gap-5 pt-7 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Noted. Built for better learning.</p>
            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link to="/about" className="transition-colors hover:text-white">About</Link>
              <Link to="/school" className="transition-colors hover:text-white">Schools</Link>
              <Link to="/pricing" className="transition-colors hover:text-white">Pricing</Link>
              <Link to="/contact" className="transition-colors hover:text-white">Contact</Link>
              <Link to="/login" className="transition-colors hover:text-white">Login</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
