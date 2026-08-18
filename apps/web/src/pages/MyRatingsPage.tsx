import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchMyRatings } from '../lib/api'
import { displayTitle, timeAgo } from '../lib/format'
import { Poster } from '../components/Poster'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'

export default function MyRatingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  const data = useQuery({
    queryKey: ['my-ratings', page],
    queryFn: ({ signal }) => fetchMyRatings(page, signal),
    placeholderData: (prev) => prev,
  })

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">My Ratings</h1>
      <p className="mt-1 text-sm text-ink-3">Everything you have rated, most recent first.</p>

      <div className="mt-8">
        {data.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : data.isError ? (
          <ErrorState message="Ratings are temporarily unavailable." retry={() => data.refetch()} />
        ) : data.data.items.length === 0 ? (
          <EmptyState
            title="No ratings yet"
            hint="Rate an anime to build your personal favourites."
            icon="search"
            action={
              <Link to="/explore" className="rounded-sm bg-ink px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-white">
                Explore Anime
              </Link>
            }
          />
        ) : (
          <>
            <ul className="space-y-3">
              {data.data.items.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/anime/${r.anime.id}`}
                    className="flex items-center gap-4 rounded-sm border border-line bg-surface/40 p-3 transition-colors hover:border-line-strong"
                  >
                    <Poster src={r.anime.coverImage} alt="" className="h-20 w-14 shrink-0 rounded-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{displayTitle(r.anime.title)}</p>
                      <p className="mt-0.5 text-xs text-ink-3">
                        {r.anime.format ?? 'Anime'}
                        {r.anime.averageScore !== null ? ` · community ${(r.anime.averageScore / 10).toFixed(1)}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-4">{timeAgo(r.createdAt)}</p>
                    </div>
                    <span className="shrink-0 rounded-sm bg-positive-soft px-2 py-1 text-sm font-semibold text-positive">
                      {r.score.toFixed(1)}
                    </span>
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