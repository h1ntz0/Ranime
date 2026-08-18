# AnimeRate (Ranime)

Anime discovery/tracking/rating platform. Monorepo: `apps/web` (React 19 + Vite + Tailwind v4 + TanStack Query + React Router), `apps/api` (Fastify), `packages/shared`. AniList-sourced catalog, PostgreSQL via Docker (`npm run db:up`, then `db:migrate`, `db:seed`).

## Commands
- `npm run dev` — web :3000, api :4000 (web proxies `/api`, `/uploads`)
- `npm run typecheck` / `npm run lint` / `npm run test`
- `npm run db:generate` (must run from `apps/api/` cwd; config `out` is relative `../../database/migrations`)
- Demo login: `flowuser@example.local` / `password123`

## Features (user-facing)
- Catalog: explore/search/filter, top (rated/popular/trending), season, genres, **studios** (`/studios`, `/studios/:slug`), airing schedule, detail (chars/staff/relations/recs).
- Personal: library + watchlist (status tabs w/ counts), ratings, reviews, **My Ratings `/my-ratings`**, **My Reviews `/my-reviews`**, statistics, settings, avatar upload.
- Social: **profile pages with Recent Activity feed** (`user_activity` table, events logged on library add/status change/complete/rate/review), **Home sections** for logged-in users (Continue Watching) and public **Latest Reviews**.
- Auth: JWT httpOnly cookie, Argon2id; **rate-limited** login/register (10–20/min) + global 300/min.

## Styling
- Tailwind v4, no config file; theme tokens live in `apps/web/src/index.css` `@theme`. Dark-only palette (`--color-background`, `--color-ink*`, `--color-surface*`).
- Mobile-first breakpoints: `sm`=640, `md`=768, `lg`=1024 (desktop header/nav swap at `lg`; bottom nav `lg:hidden`). Safe-area handled: header `pt-[env(safe-area-inset-top)]`, bottom nav `pb-[env(safe-area-inset-bottom)]`, toasts `inset-x-4 bottom-20` on mobile.
- Auto-audit mobile fit: headless chromium via `~/.config/opencode/node_modules/playwright-core/index.mjs` scripts in `/tmp/opencode` (no Playwright MCP — needs chrome channel).

## Gotchas
- Device testing: disable cache or first run hits AniList sync — cold pages slow.
- Playwright MCP in `~/.config/opencode/opencode.jsonc` uses chromium (`--browser chromium --headless`); default chrome channel is not installed.
- `user_activity` is pruned to 200 rows/user on insert; `onActivity` callbacks are wired in `app.ts` (`onActivity` → `activityService.log(userId, type, animeId, { payload, reviewId })`).
- Activity-service writes never fail the primary request (wrapped in try/catch).
- Anime detail/ratings grids: add `min-w-0` to grid/flex children or long titles force 600px+ min-width on mobile (hscroll). Synopsis uses `break-words`.
- Tests each create a dedicated DB (`animelist_test_*`) via `runMigrations`; `database.test.ts` asserts the full table list (add new tables there).