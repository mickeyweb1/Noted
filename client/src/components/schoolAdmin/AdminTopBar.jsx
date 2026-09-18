import { Bell, Menu, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { ThemeToggle } from "../themeToggle";

const pageTitles = {
  "/admin/dashboard": "Overview",
  "/admin/admissions": "Admissions",
  "/admin/students": "My Students",
  "/admin/billing": "Billing & Plans",
  "/admin/settings": "Settings",
};

export default function AdminTopBar({ isSidebarOpen, onToggleSidebar }) {
  const { pathname } = useLocation();
  const pageTitle = pageTitles[pathname] || "Admin Workspace";

  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
        aria-label={isSidebarOpen ? "Close admin menu" : "Open admin menu"}
        aria-expanded={isSidebarOpen}
      >
        {isSidebarOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      <div className="min-w-0">
        <p className="truncate font-display text-lg font-semibold text-foreground">
          {pageTitle}
        </p>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">
          Manage your school from one place.
        </p>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="View notifications"
        >
          <Bell className="h-4 w-4" />
          <span
            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-flame"
            aria-hidden="true"
          />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
