"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- A document navigation must work even when the root router/layout failed. */
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import styles from "./state.module.css";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return <html lang="en"><body style={{ margin: 0 }}><main className={styles.page}><div className={styles.content}><span className={styles.label}>GETPIDIEF</span><h1 className={styles.heading}>Something went wrong.</h1><p className={styles.text}>We couldn&apos;t load this page. Please try again, or return home.</p><div className={styles.links}><button className={styles.primary} onClick={reset}>Try again</button><a className={styles.secondary} href="/">Go to home</a></div>{error.digest && <p className={styles.ref}>Error reference: {error.digest}</p>}</div></main></body></html>;
}
