# PRD — AnimeList Local

**Product:** AnimeList Local
**Version:** 1.0.0
**Status:** Ready for Development
**Environment:** Local Development / WSL Ubuntu
**Deployment:** Localhost only
**External VPS:** None
**Primary Data Source:** AniList GraphQL API
**Primary Database:** PostgreSQL
**Application Type:** Full-stack Web Application

---

# 1. Product Overview

AnimeList Local adalah website katalog dan tracking anime yang memungkinkan pengguna:

* menjelajahi anime
* mencari anime
* melihat detail anime
* melihat ranking anime
* melakukan filtering dan sorting
* memberikan rating pribadi
* memberikan review
* memasukkan anime ke watchlist
* menandai status menonton
* tracking episode yang sudah ditonton
* melihat statistik personal
* melihat jadwal anime yang sedang tayang
* melihat anime berdasarkan genre
* melihat anime berdasarkan season
* melihat rekomendasi anime
* melihat riwayat aktivitas pengguna

Website harus terasa seperti aplikasi produk yang benar-benar dibuat oleh developer, bukan template AI generik.

---

# 2. Core Product Philosophy

Project ini TIDAK boleh menghasilkan UI yang terlihat seperti:

* generic AI dashboard
* template SaaS
* terlalu banyak gradient
* terlalu banyak glassmorphism
* random rounded cards
* excessive animation
* lorem ipsum
* fake statistics
* fake anime data
* fake rating
* fake reviews
* fake users
* menu yang hanya terlihat aktif tetapi tidak berfungsi

Setiap menu yang ditampilkan harus memiliki fungsi nyata.

Prioritas:

1. Functionality
2. Data accuracy
3. UX
4. Performance
5. Visual polish

---

# 3. Goals

## Primary Goals

Membangun website AnimeList yang dapat digunakan untuk:

1. Discover anime
2. Search anime
3. Filter anime
4. Sort anime
5. View anime details
6. Track watching progress
7. Rate anime
8. Review anime
9. Maintain personal watchlist
10. View personal statistics
11. View airing schedule

## Secondary Goals

Project harus menjadi portfolio project yang menunjukkan kemampuan:

* Full-stack development
* REST/GraphQL integration
* Database design
* Authentication
* API caching
* State management
* Responsive UI
* Automated testing
* Error handling
* Clean Architecture
* Security
* Local development
* CI/CD-ready project structure

---

# 4. Non-Goals

Version 1 TIDAK membuat:

* anime streaming
* download anime
* torrent
* piracy functionality
* subtitle hosting
* video hosting
* VPS deployment
* payment system
* AI recommendation engine
* social media clone
* real-time chat

Website hanya berfungsi sebagai:

**Anime discovery + catalog + tracking + rating + review platform.**

---

# 5. Target Users

## User Type 1 — Guest

Guest dapat:

* melihat homepage
* melihat anime populer
* melihat top anime
* mencari anime
* filter anime
* melihat detail anime
* melihat ranking
* melihat schedule

Guest tidak dapat:

* rating
* review
* watchlist
* tracking episode
* personal statistics

---

## User Type 2 — Registered User

Registered user dapat:

* login
* logout
* rate anime
* review anime
* add to watchlist
* update watching status
* update episode progress
* mark anime as completed
* view personal library
* view statistics
* edit profile

---

# 6. Product Structure

Main navigation:

```text
Home
Explore
Season
Top Anime
Genres
Airing
Watchlist
My Library
Statistics
```

User menu:

```text
Profile
My Ratings
My Reviews
Settings
Logout
```

---

# 7. Homepage

## Purpose

Memberikan overview anime yang sedang populer dan sedang tayang.

## Sections

### Hero

Menampilkan featured anime dari data aktual API.

Content:

* poster/backdrop
* title
* alternative title
* synopsis
* genres
* score
* episodes
* status
* year
* CTA View Details
* CTA Add to Watchlist

Hero tidak boleh menggunakan anime hardcoded.

---

## Trending Anime

Horizontal carousel.

Data:

```text
AniList trending
```

Card:

```text
Poster
Title
Score
Format
Year
```

---

## Popular Anime

Menampilkan anime berdasarkan popularity.

---

## Current Season

Menampilkan anime pada season aktif.

---

## Airing Now

Menampilkan anime yang sedang berjalan.

Information:

```text
Title
Episode
Next Airing
Score
```

---

## Top Rated

Menampilkan anime dengan rating tertinggi.

---

# 8. Explore Page

Route:

```text
/explore
```

Fungsi utama:

* search
* filter
* sort
* pagination

---

## Search

User dapat mencari:

```text
Naruto
One Piece
Bleach
Frieren
```

Search harus menggunakan API/database query.

Tidak boleh fake search.

---

# 9. Anime Filters

Filter berdasarkan:

```text
Genre
Year
Season
Format
Status
Score
Country
Source
```

Format:

```text
TV
Movie
OVA
ONA
Special
Music
```

Status:

```text
Finished Airing
Currently Airing
Not Yet Released
```

---

# 10. Sorting

Support:

```text
Popularity
Score
Trending
Newest
Oldest
Title A-Z
Title Z-A
Episodes
```

Sorting harus benar-benar mengubah result.

---

# 11. Pagination

Jangan load seluruh database sekaligus.

Support:

```text
page
limit
```

Default:

```text
20 items/page
```

Maximum:

```text
50 items/page
```

---

# 12. Anime Card

Setiap anime card harus menampilkan:

```text
Poster
Title
Score
Year
Format
Status
```

Optional:

```text
Episodes
Genres
```

Action:

```text
View Details
Add to Watchlist
```

Jika user login:

```text
Set Status
Rate
```

---

# 13. Anime Detail Page

Route:

```text
/anime/:id
```

Page harus menjadi halaman paling lengkap.

---

## Header

Menampilkan:

```text
Cover
Poster
Title
Alternative Titles
Score
Rank
Popularity
Status
Format
Episodes
Duration
Release Date
Season
Genres
```

Action:

```text
Add to Watchlist
Set Status
Rate
Write Review
```

---

# 14. Anime Synopsis

Menampilkan synopsis dari API.

Jika data kosong:

```text
Synopsis unavailable.
```

Jangan generate synopsis menggunakan AI.

---

# 15. Anime Information

Display:

```text
Format
Episodes
Duration
Status
Start Date
End Date
Season
Studios
Source
Genres
Country
```

---

# 16. Characters

Menampilkan:

```text
Character
Role
Voice Actor
Language
```

Data berasal dari API.

Pagination diperlukan jika jumlah character besar.

---

# 17. Staff

Menampilkan:

```text
Director
Writer
Producer
Composer
Animation Staff
```

---

# 18. Studios

Menampilkan studio yang terlibat.

---

# 19. Relations

Menampilkan hubungan anime:

```text
Prequel
Sequel
Side Story
Alternative
Spin-off
Adaptation
Other
```

User dapat click relation untuk membuka anime terkait.

---

# 20. Recommendations

Menampilkan anime yang direkomendasikan berdasarkan data API.

Tidak boleh menggunakan random anime.

---

# 21. User Rating

User dapat memberikan rating:

```text
1.0 - 10.0
```

Increment:

```text
0.5
```

Contoh:

```text
8.5
```

---

# 22. Rating Rules

User hanya boleh memiliki satu rating aktif untuk satu anime.

Jika user memberikan rating ulang:

```text
UPDATE existing rating
```

Bukan membuat row baru.

Database constraint:

```text
UNIQUE(user_id, anime_id)
```

---

# 23. Rating UI

Rating component harus mendukung:

```text
1
1.5
2
2.5
...
10
```

Tampilkan:

```text
Your Rating
Community Rating
```

Community rating dihitung dari rating lokal user.

---

# 24. Rating Aggregation

System harus menghitung:

```text
average_rating
rating_count
```

Jangan menyimpan aggregate secara hardcoded.

Contoh:

```text
Average: 8.43
Votes: 124
```

Nilai tersebut berasal dari database.

---

# 25. Review System

Registered user dapat membuat review.

Fields:

```text
rating
title
content
spoiler
created_at
updated_at
```

---

# 26. Review Rules

User hanya memiliki satu review aktif untuk satu anime.

User dapat:

```text
Create
Edit
Delete
```

Review harus memiliki:

```text
minimum 20 characters
maximum 5000 characters
```

---

# 27. Spoiler Protection

Review dapat ditandai:

```text
Contains Spoiler
```

Default:

```text
Hidden
```

User harus click:

```text
Show Spoiler
```

untuk membaca review.

---

# 28. Watchlist

Route:

```text
/watchlist
```

User dapat menyimpan anime.

Status:

```text
Planning
Watching
Completed
Paused
Dropped
```

---

# 29. Watch Progress

User dapat mencatat:

```text
current_episode
```

Contoh:

```text
Episode 7 / 12
```

Progress:

```text
7 / 12 = 58.3%
```

Progress bar harus dihitung secara dinamis.

---

# 30. Automatic Completion

Jika:

```text
current_episode == total_episodes
```

system dapat menawarkan:

```text
Mark as Completed
```

Jangan otomatis mengubah status tanpa user confirmation kecuali behavior tersebut secara eksplisit dikonfigurasi.

---

# 31. My Library

Route:

```text
/library
```

Tabs:

```text
All
Watching
Completed
Planning
Paused
Dropped
```

Filter:

```text
Title
Genre
Score
Recently Updated
```

Sorting:

```text
Recently Added
Recently Updated
Rating
Title
Progress
```

---

# 32. Statistics

Route:

```text
/statistics
```

Statistics harus berasal dari data user sebenarnya.

Display:

```text
Total Anime
Watching
Completed
Planning
Paused
Dropped
Episodes Watched
Average Rating
Reviews Written
```

---

# 33. Statistics Visualization

Gunakan chart jika diperlukan.

Charts:

```text
Anime Status Distribution
Genres Watched
Ratings Distribution
Episodes Watched
```

Jangan membuat chart jika data belum cukup.

Empty state harus ditampilkan.

---

# 34. Seasonal Page

Route:

```text
/season
```

User dapat memilih:

```text
Year
Season
```

Season:

```text
Winter
Spring
Summer
Fall
```

Display:

```text
Anime
Score
Episodes
Status
Airing Schedule
```

---

# 35. Top Anime

Route:

```text
/top
```

Categories:

```text
Top Rated
Most Popular
Most Trending
Most Watched
```

Jika data tertentu tidak tersedia dari source, jangan membuat metric palsu.

---

# 36. Genre Page

Route:

```text
/genres
```

List:

```text
Action
Adventure
Comedy
Drama
Fantasy
Horror
Mystery
Romance
Sci-Fi
Sports
Thriller
etc.
```

Click genre:

```text
/genres/:slug
```

Menampilkan anime berdasarkan genre.

---

# 37. Airing Page

Route:

```text
/airing
```

Display:

```text
Anime
Episode
Airing Date
Next Episode
Countdown
```

Countdown hanya boleh digunakan untuk data `nextAiringEpisode` yang valid.

---

# 38. Authentication

Implement:

```text
Register
Login
Logout
Session
Password Hashing
```

Password tidak boleh disimpan plaintext.

Gunakan:

```text
Argon2id
```

atau bcrypt jika Argon2 tidak tersedia.

---

# 39. Authentication Validation

Register:

```text
Username required
Email required
Password required
Password confirmation
Unique email
Unique username
```

Password minimum:

```text
8 characters
```

---

# 40. User Profile

Profile:

```text
Username
Avatar
Joined Date
Anime Count
Completed Count
Average Rating
```

Avatar dapat menggunakan:

```text
local uploaded image
```

Tidak perlu cloud storage.

---

# 41. Local-First Architecture

Architecture:

```text
Browser
   |
   v
Frontend
   |
   v
Backend API
   |
   +---- PostgreSQL
   |
   +---- AniList API
```

Browser TIDAK boleh langsung bergantung pada AniList untuk setiap request.

---

# 42. Data Synchronization

External API:

```text
AniList
```

Local database:

```text
PostgreSQL
```

Flow:

```text
User Request
     |
     v
Backend
     |
     v
Check Local DB
     |
     +---- Data Fresh
     |       |
     |       v
     |    Return DB
     |
     +---- Data Missing/Stale
             |
             v
        AniList API
             |
             v
        Normalize Data
             |
             v
        Save PostgreSQL
             |
             v
        Return Data
```

---

# 43. Why Local Database Is Required

Database lokal digunakan untuk:

* mengurangi API request
* meningkatkan performance
* memungkinkan local search
* menyimpan user rating
* menyimpan review
* menyimpan watchlist
* menyimpan progress
* menyimpan history
* mengurangi ketergantungan terhadap external API

---

# 44. API Strategy

Primary external source:

AniList GraphQL API.

Endpoint:

```text
https://graphql.anilist.co
```

AniList menggunakan GraphQL POST request dan memungkinkan client meminta field yang benar-benar dibutuhkan.

---

# 45. API Data Ownership

External API owns:

```text
Anime Metadata
Characters
Staff
Studios
Relations
Recommendations
Airing Information
```

Local application owns:

```text
Users
Ratings
Reviews
Watchlist
Watch Progress
User Statistics
User Preferences
```

Jangan overwrite user-owned data ketika melakukan synchronization.

---

# 46. Database Schema

Minimum entities:

```text
users
anime
anime_genres
genres
anime_studios
studios
anime_characters
characters
anime_staff
staff
anime_relations
user_anime_lists
ratings
reviews
```

Optional:

```text
airing_schedule
sync_logs
user_activity
```

---

# 47. users

Fields:

```text
id
username
email
password_hash
avatar_url
created_at
updated_at
```

Constraints:

```text
PK id
UNIQUE username
UNIQUE email
```

---

# 48. anime

Fields:

```text
id
external_id
title_romaji
title_english
title_native
description
cover_image
banner_image
format
status
episodes
duration
season
season_year
average_score
popularity
source
country
start_date
end_date
last_synced_at
created_at
updated_at
```

Constraint:

```text
UNIQUE external_id
```

---

# 49. genres

Fields:

```text
id
name
slug
```

Constraint:

```text
UNIQUE slug
```

---

# 50. anime_genres

Fields:

```text
anime_id
genre_id
```

Primary key:

```text
(anime_id, genre_id)
```

---

# 51. ratings

Fields:

```text
id
user_id
anime_id
score
created_at
updated_at
```

Constraint:

```text
UNIQUE(user_id, anime_id)
```

---

# 52. reviews

Fields:

```text
id
user_id
anime_id
rating
title
content
contains_spoiler
created_at
updated_at
```

Constraint:

```text
UNIQUE(user_id, anime_id)
```

---

# 53. user_anime_lists

Fields:

```text
id
user_id
anime_id
status
current_episode
started_at
completed_at
created_at
updated_at
```

Constraint:

```text
UNIQUE(user_id, anime_id)
```

---

# 54. Backend API

Internal API structure:

```text
/api/auth
/api/anime
/api/search
/api/genres
/api/season
/api/top
/api/airing
/api/watchlist
/api/library
/api/ratings
/api/reviews
/api/statistics
/api/users
```

---

# 55. Anime API

Endpoints:

```text
GET /api/anime
GET /api/anime/:id
GET /api/anime/:id/characters
GET /api/anime/:id/staff
GET /api/anime/:id/relations
GET /api/anime/:id/recommendations
```

---

# 56. Search API

```text
GET /api/anime/search?q=naruto
```

Support:

```text
q
page
limit
genre
year
season
format
status
sort
```

---

# 57. Rating API

```text
POST /api/anime/:id/rating
PUT /api/anime/:id/rating
DELETE /api/anime/:id/rating
GET /api/anime/:id/ratings
```

---

# 58. Review API

```text
POST /api/anime/:id/reviews
PUT /api/reviews/:id
DELETE /api/reviews/:id
GET /api/anime/:id/reviews
```

---

# 59. Watchlist API

```text
POST /api/anime/:id/watchlist
PUT /api/anime/:id/watchlist
DELETE /api/anime/:id/watchlist
GET /api/watchlist
```

---

# 60. Statistics API

```text
GET /api/statistics
```

Response should contain calculated values:

```json
{
  "totalAnime": 0,
  "watching": 0,
  "completed": 0,
  "planning": 0,
  "paused": 0,
  "dropped": 0,
  "episodesWatched": 0,
  "averageRating": 0,
  "reviews": 0
}
```

Values are examples of response structure only.

---

# 61. Recommended Technology Stack

Frontend:

```text
React
TypeScript
Vite
React Router
TanStack Query
Tailwind CSS
```

Backend:

```text
Node.js
TypeScript
Fastify
Zod
```

Database:

```text
PostgreSQL
```

ORM:

```text
Drizzle ORM
```

Authentication:

```text
JWT
HTTP-only Cookie
Argon2id
```

Testing:

```text
Vitest
Playwright
```

Infrastructure:

```text
Docker Compose
```

---

# 62. Local WSL Architecture

Environment:

```text
Windows
   |
   +---- WSL2
           |
           +---- Ubuntu
                  |
                  +---- Node.js
                  +---- PostgreSQL
                  +---- Docker
                  +---- Git
                  +---- Project
```

No VPS.

No cloud database.

No cloud backend.

No production deployment requirement.

---

# 63. Docker Compose

Docker Compose should manage:

```text
PostgreSQL
```

Application can initially run directly from Ubuntu:

```bash
npm run dev
```

Database:

```bash
docker compose up -d
```

This keeps development simple.

---

# 64. Local Environment

Expected commands:

```bash
git clone <repository>
cd animelist-local

cp .env.example .env

docker compose up -d

npm install

npm run db:migrate

npm run dev
```

Expected application:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:4000
```

---

# 65. Environment Variables

Example:

```env
DATABASE_URL=
ANILIST_API_URL=https://graphql.anilist.co
JWT_SECRET=
PORT=4000
FRONTEND_URL=http://localhost:3000
```

Secrets MUST NOT be committed.

---

# 66. Project Structure

Recommended:

```text
animelist-local/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── shared/
│   ├── types/
│   └── validation/
│
├── database/
│   ├── migrations/
│   └── seed/
│
├── tests/
│   ├── e2e/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── PRD.md
```

---

# 67. Frontend Structure

```text
apps/web/

src/
├── app/
├── components/
│   ├── anime/
│   ├── rating/
│   ├── review/
│   ├── library/
│   └── layout/
│
├── features/
│   ├── auth/
│   ├── anime/
│   ├── watchlist/
│   ├── rating/
│   ├── review/
│   └── statistics/
│
├── pages/
├── hooks/
├── lib/
├── services/
├── stores/
└── types/
```

---

# 68. Backend Structure

```text
apps/api/

src/
├── modules/
│   ├── auth/
│   ├── anime/
│   ├── ratings/
│   ├── reviews/
│   ├── watchlist/
│   ├── library/
│   └── statistics/
│
├── integrations/
│   └── anilist/
│
├── database/
├── middleware/
├── plugins/
├── config/
├── utils/
└── server.ts
```

---

# 69. External API Adapter

Do NOT call AniList directly from every service.

Use:

```text
AniListClient
```

Responsibilities:

```text
GraphQL request
error handling
timeout
retry
query construction
response validation
```

Then:

```text
AnimeService
       |
       v
AniListClient
```

This makes the external provider replaceable later.

---

# 70. Caching

Implement multiple levels.

### Level 1

TanStack Query client cache.

### Level 2

Backend cache.

### Level 3

PostgreSQL persistence.

Recommended initial cache TTL:

```text
Trending: 15 minutes
Top Anime: 30 minutes
Seasonal: 1 hour
Anime Detail: 24 hours
Characters: 24 hours
Staff: 24 hours
```

These values should be configurable.

---

# 71. Rate Limit Protection

The application must avoid uncontrolled external API calls.

Rules:

```text
Search debounce: 300–500ms
Request deduplication
Backend caching
Pagination
Timeout
Retry with backoff
```

Jikan's public instance explicitly documents rate limits and caching, illustrating why the application should not hammer an external anime API.

---

# 72. Error Handling

External API failure:

```text
Do not crash the website.
```

If local data exists:

```text
Return cached/local data.
```

If no local data:

```text
Display friendly error state.
```

Example:

```text
Anime data is temporarily unavailable.
Please try again later.
```

Do not expose:

```text
stack traces
database errors
API keys
internal paths
```

---

# 73. Loading States

Every asynchronous page needs:

```text
Skeleton
Loading indicator
Empty state
Error state
```

Avoid blank white screens.

---

# 74. Empty States

Example:

Watchlist empty:

```text
Your watchlist is empty.

Start exploring anime and add something you want to watch.
```

Library empty:

```text
Your library is empty.
```

Statistics empty:

```text
Start tracking anime to see your statistics.
```

---

# 75. Responsive Design

Support:

```text
Desktop
Tablet
Mobile
```

Breakpoints should be designed intentionally.

Do not simply shrink desktop UI.

---

# 76. UI Direction

Visual direction:

```text
Dark-first
Editorial
Anime catalog
Content-focused
Minimal
Dense but readable
```

Avoid:

```text
Overly colorful dashboard
Excessive gradients
Huge text
Excessive glass effect
Excessive rounded containers
```

---

# 77. Design System

Define:

```text
Color tokens
Typography
Spacing
Radius
Shadow
Button
Input
Card
Badge
Modal
Dropdown
Tabs
Pagination
Skeleton
Toast
```

Do not create slightly different versions of the same component repeatedly.

---

# 78. Accessibility

Required:

```text
Keyboard navigation
Focus states
Semantic HTML
ARIA where necessary
Readable contrast
Alt text
Form labels
Error messaging
```

---

# 79. Security

Implement:

```text
Password hashing
HTTP-only authentication cookie
CSRF protection where applicable
Input validation
Output escaping
SQL injection prevention
Rate limiting
Authentication middleware
Authorization checks
```

Users must only be able to modify:

```text
their own ratings
their own reviews
their own library
their own profile
```

---

# 80. Authorization

Example:

User A cannot:

```text
DELETE User B's review
UPDATE User B's rating
UPDATE User B's watchlist
```

Backend must enforce authorization.

Frontend checks are NOT sufficient.

---

# 81. Validation

Use schema validation.

Example rating:

```text
number
minimum 1
maximum 10
step 0.5
```

Review:

```text
title <= 200
content 20–5000
```

Episode:

```text
integer
minimum 0
```

---

# 82. Database Integrity

Use:

```text
Foreign Keys
Unique Constraints
Check Constraints
Indexes
Transactions
```

Important indexes:

```text
anime.external_id
anime.title
anime.average_score
anime.popularity
anime.season_year
ratings.anime_id
ratings.user_id
reviews.anime_id
user_anime_lists.user_id
user_anime_lists.anime_id
```

---

# 83. API Contract

All internal API responses should follow a consistent structure.

Success:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

Do not return inconsistent response structures between modules.

---

# 84. Logging

Backend logging should include:

```text
timestamp
request_id
method
route
status
duration
error
```

Never log:

```text
password
JWT
session token
sensitive credentials
```

---

# 85. Testing Strategy

Testing pyramid:

```text
Unit
Integration
E2E
```

---

# 86. Unit Tests

Test:

```text
Rating calculation
Pagination
Filtering
Sorting
Progress calculation
Statistics calculation
Validation
Authorization logic
```

---

# 87. Integration Tests

Test:

```text
Database
Authentication
Anime service
Rating service
Review service
Watchlist service
AniList adapter
```

---

# 88. E2E Tests

Use Playwright.

Critical flows:

### Guest

```text
Open homepage
Search anime
Open anime detail
Filter anime
Sort anime
```

### User

```text
Register
Login
Search anime
Add watchlist
Set watching
Update episode
Rate anime
Write review
Edit review
Delete review
Open statistics
Logout
```

---

# 89. E2E Acceptance Criteria

Example:

```text
Given user is authenticated
When user opens an anime
And clicks Add to Watchlist
Then anime appears in My Library
```

Example:

```text
Given anime has 12 episodes
When user sets current episode to 6
Then progress shows 50%
```

Example:

```text
Given user rates anime 8.5
When user opens anime detail
Then Your Rating displays 8.5
```

---

# 90. Performance Requirements

Target:

```text
Initial page load < 3 seconds locally
Search response < 1 second when cached
Anime detail < 1 second when cached
```

Avoid:

```text
N+1 queries
Huge API responses
Loading unnecessary fields
Loading hundreds of anime cards at once
```

---

# 91. SEO

Public pages should support:

```text
Title
Description
Canonical URL
Open Graph metadata
```

Anime detail pages should have meaningful metadata.

---

# 92. Failure Scenarios

System must handle:

```text
AniList unavailable
Database unavailable
Invalid anime ID
Invalid rating
Duplicate rating
Duplicate watchlist
Expired authentication
Unauthorized modification
Empty search
No search result
Missing anime image
Missing synopsis
Missing score
Anime with no episodes
Anime still airing
```

---

# 93. Anime Image Failure

If external image fails:

```text
Fallback image
```

Do not break layout.

Use fixed aspect-ratio containers.

---

# 94. Data Synchronization Rules

Never blindly overwrite local fields.

External fields:

```text
title
description
poster
banner
episodes
status
score
genres
studios
characters
staff
relations
```

User-owned fields:

```text
rating
review
watchlist
progress
status
```

User-owned fields are never controlled by AniList synchronization.

---

# 95. Sync Strategy

Initial MVP:

```text
On-demand synchronization
```

Example:

User opens:

```text
/anime/123
```

Backend:

```text
check local database
```

If stale:

```text
fetch AniList
update database
```

Later optional:

```text
scheduled synchronization
```

No cron requirement for MVP.

---

# 96. No Fake Data Policy

The following are prohibited:

```text
fake rating
fake user count
fake reviews
fake statistics
fake airing information
fake anime popularity
fake recommendation
fake characters
```

If data doesn't exist:

```text
display empty state
```

---

# 97. Seed Data

Seed database with only:

```text
development user
```

Anime data should preferably be populated through synchronization.

Do not create hundreds of fake anime records.

---

# 98. Demo Account

Development may have:

```text
demo@example.local
```

But production-like build should not depend on demo data.

---

# 99. Routes

Public:

```text
/
 /explore
 /anime/:id
 /top
 /season
 /genres
 /genres/:slug
 /airing
 /login
 /register
```

Authenticated:

```text
/watchlist
/library
/statistics
/profile
/settings
```

---

# 100. Definition of Done

Project is considered complete only when:

* [ ] Homepage works
* [ ] Explore works
* [ ] Search works
* [ ] Filters work
* [ ] Sorting works
* [ ] Pagination works
* [ ] Anime detail works
* [ ] Characters work
* [ ] Staff works
* [ ] Relations work
* [ ] Recommendations work
* [ ] Season page works
* [ ] Top Anime works
* [ ] Genre pages work
* [ ] Airing page works
* [ ] Registration works
* [ ] Login works
* [ ] Logout works
* [ ] Authentication is secure
* [ ] Watchlist works
* [ ] Library works
* [ ] Episode tracking works
* [ ] Rating works
* [ ] Review works
* [ ] Spoiler protection works
* [ ] Statistics works
* [ ] Responsive UI works
* [ ] Error states work
* [ ] Empty states work
* [ ] Loading states work
* [ ] Database migrations work
* [ ] API caching works
* [ ] AniList synchronization works
* [ ] Unit tests pass
* [ ] Integration tests pass
* [ ] E2E tests pass
* [ ] No critical security issues
* [ ] README complete
* [ ] `.env.example` complete
* [ ] Project runs entirely on WSL Ubuntu
* [ ] No VPS required
* [ ] No cloud database required
* [ ] No hardcoded secrets
* [ ] No fake application functionality

---

# 101. Development Milestones

Do NOT implement the entire application in one pass.

---

## Milestone 1 — Foundation

Tasks:

* [ ] Initialize repository
* [ ] Configure monorepo
* [ ] Configure TypeScript
* [ ] Configure frontend
* [ ] Configure backend
* [ ] Configure PostgreSQL
* [ ] Configure Docker Compose
* [ ] Configure environment
* [ ] Configure linting
* [ ] Configure formatting
* [ ] Configure basic testing

Acceptance:

```text
Frontend runs.
Backend runs.
PostgreSQL runs.
Frontend can call backend.
```

---

## Milestone 2 — Database

Tasks:

* [ ] Design schema
* [ ] Create migrations
* [ ] Create relations
* [ ] Create indexes
* [ ] Add constraints
* [ ] Create seed system

Acceptance:

```text
Database migration works from empty database.
```

---

## Milestone 3 — AniList Integration

Tasks:

* [ ] Create AniList client
* [ ] Create GraphQL queries
* [ ] Create response schemas
* [ ] Create normalization layer
* [ ] Create synchronization service
* [ ] Implement caching
* [ ] Implement error handling

Acceptance:

```text
Application can retrieve anime from AniList and persist it locally.
```

---

## Milestone 4 — Anime Catalog

Tasks:

* [ ] Homepage
* [ ] Explore
* [ ] Search
* [ ] Filter
* [ ] Sort
* [ ] Pagination
* [ ] Anime detail
* [ ] Characters
* [ ] Staff
* [ ] Relations
* [ ] Recommendations

Acceptance:

```text
Guest can fully explore anime catalog.
```

---

## Milestone 5 — Authentication

Tasks:

* [ ] Register
* [ ] Login
* [ ] Logout
* [ ] Session
* [ ] Password hashing
* [ ] Authorization middleware

Acceptance:

```text
User can securely authenticate.
```

---

## Milestone 6 — Personal Library

Tasks:

* [ ] Watchlist
* [ ] Library
* [ ] Watching
* [ ] Completed
* [ ] Planning
* [ ] Paused
* [ ] Dropped
* [ ] Episode progress

Acceptance:

```text
User can track anime consumption.
```

---

## Milestone 7 — Rating & Review

Tasks:

* [ ] Rating
* [ ] Update rating
* [ ] Delete rating
* [ ] Review
* [ ] Edit review
* [ ] Delete review
* [ ] Spoiler protection
* [ ] Average rating

Acceptance:

```text
User can rate and review anime.
```

---

## Milestone 8 — Statistics

Tasks:

* [ ] Statistics API
* [ ] Anime count
* [ ] Completed count
* [ ] Episode count
* [ ] Rating average
* [ ] Genre statistics
* [ ] Rating distribution

Acceptance:

```text
Statistics reflect real user data.
```

---

## Milestone 9 — UX Polish

Tasks:

* [ ] Responsive layout
* [ ] Loading states
* [ ] Skeleton
* [ ] Error states
* [ ] Empty states
* [ ] Toast
* [ ] Accessibility
* [ ] Mobile navigation
* [ ] Image fallback
* [ ] Performance optimization

Acceptance:

```text
Application feels production-quality.
```

---

## Milestone 10 — QA

Tasks:

* [ ] Unit tests
* [ ] Integration tests
* [ ] E2E tests
* [ ] Security review
* [ ] API error testing
* [ ] Database integrity testing
* [ ] Regression testing
* [ ] Performance testing

Acceptance:

```text
Critical user journeys pass automatically.
```

---

## Milestone 11 — Documentation

Tasks:

* [ ] README
* [ ] Installation guide
* [ ] Architecture documentation
* [ ] Database documentation
* [ ] API documentation
* [ ] Testing documentation
* [ ] Environment documentation
* [ ] Troubleshooting guide

---

# 102. GitHub Repository Requirements

Repository should look professional.

Recommended:

```text
README.md
PRD.md
ARCHITECTURE.md
CONTRIBUTING.md
LICENSE
.env.example
docker-compose.yml
```

README should include:

```text
Project overview
Features
Screenshots
Architecture
Tech stack
Installation
Environment setup
Database setup
Testing
Project structure
API documentation
Roadmap
```

---

# 103. Git Commit Strategy

Use conventional commits:

```text
feat:
fix:
refactor:
test:
docs:
chore:
perf:
```

Examples:

```text
feat(anime): add AniList integration
feat(rating): implement anime rating
feat(library): add watch progress
fix(auth): prevent unauthorized review deletion
test(rating): add rating calculation tests
```

---

# 104. AI Development Rules

If this PRD is given to an AI coding agent:

DO NOT:

* generate the entire project at once
* create unnecessary files
* install unnecessary dependencies
* invent requirements
* modify unrelated files
* rewrite existing architecture without justification
* create fake data
* create fake API responses
* implement placeholder buttons as finished features
* mark tasks complete without testing

---

# 105. Required AI Workflow

AI must follow:

```text
Analyze
↓
Inspect Repository
↓
Confirm Existing Architecture
↓
Plan
↓
Implement One Milestone
↓
Run Tests
↓
Review
↓
Fix
↓
Document
↓
Wait for Next Milestone
```

---

# 106. Scope Control

Before modifying files:

AI must identify:

```text
Files to create
Files to modify
Files not to touch
Dependencies to add
```

If a change is outside current milestone:

```text
STOP
```

and report it instead of implementing it automatically.

---

# 107. Quality Gate

Every milestone must pass:

```text
Functional Review
Code Review
Bug Analysis
Edge Case Review
Security Review
Performance Review
Regression Test
```

before being marked complete.

---

# 108. Final Product Flow

The intended user journey:

```text
Open Website
      |
      v
Discover Anime
      |
      v
Search / Filter
      |
      v
Open Anime
      |
      +---- Read Details
      |
      +---- View Characters
      |
      +---- View Relations
      |
      +---- View Recommendations
      |
      v
Login
      |
      v
Add to Library
      |
      v
Set Watching
      |
      v
Update Episode
      |
      v
Rate Anime
      |
      v
Write Review
      |
      v
Complete Anime
      |
      v
Statistics
```

---

# 109. Product Success Criteria

The project succeeds when a user can realistically perform this complete flow:

```text
Register
→ Login
→ Search anime
→ Open anime detail
→ Add anime to library
→ Set Watching
→ Update episode progress
→ Rate anime
→ Write review
→ Mark Completed
→ View statistics
```

without encountering:

```text
fake functionality
broken navigation
dead buttons
hardcoded data
inconsistent state
API-dependent UI failures
security vulnerabilities
```

---

# 110. Final Principle

The application should feel like:

> A real anime tracking product built by an engineer.

Not:

> A collection of AI-generated pages.

Every visible feature must have a corresponding:

```text
UI
↓
Frontend Logic
↓
API
↓
Business Logic
↓
Database
↓
Validation
↓
Test
```

If a feature cannot be implemented end-to-end, it should not be presented as a completed feature.
