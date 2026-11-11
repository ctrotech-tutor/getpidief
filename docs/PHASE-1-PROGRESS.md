# Phase 1 safety progress

## Completed safeguards in this branch

- Public document detail and comment list/create paths restrict access to approved, public, nondeleted documents. This is an interim public-only policy, not the final private or institutional access model.
- Comment replies must point to a nondeleted comment on the same document. Comment pagination is bounded and the create endpoint reports rate limits as 429.
- Realtime channel authorization is deny-by-default for the supported channel patterns. Document download responses and shared document caching have interim restrictions.
- Tests exercise selected route decisions and generated query predicates with mocks. They are regression checks, not an end-to-end security audit.

## Open blockers before the Phase 1 gate

- Document creation accepts a client-supplied file URL without proving upload ownership. A robust solution requires server-controlled upload records, atomic claim and replay prevention, file validation, and a migration and rollback plan.
- Existing storage URLs may be publicly accessible outside application checks. Download, visibility, takedown and verification-document privacy cannot be guaranteed until storage access and existing objects are audited and migrated safely.
- Other endpoints, including individual comment actions, search, bookmarks, profiles, feeds, reporting and moderation, need cross-user and role-based review. Changes here do not secure every alternate path.
- Database-backed multi-user integration tests, moderation and takedown accountability, secure preview infrastructure and production build/CI remain incomplete.
- Document status checks and comment writes are separate operations and can race with moderation. Transactional enforcement needs to be designed with the wider access model.

No schema, production data, storage configuration or production environment settings were changed by this work.

## Saved-resource work on PR #3

The existing document reader and library now use the real bookmark API with an interim public-only access policy. Save and remove update the bookmark and count in a single database statement, are idempotent, and do not treat an event delivery failure as a failed save. The library and API list only approved, public, nondeleted resources and do not expose file URLs through their card projections. Reader save failures are shown rather than reported as success.

These route and UI tests use mocks. The SQL and concurrency behavior still need testing against an isolated PostgreSQL/Neon database with two users, concurrent requests, moderation transitions, and existing records before production rollout. Existing count discrepancies are not automatically repaired. Other document listing/card surfaces and storage URLs require separate review, and private/institutional library access is not implemented. The social feed preview remains disconnected from these real bookmarks.

## Discussion work on PR #3

The existing resource discussion now handles failed loads and posts, retains drafts on failure, supports paginated replies, and refreshes after posting. Rendering uses text rather than trusting stored HTML. The API restricts replies to a public document and a live top-level parent, bounds pagination, returns a minimal comment projection, and uses a single statement for insertion and count updates. Notifications are best effort after insertion. The broken Helpful control and automatic realtime updates are temporarily unavailable in this view; refresh is explicit.

The discussion SQL, locking, pagination, and cross-user behavior still need isolated database and concurrent integration tests. Older stored counters can be inaccurate, moderation/delete counter handling and alternate comment mutation endpoints still need review, and private/institutional discussions are not enabled. Tests currently use mocks and do not establish end-to-end security or performance.

## Follow and profile work on PR #3

Both follow endpoints now share an idempotent mutation with active-account checks and locked count updates. Duplicate follows do not send another notification. The profile relationship no longer uses a shared cache, and personalized profile responses use private, no-store caching. The real following page has working unfollow controls and pagination. The public profile's resource cards are restricted to approved public documents and omit storage URLs from their card data.

The follow SQL and concurrent or opposing follow operations require verification against an isolated database. Existing counters may already be inaccurate and are not repaired by this change. Follow notifications are best effort, and privacy, blocking, suspended-user behavior, other profile fields and alternate content discovery paths still need a broader review. Tests use mocks and no production data was changed.

### Document reactions

The reaction endpoint now checks for an active account and an approved public document, locks the document in a transaction before changing a reaction and its counters, and treats delivery of notifications and realtime events as best effort after commit. Current clients send an explicit desired state, making an identical retry idempotent; the legacy `type` toggle remains supported but is not retry-safe. The workstation restores the latest confirmed values and reports a failure instead of silently resetting to initial counts.

These guarantees still require isolated PostgreSQL integration and concurrency tests, including verification of the deployed schema and transaction infrastructure. Existing counter drift is not repaired. An ambiguous network failure may occur after a successful commit, so the UI can temporarily show stale state until refreshed. Realtime delivery is best effort and may arrive out of order. Other mutation paths and account status changes must be reviewed for compatible locking. Mock tests do not establish production readiness.

### Provider-neutral PostgreSQL and local development

The app and seed script now use standard Node PostgreSQL rather than Neon-specific HTTP/WebSocket drivers. A loopback-only Docker Compose development database and setup instructions are included. The initial migration enables `pg_trgm`, which its trigram index requires. No database was created or migrated in this workspace, and existing environments must have their migration history reviewed before rollout. The optional isolated connectivity test is not a replacement for applying the schema and exercising the social mutations and concurrency against a real PostgreSQL database. Local Docker and managed-provider connections have not yet been verified here.

### Upload ownership foundation

New document submissions now require an expiring receipt created by the UploadThing completion callback and tied to the uploader. The document, tags and receipt consumption are intended to commit in one transaction after locking the account and receipt. Browser-provided URLs and sizes are no longer used when creating new documents. The upload page now uses the UploadThing client protocol instead of posting multipart data to its route, and rejects restricted visibility while private storage is not implemented. The form warns that the current storage link may be public even before approval and can bypass download and print settings. Existing files and other upload types are unchanged.

Migration `0001_silky_lightspeed` must be reviewed and applied before deploying the corresponding application code. Neither the migration nor the UploadThing callback/flow has been tested against a real service or database; mocked tests do not prove callback authenticity, ownership, expiry or locking in production. Existing arbitrary URLs and publicly accessible files remain a serious issue. MIME claims do not verify PDF contents, and malware scanning, orphan cleanup, private object storage, controlled reading and downloads, moderation access, safe processing, and legacy remediation remain open. Failed processing-event delivery is logged but has no durable retry/outbox. A network failure after commit can make a successful submission appear unsuccessful. Do not use the current file pipeline for sensitive or restricted materials.

### Reporting and moderation foundation

Document reports now require an active account and an approved public document. The report, duplicate check, counter and open-report count run in one transaction under row locks. The moderation queue has a reported view, showing a bounded selection of open report details without displaying reporter identities. A shared moderation service now rechecks the moderator's current database role and account status for both the API and server actions, validates input, locks the document, and commits status and audit records together. Direct document PATCH status changes are rejected to avoid bypassing that service. Repeated moderation is a no-op. Report and moderation events are best effort after commit.

The Redis report limiter is a no-op when rate-limit Redis is not configured. The current `document/flagged` event has no registered consumer and does not automatically flag a document; reports are visible in the reported queue. Report resolution, appeals, review ownership, moderator separation of duties, durable event delivery, and a complete audit of other admin routes remain unfinished. Open reports remain open even after approve/reject actions. Old counters may be inaccurate. Real PostgreSQL concurrency tests and cross-user authorization tests are still required; current tests mock transaction operations. Public storage may still bypass moderation decisions, so moderation is not an access-control boundary for files.

### Report resolution

Moderators can now mark an individual open or under-review report as actioned or dismissed, with a required note. The service rechecks the current active role, locks actor, document and matching report, and writes the decision and audit record in the same transaction. A repeated identical decision is a no-op; a competing decision gets a conflict. The queue shows at most five oldest reports per resource, preventing one high-volume resource from hiding the rest. Resolving a report is deliberately separate from changing resource status and does not modify the cumulative flag counter. The same reporter cannot file another report for that document under the existing uniqueness constraint, including after resolution.

This replaces the earlier statement that report resolution is unavailable. It does not implement assignment, appeals, edits to resolved decisions, reporter notifications, or separation of duties. A review can be recorded as actioned without proving a separate resource action happened. The report list excludes soft-deleted resources, although an authorized moderator can resolve a known report through the API. UI error presentation, the SQL window query, locking, transaction rollback, and concurrent decisions need real PostgreSQL and browser testing. File storage still bypasses moderation and no database was changed during implementation.

### Isolated PostgreSQL verification

A temporary loopback-only PostgreSQL 16.9 cluster was initialized independently of any existing database. Both migrations applied successfully to a fresh disposable database. Tests against that database passed for connection and rollback, concurrent duplicate bookmarks and removals, concurrent follows and unfollows, idempotent reactions, duplicate reports and conflicting resolutions, concurrent comments, one-time upload-receipt consumption, and selected private-document denials. Fixtures use random IDs and are removed afterward. External services and authentication were mocked; this is not an end-to-end or security audit, and upload callbacks, moderation UI, mixed operations and managed providers are not covered.

CI now uses a disposable PostgreSQL service and npm lockfile with a separate opt-in write-test command. The old Neon job was removed because it attempted to comment a database connection URL on pull requests, and the old build job used configured deployment secrets. CI now builds the standalone preview, not the full production application; a safe full-app build gate still needs isolated service configuration. Review any prior PR comments or logs that may have exposed a database connection string and rotate the affected credentials if exposure occurred. Full lint has a pre-existing failure and has not been fixed by this change. No existing user database was accessed, reset or migrated.

### Full build and diagnostics

The full Next.js production build now succeeds with a fresh isolated PostgreSQL 16 database and placeholder authentication secrets, without access to production services or Google Fonts. Geist, Geist Mono and Inter are self-hosted (Latin variable subsets with licenses included); other scripts fall back to system fonts. Email setup is deferred until an email is actually sent, so a missing SendGrid key still fails the send rather than preventing unrelated pages from building. The public arbitrary-recipient test-email endpoint has been disabled, along with its misleading form. Push subscription no longer configures unused VAPID sending at import time. Network status renders without relying on browser globals during SSR.

CI again includes a full app build using only the disposable service. Lint ignores generated preview output and completes with warnings, not errors. The isolated build does not verify real email delivery, push, authentication, storage, uploads, or hosted deployment; missing service credentials are not a guarantee that those features are operational. Source-map upload is intentionally not configured in this CI build. Sentry reports missing auth-token warnings and Next.js reports Edge-runtime deprecation. Production data was not used.

### Discussion edits, deletion and helpful votes

The comment action endpoint now validates input, rechecks active accounts and public document eligibility, and serializes mutations under database locks. Authors can edit or delete their own comments; helpful votes are idempotent and update their count in the same transaction. Deletion decrements document/reply counts once, clears cached HTML, and retains an anonymous tombstone for a deleted parent while its replies remain, so one person cannot erase others' replies. The discussion UI exposes these actions with error feedback and preserves failed edit drafts. Comment creation now checks account status as well.

Isolated PostgreSQL tests cover concurrent votes/deletes, author versus non-author access, private-document denial, tombstones, replies and counts. Authentication and external services remain mocked. Existing count drift can affect tombstone visibility; cleanup/reconciliation has not been implemented. Authors cannot currently delete comments on a document that becomes private or unavailable. Moderator comment deletion is intentionally disabled until a separately authorized and audited workflow is implemented. Helpful state is confirmed on click but is not loaded as viewer-specific state after refresh. No durable event, realtime update, rate limit specific to these actions, or full cross-role/browser security audit is included. No existing user database was changed.
