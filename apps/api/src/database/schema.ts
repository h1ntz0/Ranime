import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/* ---------- Catalog (synced from AniList) ---------- */

export const animeFormats = ['TV', 'MOVIE', 'OVA', 'ONA', 'SPECIAL', 'MUSIC'] as const
export const animeStatuses = ['FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS'] as const
export const animeSeasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const
export const relationTypes = [
  'PREQUEL',
  'SEQUEL',
  'SIDE_STORY',
  'ALTERNATIVE',
  'SPIN_OFF',
  'ADAPTATION',
  'CHARACTER',
  'OTHER',
] as const

export const genres = pgTable(
  'genres',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
  },
  (t) => [uniqueIndex('genres_slug_unique').on(t.slug)],
)

export const anime = pgTable(
  'anime',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    externalId: integer('external_id').notNull(),
    titleRomaji: text('title_romaji'),
    titleEnglish: text('title_english'),
    titleNative: text('title_native'),
    description: text('description'),
    coverImage: text('cover_image'),
    bannerImage: text('banner_image'),
    format: text('format'),
    status: text('status'),
    episodes: integer('episodes'),
    duration: integer('duration'),
    season: text('season'),
    seasonYear: integer('season_year'),
    averageScore: integer('average_score'),
    popularity: integer('popularity'),
    trending: integer('trending'),
    source: text('source'),
    country: text('country'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('anime_external_id_unique').on(t.externalId),
    index('anime_title_romaji_idx').on(t.titleRomaji),
    index('anime_title_english_idx').on(t.titleEnglish),
    index('anime_average_score_idx').on(t.averageScore),
    index('anime_popularity_idx').on(t.popularity),
    index('anime_season_year_idx').on(t.seasonYear),
    check('anime_episodes_nonnegative', sql`${t.episodes} IS NULL OR ${t.episodes} >= 0`),
    check('anime_score_range', sql`${t.averageScore} IS NULL OR ${t.averageScore} BETWEEN 0 AND 100`),
    check('anime_popularity_nonnegative', sql`${t.popularity} IS NULL OR ${t.popularity} >= 0`),
  ],
)

export const animeGenres = pgTable(
  'anime_genres',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    genreId: integer('genre_id')
      .notNull()
      .references(() => genres.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.animeId, t.genreId] })],
)

export const studios = pgTable(
  'studios',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    name: text('name').notNull(),
  },
  (t) => [uniqueIndex('studios_name_unique').on(t.name)],
)

export const animeStudios = pgTable(
  'anime_studios',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    studioId: integer('studio_id')
      .notNull()
      .references(() => studios.id, { onDelete: 'cascade' }),
    isMain: boolean('is_main').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.animeId, t.studioId] })],
)

export const characters = pgTable(
  'characters',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    externalId: integer('external_id').notNull(),
    name: text('name').notNull(),
    nameNative: text('name_native'),
    image: text('image'),
  },
  (t) => [
    uniqueIndex('characters_external_id_unique').on(t.externalId),
    index('characters_name_idx').on(t.name),
  ],
)

export const staff = pgTable(
  'staff',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    externalId: integer('external_id').notNull(),
    name: text('name').notNull(),
    nameNative: text('name_native'),
    image: text('image'),
  },
  (t) => [
    uniqueIndex('staff_external_id_unique').on(t.externalId),
    index('staff_name_idx').on(t.name),
  ],
)

export const animeCharacters = pgTable(
  'anime_characters',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    characterId: integer('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('SUPPORTING'),
    voiceActorId: integer('voice_actor_id').references(() => staff.id, { onDelete: 'set null' }),
    voiceActorLanguage: text('voice_actor_language'),
  },
  (t) => [
    primaryKey({ columns: [t.animeId, t.characterId] }),
    index('anime_characters_anime_id_idx').on(t.animeId),
  ],
)

export const animeStaff = pgTable(
  'anime_staff',
  {
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    staffId: integer('staff_id')
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
  },
  (t) => [primaryKey({ columns: [t.animeId, t.staffId] })],
)

export const animeRelations = pgTable(
  'anime_relations',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    relatedAnimeId: integer('related_anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull(),
  },
  (t) => [
    uniqueIndex('anime_relations_pair_unique').on(t.animeId, t.relatedAnimeId),
    check('anime_relations_not_self', sql`${t.animeId} <> ${t.relatedAnimeId}`),
    index('anime_relations_anime_id_idx').on(t.animeId),
  ],
)

export const airingSchedule = pgTable(
  'airing_schedule',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    episode: integer('episode').notNull(),
    airingAt: timestamp('airing_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    uniqueIndex('airing_schedule_anime_episode_unique').on(t.animeId, t.episode),
    index('airing_schedule_airing_at_idx').on(t.airingAt),
    check('airing_schedule_episode_positive', sql`${t.episode} > 0`),
  ],
)

export const syncLogs = pgTable(
  'sync_logs',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    source: text('source').notNull(),
    operation: text('operation').notNull(),
    target: text('target'),
    status: text('status', { enum: ['success', 'error'] }).notNull(),
    message: text('message'),
    durationMs: integer('duration_ms'),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sync_logs_synced_at_idx').on(t.syncedAt)],
)

/* ---------- User-owned data ---------- */

export const listStatuses = ['PLANNING', 'WATCHING', 'COMPLETED', 'PAUSED', 'DROPPED'] as const

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('users_username_unique').on(t.username),
    uniqueIndex('users_email_unique').on(t.email),
    check('users_username_length', sql`char_length(${t.username}) BETWEEN 3 AND 32`),
  ],
)

export const userAnimeLists = pgTable(
  'user_anime_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    status: text('status', { enum: listStatuses }).notNull().default('PLANNING'),
    currentEpisode: integer('current_episode').notNull().default(0),
    startedAt: date('started_at'),
    completedAt: date('completed_at'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('user_anime_lists_user_anime_unique').on(t.userId, t.animeId),
    index('user_anime_lists_user_id_idx').on(t.userId),
    index('user_anime_lists_anime_id_idx').on(t.animeId),
    check('user_anime_lists_episode_nonnegative', sql`${t.currentEpisode} >= 0`),
  ],
)

export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    score: numeric('score', { precision: 3, scale: 1 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ratings_user_anime_unique').on(t.userId, t.animeId),
    index('ratings_anime_id_idx').on(t.animeId),
    index('ratings_user_id_idx').on(t.userId),
    check('ratings_score_range', sql`${t.score} >= 1 AND ${t.score} <= 10`),
  ],
)

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    animeId: integer('anime_id')
      .notNull()
      .references(() => anime.id, { onDelete: 'cascade' }),
    rating: numeric('rating', { precision: 3, scale: 1 }).notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    containsSpoiler: boolean('contains_spoiler').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('reviews_user_anime_unique').on(t.userId, t.animeId),
    index('reviews_anime_id_idx').on(t.animeId),
    index('reviews_user_id_idx').on(t.userId),
    check('reviews_rating_range', sql`${t.rating} >= 1 AND ${t.rating} <= 10`),
    check('reviews_title_length', sql`char_length(${t.title}) <= 200`),
    check('reviews_content_length', sql`char_length(${t.content}) BETWEEN 20 AND 5000`),
  ],
)

/* ---------- Relations (drizzle query helpers) ---------- */

export const usersRelations = relations(users, ({ many }) => ({
  ratings: many(ratings),
  reviews: many(reviews),
  animeLists: many(userAnimeLists),
}))

export const relationsForAnime = relations(anime, ({ many }) => ({
  genres: many(animeGenres),
  studios: many(animeStudios),
  characters: many(animeCharacters),
  staff: many(animeStaff),
  relations: many(animeRelations, { relationName: 'anime_relations_source' }),
  relatedTo: many(animeRelations, { relationName: 'anime_relations_target' }),
  airing: many(airingSchedule),
  ratings: many(ratings),
  reviews: many(reviews),
  listEntries: many(userAnimeLists),
}))

export const genresRelations = relations(genres, ({ many }) => ({
  anime: many(animeGenres),
}))
export const studiosRelations = relations(studios, ({ many }) => ({
  anime: many(animeStudios),
}))
export const charactersRelations = relations(characters, ({ many }) => ({
  anime: many(animeCharacters),
}))
export const staffRelations = relations(staff, ({ many }) => ({
  anime: many(animeStaff),
  voicedCharacters: many(animeCharacters),
}))
export const animeGenresRelations = relations(animeGenres, ({ one }) => ({
  anime: one(anime, { fields: [animeGenres.animeId], references: [anime.id] }),
  genre: one(genres, { fields: [animeGenres.genreId], references: [genres.id] }),
}))
export const animeStudiosRelations = relations(animeStudios, ({ one }) => ({
  anime: one(anime, { fields: [animeStudios.animeId], references: [anime.id] }),
  studio: one(studios, { fields: [animeStudios.studioId], references: [studios.id] }),
}))
export const animeCharactersRelations = relations(animeCharacters, ({ one }) => ({
  anime: one(anime, { fields: [animeCharacters.animeId], references: [anime.id] }),
  character: one(characters, { fields: [animeCharacters.characterId], references: [characters.id] }),
  voiceActor: one(staff, { fields: [animeCharacters.voiceActorId], references: [staff.id] }),
}))
export const animeStaffRelations = relations(animeStaff, ({ one }) => ({
  anime: one(anime, { fields: [animeStaff.animeId], references: [anime.id] }),
  staff: one(staff, { fields: [animeStaff.staffId], references: [staff.id] }),
}))
export const relationsForEdges = relations(animeRelations, ({ one }) => ({
  anime: one(anime, {
    fields: [animeRelations.animeId],
    references: [anime.id],
    relationName: 'anime_relations_source',
  }),
  related: one(anime, {
    fields: [animeRelations.relatedAnimeId],
    references: [anime.id],
    relationName: 'anime_relations_target',
  }),
}))
export const airingScheduleRelations = relations(airingSchedule, ({ one }) => ({
  anime: one(anime, { fields: [airingSchedule.animeId], references: [anime.id] }),
}))
export const ratingsRelations = relations(ratings, ({ one }) => ({
  user: one(users, { fields: [ratings.userId], references: [users.id] }),
  anime: one(anime, { fields: [ratings.animeId], references: [anime.id] }),
}))
export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
  anime: one(anime, { fields: [reviews.animeId], references: [anime.id] }),
}))
export const userAnimeListsRelations = relations(userAnimeLists, ({ one }) => ({
  user: one(users, { fields: [userAnimeLists.userId], references: [users.id] }),
  anime: one(anime, { fields: [userAnimeLists.animeId], references: [anime.id] }),
}))

/* ---------- Types ---------- */

export type Anime = typeof anime.$inferSelect
export type User = typeof users.$inferSelect
export type Genre = typeof genres.$inferSelect
export type Studio = typeof studios.$inferSelect
export type Character = typeof characters.$inferSelect
export type Staff = typeof staff.$inferSelect
export type UserAnimeList = typeof userAnimeLists.$inferSelect
export type Rating = typeof ratings.$inferSelect
export type Review = typeof reviews.$inferSelect