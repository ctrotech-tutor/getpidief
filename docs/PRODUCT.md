# getpidief: study media

**Working product direction — discussion draft, not a finalized specification.**

## Vision

Build a social home for learning: a place where students discover useful study material and people through an experience as familiar and engaging as social media. The goal is not to make distraction educational-looking, but to help students find something relevant, use it, and make meaningful progress.

Studocu and Scribd are useful reference points for finding and reading documents. getpidief can differentiate itself by making those resources part of a living community: students share, follow, discuss, save, and return to the work that helps them learn.

## Principles

- **Learning is the outcome.** Optimize for useful resources opened, saved, revisited and used—not endless scrolling.
- **Social is the interface.** Familiar feed, profiles, follows, comments, notifications and mobile navigation should make participation natural.
- **Relevance over noise.** Course, institution, subject and the people a student follows matter more than generic popularity.
- **Fast on real student devices.** Design for small screens, variable connections and limited data from the start.
- **Trust is earned.** Show context, provenance and helpful community feedback; don't confuse a popularity badge with academic accuracy.
- **Accessible and inclusive.** Keyboard and screen-reader support, contrast, reduced motion, and usable empty states are product requirements.
- **Student control.** Clear privacy choices, mute/report tools and notification controls; avoid manipulative streaks and engagement traps.

## Proposed experience

1. **Join and personalize.** Pick an institution if relevant, course or subjects, and interests. Make onboarding short, skippable where possible and useful even before a complete profile.
2. **Open a study feed.** A mobile-first feed of helpful resources and short study posts from followed people and relevant subjects. Clear tabs such as Following and For you let students control discovery.
3. **Understand a post at a glance.** A resource card shows title, type, author, subject/course, institution where appropriate, upload date, a useful preview, and actions such as open, save and discuss. Cards should prioritize content over counters.
4. **Actually study.** Open a fast, accessible document reading experience, with clear navigation and a path back to the feed. Save a resource to revisit it; downloads depend on rights and product policy.
5. **Participate.** Share an original or permitted resource with context, comment or ask a question, follow contributors and subjects, and receive relevant notifications.
6. **Build a useful identity.** A profile presents a person's contributions and interests. Badges can recognize specific helpful actions, with transparent criteria and no implied verification unless actually verified.

The landing page remains deliberately minimal until the product and visual direction are agreed. The application should eventually *feel* like social media without copying a particular platform or promoting compulsive use.

## Proposed first usable release

Aim for one complete loop before building a broad platform:

**Discover → open/read → save → follow or discuss → return.**

- Account creation and a light, editable interest setup.
- Responsive feed with Following and a simple relevance-based discovery view; explicit empty/loading/error states.
- Resource post creation with a PDF, title, description, subject/course and clear ownership/permission confirmation.
- Document detail and reader; reliable storage, access checks and reasonable file limits.
- Search by title, subject/course and institution; a simple, trustworthy baseline rather than an elaborate ranking system.
- Save, follow, comments, basic profiles, and a small set of in-app notifications.
- Reporting and a minimal review/removal workflow, including takedown handling.
- Basic accessibility, performance measurement, and tests around the core loop.

**Defer until evidence justifies it:** complex gamification and streaks, advanced recommendation models, granular analytics dashboards, live presence, large admin suites, elaborate document conversion, native apps and paid subscriptions. These are candidates, not rejected ideas.

## Rebuild strategy

1. **Product discovery and design:** confirm audience and first market, content types/rights, feed behavior, brand and the main mobile flows. Define scope and success metrics. Create design prototypes before expanding the placeholder landing page.
2. **Technical foundation:** inventory existing components and dependencies; decide what survives based on quality and fit. Establish clean architecture, a reproducible local setup, accessible design tokens, a fast app shell, testing and observability. Evaluate schema and migration strategy before touching real data.
3. **Vertical slice:** implement the loop end-to-end with real data, including upload, access control and moderation. Start with a small, explainable feed rather than prematurely building a recommendation engine.
4. **Pilot and iterate:** test with a small group of students and contributors; improve relevance, reliability and reader experience based on actual use.
5. **Expand carefully:** add badges, richer community features and infrastructure only as the product proves their value.

### Existing code: candidates, not commitments

- **Evaluate:** Next.js/React, the existing Drizzle schema, authentication, document storage, search, feed cards, and background jobs. Some may save time, but their suitability and security must be verified before reuse.
- **Rebuild or replace where needed:** the largely placeholder pages and UI, existing information architecture, duplicate auth configuration, raw search SQL, and incomplete upload/reader/moderation flows.
- **Do not assume production readiness:** old docs and placeholder tests describe intention as well as implementation. Validate behavior, access control, data model, worker wiring and dependency compatibility with fresh tests.
- **Avoid destructive resets:** do not drop databases, discard migrations, rewrite history or remove working integrations until their use and data-retention needs are understood.

## Performance and reliability targets (proposed, to validate in pilot)

- Measure Core Web Vitals and real-user performance on mid-range phones and representative slow connections; agree numeric budgets after establishing a baseline.
- Keep initial feed payload and client JavaScript small; paginate, use image/PDF previews efficiently, and defer expensive viewer code until needed.
- Use indexed queries and cache safely; never leak private or institution-only resources through shared caches.
- Reliable uploads and graceful retry/error states; make key content usable even when realtime services are unavailable.
- Track feed load, search latency, document open failures and upload completion alongside privacy-conscious real-user metrics.

## Safety, rights and trust

- Define permitted content and a copyright/takedown process before opening public uploads. Do not assume all course notes, textbooks or past papers may be redistributed.
- Treat verification documents and private resources as sensitive; use private storage, authorization on every access path, retention limits and audit trails.
- Provide report, moderation and appeal paths; design for spam, harassment and academic misconduct risks.
- Clarify the audience's age and applicable privacy rules before collecting personal information or marketing to minors.
- Never claim content is verified or accurate unless the verification process supports that claim.

## How to measure success

Start with a pilot cohort, then compare: students who find and open a relevant resource; return to a saved resource; share or contribute something useful; and report that the platform helped them study. Balance those outcomes with search success, upload/reader failures, report resolution and performance—not just time spent or follower counts.

## Decisions to make together

1. Who is the first audience and where do we launch: one institution, Nigeria broadly, or a wider audience?
2. What can be posted first: PDFs only, short text posts, questions, links, images or video?
3. What should a feed prioritize: following, courses, institution or a mix? Can visitors browse before signing up?
4. What are the first content sources and what permissions do we have to distribute them?
5. What is the intended business model, if any, and what must remain free?
6. What visual references, brand colors and feeling should guide the first app design?
7. Are there existing users, production data, integrations or deployments we must preserve?

## Historical material

`docs/archive/` preserves the previous architecture, guides and earlier audit for reference. They predate this direction and contain unverified and sometimes contradictory claims; they are **not** the current specification or proof that a feature works.
