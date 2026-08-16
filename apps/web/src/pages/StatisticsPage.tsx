import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchStatistics } from '../lib/api'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { StatCard } from '../components/ui/StatCard'
import { buttonClass } from '../components/ui/buttonStyles'
import { formatScore } from '../lib/format'
import { STATUS_LABELS, type ListStatus } from '../lib/types'

function BarChart({
  data,
  barClass = 'bg-ink-2',
}: {
  data: { label: string; value: number }[]
  barClass?: string
}) {
  if (data.length === 0) return null
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="flex items-center gap-3 text-xs">
          <span className="w-28 shrink-0 truncate text-ink-2" title={d.label}>
            {d.label}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-sm bg-surface-raised">
            <div
              className={`h-full rounded-sm ${barClass}`}
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-ink-3">{d.value}</span>
        </li>
      ))}
    </ul>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-line bg-surface/40 p-4">
      <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </div>
  )
}

export default function StatisticsPage() {
  const stats = useQuery({ queryKey: ['statistics'], queryFn: ({ signal }) => fetchStatistics(signal) })

  if (stats.isPending) {
    return (
      <div>
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (stats.isError || !stats.data) {
    return <ErrorState message="Statistics are temporarily unavailable." retry={() => stats.refetch()} />
  }

  const s = stats.data
  const statusData = s.statusDistribution.map((d) => ({
    label: STATUS_LABELS[d.status as ListStatus] ?? d.status,
    value: d.count,
  }))

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Your Anime Journey</h1>
      <p className="mt-1 text-sm text-ink-3">Anime completed, episodes watched and ratings at a glance.</p>

      {s.totalAnime === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Your statistics will appear here as you track anime"
            hint="Add anime to your library, update progress and rate titles to unlock your personal stats."
            icon="library"
            action={
              <Link to="/explore" className={buttonClass('secondary')}>
                Explore Anime
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Anime completed" value={s.completed} />
            <StatCard label="Episodes watched" value={s.episodesWatched} />
            <StatCard
              label="Average rating"
              value={s.averageRating !== null ? s.averageRating.toFixed(2) : '—'}
              suffix={s.averageRating !== null ? '/ 10' : undefined}
            />
            <StatCard label="Reviews written" value={s.reviews} />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Watching" value={s.watching} className="border-line-strong/40" />
            <StatCard label="Planning" value={s.planning} className="border-line-strong/40" />
            <StatCard label="Paused" value={s.paused} className="border-line-strong/40" />
            <StatCard label="Dropped" value={s.dropped} className="border-line-strong/40" />
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {statusData.length > 0 && (
              <ChartCard title="Status distribution">
                <BarChart data={statusData} />
              </ChartCard>
            )}
            {s.genres.length > 0 && (
              <ChartCard title="Genres watched">
                <BarChart data={s.genres.map((g) => ({ label: g.name, value: g.count }))} barClass="bg-accent/70" />
              </ChartCard>
            )}
            {s.ratingDistribution.length > 0 && (
              <ChartCard title="Ratings distribution">
                <BarChart
                  data={s.ratingDistribution
                    .sort((a, b) => a.score - b.score)
                    .map((d) => ({ label: `${formatScore(d.score)}`, value: d.count }))}
                  barClass="bg-positive/70"
                />
              </ChartCard>
            )}
            {s.averageRating !== null && (
              <ChartCard title="Overall rating">
                <div className="flex items-center justify-center py-6">
                  <div className="text-center">
                    <p className="text-4xl font-bold tracking-tight text-positive">{s.averageRating.toFixed(2)}</p>
                    <p className="mt-1 text-sm text-ink-3">average across your rated anime</p>
                  </div>
                </div>
              </ChartCard>
            )}
          </div>

          <p className="mt-10 text-sm text-ink-4">
            Missing a chart?{' '}
            <Link to="/explore" className="text-ink-2 underline underline-offset-2 transition-colors hover:text-ink">
              Add more anime to your library
            </Link>
          </p>
        </>
      )}
    </div>
  )
}