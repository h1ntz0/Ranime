import { useQuery } from '@tanstack/react-query'
import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchAiring } from '../lib/api'
import { Poster } from '../components/Poster'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { countdown, displayTitle, formatDate, formatScore } from '../lib/format'
import { cn } from '../lib/cn'

const DAYS = [
  { id: 'all', label: 'All Days', short: 'All' },
  { id: '0', label: 'Sunday', short: 'Sun' },
  { id: '1', label: 'Monday', short: 'Mon' },
  { id: '2', label: 'Tuesday', short: 'Tue' },
  { id: '3', label: 'Wednesday', short: 'Wed' },
  { id: '4', label: 'Thursday', short: 'Thu' },
  { id: '5', label: 'Friday', short: 'Fri' },
  { id: '6', label: 'Saturday', short: 'Sat' },
]

export default function AiringPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1
  const [selectedDay, setSelectedDay] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')

  const todayDay = new Date().getDay().toString()

  const data = useQuery({
    queryKey: ['airing', page],
    queryFn: ({ signal }) => fetchAiring(page, signal),
    placeholderData: (prev) => prev,
  })

  const filteredItems = useMemo(() => {
    if (!data.data?.items) return []
    if (selectedDay === 'all') return data.data.items
    return data.data.items.filter((anime) => {
      if (!anime.nextAiring) return false
      const airDate = new Date(anime.nextAiring.airingAt * 1000)
      return airDate.getDay().toString() === selectedDay
    })
  }, [data.data?.items, selectedDay])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Airing Schedule</h1>
          <p className="mt-1 text-sm text-ink-3">Live airing countdowns and weekly broadcast timetable.</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-sm border border-line bg-surface/60 p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={cn(
              'flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors',
              viewMode === 'calendar' ? 'bg-surface-raised text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.253 18.75m3-18.75H3.75a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 003.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3z" />
            </svg>
            Weekly Schedule
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              'flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium transition-colors',
              viewMode === 'list' ? 'bg-surface-raised text-ink' : 'text-ink-3 hover:text-ink',
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            List View
          </button>
        </div>
      </div>

      {/* Weekday Selector Bar */}
      {viewMode === 'calendar' && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {DAYS.map((day) => {
            const isToday = day.id === todayDay
            const isSelected = selectedDay === day.id
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDay(day.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors',
                  isSelected
                    ? 'border-accent bg-accent-soft/50 text-accent-strong'
                    : 'border-line bg-surface/40 text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                <span>{day.label}</span>
                {isToday && (
                  <span className="rounded-xs bg-accent px-1 py-0.2 text-[9px] font-bold text-background uppercase">
                    Today
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Content */}
      <div className="mt-4">
        {data.isPending ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : data.isError ? (
          <ErrorState message="Airing schedule is temporarily unavailable." retry={() => data.refetch()} />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            title={selectedDay !== 'all' ? `No anime airing on this day` : 'Nothing is airing right now'}
            hint="Try selecting another day or check back during the next season."
          />
        ) : viewMode === 'calendar' ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((anime) => {
              const airTime = anime.nextAiring
                ? new Date(anime.nextAiring.airingAt * 1000).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null

              return (
                <Link
                  key={anime.id}
                  to={`/anime/${anime.id}`}
                  className="group relative flex gap-3 overflow-hidden rounded-sm border border-line bg-surface/40 p-3 transition-all hover:border-line-strong hover:bg-surface"
                >
                  <Poster
                    src={anime.coverImage}
                    alt={displayTitle(anime.title)}
                    className="h-24 w-16 shrink-0 rounded-xs transition-transform group-hover:scale-105"
                  />
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="truncate text-sm font-semibold text-ink group-hover:text-accent-strong" title={displayTitle(anime.title)}>
                          {displayTitle(anime.title)}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-xs text-ink-3 truncate">
                        {anime.format ?? ''} {anime.genres?.slice(0, 2).join(' · ')}
                      </p>
                    </div>

                    {anime.nextAiring ? (
                      <div className="mt-2 rounded-xs border border-line/60 bg-background/60 p-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-ink-2">Ep {anime.nextAiring.episode}</span>
                          <span className="text-ink-3">{airTime}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] font-semibold text-accent-strong">
                          ⏳ {countdown(anime.nextAiring.airingAt)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-4">No schedule</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredItems.map((anime) => (
              <li key={anime.id}>
                <Link
                  to={`/anime/${anime.id}`}
                  className="flex items-center gap-4 rounded-sm border border-line bg-surface/40 p-3 transition-colors hover:border-line-strong"
                >
                  <Poster src={anime.coverImage} alt={displayTitle(anime.title)} className="h-20 w-14 shrink-0 rounded-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-medium text-ink">{displayTitle(anime.title)}</h3>
                      {anime.averageScore !== null && (
                        <span className="shrink-0 rounded bg-positive-soft px-1.5 py-0.5 text-xs font-semibold text-positive">
                          {formatScore(anime.averageScore)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-3">
                      {anime.format ?? ''}
                      {anime.episodes ? ` · ${anime.episodes} eps` : ''}
                    </p>
                  </div>
                  {anime.nextAiring ? (
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-medium text-ink-2">
                        Ep {anime.nextAiring.episode}
                      </p>
                      <p className="text-xs text-ink-3">{formatDate(new Date(anime.nextAiring.airingAt * 1000).toISOString())}</p>
                      <p className="mt-1 inline-block rounded-sm bg-surface-raised px-1.5 py-0.5 text-xs font-medium text-accent-strong">
                        {countdown(anime.nextAiring.airingAt)}
                      </p>
                    </div>
                  ) : (
                    <span className="hidden text-sm text-ink-4 sm:block">No schedule</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={data.data?.page ?? 1}
          perPage={data.data?.perPage ?? 20}
          total={data.data?.total ?? 0}
          hasNextPage={data.data?.hasNextPage ?? false}
          onPage={(p) => setSearchParams({ page: String(p) })}
        />
      </div>
    </div>
  )
}

