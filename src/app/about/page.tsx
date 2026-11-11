import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PublicShell } from "@/components/public/PublicShell";
import styles from "@/components/public/pages.module.css";

export const metadata: Metadata = { title: "About getpidief", description: "The idea behind getpidief, a social home for learning." };

export default function AboutPage() {
  return <PublicShell>
    <section className={styles.hero}><div className={styles.eyebrow}>OUR STORY</div><div><h1>Learning was never meant to be a <em>solo act.</em></h1><p className={styles.lead}>A question in a group chat. A set of notes passed to a friend. A conversation that finally makes something click. Those little exchanges can change how we learn.</p><div className={styles.heroLinks}><Link href="/feed-preview" className={styles.button}>Explore the preview <ArrowRight size={17} /></Link><Link href="/contact" className={styles.textLink}>Get in touch ↗</Link></div></div></section>
    <section className={styles.split}><div className={styles.eyebrow}>THE IDEA</div><div><h2>Make room for what happens between the pages.</h2><p>getpidief is being built as a social space for learning. Not just a place to find a document, but a place to ask, share, discover, and come back to the people and ideas that help you grow.</p><p>We&apos;re starting with university learners and building with a wider world of curious people in mind. Wherever you are, what you know and what you&apos;re trying to understand both have a place here.</p></div></section>
    <section className={styles.callout}><div className={styles.split}><div className={styles.eyebrow}>WHAT GUIDES US</div><div><h2>Useful things are better when they travel.</h2><div className={styles.principles}><article><span>01 / PEOPLE FIRST</span><h3>Learning is social.</h3><p>A good question deserves a conversation, not just a search result.</p></article><article><span>02 / SHARE WITH CARE</span><h3>Give credit. Stay curious.</h3><p>Share material you have the right to share and make space for different perspectives.</p></article><article><span>03 / KEEP IT OPEN</span><h3>Curiosity belongs everywhere.</h3><p>Learning doesn&apos;t stop at a campus, a discipline, or a border.</p></article></div></div></div></section>
    <section className={styles.split}><div className={styles.eyebrow}>COME SEE FOR YOURSELF</div><div><h2>There&apos;s more to figure out together.</h2><p>We&apos;re still building. The feed preview is a look at the direction, with sample content and interactions that don&apos;t persist.</p><div className={styles.heroLinks}><Link className={styles.button} href="/feed-preview">Take a look <ArrowRight size={17} /></Link><Link className={styles.textLink} href="/register">Create an account ↗</Link></div></div></section>
  </PublicShell>;
}
