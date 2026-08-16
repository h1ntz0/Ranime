# Architecture

AnimeList Local is a **local-first** anime platform. All external data comes from the AniList
GraphQL API through the backend, is normalized and persisted in a local PostgreSQL database. The
browser never talks to AniList directly.

```
Browser
   |
   v
Frontend (apps/web, :3000) — React + Vite + TanStack Query + Tailwind v4
   |
   v  /api (Vite dev proxy)
Backend (apps/api, :4000) — Fastify + Zod
   |
   +---- PostgreSQL (:5432, Docker)
   |
   +---- AniList GraphQL API (graphql.anilist.co)
```

## Monorepo layout

```
├── apps/
│   ├── api/                  # Fastify backend (:4000)
│   └── web/                  # Vite React frontend (:3000)
├── packages/
│   └── shared/               # Shared API contract types ({data}/{error} envelope)
├── database/
│   ├── migrations/           # SQL migrations
│   └── seed/                 # Seed script
├── docker-compose.yml        # PostgreSQL only
└── PRD.md
```

## Backend (apps/api)

Fastify application structured around feature **modules**. Each module owns its routes and, where
logic is non-trivial, a service.

```
src/
├── config/        # zod-validated environment (fails fast on missing vars)
├── database/      # pg pool + drizzle schema
├── lib/           # errors, envelope helpers
├── services/      # cross-cutting logic (AniList sync)
├── modules/
│   ├── health/        # GET /api/health
│   ├── auth/          # register / login / logout / me (JWT + Argon2id)
│   ├── catalog/       # genres, season, top, airing
│   ├── anime/         # anime list, detail, characters, staff, relations, recommendations
│   ├── ratings/       # user + community ratings, distribution
│   ├── reviews/       # review CRUD + spoiler protection
│   ├── watchlist/     # library/watchlist entry + status counts
│   ├── statistics/    # aggregated personal stats
│   └── users/         # public profile, avatar upload
└── types/
```

### Request flow

1. Client calls `GET /api/...` through the Vite dev proxy (`:3000/api` → `:4000`).
2. Fastify resolves the route; route-level `preHandler` hooks (`requireAuth` / `optionalAuth`)
   authenticate via a JWT stored in an HTTP-only cookie (`animelist_session`).
3. The route validates input with Zod, calls a service, and replies with the shared envelope.

### Auth

- Passwords hashed with **Argon2id** (`auth/service.ts`).
- JWT signed with `JWT_SECRET`, delivered in an HTTP-only cookie, `secure` in production.
- `requireAuth` throws `unauthorized()` for protected routes; `optionalAuth` attaches the user only
  if a valid session exists (used for "is this in my library" style lookups).

### AniList sync (`services/anime.service.ts`)

- Queries AniList GraphQL for search/list/detail (characters, staff, relations, recommendations,
  airing schedule, studios, genres).
- Response schemas validated with Zod, then normalized into local tables.
- **Deduplication**: `external_id` unique indexes guarantee the same AniList title maps to one local
  record regardless of which entry point triggered the sync.
- `last_synced_at` acts as a lightweight cache; sync logs are written to `sync_logs` (failures never
  break the request).

## Frontend (apps/web)

React 18 + Vite, TanStack Query for server state, React Router for routing, Tailwind CSS v4
(CSS-first) for styling.

```
src/
├── lib/
│   ├── api.ts        # typed API client (all endpoints)
│   ├── types.ts      # domain types + status/format constants
│   ├── format.ts     # title/date/score/countdown helpers
│   └── cn.ts         # className join helper
├── context/
│   ├── AuthContext.tsx    # session state + login/register/logout
│   └── ToastContext.tsx   # lightweight feedback toasts
├── components/
│   ├── layout/       # Header, Layout (shell)
│   ├── library/      # LibraryRow + actions
│   ├── ui/           # Button, Input, Select, Field, Spinner, StatCard
│   └── *.tsx         # AnimeCard, Poster, StatusSelect, RatingInput, ReviewCard,
│                     #   Pagination, Skeleton, States (Empty/Error)
└── pages/            # one file per route (Home, Explore, AnimeDetail, Library, ...)
```

### Data fetching

Each page owns its queries keyed by route-relevant params, e.g. `['anime', id]`,
`['explore', {...params}]`, `['library', {...params}]`. Mutations invalidate the affected query
keys so lists/statistics refresh consistently.

### Design system

Styling is token-driven. `src/index.css` defines a Tailwind v4 `@theme` block with semantic tokens
(background/surface, line, ink text levels, accent, positive/warning/danger/info, radius). Shared
primitives in `src/components/ui/` are the only sanctioned button/input/select implementations.
Radius and spacing use the token scale instead of arbitrary values.

## Data model overview

See [docs/DATABASE.md](docs/DATABASE.md) for the full schema, relationships and indexes.

Key tables:

| Table | Purpose |
| ----- | ------- |
| `users` | Local accounts (Argon2id hash) |
| `anime` | Normalized AniList records (deduped by `external_id`) |
| `characters` / `staff` / `studios` / `genres` | Reference entities |
| `anime_characters` / `anime_staff` / `anime_studios` / `anime_genres` | Join tables |
| `anime_relations` | Sequel/prequel/side-story relationships |
| `airing_schedule` | Next-airing episodes |
| `user_anime_lists` | Per-user library entry (status + episode progress) |
| `ratings` | 0.5–10 step ratings |
| `reviews` | Review text + spoiler flag |
| `sync_logs` | AniList sync audit trail |

## API contract

All responses use the shared envelope:

```json
{ "data": {}, "meta": {} }
{ "error": { "code": "CODE", "message": "..." } }
```

See `README.md` for the endpoint group reference.
