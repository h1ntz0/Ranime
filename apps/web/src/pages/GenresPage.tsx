import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchGenres, fetchStudios } from '../lib/api'
import { CardGridSkeleton } from '../components/Skeleton'
import { ErrorState } from '../components/States'

export default function GenresPage() {
  const genres = useQuery({ queryKey: ['genres'], queryFn: ({ signal }) => fetchGenres(signal) })
  const studios = useQuery({ queryKey: ['studios'], queryFn: ({ signal }) => fetchStudios(signal) })

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Genres &amp; Studios</h1>
      <p className="mt-1 text-sm text-ink-3">Browse anime by genre or studio.</p>

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

      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-4 w-1 rounded-full bg-accent" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight text-ink">Studios</h2>
        </div>
        {studios.isPending ? (
          <CardGridSkeleton count={12} />
        ) : studios.isError ? (
          <ErrorState message="Studios are temporarily unavailable." retry={() => studios.refetch()} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {(studios.data ?? []).map((s) => (
              <Link
                key={s.slug}
                to={`/studios/${s.slug}`}
                className="rounded-sm border border-line bg-surface/40 px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
              >
                {s.name}
                <span className="ml-1.5 text-xs text-ink-4">{s.count}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}