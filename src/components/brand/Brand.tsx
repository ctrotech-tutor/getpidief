import Link from "next/link";
import styles from "./Brand.module.css";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={`${styles.brand} ${light ? styles.light : ""}`} aria-label="getpidief home">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="20" height="24" rx="4" fill="#527a5b" />
        <rect x="10" y="8" width="20" height="20" rx="4" fill="#a1bf9b" opacity=".9" style={{ mixBlendMode: "multiply" }} />
        <circle cx="20" cy="18" r="4" fill="white" />
      </svg>
      <span>getpidief<span className={styles.dot}>.</span></span>
    </Link>
  );
}
