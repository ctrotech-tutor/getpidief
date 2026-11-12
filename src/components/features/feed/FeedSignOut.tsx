"use client";
import { signOut } from "next-auth/react";
import { SignOut } from "@phosphor-icons/react";
import styles from "./feed.module.css";

export function FeedSignOut() {
  return <button type="button" className={styles.signOut} onClick={() => void signOut({ redirectTo: "/login" })}><SignOut size={18} aria-hidden="true" /> Sign out</button>;
}
