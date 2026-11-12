import styles from "./state.module.css";

// This boundary also covers public routes, before we know whether a visitor is signed in.
export default function Loading() {
  return <div className={styles.loading} role="status" aria-label="Loading page">
    <div className={styles.loadingMark} aria-hidden="true"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="2" y="4" width="20" height="24" rx="4" fill="currentColor" opacity=".48"/><rect x="10" y="8" width="20" height="20" rx="4" fill="currentColor"/><circle cx="20" cy="18" r="4" fill="#f5f6f1"/></svg></div>
    <span className={styles.loadingText}>Loading<span aria-hidden="true">…</span></span>
    <span className={styles.loadingTrack} aria-hidden="true"><span /></span>
  </div>;
}
