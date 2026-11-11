# Review of the newer codebase for the study-media rebuild

Reviewed against `origin/main` commit `d404714` and this branch's integration of it. This is a targeted static review of the key product, data, security and infrastructure paths, not a security audit or proof of end-to-end operation. The previous deep dive in `archive/` examined an older snapshot and must not be used as an assessment of this version.

## What changed the picture

The new commit substantially expands the application. There are implementations for a document workspace and PDF viewer, upload UI, profiles, notifications, settings, comments, admin/moderation, download/report APIs, background workers, PWA assets and more. The repository now contains about 339 source files; some 54 still contain `Placeholder` functions and four store files are empty. A file count is not a measure of completion. The source tree is significantly more developed than the previous audit suggested, but implementation and runtime correctness are separate questions.

## Product inventory and reuse decisions

| Area | What is present | Rebuild recommendation |
| --- | --- | --- |
| Discovery | `src/app/(app)/explore/`, category, recommendation, trending, recent and Pulse sections; document cards | Reuse data and useful interaction patterns, but redesign as a student-centered Following/For-you feed. The existing page is closer to a resource dashboard than a social feed. Avoid treating generic popularity as learning relevance. |
| Reader | `d/[slug]/page.tsx`, dynamically loaded `PDFViewer`, controls, document metadata, comments, share and report components | A valuable prototype to test on mobile, large files, assistive technology and slow connections. Keep lazy loading; redesign the reading and return-to-feed flow after access control is fixed. |
| Contribution | Upload page, dropzone, metadata form, Uploadthing route, document creation API, moderation and processing workers | Retain as reference for a simple create-post flow; verify the upload protocol, ownership, cleanup and processing end to end before reuse. Current upload page posts multipart data directly to the Uploadthing route; compatibility with its handler is not established. |
| Social | Follow, bookmarks, reactions, threaded comments, profiles, notifications, realtime hooks and APIs | Good foundations for a social loop, but verify persistence, permissions, optimistic updates, empty/error states and notification preferences. Prioritize follow/save/comment before advanced gamification. |
| Auth and onboarding | Credentials/Google, Auth.js, onboarding forms, edge proxy | `config.ts` is now a compatibility re-export of the canonical `auth.ts`, unlike the old audit. Validate sign-up, profile creation, JWT refresh, account status, onboarding and deletion end to end; do not assume the previous split-auth finding still applies. |
| Search | PostgreSQL full-text search, filtering, ranking and autocomplete | Keep as a candidate for an early release. The reviewed main query now uses parameterized Drizzle SQL fragments; the old raw-SQL finding is outdated. Test visibility, pagination, indexing and result correctness. |
| Admin and trust | Admin pages, moderation PATCH, report API, audit data, verification upload | Useful starting points only. Establish permissions, abuse handling, copyright/takedowns, private verification storage and moderation tests before inviting users. |
| Data/infrastructure | Drizzle/Neon, Redis, Uploadthing/R2, Pusher, Inngest, SendGrid, analytics and monitoring | Preserve schema and integrations while assessing actual need. Avoid introducing more infrastructure until the first user loop is reliable and measured. |

## Priority risks found in source review

1. **Document access:** `src/app/api/documents/[id]/route.ts` GET returns a document by ID without a visible status, visibility or requester authorization check. `documentsRepository.getBySlug` also fetches non-deleted documents without a visibility check, while the workspace page checks approval but not visibility. Treat as a potential private/institution content exposure; establish a single tested authorization policy for every read and file URL.
2. **Download policy:** the download handler's `trackDownload` returns the document when downloads are disabled, while GET redirects whenever `doc.fileUrl` exists. Enforce `allowDownload` before returning a redirect. Direct file URLs may bypass UI restrictions; policy requires storage-level enforcement too.
3. **Cross-user caching:** `getBySlug` caches a result containing requester-specific reaction and bookmark state using a slug-only cache key. Separate shared document cache from per-user state, and test with multiple users.
4. **Realtime authorization:** `api/pusher/auth` restricts `private-user-*` but allows authenticated users into document channels and presence channels without a visible document/admin authorization check; unknown channels are also authorized by default. Use an explicit channel allowlist and verify permissions for each channel.
5. **Test email endpoint:** `api/test-email` sends to a caller-provided email with no auth or rate limit visible in the handler. Remove it from production or secure it, and assess email abuse exposure.
6. **Uploads and rights:** metadata accepts a submitted file URL and verification documents are stored as an Uploadthing URL. Verify ownership, allowed hosts, private access and file validation, and define copyright/consent rules before real uploads. The worker's thumbnail helper currently throws a not-implemented error and falls back.
7. **Delivery and reliability:** the upload UI uses synthetic progress; ensure real progress and cleanup on failure. Validate database updates and event delivery as a single reliable workflow. Do not advertise verified content unless verification actually establishes that claim.
8. **Configuration and deployment:** both Inngest endpoints serve functions; decide on the canonical endpoint. The example env file and active email/storage configuration need reconciliation. `public/manifest.json` is empty while `src/app/manifest.ts` also exists: check the effective route and PWA behavior. Existing tracked Playwright output and screenshots should be reviewed and removed in a separate cleanup, particularly if they contain sensitive information.

These are source-level findings and priorities, not claims of a confirmed production exploit. Deployment settings and real data were not inspected.

## Recommended path to the desired experience

1. **Decide the audience and first content model.** Choose initial students/institutions, allowed materials, visitor access and the first two or three post types. Prototype a mobile feed and reader before choosing a full visual system.
2. **Create one trusted vertical slice.** A learner signs up, follows a subject/person, discovers a resource, opens it, saves it and returns. A contributor uploads permitted content and a moderator can review/report it. Real data, useful empty states and basic analytics from day one.
3. **Security and correctness first.** Close the access-control, download, cache, realtime and test-email gaps above; add authorization matrix and multi-user tests. Secure uploads and establish copyright policy. Audit dependencies and remove unnecessary services only after confirming their usage.
4. **Social-first UI, not just a dashboard.** Use a focused mobile-first feed, familiar bottom navigation, lightweight creation, contextual profiles, genuine useful notifications and clear reasons for recommendations. Retain search and reading as first-class destinations, not secondary features.
5. **Speed by design.** Establish measurements on representative phones and networks. Keep feed cards lightweight, paginate, optimize previews, load the viewer only when needed, reduce unnecessary animation and avoid depending on realtime for core reading.
6. **Pilot before scaling.** Observe search-to-open, save-and-return, resource usefulness, upload failures, moderation resolution and performance. Use the results to decide badges, recommendation complexity and monetization.

## Verification on the integrated branch

- `npm run typecheck`: passes after reconciling the explore sidebar's session type.
- `npm run test -- --run`: 123 tests pass; several tests are placeholders or mocks, so this does not prove real service integration.
- `npm run lint`: fails with one error and 167 warnings in the current environment (the error is `Date.now()` during render in `src/components/ui/network-status.tsx`).
- `npm audit --omit=dev`: reported 119 advisories (7 critical, 40 high) for the resolved dependency tree; counts may include transitive packages and need individual triage.
- Production build, browser end-to-end flows, real database, upload, jobs and deployment were not verified. Installation in this sandbox required `--ignore-scripts` because the Inngest CLI download failed certificate verification; its CLI binary was not installed by that run.
