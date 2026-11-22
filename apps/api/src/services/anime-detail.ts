import { eq, inArray } from 'drizzle-orm'
import { AppError } from '../lib/errors.js'
import type {
  AniListMediaBasicDetail,
  AniListMediaDetail,
} from '../integrations/anilist/schemas.js'
import { anime } from '../database/schema.js'
import {
  characterCount as characterCountOf,
  communityRating as communityRatingOf,
  decorateWithRelations,
  fetchBasicDetail,
  fetchDetail,
  findLocalAnime,
  isStale,
  persistDetail,
  staffCount as staffCountOf,
  type AnimeCardView,
  type AnimeDetailView,
  type AnimeServiceContext,
  type PagedResult,
} from './anime-core.js'

export async function detail(
  ctx: AnimeServiceContext,
  externalId: number,
): Promise<AnimeDetailView> {
  const key = `detail:${externalId}`
  const cached = ctx.caches.list.get(key)
  if (cached && Date.now() - cached.at < ctx.ttl.detail) {
    return cached.value as unknown as AnimeDetailView
  }

  const local = await findLocalAnime(ctx, externalId)
  const complete = Boolean(local?.description)

  if (!complete) {
    // Unmirrored title: ask for the full payload, but do not let a throttled AniList hold the
    // page. The lighter query answers when the full one misses its deadline, and the full one
    // keeps running so the mirror gets filled for later views.
    const upstream = ctx.runOnce(`detail:${externalId}`, () => fetchDetail(ctx, externalId))
    let detail: AniListMediaDetail | null = null
    try {
      detail = await ctx.withDeadline(upstream)
    } catch {
      // A schema surprise or an upstream outage is the light query's job to cover below.
      void upstream.catch(() => undefined)
    }

    if (detail) {
      const payload = detail
      const view = await detailViewFromPayload(ctx, externalId, payload, {
        characters: payload.characters?.pageInfo?.total ?? 0,
        staff: payload.staff?.pageInfo?.total ?? 0,
      })
      ctx.setCapped(ctx.caches.list, key, {
        at: Date.now(),
        value: view as unknown as PagedResult<AnimeCardView>,
      })
      await ctx.refresh(`persist:${externalId}`, async () => {
        await persistDetail(ctx, payload)
      })
      return view
    }

    if (!local) {
      void upstream.catch(() => undefined)
      const basic = await fetchBasicDetail(ctx, externalId)
      if (basic) {
        const view = await detailViewFromPayload(ctx, externalId, basic)
        ctx.setCapped(ctx.caches.list, key, {
          at: Date.now(),
          value: view as unknown as PagedResult<AnimeCardView>,
        })
        // The full payload is what fills characters/staff/relations in the mirror.
        await ctx.refresh(`persist:${externalId}`, async () => {
          const full = await upstream
          if (full) await persistDetail(ctx, full)
        })
        return view
      }
    }
  } else if (local && isStale(local.lastSyncedAt, ctx.ttl.detail)) {
    await ctx.refresh(`detail:${externalId}`, async () => {
      const detail = await fetchDetail(ctx, externalId)
      if (detail) {
        await persistDetail(ctx, detail)
        ctx.caches.list.delete(key)
      }
    })
  }

  const row = (await findLocalAnime(ctx, externalId)) ?? local
  if (!row) throw new AppError(404, 'NOT_FOUND', 'Anime not found')

  const items = await decorateWithRelations(ctx, [row])
  const [communityRating, characterCount, staffCount] = await Promise.all([
    communityRatingOf(ctx, externalId),
    characterCountOf(ctx, externalId),
    staffCountOf(ctx, externalId),
  ])
  const base = items[0]!
  const detailRow = (await ctx.db.select().from(anime).where(eq(anime.externalId, externalId)))[0]
  const resultView: AnimeDetailView = {
    ...base,
    description: detailRow?.description ?? null,
    communityRating,
    charactersTotal: characterCount,
    staffTotal: staffCount,
  }
  ctx.setCapped(ctx.caches.list, key, {
    at: Date.now(),
    value: resultView as unknown as PagedResult<AnimeCardView>,
  })
  return resultView
}

/** Builds the detail view straight from an AniList payload, without waiting on the mirror write. */
export async function detailViewFromPayload(
  ctx: AnimeServiceContext,
  externalId: number,
  media: AniListMediaBasicDetail,
  totals: { characters: number; staff: number } = { characters: 0, staff: 0 },
): Promise<AnimeDetailView> {
  const date = (value: {
    year: number | null
    month: number | null
    day: number | null
  }): string | null =>
    value.year
      ? `${value.year}-${String(value.month ?? 1).padStart(2, '0')}-${String(value.day ?? 1).padStart(2, '0')}`
      : null
  const communityRating = await communityRatingOf(ctx, externalId).catch(() => ({
    average: null,
    count: 0,
  }))
  const nextAiring = media.nextAiringEpisode

  return {
    id: media.id,
    title: {
      romaji: media.title?.romaji ?? '',
      english: media.title?.english ?? null,
      native: media.title?.native ?? null,
    },
    coverImage: media.coverImage?.extraLarge ?? media.coverImage?.large ?? null,
    bannerImage: media.bannerImage ?? null,
    format: media.format ?? null,
    status: media.status ?? null,
    episodes: media.episodes ?? null,
    duration: media.duration ?? null,
    season: media.season ?? null,
    seasonYear: media.seasonYear ?? null,
    averageScore: media.averageScore ?? null,
    popularity: media.popularity ?? null,
    trending: media.trending ?? null,
    startDate: date(media.startDate),
    endDate: date(media.endDate),
    source: media.source ?? null,
    country: media.countryOfOrigin ?? null,
    genres: (media.genres ?? []).filter((g) => g !== 'Hentai'),
    studios: (media.studios?.nodes ?? []).map((s) => s.name),
    nextAiring:
      nextAiring?.episode != null && nextAiring.airingAt != null
        ? { episode: nextAiring.episode, airingAt: nextAiring.airingAt }
        : null,
    description: media.description ?? null,
    communityRating,
    charactersTotal: totals.characters,
    staffTotal: totals.staff,
  }
}

export async function compare(
  ctx: AnimeServiceContext,
  externalIds: number[],
): Promise<(AnimeCardView & { communityRating: { average: number | null; count: number } })[]> {
  if (externalIds.length === 0) return []

  // 1. Fetch missing anime from upstream if not found locally with max 3s timeout per missing
  await Promise.all(
    externalIds.map(async (id) => {
      const local = await findLocalAnime(ctx, id)
      if (!local) {
        try {
          const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
          const fetchPromise = fetchDetail(ctx, id).then(async (detail) => {
            if (detail) await persistDetail(ctx, detail)
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
  const rows = await ctx.db.select().from(anime).where(inArray(anime.externalId, externalIds))
  const decorated = await decorateWithRelations(ctx, rows)
  const decoratedMap = new Map(decorated.map((a) => [a.id, a]))

  // 3. Attach community rating for each
  const results = await Promise.all(
    externalIds.map(async (id) => {
      const item = decoratedMap.get(id)
      if (!item) return null
      const cr = await communityRatingOf(ctx, id)
      return {
        ...item,
        communityRating: cr,
      }
    }),
  )

  return results.filter(Boolean) as (AnimeCardView & {
    communityRating: { average: number | null; count: number }
  })[]
}
