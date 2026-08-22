# 🎬 Ranime (AnimeRate)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-000000?logo=fastify&logoColor=white)](https://fastify.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

A modern, high-performance, **local-first anime discovery, tracking, tier listing, and rating platform** powered by the AniList GraphQL API, Fastify, and PostgreSQL.

---

## 🌟 Visual Showcase & Key Features

### 1. 🏠 Immersive Home & Real-time Trends
Dynamic hero carousel with AniList trending & popular synching, continue watching tray, and public community reviews.

![Ranime Homepage](docs/screenshots/01-home.png)

---

### 2. 📅 Interactive Airing Calendar & Countdown
Weekly broadcast calendar with real-time countdown badges, day-of-week filtering (`Sunday`–`Saturday`), and air times.

![Airing Schedule](docs/screenshots/02-airing-schedule.png)

---

### 3. 🏆 Interactive Tier List Maker (`/tier-list`)
Create custom visual Tier Lists (`S`, `A`, `B`, `C`, `D`, `F`) with quick search, slotting, tier renaming, color palettes, and PNG image export.

![Tier List Maker](docs/screenshots/03-tier-list.png)

---

### 4. 🎲 Discovery Recommendation Roulette (`/roulette`)
Unsure what to watch? Spin the smart discovery roulette with genre, format, and score filters for instant serendipitous picks.

![Discovery Roulette](docs/screenshots/04-roulette.png)

---

### 5. ⚖️ Anime Comparison Matrix (`/compare`)
Compare two anime side-by-side: community score, status, episode length, studio, source material, and genre overlap.

![Anime Comparison Tool](docs/screenshots/05-compare.png)

---

### 6. 🔍 Advanced Catalog Explorer (`/explore`)
Rich faceted filtering (Genres, Season, Year, Format, Studio, Airing Status, Sort) with instant query caching.

![Catalog Explorer](docs/screenshots/06-explore.png)

---

### 7. 📖 Rich Anime Detail, Staff, & Franchise Timeline (`/anime/:id`)
Comprehensive details with character roles (Main/Supporting/VA), staff, relations timeline, recommendations, and spoiler-safe reviews.

![Anime Detail & Timeline](docs/screenshots/07-anime-detail.png)

---

### 8. 📱 Mobile-First Responsive Design
Engineered with safe-area insets, mobile bottom navigation, command palette (`Ctrl+K` / `Cmd+K`), quick `+1 Ep` tracking, and native share sheets.

<div align="center">
  <img src="docs/screenshots/10-mobile-responsive.png" width="380" alt="Mobile Experience" />
</div>

---

## ⚡ Feature Matrix

- 🔍 **Universal Command Palette**: Quick jump to any page or anime anywhere (`Ctrl+K` / `Cmd+K`).
- 📊 **Anime Passport & Stats Wrapped**: Visual infographic breakdown of genres, ratings, watch time, and shareable passport.
- 📦 **Multi-Select Bulk Library Manager**: Batch update status, batch score, or delete multiple entries in one click.
- 🔄 **MAL / AniList / Ranime JSON Importer & Exporter**: Zero lock-in backup and restore tooling in Settings.
- 🎭 **Spoiler Protection System**: Community reviews with toggleable spoiler filters and masked avatars/text.
- ⚡ **Local-First Architecture**: Database caching ensures ultra-fast responses without continuous third-party rate-limit hits.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, React Router, TanStack Query v5, Tailwind CSS v4, Lucide Icons |
| **Backend** | Fastify 5, TypeScript, Zod, Argon2id, Jose (JWT) |
| **Database** | PostgreSQL 16 (Docker Compose) |
| **API Integration** | AniList GraphQL API (Search + On-Demand Full Ingestion) |
| **Testing** | Vitest (API integration test suites + Web unit tests) |

---

## 🚀 Getting Started

### Prerequisites
- Node.js `>= 20.x` (or `>= 22.x`)
- Docker & Docker Compose

### 1. Clone & Install
```bash
git clone https://github.com/h1ntz0/Ranime.git
cd Ranime
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and ensure DATABASE_URL and JWT_SECRET are set
```

### 3. Start Database & Run Migrations
```bash
# Start PostgreSQL container
npm run db:up

# Run database migrations & seed demo account
npm run db:migrate
npm run db:seed
```

*Demo Login: `demo@example.local` / `password123`*

### 4. Run Development Servers
```bash
npm run dev
```

- Web Application: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`

---

## 📜 Available Scripts

| Command | Action |
|---|---|
| `npm run dev` | Starts Fastify API and Vite Web concurrently |
| `npm run build` | Builds backend (`tsup`) and frontend (`vite`) for production |
| `npm run typecheck` | Validates TypeScript across all workspaces |
| `npm run lint` | Runs ESLint |
| `npm run test` | Runs complete Vitest test suite |
| `npm run db:up` | Starts Docker PostgreSQL instance |
| `npm run db:migrate` | Applies schema migrations |
| `npm run db:seed` | Populates demo data and seed account |

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
