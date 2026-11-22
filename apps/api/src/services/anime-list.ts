import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'
import { slugify } from '../lib/slug.js'
import { AniListError } from '../integrations/anilist/client.js'
import { MEDIA_PAGE_QUERY } from '../integrations/anilist/queries.js'
import { mediaPageSchema } from '../integrations/anilist/schemas.js'
import { normalizeMediaCard } from '../integrations/anilist/normalize.js'
import { anime, animeGenres, genres } from '../database/schema.js'
import {
  DEFAULT_LIST_SORT,
  SORT_MAP,
  cacheTtlFor,
  decorateWithRelations,
  persistMediaCards,
  toCardView,
  type AnimeCardView,
  type AnimeListParams,
  type AnimeServiceContext,
  type PagedResult,
} from './anime-core.js'

export async function list(
  ctx: AnimeServiceContext,
  params: AnimeListParams,
): Promise<PagedResult<AnimeCardView>> {
  const page = params.page ?? 1
  const perPage = Math.min(params.limit ?? 20, 50)
  const sort = SORT_MAP[params.sort ?? ''] ?? DEFAULT_LIST_SORT
  const key = JSON.stringify({ ...params, page, perPage, sort })

  const cached = ctx.caches.list.get(key)
  if (cached && Date.now() - cached.at < cacheTtlFor(sort, ctx.ttl)) {
    return cached.value
  }

  // Search relevance only exists upstream, so those queries wait for it.
  if (params.q?.trim()) {
    let searched: PagedResult<AnimeCardView>
    try {
      searched = await ctx.runOnce(`list:${key}`, () => fetchPage(ctx, params, page, perPage, sort))
    } catch (error) {
      if (!(error instanceof AniListError)) throw error
      searched = await listFromLocal(ctx, params, page, perPage)
    }
    ctx.setCapped(ctx.caches.list, key, { at: Date.now(), value: searched })
    return searched
  }

  // Everything else asks the source first, but the mirror answers when the source is slow.
  // The mirror read runs alongside the request, so a deadline costs no extra waiting.
  const mirror = listFromLocal(ctx, params, page, perPage).catch(() => null)
  const upstream = ctx.runOnce(`list:${key}`, () => fetchPage(ctx, params, page, perPage, sort))

  let result: PagedResult<AnimeCardView> | null = null
  try {
    result = await ctx.withDeadline(upstream)
  } catch (error) {
    if (!(error instanceof AniListError)) throw error
  }
  if (result) {
    ctx.setCapped(ctx.caches.list, key, { at: Date.now(), value: result })
    return result
  }

  const local = await mirror
  if (local && local.items.length > 0) {
    // The source missed this caller's deadline; hand the next one its finished page.
    void upstream
      .then((fresh) => ctx.setCapped(ctx.caches.list, key, { at: Date.now(), value: fresh }))
      .catch(() => undefined)
    return local
  }

  try {
    result = await upstream
  } catch (error) {
    if (!(error instanceof AniListError)) throw error
    result = await listFromLocal(ctx, params, page, perPage)
  }
  ctx.setCapped(ctx.caches.list, key, { at: Date.now(), value: result })
  return result
}

export async function fetchPage(
  ctx: AnimeServiceContext,
  params: AnimeListParams,
  page: number,
  perPage: number,
  sort: string,
): Promise<PagedResult<AnimeCardView>> {
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

  const data = mediaPageSchema.parse(await ctx.options.client.query(MEDIA_PAGE_QUERY, variables))
  const cards = (data.Page.media ?? []).map(normalizeMediaCard)
  const result: PagedResult<AnimeCardView> = {
    items: cards.map((c) => toCardView(c.anime, c.genres, c.studios, c.nextAiring)),
    total: data.Page.pageInfo.total ?? 0,
    page,
    perPage,
    hasNextPage: data.Page.pageInfo.hasNextPage ?? false,
  }
  // Persist in background so user doesn't wait 10+ seconds for batch database upserts (sync in tests)
  if (process.env.NODE_ENV === 'test') {
    await persistMediaCards(ctx, cards)
  } else {
    void persistMediaCards(ctx, cards).catch(() => {})
  }
  return result
}

export async function listFromLocal(
  ctx: AnimeServiceContext,
  params: AnimeListParams,
  page: number,
  perPage: number,
): Promise<PagedResult<AnimeCardView>> {
  if (params.q)
    throw new AppError(
      503,
      'UPSTREAM_UNAVAILABLE',
      'Anime search is temporarily unavailable. Please try again later.',
    )
  const conditions: any[] = []
  if (params.genre) conditions.push(eq(genres.slug, slugify(params.genre)))
  if (params.year) conditions.push(eq(anime.seasonYear, params.year))
  if (params.season) conditions.push(eq(anime.season, params.season.toUpperCase()))
  if (params.format) conditions.push(eq(anime.format, params.format.toUpperCase()))
  if (params.status)
    conditions.push(eq(anime.status, params.status.toUpperCase().replace(/\s+/g, '_')))
  if (params.minScore)
    conditions.push(sql`${anime.averageScore} >= ${Math.round(params.minScore * 10)}`)

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

  const joined = ctx.db
    .selectDistinct({ id: anime.id })
    .from(anime)
    .leftJoin(animeGenres, eq(animeGenres.animeId, anime.id))
    .leftJoin(genres, eq(genres.id, animeGenres.genreId))
    .where(conditions.length ? and(...conditions) : undefined)

  // Window count rides along with the page so the mirror path costs one round trip fewer.
  const pagedIds = await ctx.db
    .select({ id: joined.as('j').id, total: sql<number>`count(*) over ()::int` })
    .from(joined.as('j'))
    .limit(perPage)
    .offset((page - 1) * perPage)
  const count = pagedIds[0]?.total ?? 0

  const rows =
    pagedIds.length > 0
      ? await ctx.db
          .select()
          .from(anime)
          .where(
            inArray(
              anime.id,
              pagedIds.map((p) => p.id),
            ),
          )
          .orderBy(orderBy[sort] ?? desc(anime.popularity))
      : []

  const items = await decorateWithRelations(ctx, rows)
  return {
    items,
    total: count,
    page,
    perPage,
    hasNextPage: page * perPage < count,
  }
}
