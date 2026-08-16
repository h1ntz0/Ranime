import { z } from 'zod'

const titleSchema = z.object({
  romaji: z.string().nullable(),
  english: z.string().nullable(),
  native: z.string().nullable(),
})

export const airingSchema = z.object({
  episode: z.number().nullable(),
  airingAt: z.number().nullable(),
  timeUntilAiring: z.number().nullable(),
})

const studioNodeSchema = z.object({
  id: z.number(),
  name: z.string(),
})

export const mediaCardSchema = z.object({
  id: z.number(),
  title: titleSchema.nullable(),
  coverImage: z.object({ extraLarge: z.string().nullable(), large: z.string().nullable() }),
  bannerImage: z.string().nullable(),
  startDate: z.object({ year: z.number().nullable(), month: z.number().nullable(), day: z.number().nullable() }),
  endDate: z.object({ year: z.number().nullable(), month: z.number().nullable(), day: z.number().nullable() }),
  season: z.string().nullable(),
  seasonYear: z.number().nullable(),
  format: z.string().nullable(),
  status: z.string().nullable(),
  episodes: z.number().nullable(),
  duration: z.number().nullable(),
  averageScore: z.number().nullable(),
  popularity: z.number().nullable(),
  trending: z.number().nullable(),
  source: z.string().nullable(),
  countryOfOrigin: z.string().nullable(),
  genres: z.array(z.string()).nullable().default([]),
  studios: z.object({ nodes: z.array(studioNodeSchema).nullable() }).nullable(),
  nextAiringEpisode: airingSchema.nullable(),
})

export const mediaPageSchema = z.object({
  Page: z.object({
    pageInfo: z.object({
      total: z.number().nullable(),
      perPage: z.number().nullable(),
      currentPage: z.number().nullable(),
      lastPage: z.number().nullable(),
      hasNextPage: z.boolean().nullable(),
    }),
    media: z.array(mediaCardSchema).nullable().default([]),
  }),
})

const characterEdgeSchema = z.object({
  role: z.string().nullable(),
  node: z.object({
    id: z.number(),
    name: z.object({ full: z.string().nullable(), native: z.string().nullable() }),
    image: z.object({ large: z.string().nullable() }),
  }),
  voiceActors: z
    .array(
      z.object({
        id: z.number(),
        name: z.object({ full: z.string().nullable(), native: z.string().nullable() }),
        image: z.object({ large: z.string().nullable() }),
      }),
    )
    .nullable()
    .default([]),
})

const staffEdgeSchema = z.object({
  role: z.string().nullable(),
  node: z.object({
    id: z.number(),
    name: z.object({ full: z.string().nullable(), native: z.string().nullable() }),
    image: z.object({ large: z.string().nullable() }),
  }),
})

const relationEdgeSchema = z.object({
  relationType: z.string().nullable(),
  node: z.object({
    id: z.number(),
    title: titleSchema.nullable(),
    format: z.string().nullable(),
    status: z.string().nullable(),
    episodes: z.number().nullable(),
    averageScore: z.number().nullable(),
    coverImage: z.object({ large: z.string().nullable() }),
  }),
})

const recommendationNodeSchema = z.object({
  rating: z.number().nullable(),
  mediaRecommendation: z
    .object({
      id: z.number(),
      title: titleSchema.nullable(),
      format: z.string().nullable(),
      status: z.string().nullable(),
      episodes: z.number().nullable(),
      averageScore: z.number().nullable(),
      coverImage: z.object({ large: z.string().nullable() }),
    })
    .nullable(),
})

export const mediaDetailSchema = z.object({
  Media: mediaCardSchema
    .extend({
      siteUrl: z.string().nullable(),
      description: z.string().nullable(),
      characters: z.object({
        pageInfo: z.object({
          total: z.number().nullable(),
          perPage: z.number().nullable(),
          currentPage: z.number().nullable(),
          lastPage: z.number().nullable(),
          hasNextPage: z.boolean().nullable(),
        }),
        edges: z.array(characterEdgeSchema).nullable().default([]),
      }),
      staff: z.object({
        pageInfo: z.object({ total: z.number().nullable() }),
        edges: z.array(staffEdgeSchema).nullable().default([]),
      }),
      relations: z.object({ edges: z.array(relationEdgeSchema).nullable().default([]) }),
      recommendations: z.object({
        pageInfo: z.object({ total: z.number().nullable() }),
        nodes: z.array(recommendationNodeSchema).nullable().default([]),
      }),
    })
    .nullable(),
})

export type AniListMediaCard = z.infer<typeof mediaCardSchema>
export type AniListMediaDetail = z.infer<typeof mediaDetailSchema>['Media']
export type AniListCharacterEdge = z.infer<typeof characterEdgeSchema>
export type AniListStaffEdge = z.infer<typeof staffEdgeSchema>
export type AniListRelationEdge = z.infer<typeof relationEdgeSchema>
export type AniListRecommendation = z.infer<typeof recommendationNodeSchema>