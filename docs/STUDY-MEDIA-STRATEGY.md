# Study media: product and design strategy

**Supporting research and product strategy.** The agreed direction and current phase order are recorded in [BUILD-BLUEPRINT.md](BUILD-BLUEPRINT.md). This is not a claim that any feature has shipped or that the market has no competitors.

## The ambition

Build a social platform where people can find what they need to learn, and where useful knowledge is connected to the people who create and discuss it. It should be as intuitive and polished as a leading social app, while making it easier to study, not harder to stop scrolling.

The intended audience is global. That does not mean we must serve every subject, language and institution equally on day one. Start with a focused group of learners and a credible collection of useful material, then widen coverage as the community and operations grow. The first pilot group remains to be chosen.

**Product promise, proposed:** Find something useful. Learn from it. Share it with someone else.

## Where the opportunity is

There are already document libraries, learning tools, academic networks and study communities. [Similarweb's competitor overview](https://www.similarweb.com/website/studocu.com/competitors/) lists examples including Studocu, Scribd, Quizlet and Academia.edu. Discord and Reddit also host learning communities. The opportunity is not an unverified claim that nobody else does anything similar. It is to combine discovery, a genuinely useful reader, trusted contributors and learning conversations into one coherent experience, then execute it unusually well.

The question to test: **Will students return because this is the easiest place to discover and use relevant study material and learn with other people?**

## Ten social product patterns to learn from

These are patterns to study, not designs, branding, ranking formulas or features to copy wholesale. The right combination and original execution matter more than the number of apps studied.

| Reference | Useful lesson | Proposed getpidief interpretation | What to avoid |
| --- | --- | --- | --- |
| Instagram | Familiar identity, creator relationships and a controllable Following feed | Readable profiles, clear post ownership and an easy way to see followed contributors | Making appearance or follower count more important than substance |
| TikTok | Discovery can help people find creators and topics they did not know | An optional discovery feed that helps a new contributor's genuinely useful resource reach relevant learners | Optimizing for time spent, autoplay or endless video consumption |
| YouTube | People return to creators and collections for longer-form content | Follow contributors and revisit organized learning resources | Treating every interaction as a video or building a video platform first |
| Reddit | Topic-based conversations and threaded discussion | Questions and discussion around a subject or resource, with clear community rules | Letting popularity votes stand in for correctness or enable pile-ons |
| Discord | People build study communities through shared spaces and conversation | Later, explore optional small study communities around subjects or courses | Shipping complex servers, chat and live voice before moderation is ready |
| Pinterest | Saving and organizing things makes discovery useful later | An accessible saved library, followed later by optional collections | A visual grid that hides the actual educational value |
| LinkedIn | Profiles can show a person's work and ongoing contributions | A contributor profile with meaningful work, subjects and transparent recognition | Inflated professional claims, engagement bait and popularity contests |
| Threads | Lightweight writing, topics and conversation | A simple short post or question beside resource posts, if validated for the first release | Generic hot takes, engagement bait and text feeds without context |
| Bluesky | People can choose between different feed perspectives | Clear Following and discovery tabs, with user controls and explanations for recommendations | Pretending algorithmic personalization is neutral or giving users no controls |
| WhatsApp | Sharing should feel easy and conversations should feel human | Low-friction sharing and useful notifications; consider private discussion later | Unsolicited messages, spam or launching private messaging without safety tools |

Sources for the product patterns include [Instagram Following and Favorites](https://about.fb.com/news/2022/03/two-new-ways-to-control-your-instagram-feed/), [TikTok discovery](https://newsroom.tiktok.com/en-us/discover), [Reddit and Discord community patterns](https://helpdesk.tcsedsystem.edu/hc/en-us/articles/40274993028631-What-are-Slack-Discord-and-Reddit-and-how-are-they-used), [Pinterest boards](https://help.pinterest.com/en/article/boards), [Threads topics and reply controls](https://about.fb.com/news/2025/03/new-threads-features-more-personalized-experience-you-control/) and [Bluesky feed concepts](https://socialk.it/en/blog/bluesky-custom-feeds-explained). The interpretations above are product hypotheses, not claims about exact current algorithms.

## What makes the experience distinct

### 1. A post leads somewhere useful

A post can be a real learning resource, an explanation or a question. A resource card should tell the learner what it is, who shared it, what subject it covers and why it may help. The primary action should take them into the material, not just another engagement screen.

### 2. A reader that belongs in the conversation

A reader should let someone study with minimal friction, save or return to their place and find the related discussion without losing context. Annotations, page-specific comments and shared study lists are promising later experiments, not launch promises. The initial reader must work on real phones and respect access rules.

### 3. People, topics and resources are connected

Follow the person who explains a topic well; find more of their useful work; discover related subjects and other contributors. A small following should not prevent a helpful resource from being discovered. No algorithm should claim a resource is correct just because it is popular.

### 4. Useful signals instead of vanity alone

Explore signals like saves, meaningful discussion and return visits. Let people give feedback on relevance, but do not represent likes as academic verification. Badges should have clear, public criteria and be introduced only when we can award them honestly.

### 5. Feed control and time well spent

Offer a Following view and an optional discovery view. Let learners edit interests, hide content and understand why they see a recommendation. Design deliberate stopping points and make the library easy to reach. Start ranking with simple, explainable rules and improve from evidence.

## Suggested initial content model

**Recommendation, pending founder approval:** support two post types in the first product slice.

1. **Resource post:** a permitted PDF with a useful title, description, subject, optional course or institution, author, provenance and reader.
2. **Study post or question:** short text with optional subject context, replies and a clear connection to the author's profile. No need for video or complex publishing tools initially.

The existing app is document-focused; text posts require an explicit data-model and moderation decision. Confirm whether both belong in the first pilot. Avoid treating a display-only mock as a functioning post.

## Visual and interaction principles

- Design like a real product, not a generic landing-page template: strong typography, useful content hierarchy, deliberate spacing and restrained motion.
- No default gradient-heavy hero, decorative dashboard cards, artificial statistics, glowing blobs or repeated slogans unless they solve a real design problem and the founder approves them.
- Build a recognizable identity around reading, people and discussion. Establish colors, type, icons, surfaces and editorial voice from exploration, not from a premade visual style.
- Mobile navigation should feel natural and thumb-friendly. Desktop should make use of the space without turning the feed into a busy admin panel.
- Design real examples and states: empty feed, no results, upload failure, private resource, report, loading, slow connection and success.
- Prioritize contrast, accessible labels, keyboard support, text scaling, reduced motion and a readable non-canvas alternative where feasible.
- Use real data or clearly labeled sample content during prototyping. Never publish fictional testimonials, fake numbers or invented verification claims.

## Writing and content quality

The founder wants natural, human-sounding writing and no generic AI-style copy. Treat this as an editorial standard, not a promise that software can reliably identify whether text was written by AI.

- Write directly, with specific language and a reason for each sentence. Prefer simple words and natural variation over hype, filler and repeated formulae.
- **No em dashes** in product copy or new product documentation. Use periods, commas or colons instead.
- Avoid empty phrases such as "unlock your potential" or unsupported claims such as "the world's best". Show what a feature actually does.
- Give errors a useful explanation and next step. Write labels in the language a student would use.
- Require original or permitted material, meaningful context and a working report process. Protect contributors' ability to edit, remove or correct their work.
- A writing assistant or editorial checklist could help authors revise for clarity, with their consent. It must not secretly rewrite their voice or claim it can bypass detectors. AI-content labeling or policies, if any, need a separate founder, legal and community decision.
- Human review, reporting, rate limits, provenance and moderation are better foundations than claiming a detector can eliminate low-quality or AI-generated content.

## Phased execution

This is the same priority sequence as [REBUILD-PLAN.md](REBUILD-PLAN.md), expressed in product terms.

1. **Direction and baseline:** choose first pilot group, content rules, examples and brand references. Fix build, preview and local setup. Confirm existing production data and constraints.
2. **Trust and foundation:** access policies, upload ownership, privacy, cache isolation, reporting, moderation and security tests. Establish design tokens and performance baseline.
3. **Experience design:** map the mobile and desktop journeys; explore original visual directions; review interactive prototypes of feed, resource, reader and creation flow with the founder and students.
4. **First real product loop:** implement accounts, feed, resource creation and reader, search, saves, follows, comments and minimal notifications with real data and complete states. Add text posts only after the scope decision.
5. **Limited pilot:** recruit learners and contributors, seed permitted content, test usefulness, reader reliability, search, moderation and performance. Refine from observed problems.
6. **Measured growth:** expand content coverage and languages, and add features such as collections, badges or communities only when the pilot supports them.

A phase is complete only when its acceptance criteria in the rebuild plan are met, not when a visual mockup looks finished.

## What to measure

First establish baseline data and agree targets with the founder. Useful indicators include whether a learner finds a relevant resource, successfully opens it, saves it and returns, whether contributors complete an upload, and whether reports are resolved. Also measure accessibility, page performance, failed actions, unwanted content and users' own feedback. Time spent and follower counts alone are not measures of learning.

## Decisions to make next

- Pick the first global pilot segment: university students, exam candidates, self-learners, or another group. Global reach and a focused starting community can coexist.
- Approve or change the proposed two initial post types: PDF resources and text/questions.
- Decide whether public resources are browsable without an account and whether core reading remains free.
- Share a few app references, screenshots or words that describe the desired personality. The ten-platform review is a source of principles, not a substitute for visual direction.
- Identify the first permitted content and contributors, and any production data that must be preserved.
