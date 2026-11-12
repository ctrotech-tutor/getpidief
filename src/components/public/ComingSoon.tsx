import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import { PublicShell } from "./PublicShell";
import styles from "./pages.module.css";

export function ComingSoon({ label, title, description }: { label: string; title: string; description: string }) {
  return <PublicShell><section className={styles.hero}><div className={styles.eyebrow}>{label}</div><div><h1>{title}</h1><p className={styles.lead}>{description}</p><div className={styles.heroLinks}><Link href="/about" className={styles.button}>Read our story <ArrowRight size={17} /></Link><Link href="/feed-preview" className={styles.textLink}>Explore the preview ↗</Link></div></div></section><section className={styles.split}><div className={styles.eyebrow}>IN THE MEANTIME</div><div><h2>See what we&apos;re building.</h2><p>Explore the sample feed for a glimpse of the direction. It&apos;s a prototype, so its sample interactions won&apos;t be saved.</p></div></section></PublicShell>;
}
