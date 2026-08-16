import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchGenres } from '../lib/api'
import { CardGridSkeleton } from '../components/Skeleton'
import { ErrorState } from '../components/States'

export default function GenresPage() {
  const genres = useQuery({ queryKey: ['genres'], queryFn: ({ signal }) => fetchGenres(signal) })

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Genres</h1>
      <p className="mt-1 text-sm text-ink-3">Browse anime by genre.</p>

      <div className="mt-8">
        {genres.isPending ? (
          <CardGridSkeleton count={18} />
        ) : genres.isError ? (
          <ErrorState message="Genres are temporarily unavailable." retry={() => genres.refetch()} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(genres.data ?? []).map((g) => (
              <Link
                key={g.id}
                to={`/genres/${g.slug}`}
                className="rounded-sm border border-line bg-surface/40 px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                {g.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
