# Ranime

Self-hosted anime tracker, discovery tool, and personal library built with React 19, Fastify, and PostgreSQL. It pulls metadata from AniList via GraphQL, caches everything locally to avoid rate limits, and gives you a snappy UI without ads or bloat.

---

## Why build this?

I wanted a fast, local-first anime tracker that does more than just listing titles. Most services are either bloated with social feeds or rate-limited to death. Ranime runs locally (or self-hosted on your VPS), syncs on-demand from AniList, and includes extra tools like side-by-side comparison, airing calendars, and tier lists.

---

## Features & Screenshots

### 1. Home & Trending
Quick overview of current seasonal trends, your continue-watching queue, and recent community reviews.

![Homepage](docs/screenshots/01-home.png)

---

### 2. Airing Calendar (`/airing`)
Weekly schedule grouped by broadcast day with live countdown timers so you know exactly when the next episode drops.

![Airing Schedule](docs/screenshots/02-airing-schedule.png)

---

### 3. Tier List Maker (`/tier-list`)
Drag-and-drop / click-to-slot anime into S/A/B/C/D/F tiers, customize row colors, and export the final board directly as a PNG.

![Tier List Maker](docs/screenshots/03-tier-list.png)

---

### 4. Recommendation Roulette (`/roulette`)
For when you're stuck in decision paralysis. Filter by genre, format (TV/Movie), or minimum score and spin for a random pick.

![Roulette](docs/screenshots/04-roulette.png)

---

### 5. Side-by-Side Comparison (`/compare`)
Puts two shows side-by-side comparing studio, episodes, source material, score distribution, and shared genres.

![Anime Compare](docs/screenshots/05-compare.png)

---

### 6. Catalog Explorer (`/explore`)
Filter the full catalog by season, year, studio, genre, and format. Uses local DB caching so filters feel instantaneous.

![Explorer](docs/screenshots/06-explore.png)

---

### 7. Franchise Timeline & Anime Detail (`/anime/:id`)
Detailed breakdown of characters (filtered by main/supporting cast & voice actors), staff, reviews, and a vertical chronological relation timeline for big franchises.

![Anime Detail](docs/screenshots/07-anime-detail.png)

---

### 8. Stats & Anime Passport (`/stats`)
Visual summary of your watch habits (total hours, genre distribution, mean score) plus a downloadable anime passport card to share.

![Stats Passport](docs/screenshots/09-stats.png)

---

### 9. Mobile-Friendly UI
Full responsive layout with bottom navigation, safe-area support, and a universal Command Palette (`Ctrl+K` / `Cmd+K`).

<p align="center">
  <img src="docs/screenshots/10-mobile-responsive.png" width="360" alt="Mobile UI" />
</p>

---

## Other Features

- **Batch Library Editing**: Multi-select anime to change status, update score, or delete in bulk.
- **+1 Episode Quick Tracker**: Bump watched episodes directly from cards without opening the full modal.
- **Import / Export**: Full JSON and CSV exports from `/settings`, plus import support for MAL/AniList JSON backups.
- **Spoiler Protection**: User reviews with collapsible spoiler sections and avatar blurring.
- **Local-First Caching**: Search queries and metadata hit PostgreSQL first to keep API calls minimal.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TanStack Query v5, Tailwind CSS v4, Lucide Icons
- **Backend**: Fastify 5, TypeScript, Zod, Argon2id, Jose (JWT auth)
- **Database**: PostgreSQL 16
- **Data Source**: AniList GraphQL API (synced on demand)
- **Testing**: Vitest

---

## Quickstart

### Requirements
- Node.js 20+
- Docker (for PostgreSQL)

### 1. Clone repo & install deps
```bash
git clone https://github.com/h1ntz0/Ranime.git
cd Ranime
npm install
```

### 2. Setup environment
```bash
cp .env.example .env
```
Default `.env` is already configured for the local Docker database.

### 3. Start database & seed
```bash
npm run db:up
npm run db:migrate
npm run db:seed
```
*Default demo account:* `demo@example.local` / `password123`

### 4. Run dev servers
```bash
npm run dev
```
- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both Vite (web) and Fastify (api) |
| `npm run build` | Compile backend and frontend for production |
| `npm run typecheck` | Run TypeScript check across workspaces |
| `npm run test` | Run Vitest unit & integration tests |
| `npm run db:up` | Spin up PostgreSQL container |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed initial demo user and data |

---

## License
MIT. See [LICENSE](LICENSE) for details.
