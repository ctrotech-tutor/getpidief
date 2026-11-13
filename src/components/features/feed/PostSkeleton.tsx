import styles from "./feed.module.css";
import loading from "./feed-loading.module.css";

/** Visual placeholder only; the surrounding feed announces loading separately. */
export function PostSkeleton({ count = 2 }: { count?: number }) {
  return <div aria-hidden="true" data-feed-skeleton className={styles.posts}>{Array.from({ length: count }, (_, item) => <div className={`${styles.post} ${loading.post}`} key={item}>
    <div className={loading.person}><span className={`${loading.block} ${loading.avatar}`} /><div className={loading.personText}><span className={`${loading.block} ${loading.name}`} /><span className={`${loading.block} ${loading.meta}`} /></div></div>
    <div className={loading.lines}><span className={`${loading.block} ${loading.line}`} /><span className={`${loading.block} ${loading.lineMedium}`} /><span className={`${loading.block} ${loading.lineShort}`} /></div>
    <div className={loading.postActions}><span className={`${loading.block} ${loading.action}`} /><span className={`${loading.block} ${loading.action}`} /><span className={`${loading.block} ${loading.action}`} /></div>
  </div>)}</div>;
}
