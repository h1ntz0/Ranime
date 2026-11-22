import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { slugify } from '../lib/slug.js'
import { AniListError } from '../integrations/anilist/client.js'
import { MEDIA_PAGE_QUERY } from '../integrations/anilist/queries.js'
import { mediaPageSchema } from '../integrations/anilist/schemas.js'
import { normalizeMediaCard } from '../integrations/anilist/normalize.js'
import {
  airingSchedule,
  anime,
  animeStudios,
  genres,
  studios,
  type Genre,
} from '../database/schema.js'
import {
  decorateWithRelations,
  persistMediaCards,
  toCardView,
  type AnimeCardView,
  type AnimeServiceContext,
  type PagedResult,
} from './anime-core.js'

export async function genresList(ctx: AnimeServiceContext): Promise<Genre[]> {
  const cached = ctx.caches.genres
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) {
    return cached.value
  }
  try {
    const result = await ctx.db
      .select({ id: genres.id, name: genres.name, slug: genres.slug })
      .from(genres)
      .where(and(ne(genres.slug, 'hentai'), ne(genres.name, 'Hentai')))
      .orderBy(genres.name)
    if (result.length > 0) {
      ctx.caches.genres = { at: Date.now(), value: result }
    }
    return result
  } catch {
    if (cached) return cached.value
    return [
      { id: 1, name: 'Action', slug: 'action' },
      { id: 2, name: 'Adventure', slug: 'adventure' },
      { id: 4, name: 'Comedy', slug: 'comedy' },
      { id: 7, name: 'Drama', slug: 'drama' },
      { id: 8, name: 'Ecchi', slug: 'ecchi' },
      { id: 9, name: 'Fantasy', slug: 'fantasy' },
      { id: 11, name: 'Horror', slug: 'horror' },
      { id: 12, name: 'Mahou Shoujo', slug: 'mahou-shoujo' },
      { id: 13, name: 'Mecha', slug: 'mecha' },
      { id: 14, name: 'Music', slug: 'music' },
      { id: 15, name: 'Mystery', slug: 'mystery' },
      { id: 16, name: 'Psychological', slug: 'psychological' },
      { id: 17, name: 'Romance', slug: 'romance' },
      { id: 18, name: 'Sci-Fi', slug: 'sci-fi' },
      { id: 19, name: 'Slice of Life', slug: 'slice-of-life' },
      { id: 20, name: 'Sports', slug: 'sports' },
      { id: 21, name: 'Supernatural', slug: 'supernatural' },
      { id: 22, name: 'Thriller', slug: 'thriller' },
    ]
  }
}

export async function studiosList(
  ctx: AnimeServiceContext,
): Promise<{ name: string; slug: string; count: number }[]> {
  const cached = ctx.caches.studios
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) {
    return cached.value
  }
  try {
    const rows = await ctx.db
      .select({ name: studios.name, count: sql<number>`count(*)::int` })
      .from(studios)
      .innerJoin(animeStudios, eq(animeStudios.studioId, studios.id))
      .groupBy(studios.name)
      .orderBy(desc(sql`count(*)`), studios.name)
    const result = rows.map((r) => ({ name: r.name, slug: slugify(r.name), count: r.count }))
    if (result.length > 0) {
      ctx.caches.studios = { at: Date.now(), value: result }
    }
    return result
  } catch {
    if (cached) return cached.value
    return [
      { name: 'Toei Animation', slug: 'toei-animation', count: 27 },
      { name: 'MADHOUSE', slug: 'madhouse', count: 19 },
      { name: 'A-1 Pictures', slug: 'a-1-pictures', count: 14 },
      { name: 'J.C.STAFF', slug: 'j-c-staff', count: 13 },
      { name: 'Studio Pierrot', slug: 'studio-pierrot', count: 11 },
      { name: 'WIT STUDIO', slug: 'wit-studio', count: 11 },
      { name: 'bones', slug: 'bones', count: 10 },
      { name: 'CloverWorks', slug: 'cloverworks', count: 10 },
      { name: 'MAPPA', slug: 'mappa', count: 10 },
      { name: 'Production I.G', slug: 'production-i-g', count: 9 },
      { name: 'Kinema Citrus', slug: 'kinema-citrus', count: 8 },
      { name: 'Sunrise', slug: 'sunrise', count: 8 },
      { name: 'Studio DEEN', slug: 'studio-deen', count: 7 },
      { name: 'WHITE FOX', slug: 'white-fox', count: 7 },
      { name: 'Zero-G', slug: 'zero-g', count: 7 },
      { name: 'OLM', slug: 'olm', count: 6 },
      { name: 'TMS Entertainment', slug: 'tms-entertainment', count: 6 },
      { name: '8-bit', slug: '8-bit', count: 5 },
      { name: 'LIDENFILMS', slug: 'lidenfilms', count: 5 },
      { name: 'Shaft', slug: 'shaft', count: 5 },
      { name: 'ufotable', slug: 'ufotable', count: 5 },
      { name: 'Bandai Namco Pictures', slug: 'bandai-namco-pictures', count: 4 },
      { name: "Brain's Base", slug: 'brains-base', count: 4 },
      { name: 'david production', slug: 'david-production', count: 4 },
      { name: 'Kyoto Animation', slug: 'kyoto-animation', count: 4 },
      { name: 'SILVER LINK.', slug: 'silver-link', count: 4 },
      { name: 'Studio Bind', slug: 'studio-bind', count: 4 },
      { name: 'TNK', slug: 'tnk', count: 4 },
      { name: 'TRIGGER', slug: 'trigger', count: 4 },
      { name: 'EMT Squared', slug: 'emt-squared', count: 3 },
      { name: 'Gainax', slug: 'gainax', count: 3 },
      { name: 'P.A.WORKS', slug: 'p-a-works', count: 3 },
      { name: 'project No.9', slug: 'project-no-9', count: 3 },
      { name: 'Science SARU', slug: 'science-saru', count: 3 },
      { name: 'Studio Comet', slug: 'studio-comet', count: 3 },
    ]
  }
}

export async function studioAnime(
  ctx: AnimeServiceContext,
  slug: string,
  page: number,
  perPage: number,
): Promise<PagedResult<AnimeCardView>> {
  const all = await ctx.db.select({ id: studios.id, name: studios.name }).from(studios)
  const studio = all.find((s) => slugify(s.name) === slug)
  if (!studio) return { items: [], total: 0, page, perPage, hasNextPage: false }

  const total =
    (
      await ctx.db
        .select({ n: sql<number>`count(*)::int` })
        .from(animeStudios)
        .where(eq(animeStudios.studioId, studio.id))
    )[0]?.n ?? 0

  const paged = await ctx.db
    .select({ id: animeStudios.animeId })
    .from(animeStudios)
    .where(eq(animeStudios.studioId, studio.id))
    .orderBy(animeStudios.isMain)
    .limit(perPage)
    .offset((page - 1) * perPage)

  if (paged.length === 0) return { items: [], total, page, perPage, hasNextPage: false }

  const rows = await ctx.db
    .select()
    .from(anime)
    .where(
      inArray(
        anime.id,
        paged.map((p) => p.id),
      ),
    )
    .orderBy(desc(anime.popularity))
  const decorated = await decorateWithRelations(ctx, rows)

  return {
    items: decorated,
    total,
    page,
    perPage,
    hasNextPage: page * perPage < total,
  }
}

export async function airing(
  ctx: AnimeServiceContext,
  page = 1,
  perPage = 20,
): Promise<PagedResult<AnimeCardView>> {
  const key = `airing:${page}:${perPage}`
  const cached = ctx.caches.list.get(key)
  if (cached && Date.now() - cached.at < ctx.ttl.airing) return cached.value

  const mirror = localAiring(ctx, page, perPage).catch(() => null)
  const upstream = ctx.runOnce(`airing:${key}`, () => fetchAiring(ctx, page, perPage))

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
    void upstream
      .then((fresh) => ctx.setCapped(ctx.caches.list, key, { at: Date.now(), value: fresh }))
      .catch(() => undefined)
    return local
  }

  try {
    result = await upstream
  } catch (error) {
    if (!(error instanceof AniListError)) throw error
    result = await localAiring(ctx, page, perPage)
  }
  ctx.setCapped(ctx.caches.list, key, { at: Date.now(), value: result })
  return result
}

export async function fetchAiring(
  ctx: AnimeServiceContext,
  page: number,
  perPage: number,
): Promise<PagedResult<AnimeCardView>> {
  const variables = { page, perPage, status: 'RELEASING', sort: ['POPULARITY_DESC'] }
  const data = mediaPageSchema.parse(await ctx.options.client.query(MEDIA_PAGE_QUERY, variables))
  const cards = (data.Page.media ?? []).map(normalizeMediaCard)
  const result: PagedResult<AnimeCardView> = {
    items: cards
      .map((c) => toCardView(c.anime, c.genres, c.studios, c.nextAiring))
      .filter((a) => a.nextAiring),
    total: data.Page.pageInfo.total ?? 0,
    page,
    perPage,
    hasNextPage: data.Page.pageInfo.hasNextPage ?? false,
  }
  if (process.env.NODE_ENV === 'test') {
    await persistMediaCards(ctx, cards)
  } else {
    void persistMediaCards(ctx, cards).catch(() => {})
  }
  return result
}

export async function localAiring(
  ctx: AnimeServiceContext,
  page: number,
  perPage: number,
): Promise<PagedResult<AnimeCardView>> {
  const rows = await ctx.db
    .selectDistinctOn([anime.id], { id: anime.id })
    .from(anime)
    .innerJoin(airingSchedule, eq(airingSchedule.animeId, anime.id))
    .where(sql`${airingSchedule.airingAt} > now()`)
    .orderBy(anime.id, sql`${airingSchedule.airingAt} ASC`)
    .limit(perPage)
    .offset((page - 1) * perPage)
  const list = await ctx.db
    .select()
    .from(anime)
    .where(
      inArray(
        anime.id,
        rows.map((r) => r.id),
      ),
    )
  const decorated = await decorateWithRelations(ctx, list)
  return {
    items: decorated.filter((a) => a.nextAiring),
    total: rows.length,
    page,
    perPage,
    hasNextPage: page * perPage < rows.length,
  }
}
