"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { List } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import styles from "./feed.module.css";

export function FeedMoreMenu() {
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><button type="button" className={`${styles.sideLink} ${styles.moreTrigger}`}><List size={24} aria-hidden="true" /> More</button></DropdownMenuTrigger>
    <DropdownMenuContent side="top" align="start" sideOffset={10} className={styles.moreMenu} aria-label="More navigation">
      <DropdownMenuItem asChild className={styles.menuItem}><Link href="/settings">Settings</Link></DropdownMenuItem>
      <DropdownMenuItem asChild className={styles.menuItem}><Link href="/contact">Contact</Link></DropdownMenuItem>
      <DropdownMenuItem className={`${styles.menuItem} ${styles.menuSignOut}`} onSelect={() => void signOut({ redirectTo: "/login" })}>Sign out</DropdownMenuItem>
      <DropdownMenuSeparator className={styles.menuDivider} />
      <div className={styles.menuFooter}>
        <DropdownMenuItem asChild className={styles.menuFooterLink}><Link href="/about">About</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={styles.menuFooterLink}><Link href="/privacy">Privacy</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={styles.menuFooterLink}><Link href="/terms">Terms</Link></DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>;
}
