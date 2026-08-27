export interface AnimeCard {
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

export interface AnimeDetail extends AnimeCard {
  description: string | null
  communityRating: { average: number | null; count: number }
  charactersTotal: number
  staffTotal: number
}

export interface Character {
  id: number
  name: string
  nameNative: string | null
  image: string | null
  role: string
  voiceActor: { name: string; language: string } | null
}

export interface StaffMember {
  id: number
  name: string
  nameNative: string | null
  image: string | null
  role: string
}

export interface Relation {
  relationType: string
  anime: AnimeCard
}

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  perPage: number
  hasNextPage: boolean
}

export interface Genre {
  id: number
  name: string
  slug: string
}

export interface StudioSummary {
  name: string
  slug: string
  count: number
}

export interface LibraryEntry {
  id: string
  status: 'PLANNING' | 'WATCHING' | 'COMPLETED' | 'PAUSED' | 'DROPPED'
  currentEpisode: number
  totalEpisodes: number | null
  progress: number | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  anime: {
    id: number
    title: { romaji: string | null; english: string | null; native: string | null }
    coverImage: string | null
    format: string | null
    averageScore: number | null
    genres: string[]
  }
}

export interface RatingAggregate {
  average: number | null
  count: number
  distribution: { score: number; count: number }[]
  myScore: number | null
  recent: { id: string; score: number; username: string; createdAt: string }[]
}

export interface Review {
  id: string
  rating: number
  title: string
  content: string
  containsSpoiler: boolean
  createdAt: string
  updatedAt: string
  user: { id: string; username: string; avatarUrl: string | null }
}

export interface MyRating {
  id: string
  score: number
  createdAt: string
  anime: {
    id: number
    title: AnimeCard['title']
    coverImage: string | null
    format: string | null
    averageScore: number | null
  }
}

export interface MyReview extends Review {
  anime: { id: number; title: AnimeCard['title']; coverImage: string | null }
}

export type RecentReview = MyReview

export type ActivityType = 'LIBRARY_ADDED' | 'STATUS_CHANGED' | 'COMPLETED' | 'RATED' | 'REVIEWED'

export interface ActivityItem {
  id: string
  type: ActivityType
  createdAt: string
  reviewId: string | null
  payload: { status?: string; score?: number; rating?: number } | null
  anime: { id: number; title: AnimeCard['title']; coverImage: string | null }
}

export interface User {
  id: string
  username: string
  email: string
  role?: 'USER' | 'ADMIN'
  avatarUrl: string | null
  createdAt: string
}

export interface AdminStats {
  overview: {
    totalUsers: number
    totalAdmins: number
    totalAnime: number
    totalReviews: number
    totalRatings: number
    totalWatchlistEntries: number
    totalActivities: number
  }
  userGrowth: { date: string; count: number }[]
  recentUsers: {
    id: string
    username: string
    email: string
    role: 'USER' | 'ADMIN'
    avatarUrl: string | null
    createdAt: string
  }[]
  recentActivities: {
    id: string
    type: string
    createdAt: string
    username: string
    animeTitle: string | null
  }[]
  systemStatus: {
    database: string
    uptime: number
    serverTime: string
  }
}

export interface UserProfile {
  id: string
  username: string
  avatarUrl: string | null
  createdAt: string
  email?: string
  role?: string
  stats: {
    animeCount: number
    completedCount: number
    averageRating: number | null
    episodesWatched: number
  }
}

export interface Statistics {
  totalAnime: number
  watching: number
  completed: number
  planning: number
  paused: number
  dropped: number
  episodesWatched: number
  averageRating: number | null
  reviews: number
  genres: { name: string; count: number }[]
  ratingDistribution: { score: number; count: number }[]
  statusDistribution: { status: string; count: number }[]
}

export type ListStatus = 'PLANNING' | 'WATCHING' | 'COMPLETED' | 'PAUSED' | 'DROPPED'

export const LIST_STATUSES: ListStatus[] = [
  'PLANNING',
  'WATCHING',
  'COMPLETED',
  'PAUSED',
  'DROPPED',
]

export const STATUS_LABELS: Record<ListStatus, string> = {
  PLANNING: 'Planning',
  WATCHING: 'Watching',
  COMPLETED: 'Completed',
  PAUSED: 'Paused',
  DROPPED: 'Dropped',
}

export const STATUS_BADGE_STYLES: Record<ListStatus, string> = {
  PLANNING: 'bg-sky-950 text-sky-300 border-sky-800',
  WATCHING: 'bg-amber-950 text-amber-300 border-amber-800',
  COMPLETED: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  PAUSED: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  DROPPED: 'bg-red-950 text-red-300 border-red-800',
}
