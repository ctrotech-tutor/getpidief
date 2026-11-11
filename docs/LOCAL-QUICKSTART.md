# Run getpidief locally

This guide is for a separate development database. It does not reset or migrate your existing hosted database. Use Node.js 22, npm and Docker with Compose.

1. In your repository, update `main` after the PR has merged:

   ```bash
   git checkout main
   git pull origin main
   npm ci --ignore-scripts
   ```

   If you have uncommitted local changes, Git may require you to save or stash them before switching branches or pulling. `--ignore-scripts` avoids optional install-time binary downloads; the Inngest CLI and other install-script-dependent tools may require separate setup.

2. Start the development PostgreSQL and Mailpit containers:

   ```bash
   docker compose up -d
   ```

   PostgreSQL uses a persistent local volume. It is fresh only if that volume has never been used. If it already contains a database, do not delete it or run migrations against it until you have checked what it contains. Choose a separate empty database instead. See [DATABASE.md](DATABASE.md).

3. Create `.env.local` in the repository root. Do not commit it or use production credentials:

   ```dotenv
   DATABASE_URL=postgresql://getpidief:local-dev-only@localhost:54329/getpidief
   AUTH_SECRET=replace-with-a-long-random-local-secret
   NEXTAUTH_SECRET=replace-with-the-same-long-random-local-secret
   NEXTAUTH_URL=http://localhost:3000
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   EMAIL_PROVIDER=local
   INNGEST_DEV=1
   UPSTASH_REDIS_REST_URL=your-development-upstash-rest-url
   UPSTASH_REDIS_REST_TOKEN=your-development-upstash-rest-token
   ```

   Generate a local secret with `openssl rand -base64 32`, then paste it into both secret fields. The example Docker password is for local development only. Environment variables already exported in your shell take precedence over `.env.local`; verify that they do not point to a hosted database before any database command.

4. Only after confirming the URL points to the **empty local database**, apply migrations and start the app:

   ```bash
   npm run db:mig
   npm run dev
   ```

   Visit `http://localhost:3000/feed-preview` for the sample social feed. Its posts and interactions are examples and reset on refresh. The regular application uses real services and is not yet fully configured by a database URL alone. No seed command is required or recommended for a fresh empty database.

5. Optional checks:

   ```bash
   npm run typecheck
   npm run lint
   npm test -- --run
   ```

Email, authentication providers, uploads, storage, background processing, rate limiting and realtime need their own development service configuration. See `env.example` and [PHASE-1-PROGRESS.md](PHASE-1-PROGRESS.md) for limitations. In particular, current file storage may be public, including before moderation. Do not upload sensitive materials. Production readiness and hosted integrations have not been established.

## Local signup email

`EMAIL_PROVIDER=local` sends messages to Mailpit on this machine only. Open **http://localhost:8025** to view the inbox and click the verification link, which should start with `http://localhost:3000`. Mailpit does not send real email and local mode is rejected outside `NODE_ENV=development`. Messages contain one-time links: use test accounts only, and do not expose the inbox or SMTP port to other machines. Mailpit messages are not persisted across container recreation. If port 1025 or 8025 is in use, resolve the conflict before starting Compose.

Registration still requires a reachable development Upstash REST Redis, and the email worker still requires an Inngest development server connected to `http://localhost:3000/api/inngest`. Inngest processes the message asynchronously; the email appears in the Mailpit inbox, not necessarily immediately after registration. Running `npm ci --ignore-scripts` may leave the bundled Inngest CLI unavailable; install the Inngest CLI separately, then run `inngest dev -u http://localhost:3000/api/inngest`. Check the Inngest dashboard for worker failures. These services have not been verified against a real account in this environment.

Other provider settings and sender verification are documented in [EMAIL.md](EMAIL.md). Onboarding can be completed without institutions or interest tags, so no seed is needed. Optional choices are saved when available. Institution search can use the ROR directory over HTTPS; it also works with local results or can be skipped if the directory is unavailable. Selected interests are stored, but the current home feed is chronological rather than personalized by topic. See [ONBOARDING.md](ONBOARDING.md).
