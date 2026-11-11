Here is the complete architecture blueprint and weekly build plan.

---

## TECH STACK — FULL DECISION

Before the phases, here is every tool, why it's chosen, and where it fits.

**Core Framework**
- **Next.js 16+** (App Router, React Server Components, Server Actions, Streaming, Partial Prerendering)
- **TypeScript** — strict mode everywhere, no exceptions

**Database & ORM**
- **Neon DB** — serverless PostgreSQL, branching for dev/staging, autoscaling
- **Drizzle ORM** — chosen over Prisma because it runs on Edge Runtime, is type-safe, and has zero cold-start overhead. Drizzle Kit for migrations
- **Neon Auth** — for session/user tables integration directly with Neon DB

**Authentication**
- **Auth.js v5 (NextAuth)** — wraps Neon Auth, handles Google OAuth + Email/Password + session management
- **Google OAuth 2.0** — primary social login
- **bcryptjs** — password hashing for email auth

**File Storage & Upload**
- **Uploadthing** — type-safe file uploads, handles chunking, progress, validation, direct-to-cloud
- **Cloudflare R2** — primary object storage for PDFs (S3-compatible, zero egress fees)
- **Sharp** — server-side PDF thumbnail generation (first page to image)

**PDF Handling**
- **react-pdf** (pdfjs-dist) — client-side PDF rendering with lazy page loading
- **pdf-lib** — server-side PDF metadata extraction, page count, compression check
- **pdf2pic / Puppeteer (serverless)** — thumbnail generation pipeline on upload

**Real-time & Messaging**
- **Pusher Channels** — WebSocket-based real-time (Pulse feed, live notifications, comment stream). Chosen over raw Socket.io because it works serverlessly on Vercel Edge
- **Upstash Redis** — pub/sub backbone behind Pusher events, also used for caching, rate limiting, queues

**Caching & Performance**
- **Upstash Redis** — API response caching, session store, rate limiter, leaderboard/trending data
- **Next.js `unstable_cache` / `revalidateTag`** — fine-grained ISR cache invalidation
- **Vercel Edge Network / CDN** — static assets, edge-cached pages

**Search**
- **PostgreSQL Full-Text Search** (Phase 1–2, built-in) — `tsvector` columns, `gin` index
- **Meilisearch on Fly.io** (Phase 3+) — upgrade path for typo-tolerant, faceted, fast search

**Background Jobs**
- **Inngest** — event-driven background functions: PDF processing pipeline, email sends, reputation calculation, moderation webhooks, thumbnail generation

**Email**
- **Resend** — transactional email (verification, reset password, upload approval, notifications digest)
- **React Email** — email templates as React components

**Validation**
- **Zod** — schema validation everywhere: API inputs, forms, env vars, DB outputs
- **React Hook Form** — form state + Zod resolver

**State Management**
- **Zustand** — lightweight global state (auth state, UI state, upload queue)
- **TanStack Query (React Query)** — server state, caching, optimistic updates, infinite scroll
- **Jotai** — atomic state for PDF viewer controls

**UI & Styling**
- **Tailwind CSS v4** — utility-first, JIT, design token integration
- **Shadcn/ui** — unstyled accessible primitives, fully customized
- **Framer Motion** — page transitions, card animations, micro-interactions
- **Lucide React** — icon system
- **next-themes** — dark/light mode

**Analytics & Monitoring**
- **PostHog** — product analytics, feature flags, session replay
- **Sentry** — error tracking, performance monitoring, release tracking
- **Vercel Analytics + Speed Insights** — Core Web Vitals, real user metrics
- **Axiom** — structured logging

**Testing**
- **Vitest** — unit + integration tests
- **Playwright** — end-to-end tests
- **MSW (Mock Service Worker)** — API mocking in tests

**DevOps & Infrastructure**
- **Vercel** — deployment, preview environments per PR, edge functions
- **GitHub Actions** — CI/CD: lint → type-check → test → preview → production deploy
- **Neon DB branching** — each PR gets its own DB branch automatically via GitHub Action
- **Doppler** — secrets management across environments

---

## DATABASE SCHEMA OVERVIEW

Every table, every relationship, designed before a single page is built.

```
users
  id, email, name, username, avatar_url, bio, password_hash,
  role (student|contributor|moderator|admin|super_admin),
  status (active|suspended|pending), reputation_score,
  institution_id (FK), faculty, major, academic_level, academic_year,
  is_verified, verification_requested_at, email_verified_at,
  created_at, updated_at

institutions
  id, name, slug, country, type (university|college|institute),
  logo_url, domain_hint, is_active, document_count, created_at

categories
  id, name, slug, icon, color, parent_id (self-ref for sub-categories),
  document_count, is_active

documents
  id, title, slug, description, file_url, file_size, page_count,
  thumbnail_url, preview_status (processing|ready|failed),
  author_id (FK users), institution_id (FK), category_id (FK),
  resource_type (exam|notes|research|summary|assignment|tutorial|other),
  course_code, academic_year, semester, language,
  visibility (public|institution|private),
  license, allow_download, allow_print,
  status (pending|approved|rejected|flagged),
  rejection_reason, moderated_by (FK users), moderated_at,
  download_count, view_count, like_count, bookmark_count, comment_count,
  search_vector (tsvector),
  created_at, updated_at, published_at

document_tags
  document_id (FK), tag_id (FK)

tags
  id, name, slug, usage_count, created_at

document_likes (unique user+document)
  id, user_id, document_id, type (like|dislike), created_at

document_bookmarks
  id, user_id, document_id, collection_id (FK, nullable), created_at

bookmark_collections
  id, user_id, name, description, is_public, document_count, created_at

comments
  id, document_id (FK), user_id (FK), parent_id (self-ref for replies),
  content, is_edited, helpful_count, is_flagged, is_deleted,
  created_at, updated_at

comment_helpful_votes
  id, comment_id, user_id, created_at

follows
  id, follower_id (FK users), following_id (FK users), created_at

notifications
  id, recipient_id (FK users), sender_id (FK users, nullable),
  type (like|comment|follow|approved|rejected|new_upload|badge|system),
  entity_type (document|comment|user), entity_id,
  message, is_read, created_at

user_interests (selected during onboarding)
  user_id (FK), tag_id (FK)

document_views (for analytics, separate high-write table)
  id, document_id, user_id (nullable), ip_hash, created_at

reputation_events
  id, user_id, type, points_delta, reference_id, created_at

badges
  id, name, slug, description, icon, criteria_type, criteria_value

user_badges
  id, user_id, badge_id, awarded_at

audit_logs (admin actions)
  id, admin_id, action, entity_type, entity_id, before_state, after_state, ip, created_at

sessions (managed by Auth.js, Neon adapter)
verification_tokens (managed by Auth.js)
accounts (OAuth accounts, managed by Auth.js)
```

---

## ARCHITECTURE DECISIONS

**Rendering Strategy per Route:**

| Route | Strategy | Why |
|---|---|---|
| `/` Landing | Static (SSG) | Never changes, CDN cached |
| `/explore` Homepage | ISR (60s revalidate) | Trending data, semi-fresh |
| `/search` | Server-rendered on request | Query-dependent |
| `/d/[slug]` Document | ISR (300s) + on-demand revalidate | High traffic, mostly static |
| `/u/[username]` Profile | ISR (120s) | Profile changes occasionally |
| `/dashboard/*` | Dynamic (SSR) | User-specific, no caching |
| `/admin/*` | Dynamic (SSR) + middleware auth | Sensitive, always fresh |
| API routes | Edge Runtime where possible | Low latency |

**Folder Structure:**
```
src/
├── app/
│   ├── (auth)/login, register, forgot-password
│   ├── (onboarding)/onboarding/step-1,2,3
│   ├── (app)/
│   │   ├── explore/
│   │   ├── search/
│   │   ├── d/[slug]/          ← document workspace
│   │   ├── u/[username]/      ← profiles
│   │   ├── dashboard/
│   │   └── settings/
│   ├── admin/
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── documents/
│       ├── users/
│       ├── search/
│       ├── notifications/
│       ├── upload/
│       └── admin/
├── components/
│   ├── ui/           ← base components (shadcn customized)
│   ├── features/     ← feature-specific components
│   ├── layouts/      ← shell layouts
│   └── emails/       ← React Email templates
├── lib/
│   ├── db/           ← Drizzle schema, client, migrations
│   ├── auth/         ← Auth.js config
│   ├── redis/        ← Upstash client, helpers
│   ├── pusher/       ← Pusher server + client
│   ├── inngest/      ← background job functions
│   ├── storage/      ← R2/Uploadthing helpers
│   ├── search/       ← search utilities
│   └── validations/  ← Zod schemas
├── hooks/            ← custom React hooks
├── stores/           ← Zustand stores
└── types/            ← global TypeScript types
```

---

## PHASE PLAN

---

### PHASE 1 — FOUNDATION & INFRASTRUCTURE
**Duration: Week 1 – Week 2**
**Goal:** Zero features, but the entire skeleton is unbreakable. Every dev decision is made here. Nothing is revisited.

**Week 1 — Project Bootstrap & Infrastructure**

Day 1–2: Repository & Tooling
- Initialize Next.js 15 with TypeScript strict, App Router, Turbopack
- Configure ESLint (eslint-config-next + custom rules), Prettier, Husky pre-commit hooks
- Set up absolute imports (`@/`), path aliases
- Configure Tailwind CSS v4, define all design tokens as CSS variables (colors, spacing, typography, shadows, radii) matching the design system
- Set up Shadcn/ui, install and configure base components
- Initialize GitHub repository, branch protection rules (require PR + CI pass for main)
- Set up Doppler for secrets management, define all environment variable schemas with Zod in `env.ts`
- Configure Sentry (Next.js SDK), Vercel Analytics, PostHog initial setup

Day 3–4: Database Setup
- Create Neon DB project, configure dev/staging/production branches
- Set up Drizzle ORM: `drizzle.config.ts`, connection client (HTTP for serverless, WebSocket for long-running)
- Write the complete database schema in Drizzle (all tables listed above)
- Write seed script: 5 institutions, 10 categories, 20 tags, 3 test users, 15 test documents
- Configure GitHub Action: on PR open → auto-create Neon DB branch → run migrations → run seed → comment branch URL on PR
- Set up Drizzle Kit migrations workflow, initial migration file
- Configure connection pooling (PgBouncer via Neon) for production

Day 5: Storage & CDN
- Set up Cloudflare R2 bucket (PDF storage), CORS config, public access policy
- Configure Uploadthing: file router defining document uploads (PDF only, max 50MB), avatar uploads (images, max 5MB), cover images
- Set up Upstash Redis: two databases (cache + rate-limit), configure `@upstash/redis` client
- Configure Vercel project: production + preview deployments, environment variable groups

**Week 2 — Auth System & Core Middleware**

Day 1–2: Authentication
- Install and configure Auth.js v5 with Neon adapter
- Set up Google OAuth provider: create GCP project, OAuth consent screen, credentials, callback URLs
- Set up Email/Password provider with bcryptjs, verify email flow
- Write complete auth schema integration with Drizzle (sessions, accounts, verification_tokens)
- Build auth utilities: `getCurrentUser()`, `requireAuth()`, `requireRole()` server-side helpers
- Configure `middleware.ts`: route protection matrix (public vs authenticated vs admin routes), redirect logic, role-based access

Day 3: Security Layer
- Implement rate limiting middleware using Upstash Redis (`@upstash/ratelimit`): login (5/min), register (3/min), upload (10/hour), API (100/min per user)
- Set up CSRF protection (Auth.js built-in), Content Security Policy headers in `next.config.ts`
- Configure security headers: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- Implement input sanitization utilities (DOMPurify server-side wrapper)

Day 4–5: Core Utilities & Testing Foundation
- Build shared utility library: `formatDate`, `formatFileSize`, `formatNumber` (1.2K, 4.8M), `slugify`, `truncate`, `generateInitialsAvatar`
- Set up Vitest with jsdom, React Testing Library, configure test database (separate Neon branch)
- Set up Playwright: browser config, auth fixtures, test user setup
- Set up MSW for API mocking in tests
- Write unit tests for all utilities, auth helpers, validation schemas
- Set up Inngest: client, dev server, base function structure
- Set up Resend + React Email: configure client, create base email template layout

**Deliverables by End of Phase 1:**
- Working Next.js project deployed on Vercel (shows "getpidief is live" placeholder)
- Complete database schema, migrations running, seed data exists
- Auth.js configured, Google OAuth working end-to-end in dev
- All environment variables managed, CI/CD pipeline green
- Rate limiting active, security headers configured
- Test infrastructure running, 30+ unit tests passing

---

### PHASE 2 — AUTHENTICATION & ONBOARDING
**Duration: Week 3 – Week 4**
**Goal:** Every auth and onboarding screen fully functional. A new user can register, verify email, sign in with Google, complete onboarding, and reach the (empty) dashboard.

**Week 3 — Auth UI & Logic**

Day 1–2: Login & Register Pages
- Build the 50/50 split-screen layout shell (reused across auth pages)
- Build Login page: Google OAuth button (premium styled), email/password form with React Hook Form + Zod, show/hide password toggle, remember me, loading states, error states (field-level + toast), success redirect
- Build Register page: two-column name fields, institutional email with real-time domain validation hint, password strength meter (4-segment, real-time), checkbox agreements, same split layout
- Integrate Auth.js `signIn()` / `signUp()` server actions
- Email verification: send verification email via Resend on register, build verification token landing page `/verify-email?token=...`
- Write Playwright E2E tests: register flow, login flow, Google OAuth (mocked)

Day 3: Forgot / Reset Password
- Build 3-state forgot password flow: request form → email sent confirmation → reset form
- API route: generate secure reset token (crypto.randomBytes), store in Redis with 15-min TTL, send Resend email
- Reset token validation: verify token exists + not expired, hash new password, clear token, redirect
- 60-second cooldown timer on resend button using React state

Day 4–5: Session & Account Management
- Build account linking: if Google OAuth email matches existing email account → link accounts, don't create duplicate
- Handle OAuth errors gracefully (access_denied, etc.)
- Implement `useSession()` client hook and server-side `getSession()` usage patterns
- Set up protected layout: `app/(app)/layout.tsx` wraps all authenticated pages, redirects unauthenticated users

**Week 4 — Onboarding Flow**

Day 1: Onboarding Shell
- Build onboarding layout: full-screen, progress stepper component (dots + connecting line, animated), skip link, step counter, card container with slide transitions between steps
- Store onboarding state in Zustand (persisted to localStorage for resume on refresh)
- Create `onboarding_complete` boolean on user record; middleware redirects incomplete-onboarding users to `/onboarding/step-1` automatically after login

Day 2: Step 1 — Institution Search
- Build institution search: debounced API call (300ms) to `/api/institutions/search?q=`, returns matching institutions from DB
- Institution dropdown with logo, name, country flag, type badge
- Popular institutions quick-pick (top 6 by document count from Redis cache)
- "Can't find your institution?" → modal with name/country form → creates `institution_request` record for admin review
- Server Action: save institution selection to user record + session

Day 3: Step 2 — Academic Focus
- Faculty dropdown: static list → triggers major/programme dynamic load
- Segmented control for academic level (smooth pill slide animation)
- Year/semester picker
- `Contributor` toggle: if enabled, add extra step fields (contribution areas, social links)
- Server Action: save academic profile to user record

Day 4: Step 3 — Interest Tags
- Fetch all active tags from DB (cached in Redis, 1hr TTL)
- Render tag grid as selectable pills, min 3 required, counter feedback
- Trending section: query Redis sorted set for trending tags at user's institution
- Server Action: bulk insert to `user_interests` table
- Completion: trigger Inngest event `user.onboarding_completed` → background job updates Redis recommendation cache, sends welcome email

Day 5: Polish & Edge Cases
- Handle onboarding interruption (partial completion resumes at last step)
- Build `completeOnboarding` server action that sets flag + redirects
- Confetti animation on final step completion (tsparticles or custom CSS keyframe burst)
- Write full Playwright E2E test covering complete onboarding flow
- Test all error states, network failure recovery

**Deliverables by End of Phase 2:**
- Complete auth suite live: login, register, Google OAuth, email verify, forgot/reset password
- Full 3-step onboarding with real data persisted
- User lands on dashboard after onboarding
- All auth routes protected by middleware
- E2E tests covering all auth flows

---

### PHASE 3 — CORE DISCOVERY ENGINE
**Duration: Week 5 – Week 7**
**Goal:** The heart of the product. Users can discover, search, filter, and browse documents. The homepage, search results, and archive view are complete.

**Week 5 — Homepage & Data Layer**

Day 1–2: Document API Layer
- Build complete document repository: `lib/db/repositories/documents.ts`
  - `getDocuments({ page, limit, filters, sort })` — paginated, filtered
  - `getTrendingDocuments(institutionId?, categoryId?)` — queries Redis sorted set, falls back to DB
  - `getRecommendedDocuments(userId)` — based on user interests tags, institution, major
  - `searchDocuments(query, filters)` — PostgreSQL FTS using `tsvector` + `plainto_tsquery`
  - `getDocumentBySlug(slug)` — with all relations joined
- Set up Redis sorted sets for trending: `trending:documents:global` and `trending:documents:{institutionId}` — updated by Inngest job every 15 minutes based on recent view/like/download scores
- Build category and institution APIs with Redis caching (1hr TTL, invalidated on admin changes)

Day 3–4: Homepage UI
- Build main authenticated layout: `(app)/layout.tsx` — top navigation (search, notifications, avatar), responsive (collapses to mobile bottom bar)
- Build `CommandPalette` component: ⌘K trigger, floating full-screen overlay, grouped results (documents, contributors, categories, navigation), keyboard arrow navigation, enter to select
- Build homepage:
  - Personalized greeting + unread pulse count
  - Dominant search bar with autocomplete (debounced 250ms, TanStack Query)
  - Trending categories strip (horizontal scroll, TanStack Query with 5min stale time)
  - Resource card component (full feature set: thumbnail, metadata, badges, engagement, hover quick-actions)
  - `RecommendedSection`, `TrendingSection`, `RecentSection` — each using React Server Component streaming with Suspense boundaries and skeleton fallbacks
  - Right sidebar (desktop): Focus widget, followed contributors compact list, active institutions leaderboard

Day 5: Resource Card & Skeleton System
- Perfect the `ResourceCard` component: all variants (grid, list, compact, skeleton)
- PDF thumbnail: `<Image>` component loading from R2 via Cloudflare CDN, fallback to category-colored placeholder with document icon
- Optimistic UI for bookmark toggle (instant visual feedback, revert on server error)
- Skeleton components that exactly match loaded card dimensions

**Week 6 — Search & Filtering**

Day 1–2: Search Engine
- Build search page `/search`: URL-based state (`?q=&category=&type=&year_from=&year_to=&institution=&verified=&sort=&page=`)
- Use `useSearchParams` + `router.push` for URL-driven filtering (shareable URLs, browser back works)
- Search API route `/api/search`: PostgreSQL FTS with `tsvector` + weighted ranking (`A` for title, `B` for description, `C` for tags), `gin` index, highlights using `ts_headline`, pagination
- Search analytics: log every search query to Redis (`ZINCRBY searches:popular`) for trending searches data
- Autocomplete API `/api/search/autocomplete`: queries both `documents.title` prefix + popular searches from Redis, returns in <80ms (Redis first, DB fallback)
- Implement search result highlighting (matched terms bolded in title/description)

Day 3: Filter System
- Build `FilterSidebar` component with all filters: category checkboxes (with counts), resource type, institution multi-select, year range slider, verified toggle, language, page count range
- Filter state in URL params — selecting a filter updates URL, component reads from URL (SSR-compatible)
- Applied filters chips row below search bar, each chip dismissible
- Mobile: filter sidebar becomes bottom drawer with `FilterDrawer` component

Day 4: Results UI & Sort
- Build Archive View (list mode): horizontal card with thumbnail, metadata, stats column, action column
- Build Grid View: 3-column responsive, same data as list cards
- View toggle persisted in localStorage
- Sort dropdown: 5 options, updates URL param
- Pagination: both traditional (page numbers) and infinite scroll option (toggle in user settings)
- Result count display: `Showing 1,842 results for "data structures"` with result range

Day 5: Search Upgrade & Empty/Error States
- Implement search suggestions: `Did you mean "[corrected query]?"` using PostgreSQL similarity functions
- Related searches section at bottom of results
- All empty states: no results (with suggestion actions), no results after filter (with clear filters CTA)
- Search error state, offline state
- Write Vitest tests for search API, filter logic, URL param parsing

**Week 7 — Pulse Feed & Real-Time Bootstrap**

Day 1–2: Pusher Integration
- Set up Pusher Channels: server client, client-side hook `usePusher`
- Channel architecture: `presence-explore` (global), `private-user-{userId}` (personal notifications), `private-document-{docId}` (document comments)
- Build Pusher server helper: `triggerEvent(channel, event, data)` with Redis pub/sub backing
- Build `usePulse` hook: subscribes to `presence-explore` channel, receives `document.published`, `document.trending`, `user.activity` events

Day 3–4: Pulse Feed UI
- Build `PulseFeed` component: horizontal scrollable cards with real-time updates via Pusher
- New item animation: cards slide in from right with stagger, old items push left
- Activity card: contributor avatar, event description, institution badge, time-ago (live updating with `useEffect` interval), view count
- "Live" indicator: blinking green dot, subscriber count (from Pusher presence channel)
- Fallback: if WebSocket fails, poll `/api/pulse` every 30s with graceful degradation message

Day 5: Trending Algorithm & Caching
- Inngest function `calculateTrending`: runs every 15 minutes, scores documents by `views * 1 + likes * 3 + downloads * 5 + comments * 2` within rolling 24-hour window, writes top 50 to Redis sorted set per category + global
- Inngest function `refreshPopularSearches`: aggregates Redis search logs, writes top 20 to `searches:popular` key hourly
- Cache invalidation strategy: `revalidateTag()` called from Server Actions when document is published, liked, etc.

**Deliverables by End of Phase 3:**
- Full homepage with personalized sections, live Pulse feed, real-time document activity
- Complete search system with FTS, filters, sort, pagination, autocomplete
- Archive View (list + grid) fully functional
- All empty/error/loading states implemented
- Search analytics logged to Redis

---

### PHASE 4 — PDF WORKSPACE & RESOURCE DETAIL
**Duration: Week 8 – Week 9**
**Goal:** The Scholar's Workstation — the deepest, most-used screen in the product. PDF viewing, all interactions, comments, sharing.

**Week 8 — PDF Viewer & Workspace Layout**

Day 1–2: PDF Pipeline (Backend)
- Build Inngest function `processUploadedDocument`:
  - Triggered by `document.uploaded` event
  - Downloads PDF from R2
  - Uses `pdf-lib` to extract: page count, title metadata, creation date, file integrity check
  - Uses Sharp + pdf2pic (or Puppeteer serverless) to render first page as WebP thumbnail (800×1100px), upload thumbnail back to R2
  - Updates document record: `page_count`, `thumbnail_url`, `preview_status: 'ready'`
  - Triggers `document.preview_ready` event → notifies uploader via Pusher private channel
- Build `extractDocumentMetadata(fileUrl)` utility for synchronous quick extraction

Day 3–4: react-pdf Integration
- Install `react-pdf`, configure worker: `pdfjs-dist/build/pdf.worker.entry` via `next.config.ts` webpack alias
- Build `PDFViewer` component:
  - `<Document>` wrapper with loading/error handlers
  - Virtualized page rendering: `react-window` `VariableSizeList` — only renders pages in viewport ±1 page buffer
  - Page navigation: prev/next buttons, direct page input, total pages display
  - Zoom controls: preset levels (50% 75% 100% 125% 150% 200%) + mouse wheel zoom
  - Fit-to-width and fit-to-page modes
  - Fullscreen mode: CSS `position: fixed`, keyboard Esc to exit
  - Thumbnail strip: left panel toggle, scrollable thumbnails of all pages, click to jump
  - Loading state: skeleton shimmer in exact document dimensions
  - Error state: graceful fallback with download button
- All viewer controls in `jotai` atoms (zoom, page, fullscreen, thumbnail panel open)

Day 5: Workspace Layout
- Build document workspace layout: full-height, split panels, no global nav
- Custom workstation top bar: breadcrumb, document title (truncated with tooltip), Download button, Share button, more options dropdown
- Panel resize handle: drag to adjust split ratio (stored in localStorage)
- Mobile: panels stack vertically, PDF viewer first, metadata below (collapsible)
- Keyboard shortcuts: `←/→` page navigation, `+/-` zoom, `F` fullscreen, `B` bookmark, `Esc` exit fullscreen

**Week 9 — Metadata Panel & Interactions**

Day 1: Metadata Panel
- Build right panel with all metadata sections as defined in spec
- Quick stats row: 4 animated counter cards (animate number on load)
- Action buttons: Like/Dislike (optimistic toggle, Inngest event → updates Redis counter → DB debounce write), Bookmark (optimistic, collection picker popover), Share, Report
- Like count updates in real-time via Pusher `document-{id}` channel
- Build `ShareModal`: copy link (clipboard API, toast on copy), QR code (using `qrcode` library), social share links (WhatsApp, Telegram, Twitter/X, LinkedIn, Email)
- Build `ReportModal`: reason multi-select + optional note + submit → creates `report` record + Pusher event to admin channel

Day 2: Contributor Card & Follow
- Contributor card with avatar, name, verified badge, institution, reputation score
- Follow/Unfollow server action: toggles `follows` record, updates follower count in real-time (Pusher), Inngest event for notification
- Reputation score display: custom `ReputationBadge` component with level colors and tooltip showing breakdown

Day 3–4: Discussion Stream
- Build comment system with nested replies (2 levels max)
- Comment composer: textarea with `@mention` support (rudimentary: triggers user search dropdown on `@`)
- Post comment: Server Action → insert to DB → Pusher broadcast to `document-{id}` channel → all viewers see new comment in real-time without refresh
- Comment item: avatar, username, timestamp (relative, live updating), body, reply count, helpful vote button, edit (own comments), delete (own + moderators), collapse thread
- Nested replies: indented with left accent line, lazy-loaded on `View X replies` click
- Pagination: `Load more comments` button, infinite from top
- Realtime: `useEffect` subscribes to Pusher channel, new comments prepend to list with slide-down animation
- Markdown support: comments support basic markdown (bold, italic, code inline, links) — use `marked` + DOMPurify sanitization

Day 5: Related Materials & SEO
- `RelatedMaterials` carousel: query documents with same category + course code, sorted by download count, excludes current document
- Horizontal scroll with navigation arrows, each compact card
- SEO: dynamic `generateMetadata()` for document pages: OpenGraph title/description/image (thumbnail URL), Twitter card, structured data (Schema.org `DigitalDocument`)
- URL canonical, robots meta, sitemap entry via `next-sitemap`
- Write full Playwright test for PDF workspace interactions

**Deliverables by End of Phase 4:**
- Fully functional PDF viewer with zoom, pagination, fullscreen, thumbnails
- All interactions working: like, bookmark, share, report, download tracking
- Real-time comment stream via Pusher
- Related materials carousel
- Document processing pipeline (thumbnail generation) via Inngest
- Full SEO metadata on document pages

---

### PHASE 5 — USER DASHBOARD & UPLOAD HUB
**Duration: Week 10 – Week 11**
**Goal:** Complete personal dashboard, upload workflow, library management, collections.

**Week 10 — Dashboard & Library**

Day 1: Dashboard Layout & Navigation
- Build authenticated dashboard shell: fixed left sidebar, main content, responsive mobile bottom tabs
- Left sidebar: user card (avatar, name, username, institution, reputation), navigation links with counters, storage progress bar
- Mobile bottom tab bar: 5 tabs with icons, badge counts on notifications and library
- Dashboard overview page: greeting, 4 stats metric cards (animated on load), activity log, quick actions, continue-watching strip

Day 2–3: My Library
- Library tab with sub-navigation: Saved / Recently Viewed / Collections
- Saved documents: same resource card grid/list toggle, server-side paginated with TanStack Query infinite scroll
- Recently viewed: stored in Redis `ZADD recently_viewed:{userId}` with timestamp score, max 50 items, FIFO
- Collections: folder cards (2×2 thumbnail grid of first 4 docs in collection), CRUD operations
- Create Collection modal: name, description, visibility (public/private)
- Move to Collection: action on bookmark → shows collection picker popover
- Empty states for all tabs with contextual CTAs

Day 4–5: My Uploads
- Uploads table: sortable columns, status filter tabs, full data
- Status badges with correct colors, rejection reason expandable row
- Row actions: View, Edit (opens metadata edit drawer), Delete (with confirmation modal)
- Edit drawer: pre-filled form, same fields as upload, server action to update + re-trigger moderation if core fields changed
- Delete: soft-delete (sets status to `deleted`), file kept in R2 for 30 days then Inngest cleanup job
- Upload stats: click row → mini stats modal showing downloads over time (simple sparkline chart)

**Week 11 — Upload Hub**

Day 1–2: Upload Flow
- Build upload page with drag-and-drop zone (`react-dropzone`): file type validation (PDF only), size validation (max 50MB), visual drag-over state
- Upload flow: file selected → Uploadthing `uploadFiles()` → progress bar (real percentage from Uploadthing callback) → file stored in R2 → upload record created → metadata form unlocks
- Chunked upload for large files, pause/resume support
- Build complete metadata form (all fields from spec): organized in card sections, React Hook Form + Zod schema validation
- Form field: course codes with `+ Add another` pattern
- Tag input: custom `TagInput` component — type to filter existing tags, create new on Enter, pill display, max 10

Day 3: Submission & Processing
- Submit server action: validate all fields → create `document` record (status: `pending`) → trigger Inngest `document.uploaded` event → redirect to `/dashboard/uploads` with success toast
- Inngest processing pipeline: extract metadata → generate thumbnail → update record → send push notification (Pusher) + email notification to uploader
- Post-submit screen: animated success state, estimated review time, upload another / view uploads buttons
- Draft saving: debounced auto-save to localStorage every 30s, restore draft on page re-visit with banner prompt

Day 4: Profile Settings
- Settings page with section navigation
- Profile edit: avatar upload (Uploadthing, crop modal using `react-image-crop`), display name, username (availability check API), bio, external links
- Academic profile: all academic fields, verification status, verification request flow
- Security settings: password change, 2FA setup (TOTP via `otplib`, QR code display, backup codes), active sessions list with device/location detection (using `useragent` + GeoIP)
- Notification preferences: toggle matrix for all notification types × channels (email/push/in-app)
- Privacy settings: all toggles with instant server action saves
- Danger zone: deactivate (sets status, preserves data) + delete account (scheduled Inngest job, 7-day grace period with cancellation)

Day 5: PWA Foundation
- Create `public/manifest.json`: all icon sizes, theme colors, display standalone, start URL, scope
- Create icon set: `public/icons/` — 192, 512, 180 (Apple Touch), maskable variant with safe zone padding
- Configure `next-pwa` (or manual service worker): cache first for static assets, network first for API, stale-while-revalidate for pages
- Offline page `/offline`: design per spec, cached resource list from service worker cache
- App install banner component: shows after second visit (localStorage counter), `beforeinstallprompt` event capture + defer + show on banner button click

**Deliverables by End of Phase 5:**
- Complete dashboard with all tabs functional
- Full upload workflow end-to-end
- Library management with collections
- Profile settings all functional
- PWA installable, offline page works

---

### PHASE 6 — REAL-TIME NOTIFICATIONS & ACTIVITY
**Duration: Week 12**
**Goal:** Full notification system, real-time delivery, email digests.

Day 1–2: Notification Infrastructure
- Build notification creation utility: `createNotification(type, recipientId, senderId, entityType, entityId, message)` — inserts to DB + pushes to Pusher `private-user-{recipientId}` channel simultaneously
- Wire all notification triggers:
  - Document liked → notify author
  - Comment posted → notify document author + parent comment author
  - New follower → notify followed user
  - Document approved/rejected → notify uploader
  - Followed contributor uploads → notify all followers
  - Badge awarded → notify user
- Real-time delivery: `useNotifications` hook subscribes to Pusher private channel, updates Zustand store, increments badge count in nav

Day 3: Notification Center UI
- Build full notification center page (from spec)
- `NotificationBell` dropdown: top-right nav, shows last 5 unread, `Mark all read` button, `See all` link
- Group by date, type icons, unread indicator, click-to-navigate
- Mark as read: clicking any notification marks it read (server action + optimistic UI)
- All empty states

Day 4: Email Notifications
- Build React Email templates for each notification type:
  - `WelcomeEmail` — post-registration
  - `VerifyEmailTemplate` — email verification
  - `DocumentApprovedEmail` — approval notice with document link
  - `DocumentRejectedEmail` — rejection with reason
  - `NewFollowerEmail` — follower notification
  - `WeeklyDigestEmail` — weekly summary of new documents from followed contributors + trending in your area
- Inngest function `sendWeeklyDigest`: runs every Monday 9AM UTC, queries each user's followed contributors' last-7-days uploads + their interest tag trending docs, composes personalized digest, sends via Resend
- Respect notification preferences (check user settings before sending each type)

Day 5: Push Notifications
- Set up Web Push via `web-push` library
- VAPID key generation, store in environment
- Service worker push event handler: show browser notification with icon, title, body, click action URL
- Subscription endpoint `/api/push/subscribe`: store subscription in DB per user+device
- Trigger push from notification creation utility when user has active push subscription
- Test on Chrome, Firefox, Safari (iOS 16.4+)

**Deliverables by End of Phase 6:**
- All notification types generating and delivering in real-time
- Email notifications sending for all event types
- Weekly digest email system live
- Push notification support
- Notification center fully functional

---

### PHASE 7 — CONTRIBUTOR ECOSYSTEM & REPUTATION
**Duration: Week 13**
**Goal:** Public profiles, follow system, reputation engine, achievements/badges.

Day 1–2: Public Profile Pages
- Build `/u/[username]` profile page: ISR with 2-minute revalidation
- Profile hero section: cover image, avatar, name, username, bio, stats row, action buttons (follow, share, more)
- Tab navigation: Documents / About / Followers / Following
- Documents tab: same resource card grid, with sort/filter, load more
- About tab: academic info, joined date, expertise tags, external links
- Follow/Unfollow: Server Action, real-time follower count update via Pusher, notification to followed user

Day 3: Follow System
- Followers/Following tabs: paginated grid of user cards
- Mutual follow indicator (`Follows you back`)
- Follow suggestions on following tab: `Scholars you may know` based on shared institution + interests (SQL query joining user_interests similarity)
- `/api/users/[id]/followers` and `/following` paginated endpoints

Day 4: Reputation System
- Reputation calculation: points per action type defined in config:
  - Document uploaded and approved: +10
  - Document downloaded: +1
  - Document liked: +2
  - Comment marked helpful: +3
  - New follower: +1
  - Badge earned: +variable
- Inngest function `updateReputation(userId, eventType, referenceId)`: calculates delta, inserts `reputation_event`, updates `user.reputation_score`, checks badge thresholds
- Reputation levels: Scholar (0–99) → Analyst (100–499) → Archivist (500–1999) → Senior Contributor (2000–4999) → Distinguished Scholar (5000+) — each with color + icon
- Display on profile, contributor card, comment avatar badge

Day 5: Achievements & Badges
- Define all badges in DB seed: First Upload, First Download, 10/100/1000 Downloads, Verified Contributor, Top Contributor (monthly Inngest job assigns), 1-Year Anniversary, 50 Followers, Helpful Commenter
- Badge award logic in Inngest: check thresholds after each reputation event, award if not already awarded
- Badge display on profile: grid of earned badges with icons, names, earn dates
- Profile reputation sidebar: level progress bar, achievement grid, upload heatmap (calendar chart using `react-activity-calendar`)
- Badge notification: special in-app notification + email for each badge earned

**Deliverables by End of Phase 7:**
- All public profiles fully functional
- Follow system with real-time updates
- Reputation calculation running after all events
- Badges awarding automatically
- Contributor cards showing accurate reputation throughout app

---

### PHASE 8 — ADMIN PANEL
**Duration: Week 14 – Week 15**
**Goal:** Full command center. Every admin function from the spec plus audit logging, analytics, and system management.

**Week 14 — Moderation & User Management**

Day 1: Admin Auth & Shell
- Admin middleware: checks `role IN ('moderator', 'admin', 'super_admin')`, redirects others
- Admin layout: distinct sidebar (gold `ADMIN` badge), all admin nav links
- Role hierarchy enforcement: moderators can approve/reject, admins can manage users, super admin can manage everything — enforced in every Server Action with `requireRole()`

Day 2–3: Moderation Queue
- Build moderation queue page with 4 tabs: Pending / Approved / Rejected / Flagged
- Pending queue table with bulk select checkboxes
- Row expand: in-row PDF preview panel (uses PDFViewer component, loads document from R2 URL)
- Approve action: Server Action → status `approved` → `published_at = now()` → Inngest event `document.approved` → notification to contributor → Pusher broadcast → revalidate document cache
- Reject modal: multi-reason checkboxes + optional note → Server Action → email + in-app notification to contributor
- Bulk approve/reject: process array of IDs in single Server Action with Promise.all
- Flagged tab: documents reported by users, shows report count + reasons summary

Day 4–5: User Management
- Build user management table: server-side paginated, searchable, filterable by role/status/institution
- Inline role change dropdown per row (updates instantly via Server Action)
- Suspend user modal: reason field + duration selector → sets `status: 'suspended'` + `suspended_until` timestamp → Inngest scheduled job to auto-reinstate
- User profile drawer: slide-in from right, shows user's complete info, documents, reputation, activity log
- Delete user: soft delete with 30-day grace period, anonymizes public content (replaces name with `[Deleted User]`)
- All admin actions log to `audit_logs` table

**Week 15 — Analytics, Infrastructure & Audit**

Day 1–2: Analytics Dashboard
- Build analytics page with time range selector (7D/30D/3M/6M/1Y/Custom)
- Charts using `recharts` (dark themed, custom styled):
  - User registration area chart (daily)
  - Document uploads bar chart (by category)
  - Downloads line chart
  - Top 10 documents ranked list
  - Geographic distribution: text-based leaderboard (country + count)
  - Retention: week-over-week active users
- Data from: Inngest-aggregated daily snapshots stored in Redis + DB analytics queries
- Chart data API: cached in Redis (1hr TTL), async streaming with Suspense

Day 3: Infrastructure Management
- Universities CRUD: search table, add/edit/deactivate drawer with full form, logo upload
- Categories CRUD: same pattern, includes parent category assignment for sub-categories, color + icon picker
- Course Codes CRUD: bulk import via CSV upload (parse with `papaparse`)
- Tags management: view all tags, merge duplicates, deactivate spam tags

Day 4: Audit Logs & System Settings
- Audit log table: chronological, filterable, searchable, export CSV (stream CSV generation via Response)
- System settings: platform toggle (maintenance mode → triggers maintenance page), feature flags (PostHog integration for flag management), default visibility setting, max file size setting, allowed institution domains

Day 5: Executive Dashboard Polish
- Executive dashboard: 6 KPI cards (users, docs, pending, flagged, downloads today, active now)
- Real-time active users counter via Pusher presence channel `presence-admin`
- Pending review count with pulsing amber badge
- Quick action buttons wired to navigation
- Write Playwright tests for critical admin flows: approve document, reject document, change user role

**Deliverables by End of Phase 8:**
- Complete admin panel: all 6 sections fully functional
- Moderation workflow end-to-end
- User management with all role operations
- Analytics charts with real data
- Audit logging on all admin actions
- Infrastructure CRUD for all system entities

---

### PHASE 9 — PERFORMANCE, SEO & POLISH
**Duration: Week 16**
**Goal:** Make it fast, discoverable, and bulletproof. Sub-2s LCP, 90+ Lighthouse score.

Day 1: Performance Audit & Core Web Vitals
- Run Lighthouse, measure LCP/FID/CLS on all key routes
- Audit bundle size: `@next/bundle-analyzer` — split large dependencies
- Code split PDF viewer (lazy import + Suspense — pdfjs-dist is large)
- Optimize images: all use `next/image`, proper sizes, WebP format, priority flag on above-fold
- Font optimization: `next/font` for Geist + Inter (zero layout shift, preloaded)
- Prefetch critical routes: `<Link prefetch>` on navigation items, `router.prefetch()` for likely next pages

Day 2: Caching Strategy Refinement
- Audit all API routes: ensure proper cache headers (`Cache-Control`, `s-maxage`, `stale-while-revalidate`)
- Implement Partial Prerendering on document detail page: static shell + dynamic interaction panel
- Redis cache warming: Inngest function on deploy warms trending, categories, popular institutions
- Database query optimization: run `EXPLAIN ANALYZE` on all slow queries, add missing indexes, optimize N+1 patterns in Drizzle (use `.with()` for eager loading)
- Implement cursor-based pagination for infinite scroll (more performant than offset at scale)

Day 3: SEO & Discoverability
- Dynamic `generateMetadata()` on all public pages
- OpenGraph image generation: `@vercel/og` for document pages (renders title + institution + category as PNG image dynamically)
- Sitemap: `next-sitemap` config generating sitemap for all public documents, profiles, categories
- `robots.txt`: allow crawlers on public content, disallow dashboard/admin/api
- Schema.org structured data: `DigitalDocument` on document pages, `Person` on profile pages, `WebSite` on homepage
- Canonical URLs on all pages

Day 4: Accessibility & Error Hardening
- Accessibility audit: axe-core Playwright integration → fix all critical violations
- Keyboard navigation: tab through all interactive elements, focus traps in modals
- ARIA labels on all icon buttons, aria-live regions for dynamic content (notifications, toast, comment stream)
- Skip-to-main-content link (visible on focus)
- Error boundaries on all major sections: `error.tsx` files at route segment level
- Robust error handling: all API routes return consistent error shape `{ error: { code, message } }`, all Server Actions wrapped in try/catch with user-friendly messages
- Implement global `ErrorBoundary` component with fallback UI and Sentry reporting

Day 5: Final Infrastructure & Scaling Prep
- Configure Vercel Edge Config for feature flags
- Set up Vercel Firewall rules for common attack patterns
- Configure Neon connection pooling for production (PgBouncer, max connections per instance)
- Upstash Redis: set memory limits, eviction policy (allkeys-lru for cache databases)
- Rate limit tuning: adjust limits based on actual usage patterns from dev testing
- Set up Vercel cron jobs for: daily stats aggregation, weekly digest email trigger, expired session cleanup
- CDN configuration: Cloudflare R2 + Cloudflare CDN for all PDF and thumbnail serving

**Deliverables by End of Phase 9:**
- Lighthouse score 90+ on all key pages
- LCP under 2s on homepage, search, document pages
- Zero critical accessibility violations
- Full SEO setup
- All error states handled gracefully
- Production infrastructure hardened

---

### PHASE 10 — TESTING, QA & LAUNCH
**Duration: Week 17 – Week 18**
**Goal:** Comprehensive test coverage, staged rollout, production launch.

**Week 17 — Testing Sprint**

Day 1–2: Unit & Integration Tests
- Target 80%+ coverage on: all utility functions, all Zod schemas, all repository functions, auth helpers, notification utilities, reputation calculation, search functions
- Integration tests: DB repository functions against test Neon branch, Inngest functions with test events, email template rendering

Day 3–4: End-to-End Tests (Playwright)
- Critical path tests:
  - New user registers → verifies email → completes onboarding → views homepage
  - User searches for document → opens workspace → likes + bookmarks + comments
  - User uploads document → document processed → appears in uploads → approved by admin → appears in search
  - Admin rejects document → contributor receives notification → views rejection reason
  - User follows contributor → contributor uploads → follower receives notification
  - All auth flows: login, Google OAuth, forgot/reset password
- Visual regression tests: Playwright screenshot comparison on key pages

Day 5: Load Testing & Security Audit
- Load test with `k6`: simulate 500 concurrent users, measure response times, identify bottlenecks
- Security checklist: SQL injection (Drizzle parameterized), XSS (DOMPurify, CSP), CSRF (Auth.js), rate limiting, auth bypass attempts, file upload validation (type, size, malware hint via filename pattern check)

**Week 18 — Staging & Launch**

Day 1–2: Staging Environment
- Deploy to Vercel preview with production-like data (anonymized seed data at scale: 1K users, 5K documents)
- Run full QA pass: every feature on desktop Chrome, Firefox, Safari, and mobile (iOS Safari, Chrome Android)
- Fix all discovered bugs, retest

Day 3: Beta Onboarding Prep
- Create beta landing page (`/beta`): early access signup with email capture
- Set up waitlist flow: email capture → Resend list → welcome email sequence
- Admin invite system: admin can generate invite codes, invited users skip waitlist
- Feature flags: PostHog flags for phased feature rollout (enable Pulse for 10% of users first, etc.)

Day 4: Launch Checklist
- Custom domain configured on Vercel, SSL verified
- All environment variables audited in production Doppler
- Sentry production project verified, test error captured
- PostHog production key active, funnels configured
- Resend domain verified (SPF, DKIM, DMARC), test email delivery
- Upstash Redis production databases at correct plan limits
- Neon DB production branch: correct compute size, autoscaling enabled
- Backup strategy: Neon daily backups enabled, point-in-time recovery tested
- Runbook: documented incident response procedure (who gets paged, what to do for DB down, deploy rollback procedure)

Day 5: Launch
- Merge to main → GitHub Action → Vercel production deploy → smoke test all critical paths
- Monitor: Vercel dashboard, Sentry error feed, Upstash metrics, Neon query insights, PostHog live view
- Soft launch: invite beta users (100 initial), monitor closely for 48 hours
- Public launch: update landing page, remove waitlist gate, announce

---

## SUMMARY TIMELINE

| Phase | Weeks | Focus |
|---|---|---|
| 1 | 1–2 | Foundation, DB, Auth infrastructure |
| 2 | 3–4 | Auth UI, Onboarding flows |
| 3 | 5–7 | Homepage, Search, Discovery Engine |
| 4 | 8–9 | PDF Workspace, Comments, Real-time |
| 5 | 10–11 | Dashboard, Uploads, Library, PWA |
| 6 | 12 | Notifications, Email, Push |
| 7 | 13 | Profiles, Follow, Reputation, Badges |
| 8 | 14–15 | Admin Panel, Moderation, Analytics |
| 9 | 16 | Performance, SEO, Hardening |
| 10 | 17–18 | Testing, QA, Launch |

**Total: 18 weeks to a fully production-ready, scalable, real-time academic resource platform.**

---

## KEY ARCHITECTURAL PRINCIPLES TO NEVER COMPROMISE

**1. Server Actions over API routes** for all mutations — colocated, type-safe, no extra round trips, automatic CSRF protection from Auth.js session context.

**2. Optimistic UI everywhere** it improves perceived speed — likes, bookmarks, follow — revert on server error with toast. Users should never wait for the server to confirm a non-critical action.

**3. Streaming with Suspense** on all data-heavy pages — never block the entire page on slow queries. Each section streams independently.

**4. URL as single source of truth** for all filter, search, and pagination state — shareable links, browser back works, SSR-compatible, no hydration mismatch.

**5. Redis as the speed layer** — trending data, recent activity, autocomplete, session metadata, counters all live in Redis first. DB is the source of truth, Redis is the performance buffer.

**6. Inngest for all async work** — thumbnail generation, email sends, reputation updates, weekly digest, analytics aggregation. Nothing blocking in the request lifecycle beyond what must be synchronous.

**7. Neon branching as part of the dev workflow** — every PR gets its own DB branch automatically. Migrations tested before merging. No "works on my machine" DB state issues.

**8. Never skip the empty state, error state, or loading state** — every async component has all three designed and implemented before it ships.