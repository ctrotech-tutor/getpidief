# getpidief: product and build blueprint

**Status:** Approved direction and initial scope, with implementation choices to validate.  
**Purpose:** The shared starting point for the rebuild. More detailed research is in [STUDY-MEDIA-STRATEGY.md](STUDY-MEDIA-STRATEGY.md), [REBUILD-PLAN.md](REBUILD-PLAN.md), and [CODEBASE-REVIEW.md](CODEBASE-REVIEW.md). When earlier documents call a decision a proposal, this blueprint records what has since been agreed.

## 1. What we are building

getpidief is a social media platform built around education. It is not a document library with a social layer added on top. People and their posts, follows, profiles, conversations, reactions and communities are central to the product. Study resources and a good reading experience give those social interactions a purpose.

The product should feel at home beside leading social platforms while having its own identity. Students and other learners should be able to discover useful material, share what they know, ask questions, follow people, discuss ideas, build an identity and return to study. The ambition is a broad international audience, starting with university students globally and expanding to other learners as the platform grows.

**Working product promise:** A social home for learning.

## 2. Decisions agreed so far

- The vision is a full social media experience focused on learning, not a document-first website.
- The audience is global. The initial focus is university students, while designing so other learners can participate as coverage grows.
- The initial content scope includes both PDF resource posts and short text posts or questions.
- The interface must be original, polished, accessible, mobile-first and fast. It should not look like a generic AI-generated template.
- Writing must be natural and specific. No generic AI-style filler, fake testimonials, invented metrics or em dashes in product copy and new product documents.
- Existing code is material to evaluate, not a design or architecture we must preserve unchanged. Existing users, data and integrations must not be destroyed without review and explicit approval.
- Build one phase at a time, with real behavior and a review at each milestone.

The exact visual direction, initial pilot cohort, content policies, browsing rules and business model still need decisions. A global product can start with a focused pilot without excluding other regions in the long-term design.

## 3. First release: an actual social product

### Student experience

1. Sign up or log in, choose interests and optionally provide institution or course context.
2. Enter a home feed with **Following** and **For you** views. Discover people, text posts, questions and useful resources.
3. React, reply, follow a person and save a post or resource. Actions persist and can be reversed where appropriate.
4. Open a PDF in a usable reader, see its creator and related conversation, and return to the feed or library.
5. Search for posts, resources and people, with useful filters where data supports them.
6. View and edit a profile, see contributions, manage a saved library and receive relevant in-app notifications.
7. Report content or accounts and control basic privacy and notifications.

### Contributor experience

1. Create a short post or question, or submit a permitted PDF with title, context and subject.
2. Receive clear validation, upload and publication or review status. Handle interrupted uploads and errors honestly.
3. See their published contributions and participate in discussion.

### Platform experience

- Moderators have a minimal, restricted review queue with decisions, reasons and an audit trail.
- Content access, upload ownership and storage are enforced on the server, not just hidden in the interface.
- A copyright and takedown process, spam prevention and basic abuse reporting are in place before opening uploads to a pilot.
- Design covers loading, empty, error, offline or slow connection, permission denied and success states.

**Pilot scope choices:** Initial text and PDF posts, feed, profiles, follow, reaction, replies, save, search, reader and in-app activity. This is our initial target, not a claim these features already work. Public browsing, exact review rules, supported file limits, adult or minor policy and precise reaction behavior must be finalized before implementation.

## 4. Product structure

| Area | Purpose |
| --- | --- |
| Home | Following and discovery feeds, creation entry, social interactions |
| Explore | Search and discovery of people, posts, resources and topics |
| Create | Text or question composer and permitted PDF resource flow |
| Library | Saved material and a return path to reading |
| Activity | Relevant replies, follows and content status notifications |
| Profile | Identity, interests, contributions, follow relationship and settings |
| Reader | Fast, accessible resource reading and related discussion |
| Moderation | Restricted tools for reports, review and takedown |

The mobile tab arrangement, desktop rail, names and visual language will be resolved during design. Do not overcrowd the mobile navigation. Make the social feed the primary experience and reading a natural part of it.

## 5. The design standard

- Start with real student tasks and representative content, not decorative sections.
- Develop an original visual identity, typography, color system, layout and component library. Draw lessons from leading platforms without copying them.
- Use concise and natural copy. Avoid made-up claims, stock-sounding praise, fake data and filler.
- Design for touch, keyboard, screen readers, contrast, text scaling and reduced motion.
- Keep the feed and reader responsive on modest devices and slower networks. Heavy viewer and media code should load only when needed.
- Make user control visible: Following versus discovery, relevance feedback, privacy choices and reporting.
- Do not confuse popularity or badges with academic verification. No promise of a badge system until criteria and value are validated.

## 6. Implementation roadmap and gates

### Phase 0: Rebuild baseline

**Deliver:** A reliable development and preview path, a verified build, a concise inventory of existing data and services, and a confirmed pilot setup. Resolve current build and CI failures, review package risks and identify what can safely be reused.

**Gate:** We can build and preview a known commit, understand the status of production data, and have documented outstanding operational issues. Do not delete data or change production configuration without approval.

### Phase 1: Safety and core architecture

**Deliver:** Server-side access rules, secure upload and file access, cache isolation, protected realtime channels, reporting and moderation foundations, tests for separate users and roles. Decide the relationship between posts and resources, and define a migration and rollback plan before changing the schema.

**Gate:** Automated access-control tests cover public, private and restricted content; users cannot bypass download and visibility policies through alternate paths; moderation and takedown workflows have an accountable owner.

### Phase 2: Product design and interaction prototype

**Deliver:** User flows, original visual direction, responsive app shell, design tokens and detailed states. Prototype onboarding, home, post, create, profile, library and reader. Review on mobile and desktop with the founder and a small set of students.

**Gate:** The founder approves the visual direction and core flows, and test participants can find, open, save and discuss material without guidance. A prototype is not counted as a functioning product.

### Phase 3: Real social foundation

**Deliver:** Authentication and onboarding; real text and question posts; profiles; follow; reactions; replies; notifications; paginated Following and discovery feeds. Include meaningful cold-start and abuse-prevention behavior.

**Gate:** Two test users can create and see posts, follow, react and reply across sessions. State persists, permissions work, controls are accessible and failures are recoverable.

### Phase 4: Resources and reader

**Deliver:** Permitted PDF upload with ownership checks, resource post, review status, secure document detail and reader, saved library and search. Connect resources to the same social feed and discussion model.

**Gate:** A contributor submits a permitted PDF, a moderator can review it, and an eligible learner can find, read, save and discuss it. Users without access cannot retrieve it through the API, cache or storage.

### Phase 5: Pilot and improvement

**Deliver:** A small real-world pilot, seed content with permission, feedback sessions, performance measurements and a process for handling reports and incidents. Iterate on relevance, reading and contribution.

**Gate:** Agreed reliability, safety, accessibility and usefulness targets are met for the pilot. Decide expansion from evidence, not just a feature checklist.

### Phase 6: Expand deliberately

Consider communities, richer collections, badges, creator tools, additional media, native apps, messages and paid offerings after validation. None are assumed to be part of the initial pilot. Live chat and direct messages need particular attention to abuse, privacy and moderation before launch.

## 7. Feature delivery rule

For each feature: define the user task and acceptance criteria, design real states, review existing code, implement frontend and backend together, test permissions and accessibility, demonstrate on mobile and desktop, then evaluate with real users. A placeholder, mock API or passing unit test alone is not completion.

## 8. Measures of success

Agree numeric thresholds after establishing a baseline. Track whether people find relevant material, open it successfully, return to something they saved, contribute or engage meaningfully and report that the product helped them learn. Also measure reader and upload failures, speed, accessibility and moderation response. Follower count and time spent are not sufficient measures of learning.

## 9. Immediate next work

1. Finish checking the build and preview for the current PR, then stabilize CI and resolve deployment blockers.
2. Confirm production data and service constraints, and fix the highest-risk access-control and upload issues recorded in the codebase review.
3. Prepare the first design brief and wireframes for the mobile feed, a resource post, the reader and the create flow. Keep the existing minimal landing page until the new brand and experience are approved.
4. Review the direction with the founder before implementing the visual system or changing the database.

No production deployment, database reset or destructive cleanup is implied by this blueprint.
