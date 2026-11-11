# getpidief — Deep Dive Audit
**Date:** 2026-11-09 · **Branch:** `arena/c39c6d25-getpidief` · **Repo:** `ctrotech-tutor/getpidief`
**Auditor:** Arena Agent (full codebase read: 259 files in `src/`, schema, workers, routes, tests, docs)

---

## 1. What this platform IS

**getpidief — "The Academic Resource Network" / "Scholar's Workstation"**
A document-sharing + PDF-viewing platform for students/researchers. Think *Scribd + ResearchGate + a Nigerian university library*, with:

- Upload PDFs (past exams, lecture notes, research papers, theses…) → moderation → public discovery
- Full-text search, trending, Pulse (live activity feed), follows, comments, bookmarks/collections
- Reputation gamification (points → levels → badges → streaks)
- Admin moderation + analytics + infrastructure management (universities, categories, tags, course codes)
- Nigerian-first seed data: `data/nigerian-university.json` (~100+ universities) + `data/courses-seed.json` (MTH/CHM/PHY/GST/CSC…)

**One-liner verdict:** A *very strong backend skeleton* (DB, auth, search, workers, infra clients) with a *mostly hollow frontend shell*. ~130 of 259 `src/` files are real; **111 are 1-line `Placeholder` stubs and 18 are 0-byte empty files.** It is **not launchable** until the placeholder pages/components are built — but the foundation is genuinely well-designed.

---

## 2. Tech Stack (actual, from `package.json`)

| Layer | Choice | Version / Notes |
|---|---|---|
| Framework | Next.js App Router + React | 16.2.2 / 19.2.4, Turbopack dev (`next dev --turbo`) |
| Language | TypeScript strict | `tsconfig.json`, `@/` alias |
| Styling | Tailwind v4 + shadcn/ui + Framer Motion | `globals.css` uses OKLCH design tokens, dark-first (`#060C19`) |
| DB | Neon Postgres + Drizzle ORM | 3 clients in `lib/db/client.ts`: HTTP (default), WS Pool (tx), node-postgres (workers/scripts) |
| Auth | Auth.js v5 (NextAuth) + Google OAuth + Credentials (bcryptjs) | JWT strategy, Drizzle adapter |
| Files | Uploadthing (router) + Cloudflare R2 (S3 SDK) + Sharp | 64 MB PDF cap, presigned URLs |
| PDF | react-pdf / pdfjs-dist (client), pdf-lib (server) | Viewer atoms in Jotai |
| Jobs | Inngest v4.2.0 | 16 functions, event + cron |
| Realtime | Pusher Channels | Typed `CHANNELS`/`EVENTS` registries |
| Cache/Rate-limit | Upstash Redis + @upstash/ratelimit | Sliding-window limiters |
| Email | Resend + React Email | 8 templates (4 real, 4 placeholder) |
| Push | Web Push (VAPID) | `push_subscriptions` table |
| Analytics | PostHog + Sentry | PostHog provider wired; Sentry DSN hardcoded in configs |
| State | Zustand (UI/upload) + Jotai (PDF viewer) + TanStack Query (server) | **But 4 Zustand stores are 0-byte empty** — see §9 |
| Validation | Zod v4 | 24 schemas in `lib/validations/schemas.ts` |
| Tests | Vitest (unit/integration) + Playwright (e2e) + MSW | Coverage thresholds 70/70/60/70 |
| PWA | @ducanh2912/next-pwa + Workbox | `public/sw.js`, `manifest.json`, offline page |
| Deploy | Vercel + GitHub Actions CI + Doppler secrets | CI: lint → typecheck → test |

Env is Zod-validated at startup (`lib/utils/env.ts`) — 30+ vars required (DB, Auth, Google, Redis, R2, Uploadthing, Pusher, Inngest, Resend, VAPID…). App **throws on boot** if any are missing.

---

## 3. Architecture Map

```
Browser (React 19, RSC + client islands)
  │  TopNav / MobileBottomTabs / CommandPalette(⌘K) / PDFViewer
  ▼
Next.js 16 App Router  ──  src/proxy.ts (edge middleware: auth + onboarding guard)
  ├─ (landing)/  → /            ⚠️ CONFLICT: also src/app/page.tsx (see §10)
  ├─ (auth)/     → /login /register /forgot-password /reset-password /verify-email  ✅ REAL
  ├─ (onboarding)/ → step-1/2/3 (institution → academic focus → interest tags)        ✅ REAL
  ├─ (app)/      → /explore ✅  /search ✅  /d/[slug] ❌  /u/[username] ❌
  │                /dashboard/* ❌  /settings/* ❌  /notifications ❌  /collections ❌
  ├─ admin/      → dashboard/moderation/users/analytics/audit-logs/settings/infrastructure/*  ❌ ALL PLACEHOLDER
  └─ api/        → 31 route files: 22 real, 9 stub-501 (see §6)
        │
        ├─► Neon Postgres (Drizzle) — 35 tables + 1 view, 20 pgEnums (§4)
        ├─► Upstash Redis — cache / trending ZSETs / counters / rate limits (§7)
        ├─► Cloudflare R2 — PDFs, thumbnails, avatars, covers, verification docs
        ├─► Uploadthing — file router (documentPdf / avatar / cover / verification)
        ├─► Inngest — 16 background functions (§8)
        ├─► Pusher — realtime Pulse / notifications / comments / presence
        ├─► Resend — transactional email (React Email templates)
        └─► PostHog + Sentry — analytics + error tracking
```

**Request flows that actually work end-to-end today:**
1. **Register/Login → Onboarding → Explore/Search** — the only complete user journey.
2. **Search** (`/search` RSC → `searchDocuments()` → Postgres FTS) — real, with filters/sort/pagination.
3. **Explore** (`/explore` RSC, `revalidate=60`, Redis-cached categories + trending) — real.
4. **Upload PDF** (Uploadthing → `POST /api/documents` → Inngest `document/uploaded`) — backend real, but the upload UI components (`UploadForm`, `UploadDropzone`) are placeholders, so users can't reach it from the UI.
5. **Comments / reactions / bookmarks / follows / notifications / pulse** — API routes real, but their UI components are placeholders.

**Flows that are dead (placeholder UI + stub API):** document viewer (`/d/[slug]`), public profile (`/u/[username]`), entire dashboard, entire settings, entire admin panel, collections, notifications page, landing page.

---

## 4. Database — 35 Tables + 1 View, 20 Enums (the strongest part)

Single migration: `0000_mushy_malcolm_colcord.sql` (48 KB, 35 `CREATE TABLE`). Schema split across 9 files in `src/lib/db/schema/`.

| Domain | Tables |
|---|---|
| Auth (Auth.js, do-not-rename) | `auth_users`, `auth_accounts`, `auth_sessions`, `auth_verification_tokens`, `password_reset_tokens`, `push_subscriptions` |
| Users | `users` (1:1 with `auth_users`, ~50 cols: identity, role/status, academic profile, verification, onboarding, reputation counters, 2FA, streaks, prefs), `user_interests`, `user_activity_log`, view `public_user_profiles` |
| Institutions | `institutions` (email domains for auto-verify, denormalized counts), `institution_requests`, `categories` (1-level hierarchy), `tags` (merge support + trigram index), `course_codes` (unique per institution) |
| Documents (core) | `documents` (~40 cols: slug, classification, file/hash, preview, visibility/license, moderation, 8 denormalized counters, `trending_score`, `search_vector` tsvector, dedup), `document_tags`, `document_course_codes`, `document_views`, `document_downloads` |
| Interactions | `document_reactions` (like/dislike), `bookmark_collections`, `document_bookmarks`, `comments` (threaded), `comment_helpful_votes`, `document_reports`, `document_shares` |
| Social | `follows`, `notifications`, `search_history` |
| Reputation/Admin | `reputation_events` (immutable ledger), `badges`, `user_badges`, `audit_logs` (before/after snapshots), `analytics_snapshots` (pre-aggregated), `system_settings` |

**Design highlights:**
- 20 pgEnums (`user_role`, `document_status`, `resource_type`, `visibility`, `license`, `reputation_level`, `notification_type`, `report_reason`, `audit_action`, …) — type-safe at DB level.
- Heavy indexing: GIN on `search_vector`, compound `(institution, status, visibility, published_at)`, partial/unread indexes, trigram on tags.
- Denormalized counters everywhere (`view_count`, `download_count`, `follower_count`…) updated by workers — reads stay fast at scale.
- Soft deletes (`deleted_at`), immutable ledgers (`reputation_events`, `audit_logs`).

**Gaps:** `document_views`/`document_downloads` are per-event rows (50M/10M est. at 100K users per ARCHITECTURE.md) — needs monthly partitioning in prod (noted in schema comments, not implemented). Only 1 migration exists — any schema change now needs `db:gen`.

---

## 5. Auth — Powerful but Fragmented (3 files, 2 live configs)

| File | Role | Imported by |
|---|---|---|
| `lib/auth/auth.config.ts` (146 lines) | Edge-safe config: providers (stub `authorize`), JWT/session callbacks, `authorized()` route guard | `src/proxy.ts` only |
| `lib/auth/auth.ts` (269 lines) | Full server config: Drizzle adapter, real Credentials `authorize()` (bcrypt), `signIn`/`jwt` callbacks, `createUser`/`signIn` events, `requireAuth`/`requireRole`/`isAdmin` helpers | 13 files (pages, most APIs, actions) |
| `lib/auth/config.ts` (284 lines) | **Near-duplicate** of `auth.ts` (same adapter + authorize logic) | 7 files (root layout, upload, search, push, pusher APIs, `[...nextauth]` route) |
| `lib/auth/actions.ts` | Server actions: register (bcrypt-12, rate-limited), login, forgot/reset password (anti-enumeration), email verify tokens | Forms |
| `lib/auth/onboardingActions.ts` | 3-step onboarding saves + Redis partial-state cache + `user/onboarding-completed` event | Onboarding pages |

**How it works:** Google OAuth + email/password (password hash stored in `auth_accounts.provider_account_id` — a hack to reuse the Auth.js schema). On first sign-in, `createUser` auto-creates a `users` profile row (generated username) and fires `user/registered`. JWT carries `role`, `onboardingComplete`, `reputationScore/Level`, `institutionId`, `verificationStatus`. Edge middleware (`src/proxy.ts`) enforces: public-route allowlist, onboarding redirect, suspended-account block, admin role gate.

**⚠️ Critical issue — split-brain auth:** Two independent `NextAuth()` instances (`auth.ts` vs `config.ts`) with the same secret will *mostly* interoperate via JWT, but any divergence (callbacks, events, adapter behavior) creates subtle bugs — e.g. `createUser` profile creation only fires on the instance that handled the OAuth callback. The `[...nextauth]` route uses `config.ts` while `actions.ts` uses `auth.ts`. **Recommendation: delete `config.ts`, standardize on `auth.ts` + `auth.config.ts`.**

**Other auth notes:** Password reset tokens are bcrypt-hashed + single-use (`used_at`); rate limits: login 5/min/IP, register 3/10min/IP, reset 3/15min/email. 2FA columns exist in schema but no UI/flow. `trustHost: true` + `useSecureCookies` only in prod.

---

## 6. API Routes — 31 files: 22 Real, 9 Stub (501)

**Real (auth-checked, Zod-validated, sanitized):**
`POST /api/documents` (+ `GET/PATCH/DELETE /api/documents/[id]`, `POST …/react`, `POST …/view`), `POST/GET /api/comments`, `POST/DELETE/GET /api/bookmarks`, `POST/DELETE /api/follows`, `GET/PATCH /api/notifications`, `GET /api/search` + `/autocomplete`, `GET /api/categories|tags|institutions|pulse`, `POST /api/push/subscribe`, `POST /api/pusher/auth`, `GET/PATCH /api/users/[id]`, `GET /api/users/username-check`, `GET/POST /api/upload` (Uploadthing), `GET/POST/PUT /api/inngest` + `/api/webhooks/inngest` (duplicate serve mounts), `GET /api/auth/[...nextauth]`.

**Stub — return `501 Not Implemented` (8 lines each):**
`GET /api/admin/moderation`, `GET /api/admin/stats`, `GET /api/comments/[id]`, `GET /api/documents/[id]/download`, `POST /api/notifications/read-all`, `GET /api/og`, `POST /api/push/unsubscribe`, `POST /api/reports`, `POST /api/users/[id]/follow`.

**Consequence:** Admin panel has no backend; document download tracking, reports, OG images, push unsubscribe, and per-user follow endpoint are all dead. The working `POST /api/follows` partially covers follow, but the `[id]/follow` variant is stubbed.

---

## 7. Infrastructure Clients (all real, well-typed)

- **Redis (`lib/redis/client.ts`, 351 lines):** `KEYS` registry (cache, trending ZSETs, buffers, tokens, locks, flags), `TTL` registry (30s–30d), helpers (`getCache/setCache/invalidateCache/zincrby/zaddScore/incrCounter`), 5+ Upstash sliding-window rate limiters (login/register/reset/upload/search…).
- **Pusher (`lib/pusher/server.ts`, 182 lines):** `CHANNELS` (public-explore, presence-admin, private-user-*, private-document-*, presence-document-*) + `EVENTS` (14 events) + typed `PusherPayloads` + non-fatal `triggerPusher()` wrapper. Client singleton guards against server import.
- **Storage (`lib/storage/client.ts`, 241 lines):** R2 S3 client, `STORAGE_KEYS` patterns (`documents/{id}/{file}`, `thumbnails/{id}.webp`, `avatars/…`), upload/presigned-URL/delete/exists helpers. Note: Uploadthing is the actual upload path; R2 is used by workers (thumbnails).
- **Search (`lib/search/search.ts`, 348 lines):** Postgres FTS (`plainto_tsquery`, `ts_rank`, `ts_headline` with `<mark>`), 5 sort modes, institution-scoped visibility, autocomplete (Redis recent/popular + DB prefix), spelling suggestion (trigram). **⚠️ See §10 — SQL injection risk.**
- **Email (`lib/email/client.ts`):** Resend singleton + 4 sender addresses. Templates: Welcome/Verification/PasswordReset/WeeklyDigest real; BadgeEarned/DocumentApproved/DocumentRejected/NewFollower are placeholders.
- **Sanitize (`lib/utils/sanitize.ts`):** DOMPurify wrappers (HTML/comment/text/URL/filename) — correctly applied in comments + documents APIs (markdown → `marked` → DOMPurify).

---

## 8. Background Workers — 16 Inngest Functions (all real)

Registered in `lib/inngest/functions/index.ts`, served at both `/api/inngest` and `/api/webhooks/inngest` (duplicate — pick one).

| Worker | Trigger | What it does |
|---|---|---|
| `processUploadedDocument` | `document/uploaded` | Validate → pdf-lib metadata/page count → Sharp thumbnail → search vector → dedup → notify author → trending |
| `handleDocumentApproved` | `document/approved` | Cache invalidate, trending ZSET, counters, notify followers, reputation +10 |
| `handleDocumentRejected` | `document/rejected` | Notify contributor, reputation −2 |
| `recalculateTrending` | cron 15 min + event | Composite score → Redis sorted sets (global/cat/institution) |
| `flushEngagementCounters` | cron 5 min + event | Redis buffers → DB batch counter update |
| `rebuildSearchVectors` | `system/rebuild-search-vectors` | Rebuild tsvector with tags |
| `updateReputation` | `reputation/update` | Ledger insert → score/level update → Redis leaderboard → level-up notify → badge check |
| `checkAndAwardBadges` | `reputation/check-badges` | Criteria evaluators (doc count, score, followers, streak) → award + notify |
| `updateUserStreak` | `user/streak-update` (debounced) | Daily streak + bonus |
| `sendNotification` | `notification/send` | In-app insert → Pusher → email (if pref) → Web Push; 50/min/recipient limit |
| `sendWeeklyDigest` / `processWeeklyDigest` | cron Mon 9AM / event | Fan-out digest emails |
| `takeDailySnapshot` | cron midnight | Analytics aggregation → `analytics_snapshots` |
| `aggregatePopularSearches` | cron hourly | Search logs → Redis ZSET |
| `updateInstitutionLeaderboard` | cron 6h | Institution activity scores |
| `cleanupExpiredData` | cron 3AM | Tokens, soft-deleted docs, old logs |

Reputation points map (`REPUTATION_POINTS`): upload +2, approved +10, rejected −2, download +1, like-received +2, comment +1, helpful +3, follower +1, streak +5, flagged −5. Levels: Scholar 0–99 → Analyst 100–499 → Archivist 500–1999 → Senior Contributor 2000–4999 → Distinguished Scholar 5000+.

**⚠️ Inngest v4 API risk:** Workers use the v4 `triggers: [{ event }]` / `triggers: [cron(...)]` shape. `ts_errors.txt` (UTF-16 Windows dump, 81 lines) shows type errors on `event`/`step` params — the installed `inngest@4.2.0` typings expect the v4 handler signature. Verify with `npm run typecheck` after `npm ci`; the committed error dump is stale (Windows paths `C:\Projects\…`) but the error classes (missing modules for stub routes, Inngest handler types, `RouteHandlerConfig` on OG route) are real.

---

## 9. Frontend — Real Core, Hollow Shell

**Real components (27 files):**
- Auth: `LoginForm` (316), `RegisterForm` (355), `ForgotPasswordForm`, `ResetPasswordForm`, `GoogleOAuthButton`, `PasswordStrengthMeter`, `AcademicFocusStep`, `Institutionsearchstep` (255), `InterestTagsStep`, `OnboardingStepperClient`
- Search: `SearchBar` (265), `FilterSidebar` (244), `SearchResults`, `SearchPagination`, `ActiveFilters`, `CategoriesStrip`
- Documents: `ResourceCard` (459 — grid+list variants, the workhorse)
- Dashboard: `PulseFeed` (133, Pusher live)
- Layouts: `TopNav` (271), `MobileBottomTabs`, `PostHogProvider`, `TanstackQueryProvider`
- Emails: `BaseLayout` + 4 real templates

**Placeholder components (60+ files, each `export default function Placeholder() { return null; }`):**
All charts (4), admin (6), comments (4), dashboard (8 incl. `UploadForm`/`UploadDropzone`), documents (9 incl. `PDFViewer`×4, `ShareModal`, `ReportModal`), notifications (4), profile (7), search extras (3), layouts (`AdminSidebar`, `DashboardSidebar`, `CommandPalette`), 4 email templates.

**Empty files (0 bytes, 18):** 10 hooks (`useBookmark`, `useFollow`, `useReaction`, `useSearch`, `useUpload`, `useInfiniteScroll`, `useLocalStorage`, `useMediaQuery`, `useCopyToClipboard`, `useCommandPalette`), 4 stores (`authStore`, `uiStore`, `uploadStore`, `notificationStore` — note: `stores/index.ts` *does* define `useUIStore`, so there are two competing UI-store locations), 4 repositories (`admin`, `categories`, `comments`, `notifications`), 2 scripts (`bulk-import-courses`, `generate-vapid`).

**Real pages (11):** `/` (root "Coming Soon"), `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/onboarding/step-1/2/3`, `/explore`, `/search`.
**Placeholder pages (30+):** `/d/[slug]` (+loading/not-found), `/u/[username]` (+loading/not-found), all of `/dashboard/*`, `/settings/*`, `/notifications`, `/collections/[id]`, all of `/admin/*`, `(landing)` layout+page.

**State:** Jotai PDF atoms (`pdfViewerStore.ts`) are real but unused (viewer is placeholder). Zustand stores empty. TanStack Query provider wired. Hooks mostly empty — optimistic UI (bookmark/reaction/follow) has no implementation.

---

## 10. Critical Issues (fix in this order)

1. **🔴 Route conflict at `/`:** `src/app/page.tsx` (real "Coming Soon") and `src/app/(landing)/page.tsx` (placeholder) both resolve to `/`. Next.js will error or pick unpredictably. Delete one — keep `(landing)` and build the real landing there.
2. **🔴 SQL injection surface in `search.ts`:** `sql.raw()` with string-interpolated `language`, `institutionScoped`, `yearFrom/yearTo`, `pageCountMin/Max`, `limit/offset`, `orderBy`. `language`/`institutionScoped` come from user input (Zod-validated upstream, but defense-in-depth is missing). Rewrite with parameterized `sql` fragments / Drizzle query builder.
3. **🔴 Split-brain auth (`auth.ts` vs `config.ts`):** Two NextAuth instances. Consolidate to one.
4. **🔴 Placeholder layouts return `null`:** `(landing)/layout`, `admin/layout`, `dashboard/layout`, `settings/layout` render nothing — even real child pages would show blank. Every placeholder page/component must be built or removed.
5. **🟠 9 stub API routes (501):** Admin, download tracking, reports, OG, push-unsubscribe, comment-by-id, follow-by-id, read-all. Either implement or delete routes + callers.
6. **🟠 Duplicate Inngest mounts:** `/api/inngest` and `/api/webhooks/inngest` both `serve()` the same functions. Keep one (Inngest Cloud expects a single endpoint).
7. **🟠 `ts_errors.txt` is committed** (UTF-16, Windows paths) — stale and misleading. Delete it; rely on `npm run typecheck` in CI.
8. **🟠 Sentry DSN hardcoded** in `sentry.*.config.ts` (public ingest key — low risk, but should be env-driven). `sendDefaultPii: true` + `tracesSampleRate: 1` in prod config is expensive/privacy-sensitive.
9. **🟡 Password in `provider_account_id`:** Works, but fragile — any Auth.js upgrade that validates this field breaks credentials login. Document the hack (already commented) and add a regression test.
10. **🟡 `db.execute()` params ignored:** In `search.ts`, `rawParams` is built but never passed to `db.execute(searchQuery)` — the `$1/$2…` placeholders rely on `sql.raw` string interpolation instead. This is the root of issue #2.
11. **🟡 Empty hooks/stores/repos:** 18 zero-byte files + `stores/index.ts` vs `stores/uiStore.ts` duplication. Implement or delete — empty files break imports if anything references them.
12. **🟡 Tests:** `reputation.test.ts` + `search.test.ts` are 7-line placeholder asserts; `admin.spec.ts` + `upload.spec.ts` are 0 bytes. Real coverage is only sanitize/schemas/utils/documents. CI runs `vitest` (not `run`) — may hang in CI without `--run`.
13. **🟡 Seed data mismatch:** `scripts/seed.ts` seeds South African universities (UCT…) while `data/nigerian-university.json` is Nigerian — decide the launch market and align seed + onboarding.
14. **🟡 `next lint` is deprecated** in Next 16 (`eslint-config-next` still present). Migrate to `eslint` CLI per AGENTS.md note.

---

## 11. Testing & CI/CD

- **Unit (Vitest, jsdom):** `sanitize` (145 lines, real), `schemas` (274, real), `utils` (226, real), `reputation`/`search` (7-line placeholders).
- **Integration:** `documents` (80 lines, real-ish), `auth` (7-line placeholder). MSW handlers in `tests/mocks/`.
- **E2E (Playwright):** `auth.spec` (285), `onboarding.spec` (113), `search.spec` (60) real; `admin.spec`/`upload.spec` empty. `auth.setup.ts` present.
- **CI (`.github/workflows/ci.yml`):** Node 20, `npm ci` → lint → typecheck → test. No build step, no Playwright, no DB provisioning — integration tests likely fail/skip in CI without Neon branch setup.
- **Scripts:** `seed.ts` (14 KB, real, retry logic, seeds institutions/categories/tags/badges/settings + 3 test users). `bulk-import-courses.ts` + `generate-vapid.ts` empty.

---

## 12. What "Done" Looks Like — Suggested Build Order

1. **Fix blockers:** route conflict, auth consolidation, search SQL parameterization, delete `ts_errors.txt`, single Inngest endpoint.
2. **Core user loop:** build `/d/[slug]` (PDFViewer + EngagementBar + CommentStream + MetadataPanel) + `GET /api/documents/[id]/download` + `POST /api/reports` — this is the product.
3. **Contributor loop:** build dashboard (`UploadForm`/`UploadDropzone`/`UploadsTable`/`StatsCard`) + profile (`/u/[username]`) + notifications page/bell.
4. **Admin loop:** implement `admin/stats` + `admin/moderation` APIs, then moderation/users/analytics pages.
5. **Polish:** landing page, OG route, charts, email templates, hooks/stores, 2FA flow, Meilisearch upgrade path (noted in GUIDE.MD Phase 3).
6. **Harden:** partitioning for views/downloads, Sentry env config, Playwright in CI, coverage gates enforced.

**Docs:** `ARCHITECTURE.md` (24 KB, accurate), `GUIDE.MD` (52 KB blueprint), `INNGEST-MIGRATION-V4.MD`, `INNGEST-OFFICIAL-DOC.md`, `AGENTS.md`/`CLAUDE.md` (agent instructions). README is still the default `create-next-app` template — replace it.

---

*End of audit. Backend bones: A-. Frontend shell: D. Overall: a well-architected MVP at ~40% — the next 60% is almost entirely UI + 9 API stubs.*
