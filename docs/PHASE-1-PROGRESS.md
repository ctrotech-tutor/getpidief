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
