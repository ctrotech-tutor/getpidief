import styles from "./state.module.css";
export default function Loading() {
  return <div className={styles.loading} role="status"><span className={styles.loader} aria-hidden="true" /><span>Loading…</span></div>;
}
