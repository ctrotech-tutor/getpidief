"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";

interface DashboardSidebarProps {
  user: {
    id:              string;
    username:        string;
    displayName:     string;
    avatarUrl?:      string | null;
    reputationScore: number;
    reputationLevel: string;
    institutionId?:  string | null;
    documentCount:   number;
    followerCount:   number;
  };
}

const NAV_ITEMS = [
  { href: "/dashboard",          label: "Overview",      icon: "grid"     },
  { href: "/dashboard/library",  label: "My Library",    icon: "bookmark" },
  { href: "/dashboard/uploads",  label: "My Uploads",    icon: "upload"   },
  { href: "/dashboard/following",label: "Following",     icon: "users"    },
  { href: "/notifications",      label: "Notifications", icon: "bell"     },
  null, // divider
  { href: "/settings",           label: "Settings",      icon: "settings" },
];

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();

  const initials = (user.displayName ?? "?").split(" ").slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "").join("");

  const levelLabel = (user.reputationLevel ?? "scholar").replace(/_/g, " ");

  return (
    <div className="space-y-4">
      {/* User card */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={`${user.displayName} avatar`}
                width={48}
                height={48}
                className="w-full h-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span className="text-base font-bold text-primary">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{user.displayName}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[var(--gold)]">⭐</span>
          <span className="font-medium text-foreground">{formatNumber(user.reputationScore)}</span>
          <span className="text-muted-foreground capitalize">· {levelLabel}</span>
        </div>

        <div className="flex gap-4 text-xs text-muted-foreground">
          <span><strong className="text-foreground">{user.documentCount}</strong> docs</span>
          <span><strong className="text-foreground">{formatNumber(user.followerCount)}</strong> followers</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5">
        {NAV_ITEMS.map((item, idx) => {
          if (!item) {
            return <div key={`div-${idx}`} className="h-px bg-border my-2" />;
          }
          const isActive = pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium
                     text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <NavIcon name="logout" />
          Sign Out
        </button>
      </nav>
    </div>
  );
}

function NavIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    grid: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>,
    bookmark: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2a1 1 0 011-1h8a1 1 0 011 1v11L7 10 2 13V2z" stroke="currentColor" strokeWidth="1.3"/></svg>,
    upload: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 9V2M4 5l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 10v2h10v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
    users: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M1 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="11" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M11 9c1.1 0 2 .9 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
    bell: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2a4 4 0 00-4 4v2L2 9.5V10h10v-.5L11 8V6a4 4 0 00-4-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><path d="M5.5 11a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.2"/></svg>,
    settings: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1 1M10.1 10.1l1 1M2.9 11.1l1-1M10.1 3.9l1-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
    logout: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h2M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  };
  return <span className="shrink-0">{icons[name] ?? null}</span>;
}