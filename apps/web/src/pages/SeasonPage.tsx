import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchSeason } from '../lib/api'
import { AnimeCardGrid } from '../components/AnimeCard'
import { Pagination } from '../components/Pagination'
import { CardGridSkeleton } from '../components/Skeleton'
import { ErrorState } from '../components/States'
import { CustomSelect } from '../components/ui/CustomSelect'
import { PageLoadingOverlay } from '../components/ui/PageLoadingOverlay'

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const

export default function SeasonPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const now = new Date()
  const currentMonth = now.getMonth()
  const defaultSeason = currentMonth <= 1 ? 'WINTER' : currentMonth <= 4 ? 'SPRING' : currentMonth <= 7 ? 'SUMMER' : 'FALL'

  const year = searchParams.get('year') ? Number(searchParams.get('year')) : now.getFullYear()
  const season = (SEASONS.find((s) => s === searchParams.get('season')) as (typeof SEASONS)[number]) ?? defaultSeason
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  const data = useQuery({
    queryKey: ['season', year, season, page],
    queryFn: ({ signal }) => fetchSeason(year, season, page, signal),
    placeholderData: (prev) => prev,
  })

  const years = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 5 + i).reverse()

  const yearOptions = years.map((y) => ({ value: String(y), label: String(y) }))
  const seasonOptions = SEASONS.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))

  function update(next: { year?: number; season?: string; page?: number }) {
    const params: Record<string, string> = {}
    if (next.year !== undefined) params.year = String(next.year)
    if (next.season !== undefined) params.season = next.season
    if (next.page !== undefined) params.page = String(next.page)
    setSearchParams(params)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Seasonal Anime</h1>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-ink-3">
            Year
            <CustomSelect
              ariaLabel="Select year"
              value={String(year)}
              onChange={(v) => update({ year: Number(v), page: 1 })}
              options={yearOptions}
              className="w-28"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-ink-3">
            Season
            <CustomSelect
              ariaLabel="Select season"
              value={season}
              onChange={(v) => update({ season: v, page: 1 })}
              options={seasonOptions}
              className="w-36"
            />
          </label>
        </div>
      </div>

      <div className="mt-8 min-h-[360px]">
        <PageLoadingOverlay
          isLoading={data.isFetching}
          message="Loading season anime..."
        />

        {data.isPending ? (
          <CardGridSkeleton count={20} />
        ) : data.isError ? (
          <ErrorState message="Seasonal anime is temporarily unavailable." retry={() => data.refetch()} />
        ) : (
          <>
            <p className="mb-4 text-sm text-ink-3">
              {data.data.total.toLocaleString()} anime in {season.charAt(0) + season.slice(1).toLowerCase()} {year}
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
    </div>
  )
}