import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import {
  createReview,
  deleteReview,
  fetchAnimeDetail,
  fetchCharacters,
  fetchMyReview,
  fetchRatings,
  fetchRecommendations,
  fetchRelations,
  fetchReviews,
  fetchStaff,
  fetchWatchlistEntry,
  removeRating,
  removeWatchlist,
  setRating,
  updateReview,
  upsertWatchlist,
} from '../lib/api'
import {
  countdown,
  displayTitle,
  formatDate,
  formatScore,
  formatSeason,
  formatStatus,
  stripHtml,
  timeAgo,
} from '../lib/format'
import { cn } from '../lib/cn'
import type { ListStatus, Review } from '../lib/types'
import { AnimeCardView } from '../components/AnimeCard'
import { Poster } from '../components/Poster'
import { StarRating } from '../components/StarRating'
import { ReviewCard } from '../components/ReviewCard'
import { CardGridSkeleton, Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { StatusSelect } from '../components/StatusSelect'
import { Pagination } from '../components/Pagination'
import { Button } from '../components/ui/Button'
import { buttonClass } from '../components/ui/buttonStyles'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EpisodeStepper } from '../components/ui/EpisodeStepper'

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-5 flex items-center gap-2.5">
        <span className="h-4 w-1 rounded-full bg-accent" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ReviewForm({
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  initial: Review | null
  submitting: boolean
  onSubmit: (input: { rating: number; title: string; content: string; containsSpoiler: boolean }) => void
  onCancel?: () => void
}) {
  const [rating, setRatingState] = useState(initial?.rating ?? 8)
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [spoiler, setSpoiler] = useState(initial?.containsSpoiler ?? false)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Review title is required.')
      return
    }
    if (content.trim().length < 20) {
      setError(`Review must be at least 20 characters (current: ${content.trim().length}).`)
      return
    }
    setError('')
    onSubmit({ rating, title: title.trim(), content: content.trim(), containsSpoiler: spoiler })
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-line bg-surface/40 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <p className="mb-1 text-sm text-ink-2">Your rating</p>
          <StarRating value={rating} onChange={(s) => s > 0 && setRatingState(s)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            checked={spoiler}
            onChange={(e) => setSpoiler(e.target.checked)}
            className="rounded border-line-strong bg-surface"
          />
          Contains spoilers
        </label>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Review title (required)"
        maxLength={200}
        required
        className="mt-3 w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:outline-none"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write your review (minimum 20 characters)..."
        rows={5}
        maxLength={5000}
        required
        className="mt-3 w-full resize-y rounded-sm border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between text-xs text-ink-3">
        <span>{content.trim().length < 20 ? `${content.trim().length}/20 minimum characters` : `${content.trim().length} characters`}</span>
        <span>Max 5,000</span>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : initial ? 'Update review' : 'Publish review'}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

export default function AnimeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const animeId = Number(id)
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const [charPage, setCharPage] = useState(1)
  const [charRoleFilter, setCharRoleFilter] = useState<'ALL' | 'MAIN' | 'SUPPORTING'>('ALL')
  const [reviewPage, setReviewPage] = useState(1)
  const [editingReview, setEditingReview] = useState(false)
  const [reviewFormOpen, setReviewFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const detail = useQuery({
    queryKey: ['anime', animeId],
    queryFn: ({ signal }) => fetchAnimeDetail(animeId, signal),
    enabled: Number.isFinite(animeId),
    staleTime: 10 * 60 * 1000,
  })
  const characters = useQuery({
    queryKey: ['anime', animeId, 'characters', charPage],
    queryFn: ({ signal }) => fetchCharacters(animeId, charPage, signal),
    enabled: Number.isFinite(animeId),
    staleTime: 10 * 60 * 1000,
  })
  const staff = useQuery({
    queryKey: ['anime', animeId, 'staff'],
    queryFn: ({ signal }) => fetchStaff(animeId, signal),
    enabled: Number.isFinite(animeId),
    staleTime: 10 * 60 * 1000,
  })
  const relations = useQuery({
    queryKey: ['anime', animeId, 'relations'],
    queryFn: ({ signal }) => fetchRelations(animeId, signal),
    enabled: Number.isFinite(animeId),
    staleTime: 10 * 60 * 1000,
  })
  const recommendations = useQuery({
    queryKey: ['anime', animeId, 'recs'],
    queryFn: ({ signal }) => fetchRecommendations(animeId, signal),
    enabled: Number.isFinite(animeId),
    staleTime: 10 * 60 * 1000,
  })
  const ratings = useQuery({
    queryKey: ['anime', animeId, 'ratings'],
    queryFn: ({ signal }) => fetchRatings(animeId, signal),
    enabled: Number.isFinite(animeId),
    staleTime: 2 * 60 * 1000,
  })
  const reviews = useQuery({
    queryKey: ['anime', animeId, 'reviews', reviewPage],
    queryFn: ({ signal }) => fetchReviews(animeId, reviewPage, signal),
    enabled: Number.isFinite(animeId),
    staleTime: 2 * 60 * 1000,
  })
  const myReview = useQuery({
    queryKey: ['anime', animeId, 'myReview', user?.id],
    queryFn: () => fetchMyReview(animeId),
    enabled: Number.isFinite(animeId),
  })
  const entry = useQuery({
    queryKey: ['anime', animeId, 'entry', user?.id],
    queryFn: () => fetchWatchlistEntry(animeId),
    enabled: Number.isFinite(animeId),
  })

  const entryKey = ['anime', animeId, 'entry', user?.id]
  const invalidateLibrary = () => {
    queryClient.invalidateQueries({ queryKey: ['library'] })
    queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    queryClient.invalidateQueries({ queryKey: ['statistics'] })
  }

  const saveEntry = useMutation({
    mutationFn: ({ status, currentEpisode }: { status: ListStatus; currentEpisode: number }) =>
      upsertWatchlist(animeId, { status, currentEpisode }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: entryKey })
      const prev = queryClient.getQueryData(entryKey)
      queryClient.setQueryData(entryKey, (old: typeof prev) =>
        old ? { ...old, status: vars.status, currentEpisode: vars.currentEpisode } : old,
      )
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(entryKey, ctx.prev)
      toast(e instanceof Error ? e.message : 'Failed to update library', 'error')
    },
    onSuccess: () => toast('Library updated'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: entryKey })
      invalidateLibrary()
    },
  })

  const removeEntry = useMutation({
    mutationFn: () => removeWatchlist(animeId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: entryKey })
      const prev = queryClient.getQueryData(entryKey)
      queryClient.setQueryData(entryKey, null)
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(entryKey, ctx.prev)
      toast(e instanceof Error ? e.message : 'Failed to remove', 'error')
    },
    onSuccess: () => toast('Removed from library'),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: entryKey })
      invalidateLibrary()
    },
  })

  const ratingsKey = ['anime', animeId, 'ratings']
  const rate = useMutation({
    mutationFn: async (score: number) => {
      if (score === 0) {
        await removeRating(animeId)
        return 0
      }
      return setRating(animeId, score)
    },
    onMutate: async (score) => {
      await queryClient.cancelQueries({ queryKey: ratingsKey })
      const prev = queryClient.getQueryData(ratingsKey)
      queryClient.setQueryData(ratingsKey, (old: typeof prev) =>
        old && typeof old === 'object' ? { ...old, myScore: score === 0 ? null : score } : old,
      )
      return { prev }
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(ratingsKey, ctx.prev)
      toast(e instanceof Error ? e.message : 'Failed to save rating', 'error')
    },
    onSuccess: (_, score) => {
      if (score === 0) toast('Rating removed')
      else toast(`Rated ${score.toFixed(1)}`)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ratingsKey }),
  })

  const myReviewKey = ['anime', animeId, 'myReview', user?.id]
  const reviewMutation = useMutation({
    mutationFn: (input: { rating: number; title: string; content: string; containsSpoiler: boolean }) =>
      myReview.data ? updateReview(myReview.data.id, input) : createReview(animeId, input),
    onSuccess: (saved) => {
      queryClient.setQueryData(myReviewKey, saved)
      queryClient.invalidateQueries({ queryKey: ['anime', animeId, 'reviews'] })
      toast('Review saved')
      setReviewFormOpen(false)
      setEditingReview(false)
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Failed to save review', 'error'),
  })

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReview(reviewId),
    onSuccess: () => {
      queryClient.setQueryData(myReviewKey, null)
      queryClient.invalidateQueries({ queryKey: ['anime', animeId, 'reviews'] })
      setEditingReview(false)
      setDeleteTarget(null)
    },
    onError: (e) => {
      setDeleteTarget(null)
      toast(e instanceof Error ? e.message : 'Failed to delete review', 'error')
    },
  })

  if (Number.isNaN(animeId)) return <ErrorState message="Invalid anime ID." />

  if (detail.isPending) {
    return (
      <div>
        <Skeleton className="h-80 w-full" />
        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
          <div className="space-y-8">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (detail.isError || !detail.data) {
    return <ErrorState message="Anime data is temporarily unavailable. Please try again later." retry={() => detail.refetch()} />
  }

  const anime = detail.data
  const title = displayTitle(anime.title)

  async function handleStatusChange(status: string) {
    const current = entry.data?.currentEpisode ?? 0
    if (status === '') {
      await removeEntry.mutateAsync()
      return
    }
    await saveEntry.mutateAsync({ status: status as ListStatus, currentEpisode: current })
  }

  const wantWatchlist = searchParams.get('action') === 'watchlist'

  return (
    <div className="pb-20 lg:pb-0">
      <section aria-label={title} className="relative rounded-lg border border-line">
        {anime.bannerImage && (
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <Poster
              src={anime.bannerImage}
              alt=""
              eager
              className="h-full w-full object-cover object-top opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/45" />
          </div>
        )}
        <div className="relative z-10 flex flex-col gap-6 p-5 sm:p-8 lg:flex-row">
          <Poster
            src={anime.coverImage}
            alt={title}
            eager
            className="h-72 w-48 shrink-0 self-center rounded-xl border border-line shadow-2xl shadow-black/60 lg:self-start"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {anime.averageScore !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-control px-2.5 py-1 text-sm font-bold text-warning ring-1 ring-control-border">
                  <span className="text-xs" aria-hidden="true">★</span>
                  {formatScore(anime.averageScore)}
                </span>
              )}
              {anime.format && (
                <span className="rounded-full bg-control px-2.5 py-1 text-xs font-medium text-ink-2 ring-1 ring-control-border">
                  {anime.format}
                </span>
              )}
              <span className="rounded-full bg-control px-2.5 py-1 text-xs font-medium text-ink-2 ring-1 ring-control-border">
                {formatStatus(anime.status)}
              </span>
              {anime.seasonYear && (
                <span className="rounded-full bg-control px-2.5 py-1 text-xs font-medium text-ink-2 ring-1 ring-control-border">
                  {formatSeason(anime.season, anime.seasonYear)}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
            {(anime.title.english || anime.title.native) && (
              <p className="mt-1 text-sm text-ink-2">
                {[anime.title.english, anime.title.native]
                  .filter(Boolean)
                  .filter((t) => t !== title)
                  .join(' · ')}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2">
              {anime.popularity !== null && <span>{anime.popularity.toLocaleString()} popularity</span>}
              {anime.episodes !== null && anime.format !== 'MOVIE' && <span>{anime.episodes} episodes</span>}
              {anime.duration !== null && <span>{anime.duration} min/ep</span>}
              {anime.country && <span>{anime.country}</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to={`/compare?ids=${anime.id}`}
                className="rounded-full border border-line bg-surface-raised/40 px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent-strong"
              >
                Compare with other anime
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: displayTitle(anime.title),
                      text: `Check out ${displayTitle(anime.title)} on Ranime!`,
                      url: window.location.href,
                    }).catch(() => {})
                  } else {
                    navigator.clipboard.writeText(window.location.href)
                    toast('Link copied to clipboard!')
                  }
                }}
                className="rounded-full border border-line bg-surface-raised/40 px-3 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-accent hover:text-accent-strong"
              >
                🔗 Share
              </button>
              {anime.genres.map((g) => (
                <Link
                  key={g}
                  to={`/genres/${g.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-2 transition-colors hover:border-accent hover:text-accent-strong"
                >
                  {g}
                </Link>
              ))}
            </div>

            <div className="mt-6 hidden flex-wrap items-center gap-3 lg:flex">
              {user ? (
                <>
                  <StatusSelect
                    value={entry.data?.status ?? null}
                    onChange={handleStatusChange}
                    disabled={saveEntry.isPending || removeEntry.isPending}
                  />
                  {entry.data && anime.format !== 'MOVIE' && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ink-2">Episodes</span>
                      <EpisodeStepper
                        value={entry.data.currentEpisode ?? 0}
                        max={anime.episodes ?? undefined}
                        disabled={saveEntry.isPending}
                        onCommit={(ep) =>
                          entry.data && saveEntry.mutate({ status: entry.data.status, currentEpisode: ep })
                        }
                      />
                    </div>
                  )}
                  {entry.data?.status === 'WATCHING' &&
                    anime.episodes !== null &&
                    (entry.data.currentEpisode ?? 0) >= anime.episodes &&
                    anime.episodes > 0 && (
                      <Button
                        onClick={() =>
                          saveEntry.mutate({
                            status: 'COMPLETED',
                            currentEpisode: anime.episodes ?? 0,
                          })
                        }
                        className="bg-positive text-background hover:bg-emerald-500"
                      >
                        Mark as completed
                      </Button>
                    )}
                  {entry.data && (
                    <Button variant="secondary" onClick={() => removeEntry.mutate()} className="border-line-strong text-ink-2 hover:border-danger hover:text-danger">
                      Remove
                    </Button>
                  )}
                  <StarRating
                    value={ratings.data?.myScore ?? null}
                    onChange={(score) => {
                      if (score === 0) rate.mutate(0)
                      else rate.mutate(score)
                    }}
                    disabled={rate.isPending}
                  />
                </>
              ) : (
                <Link to={`/login?next=${encodeURIComponent(`/anime/${animeId}`)}`} className={buttonClass('primary')}>
                  Login to track, rate and review
                </Link>
              )}
            </div>

            {user ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 lg:hidden">
                <StatusSelect
                  value={entry.data?.status ?? null}
                  onChange={handleStatusChange}
                  disabled={saveEntry.isPending || removeEntry.isPending}
                />
                <StarRating
                  value={ratings.data?.myScore ?? null}
                  onChange={(score) => {
                    if (score === 0) rate.mutate(0)
                    else rate.mutate(score)
                  }}
                  disabled={rate.isPending}
                />
                {entry.data && anime.format !== 'MOVIE' && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-2">Episodes</span>
                    <EpisodeStepper
                      value={entry.data.currentEpisode ?? 0}
                      max={anime.episodes ?? undefined}
                      disabled={saveEntry.isPending}
                      onCommit={(ep) =>
                        entry.data && saveEntry.mutate({ status: entry.data.status, currentEpisode: ep })
                      }
                    />
                  </div>
                )}
                {entry.data?.status === 'WATCHING' &&
                  anime.episodes !== null &&
                  (entry.data.currentEpisode ?? 0) >= anime.episodes &&
                  anime.episodes > 0 && (
                    <Button
                      onClick={() =>
                        saveEntry.mutate({
                          status: 'COMPLETED',
                          currentEpisode: anime.episodes ?? 0,
                        })
                      }
                      className="bg-positive text-background hover:bg-emerald-500"
                    >
                      Mark as completed
                    </Button>
                  )}
                {entry.data && (
                  <Button variant="secondary" onClick={() => removeEntry.mutate()} className="border-line-strong text-ink-2 hover:border-danger hover:text-danger">
                    Remove
                  </Button>
                )}
              </div>
            ) : (
              <div className="mt-4 lg:hidden">
                <Link to={`/login?next=${encodeURIComponent(`/anime/${animeId}`)}`} className={buttonClass('primary')}>
                  Login to track, rate and review
                </Link>
              </div>
            )}

            {wantWatchlist && !user && (
              <p className="mt-3 text-sm text-warning">Login required to add anime to your watchlist.</p>
            )}
          </div>
        </div>
      </section>

      {user && (
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3rem)] z-30 border-t border-line bg-background/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-2.5">
            <StatusSelect
              value={entry.data?.status ?? null}
              onChange={handleStatusChange}
              disabled={saveEntry.isPending || removeEntry.isPending}
              className="min-w-0 flex-1"
              panelPlacement="up"
            />
            <StarRating
              value={ratings.data?.myScore ?? null}
              onChange={(score) => rate.mutate(score)}
              disabled={rate.isPending}
              variant="pill"
              menuPlacement="up"
            />
          </div>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <Section title="Synopsis">
            <p className="max-w-prose whitespace-pre-line break-words text-sm leading-relaxed text-ink-2">
              {stripHtml(anime.description) || 'Synopsis unavailable.'}
            </p>
          </Section>

          <Section title="Information">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              <InfoItem label="Format" value={anime.format ?? '-'} />
              <InfoItem label="Episodes" value={anime.episodes ?? '-'} />
              <InfoItem label="Duration" value={anime.duration ? `${anime.duration} min/ep` : '-'} />
              <InfoItem label="Status" value={formatStatus(anime.status)} />
              <InfoItem label="Start date" value={formatDate(anime.startDate)} />
              <InfoItem label="End date" value={formatDate(anime.endDate)} />
              <InfoItem label="Season" value={formatSeason(anime.season, anime.seasonYear) || '-'} />
              <InfoItem
                label="Studios"
                value={
                  anime.studios.length ? (
                    <span className="flex flex-wrap gap-x-2 gap-y-1">
                      {anime.studios.map((s) => (
                        <Link
                          key={s}
                          to={`/studios/${s.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          className="text-accent underline-offset-2 transition-colors hover:text-accent-strong hover:underline"
                        >
                          {s}
                        </Link>
                      ))}
                    </span>
                  ) : (
                    '-'
                  )
                }
              />
              <InfoItem label="Source" value={anime.source ? formatStatus(anime.source) : '-'} />
              <InfoItem label="Country" value={anime.country ?? '-'} />
              <InfoItem
                label="Community rating"
                value={
                  ratings.data?.count
                    ? `${ratings.data.average?.toFixed(2) ?? '-'} (${ratings.data.count} votes)`
                    : 'No community ratings yet'
                }
              />
              <InfoItem label="Genres" value={anime.genres.length ? anime.genres.join(', ') : '-'} />
            </dl>
          </Section>

          <Section title="Characters">
            {characters.isPending ? (
              <CardGridSkeleton count={8} />
            ) : characters.isError ? (
              <ErrorState message="Characters are temporarily unavailable." />
            ) : characters.data.items.length === 0 ? (
              <EmptyState title="No characters available" />
            ) : (
              <>
                <div className="mb-4 flex items-center gap-1.5 overflow-x-auto rounded-sm border border-line bg-surface/40 p-1">
                  {(['ALL', 'MAIN', 'SUPPORTING'] as const).map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setCharRoleFilter(role)}
                      className={cn(
                        'rounded-xs px-2.5 py-1 text-xs font-medium transition-colors',
                        charRoleFilter === role ? 'bg-surface-raised text-ink' : 'text-ink-3 hover:text-ink',
                      )}
                    >
                      {role === 'ALL' ? 'All Roles' : role === 'MAIN' ? 'Main Cast' : 'Supporting'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {characters.data.items
                    .filter((c) => {
                      if (charRoleFilter === 'ALL') return true
                      return c.role.toUpperCase() === charRoleFilter
                    })
                    .map((c, idx) => (
                      <div key={`${c.id}-${c.role}-${idx}`} className="flex items-center gap-3 rounded-sm border border-line bg-surface/40 p-3 transition-colors hover:border-line-strong">
                        <Poster src={c.image} alt={c.name} className="h-16 w-12 rounded-sm shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                            <span className={cn(
                              'shrink-0 rounded-xs px-1.5 py-0.5 text-[10px] font-bold uppercase',
                              c.role.toUpperCase() === 'MAIN' ? 'bg-accent/15 text-accent-strong border border-accent/30' : 'bg-surface text-ink-3 border border-line'
                            )}>
                              {c.role}
                            </span>
                          </div>
                          <p className="truncate text-xs text-ink-3">{c.nameNative ?? ''}</p>
                          {c.voiceActor ? (
                            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-2">
                              <span className="text-ink-4">VA:</span>
                              <span className="truncate font-medium">{c.voiceActor.name}</span>
                              <span className="rounded-xs bg-surface-raised px-1 py-0.2 text-[9px] text-ink-3">
                                {c.voiceActor.language}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
                <Pagination
                  page={characters.data.page}
                  perPage={characters.data.perPage}
                  total={characters.data.total}
                  hasNextPage={characters.data.hasNextPage}
                  onPage={setCharPage}
                />
              </>
            )}
          </Section>

          <Section title="Staff">
            {staff.isPending ? (
              <CardGridSkeleton count={6} />
            ) : staff.isError ? (
              <ErrorState message="Staff data is temporarily unavailable." />
            ) : staff.data.length === 0 ? (
              <EmptyState title="No staff data available" />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {staff.data.map((s, idx) => (
                  <div key={`${s.id}-${s.role}-${idx}`} className="flex items-center gap-3 rounded-sm border border-line bg-surface/40 p-3">
                    <Poster src={s.image} alt={s.name} className="h-12 w-12 rounded-full" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-ink-3">{s.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <aside className="min-w-0 space-y-8">
          <Section title="Ratings">
            {ratings.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : ratings.isError ? (
              <ErrorState message="Ratings are temporarily unavailable." />
            ) : (
              <div className="rounded-md border border-line bg-surface/40 p-5">
                {ratings.data.count === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised">
                      <svg className="h-6 w-6 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink-2">No community ratings yet</p>
                      <p className="mt-1 text-xs text-ink-3">
                        Be the first to rate this anime and help build its score.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold tracking-tight text-warning">
                        {ratings.data.average?.toFixed(1) ?? '-'}
                      </span>
                      <svg className="h-4 w-4 self-center text-warning" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.077 10.1c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z" />
                      </svg>
                      <span className="text-sm font-medium text-ink-2">Community score</span>
                      <span className="text-sm text-ink-3">· {ratings.data.count} votes</span>
                    </div>
                  </>
                )}
                {ratings.data.distribution.length > 0 && (
                  <ul className="mt-4 space-y-1.5">
                    {ratings.data.distribution.map((d, idx) => (
                      <li key={`${d.score}-${idx}`} className="flex items-center gap-2 text-xs text-ink-2">
                        <span className="w-8 shrink-0 text-right">{d.score.toFixed(1)}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-raised">
                          <div
                            className="h-full rounded-full bg-warning/70"
                            style={{ width: `${(d.count / ratings.data.count) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 shrink-0 text-ink-3">{d.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {ratings.data.recent.length > 0 && (
                  <ul className="mt-4 space-y-1 border-t border-line pt-3">
                    {ratings.data.recent.slice(0, 5).map((r) => (
                      <li key={r.id} className="flex items-center justify-between text-xs">
                        <Link to={`/profile/${r.username}`} className="truncate text-ink-2 transition-colors hover:text-ink">
                          {r.username}
                        </Link>
                        <span className="text-ink-3">
                          {r.score.toFixed(1)} · {timeAgo(r.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Section>

          {anime.nextAiring && (
            <Section title="Next episode">
              <div className="rounded-sm border border-line bg-surface/40 p-4">
                <p className="text-sm text-ink">Episode {anime.nextAiring.episode}</p>
                <p className="mt-1 text-sm text-ink-3">{formatDate(new Date(anime.nextAiring.airingAt * 1000).toISOString())}</p>
                <p className="mt-2 inline-block rounded-sm bg-surface-raised px-2 py-1 text-sm font-medium text-accent-strong">
                  {countdown(anime.nextAiring.airingAt)}
                </p>
              </div>
            </Section>
          )}

          <Section title="Franchise & Relations">
            {relations.isPending ? (
              <Skeleton className="h-32 w-full" />
            ) : relations.isError ? (
              <ErrorState message="Relations are temporarily unavailable." />
            ) : relations.data.length === 0 ? (
              <EmptyState title="No relations found" />
            ) : (
              <div className="relative border-l-2 border-accent/40 pl-3 ml-2 space-y-3">
                {relations.data.map((r, idx) => (
                  <div key={`${r.anime.id}-${r.relationType}-${idx}`} className="relative">
                    <div className="absolute -left-[19px] top-4 h-2.5 w-2.5 rounded-full border-2 border-accent bg-background" />
                    <Link
                      to={`/anime/${r.anime.id}`}
                      className="group flex items-center gap-3 rounded-sm border border-line bg-surface/40 p-2.5 transition-all hover:border-accent hover:bg-surface"
                    >
                      <Poster src={r.anime.coverImage} alt={displayTitle(r.anime.title)} className="h-16 w-12 shrink-0 rounded-sm shadow-xs transition-transform group-hover:scale-105" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-xs bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-strong border border-accent/25">
                            {r.relationType.replace(/_/g, ' ')}
                          </span>
                          {r.anime.averageScore && (
                            <span className="text-[10px] font-bold text-warning">
                              ★{formatScore(r.anime.averageScore)}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs font-semibold text-ink group-hover:text-accent-strong transition-colors">
                          {displayTitle(r.anime.title)}
                        </p>
                        <p className="text-[10px] text-ink-3">
                          {[r.anime.format, r.anime.status ? formatStatus(r.anime.status) : null].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </aside>
      </div>

      <Section title="Recommendations">
        {recommendations.isPending ? (
          <CardGridSkeleton count={6} />
        ) : recommendations.isError ? (
          <ErrorState message="Recommendations are temporarily unavailable." />
        ) : recommendations.data.items.length === 0 ? (
          <EmptyState title="No recommendations yet" />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 lg:grid-cols-5">
            {recommendations.data.items.map((r, idx) => (
              <AnimeCardView key={`${r.id}-${idx}`} anime={r} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Reviews">
        {user ? (
          <div className="mb-6">
            {myReview.isPending ? (
              <Skeleton className="h-20 w-full" />
            ) : myReview.data && !reviewFormOpen && !editingReview ? (
              <ReviewCard
                review={myReview.data}
                canEdit
                onEdit={() => setEditingReview(true)}
                onDelete={() => setDeleteTarget(myReview.data!.id)}
              />
            ) : reviewFormOpen || editingReview ? (
              <ReviewForm
                initial={myReview.data ?? null}
                submitting={reviewMutation.isPending}
                onSubmit={(input) => reviewMutation.mutate(input)}
                onCancel={() => {
                  setReviewFormOpen(false)
                  setEditingReview(false)
                }}
              />
            ) : (
              <Button variant="secondary" onClick={() => setReviewFormOpen(true)}>
                Write a review
              </Button>
            )}
          </div>
        ) : (
          <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-md border border-line bg-surface/30 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-ink">Want to write a review?</p>
              <p className="text-xs text-ink-3">Log in to your account to share your rating and review with the community.</p>
            </div>
            <Link
              to={`/login?next=${encodeURIComponent(`/anime/${animeId}`)}`}
              className="inline-flex shrink-0 items-center justify-center rounded-sm bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-strong"
            >
              Login to write a review
            </Link>
          </div>
        )}

        {reviews.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : reviews.isError ? (
          <ErrorState message="Reviews are temporarily unavailable." />
        ) : reviews.data.total === 0 && !myReview.data ? (
          <EmptyState title="No reviews yet" hint="Be the first to write a review for this anime." />
        ) : (
          <>
            <div className="space-y-4">
              {reviews.data.items.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  canEdit={user?.id === r.user.id}
                  onEdit={() => {
                    setEditingReview(true)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  onDelete={() => setDeleteTarget(r.id)}
                />
              ))}
            </div>
            <Pagination
              page={reviews.data.page}
              perPage={reviews.data.perPage}
              total={reviews.data.total}
              hasNextPage={reviews.data.hasNextPage}
              onPage={setReviewPage}
            />
          </>
        )}
      </Section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Review?"
        description="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel="Delete"
        confirming={deleteReviewMutation.isPending}
        onConfirm={() => deleteTarget && deleteReviewMutation.mutate(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
