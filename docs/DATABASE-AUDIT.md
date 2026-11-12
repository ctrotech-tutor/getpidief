# Database audit — first measured pass

## Scope and limits

This is a code/schema review plus an isolated synthetic PostgreSQL experiment, not an audit of the actual Supabase project. No hosted database, production statistics, production data, backup settings, or Supabase configuration were accessed or changed. The synthetic distribution and local hardware do not establish production latency, concurrency, percentiles, or capacity. Security is not certified by these checks. Do not run synthetic seed data or `EXPLAIN ANALYZE` experiments against production.

## Measured finding and change

The feed query used `feed_events` twice: to retrieve the page and to find a legacy ID-only cursor. PostgreSQL materialized the entire union in the observed plan, even for a 20-ID delivery. The cursor lookup now reads the original/repost primary key directly; filtering, ordering, block checks and interaction counts remain in place. This is a query-only change, with no new migration. The modern cursor supplies its own timestamp and continues to work after its boundary event is deleted; old ID-only cursors still require a surviving event. Saved does not resolve repost cursors.

On one local PostgreSQL 18.6 instance with warm buffers, after `ANALYZE`, one run of `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` used 1,000 synthetic accounts, 100,000 posts, 30,000 reposts, 100,000 replies, 100,000 likes, and 100 follows for the reader. Times below are server execution times for the main query, **not** end-to-end page load or a percentile. PostgreSQL version, statistics, indexes, parameters and data distributions affect plans.

| Read | Before | After | Notes |
| --- | ---: | ---: | --- |
| 20 specific originals (For you delivery) | 71.7 ms | 0.62 ms | Observed full 130,000-event materialization disappeared. |
| Latest first page | 388.9 ms | 37.0 ms | Still scans/sorts a large event set in this plan. |
| Following first page | 142.5 ms | 102.9 ms | Still filters/sorts many events; needs separate work. |
| Discovery candidates | 1.44 ms | 1.50 ms | Separate query, unchanged; timing variation is expected. |

A second reply-preview query ran in roughly 0.2–0.3 ms for the sampled pages. These are isolated samples with a simplistic distribution; no p50/p95/p99, contention, cold-cache, network, Supabase pooler or real-world measurements have been performed. The dataset had no blocks and minimal engagement per post; heavy-engagement and highly selective follow/block cases may behave differently. Additional metrics and database-level tests are required before calling the system production-scalable.

The feed PostgreSQL integration suite covers mixed post/repost timestamps, old and new cursors, deleted boundaries, block eligibility, interaction counts and reposts. The server-rendering tests now wait for Suspense boundaries to finish, rather than asserting against the loading fallback.

## Other concrete observations

- The Node process uses a `pg` pool of up to five connections. In serverless, this is **per process**, not a global five-connection limit; concurrent instances and background workers multiply demand. Supabase's transaction pooler is recommended for runtime, with a separately supplied session/direct connection for migration. Actual limits and deployed connection strings were not inspected. Instrument wait time, total and idle connections, timeouts, active instances, pooler queues and PostgreSQL connections before changing pool sizes. Do not log URLs or SQL parameters.
- In the migrated local schema, both `auth_users_email_unique` and `auth_users_email_idx` are unique btree indexes on `email`, and both `users_username_unique` and `users_username_idx` are unique btree indexes on `username`. They are duplicate definitions and impose write/storage overhead. `follows_follower_idx` also has the same leading column as the pair index, but is not identical and may have a different planner/storage tradeoff. Do not drop any until actual index usage, foreign-key/constraint dependencies, migration drift and rollback are reviewed. The constraint-backed unique indexes enforce integrity.
- Following and legacy chronological reads still sort or filter substantial parts of the event union in this experiment. For-you candidate ranking also computes viewer-specific reply counts; popular posts, many blocks and high follow counts may change its cost. Test first/deep pages, refresh by IDs, sparse/dense follows, blocked users, active/inactive authors and highly engaged posts before considering branch-specific top-N retrieval or carefully selected indexes. A top-N rewrite must filter eligibility **before** limiting and preserve exact `(timestamp, kind, id)` cursor semantics.
- Follow suggestions rank eligible users with per-candidate interest overlap and use offset paging. Notifications use offset plus an exact count, and search uses `COUNT(*) OVER()` and offset. These are potential high-cardinality costs, not measured bottlenecks here. Assess actual plans before designing keyset pagination, caching or approximate counts; preserve privacy and total-count semantics.
- Feed interactions acquire account and post row locks in a consistent order to serialize against blocks/deletions. That protects correctness, but a popular author or viewer can become a contention point. Measure concurrent interactions, lock wait times and deadlocks before weakening or replacing locking.
- Both indexes and per-post counts have write/read costs. Avoid speculative indexes, unbounded cache, denormalized counts or background fanout without benchmarks and a repair/reconciliation design. Existing feed safety/visibility checks must not be bypassed for speed.
- `db` enables query logging in development. SQL and parameters can contain user data: keep debug logs out of public logs and disable or redact in shared environments. Production query logging, slow-query collection, `pg_stat_statements`, and dashboard retention were not inspected.
- Check backup frequency, retention, point-in-time recovery availability, restore drills, migration ownership, RLS/Data API exposure, TLS and least privilege in the actual Supabase project. Code review cannot establish these. Use a separate staging database, representative anonymized or synthetic distribution, and reviewed migration/rollback plans. Never use production `db:push` or seed it with known-password demo users.

## Next measurements

1. Build a repeatable disposable-database workload with skewed popular authors, varied activity, blocks, deletions, replies, saved posts and a range of follow counts. Record plans, sizes, p50/p95/p99 and throughput for first/deep feed pages and ID refresh, alongside concurrent writes and pool wait time.
2. Benchmark suggestions, search, notification list/count, session checks and common resource queries using realistic volume and selectivity. Record query counts per request and execution plans, avoiding sensitive parameters.
3. Compare candidate changes against identical datasets and correctness tests. For any indexes, check storage/write costs and deploy with a reviewed lock-aware migration and rollback; production `CREATE INDEX` can block writes. Do not assume local results transfer to Supabase.
4. Review production metrics and configuration with appropriate authorization; test backups by restoring into an isolated environment. No hosted writes are required for this first pass.
