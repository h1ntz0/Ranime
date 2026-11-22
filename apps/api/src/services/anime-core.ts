import { and, eq, inArray, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { slugify } from '../lib/slug.js'
import type { AniListClient } from '../integrations/anilist/client.js'
import { MEDIA_BASIC_DETAIL_QUERY, MEDIA_DETAIL_QUERY } from '../integrations/anilist/queries.js'
import {
  mediaBasicDetailSchema,
  mediaDetailSchema,
  type AniListMediaBasicDetail,
  type AniListMediaDetail,
} from '../integrations/anilist/schemas.js'
import {
  normalizeMediaCard,
  normalizeMediaDetail,
  type AnimeInsertRow,
} from '../integrations/anilist/normalize.js'
import {
  airingSchedule,
  anime,
  animeCharacters,
  animeGenres,
  animeRelations,
  animeStaff,
  animeStudios,
  characters,
  genres,
  ratings,
  staff,
  studios,
  syncLogs,
  type Anime,
  type Genre,
} from '../database/schema.js'

export interface AnimeListParams {
  q?: string
  genre?: string
  year?: number
  season?: string
  format?: string
  status?: string
  minScore?: number
  sort?: string
  page?: number
  limit?: number
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  hasNextPage: boolean
}

export interface AnimeCardView {
  id: number
  title: { romaji: string | null; english: string | null; native: string | null }
  coverImage: string | null
  bannerImage: string | null
  format: string | null
  status: string | null
  episodes: number | null
  duration: number | null
  season: string | null
  seasonYear: number | null
  averageScore: number | null
  popularity: number | null
  trending: number | null
  startDate: string | null
  endDate: string | null
  source: string | null
  country: string | null
  genres: string[]
  studios: string[]
  nextAiring: { episode: number; airingAt: number } | null
}

export interface AnimeDetailView extends AnimeCardView {
  description: string | null
  communityRating: { average: number | null; count: number }
  charactersTotal: number
  staffTotal: number
}

export interface CharacterView {
  id: number
  name: string
  nameNative: string | null
  image: string | null
  role: string
  voiceActor: { name: string; language: string } | null
}

export interface StaffView {
  id: number
  name: string
  nameNative: string | null
  image: string | null
  role: string
}

export const SORT_MAP: Record<string, string> = {
  POPULARITY: 'POPULARITY_DESC',
  SCORE: 'SCORE_DESC',
  TRENDING: 'TRENDING_DESC',
  NEWEST: 'START_DATE_DESC',
  OLDEST: 'START_DATE_ASC',
  TITLE_AZ: 'TITLE_ROMAJI_ASC',
  TITLE_ZA: 'TITLE_ROMAJI_DESC',
  EPISODES: 'EPISODES_DESC',
}

export const DEFAULT_LIST_SORT = 'TRENDING_DESC'

/** How long a response waits on AniList before the mirror answers instead. */
const UPSTREAM_DEADLINE_MS = 1200

/**
 * Per-map ceiling for the process-local caches below. Their keys embed public query strings, so
 * without a cap a crawler walks distinct values of `q`/`page` and grows the map until the
 * instance runs out of memory.
 */
const CACHE_MAX_ENTRIES = 500

export interface AnimeServiceOptions {
  client: AniListClient
  pool: Pool
  db?: NodePgDatabase<Record<string, unknown>>
  ttl?: Partial<TtlConfig>
}

export interface TtlConfig {
  trending: number
  top: number
  seasonal: number
  search: number
  airing: number
  detail: number
  recs: number
}

export function cacheTtlFor(sort: string, ttl: TtlConfig): number {
  if (sort.includes('TRENDING')) return ttl.trending
  if (sort.includes('START_DATE')) return ttl.seasonal
  if (sort.includes('SCORE') || sort.includes('POPULARITY')) return ttl.top
  return ttl.search
}

export type AnimeDb = any
export type AnimeTx = any

export interface AnimeCaches {
  list: Map<string, { at: number; value: PagedResult<AnimeCardView> }>
  detail: Map<string, { at: number; value: AniListMediaDetail }>
  recs: Map<string, { at: number; value: PagedResult<AnimeCardView> }>
  chars: Map<string, { at: number; value: any }>
  staff: Map<string, { at: number; value: any }>
  genres: { at: number; value: Genre[] } | null
  studios: { at: number; value: { name: string; slug: string; count: number }[] } | null
}

/**
 * Everything the domain modules under services/ need from the old AnimeService class:
 * the database handle, the resolved TTLs, the process-local caches, and the upstream
 * coordination primitives. One context exists per AnimeService instance, exactly like
 * the class fields it replaces.
 */
export interface AnimeServiceContext {
  db: AnimeDb
  options: AnimeServiceOptions
  ttl: TtlConfig
  caches: AnimeCaches
  inflight: Map<string, Promise<unknown>>
  background: Promise<unknown>
  setCapped<K, V>(map: Map<K, V>, key: K, value: V): void
  runOnce<T>(key: string, task: () => Promise<T>): Promise<T>
  withDeadline<T>(task: Promise<T>): Promise<T | null>
  refresh(key: string, task: () => Promise<void>): Promise<void>
}

export function createAnimeContext(options: AnimeServiceOptions): AnimeServiceContext {
  const ctx: AnimeServiceContext = {
    options,
    db: options.db ?? drizzle(options.pool),
    ttl: {
      trending: options.ttl?.trending ?? 15 * 60 * 1000,
      top: options.ttl?.top ?? 30 * 60 * 1000,
      seasonal: options.ttl?.seasonal ?? 60 * 60 * 1000,
      search: options.ttl?.search ?? 15 * 60 * 1000,
      airing: options.ttl?.airing ?? 15 * 60 * 1000,
      detail: options.ttl?.detail ?? 24 * 60 * 60 * 1000,
      recs: options.ttl?.recs ?? 24 * 60 * 60 * 1000,
    },
    caches: {
      list: new Map<string, { at: number; value: PagedResult<AnimeCardView> }>(),
      detail: new Map<string, { at: number; value: AniListMediaDetail }>(),
      recs: new Map<string, { at: number; value: PagedResult<AnimeCardView> }>(),
      chars: new Map<string, { at: number; value: any }>(),
      staff: new Map<string, { at: number; value: any }>(),
      genres: null,
      studios: null,
    },
    inflight: new Map<string, Promise<unknown>>(),
    background: Promise.resolve(),
    setCapped<K, V>(map: Map<K, V>, key: K, value: V): void {
      if (map.size >= CACHE_MAX_ENTRIES && !map.has(key)) {
        const oldest = map.keys().next().value
        if (oldest !== undefined) map.delete(oldest)
      }
      map.set(key, value)
    },
    /** Collapses concurrent identical upstream work into a single AniList call per instance. */
    runOnce<T>(key: string, task: () => Promise<T>): Promise<T> {
      const pending = ctx.inflight.get(key) as Promise<T> | undefined
      if (pending) return pending
      const started = task().finally(() => ctx.inflight.delete(key))
      ctx.inflight.set(key, started)
      return started
    },
    /**
     * Resolves to null instead of letting a slow AniList hold the response. AniList page queries
     * have been observed taking 15s+, which is far worse than serving the mirror.
     */
    async withDeadline<T>(task: Promise<T>): Promise<T | null> {
      let timer: ReturnType<typeof setTimeout> | undefined
      const deadline = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), UPSTREAM_DEADLINE_MS)
      })
      try {
        return await Promise.race([task, deadline])
      } finally {
        clearTimeout(timer)
      }
    },
    /**
     * Refreshes a slice of the catalog after the caller was already answered from the local
     * mirror, so an AniList round trip never sits in the response path. Failures are dropped:
     * the stale copy went out and the next caller simply tries again. Refresh work is serialized
     * and never awaits the response, so a batch upsert cannot hold the two-connection pool while
     * a request needs it. Tests await the queue to observe the settled state.
     */
    async refresh(key: string, task: () => Promise<void>): Promise<void> {
      const queued = ctx.background.then(() => ctx.runOnce(`refresh:${key}`, task))
      ctx.background = queued.catch(() => undefined)
      if (process.env.NODE_ENV === 'test') await ctx.background
    },
  }
  return ctx
}

export async function findLocalAnime(
  ctx: AnimeServiceContext,
  externalId: number,
): Promise<Anime | undefined> {
  return (await ctx.db.select().from(anime).where(eq(anime.externalId, externalId)))[0]
}

export function isStale(lastSyncedAt: Date | null, ttlMs: number): boolean {
  if (!lastSyncedAt) return true
  return Date.now() - lastSyncedAt.getTime() > ttlMs
}

export async function communityRating(
  ctx: AnimeServiceContext,
  externalId: number,
): Promise<{ average: number | null; count: number }> {
  const local = await findLocalAnime(ctx, externalId)
  if (!local) return { average: null, count: 0 }
  const [row] = await ctx.db
    .select({
      average: sql<string>`round(avg(${ratings.score})::numeric, 2)`,
      count: sql<number>`count(*)::int`,
    })
    .from(ratings)
    .where(eq(ratings.animeId, local.id))
  return { average: row?.average ? Number(row.average) : null, count: row?.count ?? 0 }
}

export async function characterCount(
  ctx: AnimeServiceContext,
  externalId: number,
): Promise<number> {
  const local = await findLocalAnime(ctx, externalId)
  if (!local) return 0
  return (
    (
      await ctx.db
        .select({ n: sql<number>`count(*)::int` })
        .from(animeCharacters)
        .where(eq(animeCharacters.animeId, local.id))
    )[0]?.n ?? 0
  )
}

export async function staffCount(ctx: AnimeServiceContext, externalId: number): Promise<number> {
  const local = await findLocalAnime(ctx, externalId)
  if (!local) return 0
  return (
    (
      await ctx.db
        .select({ n: sql<number>`count(*)::int` })
        .from(animeStaff)
        .where(eq(animeStaff.animeId, local.id))
    )[0]?.n ?? 0
  )
}

export async function decorateWithRelations(
  ctx: AnimeServiceContext,
  rows: Anime[],
): Promise<AnimeCardView[]> {
  if (rows.length === 0) return []
  const ids = rows.map((r) => r.id)
  const [genreRows, studioRows, airingRows] = await Promise.all([
    ctx.db
      .select({ animeId: animeGenres.animeId, name: genres.name })
      .from(animeGenres)
      .innerJoin(genres, eq(genres.id, animeGenres.genreId))
      .where(inArray(animeGenres.animeId, ids)),
    ctx.db
      .select({ animeId: animeStudios.animeId, name: studios.name })
      .from(animeStudios)
      .innerJoin(studios, eq(studios.id, animeStudios.studioId))
      .where(inArray(animeStudios.animeId, ids)),
    ctx.db
      .select({
        animeId: airingSchedule.animeId,
        episode: airingSchedule.episode,
        airingAt: airingSchedule.airingAt,
      })
      .from(airingSchedule)
      .where(inArray(airingSchedule.animeId, ids)),
  ])
  const genresByAnime = new Map<number, string[]>()
  for (const g of genreRows) {
    const list = genresByAnime.get(g.animeId) ?? []
    list.push(g.name)
    genresByAnime.set(g.animeId, list)
  }
  const studiosByAnime = new Map<number, string[]>()
  for (const s of studioRows) {
    const list = studiosByAnime.get(s.animeId) ?? []
    list.push(s.name)
    studiosByAnime.set(s.animeId, list)
  }
  const airingByAnime = new Map<number, { episode: number; airingAt: number }>()
  for (const a of airingRows) {
    if (!a.episode || !a.airingAt) continue
    airingByAnime.set(a.animeId, {
      episode: a.episode,
      airingAt: Math.floor(a.airingAt.getTime() / 1000),
    })
  }
  return rows.map((r) =>
    toCardView(
      r,
      genresByAnime.get(r.id) ?? [],
      studiosByAnime.get(r.id) ?? [],
      airingByAnime.get(r.id) ?? null,
    ),
  )
}

export function toCardView(
  a: AnimeInsertRow | Anime,
  genreNames: string[],
  studioNames: string[],
  nextAiring: { episode: number; airingAt: number } | null,
): AnimeCardView {
  return {
    id: a.externalId,
    title: { romaji: a.titleRomaji, english: a.titleEnglish, native: a.titleNative },
    coverImage: a.coverImage,
    bannerImage: a.bannerImage,
    format: a.format,
    status: a.status,
    episodes: a.episodes,
    duration: a.duration,
    season: a.season,
    seasonYear: a.seasonYear,
    averageScore: a.averageScore,
    popularity: a.popularity,
    trending: a.trending,
    startDate: a.startDate,
    endDate: a.endDate,
    source: a.source,
    country: a.country,
    genres: genreNames,
    studios: studioNames,
    nextAiring,
  }
}

/** Lighter than the full detail query, so it survives AniList throttling the heavy one does not. */
export async function fetchBasicDetail(
  ctx: AnimeServiceContext,
  externalId: number,
): Promise<AniListMediaBasicDetail | null> {
  const started = Date.now()
  try {
    const data = mediaBasicDetailSchema.parse(
      await ctx.options.client.query(MEDIA_BASIC_DETAIL_QUERY, { id: externalId }),
    )
    await logSync(ctx, 'anime.basic_detail', String(externalId), 'success', Date.now() - started)
    return data.Media
  } catch (error) {
    await logSync(
      ctx,
      'anime.basic_detail',
      String(externalId),
      'error',
      Date.now() - started,
      error instanceof Error ? error.message : 'unknown error',
    )
    throw error
  }
}

export async function fetchDetail(
  ctx: AnimeServiceContext,
  externalId: number,
  charPage = 1,
  charPerPage = 25,
): Promise<AniListMediaDetail | null> {
  const started = Date.now()
  try {
    const data = mediaDetailSchema.parse(
      await ctx.options.client.query(MEDIA_DETAIL_QUERY, {
        id: externalId,
        charPage,
        charPerPage,
        staffPerPage: 25,
        recPage: 1,
        recPerPage: 15,
      }),
    )
    await logSync(ctx, 'anime.detail', String(externalId), 'success', Date.now() - started)
    return data.Media
  } catch (error) {
    await logSync(
      ctx,
      'anime.detail',
      String(externalId),
      'error',
      Date.now() - started,
      error instanceof Error ? error.message : 'unknown error',
    )
    throw error
  }
}

export async function persistMediaCards(
  ctx: AnimeServiceContext,
  cards: ReturnType<typeof normalizeMediaCard>[],
): Promise<void> {
  if (cards.length === 0) return
  await ctx.db.transaction(async (tx) => {
    const animeRows = cards.map((c) => ({ ...c.anime, lastSyncedAt: new Date() }))
    await tx
      .insert(anime)
      .values(animeRows)
      .onConflictDoUpdate({
        target: anime.externalId,
        set: {
          titleRomaji: sql`excluded.title_romaji`,
          titleEnglish: sql`excluded.title_english`,
          titleNative: sql`excluded.title_native`,
          description: sql`excluded.description`,
          coverImage: sql`excluded.cover_image`,
          bannerImage: sql`excluded.banner_image`,
          format: sql`excluded.format`,
          status: sql`excluded.status`,
          episodes: sql`excluded.episodes`,
          duration: sql`excluded.duration`,
          season: sql`excluded.season`,
          seasonYear: sql`excluded.season_year`,
          averageScore: sql`excluded.average_score`,
          popularity: sql`excluded.popularity`,
          trending: sql`excluded.trending`,
          source: sql`excluded.source`,
          country: sql`excluded.country`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
        },
      })

    await syncGenres(tx, cards)
    await syncStudios(tx, cards)
    await syncAiring(tx, cards)
  })
}

export async function syncGenres(
  tx: AnimeTx,
  cards: ReturnType<typeof normalizeMediaCard>[],
): Promise<void> {
  const names = [...new Set(cards.flatMap((c) => c.genres))]
  if (names.length === 0) return
  const slugs = names.map(slugify)
  const existing = await tx
    .select({ id: genres.id, slug: genres.slug })
    .from(genres)
    .where(inArray(genres.slug, slugs))
  const known = new Map(existing.map((g) => [g.slug, g.id]))
  const missing = slugs.filter((s) => !known.has(s))
  if (missing.length > 0) {
    await tx
      .insert(genres)
      .values(missing.map((s) => ({ name: names[slugs.indexOf(s)]!, slug: s })))
      .onConflictDoNothing({ target: genres.slug })
  }
  const all = await tx
    .select({ id: genres.id, slug: genres.slug })
    .from(genres)
    .where(inArray(genres.slug, slugs))
  const idBySlug = new Map(all.map((g) => [g.slug, g.id]))

  const extIds = cards.map((c) => c.anime.externalId)
  const localRows = await tx
    .select({ id: anime.id, externalId: anime.externalId })
    .from(anime)
    .where(inArray(anime.externalId, extIds))
  const idByExt = new Map(localRows.map((r) => [r.externalId, r.id]))

  const joins = cards.flatMap((c) => {
    const animeId = idByExt.get(c.anime.externalId)
    if (!animeId) return []
    return c.genres
      .map((name) => ({ animeId, genreId: idBySlug.get(slugify(name)) }))
      .filter((j): j is { animeId: number; genreId: number } => j.genreId !== undefined)
  })
  if (joins.length > 0) {
    await tx.delete(animeGenres).where(
      inArray(
        animeGenres.animeId,
        joins.map((j) => j.animeId),
      ),
    )
    await tx.insert(animeGenres).values(joins).onConflictDoNothing()
  }
}

export async function syncStudios(
  tx: AnimeTx,
  cards: ReturnType<typeof normalizeMediaCard>[],
): Promise<void> {
  const names = [...new Set(cards.flatMap((c) => c.studios))]
  if (names.length === 0) return
  const existing = await tx
    .select({ id: studios.id, name: studios.name })
    .from(studios)
    .where(inArray(studios.name, names))
  const known = new Map(existing.map((s) => [s.name, s.id]))
  const missing = names.filter((n) => !known.has(n))
  if (missing.length > 0) {
    await tx
      .insert(studios)
      .values(missing.map((n) => ({ name: n })))
      .onConflictDoNothing({ target: studios.name })
  }
  const all = await tx
    .select({ id: studios.id, name: studios.name })
    .from(studios)
    .where(inArray(studios.name, names))
  const idByName = new Map(all.map((s) => [s.name, s.id]))

  const extIds = cards.map((c) => c.anime.externalId)
  const localRows = await tx
    .select({ id: anime.id, externalId: anime.externalId })
    .from(anime)
    .where(inArray(anime.externalId, extIds))
  const idByExt = new Map(localRows.map((r) => [r.externalId, r.id]))

  const joins = cards.flatMap((c) => {
    const animeId = idByExt.get(c.anime.externalId)
    if (!animeId) return []
    return c.studios
      .map((name) => ({ animeId, studioId: idByName.get(name), isMain: true }))
      .filter(
        (j): j is { animeId: number; studioId: number; isMain: boolean } =>
          j.studioId !== undefined,
      )
  })
  if (joins.length > 0) {
    await tx.delete(animeStudios).where(
      inArray(
        animeStudios.animeId,
        joins.map((j) => j.animeId),
      ),
    )
    await tx.insert(animeStudios).values(joins).onConflictDoNothing()
  }
}

export async function syncAiring(
  tx: AnimeTx,
  cards: ReturnType<typeof normalizeMediaCard>[],
): Promise<void> {
  const withAiring = cards.filter((c) => c.nextAiring !== null)
  if (withAiring.length === 0) return
  const extIds = withAiring.map((c) => c.anime.externalId)
  const localRows = await tx
    .select({ id: anime.id, externalId: anime.externalId })
    .from(anime)
    .where(inArray(anime.externalId, extIds))
  const idByExt = new Map(localRows.map((r) => [r.externalId, r.id]))
  const rows = withAiring.flatMap((c) => {
    const animeId = idByExt.get(c.anime.externalId)
    if (!animeId || !c.nextAiring) return []
    return [
      {
        animeId,
        episode: c.nextAiring.episode,
        airingAt: new Date(c.nextAiring.airingAt * 1000),
      },
    ]
  })
  if (rows.length > 0) {
    await tx
      .insert(airingSchedule)
      .values(rows)
      .onConflictDoUpdate({
        target: [airingSchedule.animeId, airingSchedule.episode],
        set: { airingAt: sql`excluded.airing_at` },
      })
  }
}

export async function persistDetail(
  ctx: AnimeServiceContext,
  detail: NonNullable<AniListMediaDetail>,
): Promise<void> {
  const normalized = normalizeMediaDetail(detail)
  const { media, characters: charRows, staff: staffRows, relations: relRows } = normalized
  await ctx.db.transaction(async (tx) => {
    await tx
      .insert(anime)
      .values({ ...media.anime, lastSyncedAt: new Date() })
      .onConflictDoUpdate({
        target: anime.externalId,
        set: { ...media.anime, lastSyncedAt: sql`now()` },
      })

    await syncGenres(tx, [media])
    await syncStudios(tx, [media])
    await syncAiring(tx, [media])

    if (charRows.length > 0) {
      await tx
        .insert(characters)
        .values(
          charRows.map((c) => ({
            externalId: c.externalId,
            name: c.name,
            nameNative: c.nameNative,
            image: c.image,
          })),
        )
        .onConflictDoUpdate({
          target: characters.externalId,
          set: {
            name: sql`excluded.name`,
            nameNative: sql`excluded.name_native`,
            image: sql`excluded.image`,
          },
        })
    }
    const vaRows = charRows.flatMap((c) => (c.voiceActor ? [c.voiceActor] : []))
    const allStaffRows = [...vaRows, ...staffRows]
    if (allStaffRows.length > 0) {
      const uniqueStaff = new Map<number, (typeof allStaffRows)[number]>()
      for (const s of allStaffRows) uniqueStaff.set(s.externalId, s)
      await tx
        .insert(staff)
        .values(
          [...uniqueStaff.values()].map((s) => ({
            externalId: s.externalId,
            name: s.name,
            nameNative: s.nameNative,
            image: s.image,
          })),
        )
        .onConflictDoUpdate({
          target: staff.externalId,
          set: {
            name: sql`excluded.name`,
            nameNative: sql`excluded.name_native`,
            image: sql`excluded.image`,
          },
        })
    }

    const local = (
      await tx
        .select({ id: anime.id, externalId: anime.externalId })
        .from(anime)
        .where(eq(anime.externalId, detail.id))
    )[0]
    if (local) {
      const charIds = await tx
        .select({ id: characters.id, externalId: characters.externalId })
        .from(characters)
        .where(
          inArray(
            characters.externalId,
            charRows.map((c) => c.externalId),
          ),
        )
      const charIdByExt = new Map(charIds.map((c) => [c.externalId, c.id]))
      const vaIds = await tx
        .select({ id: staff.id, externalId: staff.externalId })
        .from(staff)
        .where(
          inArray(
            staff.externalId,
            vaRows.map((v) => v.externalId),
          ),
        )
      const vaIdByExt = new Map(vaIds.map((v) => [v.externalId, v.id]))
      const charJoins = charRows.flatMap((c) => {
        const characterId = charIdByExt.get(c.externalId)
        if (!characterId) return []
        return [
          {
            animeId: local.id,
            characterId,
            role: c.role,
            voiceActorId: c.voiceActor ? (vaIdByExt.get(c.voiceActor.externalId) ?? null) : null,
            voiceActorLanguage: c.voiceActor ? 'Japanese' : null,
          },
        ]
      })
      await tx.delete(animeCharacters).where(
        charJoins.length > 0
          ? and(
              eq(animeCharacters.animeId, local.id),
              inArray(
                animeCharacters.characterId,
                charJoins.map((j) => j.characterId as number),
              ),
            )
          : eq(animeCharacters.animeId, local.id),
      )
      if (charJoins.length > 0)
        await tx.insert(animeCharacters).values(charJoins).onConflictDoNothing()

      const staffIds = await tx
        .select({ id: staff.id, externalId: staff.externalId })
        .from(staff)
        .where(
          inArray(
            staff.externalId,
            staffRows.map((s) => s.externalId),
          ),
        )
      const staffIdByExt = new Map(staffIds.map((s) => [s.externalId, s.id]))
      const staffJoins = staffRows.flatMap((s) => {
        const staffId = staffIdByExt.get(s.externalId)
        if (!staffId) return []
        return [{ animeId: local.id, staffId, role: s.role }]
      })
      await tx.delete(animeStaff).where(eq(animeStaff.animeId, local.id))
      if (staffJoins.length > 0)
        await tx.insert(animeStaff).values(staffJoins).onConflictDoNothing()
    }

    if (relRows.length > 0) {
      await tx
        .insert(anime)
        .values(relRows.map((r) => ({ ...r.related, lastSyncedAt: new Date() })))
        .onConflictDoUpdate({
          target: anime.externalId,
          set: {
            titleRomaji: sql`excluded.title_romaji`,
            titleEnglish: sql`excluded.title_english`,
            titleNative: sql`excluded.title_native`,
            coverImage: sql`excluded.cover_image`,
            format: sql`excluded.format`,
            status: sql`excluded.status`,
            episodes: sql`excluded.episodes`,
            averageScore: sql`excluded.average_score`,
          },
        })
      const relatedLocal = await tx
        .select({ id: anime.id, externalId: anime.externalId })
        .from(anime)
        .where(
          inArray(
            anime.externalId,
            relRows.map((r) => r.relatedExternalId),
          ),
        )
      const idByExt = new Map(relatedLocal.map((r) => [r.externalId, r.id]))
      const relJoins = relRows.flatMap((r) => {
        const relatedId = idByExt.get(r.relatedExternalId)
        if (!relatedId) return []
        return [
          { animeId: local?.id ?? 0, relatedAnimeId: relatedId, relationType: r.relationType },
        ]
      })
      if (local) {
        await tx.delete(animeRelations).where(eq(animeRelations.animeId, local.id))
        if (relJoins.length > 0)
          await tx.insert(animeRelations).values(relJoins).onConflictDoNothing()
      }
    }
  })
}

export async function logSync(
  ctx: AnimeServiceContext,
  operation: string,
  target: string,
  status: 'success' | 'error',
  durationMs: number,
  message?: string,
): Promise<void> {
  try {
    await ctx.db
      .insert(syncLogs)
      .values({ source: 'anilist', operation, target, status, durationMs, message })
  } catch {
    // logging must never break the request
  }
}
