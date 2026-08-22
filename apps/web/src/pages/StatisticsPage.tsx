import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchStatistics } from '../lib/api'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { StatCard } from '../components/ui/StatCard'
import { buttonClass } from '../components/ui/buttonStyles'
import { formatScore } from '../lib/format'
import { STATUS_LABELS, type ListStatus } from '../lib/types'
import { useToast } from '../context/ToastContext'

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
  const { toast } = useToast()
  const [showShareModal, setShowShareModal] = useState(false)
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Your Anime Journey</h1>
          <p className="mt-1 text-sm text-ink-3">Anime completed, episodes watched and ratings at a glance.</p>
        </div>
        {s.totalAnime > 0 && (
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 self-start rounded-sm bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent-strong ring-1 ring-accent/30 hover:bg-accent/25 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Share Anime Passport / Stats Card
          </button>
        )}
      </div>

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

          {showShareModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-md rounded-lg border border-line bg-surface p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <h3 className="text-base font-bold text-ink">Anime Passport 🎌</h3>
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="rounded p-1 text-ink-3 hover:bg-surface-raised hover:text-ink"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-5 rounded-md border border-line-strong/50 bg-gradient-to-br from-surface to-surface-raised p-5 text-ink shadow-inner">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-accent font-bold">Ranime Journey</p>
                      <p className="text-lg font-bold">Anime Collector</p>
                    </div>
                    <span className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-bold text-accent-strong">
                      PRO
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-sm bg-background/60 p-2.5">
                      <p className="text-2xl font-black text-positive">{s.completed}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-3">Completed</p>
                    </div>
                    <div className="rounded-sm bg-background/60 p-2.5">
                      <p className="text-2xl font-black text-accent">{s.episodesWatched}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-3">Episodes</p>
                    </div>
                    <div className="rounded-sm bg-background/60 p-2.5">
                      <p className="text-2xl font-black text-warning">
                        {s.averageRating !== null ? s.averageRating.toFixed(1) : '—'}★
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-3">Avg Score</p>
                    </div>
                    <div className="rounded-sm bg-background/60 p-2.5">
                      <p className="text-2xl font-black text-ink-2">{s.watching}</p>
                      <p className="text-[10px] uppercase tracking-wider text-ink-3">Watching</p>
                    </div>
                  </div>

                  {s.genres.length > 0 && (
                    <div className="mt-4 border-t border-line/60 pt-3">
                      <p className="text-[10px] font-semibold text-ink-3">TOP GENRES</p>
                      <p className="mt-1 text-xs text-ink-2 font-medium">
                        {s.genres.slice(0, 3).map((g) => g.name).join(' • ')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = `🎌 My Anime Stats on Ranime:\n✅ ${s.completed} Anime Completed\n📺 ${s.episodesWatched} Episodes Watched\n⭐ ${s.averageRating?.toFixed(1) ?? 'N/A'} Average Score\nTrack your anime at ${window.location.origin}`
                      navigator.clipboard.writeText(text)
                      toast('Stats summary copied to clipboard!')
                      setShowShareModal(false)
                    }}
                    className="flex-1 rounded-sm bg-accent py-2 text-xs font-bold text-background hover:bg-accent-strong transition-colors"
                  >
                    📋 Copy Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="rounded-sm border border-line px-4 py-2 text-xs font-medium text-ink-2 hover:bg-surface-raised transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}