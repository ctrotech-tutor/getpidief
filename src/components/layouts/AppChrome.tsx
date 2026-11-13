"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/layouts/TopNav";
import { MobileBottomTabs } from "@/components/layouts/MobileBottomTabs";
import { CommandPalette } from "@/components/layouts/CommandPalette";
import type { ReactNode } from "react";
import styles from "@/components/features/feed/feed.module.css";

/** Only the feed has its own navigation. Other app routes keep their existing shell. */
export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFeed = pathname === "/" || pathname === "/home";
  return <div className="min-h-screen bg-background">
    {!isFeed && <TopNav />}
    <main className={isFeed ? styles.feedMain : "pt-[60px] pb-[60px] lg:pb-0 min-h-screen"}>{children}</main>
    <div className={isFeed ? styles.feedMobileTabs : undefined}><MobileBottomTabs /></div>
    <CommandPalette />
  </div>;
}
