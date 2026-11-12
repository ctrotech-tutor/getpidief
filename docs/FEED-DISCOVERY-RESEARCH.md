# Feed browsing and discovery: research and implementation plan

## Problem and current behavior

The `Latest` feed is reverse chronological, 20 events at a time. It now appends additional pages automatically, with a Load more fallback and an option to pause automatic loading. Reopening Latest returns to the newest eligible events; if no one has posted, the same items appear. Reposts are separate events, so a post may appear multiple times. `Following` is intentionally chronological and only includes followed actors. Discover uses on-device viewed-post history and follows; Latest and Following remain chronological.

New cursors carry the exact event timestamp, kind and ID; old ID-only links still resolve the timestamp in the database and can terminate if that event is deleted. Sorting and filtering happen in a union of original and repost events, with viewer-specific visibility checks and per-post aggregates. Indexes exist, but performance has not been measured at production-like sizes. Do not claim constant-time queries without `EXPLAIN (ANALYZE, BUFFERS)` and realistic data.

## Research and implications

- Meta describes candidate inventory, ranking, and contextual diversity as separate stages; sophisticated ranking uses substantial data and infrastructure, not merely randomizing posts. [Meta Engineering](https://engineering.fb.com/2021/01/26/ml-applications/news-feed-ranking/)
- Bluesky separates chronological Following from Discover and gives people algorithmic choice; its roadmap identifies seen-post tracking and explicit feedback as mechanisms for reducing repetition. [Feed choice](https://bsky.social/about/blog/7-27-2023-custom-feeds), [roadmap](https://bsky.social/about/blog/05-07-2024-product-roadmap)
- Auto-loading makes browsing continuous, but it must not trap keyboard or assistive-technology users. Deque recommends a way to turn it off and retain an explicit load control; additional accessibility risks remain even with `role=feed`. [Deque](https://www.deque.com/blog/infinite-scrolling-rolefeed-accessibility-issues/)
- Intersection Observer can begin loading shortly before a sentinel reaches the viewport; its `rootMargin` should be tuned and measured, not used to trigger unlimited requests. [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- Keyset pagination is preferable to increasing offsets when the index matches the ordering, but actual query cost depends on the joins, filters, sort plan, and data distribution. [PostgreSQL multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)

## Recommended implementation

### 1. Continuous, controlled browsing

- Reuse a single server-side query and card renderer for the initial page and authenticated incremental pages. Fetch bounded batches with one extra event for `hasMore`; do not query the entire timeline or run sidebar queries for each page.
- Append rather than replace existing posts. Load near the end using Intersection Observer, with exactly one request in flight, a meaningful loading announcement, a visible keyboard-accessible **Load more** / retry control, a clear end state, and a non-JavaScript navigation fallback. Offer a control to pause automatic loading; respect data-saving preferences. Avoid a stream of automatic requests if the viewport is tall or responses are short.
- Keep separate state for each view, and ensure switching tabs, a refreshed first page, new posts, interaction changes, deletions, blocked accounts, and in-flight requests cannot mix old results into the new feed. Recheck authorization and visibility on every request. Render text as React content, never injected HTML.
- Preserve the current position when returning from a post, within bounded memory and without displaying content to the wrong account. Decide and test behavior on reload, session/account changes, browser back/forward, and expiration. Bound retained items and requests; arbitrary virtualization can break focus, selection, accessibility, and scroll restoration.
- Use a validated cursor containing the exact database event timestamp, event kind and ID, rather than looking up the event on the next request. Preserve sub-millisecond precision, stable tie-breaking and original/repost ordering even if the cursor event is deleted. Limit inputs and preserve a compatibility path for existing URLs. A cursor is not authorization.
- Deduplicate by **event ID and type** during append; distinct repost events are legitimate and should not be silently collapsed in a chronological timeline. A future discovery feed can deduplicate by original post with explicit attribution.

### 2. Make discovery less repetitive without lying about it

- Keep **Following** chronological, and retain a clearly labeled chronological **Latest** option. Build a separate discovery feed when ready, instead of silently randomizing Latest or presenting shuffled content as personalization.
- Start with bounded candidate pools of eligible recent originals, followed-account content and meaningful active discussions; reapply visibility, status, safety and block filtering before display. Exclude known fictional local seed accounts from production; do not treat simulated engagement as real popularity.
- Rank with explainable, bounded signals: recency, explicit follows and meaningful interactions, limited conversation activity, and exploration. Prevent one author or repeated reposts from dominating; preserve exposure for new and quiet authors. Avoid sensitive inference or engagement-only optimization. Scores and candidate availability change, so use a versioned per-session ordered snapshot or equivalent stable pagination with expiry and visibility rechecks.
- Treat an impression as a post actually visible for a meaningful interval, not merely fetched or preloaded. Repeated exposure should be reduced, not permanently excluded: users may want to revisit an active discussion or a post they missed. New posts should be eligible promptly; if inventory is small, be honest that there is little new content rather than inventing it. Do not announce a personalized feed until it exists.
- Decide storage, retention, deletion, consent/privacy notice and cross-device behavior before recording impressions. Minimize data; never use an unpartitioned shared cache for viewer-specific results. Support explicit feedback and evaluate cold-start experiences.

### 3. Verification before rollout

- Database tests: tie timestamps down to microseconds, deleted cursor events, original/repost ordering, concurrent inserts/deletes, blocked/inactive authors and actors, following/saved filtering, malformed cursors, authorization, retries, and page boundary duplicates/gaps.
- Browser tests: mouse, keyboard, screen reader/live-region flow, scroll position/back navigation, tab changes and pending responses, initial short/empty feeds, offline/error/retry, slow connections, disabled auto-load, and mobile. Verify interactive post controls continue working on appended pages.
- Performance: profile first and deep pages with realistic distributions and `EXPLAIN (ANALYZE, BUFFERS)`; measure p50/p95/p99, query count, payload, client memory and network use. Add indexes or caching only when plans support them. Test with an isolated database; no production seed or unapproved production migration.
- Product quality: measure repetition, author/content diversity, freshness and user feedback in addition to performance. Do not optimize only for session length or clicks.

## Current implementation status

Continuous loading, manual fallback and precise cursors are implemented. Discover is now the default and uses an explainable ranking over up to 120 eligible recent originals; it prioritizes posts viewed less recently on the current device. Latest and Following remain chronological. Loaded events are rechecked for visibility and updated interaction state when fresh server data arrives, instead of discarding the loaded pages. Retained items are bounded; a continuation link takes the reader to the next page at the limit. Scroll restoration across navigation and real-browser/accessibility verification remain before treating the browsing experience as complete. No production-scale query benchmarks have been run.

## Discovery details and limitations

The candidate pool is bounded to 120 recent eligible original posts. An explainable heuristic combines recency, follow relationship and capped discussion activity; adjacent authors are varied where an alternative is available, and previously viewed items remain as a fallback. The ordered ID snapshot is held only in the current client instance, and each batch is rechecked for active status, deletion and blocks via the authenticated no-store feed endpoint. Refreshing discovery creates a new snapshot; it does not promise coverage beyond the candidate pool.

Viewed IDs and timestamps are stored only in account-scoped browser localStorage (up to 300 entries); they are used for seven days, after at least 1.5 seconds with at least half of the post visible in an active tab. Users can clear the history, and if storage or Intersection Observer is unavailable, discovery continues without that signal. Entries are ignored after expiry and pruned on a later write, but a shared device can retain old local storage until cleared. History does not sync across devices. Candidate ordering, engagement weighting, latency and quality are not validated with production-scale data or experiments. Browser back/scroll restoration, robust screen-reader and mobile testing, and privacy review remain open.
