import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { fetchStudioAnime } from '../lib/api'
import { AnimeCardGrid } from '../components/AnimeCard'
import { Pagination } from '../components/Pagination'
import { CardGridSkeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'

export default function StudioDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  const data = useQuery({
    queryKey: ['studio', slug, page],
    queryFn: ({ signal }) => fetchStudioAnime(slug!, page, signal),
    enabled: !!slug,
    placeholderData: (prev) => prev,
  })

  const name = slug
    ?.split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">{name ?? 'Studio'}</h1>
      <p className="mt-1 text-sm text-ink-3">Anime produced by this studio.</p>

      <div className="mt-8">
        {data.isPending ? (
          <CardGridSkeleton count={20} />
        ) : data.isError ? (
          <ErrorState message="Studio data is temporarily unavailable." retry={() => data.refetch()} />
        ) : data.data.items.length === 0 ? (
          <EmptyState title="No anime found" hint="This studio has no anime in the catalog yet." />
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-3">{data.data.total} titles</p>
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

      <Link to="/genres" className="mt-8 inline-block text-sm text-accent underline-offset-2 hover:text-accent-strong hover:underline">
        ← All genres &amp; studios
      </Link>
    </div>
  )
}