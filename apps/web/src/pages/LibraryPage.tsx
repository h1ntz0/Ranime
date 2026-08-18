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
      <h1 className="text-xl font-semibold tracking-tight text-ink">My Library</h1>
      <p className="mt-1 text-sm text-ink-3">Track what you are watching.</p>

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
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
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
        ) : (
          <>
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
            <Pagination
              page={data.data.page}
              perPage={data.data.perPage}
              total={data.data.total}
              hasNextPage={data.data.hasNextPage}
              onPage={(p) => update({ page: p })}
            />
          </>
        )}
      </div>
    </div>
  )
}