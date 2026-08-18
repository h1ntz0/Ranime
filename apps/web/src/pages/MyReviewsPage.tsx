import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchMyReviews } from '../lib/api'
import { displayTitle } from '../lib/format'
import { ReviewCard } from '../components/ReviewCard'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'

export default function MyReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  const data = useQuery({
    queryKey: ['my-reviews', page],
    queryFn: ({ signal }) => fetchMyReviews(page, signal),
    placeholderData: (prev) => prev,
  })

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">My Reviews</h1>
      <p className="mt-1 text-sm text-ink-3">Everything you wrote, most recent first.</p>

      <div className="mt-8">
        {data.isPending ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : data.isError ? (
          <ErrorState message="Reviews are temporarily unavailable." retry={() => data.refetch()} />
        ) : data.data.items.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            hint="Write a review after watching an anime to share your thoughts."
            icon="library"
            action={
              <Link to="/explore" className="rounded-sm bg-ink px-3 py-1.5 text-sm font-medium text-background transition-colors hover:bg-white">
                Explore Anime
              </Link>
            }
          />
        ) : (
          <>
            <div className="space-y-4">
              {data.data.items.map((r) => (
                <div key={r.id}>
                  <Link
                    to={`/anime/${r.anime.id}`}
                    className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-accent underline-offset-2 transition-colors hover:text-accent-strong hover:underline"
                  >
                    {displayTitle(r.anime.title)}
                  </Link>
                  <ReviewCard review={r} />
                </div>
              ))}
            </div>
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