# AGENTS.md

## Dev Commands

```bash
# Full workspace
pnpm build
pnpm dev
pnpm lint
pnpm typecheck

# Single workspace
turbo dev --filter=web
turbo build --filter=@lleva/shared-constants
```

## Architecture

- **Monorepo**: Turbo + pnpm workspaces
- **Apps**: `apps/web` (Next.js), `apps/mobile` (React Native/Expo + NativeWind)
- **Packages**: `@lleva/shared-constants`, `@lleva/shared-types`
- **Backend**: Supabase (project ref: `qijycryumweibzvowdlj`)

## Supabase

```bash
# Link project (requires access token)
npx supabase link --project-ref qijycryumweibzvowdlj
npx supabase db push --include-all

# Local
supabase start   # port 54321
supabase stop
```

### Key Tables

- `public.profiles` - user profile (full_name, phone, avatar_url)
- `public.user_roles` - RBAC (passenger|driver|staff|admin|owner)
- `public.driver_profiles` - driver KYC
- `public.audit_logs` - audit trail

### User Registration

Atomic via DB trigger `on_auth_user_created`. No Edge Function.
Role sanitization: only `passenger` or `driver` allowed.

## Tech Stack

- Typescript 5.3
- Next.js + NativeWind (mobile)
- Supabase JS client
- Zod for validation
- Postgres 17

## Key Paths

- `supabase/migrations/` - DB migrations
- `supabase/functions/` - Edge functions
- `packages/shared-constants/src/design-tokens.ts` - LLEVA_COLORS

## Design Tokens Source of Truth

All colors MUST come from `@lleva/shared-constants`:

```typescript
import { LLEVA_COLORS, LLEVA_COLORS_FLAT } from '@lleva/shared-constants'

// Mobile components use LLEVA_COLORS (native)
const color = LLEVA_COLORS.brand.blue

// Web/Tailwind uses LLEVA_COLORS_FLAT (flat map)
// Classes: bg-brand-blue, text-primary-500, etc.
```

## Mobile Components

- `Button` uses `Pressable` + `expo-haptics` + `Animated` API
- `FormField` uses animated border focus state
- NEVER use hardcoded hex colors in components

## Web Middleware

Uses `getUser()` (secure) not `getSession()`.
Located at `apps/web/middleware.ts`

## Auth Store (Mobile)

Uses JOIN query (`user_roles` + `profiles`) for single round-trip.
Located at `apps/mobile/src/store/auth.store.ts`

## Build Order

shared-* packages must build first (turbo `^build`)

## Gotchas

- `driver_profiles.current_location` is TEXT (PostGIS not enabled)
- `auth-register` Edge Function removed (replaced by trigger)
- Mobile needs `expo-haptics` dependency
- Supabase CLI via `npx supabase`