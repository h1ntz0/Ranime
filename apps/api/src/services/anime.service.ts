import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { AppError } from '../lib/errors.js'
import { slugify } from '../lib/slug.js'
import { AniListClient, AniListError } from '../integrations/anilist/client.js'
import { MEDIA_DETAIL_QUERY, MEDIA_PAGE_QUERY } from '../integrations/anilist/queries.js'
import {
  mediaDetailSchema,
  mediaPageSchema,
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

const SORT_MAP: Record<string, string> = {
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

export interface AnimeServiceOptions {
  client: AniListClient
  pool: Pool
  db?: NodePgDatabase<Record<string, unknown>>
  ttl?: Partial<TtlConfig>
}

interface TtlConfig {
  trending: number
  top: number
  seasonal: number
  search: number
  airing: number
  detail: number
  recs: number
}

function cacheTtlFor(sort: string, ttl: TtlConfig): number {
  if (sort.includes('TRENDING')) return ttl.trending
  if (sort.includes('START_DATE')) return ttl.seasonal
  if (sort.includes('SCORE') || sort.includes('POPULARITY')) return ttl.top
  return ttl.search
}

type AnimeDb = any
type AnimeTx = any

export class AnimeService {
  private db: AnimeDb
  private ttl: TtlConfig
  private caches = {
    list: new Map<string, { at: number; value: PagedResult<AnimeCardView> }>(),
    detail: new Map<string, { at: number; value: AniListMediaDetail }>(),
    recs: new Map<string, { at: number; value: PagedResult<AnimeCardView> }>(),
  }

  constructor(private options: AnimeServiceOptions) {
    this.db = options.db ?? drizzle(options.pool)
    this.ttl = {
      trending: options.ttl?.trending ?? 15 * 60 * 1000,
      top: options.ttl?.top ?? 30 * 60 * 1000,
      seasonal: options.ttl?.seasonal ?? 60 * 60 * 1000,
      search: options.ttl?.search ?? 15 * 60 * 1000,
      airing: options.ttl?.airing ?? 15 * 60 * 1000,
      detail: options.ttl?.detail ?? 24 * 60 * 60 * 1000,
      recs: options.ttl?.recs ?? 24 * 60 * 60 * 1000,
    }
  }

  /* ---------------- list / search / filters ---------------- */

  async list(params: AnimeListParams): Promise<PagedResult<AnimeCardView>> {
    const page = params.page ?? 1
    const perPage = Math.min(params.limit ?? 20, 50)
    const sort = SORT_MAP[params.sort ?? ''] ?? DEFAULT_LIST_SORT
    const key = JSON.stringify({ ...params, page, perPage, sort })

    const cached = this.caches.list.get(key)
    if (cached && Date.now() - cached.at < cacheTtlFor(sort, this.ttl)) {
      return cached.value
    }

    const variables: Record<string, unknown> = {
      page,
      perPage,
      search: params.q?.trim() || undefined,
      genre: params.genre?.trim() || undefined,
      season: params.season?.toUpperCase() || undefined,
      seasonYear: params.year,
      format: params.format?.toUpperCase() || undefined,
      status: params.status?.toUpperCase().replace(/\s+/g, '_') || undefined,
      minScore: params.minScore !== undefined ? Math.round(params.minScore * 10) : undefined,
      sort: [sort],
    }

    let result: PagedResult<AnimeCardView>
    try {
      const data = mediaPageSchema.parse(await this.options.client.query(MEDIA_PAGE_QUERY, variables))
      const cards = (data.Page.media ?? []).map(normalizeMediaCard)
      result = {
        items: cards.map((c) => this.toCardView(c.anime, c.genres, c.studios, c.nextAiring)),
        total: data.Page.pageInfo.total ?? 0,
        page,
        perPage,
        hasNextPage: data.Page.pageInfo.hasNextPage ?? false,
      }
      await this.persistMediaCards(cards)
    } catch (error) {
      if (!(error instanceof AniListError)) throw error
      result = await this.listFromLocal(params, page, perPage)
    }
    this.caches.list.set(key, { at: Date.now(), value: result })
    return result
  }

  private async listFromLocal(
    params: AnimeListParams,
    page: number,
    perPage: number,
  ): Promise<PagedResult<AnimeCardView>> {
    if (params.q) throw new AppError(503, 'UPSTREAM_UNAVAILABLE', 'Anime search is temporarily unavailable. Please try again later.')
    const conditions: any[] = []
    if (params.genre) conditions.push(eq(genres.slug, slugify(params.genre)))
    if (params.year) conditions.push(eq(anime.seasonYear, params.year))
    if (params.season) conditions.push(eq(anime.season, params.season.toUpperCase()))
    if (params.format) conditions.push(eq(anime.format, params.format.toUpperCase()))
    if (params.status) conditions.push(eq(anime.status, params.status.toUpperCase().replace(/\s+/g, '_')))
    if (params.minScore) conditions.push(sql`${anime.averageScore} >= ${Math.round(params.minScore * 10)}`)

    const sort = SORT_MAP[params.sort ?? ''] ?? DEFAULT_LIST_SORT
    const orderBy: Record<string, ReturnType<typeof desc>> = {
      POPULARITY_DESC: desc(anime.popularity),
      SCORE_DESC: desc(anime.averageScore),
      TRENDING_DESC: desc(anime.trending),
      START_DATE_DESC: desc(anime.startDate),
      START_DATE_ASC: sql`${anime.startDate} ASC NULLS LAST`,
      TITLE_ROMAJI_ASC: sql`${anime.titleRomaji} ASC NULLS LAST`,
      TITLE_ROMAJI_DESC: desc(anime.titleRomaji),
      EPISODES_DESC: desc(anime.episodes),
    }

    const joined = this.db
      .selectDistinct({ id: anime.id })
      .from(anime)
      .leftJoin(animeGenres, eq(animeGenres.animeId, anime.id))
      .leftJoin(genres, eq(genres.id, animeGenres.genreId))
      .where(conditions.length ? and(...conditions) : undefined)

    const count = (await this.db.select({ n: sql<number>`count(*)::int` }).from(joined.as('j')))[0]?.n ?? 0

    const pagedIds = await this.db
      .select({ id: joined.as('j').id })
      .from(joined.as('j'))
      .limit(perPage)
      .offset((page - 1) * perPage)

    const rows =
      pagedIds.length > 0
        ? await this.db
            .select()
            .from(anime)
            .where(inArray(anime.id, pagedIds.map((p) => p.id)))
            .orderBy(orderBy[sort] ?? desc(anime.popularity))
        : []

    const items = await this.decorateWithRelations(rows)
    return {
      items,
      total: count,
      page,
      perPage,
      hasNextPage: page * perPage < count,
    }
  }

  /* ---------------- detail ---------------- */

  async detail(externalId: number): Promise<AnimeDetailView> {
    const local = await this.findLocalAnime(externalId)
    if (!local || !local.description || this.isStale(local.lastSyncedAt, this.ttl.detail)) {
      try {
        const detail = await this.fetchDetail(externalId)
        if (detail) await this.persistDetail(detail)
      } catch (error) {
        if (!(error instanceof AniListError)) throw error
        if (!local) throw error
      }
    }
    const row = (await this.findLocalAnime(externalId)) ?? local
    if (!row) throw new AppError(404, 'NOT_FOUND', 'Anime not found')

    const items = await this.decorateWithRelations([row])
    const [communityRating, characterCount, staffCount] = await Promise.all([
      this.communityRating(externalId),
      this.characterCount(externalId),
      this.staffCount(externalId),
    ])
    const base = items[0]!
    const detailRow = (
      await this.db.select().from(anime).where(eq(anime.externalId, externalId))
    )[0]
    return {
      ...base,
      description: detailRow?.description ?? null,
      communityRating,
      charactersTotal: characterCount,
      staffTotal: staffCount,
    }
  }

  async compare(externalIds: number[]): Promise<(AnimeCardView & { communityRating: { average: number | null; count: number } })[]> {
    if (externalIds.length === 0) return []

    // 1. Fetch missing anime from upstream if not found locally with max 3s timeout per missing
    await Promise.all(
      externalIds.map(async (id) => {
        const local = await this.findLocalAnime(id)
        if (!local) {
          try {
            const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
            const fetchPromise = this.fetchDetail(id).then(async (detail) => {
              if (detail) await this.persistDetail(detail)
              return detail
            })
            await Promise.race([fetchPromise, timeout])
          } catch {
            // best-effort
          }
        }
      }),
    )

    // 2. Load local anime rows in order
    const rows = await this.db.select().from(anime).where(inArray(anime.externalId, externalIds))
    const decorated = await this.decorateWithRelations(rows)
    const decoratedMap = new Map(decorated.map((a) => [a.id, a]))

    // 3. Attach community rating for each
    const results = await Promise.all(
      externalIds.map(async (id) => {
        const item = decoratedMap.get(id)
        if (!item) return null
        const cr = await this.communityRating(id)
        return {
          ...item,
          communityRating: cr,
        }
      }),
    )

    return results.filter(Boolean) as (AnimeCardView & { communityRating: { average: number | null; count: number } })[]
  }

  async characters(
    externalId: number,
    page = 1,
    perPage = 25,
  ): Promise<PagedResult<{ id: number; name: string; nameNative: string | null; image: string | null; role: string; voiceActor: { name: string; language: string } | null }>> {
    const local = await this.findLocalAnime(externalId)
    if (!local) {
      const detail = await this.fetchDetail(externalId)
      if (detail) await this.persistDetail(detail)
    }
    const count = await this.characterCount(externalId)
    let hasMore = page * perPage > count
    if (hasMore) {
      try {
        const detail = await this.fetchDetail(externalId, page, perPage)
        if (detail) {
          await this.persistDetail(detail)
          hasMore = page * perPage > (await this.characterCount(externalId))
        }
      } catch {
        // serve what we have locally
      }
    }
    const freshCount = await this.characterCount(externalId)
    const rows = await this.db
      .select({
        id: characters.externalId,
        name: characters.name,
        nameNative: characters.nameNative,
        image: characters.image,
        role: animeCharacters.role,
        voiceActorName: staff.name,
        voiceActorLanguage: animeCharacters.voiceActorLanguage,
      })
      .from(animeCharacters)
      .innerJoin(characters, eq(characters.id, animeCharacters.characterId))
      .leftJoin(staff, eq(staff.id, animeCharacters.voiceActorId))
      .where(eq(animeCharacters.animeId, local?.id ?? 0))
      .orderBy(sql`${animeCharacters.role} ASC`, characters.name)
      .limit(perPage)
      .offset((page - 1) * perPage)

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        nameNative: r.nameNative,
        image: r.image,
        role: r.role,
        voiceActor: r.voiceActorName
          ? { name: r.voiceActorName, language: r.voiceActorLanguage ?? 'Japanese' }
          : null,
      })),
      total: freshCount,
      page,
      perPage,
      hasNextPage: page * perPage < freshCount && freshCount > 0,
    }
  }

  async staff(externalId: number): Promise<{ id: number; name: string; nameNative: string | null; image: string | null; role: string }[]> {
    const local = await this.findLocalAnime(externalId)
    if (!local) {
      const detail = await this.fetchDetail(externalId)
      if (detail) await this.persistDetail(detail)
    }
    const rows = await this.db
      .select({
        id: staff.externalId,
        name: staff.name,
        nameNative: staff.nameNative,
        image: staff.image,
        role: animeStaff.role,
      })
      .from(animeStaff)
      .innerJoin(staff, eq(staff.id, animeStaff.staffId))
      .where(eq(animeStaff.animeId, local?.id ?? 0))
      .orderBy(animeStaff.role)
    return rows
  }

  async relations(
    externalId: number,
  ): Promise<{ relationType: string; anime: AnimeCardView }[]> {
    const local = await this.findLocalAnime(externalId)
    if (!local) {
      const detail = await this.fetchDetail(externalId)
      if (detail) await this.persistDetail(detail)
    }
    const rows = await this.db
      .select({
        relationType: animeRelations.relationType,
        relatedId: animeRelations.relatedAnimeId,
      })
      .from(animeRelations)
      .where(eq(animeRelations.animeId, local?.id ?? 0))
    if (rows.length === 0) return []

    const relatedAnime = await this.db
      .select()
      .from(anime)
      .where(
        inArray(
          anime.id,
          rows.map((r) => r.relatedId),
        ),
      )
    const decorated = await this.decorateWithRelations(relatedAnime)
    const byExternalId = new Map(decorated.map((a) => [a.id, a]))
    const externalByInternalId = new Map<number, number>(relatedAnime.map((a: any) => [a.id, a.externalId]))
    const out: { relationType: string; anime: AnimeCardView }[] = []
    for (const r of rows) {
      const animeCard = byExternalId.get(externalByInternalId.get(r.relatedId) ?? -1)
      if (animeCard) out.push({ relationType: r.relationType, anime: animeCard })
    }
    return out
  }

  async recommendations(
    externalId: number,
    page = 1,
    perPage = 15,
  ): Promise<PagedResult<AnimeCardView>> {
    const key = `${externalId}:${page}:${perPage}`
    const cached = this.caches.recs.get(key)
    if (cached && Date.now() - cached.at < this.ttl.recs) return cached.value

    const data = mediaDetailSchema.parse(
      await this.options.client.query(MEDIA_DETAIL_QUERY, {
        id: externalId,
        recPage: page,
        recPerPage: perPage,
      }),
    )
    const detail = data.Media
    const cards: ReturnType<typeof normalizeMediaCard>[] = []
    for (const node of detail?.recommendations?.nodes ?? []) {
      const rec = node.mediaRecommendation
      if (!rec) continue
      cards.push(
        normalizeMediaCard({
          ...rec,
          coverImage: { extraLarge: rec.coverImage?.large ?? null, large: rec.coverImage?.large ?? null },
          bannerImage: null,
          startDate: { year: null, month: null, day: null },
          endDate: { year: null, month: null, day: null },
          season: null,
          seasonYear: null,
          duration: null,
          popularity: null,
          trending: null,
          source: null,
          countryOfOrigin: null,
          genres: [],
          studios: { nodes: [] },
          nextAiringEpisode: null,
        }),
      )
    }
    const result: PagedResult<AnimeCardView> = {
      items: cards.map((c) => this.toCardView(c.anime, [], [], null)),
      total: detail?.recommendations?.pageInfo?.total ?? cards.length,
      page,
      perPage,
      hasNextPage: (detail?.recommendations?.pageInfo?.total ?? 0) > page * perPage,
    }
    this.caches.recs.set(key, { at: Date.now(), value: result })
    return result
  }

  /* ---------------- upstream helpers ---------------- */

  private async fetchDetail(
    externalId: number,
    charPage = 1,
    charPerPage = 25,
  ): Promise<AniListMediaDetail | null> {
    const started = Date.now()
    try {
      const data = mediaDetailSchema.parse(
        await this.options.client.query(MEDIA_DETAIL_QUERY, {
          id: externalId,
          charPage,
          charPerPage,
          staffPerPage: 25,
          recPage: 1,
          recPerPage: 15,
        }),
      )
      await this.logSync('anime.detail', String(externalId), 'success', Date.now() - started)
      return data.Media
    } catch (error) {
      await this.logSync('anime.detail', String(externalId), 'error', Date.now() - started, error instanceof Error ? error.message : 'unknown error')
      throw error
    }
  }

  /* ---------------- persistence ---------------- */

  private async persistMediaCards(
    cards: ReturnType<typeof normalizeMediaCard>[],
  ): Promise<void> {
    if (cards.length === 0) return
    await this.db.transaction(async (tx) => {
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

      await this.syncGenres(tx, cards)
      await this.syncStudios(tx, cards)
      await this.syncAiring(tx, cards)
    })
  }

  private async syncGenres(
    tx: AnimeTx,
    cards: ReturnType<typeof normalizeMediaCard>[],
  ): Promise<void> {
    const names = [...new Set(cards.flatMap((c) => c.genres))]
    if (names.length === 0) return
    const slugs = names.map(slugify)
    const existing = await tx.select({ id: genres.id, slug: genres.slug }).from(genres).where(inArray(genres.slug, slugs))
    const known = new Map(existing.map((g) => [g.slug, g.id]))
    const missing = slugs.filter((s) => !known.has(s))
    if (missing.length > 0) {
      await tx
        .insert(genres)
        .values(missing.map((s) => ({ name: names[slugs.indexOf(s)]!, slug: s })))
        .onConflictDoNothing({ target: genres.slug })
    }
    const all = await tx.select({ id: genres.id, slug: genres.slug }).from(genres).where(inArray(genres.slug, slugs))
    const idBySlug = new Map(all.map((g) => [g.slug, g.id]))

    const extIds = cards.map((c) => c.anime.externalId)
    const localRows = await tx.select({ id: anime.id, externalId: anime.externalId }).from(anime).where(inArray(anime.externalId, extIds))
    const idByExt = new Map(localRows.map((r) => [r.externalId, r.id]))

    const joins = cards.flatMap((c) => {
      const animeId = idByExt.get(c.anime.externalId)
      if (!animeId) return []
      return c.genres.map((name) => ({ animeId, genreId: idBySlug.get(slugify(name)) })).filter((j): j is { animeId: number; genreId: number } => j.genreId !== undefined)
    })
    if (joins.length > 0) {
      await tx.delete(animeGenres).where(inArray(animeGenres.animeId, joins.map((j) => j.animeId)))
      await tx.insert(animeGenres).values(joins).onConflictDoNothing()
    }
  }

  private async syncStudios(
    tx: AnimeTx,
    cards: ReturnType<typeof normalizeMediaCard>[],
  ): Promise<void> {
    const names = [...new Set(cards.flatMap((c) => c.studios))]
    if (names.length === 0) return
    const existing = await tx.select({ id: studios.id, name: studios.name }).from(studios).where(inArray(studios.name, names))
    const known = new Map(existing.map((s) => [s.name, s.id]))
    const missing = names.filter((n) => !known.has(n))
    if (missing.length > 0) {
      await tx.insert(studios).values(missing.map((n) => ({ name: n }))).onConflictDoNothing({ target: studios.name })
    }
    const all = await tx.select({ id: studios.id, name: studios.name }).from(studios).where(inArray(studios.name, names))
    const idByName = new Map(all.map((s) => [s.name, s.id]))

    const extIds = cards.map((c) => c.anime.externalId)
    const localRows = await tx.select({ id: anime.id, externalId: anime.externalId }).from(anime).where(inArray(anime.externalId, extIds))
    const idByExt = new Map(localRows.map((r) => [r.externalId, r.id]))

    const joins = cards.flatMap((c) => {
      const animeId = idByExt.get(c.anime.externalId)
      if (!animeId) return []
      return c.studios
        .map((name) => ({ animeId, studioId: idByName.get(name), isMain: true }))
        .filter((j): j is { animeId: number; studioId: number; isMain: boolean } => j.studioId !== undefined)
    })
    if (joins.length > 0) {
      await tx.delete(animeStudios).where(inArray(animeStudios.animeId, joins.map((j) => j.animeId)))
      await tx.insert(animeStudios).values(joins).onConflictDoNothing()
    }
  }

  private async syncAiring(
    tx: AnimeTx,
    cards: ReturnType<typeof normalizeMediaCard>[],
  ): Promise<void> {
    const withAiring = cards.filter((c) => c.nextAiring !== null)
    if (withAiring.length === 0) return
    const extIds = withAiring.map((c) => c.anime.externalId)
    const localRows = await tx.select({ id: anime.id, externalId: anime.externalId }).from(anime).where(inArray(anime.externalId, extIds))
    const idByExt = new Map(localRows.map((r) => [r.externalId, r.id]))
    const rows = withAiring.flatMap((c) => {
      const animeId = idByExt.get(c.anime.externalId)
      if (!animeId || !c.nextAiring) return []
      return [{ animeId, episode: c.nextAiring.episode, airingAt: new Date(c.nextAiring.airingAt * 1000) }]
    })
    if (rows.length > 0) {
      await tx
        .insert(airingSchedule)
        .values(rows)
        .onConflictDoUpdate({ target: [airingSchedule.animeId, airingSchedule.episode], set: { airingAt: sql`excluded.airing_at` } })
    }
  }

  private async persistDetail(detail: NonNullable<AniListMediaDetail>): Promise<void> {
    const normalized = normalizeMediaDetail(detail)
    const { media, characters: charRows, staff: staffRows, relations: relRows } = normalized
    await this.db.transaction(async (tx) => {
      await tx
        .insert(anime)
        .values({ ...media.anime, lastSyncedAt: new Date() })
        .onConflictDoUpdate({ target: anime.externalId, set: { ...media.anime, lastSyncedAt: sql`now()` } })

      await this.syncGenres(tx, [media])
      await this.syncStudios(tx, [media])
      await this.syncAiring(tx, [media])

      if (charRows.length > 0) {
        await tx
          .insert(characters)
          .values(charRows.map((c) => ({ externalId: c.externalId, name: c.name, nameNative: c.nameNative, image: c.image })))
          .onConflictDoUpdate({ target: characters.externalId, set: { name: sql`excluded.name`, nameNative: sql`excluded.name_native`, image: sql`excluded.image` } })
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
          .onConflictDoUpdate({ target: staff.externalId, set: { name: sql`excluded.name`, nameNative: sql`excluded.name_native`, image: sql`excluded.image` } })
      }

      const local = (await tx.select({ id: anime.id, externalId: anime.externalId }).from(anime).where(eq(anime.externalId, detail.id)))[0]
      if (local) {
        const charIds = (
          await tx.select({ id: characters.id, externalId: characters.externalId }).from(characters).where(inArray(characters.externalId, charRows.map((c) => c.externalId)))
        )
        const charIdByExt = new Map(charIds.map((c) => [c.externalId, c.id]))
        const vaIds = (
          await tx.select({ id: staff.id, externalId: staff.externalId }).from(staff).where(inArray(staff.externalId, vaRows.map((v) => v.externalId)))
        )
        const vaIdByExt = new Map(vaIds.map((v) => [v.externalId, v.id]))
        const charJoins = charRows.flatMap((c) => {
          const characterId = charIdByExt.get(c.externalId)
          if (!characterId) return []
          return [{ animeId: local.id, characterId, role: c.role, voiceActorId: c.voiceActor ? vaIdByExt.get(c.voiceActor.externalId) ?? null : null, voiceActorLanguage: c.voiceActor ? 'Japanese' : null }]
        })
        await tx.delete(animeCharacters).where(
          charJoins.length > 0
            ? and(
                eq(animeCharacters.animeId, local.id),
                inArray(
                  animeCharacters.characterId,
                  charJoins.map((j) => j.characterId),
                ),
              )
            : eq(animeCharacters.animeId, local.id),
        )
        if (charJoins.length > 0) await tx.insert(animeCharacters).values(charJoins).onConflictDoNothing()

        const staffIds = (
          await tx.select({ id: staff.id, externalId: staff.externalId }).from(staff).where(inArray(staff.externalId, staffRows.map((s) => s.externalId)))
        )
        const staffIdByExt = new Map(staffIds.map((s) => [s.externalId, s.id]))
        const staffJoins = staffRows.flatMap((s) => {
          const staffId = staffIdByExt.get(s.externalId)
          if (!staffId) return []
          return [{ animeId: local.id, staffId, role: s.role }]
        })
        await tx.delete(animeStaff).where(eq(animeStaff.animeId, local.id))
        if (staffJoins.length > 0) await tx.insert(animeStaff).values(staffJoins).onConflictDoNothing()
      }

      if (relRows.length > 0) {
        await tx
          .insert(anime)
          .values(relRows.map((r) => ({ ...r.related, lastSyncedAt: new Date() })))
          .onConflictDoUpdate({ target: anime.externalId, set: { titleRomaji: sql`excluded.title_romaji`, titleEnglish: sql`excluded.title_english`, titleNative: sql`excluded.title_native`, coverImage: sql`excluded.cover_image`, format: sql`excluded.format`, status: sql`excluded.status`, episodes: sql`excluded.episodes`, averageScore: sql`excluded.average_score` } })
        const relatedLocal = (
          await tx.select({ id: anime.id, externalId: anime.externalId }).from(anime).where(inArray(anime.externalId, relRows.map((r) => r.relatedExternalId)))
        )
        const idByExt = new Map(relatedLocal.map((r) => [r.externalId, r.id]))
        const relJoins = relRows.flatMap((r) => {
          const relatedId = idByExt.get(r.relatedExternalId)
          if (!relatedId) return []
          return [{ animeId: local?.id ?? 0, relatedAnimeId: relatedId, relationType: r.relationType }]
        })
        if (local) {
          await tx.delete(animeRelations).where(eq(animeRelations.animeId, local.id))
          if (relJoins.length > 0) await tx.insert(animeRelations).values(relJoins).onConflictDoNothing()
        }
      }
    })
  }

  /* ---------------- local reads ---------------- */

  private async findLocalAnime(externalId: number): Promise<Anime | undefined> {
    return (await this.db.select().from(anime).where(eq(anime.externalId, externalId)))[0]
  }

  private isStale(lastSyncedAt: Date | null, ttlMs: number): boolean {
    if (!lastSyncedAt) return true
    return Date.now() - lastSyncedAt.getTime() > ttlMs
  }

  private async communityRating(externalId: number): Promise<{ average: number | null; count: number }> {
    const local = await this.findLocalAnime(externalId)
    if (!local) return { average: null, count: 0 }
    const [row] = await this.db
      .select({
        average: sql<string>`round(avg(${ratings.score})::numeric, 2)`,
        count: sql<number>`count(*)::int`,
      })
      .from(ratings)
      .where(eq(ratings.animeId, local.id))
    return { average: row?.average ? Number(row.average) : null, count: row?.count ?? 0 }
  }

  private async characterCount(externalId: number): Promise<number> {
    const local = await this.findLocalAnime(externalId)
    if (!local) return 0
    return (
      (await this.db.select({ n: sql<number>`count(*)::int` }).from(animeCharacters).where(eq(animeCharacters.animeId, local.id)))[0]?.n ?? 0
    )
  }

  private async staffCount(externalId: number): Promise<number> {
    const local = await this.findLocalAnime(externalId)
    if (!local) return 0
    return (
      (await this.db.select({ n: sql<number>`count(*)::int` }).from(animeStaff).where(eq(animeStaff.animeId, local.id)))[0]?.n ?? 0
    )
  }

  private async decorateWithRelations(rows: Anime[]): Promise<AnimeCardView[]> {
    if (rows.length === 0) return []
    const ids = rows.map((r) => r.id)
    const [genreRows, studioRows, airingRows] = await Promise.all([
      this.db
        .select({ animeId: animeGenres.animeId, name: genres.name })
        .from(animeGenres)
        .innerJoin(genres, eq(genres.id, animeGenres.genreId))
        .where(inArray(animeGenres.animeId, ids)),
      this.db
        .select({ animeId: animeStudios.animeId, name: studios.name })
        .from(animeStudios)
        .innerJoin(studios, eq(studios.id, animeStudios.studioId))
        .where(inArray(animeStudios.animeId, ids)),
      this.db
        .select({ animeId: airingSchedule.animeId, episode: airingSchedule.episode, airingAt: airingSchedule.airingAt })
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
      airingByAnime.set(a.animeId, { episode: a.episode, airingAt: Math.floor(a.airingAt.getTime() / 1000) })
    }
    return rows.map((r) =>
      this.toCardView(r, genresByAnime.get(r.id) ?? [], studiosByAnime.get(r.id) ?? [], airingByAnime.get(r.id) ?? null),
    )
  }

  private toCardView(
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

  /* ---------------- misc ---------------- */

  async genresList(): Promise<Genre[]> {
    return this.db.select({ id: genres.id, name: genres.name, slug: genres.slug }).from(genres).orderBy(genres.name)
  }

  async studiosList(): Promise<{ name: string; slug: string; count: number }[]> {
    const rows = await this.db
      .select({ name: studios.name, count: sql<number>`count(*)::int` })
      .from(studios)
      .innerJoin(animeStudios, eq(animeStudios.studioId, studios.id))
      .groupBy(studios.name)
      .orderBy(desc(sql`count(*)`), studios.name)
    return rows.map((r) => ({ name: r.name, slug: slugify(r.name), count: r.count }))
  }

  async studioAnime(
    slug: string,
    page: number,
    perPage: number,
  ): Promise<PagedResult<AnimeCardView>> {
    const all = await this.db.select({ id: studios.id, name: studios.name }).from(studios)
    const studio = all.find((s) => slugify(s.name) === slug)
    if (!studio) return { items: [], total: 0, page, perPage, hasNextPage: false }

    const total =
      (await this.db
        .select({ n: sql<number>`count(*)::int` })
        .from(animeStudios)
        .where(eq(animeStudios.studioId, studio.id)))[0]?.n ?? 0

    const paged = await this.db
      .select({ id: animeStudios.animeId })
      .from(animeStudios)
      .where(eq(animeStudios.studioId, studio.id))
      .orderBy(animeStudios.isMain)
      .limit(perPage)
      .offset((page - 1) * perPage)

    if (paged.length === 0) return { items: [], total, page, perPage, hasNextPage: false }

    const rows = await this.db
      .select()
      .from(anime)
      .where(inArray(anime.id, paged.map((p) => p.id)))
      .orderBy(desc(anime.popularity))
    const decorated = await this.decorateWithRelations(rows)

    return {
      items: decorated,
      total,
      page,
      perPage,
      hasNextPage: page * perPage < total,
    }
  }

  async airing(page = 1, perPage = 20): Promise<PagedResult<AnimeCardView>> {
    const key = `airing:${page}:${perPage}`
    const cached = this.caches.list.get(key)
    if (cached && Date.now() - cached.at < this.ttl.airing) return cached.value

    const variables = { page, perPage, status: 'RELEASING', sort: ['POPULARITY_DESC'] }
    let result: PagedResult<AnimeCardView>
    try {
      const data = mediaPageSchema.parse(await this.options.client.query(MEDIA_PAGE_QUERY, variables))
      const cards = (data.Page.media ?? []).map(normalizeMediaCard)
      result = {
        items: cards.map((c) => this.toCardView(c.anime, c.genres, c.studios, c.nextAiring)).filter((a) => a.nextAiring),
        total: data.Page.pageInfo.total ?? 0,
        page,
        perPage,
        hasNextPage: data.Page.pageInfo.hasNextPage ?? false,
      }
      await this.persistMediaCards(cards)
    } catch (error) {
      if (!(error instanceof AniListError)) throw error
      const rows = await this.db
        .selectDistinctOn([anime.id], { id: anime.id })
        .from(anime)
        .innerJoin(airingSchedule, eq(airingSchedule.animeId, anime.id))
        .where(sql`${airingSchedule.airingAt} > now()`)
        .orderBy(anime.id, sql`${airingSchedule.airingAt} ASC`)
        .limit(perPage)
        .offset((page - 1) * perPage)
      const list = await this.db.select().from(anime).where(inArray(anime.id, rows.map((r) => r.id)))
      const decorated = await this.decorateWithRelations(list)
      result = { items: decorated.filter((a) => a.nextAiring), total: rows.length, page, perPage, hasNextPage: page * perPage < rows.length }
    }
    this.caches.list.set(key, { at: Date.now(), value: result })
    return result
  }

  private async logSync(operation: string, target: string, status: 'success' | 'error', durationMs: number, message?: string): Promise<void> {
    try {
      await this.db
        .insert(syncLogs)
        .values({ source: 'anilist', operation, target, status, durationMs, message })
    } catch {
      // logging must never break the request
    }
  }
}
