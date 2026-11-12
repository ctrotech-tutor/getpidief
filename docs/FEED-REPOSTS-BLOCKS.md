# Reposts and blocking: implementation groundwork

**Status: reposts implemented for local testing; blocking is database groundwork only.** The migration is additive, but should be reviewed with the complete feature before being applied to a shared or production database. No production migration or seed is part of this work.

## Reposts

`post_reposts` stores an attributed event pointing to an original post, rather than duplicating the body. A user can have at most one active repost of the same original; deleting the repost leaves the original untouched. Hard deletion of either the original or the reposting user cascades to the event.

Current behavior: an authenticated, active user can repost or undo a repost with an idempotent server action. The original post is never copied. Latest shows both original and attributed repost events; Following includes events by followed accounts; Saved shows original posts only. Pagination uses the event timestamp, type and ID in PostgreSQL. Inactive actors and removed originals are hidden. Creation uses the feed posting rate limit. A removed cursor may end pagination, as with the previous feed cursor.

Remaining work: apply eventual blocking rules to originals, actors, counts and write paths; exercise the UI and rate-limiter failure cases in a browser; review event query performance with realistic production data and check concurrent account moderation. Reposting is not a quote post, does not provide notifications, and does not imply public unauthenticated access.

## Blocking

`user_blocks` is a directional relationship: `blocker_id` created the block against `blocked_id`. A database constraint rejects self-blocks; duplicate pairs are unique; deleting either account cascades. **This table does not enforce blocking anywhere.**

Before exposing the action, design and implement:

- A clear confirmation and a reachable list of blocked accounts with unblock. Decide what happens to existing follows in both directions, counters and notifications; enforce it atomically, including concurrent follow requests.
- Server-side checks for both directions across feed posts, reposts, replies, direct post links, profiles, follow endpoints and other relevant interactions. Apply visibility checks before pagination and counts so blocked activity does not leak through previews or counts.
- Explicit treatment of resources, search, notifications and public/unauthenticated pages. The app currently has public content and some public file URLs: do **not** imply that a block makes such content private or prevents a logged-out visitor from accessing it.
- Audit existing direct write endpoints, author/account status and stale sessions; define reporting/moderation exceptions. Prevent bypass through APIs or a client-supplied ID, and test race conditions.
- Accessible confirmations, errors, repeat actions, unblock, and browser tests. Never silently claim a block succeeded if only one view has been filtered.

## Testing the groundwork

Against an **isolated, local, disposable** PostgreSQL database whose name ends in `_test`, run migrations and then:

```sh
TEST_DATABASE_URL=... TEST_DATABASE_WRITE=yes npx vitest --run tests/integration/postgres-feed-foundations.test.ts
```

The guard in this test checks for a local hostname and database name suffix, but cannot detect a local tunnel to a remote database. The test creates and removes its own fixtures. Passing it verifies constraints only, not the finished product or security behavior.
