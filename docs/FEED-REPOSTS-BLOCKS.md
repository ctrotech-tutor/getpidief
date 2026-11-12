# Reposts and blocking: implementation groundwork

**Status: database groundwork only. Neither feature is usable yet.** Do not add a Block or Repost control until its server-side behavior and tests are complete. The migration is additive, but should be reviewed with the complete feature before being applied to a shared or production database. No production migration or seed is part of this work.

## Reposts

`post_reposts` stores an attributed event pointing to an original post, rather than duplicating the body. A user can have at most one active repost of the same original; deleting the repost leaves the original untouched. Hard deletion of either the original or the reposting user cascades to the event.

Remaining work:

- Authorize and rate-limit creation and undo on the server, validate the original and both account states, and avoid races with removal/moderation. Ensure repeated submissions are safe.
- Merge original-post and repost events into chronological Latest and Following feeds, retaining original author attribution and displaying who reposted it. Specify behavior for the user's own reposts and saved posts.
- Replace the original-post-only cursor with a stable composite event cursor. Test identical timestamps, post/repost tie-breakers, undo/deletion, view filtering and pagination without gaps or duplicates.
- Hide events for removed posts and inactive users, and apply the eventual blocking rules to both original author and reposter. Handle stale links and concurrent removal safely.
- Add clear Repost/Undo controls with pending and error states, and tests against disposable PostgreSQL plus browser tests.

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
