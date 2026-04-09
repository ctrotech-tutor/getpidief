"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { useNotificationStore } from "@/stores/index";

const TABS = [
  {
    href:  "/explore",
    label: "Home",
    icon:  (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M3 9.5L11 3l8 6.5V19a1 1 0 01-1 1H14v-5h-4v5H4a1 1 0 01-1-1V9.5z"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
              fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.15 : 0}/>
      </svg>
    ),
  },
  {
    href:  "/search",
    label: "Search",
    icon:  (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <circle cx="9.5" cy="9.5" r="6" stroke="currentColor" strokeWidth="1.6"
                fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.1 : 0}/>
        <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href:  "/dashboard/uploads",
    label: "Upload",
    icon:  (_active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M11 7v8M8 10l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    highlight: true,
  },
  {
    href:  "/dashboard/library",
    label: "Library",
    icon:  (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M5 4h12a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z"
              stroke="currentColor" strokeWidth="1.6"
              fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.1 : 0}/>
        <path d="M9 4v9l2-1.5L13 13V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href:    "/notifications",
    label:   "Alerts",
    icon:    (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <path d="M11 3a7 7 0 00-7 7v3.5L2.5 15v.5h17V15L18 13.5V10a7 7 0 00-7-7z"
              stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
              fill={active ? "currentColor" : "none"} fillOpacity={active ? 0.1 : 0}/>
        <path d="M9 19a2 2 0 004 0" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
    showBadge: true,
  },
] as const;

export function MobileBottomTabs() {
  const pathname    = usePathname();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[300] lg:hidden
                 bg-background/95 backdrop-blur-xl border-t border-border
                 pb-[env(safe-area-inset-bottom)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl min-w-[56px]",
                "transition-colors duration-150",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
                (tab as any).highlight && !isActive && "text-primary"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              {/* Icon */}
              <span className={cn((tab as any).highlight && "rounded-full bg-primary/10 p-1")}>
                {tab.icon(isActive)}
              </span>

              {/* Label */}
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>

              {/* Notification badge */}
              {(tab as any).showBadge && unreadCount > 0 && (
                <span className="absolute top-1 right-2 min-w-[16px] h-4 px-1 rounded-full
                                 bg-primary text-primary-foreground text-[9px] font-bold
                                 flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
