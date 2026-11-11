# Onboarding: current design and next steps

The first-run experience should help someone reach a useful social feed quickly, without assuming they attend a university or asking for details the product cannot use. The current flow has three optional choices: institution, academic path, and interests. Progress is stored in PostgreSQL and survives refresh. Each step can be skipped, and completion takes the user to the home feed. An empty database needs no seed for onboarding.

## Institution search

Local institutions are searched first. For queries of at least three characters, the server also searches the public [Research Organization Registry (ROR) v2 API](https://ror.readme.io/docs/rest-api), filtering for active education organizations. ROR is a research-organization directory, not a complete list of all learning institutions. The interface discloses that search text is sent to ROR; do not enter sensitive personal information. Users can skip even if the service is down or their institution is missing.

The client sends only a selected ROR identifier. The server re-fetches and validates the organization on selection, matches an existing local institution by canonical name and country where possible, or creates a local record with a deterministic `ror-` slug. Newly imported records are **not verified** and have no trusted email domains. Selecting an organization does not prove affiliation. Existing institutions are not automatically merged or overwritten. Name matching is best effort, so aliases, historical names or concurrent imports may still yield duplicates and require administration. The directory requires outbound HTTPS access to `api.ror.org`. Search is debounced, bounded, cached, and uses the existing per-user search rate limiter. In production, global lookup is disabled when the rate-limit Redis client is not configured. Local results and skipping still work.

## Important limitations and product follow-through

- Interest choices are stored, but the current home feed is chronological and does not yet use them to rank posts. Do not promise personalization until that is implemented and evaluated.
- Institution and topic editing after completion is incomplete. Academic details can be edited under settings, but the existing institution settings do not yet offer an institution selector. Avoid promising that every choice can already be changed later.
- A meaningful first feed should offer useful conversations, people and resources without inventing activity. Future work should build real follow and recommendation signals, transparent controls, and a good empty state before adding more onboarding questions.
- Verify complete signup, verification, navigation, keyboard use, error recovery, browser zoom and mobile viewport behavior in real browsers. A short viewport may require normal document scrolling; avoid clipping controls to force a no-scroll layout.
- Track aggregate completion and drop-off by step only after a privacy review. Do not log search text, selected institutions, tokens or account identifiers in analytics by default.
