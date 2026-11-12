"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { List, GearSix, EnvelopeSimple, SignOut, BookmarkSimple, SquaresFour, UploadSimple, MagnifyingGlass, ShieldCheck } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "./feed.module.css";

export function FeedMoreMenu({ canModerate = false }: { canModerate?: boolean }) {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><button type="button" className={`${styles.sideLink} ${styles.moreTrigger}`}><List size={21} aria-hidden="true" /> More</button></DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="start" sideOffset={10} className={styles.moreMenu} aria-label="More navigation">
      <DropdownMenuItem asChild className={styles.menuItem}><Link href="/?view=saved"><BookmarkSimple aria-hidden="true" /> Saved posts</Link></DropdownMenuItem>
      <DropdownMenuItem asChild className={styles.menuItem}><Link href="/search"><MagnifyingGlass aria-hidden="true" /> Search resources</Link></DropdownMenuItem>
      <DropdownMenuItem asChild className={styles.menuItem}><Link href="/dashboard"><SquaresFour aria-hidden="true" /> Dashboard</Link></DropdownMenuItem>
      <DropdownMenuItem asChild className={styles.menuItem}><Link href="/dashboard/uploads"><UploadSimple aria-hidden="true" /> My uploads</Link></DropdownMenuItem>
      {canModerate && <DropdownMenuItem asChild className={styles.menuItem}><Link href="/admin"><ShieldCheck aria-hidden="true" /> Moderation</Link></DropdownMenuItem>}
      <DropdownMenuSeparator className={styles.menuDivider} />
      <DropdownMenuItem asChild className={styles.menuItem}><Link href="/settings"><GearSix aria-hidden="true" /> Settings</Link></DropdownMenuItem>
      <DropdownMenuItem asChild className={styles.menuItem}><Link href="/contact"><EnvelopeSimple aria-hidden="true" /> Contact</Link></DropdownMenuItem>
      <DropdownMenuItem className={`${styles.menuItem} ${styles.menuSignOut}`} onSelect={() => void signOut({ redirectTo: "/login" })}><SignOut aria-hidden="true" /> Sign out</DropdownMenuItem>
      <DropdownMenuSeparator className={styles.menuDivider} />
      <div className={styles.menuFooter}>
        <DropdownMenuItem asChild className={styles.menuFooterLink}><Link href="/about">About</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={styles.menuFooterLink}><Link href="/privacy">Privacy</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={styles.menuFooterLink}><Link href="/terms">Terms</Link></DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>;
}
