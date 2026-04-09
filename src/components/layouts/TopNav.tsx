"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useSession } from "@/hooks/useSession";
import { useUIStore } from "@/stores/index";
import { useNotificationStore } from "@/stores/index";
import { cn } from "@/lib/utils/cn";
import { getInitials } from "@/lib/utils/format";

export function TopNav() {
  const pathname               = usePathname();
  const { user, isLoading }    = useSession();
  const setCommandPaletteOpen  = useUIStore((s) => s.setCommandPaletteOpen);
  const unreadCount            = useNotificationStore((s) => s.unreadCount);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    if (avatarMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [avatarMenuOpen]);

  // Keyboard shortcut: ⌘K to open command palette
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setCommandPaletteOpen]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[300] h-[60px]
                 bg-background/90 backdrop-blur-xl border-b border-border"
    >
      <div className="h-full flex items-center gap-3 px-4 lg:px-6 max-w-screen-2xl mx-auto">
        {/* Logo */}
        <Link
          href="/explore"
          className="font-heading font-black text-lg tracking-tight text-foreground
                     hover:text-primary transition-colors shrink-0 mr-2"
        >
          getpidief
        </Link>

        {/* Search bar — center, dominant */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className={cn(
            "flex-1 max-w-[520px] hidden sm:flex items-center gap-2.5",
            "h-9 px-3.5 rounded-xl bg-secondary border border-border",
            "text-sm text-muted-foreground",
            "hover:border-ring/50 hover:bg-secondary/80 transition-all cursor-text",
            "focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
          )}
          aria-label="Search (⌘K)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0" aria-hidden>
            <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M9 9L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="flex-1 text-left truncate">
            Search by title, course, keyword…
          </span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md
                          bg-background border border-border text-xs text-muted-foreground font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Spacer */}
        <div className="flex-1 sm:hidden" />

        {/* Right side */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Mobile search */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground
                       hover:bg-secondary transition-colors"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Notifications bell */}
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground
                       hover:bg-secondary transition-colors"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path d="M9 2a5 5 0 00-5 5v2.5l-1.5 2v.5h13v-.5L14 9.5V7a5 5 0 00-5-5z"
                    stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M7 14.5a2 2 0 004 0" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full
                               bg-primary text-primary-foreground text-[10px] font-bold
                               flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>

          {/* Avatar + dropdown menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setAvatarMenuOpen((v) => !v)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-secondary transition-colors"
              aria-label="Account menu"
              aria-expanded={avatarMenuOpen}
              aria-haspopup="menu"
            >
              <Avatar user={user} isLoading={isLoading} />
            </button>

            {/* Dropdown */}
            {avatarMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-60 py-1.5
                           bg-popover border border-border rounded-xl shadow-lg z-50
                           animate-in fade-in-0 zoom-in-95 duration-150"
              >
                {/* User info */}
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.displayName || user?.name || "Scholar"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-1.5">
                    <ReputationBadge level={user?.reputationLevel} score={user?.reputationScore} />
                  </div>
                </div>

                {/* Nav links */}
                {[
                  { href: "/dashboard",  label: "Dashboard",      icon: "grid" },
                  { href: `/u/${user?.username}`, label: "View Profile", icon: "user" },
                  { href: "/dashboard/uploads",   label: "My Uploads",   icon: "upload" },
                  { href: "/settings",   label: "Settings",       icon: "settings" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    onClick={() => setAvatarMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-foreground
                               hover:bg-secondary transition-colors"
                  >
                    <NavIcon name={item.icon} />
                    {item.label}
                  </Link>
                ))}

                <div className="border-t border-border mt-1 pt-1">
                  <button
                    role="menuitem"
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm
                               text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5"
                            stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ user, isLoading }: { user: any; isLoading: boolean }) {
  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />;
  }

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName || "User avatar"}
        className="w-8 h-8 rounded-full object-cover border border-border"
      />
    );
  }

  const initials = getInitials(user?.displayName || user?.name || "S");
  return (
    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30
                    flex items-center justify-center text-xs font-bold text-primary">
      {initials}
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  scholar:               "text-muted-foreground",
  analyst:               "text-primary",
  archivist:             "text-purple-400",
  senior_contributor:    "text-[var(--gold)]",
  distinguished_scholar: "text-destructive",
};

function ReputationBadge({ level, score }: { level?: string; score?: number }) {
  const color = LEVEL_COLORS[level ?? "scholar"] ?? LEVEL_COLORS.scholar;
  const label = (level ?? "scholar").replace(/_/g, " ");
  return (
    <span className={cn("text-xs font-medium capitalize", color)}>
      ⭐ {score ?? 0} · {label}
    </span>
  );
}

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
        <rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
      </svg>
    ),
    user: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M2 12c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    upload: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M7 9V3M4.5 5.5L7 3l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 10v1.5A.5.5 0 002.5 12h9a.5.5 0 00.5-.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
    settings: (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.6 2.6l1 1M10.4 10.4l1 1M2.6 11.4l1-1M10.4 3.6l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ),
  };
  return <span className="text-muted-foreground">{icons[name]}</span>;
}
