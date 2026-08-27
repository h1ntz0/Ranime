import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchTop } from '../lib/api'
import { AnimeCardView } from '../components/AnimeCard'
import { Pagination } from '../components/Pagination'
import { CardGridSkeleton } from '../components/Skeleton'
import { ErrorState } from '../components/States'
import { PageLoadingOverlay } from '../components/ui/PageLoadingOverlay'

const CATEGORIES = [
  { value: 'top-rated', label: 'Top Rated' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'trending', label: 'Most Trending' },
]

export default function TopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const category = CATEGORIES.some((c) => c.value === searchParams.get('category'))
    ? searchParams.get('category')!
    : 'top-rated'
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  const data = useQuery({
    queryKey: ['top', category, page],
    queryFn: ({ signal }) => fetchTop(category, page, signal),
    placeholderData: (prev) => prev,
  })

  const tabClass = (active: boolean) =>
    `rounded-sm px-3 py-1.5 text-sm transition-colors ${active ? 'bg-surface-raised font-medium text-ink' : 'text-ink-2 hover:text-ink'}`

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Top Anime</h1>
        <div role="tablist" aria-label="Top anime category" className="flex gap-1 rounded-sm border border-line bg-surface/60 p-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="tab"
              aria-selected={category === c.value}
              className={tabClass(category === c.value)}
              onClick={() => setSearchParams(c.value === 'top-rated' ? {} : { category: c.value })}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 min-h-[360px]">
        <PageLoadingOverlay
          isLoading={data.isFetching}
          message="Loading rankings..."
        />

        {data.isPending ? (
          <CardGridSkeleton count={20} />
        ) : data.isError ? (
          <ErrorState message="Top anime is temporarily unavailable." retry={() => data.refetch()} />
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-3">
              {data.data.total.toLocaleString()} anime ranked by{' '}
              {CATEGORIES.find((c) => c.value === category)?.label.toLowerCase()}
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {data.data.items.map((item, i) => (
                <div key={item.id} className="relative">
                  {item.averageScore !== null && (
                    <span
                      className="absolute -left-1 -top-1 z-10 rounded-sm bg-surface-raised px-1.5 py-0.5 text-[10px] font-bold text-ink-2"
                      aria-label={`Rank ${(page - 1) * data.data.perPage + i + 1}`}
                    >
                      #{((page - 1) * data.data.perPage) + i + 1}
                    </span>
                  )}
                  <AnimeCardView anime={item} />
                </div>
              ))}
            </div>
            <Pagination
              page={data.data.page}
              perPage={data.data.perPage}
              total={data.data.total}
              hasNextPage={data.data.hasNextPage}
              onPage={(p) => setSearchParams(category === 'top-rated' ? { page: String(p) } : { category, page: String(p) })}
            />
          </>
        )}
      </div>
    </div>
  )
}