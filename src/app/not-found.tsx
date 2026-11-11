import Link from "next/link";
import { Brand } from "@/components/brand/Brand";
import styles from "./state.module.css";

export default function NotFound() {
  return <main className={styles.page}><div className={styles.top}><Brand /></div><div className={styles.content}><span className={styles.label}>PAGE NOT FOUND</span><div className={styles.number} aria-hidden="true">404</div><h1 className={styles.heading}>We couldn&apos;t find that page.</h1><p className={styles.text}>The link may be broken, or the page may have moved. Let&apos;s get you back somewhere familiar.</p><div className={styles.links}><Link className={styles.primary} href="/">Go to home</Link><Link className={styles.secondary} href="/feed-preview">Explore the preview</Link></div></div></main>;
}
