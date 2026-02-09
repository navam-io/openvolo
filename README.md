<p align="center">
  <img src="https://raw.githubusercontent.com/navam-io/openvolo/main/public/assets/openvolo-logo-name.png" alt="OpenVolo" width="200" />
</p>

<h3 align="center">Agentic AI-Native Social CRM</h3>

<p align="center">
  Manage contacts, content, and engagement across X/Twitter, LinkedIn, and Gmail — powered by Claude AI agents.
  <br />
  All data stays on your machine. One command to start.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: Apache 2.0" src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" /></a>
  <img alt="Node 18+" src="https://img.shields.io/badge/Node-18%2B-green.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-blue.svg" />
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16.1-black.svg" />
</p>

---

**One-command boot** — `npx openvolo` starts everything
&nbsp;&bull;&nbsp;
**Local-first** — SQLite database, data never leaves your machine
&nbsp;&bull;&nbsp;
**Multi-platform** — X + LinkedIn + Gmail in one CRM
&nbsp;&bull;&nbsp;
**AI-powered** — Claude Agent SDK + Vercel AI SDK

---

## Features

### Contact Management
Unified contacts across platforms with automatic cross-platform deduplication. Enrichment scoring (0-100) based on profile completeness, and funnel stage tracking from lead to customer.

### X/Twitter Integration
OAuth 2.0 authentication, contact sync from followers/following, tweet and mention import with cursor-based pagination, compose and publish tweets, thread support, and engagement actions (like, retweet, reply).

### LinkedIn Integration
OAuth 2.0 with OpenID Connect, profile sync, and CSV import for connections (no LinkedIn partner program required).

### Gmail / Google Contacts
Google People API contact sync with 2-tier deduplication (identity match then email match). Email metadata enrichment tracks message frequency (sent/received in last 30 days) per contact — no email content is stored.

### Content Library
Import tweets and mentions, compose new posts, draft and publish workflow with thread support. Engagement metrics tracked over time with both JSON snapshots (fast display) and structured rows (time-series analysis).

### Task Management
Create, update, and track tasks with status and priority. Link tasks to contacts for relationship-aware workflows.

### AI Agents (Foundation)
Two-tier AI architecture with agent run tracking. Vercel AI SDK powers the chat UI, Claude Agent SDK handles background automation.

### Privacy & Security
AES-256 encrypted credential storage. All data stored locally in SQLite — no cloud dependency, no data leaves your machine.

## Quick Start

```bash
npx openvolo
```

On first run, OpenVolo creates `~/.openvolo/` for your database and config, runs schema migrations, and starts the dashboard at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file in your project root:

```bash
# Required — for Claude AI features
ANTHROPIC_API_KEY=

# X/Twitter (optional)
X_CLIENT_ID=
X_CLIENT_SECRET=

# LinkedIn (optional)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Gmail / Google Contacts (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## Platform Setup

**X/Twitter** — Create an app at [developer.x.com](https://developer.x.com), enable OAuth 2.0 with `http://localhost:3000/api/platforms/x/callback` as the redirect URI.

**LinkedIn** — Create an app at [developer.linkedin.com](https://developer.linkedin.com), add the "Sign In with LinkedIn using OpenID Connect" product, set `http://localhost:3000/api/platforms/linkedin/callback` as the redirect URI.

**Gmail / Google** — Create a project in [Google Cloud Console](https://console.cloud.google.com), enable the People API and Gmail API, configure OAuth consent screen, and add `http://localhost:3000/api/platforms/gmail/callback` as the redirect URI.

> See the in-app **Help** page (`/dashboard/help`) for detailed step-by-step setup guides for each platform.

## Architecture

**Boot flow** — `npx openvolo` runs `bin/cli.ts`, which ensures `~/.openvolo/` directories exist, pushes the latest schema to SQLite, and spawns Next.js.

**Rendering boundary** — Server Components read the database directly (better-sqlite3 is synchronous). Client Components call API routes via `fetch`.

**Two-tier AI** — Vercel AI SDK 6 handles streaming chat in the UI. Claude Agent SDK runs background agents for automation tasks.

**Data layer** — SQLite database at `~/.openvolo/data.db` managed by Drizzle ORM. Credentials are AES-256 encrypted in `~/.openvolo/config.json`.

## Tech Stack

| Category | Details |
|----------|---------|
| Framework | Next.js 16.1, React 19, TypeScript 5.8 |
| Database | SQLite (better-sqlite3), Drizzle ORM 0.45 |
| AI | Vercel AI SDK 6, Anthropic SDK, Claude Agent SDK |
| UI | Tailwind CSS 4, shadcn/ui (Radix), Lucide Icons |
| Testing | Vitest |
| Validation | Zod 3.24 |

## Project Structure

```
bin/cli.ts                            # npx entry point
src/
  app/
    api/                              # API routes
      contacts/                       #   Contact CRUD
      content/                        #   Content CRUD
      platforms/                      #   X, LinkedIn, Gmail auth + sync
      tasks/                          #   Task CRUD
      ai/                             #   AI chat endpoint
    dashboard/                        # UI routes
      contacts/                       #   Contact list + detail
      content/                        #   Content list + detail + compose
      settings/                       #   Platform connections
      help/                           #   Setup guides
      agents/                         #   Agent runs
  lib/
    db/
      schema.ts                       # All database tables (Drizzle)
      client.ts                       # Database connection
      queries/                        # Query modules (contacts, content, tasks, ...)
    platforms/
      x/                              # X/Twitter client, mappers, adapter
      linkedin/                       # LinkedIn client, mappers, adapter
      gmail/                          # Gmail/Google client, mappers, adapter
    auth/                             # AES-256 crypto + API key management
  components/                         # Shared UI components (shadcn/ui based)
```

## Development

```bash
npm run dev              # Next.js dev server (Turbopack)
npm run build            # Production build
npm run build:cli        # Compile CLI entry point
npm run db:generate      # Generate Drizzle migrations from schema
npm run db:migrate       # Apply pending migrations
npm run db:studio        # Open Drizzle Studio (DB browser)
npm run test             # Run Vitest
npm run lint             # ESLint
```

## Roadmap

- [x] **Phase 0** — Project setup, CLI, schema, auth, UI shell
- [x] **Phase 1** — Contact CRUD, Task CRUD, Dashboard, Identities, Enrichment, X/Twitter
- [x] **Phase 2 (Sprints 1-2)** — Content Foundation, Detail, Compose, Thread
- [x] **LinkedIn Integration** — OAuth, Profile Sync, CSV Import
- [x] **Gmail Integration** — OAuth, Contact Sync, Email Metadata
- [ ] **Phase 2 (Sprint 3)** — AI Chat + Direct Messages
- [ ] **Phase 3** — Campaign workflows, automated sequences
- [ ] **Phase 4+** — Multi-user support, Substack integration, advanced agents

## License

[Apache License 2.0](LICENSE)
