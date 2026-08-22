import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchGenres, fetchLibrary, fetchStatusCounts, removeWatchlist, updateWatchlist } from '../lib/api'
import { LibraryRow, LibraryRowActions } from '../components/library/LibraryRow'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { useToast } from '../context/ToastContext'
import { buttonClass } from '../components/ui/buttonStyles'
import { CustomSelect } from '../components/ui/CustomSelect'
import { Poster } from '../components/Poster'
import { displayTitle, formatScore } from '../lib/format'
import { cn } from '../lib/cn'
import type { LibraryParams } from '../lib/api'
import { STATUS_LABELS, type ListStatus } from '../lib/types'

const TABS: { value: ListStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'WATCHING', label: 'Watching' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'DROPPED', label: 'Dropped' },
]

const SORTS = [
  { value: 'RECENTLY_UPDATED', label: 'Recently Updated' },
  { value: 'RECENTLY_ADDED', label: 'Recently Added' },
  { value: 'RATING', label: 'Rating' },
  { value: 'TITLE', label: 'Title' },
  { value: 'PROGRESS', label: 'Progress' },
]

const selectClass =
  'rounded-sm border border-line bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors focus:border-accent focus:outline-none'

export default function LibraryPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [debounced, setDebounced] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const statusValue = (TABS.find((t) => t.value === searchParams.get('status'))?.value ?? '') as ListStatus | ''
  const status: ListStatus | undefined = statusValue === '' ? undefined : statusValue
  const q = searchParams.get('q') ?? ''
  const genre = searchParams.get('genre') ?? undefined
  const minScore = searchParams.get('minScore') ? Number(searchParams.get('minScore')) : undefined
  const sort = searchParams.get('sort') ?? 'RECENTLY_UPDATED'
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 350)
    return () => clearTimeout(t)
  }, [q])

  const params: LibraryParams = {
    status: status || undefined,
    q: debounced || undefined,
    genre,
    minScore,
    sort,
    page,
  }

  const data = useQuery({
    queryKey: ['library', params],
    queryFn: ({ signal }) => fetchLibrary(params, signal),
    placeholderData: (prev) => prev,
  })

  const continueWatching = useQuery({
    queryKey: ['library', 'continue-watching'],
    queryFn: ({ signal }) => fetchLibrary({ status: 'WATCHING', sort: 'RECENTLY_UPDATED', page: 1 }, signal),
    placeholderData: (prev) => prev,
  })

  const genres = useQuery({ queryKey: ['genres'], queryFn: ({ signal }) => fetchGenres(signal) })

  const counts = useQuery({
    queryKey: ['library', 'counts'],
    queryFn: ({ signal }) => fetchStatusCounts(signal),
  })

  const mutation = useMutation({
    mutationFn: ({
      animeId,
      input,
      remove,
    }: {
      animeId: number
      input?: { status: ListStatus; currentEpisode: number }
      remove?: boolean
    }) => (remove ? removeWatchlist(animeId) : updateWatchlist(animeId, input!)),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['library'] })
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['statistics'] })
      toast(vars.remove ? 'Removed from library' : 'Library updated')
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
  })

  function update(next: { status?: string; q?: string; genre?: string; minScore?: number; sort?: string; page?: number }) {
    const merged: Record<string, string> = {}
    const candidates: [string, unknown][] = [
      ['status', next.status !== undefined ? next.status : statusValue],
      ['q', next.q !== undefined ? next.q : q],
      ['genre', next.genre !== undefined ? next.genre : genre],
      ['minScore', next.minScore !== undefined ? next.minScore : minScore],
      ['sort', next.sort ?? sort],
      ['page', next.page ?? 1],
    ]
    for (const [key, value] of candidates) {
      if (value !== undefined && value !== '') merged[key] = String(value)
    }
    setSearchParams(merged)
  }

  const tabClass = (active: boolean) =>
    `rounded-sm px-3 py-1.5 text-sm whitespace-nowrap transition-colors ${active ? 'bg-surface-raised font-medium text-ink' : 'text-ink-2 hover:text-ink'}`

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">My Library</h1>
          <p className="mt-1 text-sm text-ink-3">Track what you are watching.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 rounded-sm border border-line bg-surface/60 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-label="List view"
            className={cn(
              'flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors',
              viewMode === 'list' ? 'bg-surface-raised text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            aria-label="Grid view"
            className={cn(
              'flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors',
              viewMode === 'grid' ? 'bg-surface-raised text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            Grid
          </button>
        </div>
      </div>

      {continueWatching.data && continueWatching.data.items.length > 0 && (
        <section aria-label="Continue watching" className="mt-6">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full bg-accent" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-ink">Continue Watching</h2>
          </div>
          <ul className="space-y-3">
            {continueWatching.data.items.slice(0, 4).map((entry) => (
              <LibraryRow key={entry.id} entry={entry} />
            ))}
          </ul>
        </section>
      )}

      <div role="tablist" aria-label="Library status" className="mt-6 flex gap-1 overflow-x-auto rounded-sm border border-line bg-surface/60 p-1">
        {TABS.map((t) => {
          const c = counts.data
            ? t.value === ''
              ? Object.values(counts.data).reduce((a, b) => a + b, 0)
              : (counts.data[t.value as ListStatus] ?? 0)
            : undefined
          return (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={status === t.value}
              className={tabClass(status === t.value)}
              onClick={() => update({ status: t.value, page: 1 })}
            >
              <span className="flex items-center gap-1.5">
                {t.label}
                {c !== undefined && c > 0 && (
                  <span className="rounded-full bg-surface-raised px-1.5 py-0.5 text-[10px] leading-none text-ink-3">
                    {c}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          Title
          <input
            type="search"
            value={q}
            onChange={(e) => update({ q: e.target.value, page: 1 })}
            placeholder="Search your library…"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          Genre
          <CustomSelect
            ariaLabel="Filter library by genre"
            value={genre ?? ''}
            onChange={(v) => update({ genre: v || undefined, page: 1 })}
            options={(genres.data ?? []).map((g) => ({ value: g.slug, label: g.name }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          Min score
          <CustomSelect
            ariaLabel="Filter library by minimum score"
            value={minScore !== undefined ? String(minScore) : ''}
            onChange={(v) => update({ minScore: v ? Number(v) : undefined, page: 1 })}
            options={[
              { value: '', label: 'Any' },
              { value: '5', label: '5+' },
              { value: '6', label: '6+' },
              { value: '7', label: '7+' },
              { value: '7.5', label: '7.5+' },
              { value: '8', label: '8+' },
              { value: '8.5', label: '8.5+' },
              { value: '9', label: '9+' },
            ]}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-3">
          Sort
          <CustomSelect
            ariaLabel="Sort library"
            value={sort}
            onChange={(v) => update({ sort: v, page: 1 })}
            options={SORTS}
          />
        </label>
      </div>

      <div className="mt-6">
        {data.isPending ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'space-y-3'}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'aspect-[2/3] w-full rounded-sm' : 'h-24 w-full'} />
            ))}
          </div>
        ) : data.isError ? (
          <ErrorState message="Library is temporarily unavailable." retry={() => data.refetch()} />
        ) : data.data.items.length === 0 ? (
          <EmptyState
            title={status ? `Nothing ${STATUS_LABELS[status].toLowerCase()} yet` : 'Your library is empty'}
            hint={
              status
                ? 'Items in this status will appear here.'
                : 'Start exploring anime and add something you want to watch.'
            }
            icon="library"
            action={
              <Link to="/explore" className={buttonClass('secondary')}>
                Explore Anime
              </Link>
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {data.data.items.map((entry) => {
              const anime = entry.anime

              return (
                <div key={entry.id} className="group relative flex flex-col gap-1.5">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-line bg-surface transition-all group-hover:border-line-strong">
                    <Link to={`/anime/${anime.id}`} className="block h-full w-full">
                      <Poster
                        src={anime.coverImage}
                        alt={displayTitle(anime.title)}
                        className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </Link>

                    {/* Badge status */}
                    <span className="absolute left-1.5 top-1.5 rounded-xs bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-ink-2 backdrop-blur">
                      {STATUS_LABELS[entry.status]}
                    </span>

                    {/* Score badge */}
                    {anime.averageScore !== null && (
                      <span className="absolute right-1.5 top-1.5 rounded-xs bg-positive/90 px-1.5 py-0.5 text-[10px] font-bold text-background backdrop-blur">
                        {formatScore(anime.averageScore)}★
                      </span>
                    )}

                    {/* Progress overlay at bottom of poster */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/80 to-transparent p-2 pt-4">
                      <div className="flex items-center justify-between text-xs font-semibold text-ink">
                        <span>
                          Ep {entry.currentEpisode}
                        </span>
                        <button
                          type="button"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              animeId: anime.id,
                              input: {
                                status: entry.status,
                                currentEpisode: entry.currentEpisode + 1,
                              },
                            })
                          }
                          className="rounded-xs bg-accent px-1.5 py-0.5 text-[10px] font-bold text-background shadow transition-transform active:scale-95"
                        >
                          +1 Ep
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <Link
                      to={`/anime/${anime.id}`}
                      className="block truncate text-xs font-semibold text-ink-2 hover:text-ink"
                      title={displayTitle(anime.title)}
                    >
                      {displayTitle(anime.title)}
                    </Link>
                    <p className="truncate text-[11px] text-ink-3">
                      {anime.format ?? ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <ul className="space-y-3">
            {data.data.items.map((entry) => (
              <LibraryRow
                key={entry.id}
                entry={entry}
                actions={
                  <LibraryRowActions
                    entry={entry}
                    actions={{
                      disabled: mutation.isPending,
                      onStatus: (s) =>
                        mutation.mutate({
                          animeId: entry.anime.id,
                          input: { status: s, currentEpisode: entry.currentEpisode },
                        }),
                      onEpisode: (ep) =>
                        mutation.mutate({
                          animeId: entry.anime.id,
                          input: { status: entry.status, currentEpisode: ep },
                        }),
                      onRemove: () => mutation.mutate({ animeId: entry.anime.id, remove: true }),
                    }}
                  />
                }
              />
            ))}
          </ul>
        )}

        <Pagination
          page={data.data?.page ?? 1}
          perPage={data.data?.perPage ?? 20}
          total={data.data?.total ?? 0}
          hasNextPage={data.data?.hasNextPage ?? false}
          onPage={(p) => update({ page: p })}
        />
      </div>
    </div>
  )
}
