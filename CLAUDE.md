# CLAUDE.md — OpenVolo

Agentic AI-Native Social CRM for X/Twitter + LinkedIn with Claude-powered agents.
Boot with `npx openvolo` — starts Next.js 16 + SQLite + Claude Agent SDK.

## Commands

```bash
npm run dev              # Next.js dev server (Turbopack)
npm run build            # Production build
npm run build:cli        # Compile CLI (bin/cli.ts → dist/)
npm run db:generate      # Generate Drizzle migrations from schema changes
npm run db:migrate       # Apply pending migrations
npm run db:studio        # Open Drizzle Studio (DB browser)
npm run test             # Run vitest
npm run lint             # ESLint
npx shadcn@latest add <component>  # Add shadcn/ui component (requires .npmrc legacy-peer-deps)
```

## Architecture

**Boot flow**: `npx openvolo` → `bin/cli.ts` → ensures `~/.openvolo/` dirs → runs migrations → spawns `next start`

**Rendering boundary**: Server Components call DB directly (sync). Client Components call API routes via fetch.

**Two-tier AI**: Vercel AI SDK 6 for UI chat streaming, Claude Agent SDK for background agents.

**Data**: SQLite at `~/.openvolo/data.db`, config at `~/.openvolo/config.json` (AES-256 encrypted credentials).

### Key Directories

```
bin/cli.ts                          # npx entry point
src/app/dashboard/                  # All UI routes
src/app/api/                        # API routes (Client Component boundary)
src/lib/db/schema.ts                # All database tables (Drizzle)
src/lib/db/client.ts                # Drizzle + SQLite connection
src/lib/db/queries/                 # Query modules (contacts, identities, tasks)
src/lib/db/enrichment.ts            # Enrichment score calculator
src/lib/auth/                       # Crypto (AES-256) + API key management
src/components/                     # Shared UI components (shadcn/ui based)
```

## Code Style

- **Imports**: Always use `@/*` path alias (maps to `./src/*`). Never use relative imports.
- **DB queries are sync**: better-sqlite3 is synchronous. No `async/await` on query functions.
- **Naming**: camelCase for functions/variables, PascalCase for components/types, kebab-case for files.
- **IDs**: Generated with `nanoid()`.
- **Timestamps**: Unix seconds via `Math.floor(Date.now() / 1000)`, not milliseconds. Schema uses `sql\`(unixepoch())\`` for defaults.

## Gotchas

**Next.js 16 async params** — Route params are Promises. Always destructure with await:
```ts
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
```

**Zod v3 only** — Pinned to `zod@^3.24`. v4 breaks `ai` SDK. `.npmrc` has `legacy-peer-deps=true` to resolve peer conflicts.

**Tailwind v4** — Config lives in `globals.css` via `@theme inline { }`. There is no `tailwind.config.js` for theme values.

**Platform enum casts** — Use literal types, not indexed access:
```ts
platform: row.platform as "x" | "linkedin" | "gmail" | "substack"  // correct
platform: row.platform as Contact["platform"]                       // breaks
```

**Zod `.refine()` doesn't narrow types** — Compute guaranteed values at the API boundary before passing to DB insert functions.

**`drizzle-kit push --force` can fail** — FK constraints on existing data block column changes. Use manual `ALTER TABLE` as fallback.

**Enrichment scores** — Computed on every write (create/update contact, add/delete identity). Stored on the contact row, not computed at read time.

**`attachIdentities` pattern** — Batch-fetch identities with `inArray()` to avoid N+1 queries on list views.

**shadcn/ui installs** — Requires `.npmrc` with `legacy-peer-deps=true` due to zod v3/v4 peer conflicts between ai-sdk and claude-agent-sdk.

## Environment

- **Node.js**: 18+ required
- **Data directory**: `~/.openvolo/` (auto-created on first boot)
  - `data.db` — SQLite database
  - `config.json` — Encrypted credentials
  - `sessions/`, `media/` — Runtime data
- **Env vars**: `ANTHROPIC_API_KEY` for Claude features
- **Schema source**: `src/lib/db/schema.ts` — single source of truth for all tables
