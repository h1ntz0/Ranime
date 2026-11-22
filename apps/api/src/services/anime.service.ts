import type { Genre } from '../database/schema.js'
import {
  createAnimeContext,
  type AnimeCardView,
  type AnimeDetailView,
  type AnimeListParams,
  type AnimeServiceContext,
  type AnimeServiceOptions,
  type CharacterView,
  type PagedResult,
  type StaffView,
} from './anime-core.js'
import { list } from './anime-list.js'
import { compare, detail } from './anime-detail.js'
import { characters, staff } from './anime-people.js'
import { recommendations, relations } from './anime-discovery.js'
import { airing, genresList, studioAnime, studiosList } from './anime-catalog.js'

export { DEFAULT_LIST_SORT } from './anime-core.js'
export type {
  AnimeCardView,
  AnimeDetailView,
  AnimeListParams,
  AnimeServiceOptions,
  CharacterView,
  PagedResult,
  StaffView,
} from './anime-core.js'

/**
 * Thin facade over the per-domain modules in this folder (anime-list, anime-detail,
 * anime-people, anime-discovery, anime-catalog) and the shared context in anime-core.
 * The public surface is unchanged from the original single-class implementation.
 */
export class AnimeService {
  private ctx: AnimeServiceContext

  constructor(options: AnimeServiceOptions) {
    this.ctx = createAnimeContext(options)
  }

  async list(params: AnimeListParams): Promise<PagedResult<AnimeCardView>> {
    return list(this.ctx, params)
  }

  async detail(externalId: number): Promise<AnimeDetailView> {
    return detail(this.ctx, externalId)
  }

  async compare(
    externalIds: number[],
  ): Promise<(AnimeCardView & { communityRating: { average: number | null; count: number } })[]> {
    return compare(this.ctx, externalIds)
  }

  async characters(
    externalId: number,
    page = 1,
    perPage = 25,
  ): Promise<PagedResult<CharacterView>> {
    return characters(this.ctx, externalId, page, perPage)
  }

  async staff(externalId: number): Promise<StaffView[]> {
    return staff(this.ctx, externalId)
  }

  async relations(externalId: number): Promise<{ relationType: string; anime: AnimeCardView }[]> {
    return relations(this.ctx, externalId)
  }

  async recommendations(
    externalId: number,
    page = 1,
    perPage = 15,
  ): Promise<PagedResult<AnimeCardView>> {
    return recommendations(this.ctx, externalId, page, perPage)
  }

  async genresList(): Promise<Genre[]> {
    return genresList(this.ctx)
  }

  async studiosList(): Promise<{ name: string; slug: string; count: number }[]> {
    return studiosList(this.ctx)
  }

  async studioAnime(
    slug: string,
    page: number,
    perPage: number,
  ): Promise<PagedResult<AnimeCardView>> {
    return studioAnime(this.ctx, slug, page, perPage)
  }

  async airing(page = 1, perPage = 20): Promise<PagedResult<AnimeCardView>> {
    return airing(this.ctx, page, perPage)
  }
}
