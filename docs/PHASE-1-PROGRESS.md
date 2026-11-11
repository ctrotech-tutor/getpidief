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
