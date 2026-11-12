import styles from "./feed.module.css";
import loading from "./feed-loading.module.css";

/** A visual placeholder, not sample content or interactive navigation. */
export function FeedLoading() {
  return <div className={styles.shell} data-feed-shell role="status" aria-live="polite" aria-label="Loading feed">
    <span className="sr-only">Loading feed…</span>
    <div className={styles.layout} aria-hidden="true">
      <div className={`${styles.left} ${loading.sidebar}`}>
        <div className={`${loading.block} ${loading.brand}`} />
        <div className={loading.nav}>
          {[1, 2, 3, 4, 5, 6].map(item => <div className={loading.navRow} key={item}><span className={`${loading.block} ${loading.navIcon}`} /><span className={`${loading.block} ${loading.navLabel}`} /></div>)}
        </div>
        <div className={`${loading.block} ${loading.upload}`} />
        <div className={`${loading.navRow} ${loading.navMore}`}><span className={`${loading.block} ${loading.navIcon}`} /><span className={`${loading.block} ${loading.shortLabel}`} /></div>
      </div>
      <div className={styles.feedColumn}>
        <div className={loading.mobileBar}><span className={`${loading.block} ${loading.mobileLogo}`} /><span className={`${loading.block} ${loading.navIcon}`} /></div>
        <div className={loading.composerPrompt}><span className={`${loading.block} ${loading.promptAvatar}`} /><span className={`${loading.block} ${loading.promptText}`} /></div>
        <div className={loading.tabs}><span className={`${loading.block} ${loading.tab}`} /><span className={`${loading.block} ${loading.tab}`} /></div>
        <div className={loading.intro}><span className={`${loading.block} ${loading.name}`} /><span className={`${loading.block} ${loading.meta}`} /></div>
        <div className={styles.posts}>{[1, 2, 3].map(item => <div className={`${styles.post} ${loading.post}`} key={item}>
          <div className={loading.person}><span className={`${loading.block} ${loading.avatar}`} /><div className={loading.personText}><span className={`${loading.block} ${loading.name}`} /><span className={`${loading.block} ${loading.meta}`} /></div></div>
          <div className={loading.lines}><span className={`${loading.block} ${loading.line}`} /><span className={`${loading.block} ${loading.lineMedium}`} /><span className={`${loading.block} ${loading.lineShort}`} /></div>
          <div className={loading.postActions}><span className={`${loading.block} ${loading.action}`} /><span className={`${loading.block} ${loading.action}`} /><span className={`${loading.block} ${loading.action}`} /></div>
        </div>)}</div>
      </div>
      <div className={styles.right}>
        <div className={`${loading.block} ${loading.search}`} />
        <div className={loading.resourceCard}><span className={`${loading.block} ${loading.name}`} /><div className={loading.following}>{[1, 2, 3].map(item => <div className={loading.person} key={item}><span className={`${loading.block} ${loading.followAvatar}`} /><div className={loading.personText}><span className={`${loading.block} ${loading.resourceTitle}`} /><span className={`${loading.block} ${loading.meta}`} /></div></div>)}</div></div>
        <div className={loading.resourceCard}><span className={`${loading.block} ${loading.name}`} /><div className={loading.following}>{[1, 2, 3].map(item => <div className={loading.person} key={item}><span className={`${loading.block} ${loading.followAvatar}`} /><div className={loading.personText}><span className={`${loading.block} ${loading.resourceTitle}`} /><span className={`${loading.block} ${loading.meta}`} /></div></div>)}</div></div>
      </div>
    </div>
  </div>;
}
