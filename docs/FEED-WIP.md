# Home feed work in progress

This branch is not ready to merge or deploy. It introduces an additive migration for text posts, replies, likes and saves. No migration has been applied to the existing database. Review and back up the database before any deployment migration.

The feed is an initial implementation, not a production-ready social loop. It still needs post and reply moderation/reporting, abuse limits, pagination and bounded per-post reply/like queries, usable error feedback, accessibility and browser testing, and dedicated integration tests against disposable PostgreSQL. The first 50 posts and up to 500 replies are displayed; older content is not yet paginated. PDF sharing is intentionally excluded because direct storage URLs may bypass access and moderation controls.

Account session revocation after password reset, real email delivery, Google consent behavior, and private storage remain unresolved. Existing sessions should not be considered revoked on password reset. Do not use the existing file pipeline for sensitive materials.
