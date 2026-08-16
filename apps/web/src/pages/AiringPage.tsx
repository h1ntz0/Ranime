import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchAiring } from '../lib/api'
import { Poster } from '../components/Poster'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { countdown, displayTitle, formatDate, formatScore } from '../lib/format'

export default function AiringPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  const data = useQuery({
    queryKey: ['airing', page],
    queryFn: ({ signal }) => fetchAiring(page, signal),
    placeholderData: (prev) => prev,
  })

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Currently Airing</h1>
      <p className="mt-1 text-sm text-ink-3">Anime with a confirmed next episode.</p>

      <div className="mt-8">
        {data.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : data.isError ? (
          <ErrorState message="Airing schedule is temporarily unavailable." retry={() => data.refetch()} />
        ) : data.data.items.length === 0 ? (
          <EmptyState title="Nothing is airing right now" hint="Check back when a new season starts." />
        ) : (
          <>
            <ul className="space-y-3">
              {data.data.items.map((anime) => (
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
            <Pagination
              page={data.data.page}
              perPage={data.data.perPage}
              total={data.data.total}
              hasNextPage={data.data.hasNextPage}
              onPage={(p) => setSearchParams({ page: String(p) })}
            />
          </>
        )}
      </div>
    </div>
  )
}
