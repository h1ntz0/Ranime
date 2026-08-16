import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchGenreAnime } from '../lib/api'
import { AnimeCardGrid } from '../components/AnimeCard'
import { Pagination } from '../components/Pagination'
import { CardGridSkeleton } from '../components/Skeleton'
import { ErrorState } from '../components/States'

export default function GenreDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  const data = useQuery({
    queryKey: ['genres', slug, page],
    queryFn: ({ signal }) => fetchGenreAnime(slug!, page, signal),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  })

  if (!slug) return <ErrorState message="Invalid genre." />

  const label = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Link to="/genres" className="text-sm text-ink-3 transition-colors hover:text-ink">
          ← Genres
        </Link>
        <h1 className="text-xl font-semibold tracking-tight text-ink">{label}</h1>
      </div>

      <div className="mt-8">
        {data.isPending ? (
          <CardGridSkeleton count={20} />
        ) : data.isError ? (
          <ErrorState message="Genre data is temporarily unavailable." retry={() => data.refetch()} />
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-3">
              {data.data.total.toLocaleString()} anime in {label}
            </p>
            <AnimeCardGrid items={data.data.items} />
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
