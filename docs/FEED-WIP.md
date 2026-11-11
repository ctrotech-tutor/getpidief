# Home feed work in progress

This branch is not ready to merge or deploy. It introduces additive migrations for text posts, replies, likes, saves and a session version. No migration has been applied to the existing database. Review and back up the database before any deployment migration. The session version migration intentionally invalidates every existing JWT on deployment: users must sign in again. Deploy the database migration and application in a coordinated maintenance window; old app instances will not enforce revocation.

The feed has cursor pagination for posts and discussion replies, recent reply previews, and per-user posting limits. In production post and reply creation fails closed if Redis rate limiting is not configured or fails. It still needs author-controlled reply deletion, usable mutation error feedback, accessibility and browser testing, and dedicated integration tests against disposable PostgreSQL. Feed reporting and moderation have an initial implementation described below. PDF sharing is intentionally excluded because direct storage URLs may bypass access and moderation controls.

Password reset increments a database session version in the password update transaction. Server-side Auth.js session checks reject old or missing versions and a reset racing with credentials sign-in. The edge proxy does not check the database and must not be treated as an authorization boundary. Audit every sensitive endpoint to ensure it uses server-side authorization and current privileges. Already-running requests are not cancelled. Revocation needs end-to-end verification with actual Auth.js cookies and PostgreSQL.

Real email delivery, Google consent behavior, and private storage remain unresolved. Do not use the existing file pipeline for sensitive materials. Reset and verification links are consumed before the database write, so a failed write requires a new link.

## Root and moderation update

The root route now chooses the public landing page or the protected feed using the server session; it is request-rendered and is not shared-cached. Home navigation and sign-in/onboarding destinations point to `/`. The `/home` route remains as a compatibility route and discussion pages remain under `/home/post/`.

A first feed-report queue now accepts reports on posts and replies, with duplicate constraints, rate limits, moderator role checks against the database, soft removal and audit records. The oldest 50 open reports are shown. This is a foundation, not a fully verified moderation system: no reviewer notifications, appeals, richer triage or user-friendly action failure messages are provided. Its SQL, concurrency, and UI need real PostgreSQL and browser tests. Reporters should not assume a particular response time.

Identity/verification document uploads are disabled because their provider privacy has not been established. Previously uploaded files and callbacks already in flight may still exist at the provider, and disabling the route does not make old URLs private. General PDF uploads and existing file URLs still use the old pipeline, so privacy and moderation bypass risks remain. Do not upload sensitive PDFs until private storage and access controls are implemented and verified with the provider.

Admin routes and the database-backed sitemap are request-rendered; the sitemap now excludes non-public and deleted documents. Build verification with a dummy database URL confirms compilation and static generation only, not runtime database, provider or email functionality. Real delivery through Redis, Inngest and SendGrid remains unverified.
