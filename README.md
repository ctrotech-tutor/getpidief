# getpidief

A study-media platform in the planning stage: an engaging social experience built around discovering, sharing and using educational resources.

The product is being reconsidered from the ground up. The current homepage is intentionally minimal; existing application code is a starting point to evaluate, not a finished product.

- [Working product vision and rebuild plan](docs/PRODUCT.md)
- [Historical docs and previous audit](docs/archive/) — reference only; may be outdated or inaccurate.

## Development

Requires Node.js 20.9 or later and npm. The project uses Next.js, React and TypeScript.

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Existing authenticated features and integrations require their own environment configuration and services; the minimal homepage does not demonstrate that those features work. Some packages run install scripts, including an Inngest CLI binary download, which requires access to GitHub releases.

Useful checks:

```bash
npm run typecheck
npm run lint
npm run test -- --run
```

The existing codebase has known lint and dependency-audit issues. A full production build and all integrations still need verification as part of the rebuild.
