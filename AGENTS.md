<!-- BEGIN:nextjs-agent-rules -->
# ⚠️ This is NOT the Next.js you know (v16.2.2)

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data.

- READ the guide in `node_modules/next/dist/docs/` before writing code.
- HEED all deprecation notices.
- Use `next dev --turbo` for development.
<!-- END:nextjs-agent-rules -->

## Project: getpidief (Scholar's Workstation)

A high-performance document sharing and PDF viewing platform designed for academic and research workflows.

### 🛠 Tech Stack

- **Framework**: Next.js 16.2.2 (App Router), React 19.2.4
- **Styling**: Tailwind CSS v4, Framer Motion v12
- **Database**: Drizzle ORM, Neon (PostgreSQL)
- **State Management**: Zustand (App state), Jotai (PDF/UI atoms), TanStack Query (Server state)
- **Auth**: Auth.js v5 (NextAuth), Neon Auth
- **Infrastructure**: Inngest (Background jobs), Pusher (Real-time), Upstash (Redis/Ratelimit), Resend (Email)
- **Testing**: Vitest, Playwright

### 📐 Coding Standards & Patterns

- **Database Access**: ALWAYS use the Repository pattern located in `src/lib/db/repositories/`. Do not perform raw Drizzle queries in server components/actions if a repository exists.
- **Validation**: Use Zod schemas from `src/lib/validations/schemas.ts` for all form and API inputs.
- **Components**: Follow Shadcn/ui patterns. Keep components in `src/components/` organized by `ui`, `layouts`, `features`, and `charts`.
- **Path Aliases**: Always use `@/` for imports (e.g., `@/components/ui/button`).
- **Real-time**: Use `src/lib/pusher/` for real-time events and `src/hooks/usePusher.ts`.
- **Background Jobs**: Define Inngest functions in `src/lib/inngest/functions/`.

### 🤖 Agent Guidelines (Antigravity & Cursor)

- **Context is King**: Always check `ARCHITECTURE.md` and `package.json` before proposing major changes.
- **Proactive Verification**: When fixing bugs, check `ts_errors.txt` or run `npm run typecheck` to ensure no regressions.
- **Concise & Direct**: Provide code first, explanation second. Avoid fluff.
- **Workflow**:
  1. Research (Read code/docs)
  2. Plan (Implementation plan)
  3. Execute (Task list)
  4. Verify (Tests/Typecheck)

### 📁 Key Directories

- `src/app/`: App Router pages and API routes.
- `src/components/features/`: Feature-specific logic and UI.
- `src/lib/db/schema/`: Drizzle schema definitions.
- `src/lib/inngest/`: Background job logic.
- `scripts/`: Development and maintenance scripts.
