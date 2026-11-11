"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { Brand } from "@/components/brand/Brand";
import styles from "./state.module.css";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <main className={styles.page}><div className={styles.top}><Brand /></div><div className={styles.content}><span className={styles.label}>SOMETHING WENT WRONG</span><h1 className={styles.heading}>Let&apos;s try that again.</h1><p className={styles.text}>Something didn&apos;t load as expected. Try again, or return home and start from there.</p><div className={styles.links}><button className={styles.primary} onClick={reset}>Try again</button><Link className={styles.secondary} href="/">Go to home</Link></div>{error.digest && <p className={styles.ref}>Error reference: {error.digest}</p>}</div></main>;
}
