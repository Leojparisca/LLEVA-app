# AGENTS.md

## Dev Commands

```bash
# Full workspace
pnpm build
pnpm dev
pnpm lint
pnpm typecheck

# Single workspace (from root with turbo)
turbo dev --filter=web
turbo build --filter=@lleva/shared-constants
```

## Architecture

- **Monorepo**: Turbo + pnpm workspaces
- **Apps**: `apps/web` (Next.js dashboard), `apps/mobile` (React Native/Expo)
- **Packages**: `@lleva/shared-constants`, `@lleva/shared-types`
- **Backend**: Supabase (local via CLI, see `supabase/config.toml`)

## Local Supabase

```bash
supabase start   # starts local DB + API on port 54321
supabase stop   # stops services
supabase reset  # resets local DB
```

## Tech Stack

- Typescript 5.3
- Supabase JS client (in node_modules)
- Zod for validation (shared-types)
- Database: Postgres 17 ( Supabase)

## Key Paths

- `supabase/migrations/` - DB migrations
- `supabase/functions/` - Edge functions
- `supabase/seed.sql` - Seed data

## Order Matters

Build dependencies: shared-* packages must build first (turbo handles this via `dependsOn: ["^build"]`)