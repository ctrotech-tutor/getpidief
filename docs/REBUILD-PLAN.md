# getpidief: study-media rebuild plan

**Status:** detailed supporting plan. Agreed product decisions and the current phase order are recorded in [BUILD-BLUEPRINT.md](BUILD-BLUEPRINT.md).  
**Product intent:** a fast, social-media-like experience centered on learning.  
**Related:** [Product vision](PRODUCT.md) · [Review of existing code](CODEBASE-REVIEW.md)

## 1. The product we are building

getpidief should feel familiar to someone who uses a social app: a feed, people, profiles, follows, posts, reactions, conversations, saves and notifications. The difference is what the experience rewards: discovering useful study material, understanding it, sharing knowledge and building a learning community.

A student should be able to **find something relevant, open it quickly, use it, save it, and come back**. A contributor should be able to share a useful resource or study post, provide context, and receive useful feedback. Social features are not decoration; they help people find and trust useful content.

**The first product loop:** Discover → open/read → save → follow/discuss → return.  
**Contributor loop:** Create → submit → review/publish → engage → improve.

These are proposed loops. We should test them with actual students before adding complexity.

### Product boundaries

- Social familiarity without copying a specific app or using manipulative infinite-scroll or streak mechanics.
- Mobile-first, but a proper desktop experience for reading and uploading.
- A usable product, not demo buttons: real persistence, access control and meaningful loading, empty, error and recovery states.
- Educational relevance, content rights, trust and safety are first-class; popularity alone does not establish correctness.
- Existing code is a candidate for reuse, not a constraint. Do not delete production data, migrations or services without understanding their use.

## 2. Proposed information architecture

| Destination | Main purpose | Mobile / desktop pattern |
| --- | --- | --- |
| **Home** | Social feed: Following and For you, study posts and resource posts | Bottom tab / persistent left navigation |
| **Explore** | Search resources, subjects, courses, people and institutions | Bottom tab / navigation with search |
| **Create** | Share a permitted resource or study post | Prominent create action; guided composer |
| **Library** | Saved resources and reading history | Bottom tab / navigation |
| **Activity** | Relevant comments, follows and moderation updates | Notifications entry / navigation |
| **Profile** | Identity, contributions, interests, followers and settings | Avatar entry / navigation |

Names and the exact number of tabs are design decisions, not final. On mobile avoid overcrowding; Activity and Profile can live in the top bar if testing supports that. Desktop can use a left rail, focused center column, and optional contextual right rail; the reader can use a wider layout.

### Core objects

- **Person:** profile, interests, optional institution, contributions and relationships.
- **Post:** a social unit with author, context and actions. Proposed initial types: a resource attachment and a short text/question post. Confirm text posts before implementation.
- **Resource:** the document or other learning asset referenced by a post, with metadata, access rules, provenance, permissions and moderation status.
- **Subject/course/institution:** relevance and discovery context, not necessarily mandatory for everyone.
- **Interaction:** follow, save, reaction, comment, report, notification. Each needs an authoritative server state and clear undo/error behavior.

The post/resource distinction is a proposal to validate against existing data. A schema decision and migration plan come before changing the database.

## 3. UI and UX direction

### Desired feel

A modern, calm, confident social product: content and people lead, with strong hierarchy, readable typography, consistent spacing and lightweight interaction. It should feel welcoming to students, not like an enterprise analytics dashboard. Choose the actual visual identity with the founder; colors, typography, icon style, imagery and dark/light treatment remain open.

### Screen-by-screen experience

1. **Landing:** keep the current minimal placeholder until positioning, first audience and brand direction are agreed. Then communicate the benefit, show a truthful product preview and provide a clear action. No invented metrics or claims.
2. **Sign-up and onboarding:** explain value first; minimize required fields; allow students to select interests, optionally institution/course, and follow suggested people or topics. Show progress and let them edit choices later.
3. **Home/feed:** tabbed Following / For you; a clear create entry, readable author identity, context and preview; compact actions for opening, saving, reacting and discussing. Provide useful cold-start content and explain empty states. Use pagination and a visible end or explicit load-more affordance.
4. **Resource post:** show title, author, subject, type, institution/course where available, upload date, provenance and file preview. Make the primary action **Open**; keep download dependent on permission. Avoid claiming verified or accurate without a real process.
5. **Reader:** prioritize reading space, page navigation and clear save/return controls; show title, author and related discussion without crowding the document. Mobile needs touch-friendly controls, resilient loading and the ability to resume or return to the feed. Accessibility must not rely only on a PDF canvas.
6. **Create:** a guided composer with title/context, resource upload if applicable, subject/course, visibility and permission/ownership confirmation. Make progress, validation, retry, moderation status and abandoned upload cleanup clear.
7. **Explore/search:** prominent search, meaningful result categories and filters, a clear no-results state and useful suggestions. Distinguish people, resources and topics so users understand what they are opening.
8. **Library:** easy-to-find saved material and reading history, with a way to remove saves. Collections can follow after the basic save flow works.
9. **Profile:** identity, bio, institution/interests if chosen, follow button and contributions. Badges should only be introduced with clear criteria and never imply verified expertise.
10. **Activity & settings:** grouped relevant notifications with read state and preferences; settings for account, privacy and safety. Report, mute/block and help routes must be discoverable.
11. **Moderation:** a small practical queue for reports and uploads, with review, decisions, reasons, audit trail and takedown path; restrict actions by role.

Every interactive screen needs: default, loading, empty, no connection/error, permission-denied and success states where relevant. Avoid dead links, placeholder metrics, fake progress and actions without backend behavior. Accessibility: keyboard operation, screen-reader labels, focus states, contrast, reduced motion, text scaling and touch targets.

## 4. Prioritized delivery plan

Each phase produces a reviewable result. Estimates are intentionally omitted until scope, team and environment are known. Stages can be split into small PRs; do not mistake a mockup for a working feature.

### P0 — Agree the product and unblock delivery

**Why first:** Without a shared audience and a reliable delivery baseline we risk designing and deploying the wrong thing.

- Agree initial audience, geographic scope, first content types, public browsing rules, and the visual references that feel right.
- Map the current deployment, existing users/data, services, rights and credentials without exposing secrets.
- Establish reproducible local/preview environments, CI and a real build. Triage lint, dependency and deployment failures; keep the existing minimal homepage.
- Define a small product scorecard and a pilot research plan.

**Done when:** founder approves a short scope and first flows; the team can build, test and preview a known commit; existing data and deployment constraints are documented.

### P1 — Trust, safety and technical foundation

**Why:** A social document platform must protect users and content before public use.

- Fix and test document visibility/ownership, disabled downloads and storage access; establish a single access policy.
- Separate shared cache from user-specific data; secure realtime channels and the test-email endpoint; validate uploads and ownership.
- Define copyright/permissions, takedown, report and moderation procedures. Protect sensitive verification files.
- Establish design tokens and reusable accessible primitives, session handling, observability and baseline performance measurements.
- Assess existing tables/components and document migration decisions. No destructive resets without explicit approval.

**Done when:** an authorization matrix is covered by multi-user tests, private files cannot be accessed through alternative paths, core CI checks pass, and a basic moderation policy exists. Full external security review may still be necessary before launch.

### P2 — Product design and interactive prototype

**Why:** Align the social experience before building a lot of interface code.

- User journeys and wireframes: onboarding → feed → resource → reader → save; creator upload → moderation; follow/comment/report.
- Agree information architecture and responsive layouts; create visual directions and component states, including accessible dark/light choices if desired.
- Test a prototype with a small group of representative students; record tasks, confusion points and decisions.

**Done when:** the founder approves direction and key screens, participants can complete the essential tasks, and component specs describe responsive and interaction states. This phase can overlap P1 safely.

### P3 — First real vertical slice

**Why:** Validate the whole learning loop with real data before expanding breadth.

- Lightweight authentication and onboarding.
- Home feed with a simple Following/For-you strategy, server-side pagination and honest cold-start behavior.
- Resource posts, secure document details/reader, basic search, saves, follows, comments and profiles.
- Permitted PDF upload, metadata, review/publish flow, reporting and basic in-app notifications.
- Track failures and success of the complete loop; add end-to-end tests using isolated test services/data.

**Done when:** a test student can register, discover, open, save, follow/comment and return; a contributor can submit permitted material for review; moderation, permissions, error recovery and mobile/desktop behavior are tested. No claim of launch readiness solely because screens render.

### P4 — Pilot and refinement

- Invite a limited cohort; gather explicit feedback and measure search success, useful opens, saved-resource return, upload completion, trust reports and performance.
- Fix real bottlenecks and confusing flows; validate accessibility, reliability and moderation response in real conditions.
- Decide what to release more broadly from evidence, not the length of the feature list.

**Done when:** agreed pilot quality thresholds are met, major privacy/safety issues resolved, and users can reliably complete the core loop.

### P5 — Expand only after validation

Possible follow-on work: short questions/text posts if not in the initial slice; topic following; collections; contributor badges; better ranking; email/push notifications; richer moderation; subscriptions; native apps. Order depends on pilot evidence and explicit product decisions. Badges, video, chat, AI and advanced personalization are not assumed to be part of the first release.

## 5. Feed behavior — starting hypothesis

- **Following:** recent permitted posts from followed people (and possibly topics if approved), with clear empty state and suggestions.
- **For you:** simple, explainable ranking based on selected subjects/course, relevance, freshness and useful interactions; no black-box model required initially. Add diversity, hide/report and a way to adjust interests.
- Never rank unapproved, deleted or unauthorized material. Apply eligibility/access checks before ranking and pagination.
- Capture only needed signals and provide user controls. Measure whether students found a useful resource, not merely how long they scrolled.

## 6. Speed, quality and operational standards

- Define budgets after measuring current baseline on mid-range devices and representative mobile networks; test feed load, search response, reader opening, upload completion and crash/error rates.
- Server-render useful initial content where appropriate, paginate by cursor, keep client bundles small, lazy-load the PDF viewer and heavy media, optimize previews, and avoid excessive animation.
- Protect privacy in cache and logs. Realtime enhances, but does not block, reading and basic interactions.
- Tests: unit for policy and ranking, integration for authorization/data/event paths, E2E for the student and contributor loops, and accessibility checks. Use isolated test data; no production credentials.
- Analytics should be consent-aware and privacy-conscious. Establish explicit owners and targets for reliability, moderation and incident response.

## 7. Working process for each feature

1. Agree the user problem, scope, acceptance criteria and edge cases.
2. Map the experience and responsive/accessibility states; review before implementation.
3. Inspect existing code and decide reuse vs replacement; define data changes and migration/rollback if needed.
4. Implement backend and UI together with permissions, telemetry and meaningful error states.
5. Test and demo on mobile and desktop; review with founder and, where possible, students.
6. Release to preview/pilot, measure, fix and document the decision before moving on.

## 8. Decisions needed from the founder

1. **First audience:** Nigerian university students, a smaller initial campus/community, or global students?
2. **First post types:** PDF resources only, or also text posts/questions from day one?
3. **Content access:** may visitors browse/read public resources before signing up? Which actions require an account?
4. **Look and feel:** examples of apps/sites you like, preferred colors, and whether the tone should be playful, premium, academic or a mix.
5. **Content rights:** who supplies the first resources and what permissions do they have? Are there existing users or data to preserve?
6. **Business model:** what should remain free, and are paid features expected later?

These questions set priorities; they do not require every detail to be decided before we begin. Start with the first audience, post types and visual references.
