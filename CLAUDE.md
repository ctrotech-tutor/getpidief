# Project: getpidief (Scholar's Workstation)

## CI/CD & Build Commands

- **Dev**: `next dev --turbo`
- **Build**: `next build`
- **Lint**: `next lint` (or `npx lint-staged` for pre-commit)
- **Typecheck**: `npm run typecheck`
- **Test**: `vitest` (Unit), `playwright test` (E2E)
- **Database**:
  - `npm run db:push` (Push schema to Neon)
  - `npm run db:gen` (Generate migrations)
  - `npm run db:stu` (Open Drizzle Studio)

## Coding Patterns

- **Database**: Use Repository pattern in `src/lib/db/repositories/`.
- **Validation**: Use Zod schemas in `src/lib/validations/schemas.ts`.
- **Components**: Follow Shadcn/ui patterns in `src/components/`.
- **Path Aliases**: Always use `@/`.

## Deployment

- **Vercel**: `vercel --prod` for production deployment.
- **Inngest**: `npm run inngest:dev` for background jobs local development.
