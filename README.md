# Mastra Software Factory

An open source, agent-powered software delivery environment built on [Mastra](https://mastra.ai). Connect GitHub and Linear, pull issues into an intake board, hand them to coding agents, and ship pull requests — from a web app you own and can deploy anywhere.

Created with [`npm create softwarefactory`](https://www.npmjs.com/package/create-softwarefactory).

## Quick start

```bash
npm install

# optional: local Postgres (+pgvector) & Redis via Docker
npm run db:up

npm run dev
```

- **Factory UI** → http://localhost:5173
- **Mastra Studio** → http://localhost:4111
- **API** → http://localhost:4111/api

With zero configuration the app runs in local, auth-less mode (agents + local storage, no integrations). Features enable themselves as you add environment variables — see below.

## Configuration

All configuration lives in `.env` (validated against `.env.schema` by [varlock](https://varlock.dev)). Every value is optional; each feature activates when its variables are set. Restart `npm run dev` after changing `.env`.

| Feature | Requires |
| --- | --- |
| Agents / model providers | `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` (or add keys in Settings › Models) |
| Sign-in (WorkOS) | `WORKOS_API_KEY`, `WORKOS_CLIENT_ID` |
| GitHub projects & intake | WorkOS + `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_SLUG` + `APP_DATABASE_URL` |
| Linear intake | WorkOS + `LINEAR_CLIENT_ID`, `LINEAR_CLIENT_SECRET` + `APP_DATABASE_URL` + a state secret (`GITHUB_APP_WEBHOOK_SECRET` or `WORKOS_COOKIE_PASSWORD`) |
| Distributed event bus | `REDIS_URL` (only needed for multi-process deployments) |
| Cloud sandboxes | `RAILWAY_API_TOKEN` (defaults to a local git sandbox otherwise) |

### Database

Integrations and shared agent state need Postgres **with the pgvector extension**. Two easy options:

- **Local Docker** (recommended to start): `npm run db:up` starts Postgres on `localhost:54329` matching `APP_DATABASE_URL=postgres://user:pass@localhost:54329/mastracode_web` (plus Redis on `localhost:63799`).
- **Hosted Postgres**: any provider works if pgvector is available (Neon, Supabase, Railway, RDS, ...). See https://mastra.ai/docs/software-factory/database

Without `APP_DATABASE_URL`, agent state falls back to a local libSQL file and integrations stay off.

### Sign-in (WorkOS)

Integrations are per-organization, so they require sign-in, powered by [WorkOS](https://workos.com) (free tier is fine):

1. Create a WorkOS project → copy the **API key** and **Client ID** into `.env`.
2. In WorkOS → Redirects, add `http://localhost:5173/auth/callback`.
3. Set `WORKOS_COOKIE_PASSWORD` to a random 32+ character string.

Guide: https://mastra.ai/docs/software-factory/auth

### GitHub

The Factory connects to GitHub through a GitHub App you own. `npm create softwarefactory` can create it for you automatically (manifest flow). To do it manually: https://mastra.ai/docs/software-factory/github

The app needs **contents, issues, pull requests, metadata** permissions and the **issues, issue_comment, pull_request, pull_request_review, pull_request_review_comment** events. Set its callback URL to `<your app origin>/auth/github/callback`.

Webhooks (optional — powers auto-triage and PR notifications): point the App's webhook URL at `https://<public-host>/web/github/webhook` and set `GITHUB_APP_WEBHOOK_SECRET`. Local development works without webhooks; issues are fetched on demand.

### Linear (optional)

Create a Linear OAuth app and set `LINEAR_CLIENT_ID` / `LINEAR_CLIENT_SECRET`. Guide: https://mastra.ai/docs/software-factory/linear

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | API server (:4111) + Factory UI (:5173) with live reload |
| `npm run db:up` / `db:down` | Start/stop local Postgres + Redis (Docker) |
| `npm run build` | Build the SPA and bundle the server to `.mastra/output` |
| `npm run start` | Run the production build |
| `npm run deploy` | Build, validate, and deploy to [Mastra Cloud](https://mastra.ai/docs/mastra-platform/overview) |
| `npm run check` | Typecheck server and UI |

## Requirements

- Node.js ≥ 22.19
- Docker (optional, for the local database)
- Postgres 15+ with pgvector (for integrations)

## Versions

This project pins exact versions of the Mastra packages (currently `@mastra/core@1.51.1-alpha.1`, `@mastra/code-sdk@0.1.1-alpha.1`). Upgrade them together when updating.

## License

Apache-2.0
