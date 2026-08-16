# Database

AnimeList Local uses a single PostgreSQL 16 instance (Docker). Migrations live in
`database/migrations/` (SQL, managed by Drizzle) and are applied from scratch by `npm run db:up`
plus the migration runner. All timestamps are `timestamptz`; `created_at`/`updated_at` defaults and
a `set_updated_at()` trigger keep audit columns fresh on `anime`, `users`, `user_anime_lists`,
`ratings` and `reviews`.

## Connection

`DATABASE_URL=postgres://anime:anime@localhost:5432/animelist` (see `.env.example`).

## Entities

### Identity

| Table | Columns (key) | Notes |
| ----- | ------------- | ----- |
| `users` | `id uuid PK`, `username` (unique), `email` (unique), `password_hash`, `avatar_url` | `username` 3–32 chars |

### Catalog (synced from AniList)

| Table | Columns (key) | Notes |
| ----- | ------------- | ----- |
| `anime` | `id int PK`, `external_id` (unique), titles, `description`, `cover_image`, `banner_image`, `format`, `status`, `episodes`, `duration`, `season`/`season_year`, `average_score` (0–100), `popularity`, `trending`, `source`, `country`, `start_date`/`end_date`, `last_synced_at` | Dedup key is `external_id` |
| `characters` | `id int PK`, `external_id` (unique), `name`, `name_native`, `image` | |
| `staff` | `id int PK`, `external_id` (unique), `name`, `name_native`, `image` | |
| `studios` | `id int PK`, `name` (unique) | |
| `genres` | `id int PK`, `name`, `slug` (unique) | |

### Catalog relations

| Table | Columns | Notes |
| ----- | ------- | ----- |
| `anime_genres` | `anime_id`, `genre_id` (composite PK) | |
| `anime_studios` | `anime_id`, `studio_id`, `is_main` | |
| `anime_characters` | `anime_id`, `character_id`, `role`, `voice_actor_id`, `voice_actor_language` | voice actor FK → `staff` (SET NULL) |
| `anime_staff` | `anime_id`, `staff_id`, `role` | |
| `anime_relations` | `id`, `anime_id`, `related_anime_id`, `relation_type` | self-reference guard, unique pair |
| `airing_schedule` | `id`, `anime_id`, `episode`, `airing_at` | unique (anime, episode) |

### User activity

| Table | Columns (key) | Notes |
| ----- | ------------- | ----- |
| `user_anime_lists` | `id uuid PK`, `user_id`, `anime_id`, `status` (PLANNING/WATCHING/COMPLETED/PAUSED/DROPPED), `current_episode`, `started_at`, `completed_at` | unique (user, anime); one entry per user per title |
| `ratings` | `id uuid PK`, `user_id`, `anime_id`, `score` numeric(3,1) (1–10), timestamps | unique (user, anime) |
| `reviews` | `id uuid PK`, `user_id`, `anime_id`, `rating` (1–10), `title` (≤200), `content` (20–5000), `contains_spoiler` | unique (user, anime); one review per title per user |

### Operations

| Table | Columns | Notes |
| ----- | ------- | ----- |
| `sync_logs` | `id`, `source`, `operation`, `target`, `status`, `message`, `duration_ms`, `synced_at` | AniList sync audit trail |

## Indexes

- Unique keys: `anime.external_id`, `characters.external_id`, `staff.external_id`,
  `genres.slug`, `studios.name`, `users.username`, `users.email`, `airing_schedule(anime_id,episode)`,
  `anime_relations(anime_id,related_anime_id)`, `ratings(user_id,anime_id)`,
  `reviews(user_id,anime_id)`, `user_anime_lists(user_id,anime_id)`.
- Hot query indexes: `anime.title_romaji`, `anime.title_english`, `anime.average_score`,
  `anime.popularity`, `anime.season_year`, `ratings.anime_id`, `reviews.anime_id`,
  `user_anime_lists.user_id`, `airing_schedule.airing_at`.

## Constraints

- Check constraints enforce: score/rating in 1–10, `average_score` 0–100, non-negative
  episodes/popularity/progress, episode count > 0 on schedules, username length 3–32,
  review title ≤ 200 and content 20–5000, relations never reference themselves.
- Foreign keys cascade on delete for child/join tables; `voice_actor_id` is `ON DELETE SET NULL`.

## Library status semantics

| Status | Meaning |
| ------ | ------- |
| `PLANNING` | Want to watch |
| `WATCHING` | In progress |
| `COMPLETED` | Finished |
| `PAUSED` | On hold |
| `DROPPED` | Stopped |

Progress bar percentage = `current_episode / total_episodes` (null when no total).
