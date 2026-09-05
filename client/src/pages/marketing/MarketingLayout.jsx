import { useState } from "react";
import { AudioLines, ArrowRight, Menu, X } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { ThemeToggle } from "../../components/themeToggle"; // Adjust path if needed

const navItems = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/school", label: "For School" },
  { to: "/student", label: "For Student" }, 
  { to: "/personal", label: "For Personal" },
  { to: "/contact", label: "Contact" },
];

export default function MarketingLayout({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          
          {/* 1. LOGO */}
          <Link to="/" className="flex items-center gap-3" onClick={() => setIsMenuOpen(false)}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-soft">
              <AudioLines className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              Noted
            </span>
          </Link>

          {/* 2. DESKTOP NAVIGATION (Hidden at 800px and below) */}
          <nav className="hidden [@media(min-width:871px)]:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `text-sm transition-colors ${
                    isActive
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* 3. DESKTOP ACTIONS (Hidden at 800px and below) */}
          <div className="hidden [@media(min-width:871px)]:flex items-center gap-3">
            <ThemeToggle />
            <Link
              to="/login"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-95"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* 4. MOBILE MENU BUTTON (Shows ONLY at 800px and below) */}
          <div className="flex items-center gap-2 [@media(min-width:871px)]:hidden">
            <ThemeToggle />
            <button
              type="button"
              aria-label="Toggle navigation"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background transition hover:bg-accent"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* 5. MOBILE DROPDOWN MENU (Slides down when open, only visible <= 800px) */}
        {isMenuOpen && (
          <div className="[@media(min-width:871px)]:hidden border-t border-border bg-background px-4 py-6 shadow-lg">
            <nav className="flex flex-col gap-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => setIsMenuOpen(false)} // Close menu when a link is clicked
                  className={({ isActive }) =>
                    `text-base font-medium transition-colors ${
                      isActive
                        ? "text-brand"
                        : "text-muted-foreground hover:text-foreground"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              
              <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full rounded-full border border-border px-4 py-3 text-center text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-95"
                >
                  Get started
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>{children}</main>

      {/* 6. FOOTER */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                  <AudioLines className="h-5 w-5" />
                </div>
                <span className="font-display text-2xl font-bold">Noted</span>
              </div>
              <p className="text-muted-foreground">
                Study smarter with AI-powered notes, lightning-fast summaries,
                and tools built for better focus.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-95"
              >
                Start learning
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition hover:bg-accent"
              >
                Talk to us
              </Link>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Noted. Built for better learning.</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/about" className="hover:text-foreground transition">About</Link>
              <Link to="/contact" className="hover:text-foreground transition">Contact</Link>
              <Link to="/school" className="hover:text-foreground transition">Schools</Link>
              <Link to="/parents" className="hover:text-foreground transition">Parents</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}