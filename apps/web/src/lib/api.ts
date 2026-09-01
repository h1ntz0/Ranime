import type {
  ActivityItem,
  AnimeCard,
  AnimeDetail,
  Character,
  Genre,
  LibraryEntry,
  ListStatus,
  MyRating,
  MyReview,
  Paged,
  RatingAggregate,
  RecentReview,
  Relation,
  Review,
  StaffMember,
  Statistics,
  StudioSummary,
  User,
  UserProfile,
} from './types'

const BACKEND_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
export const API_BASE = `${BACKEND_BASE}/api`

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers:
      typeof init.body === 'string'
        ? { 'Content-Type': 'application/json', ...init.headers }
        : init.headers,
  })

  if (res.status === 204) return undefined as T

  const body = (await res.json().catch(() => null)) as
    | { data?: T; meta?: Record<string, unknown> }
    | { error?: { code: string; message: string } }
    | null

  if (!res.ok) {
    const err = body && 'error' in body ? body.error : undefined
    throw new ApiError(res.status, err?.code ?? 'UNKNOWN', err?.message ?? `Request failed (${res.status})`)
  }
  return body && 'data' in body ? (body.data as T) : (body as T)
}

function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const s = search.toString()
  return s ? `?${s}` : ''
}

/* ---------- anime ---------- */

export interface ListParams {
  q?: string
  genre?: string
  year?: number
  season?: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'
  format?: string
  status?: string
  minScore?: number
  sort?: string
  page?: number
  limit?: number
}

export function fetchAnimeList(params: ListParams, signal?: AbortSignal): Promise<Paged<AnimeCard>> {
  return request(`/anime${qs(params as Record<string, unknown>)}`, { signal })
}

export function fetchAnimeDetail(id: number, signal?: AbortSignal): Promise<AnimeDetail> {
  return request(`/anime/${id}`, { signal })
}

export function fetchCharacters(id: number, page: number, signal?: AbortSignal): Promise<Paged<Character>> {
  return request(`/anime/${id}/characters${qs({ page })}`, { signal })
}

export function fetchStaff(id: number, signal?: AbortSignal): Promise<StaffMember[]> {
  return request(`/anime/${id}/staff`, { signal })
}

export function fetchRelations(id: number, signal?: AbortSignal): Promise<Relation[]> {
  return request(`/anime/${id}/relations`, { signal })
}

export function fetchRecommendations(id: number, signal?: AbortSignal): Promise<Paged<AnimeCard>> {
  return request(`/anime/${id}/recommendations`, { signal })
}

export function fetchGenres(signal?: AbortSignal): Promise<Genre[]> {
  return request('/genres', { signal })
}

export function fetchGenreAnime(slug: string, page: number, signal?: AbortSignal): Promise<Paged<AnimeCard>> {
  return request(`/genres/${encodeURIComponent(slug)}${qs({ page })}`, { signal })
}

export function fetchSeason(year: number, season: string, page: number, signal?: AbortSignal): Promise<Paged<AnimeCard>> {
  return request(`/season${qs({ year, season, page })}`, { signal })
}

export function fetchTop(category: string, page: number, signal?: AbortSignal): Promise<Paged<AnimeCard>> {
  return request(`/top${qs({ category, page })}`, { signal })
}

export function fetchAiring(page: number, signal?: AbortSignal): Promise<Paged<AnimeCard>> {
  return request(`/airing${qs({ page })}`, { signal })
}

export function fetchStudios(signal?: AbortSignal): Promise<StudioSummary[]> {
  return request('/studios', { signal })
}

export function fetchStudioAnime(
  slug: string,
  page: number,
  signal?: AbortSignal,
): Promise<Paged<AnimeCard>> {
  return request(`/studios/${encodeURIComponent(slug)}${qs({ page })}`, { signal })
}

/* ---------- auth ---------- */

export function fetchMe(signal?: AbortSignal): Promise<User | null> {
  return request('/auth/me', { signal })
}

export function register(input: { username: string; email: string; password: string }): Promise<User> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(input) })
}

export function login(input: { email: string; password: string }): Promise<User> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(input) })
}

export function logout(): Promise<void> {
  return request('/auth/logout', { method: 'POST' })
}

export function requestForgotPasswordOtp(email: string): Promise<{ success: boolean; message: string }> {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function verifyForgotPasswordOtp(input: { email: string; otp: string }): Promise<{ resetToken: string }> {
  return request('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function resetPassword(input: { resetToken: string; password: string }): Promise<{ success: boolean }> {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

/* ---------- users ---------- */

export function fetchUserProfile(username: string, signal?: AbortSignal): Promise<UserProfile> {
  return request(`/users/${encodeURIComponent(username)}`, { signal })
}

export function updateProfile(input: { username?: string; email?: string }): Promise<User> {
  return request('/users/me', { method: 'PATCH', body: JSON.stringify(input) })
}

export function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return request('/users/me/password', { method: 'PATCH', body: JSON.stringify(input) })
}

export function uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
  const form = new FormData()
  form.append('avatar', file)
  return request('/users/me/avatar', { method: 'POST', body: form })
}

/* ---------- watchlist / library ---------- */

export function upsertWatchlist(
  animeId: number,
  input: { status: ListStatus; currentEpisode: number },
): Promise<unknown> {
  return request(`/anime/${animeId}/watchlist`, { method: 'POST', body: JSON.stringify(input) })
}

export function updateWatchlist(
  animeId: number,
  input: { status: ListStatus; currentEpisode: number },
): Promise<unknown> {
  return request(`/anime/${animeId}/watchlist`, { method: 'PUT', body: JSON.stringify(input) })
}

export function removeWatchlist(animeId: number): Promise<void> {
  return request(`/anime/${animeId}/watchlist`, { method: 'DELETE' })
}

export function fetchWatchlistEntry(animeId: number): Promise<LibraryEntry | null> {
  return request(`/anime/${animeId}/watchlist`)
}

export interface LibraryParams {
  status?: ListStatus
  q?: string
  genre?: string
  minScore?: number
  sort?: string
  page?: number
}

export function fetchLibrary(params: LibraryParams, signal?: AbortSignal): Promise<Paged<LibraryEntry>> {
  return request(`/library${qs(params as Record<string, unknown>)}`, { signal })
}

export function fetchStatusCounts(signal?: AbortSignal): Promise<Record<ListStatus, number>> {
  return request('/watchlist/status-counts', { signal })
}

/* ---------- ratings ---------- */

export function setRating(animeId: number, score: number): Promise<{ score: number }> {
  return request(`/anime/${animeId}/rating`, { method: 'POST', body: JSON.stringify({ score }) })
}

export function removeRating(animeId: number): Promise<void> {
  return request(`/anime/${animeId}/rating`, { method: 'DELETE' })
}

export function fetchRatings(animeId: number, signal?: AbortSignal): Promise<RatingAggregate> {
  return request(`/anime/${animeId}/ratings`, { signal })
}

/* ---------- reviews ---------- */

export interface ReviewInput {
  rating: number
  title: string
  content: string
  containsSpoiler: boolean
}

export function createReview(animeId: number, input: ReviewInput): Promise<Review> {
  return request(`/anime/${animeId}/reviews`, { method: 'POST', body: JSON.stringify(input) })
}

export function updateReview(reviewId: string, input: ReviewInput): Promise<Review> {
  return request(`/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify(input) })
}

export function deleteReview(reviewId: string): Promise<void> {
  return request(`/reviews/${reviewId}`, { method: 'DELETE' })
}

export function fetchReviews(animeId: number, page: number, signal?: AbortSignal): Promise<Paged<Review>> {
  return request(`/anime/${animeId}/reviews${qs({ page })}`, { signal })
}

export function fetchMyReview(animeId: number): Promise<Review | null> {
  return request(`/anime/${animeId}/reviews/mine`)
}

/* ---------- statistics ---------- */

export function fetchStatistics(signal?: AbortSignal): Promise<Statistics> {
  return request('/statistics', { signal })
}

/* ---------- activity ---------- */

export function fetchUserActivity(
  username: string,
  page: number,
  signal?: AbortSignal,
): Promise<Paged<ActivityItem>> {
  return request(`/users/${encodeURIComponent(username)}/activity${qs({ page })}`, { signal })
}

/* ---------- my ratings / reviews ---------- */

export function fetchMyRatings(page: number, signal?: AbortSignal): Promise<Paged<MyRating>> {
  return request(`/ratings/me${qs({ page })}`, { signal })
}

export function fetchMyReviews(page: number, signal?: AbortSignal): Promise<Paged<MyReview>> {
  return request(`/reviews/me${qs({ page })}`, { signal })
}

export function fetchRecentReviews(page: number, signal?: AbortSignal): Promise<Paged<RecentReview>> {
  return request(`/reviews/recent${qs({ page })}`, { signal })
}

/* ---------- comparison & roulette ---------- */

export function fetchCompareAnime(ids: number[], signal?: AbortSignal): Promise<AnimeDetail[]> {
  return request(`/anime/compare${qs({ ids: ids.join(',') })}`, { signal })
}

export function fetchRouletteAnime(
  params: { genre?: string; format?: string; minScore?: number; year?: number } = {},
  signal?: AbortSignal,
): Promise<AnimeDetail | null> {
  return request(`/anime/roulette${qs(params)}`, { signal })
}

/* ---------- admin ---------- */
import type { AdminStats } from './types'
export function fetchAdminStats(signal?: AbortSignal): Promise<AdminStats> {
  return request('/admin/stats', { signal })
}
export function fetchAdminUsers(params: { page?: number; limit?: number; q?: string } = {}, signal?: AbortSignal) {
  return request<Paged<User>>(`/admin/users${qs(params as Record<string, unknown>)}`, { signal })
}
export function updateUserRole(userId: string, role: 'USER' | 'ADMIN'): Promise<User> {
  return request(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
}
