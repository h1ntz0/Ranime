import type {
  AniListCharacterEdge,
  AniListMediaCard,
  AniListMediaDetail,
  AniListRecommendation,
  AniListRelationEdge,
  AniListStaffEdge,
} from './schemas.js'

function isoDate(year: number | null, month: number | null, day: number | null): string | null {
  if (!year || !month || !day) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export interface AnimeInsertRow {
  externalId: number
  titleRomaji: string | null
  titleEnglish: string | null
  titleNative: string | null
  description: string | null
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
  source: string | null
  country: string | null
  startDate: string | null
  endDate: string | null
}

export interface CharacterInsertRow {
  externalId: number
  name: string
  nameNative: string | null
  image: string | null
  role: 'MAIN' | 'SUPPORTING'
  voiceActor: {
    externalId: number
    name: string
    nameNative: string | null
    image: string | null
  } | null
}

export interface StaffInsertRow {
  externalId: number
  name: string
  nameNative: string | null
  image: string | null
  role: string
}

export interface RelationInsertRow {
  relatedExternalId: number
  relationType: string
  related: AnimeInsertRow
}

export interface RecommendationCard {
  id: number
  titleRomaji: string | null
  titleEnglish: string | null
  format: string | null
  status: string | null
  episodes: number | null
  averageScore: number | null
  coverImage: string | null
}

export function normalizeMediaCard(media: AniListMediaCard): {
  anime: AnimeInsertRow
  genres: string[]
  studios: string[]
  nextAiring: { episode: number; airingAt: number } | null
} {
  return {
    anime: {
      externalId: media.id,
      titleRomaji: media.title?.romaji ?? null,
      titleEnglish: media.title?.english ?? null,
      titleNative: media.title?.native ?? null,
      description: null,
      coverImage: media.coverImage?.large ?? media.coverImage?.extraLarge ?? null,
      bannerImage: media.bannerImage ?? null,
      format: media.format,
      status: media.status,
      episodes: media.episodes,
      duration: media.duration,
      season: media.season,
      seasonYear: media.seasonYear,
      averageScore: media.averageScore,
      popularity: media.popularity,
      trending: media.trending,
      source: media.source,
      country: media.countryOfOrigin,
      startDate: isoDate(media.startDate?.year ?? null, media.startDate?.month ?? null, media.startDate?.day ?? null),
      endDate: isoDate(media.endDate?.year ?? null, media.endDate?.month ?? null, media.endDate?.day ?? null),
    },
    genres: media.genres ?? [],
    studios: (media.studios?.nodes ?? []).map((s) => s.name),
    nextAiring:
      media.nextAiringEpisode && media.nextAiringEpisode.episode && media.nextAiringEpisode.airingAt
        ? { episode: media.nextAiringEpisode.episode, airingAt: media.nextAiringEpisode.airingAt }
        : null,
  }
}

function characterRole(role: string | null): 'MAIN' | 'SUPPORTING' {
  return role === 'MAIN' ? 'MAIN' : 'SUPPORTING'
}

export function normalizeCharacterEdge(edge: AniListCharacterEdge): CharacterInsertRow {
  const va = edge.voiceActors?.[0]
  return {
    externalId: edge.node.id,
    name: edge.node.name.full ?? 'Unknown',
    nameNative: edge.node.name.native,
    image: edge.node.image.large,
    role: characterRole(edge.role),
    voiceActor: va
      ? {
          externalId: va.id,
          name: va.name.full ?? 'Unknown',
          nameNative: va.name.native,
          image: va.image.large,
        }
      : null,
  }
}

export function normalizeStaffEdge(edge: AniListStaffEdge): StaffInsertRow {
  return {
    externalId: edge.node.id,
    name: edge.node.name.full ?? 'Unknown',
    nameNative: edge.node.name.native,
    image: edge.node.image.large,
    role: edge.role ?? 'Staff',
  }
}

export function normalizeRelationEdge(edge: AniListRelationEdge): RelationInsertRow {
  return {
    relatedExternalId: edge.node.id,
    relationType: edge.relationType ?? 'OTHER',
    related: {
      externalId: edge.node.id,
      titleRomaji: edge.node.title?.romaji ?? null,
      titleEnglish: edge.node.title?.english ?? null,
      titleNative: edge.node.title?.native ?? null,
      description: null,
      coverImage: edge.node.coverImage?.large ?? null,
      bannerImage: null,
      format: edge.node.format,
      status: edge.node.status,
      episodes: edge.node.episodes,
      duration: null,
      season: null,
      seasonYear: null,
      averageScore: edge.node.averageScore,
      popularity: null,
      trending: null,
      source: null,
      country: null,
      startDate: null,
      endDate: null,
    },
  }
}

export function normalizeRecommendation(node: AniListRecommendation): RecommendationCard | null {
  const rec = node.mediaRecommendation
  if (!rec) return null
  return {
    id: rec.id,
    titleRomaji: rec.title?.romaji ?? null,
    titleEnglish: rec.title?.english ?? null,
    format: rec.format,
    status: rec.status,
    episodes: rec.episodes,
    averageScore: rec.averageScore,
    coverImage: rec.coverImage?.large ?? null,
  }
}

export function normalizeMediaDetail(detail: NonNullable<AniListMediaDetail>): {
  media: ReturnType<typeof normalizeMediaCard>
  characters: CharacterInsertRow[]
  staff: StaffInsertRow[]
  relations: RelationInsertRow[]
  recommendations: RecommendationCard[]
} {
  const media = normalizeMediaCard(detail)
  media.anime.description = detail.description
  return {
    media,
    characters: (detail.characters?.edges ?? []).map(normalizeCharacterEdge),
    staff: (detail.staff?.edges ?? []).map(normalizeStaffEdge),
    relations: (detail.relations?.edges ?? []).map(normalizeRelationEdge),
    recommendations: (detail.recommendations?.nodes ?? [])
      .map(normalizeRecommendation)
      .filter((r): r is RecommendationCard => r !== null),
  }
}