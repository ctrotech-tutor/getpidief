import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/brand/Brand";
import styles from "./auth.module.css";

export const metadata: Metadata = {
  title: { template: "%s | getpidief", default: "getpidief" },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.shell}>
      <section className={styles.formSide}>
        <header className={styles.header}><Brand /><Link href="/" className={styles.back}><ArrowLeft size={14} /> Back to home</Link></header>
        <div className={styles.formArea}><div className={styles.formInner}>{children}</div></div>
        <footer className={styles.footer}><span>© {new Date().getFullYear()} getpidief</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></div></footer>
      </section>
      <aside className={styles.editorial} aria-label="About getpidief">
        <div className={styles.asideTop}><span>THE SPACE BETWEEN<br />QUESTION &amp; UNDERSTANDING</span><span>✳</span></div>
        <div className={styles.asideCopy}><div className={styles.kicker}>A SOCIAL HOME FOR LEARNING</div><h2>Good things happen<br />{" "}<em>when we share.</em></h2><p>Questions, notes, ideas, and the people behind them. There&apos;s always more to learn together.</p></div>
        <div className={styles.asideImage}><Image src="/images/learning-table.jpg" alt="" fill sizes="(max-width: 900px) 0px, 45vw" className={styles.image} /><div className={styles.asideCard}><span>AN OPEN INVITATION</span><p>Bring what you&apos;re<br />curious about.</p><ArrowUpRight size={18} /></div></div>
        <div className={styles.asideBottom}><span>LEARNING, TOGETHER</span><span>01 / 01</span></div>
      </aside>
    </main>
  );
}
