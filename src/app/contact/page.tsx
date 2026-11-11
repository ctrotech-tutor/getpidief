import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/public/PublicShell";
import styles from "@/components/public/pages.module.css";

export const metadata: Metadata = { title: "Contact getpidief", description: "Get in touch with the getpidief team." };
export default function ContactPage() {
  return <PublicShell><section className={styles.hero}><div className={styles.eyebrow}>GET IN TOUCH</div><div><h1>Let&apos;s <em>talk.</em></h1><p className={styles.lead}>Have a question, an idea, or something you think we should know? We&apos;d love to hear from you.</p><div className={styles.contactCards}><a className={styles.contactCard} href="mailto:support@getpidief.me"><span>QUESTIONS &amp; FEEDBACK ↗</span><strong>support@getpidief.me</strong><p>For questions about getpidief or feedback on your experience.</p></a><a className={styles.contactCard} href="mailto:partnerships@getpidief.me"><span>WORKING TOGETHER ↗</span><strong>partnerships@getpidief.me</strong><p>For partnership conversations and other ways to collaborate.</p></a></div></div></section><section className={styles.split}><div className={styles.eyebrow}>LOOKING FOR MORE?</div><div><h2>Get to know the idea.</h2><p>Learn why we&apos;re building getpidief and take a look at the social experience we&apos;re working toward.</p><div className={styles.heroLinks}><Link href="/about" className={styles.textLink}>Our story ↗</Link><Link href="/feed-preview" className={styles.textLink}>Explore the preview ↗</Link></div></div></section></PublicShell>;
}
