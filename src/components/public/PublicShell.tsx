import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { Brand } from "@/components/brand/Brand";
import { PageContainer } from "@/components/layouts/PageContainer/PageContainer";
import styles from "./public.module.css";

const links = [
  { href: "/about", label: "Our story" },
  { href: "/#how-it-works", label: "The idea" },
  { href: "/feed-preview", label: "Explore preview" },
];

export function PublicHeader() {
  return <header>
    <PageContainer className={styles.headerWrap}><div className={styles.header}>
      <Brand />
      <nav className={styles.desktopNav} aria-label="Main navigation">{links.map(link => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className={styles.actions}><Link href="/login" className={styles.login}>Log in</Link><Link href="/register" className={styles.join}>Join <span>getpidief</span><span className={styles.joinArrow}><ArrowUpRight size={16} /></span></Link></div>
      <details className={styles.mobileMenu}>
        <summary aria-label="Navigation menu"><span></span><span></span></summary>
        <nav aria-label="Mobile navigation">{links.map((link, i) => <Link key={link.href} href={link.href}><span>0{i + 1}</span>{link.label}<ArrowUpRight size={17} /></Link>)}<Link href="/login"><span>04</span>Log in<ArrowUpRight size={17} /></Link><Link href="/register"><span>05</span>Create account<ArrowUpRight size={17} /></Link></nav>
      </details>
    </div></PageContainer>
  </header>;
}

export function PublicFooter() {
  return <footer className={styles.footer}><div className={styles.footerTop}><div className={styles.footerIntro}><Brand /><p>A social home for learning.<br />For the curious, everywhere.</p></div><div className={styles.footerGroup}><span>EXPLORE</span><Link href="/about">Our story</Link><Link href="/feed-preview">Explore preview</Link><Link href="/contact">Get in touch</Link></div><div className={styles.footerGroup}><span>THE DETAILS</span><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link></div><div className={styles.footerGroup}><span>YOUR ACCOUNT</span><Link href="/login">Log in</Link><Link href="/register">Create account <ArrowRight size={13} /></Link></div></div><div className={styles.footerBottom}><span>© {new Date().getFullYear()} getpidief</span><span>MADE FOR SHARING WHAT YOU KNOW <span aria-hidden="true">•</span></span></div></footer>;
}

export function PublicShell({ children }: { children: React.ReactNode }) {
  return <div className={styles.shell}><PublicHeader /><main>{children}</main><PublicFooter /></div>;
}
