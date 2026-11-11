# PostgreSQL setup

The application uses the standard PostgreSQL protocol through `pg` and Drizzle, not a provider-specific database driver. A PostgreSQL URL in `DATABASE_URL` can point at a local server or a compatible managed service such as Neon or Supabase. This is portability between PostgreSQL providers, not support for MySQL, SQLite or arbitrary database engines. Hosting, credentials, TLS, connection limits, extensions and migrations remain the operator's responsibility.

## Local development

Install Docker and the Compose plugin, then from the repository root:

```bash
docker compose up -d
```

Create `.env.local` (do not commit it) and set:

```dotenv
DATABASE_URL=postgresql://getpidief:local-dev-only@localhost:54329/getpidief
```

The sample password is exclusively for the loopback-only local container. The volume persists across container restarts. **Do not run `docker compose down -v` unless you intentionally want to delete all local database data.** Exported environment variables take precedence over `.env.local`, so check your shell before running any database command. Never use a production URL for local development or tests.

After the service is healthy, initialize the **empty local database only**:

```bash
npm run db:mig
```

The initial migration requires the PostgreSQL `pg_trgm` extension and permission to create it. The migration creates it if absent. Managed providers may require an administrator to enable it. Do not blindly apply the initial migration to an existing production schema: back it up and review its migration history and schema first. `db:push` can alter a schema directly and is not a substitute for reviewed migrations. The optional `npm run db:seed` writes sample accounts and data: use it only on a disposable development database, never production. It is not required for migrations.

Next.js loads `.env.local` automatically. Drizzle Kit and the seed script also load `.env.local` then `.env`, without overriding shell variables. The rest of the app still needs its own authentication and service settings: a database URL alone does not configure uploads, email, cache, realtime or background jobs.

## Managed URLs and operating constraints

Use a PostgreSQL connection string supplied by your provider, including its recommended TLS parameters. For serverless deployments, use a provider-supported pooled endpoint if appropriate, size the provider pool for the number of application instances, and use a direct/session-compatible URL for migration operations when required by the provider. The application bounds its pool at five connections per Node process, not globally. Transaction pooling and provider restrictions must be verified with your deployment. No TLS certificate checks are disabled here.

The database client requires the Node runtime and is not Edge-compatible. Edge handlers must not import it. Use separate databases, credentials and environment variables for local, test, preview and production. A real PostgreSQL compatibility check can be run against an **isolated test database** by setting `TEST_DATABASE_URL` and running `npm run test:db`; this checks connectivity and transaction rollback. For the write/concurrency suite, first migrate a disposable local database whose name ends in `_test`, then explicitly set `TEST_DATABASE_WRITE=yes` and run `npm run test:db:social` with `TEST_DATABASE_URL`. The suite refuses non-local hosts or database names that do not end in `_test`, uses random fixture IDs, and deletes only its own fixtures, but a disposable database is still essential. Never point tests at a real database. The normal test suite skips database tests unless explicitly configured. A local PostgreSQL 16.9 instance passed the migrations and initial concurrency tests; managed-provider compatibility, all access paths and operational behavior remain unverified.
