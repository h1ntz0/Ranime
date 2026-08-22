import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchAnimeList, fetchGenres } from '../lib/api'
import { AnimeCardGrid } from '../components/AnimeCard'
import { CardGridSkeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { Pagination } from '../components/Pagination'
import { CustomSelect } from '../components/ui/CustomSelect'
import type { ListParams } from '../lib/api'

const SORTS: { value: string; label: string }[] = [
  { value: 'POPULARITY', label: 'Popularity' },
  { value: 'SCORE', label: 'Score' },
  { value: 'TRENDING', label: 'Trending' },
  { value: 'NEWEST', label: 'Newest' },
  { value: 'OLDEST', label: 'Oldest' },
  { value: 'TITLE_AZ', label: 'Title A-Z' },
  { value: 'TITLE_ZA', label: 'Title Z-A' },
  { value: 'EPISODES', label: 'Episodes' },
]

const FORMATS = [
  { value: '', label: 'Any' },
  { value: 'TV', label: 'TV' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Special' },
  { value: 'MUSIC', label: 'Music' },
]

const STATUSES = [
  { value: '', label: 'Any' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'RELEASING', label: 'Releasing' },
  { value: 'NOT_YET_RELEASED', label: 'Not yet released' },
]

const SEASONS = [
  { value: '', label: 'Any' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'SPRING', label: 'Spring' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'FALL', label: 'Fall' },
]

const SCORES = [
  { value: '', label: 'Any' },
  { value: '5', label: '5+' },
  { value: '6', label: '6+' },
  { value: '7', label: '7+' },
  { value: '7.5', label: '7.5+' },
  { value: '8', label: '8+' },
  { value: '8.5', label: '8.5+' },
  { value: '9', label: '9+' },
]

const YEARS = Array.from({ length: 68 }, (_, i) => {
  const y = 2027 - i
  return { value: String(y), label: String(y) }
})

type ActiveFilter = { label: string; clear: () => void }

type FilterFieldsProps = {
  params: ListParams
  genres: readonly { id: number; name: string }[]
  onUpdate: (next: Record<string, string | number | null | undefined>) => void
}

function FilterFields({ params, genres, onUpdate }: FilterFieldsProps) {
  return (
    <>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        Genre
        <CustomSelect
          ariaLabel="Filter by genre"
          value={params.genre ?? ''}
          onChange={(v) => onUpdate({ genre: v || undefined, page: 1 })}
          options={genres.map((g) => ({ value: g.name, label: g.name }))}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        Year
        <CustomSelect
          ariaLabel="Filter by year"
          value={params.year !== undefined ? String(params.year) : ''}
          onChange={(v) => onUpdate({ year: v ? Number(v) : undefined, page: 1 })}
          options={YEARS}
          placeholder="Any"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        Season
        <CustomSelect
          ariaLabel="Filter by season"
          value={params.season ?? ''}
          onChange={(v) => onUpdate({ season: (v || undefined) as ListParams['season'], page: 1 })}
          options={SEASONS}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        Format
        <CustomSelect
          ariaLabel="Filter by format"
          value={params.format ?? ''}
          onChange={(v) => onUpdate({ format: v || undefined, page: 1 })}
          options={FORMATS}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        Status
        <CustomSelect
          ariaLabel="Filter by status"
          value={params.status ?? ''}
          onChange={(v) => onUpdate({ status: v || undefined, page: 1 })}
          options={STATUSES}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        Min score
        <CustomSelect
          ariaLabel="Filter by minimum score"
          value={params.minScore !== undefined ? String(params.minScore) : ''}
          onChange={(v) => onUpdate({ minScore: v ? Number(v) : undefined, page: 1 })}
          options={SCORES}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-ink-3">
        Sort
        <CustomSelect
          ariaLabel="Sort results"
          value={params.sort ?? 'POPULARITY'}
          onChange={(v) => onUpdate({ sort: v, page: 1 })}
          options={SORTS}
        />
      </label>
    </>
  )
}

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [debounced, setDebounced] = useState('')

  const params: ListParams = {
    q: searchParams.get('q') ?? undefined,
    genre: searchParams.get('genre') ?? undefined,
    year: searchParams.get('year') ? Number(searchParams.get('year')) : undefined,
    season: (searchParams.get('season') as ListParams['season']) ?? undefined,
    format: searchParams.get('format') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    minScore: searchParams.get('minScore') ? Number(searchParams.get('minScore')) : undefined,
    sort: searchParams.get('sort') ?? 'POPULARITY',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
  }

  const query = searchParams.get('q') ?? ''

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 350)
    return () => clearTimeout(t)
  }, [query])

  const data = useQuery({
    queryKey: ['explore', { ...params, q: debounced }],
    queryFn: ({ signal }) => fetchAnimeList({ ...params, q: debounced || undefined }, signal),
    placeholderData: (prev) => prev,
  })

  const genres = useQuery({ queryKey: ['genres'], queryFn: ({ signal }) => fetchGenres(signal) })

  const queryClient = useQueryClient()

  function update(next: Record<string, string | number | null | undefined>) {
    const merged: Record<string, string> = {}
    const candidates: [string, unknown][] = [
      ['q', next.q !== undefined ? next.q : query],
      ['genre', next.genre !== undefined ? next.genre : params.genre],
      ['year', next.year !== undefined ? next.year : params.year],
      ['season', next.season !== undefined ? next.season : params.season],
      ['format', next.format !== undefined ? next.format : params.format],
      ['status', next.status !== undefined ? next.status : params.status],
      ['minScore', next.minScore !== undefined ? next.minScore : params.minScore],
      ['sort', next.sort ?? params.sort],
      ['page', next.page ?? params.page],
    ]
    for (const [key, value] of candidates) {
      if (value !== undefined && value !== null && value !== '') merged[key] = String(value)
    }
    setSearchParams(merged)
    queryClient.removeQueries({ queryKey: ['explore'] })
  }

  const activeFilters: ActiveFilter[] = []
  if (hasQueryValue(params.q)) activeFilters.push({ label: `Search: ${params.q}`, clear: () => update({ q: '', page: 1 }) })
  if (params.genre) activeFilters.push({ label: `Genre: ${params.genre}`, clear: () => update({ genre: '', page: 1 }) })
  if (params.year) activeFilters.push({ label: `Year: ${params.year}`, clear: () => update({ year: '', page: 1 }) })
  if (params.season) activeFilters.push({ label: `Season: ${params.season.toLowerCase()}`, clear: () => update({ season: '', page: 1 }) })
  if (params.format) activeFilters.push({ label: `Format: ${params.format}`, clear: () => update({ format: '', page: 1 }) })
  if (params.status) activeFilters.push({ label: `Status: ${params.status.toLowerCase().replace(/_/g, ' ')}`, clear: () => update({ status: '', page: 1 }) })
  if (params.minScore !== undefined) activeFilters.push({ label: `Score: ${params.minScore}+`, clear: () => update({ minScore: '', page: 1 }) })

  const [drawerOpen, setDrawerOpen] = useState(false)
  const filterCount = activeFilters.length

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Explore</h1>
          <p className="mt-1 text-sm text-ink-3">Discover anime by genre, season, format and score.</p>
        </div>
        <form
          role="search"
          className="w-full sm:w-auto sm:min-w-72"
          onSubmit={(e) => {
            e.preventDefault()
            update({ page: 1 })
          }}
        >
          <label htmlFor="search" className="sr-only">
            Search anime
          </label>
          <input
            id="search"
            type="search"
            value={query}
            onChange={(e) => update({ q: e.target.value, page: 1 })}
            placeholder="Search anime… (e.g. Frieren)"
            className="w-full rounded-sm border border-line bg-surface px-3 py-1.5 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-6 hidden grid-cols-2 gap-3 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        <FilterFields params={params} genres={genres.data ?? []} onUpdate={update} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-sm border border-line bg-surface px-3.5 text-sm text-ink transition-colors hover:border-line-strong"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
        >
          <svg className="h-4 w-4 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Filter &amp; Sort
          {filterCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-background">
              {filterCount}
            </span>
          )}
        </button>
        {filterCount > 0 && (
          <button
            type="button"
            onClick={() => update({ q: '', genre: '', year: '', season: '', format: '', status: '', minScore: '', page: 1 })}
            className="px-2 text-xs text-ink-3 underline-offset-2 transition-colors hover:text-ink hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {activeFilters.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {activeFilters.map((f) => (
            <button
              key={f.label}
              type="button"
              onClick={f.clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-raised/60 px-2.5 py-1 text-xs text-ink-2 transition-colors hover:border-accent hover:text-ink"
            >
              {f.label}
              <span aria-hidden="true" className="text-ink-4">×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => update({ q: '', genre: '', year: '', season: '', format: '', status: '', minScore: '', page: 1 })}
            className="px-2 text-xs text-ink-3 underline-offset-2 transition-colors hover:text-ink hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="mt-8 relative">
        {data.isFetching && !data.isPending && (
          <div className="absolute inset-0 z-20 flex items-start justify-center pt-24 bg-background/50 backdrop-blur-2xs transition-opacity animate-in fade-in">
            <div className="flex items-center gap-3 rounded-full border border-line bg-surface-raised px-4 py-2 shadow-xl">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <span className="text-xs font-semibold text-ink">Filtering anime...</span>
            </div>
          </div>
        )}

        {data.isPending ? (
          <CardGridSkeleton />
        ) : data.isError ? (
          <ErrorState
            message={
              data.error instanceof Error
                ? data.error.message
                : 'Anime data is temporarily unavailable. Please try again later.'
            }
            retry={() => data.refetch()}
          />
        ) : data.data.items.length === 0 ? (
          <EmptyState title="No results found" hint="Try adjusting your search or filters." icon="search" />
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-3">
              {data.data.total} result{data.data.total === 1 ? '' : 's'}
            </p>
            <AnimeCardGrid items={data.data.items} />
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

      {drawerOpen && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Filter and sort">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close filters"
          />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-md border-t border-line bg-background shadow-2xl shadow-black/50 animate-pop-in">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Filter &amp; Sort</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-surface-raised hover:text-ink"
                aria-label="Close filters"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="slim-scrollbar grid grid-cols-1 gap-x-3 gap-y-4 overflow-y-auto px-4 py-4">
              <FilterFields params={params} genres={genres.data ?? []} onUpdate={update} />
            </div>
            <div className="flex items-center gap-3 border-t border-line px-4 py-3">
              <button
                type="button"
                onClick={() => update({ q: '', genre: '', year: '', season: '', format: '', status: '', minScore: '', page: 1 })}
                className="h-11 flex-1 rounded-sm border border-line px-3 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="h-11 flex-1 rounded-sm bg-ink px-3 text-sm font-medium text-background transition-colors hover:bg-white"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function hasQueryValue(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== ''
}