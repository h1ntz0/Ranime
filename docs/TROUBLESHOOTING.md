# Troubleshooting

## Prerequisites & startup

### `npm run dev` fails — "DATABASE_URL and JWT_SECRET are required"

Copy the env template and generate a secret:

```bash
cp .env.example .env
openssl rand -hex 32   # paste into JWT_SECRET=
```

Startup intentionally fails fast when `DATABASE_URL` or `JWT_SECRET` are missing/invalid.

### PostgreSQL container won't start

```bash
npm run db:up
docker logs animelist-postgres   # inspect the error
```

Common causes:

- **Port 5432 already in use** — stop the other Postgres instance or change the mapped port in
  `docker-compose.yml` (and update `DATABASE_URL`).
- **Stale volume with wrong credentials** — `docker compose down -v && npm run db:up` (this wipes
  local data, so back up first if needed).

## AniList sync is slow on first load

The first sync of an anime detail page fetches characters, staff, relations, recommendations and
the airing schedule from AniList. Each request has a client timeout with retries, so the first hit
can take up to ~30–60s. Subsequent visits are served from PostgreSQL (`last_synced_at` cache) and
are near-instant.

If sync consistently fails:

1. Check network access to `https://graphql.anilist.co`.
2. Look for rate limiting — AniList throttles aggressive clients. Retries back off automatically.
3. Inspect `sync_logs` for failures:
   ```sql
   SELECT operation, status, message, duration_ms, synced_at
   FROM sync_logs ORDER BY synced_at DESC LIMIT 20;
   ```

## A title shows wrong data after sync

Each title is deduped by AniList `external_id`, and a full sync overwrites the local row. If data
looks stale or wrong, re-sync by visiting the detail page (cache is refreshed on demand).

## Characters / staff / relations empty on a detail page

Some AniList records legitimately have no characters or staff. If every page is empty, verify the
sync completed (see above) and that the detail query succeeded in the API logs
(`npm run dev` terminal or `apps/api` logs).

## Login issues

- **Login succeeds but redirect loops** — clear cookies for `localhost:3000`. The session cookie is
  HTTP-only and `sameSite=lax`; a mismatched `FRONTEND_URL`/`PORT` in `.env` can break the
  redirect back from `?next=`.
- **Forgot password** — there is no self-service reset. The `password_hash` uses Argon2id, so reset
  via the database is not possible; register a new account or add a reset flow.

## Avatar upload fails

The avatar must be a JPEG/PNG/WebP under 2 MB. Otherwise the API returns an error toast; no server
state changes.

## Frontend shows old styles after a redesign

The Vite dev server compiles Tailwind on the fly. If you see stale styles:

```bash
rm -rf apps/web/node_modules/.vite && npm run dev
```

## Tests

API tests run against a dedicated database (`animelist_test_m3`) and require the Docker Postgres to
be up. If tests fail to connect:

```bash
npm run db:up
```

## Still stuck?

Open an issue with:

- `docker ps` output
- API logs from the failing request
- The last 10 rows of `sync_logs`
- Any error message shown in the UI (they include the underlying cause)
