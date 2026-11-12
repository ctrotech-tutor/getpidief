# Production environment and Supabase operations

`env.production.example` is a placeholder-only inventory, not a ready-to-deploy secret file. Add actual values privately in Vercel, scoped to Production. Do not replace existing working values with placeholders, put secrets in Git/chat, or blindly upload a local `.env.production` over an existing environment. Do not expose database URLs or private keys with `NEXT_PUBLIC_`. Production, preview and local databases must be separate. Vercel environment changes require a fresh deployment; check that CLI build/deploy commands do not override project variables with local values. `NEXT_PUBLIC_` variables are embedded at build time.

Supabase provides PostgreSQL here, not authentication, email, Redis, file storage, or Inngest. Application runtime uses the Supabase transaction pooler (normally port 6543); migrations use direct or session pooling (normally port 5432). See [Supabase connection modes](https://supabase.com/docs/guides/database/connecting-to-postgres). Use provider-recommended TLS, URL-encode special characters in passwords, and never print or share connection strings. Ensure the deployed app and migration connection refer to the **same intended production database**. This repository uses `DATABASE_URL` for both, so temporarily supply the session URL only to the migration command.

## Repeatable migration from Windows

The initial migrations have already been applied to the new project. Do **not** rerun migrations just to test signup. For each later release, back up the intended database, check restore procedures, review the new SQL and the database's migration history, confirm this is the right target, and plan for locks/downtime. Drizzle's migration journal prevents normal reapplication of recorded migrations, but does not prove compatibility with a modified or mismatched schema. Stop on any error. Never run `db:push` or `db:seed` against production. Demo seed is local-only and contains known passwords and fictional activity.

From a PowerShell terminal in a reviewed checkout with dependencies installed, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\ops\migrate-supabase-production.ps1
```

Paste the Supabase **session pooler** URI at the hidden prompt. Include `sslmode=require` or a stronger verified SSL mode and encode reserved password characters. The script displays the host, port and database only; verify them against Supabase Connect. It also requires typing `MIGRATE PRODUCTION`. It restores any previously exported `DATABASE_URL` afterwards. The host alone does not uniquely identify a Supabase project on a shared pooler; independently verify the project reference in the URI in your own secure environment. The script is a guardrail, not a backup, rollback or full identity check. Native tool errors may contain sensitive connection information; redact them before sharing.

## Service checks

- `AUTH_SECRET` (or legacy `NEXTAUTH_SECRET`) must be a stable, strong secret. Rotation invalidates existing sessions; do not change it merely to fill a template. Keep Auth.js URL configuration consistent with the canonical HTTPS host. Google requires the exact callback URI `https://www.getpidief.me/api/auth/callback/google` for that host. Google Console and live OAuth have not been verified here. See [GOOGLE-AUTH.md](GOOGLE-AUTH.md).
- Credential signup requires both main and rate-limit Upstash REST pairs. Verification and reset depend on Redis, the Inngest production app/keys, a verified sender and the selected email service. Sync Inngest to the live `/api/inngest` endpoint and verify delivery and retries. See [EMAIL.md](EMAIL.md).
- Pusher, analytics and object storage are feature-dependent. Object storage is not made private by setting env vars. Review bucket ACLs, public URLs, upload and moderation paths before handling sensitive content.
- Server-side Sentry DSNs are currently configured in source; the optional public client DSN and build token have separate roles. Review monitoring and PII settings before production use.
- Auth.js account linking is not automatic, and Google sign-up does not yet record versioned affirmative agreements. Review [GOOGLE-AUTH.md](GOOGLE-AUTH.md) and legal requirements.

After redeployment test Google sign-up and return login, a separate credential signup/verification/reset, feed read/write, and enabled integrations with test accounts. Check runtime logs without sharing tokens, email addresses or SQL parameters. A successful migration or build alone does not prove production readiness, email delivery, OAuth, backups, security or pooler compatibility.
