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
- **Backend**: Supabase (project ref: `qijycryumweibzvowdlj`)

## Supabase

```bash
# Link project (requires access token from https://supabase.com/dashboard/account/tokens)
npx supabase link --project-ref qijycryumweibzvowdlj

# Push migrations to remote
npx supabase db push --include-all

# Local development
supabase start   # starts local DB + API on port 54321
supabase stop
supabase reset
```

### Key Tables

- `public.profiles` - basic user profile (full_name, phone, avatar_url)
- `public.user_roles` - RBAC (user_id, role: passenger|driver|staff|admin|owner)
- `public.driver_profiles` - driver KYC (verification_status, driver_status)
- `public.audit_logs` - audit trail

### User Registration

Registration is atomic via DB trigger `on_auth_user_created`. No Edge Function needed.
Role sanitization: only `passenger` or `driver` allowed. Others default to `passenger`.

## Tech Stack

- Typescript 5.3
- Supabase JS client
- Zod for validation
- Postgres 17

## Key Paths

- `supabase/migrations/` - DB migrations (apply via `supabase db push`)
- `supabase/functions/` - Edge functions
- `supabase/seed.sql` - Seed data

## Order Matters

Build: shared-* packages must build first (`turbo` handles via `^build`)

## Gotchas

- `driver_profiles.current_location` is TEXT (PostGIS not enabled)
- Edge function auth-register removed (replaced by trigger)
- Supabase CLI via `npx supabase`, not globally installed