import Link from "next/link";
import Image from "next/image";
import { ArrowDown, ArrowRight, BookmarkSimple as Bookmark, FileText, ChatCircle as MessageCircle, BookOpenText as Sparkles } from "@phosphor-icons/react/ssr";
import { PublicHeader, PublicFooter } from "@/components/public/PublicShell";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.page}>
      <div className={styles.announcement}><span className={styles.statusDot} /> A little more human. A lot more learning. <Link href="/feed-preview">Explore the preview <ArrowRight size={13} /></Link></div>
      <PublicHeader />

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <div className={styles.eyebrow}><span /> FOR THE CURIOUS, EVERYWHERE</div>
          <h1 id="hero-title">Learning is<br />{" "}<em>better together.</em></h1>
          <p>A place to share what you know, find what you need, and learn alongside people who get it.</p>
          <div className={styles.heroActions}><Link className={styles.primaryButton} href="/register">Get started <ArrowRight size={18} /></Link><Link className={styles.textButton} href="/feed-preview">Take a look around <span>↗</span></Link></div>
          <div className={styles.heroNote}><span className={styles.noteIcon}><Sparkles size={14} /></span> Built for the questions, notes, and ideas in between.</div>
        </div>
        <div className={styles.heroVisual} aria-label="An illustration of sharing notes and questions">
          <div className={styles.imageWrap}><Image src="/images/learning-table.jpg" alt="A study table with an open notebook and a book" fill priority sizes="(max-width: 800px) 90vw, 42vw" className={styles.photo} /><div className={styles.photoLabel}><span>THE STUDY SPACE</span><span>01 / 03</span></div></div>
          <div className={styles.floatingNote}><div className={styles.cardTop}><span className={styles.avatar}>M</span><span><strong>Maya</strong><small>Learning in public</small></span><span className={styles.cardDots}>•••</span></div><p>Does anyone have a good way to make sense of this topic?</p><div className={styles.cardBottom}><MessageCircle size={15} /> A question worth sharing <Bookmark size={15} /></div></div>
          <div className={styles.paperTag}><FileText size={17} /><span><strong>Shared notes</strong><small>Made to be passed on</small></span><span>↗</span></div>
          <span className={styles.visualCaption}>A glimpse of the idea, not a live feed.</span>
        </div>
        <a href="#the-idea" className={styles.scrollCue}><span>SCROLL TO DISCOVER</span><ArrowDown size={15} /></a>
      </section>

      <section id="the-idea" className={styles.manifesto}>
        <div className={styles.sectionLabel}><span>01</span> THE IDEA</div>
        <div><h2>Good ideas shouldn&apos;t<br />{" "}study alone<span>.</span></h2><p>The best learning often starts with someone else&apos;s question, a useful note, or a conversation that makes something click. getpidief brings those moments together.</p></div>
        <div className={styles.manifestoAside}><span>•</span><p>Less searching alone.<br />More figuring it out together.</p></div>
      </section>

      <section id="how-it-works" className={styles.how}>
        <div className={styles.howHeader}><div className={styles.sectionLabel}><span>02</span> HOW IT FITS TOGETHER</div><h2>A social space<br />{" "}<em>with a purpose.</em></h2><p>Bring your curiosity. Leave with something useful.</p></div>
        <div className={styles.steps}>
          <article><div className={styles.stepNumber}>01 <span>↗</span></div><h3>Find your people.</h3><p>Discover learners, perspectives and conversations around the things you care about.</p></article>
          <article><div className={styles.stepNumber}>02 <span>•</span></div><h3>Share what helps.</h3><p>Put a question out there, share an idea, or pass along notes worth keeping.</p></article>
          <article><div className={styles.stepNumber}>03 <span>↙</span></div><h3>Keep learning.</h3><p>Save the useful bits, come back to them, and keep the conversation going.</p></article>
        </div>
      </section>

      <section className={styles.finalCta}><div><div className={styles.sectionLabel}><span>03</span> YOUR NEXT CHAPTER</div><h2>Curiosity looks<br />{" "}<em>good on you.</em></h2><p>Come with a question. See where it takes you.</p><Link className={styles.lightButton} href="/register">Create your account <ArrowRight size={17} /></Link></div><div className={styles.ctaMark} aria-hidden="true">g<span>.</span></div></section>
      <PublicFooter />
    </main>
  );
}
