import { eq, sql } from 'drizzle-orm'
import { MEDIA_CHARACTERS_QUERY, MEDIA_STAFF_QUERY } from '../integrations/anilist/queries.js'
import {
  animeCharacters,
  animeStaff,
  characters as charactersTable,
  staff as staffTable,
} from '../database/schema.js'
import {
  characterCount,
  findLocalAnime,
  staffCount,
  type AnimeServiceContext,
  type CharacterView,
  type PagedResult,
  type StaffView,
} from './anime-core.js'

export async function characters(
  ctx: AnimeServiceContext,
  externalId: number,
  page = 1,
  perPage = 25,
): Promise<PagedResult<CharacterView>> {
  const key = `chars:${externalId}:${page}:${perPage}`
  const cached = ctx.caches.chars.get(key)
  if (cached && Date.now() - cached.at < ctx.ttl.detail) {
    return cached.value
  }

  const mirrored = await characterCount(ctx, externalId)
  if (mirrored > 0) {
    const local = await localCharacters(ctx, externalId, page, perPage, mirrored)
    ctx.setCapped(ctx.caches.chars, key, { at: Date.now(), value: local })
    await ctx.refresh(`chars:${key}`, async () => {
      const fresh = await fetchUpstreamCharacters(ctx, externalId, page, perPage)
      if (fresh) ctx.setCapped(ctx.caches.chars, key, { at: Date.now(), value: fresh })
    })
    return local
  }

  try {
    const upstream = await ctx.runOnce(`chars:${key}`, () =>
      fetchUpstreamCharacters(ctx, externalId, page, perPage),
    )
    if (upstream) {
      ctx.setCapped(ctx.caches.chars, key, { at: Date.now(), value: upstream })
      return upstream
    }
  } catch {
    // Fallback to local DB if upstream unavailable
  }

  const freshCount = await characterCount(ctx, externalId)
  return localCharacters(ctx, externalId, page, perPage, freshCount)
}

export async function fetchUpstreamCharacters(
  ctx: AnimeServiceContext,
  externalId: number,
  page: number,
  perPage: number,
): Promise<PagedResult<CharacterView> | null> {
  const data = (await ctx.options.client.query(MEDIA_CHARACTERS_QUERY, {
    id: externalId,
    page,
    perPage,
  })) as any

  const charData = data?.Media?.characters
  if (!charData?.edges) return null
  const items = charData.edges.map((edge: any) => {
    const node = edge.node || {}
    const va = edge.voiceActors?.[0]
    return {
      id: node.id,
      name: node.name?.full ?? 'Unknown',
      nameNative: node.name?.native ?? null,
      image: node.image?.large ?? null,
      role: edge.role ?? 'SUPPORTING',
      voiceActor: va ? { name: va.name?.full ?? 'Unknown', language: 'Japanese' } : null,
    }
  })

  return {
    items,
    total: charData.pageInfo?.total ?? items.length,
    page,
    perPage,
    hasNextPage: charData.pageInfo?.hasNextPage ?? false,
  }
}

export async function localCharacters(
  ctx: AnimeServiceContext,
  externalId: number,
  page: number,
  perPage: number,
  total: number,
): Promise<PagedResult<CharacterView>> {
  const local = await findLocalAnime(ctx, externalId)
  const rows = await ctx.db
    .select({
      id: charactersTable.externalId,
      name: charactersTable.name,
      nameNative: charactersTable.nameNative,
      image: charactersTable.image,
      role: animeCharacters.role,
      voiceActorName: staffTable.name,
      voiceActorLanguage: animeCharacters.voiceActorLanguage,
    })
    .from(animeCharacters)
    .innerJoin(charactersTable, eq(charactersTable.id, animeCharacters.characterId))
    .leftJoin(staffTable, eq(staffTable.id, animeCharacters.voiceActorId))
    .where(eq(animeCharacters.animeId, local?.id ?? 0))
    .orderBy(sql`${animeCharacters.role} ASC`, charactersTable.name)
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
    total,
    page,
    perPage,
    hasNextPage: page * perPage < total && total > 0,
  }
}

export async function staff(ctx: AnimeServiceContext, externalId: number): Promise<StaffView[]> {
  const key = `staff:${externalId}`
  const cached = ctx.caches.staff.get(key)
  if (cached && Date.now() - cached.at < ctx.ttl.detail) {
    return cached.value
  }

  const mirrored = await staffCount(ctx, externalId)
  if (mirrored > 0) {
    const local = await localStaff(ctx, externalId)
    ctx.setCapped(ctx.caches.staff, key, { at: Date.now(), value: local })
    await ctx.refresh(`staff:${externalId}`, async () => {
      const fresh = await fetchUpstreamStaff(ctx, externalId)
      if (fresh) ctx.setCapped(ctx.caches.staff, key, { at: Date.now(), value: fresh })
    })
    return local
  }

  try {
    const items = await ctx.runOnce(`staff:${externalId}`, () =>
      fetchUpstreamStaff(ctx, externalId),
    )
    if (items) {
      ctx.setCapped(ctx.caches.staff, key, { at: Date.now(), value: items })
      return items
    }
  } catch {
    // Fallback to local DB
  }

  return localStaff(ctx, externalId)
}

export async function fetchUpstreamStaff(
  ctx: AnimeServiceContext,
  externalId: number,
): Promise<StaffView[] | null> {
  const data = (await ctx.options.client.query(MEDIA_STAFF_QUERY, {
    id: externalId,
    page: 1,
    perPage: 25,
  })) as any

  const staffData = data?.Media?.staff
  if (!staffData?.edges) return null
  return staffData.edges.map((edge: any) => {
    const node = edge.node || {}
    return {
      id: node.id,
      name: node.name?.full ?? 'Unknown',
      nameNative: node.name?.native ?? null,
      image: node.image?.large ?? null,
      role: edge.role ?? 'Staff',
    }
  })
}

export async function localStaff(
  ctx: AnimeServiceContext,
  externalId: number,
): Promise<StaffView[]> {
  const local = await findLocalAnime(ctx, externalId)
  return ctx.db
    .select({
      id: staffTable.externalId,
      name: staffTable.name,
      nameNative: staffTable.nameNative,
      image: staffTable.image,
      role: animeStaff.role,
    })
    .from(animeStaff)
    .innerJoin(staffTable, eq(staffTable.id, animeStaff.staffId))
    .where(eq(animeStaff.animeId, local?.id ?? 0))
    .orderBy(animeStaff.role)
}
