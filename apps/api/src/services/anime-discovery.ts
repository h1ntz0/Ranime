import { eq, inArray } from 'drizzle-orm'
import { MEDIA_DETAIL_QUERY, MEDIA_RELATIONS_QUERY } from '../integrations/anilist/queries.js'
import { mediaDetailSchema } from '../integrations/anilist/schemas.js'
import { normalizeMediaCard } from '../integrations/anilist/normalize.js'
import { anime, animeGenres, animeRelations, genres } from '../database/schema.js'
import {
  decorateWithRelations,
  findLocalAnime,
  toCardView,
  type AnimeCardView,
  type AnimeServiceContext,
  type PagedResult,
} from './anime-core.js'
import { list } from './anime-list.js'

export async function relations(
  ctx: AnimeServiceContext,
  externalId: number,
): Promise<{ relationType: string; anime: AnimeCardView }[]> {
  const key = `relations:${externalId}`
  const cached = ctx.caches.list.get(key)
  if (cached && Date.now() - cached.at < ctx.ttl.detail) {
    return cached.value as unknown as { relationType: string; anime: AnimeCardView }[]
  }

  try {
    const data = (await ctx.options.client.query(MEDIA_RELATIONS_QUERY, {
      id: externalId,
    })) as any
    const edges = data?.Media?.relations?.edges
    if (edges) {
      const items = edges.map((edge: any) => {
        const node = edge.node || {}
        return {
          relationType: edge.relationType ?? 'OTHER',
          anime: {
            id: node.id,
            title: {
              romaji: node.title?.romaji ?? '',
              english: node.title?.english ?? null,
              native: node.title?.native ?? null,
            },
            coverImage: node.coverImage?.large ?? null,
            bannerImage: null,
            format: node.format ?? null,
            status: node.status ?? null,
            episodes: node.episodes ?? null,
            duration: null,
            season: null,
            seasonYear: null,
            averageScore: node.averageScore ?? null,
            popularity: null,
            trending: null,
            startDate: null,
            endDate: null,
            source: null,
            country: null,
            genres: [],
            studios: [],
            nextAiring: null,
          },
        }
      })

      ctx.setCapped(ctx.caches.list, key, { at: Date.now(), value: items as any })
      return items
    }
  } catch {
    // Fallback to local DB
  }

  const local = await findLocalAnime(ctx, externalId)
  const rows = await ctx.db
    .select({
      relationType: animeRelations.relationType,
      relatedId: animeRelations.relatedAnimeId,
    })
    .from(animeRelations)
    .where(eq(animeRelations.animeId, local?.id ?? 0))
  if (rows.length === 0) return []

  const relatedAnime = await ctx.db
    .select()
    .from(anime)
    .where(
      inArray(
        anime.id,
        rows.map((r) => r.relatedId),
      ),
    )
  const decorated = await decorateWithRelations(ctx, relatedAnime)
  const byExternalId = new Map(decorated.map((a) => [a.id, a]))
  const externalByInternalId = new Map<number, number>(
    relatedAnime.map((a: any) => [a.id, a.externalId]),
  )
  const out: { relationType: string; anime: AnimeCardView }[] = []
  for (const r of rows) {
    const animeCard = byExternalId.get(externalByInternalId.get(r.relatedId) ?? -1)
    if (animeCard) out.push({ relationType: r.relationType, anime: animeCard })
  }
  return out
}

export async function recommendations(
  ctx: AnimeServiceContext,
  externalId: number,
  page = 1,
  perPage = 15,
): Promise<PagedResult<AnimeCardView>> {
  const key = `${externalId}:${page}:${perPage}`
  const cached = ctx.caches.recs.get(key)
  if (cached && Date.now() - cached.at < ctx.ttl.recs) return cached.value

  try {
    const data = mediaDetailSchema.parse(
      await ctx.options.client.query(MEDIA_DETAIL_QUERY, {
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
          coverImage: {
            extraLarge: rec.coverImage?.large ?? null,
            large: rec.coverImage?.large ?? null,
          },
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
      items: cards.map((c) => toCardView(c.anime, [], [], null)),
      total: detail?.recommendations?.pageInfo?.total ?? cards.length,
      page,
      perPage,
      hasNextPage: (detail?.recommendations?.pageInfo?.total ?? 0) > page * perPage,
    }
    ctx.setCapped(ctx.caches.recs, key, { at: Date.now(), value: result })
    return result
  } catch {
    try {
      const local = await findLocalAnime(ctx, externalId)
      if (local) {
        const localGenres = await ctx.db
          .select({ name: genres.name })
          .from(animeGenres)
          .innerJoin(genres, eq(genres.id, animeGenres.genreId))
          .where(eq(animeGenres.animeId, local.id))
        const genreName = localGenres[0]?.name
        if (genreName) {
          const fallbackList = await list(ctx, {
            genre: genreName,
            sort: 'POPULARITY',
            page: 1,
            limit: perPage,
          })
          const filtered = fallbackList.items.filter((item) => item.id !== externalId)
          if (filtered.length > 0) {
            const fallbackResult: PagedResult<AnimeCardView> = {
              items: filtered,
              total: filtered.length,
              page,
              perPage,
              hasNextPage: false,
            }
            ctx.setCapped(ctx.caches.recs, key, { at: Date.now(), value: fallbackResult })
            return fallbackResult
          }
        }
      }
    } catch {
      // fall back to the empty page below
    }

    return {
      items: [],
      total: 0,
      page,
      perPage,
      hasNextPage: false,
    }
  }
}
