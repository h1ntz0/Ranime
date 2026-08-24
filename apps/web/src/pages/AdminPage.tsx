import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAdminStats, fetchAdminUsers, updateUserRole } from '../lib/api'
import { useAuth } from '../context/AuthContext'

function MetricCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-surface/60 p-3 sm:p-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-sm border border-line bg-surface-raised text-[11px] text-ink-2 sm:text-xs">
          {icon}
        </span>
        <span className="shrink-0 rounded-full border border-line px-1.5 py-0.5 text-[9px] font-medium tracking-widest text-ink-4 uppercase sm:px-2 sm:text-[10px]">live</span>
      </div>
      <div className="mt-2 sm:mt-3">
        <p className="truncate text-xl font-semibold tracking-tight text-ink tabular-nums sm:text-2xl">{value}</p>
        <p className="mt-1 truncate text-[10px] font-medium tracking-wide text-ink-3 uppercase sm:text-xs">{label}</p>
        {sub && <p className="mt-0.5 truncate text-[11px] text-ink-4">{sub}</p>}
      </div>
    </div>
  )
}

function Sparkline({ data }: { data: { date: string; count: number }[] }) {
  const { path, fillPath } = useMemo(() => {
    if (data.length === 0) return { path: '', fillPath: '' }
    const w = 320
    const h = 64
    const pad = 6
    const max = Math.max(...data.map((d) => d.count), 1)
    const stepX = (w - pad * 2) / Math.max(data.length - 1, 1)
    const points = data.map((d, i) => {
      const x = pad + i * stepX
      const y = h - pad - (d.count / max) * (h - pad * 2)
      return { x, y }
    })
    const p = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
    const fill = `${p} L ${points[points.length - 1]!.x} ${h - pad} L ${points[0]!.x} ${h - pad} Z`
    return { path: p, fillPath: fill }
  }, [data])

  if (data.length === 0) return <p className="text-sm text-ink-4">No growth data</p>

  return (
    <svg viewBox="0 0 320 64" className="h-16 w-full">
      <path d={fillPath} fill="rgba(129,140,248,0.08)" />
      <path d={path} fill="none" stroke="#818cf8" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        if (data.length < 14 && i % 1 === 0) return null
        return null
      })}
    </svg>
  )
}

export default function AdminPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const statsQ = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: ({ signal }) => fetchAdminStats(signal),
    refetchInterval: 10000,
  })

  const usersQ = useQuery({
    queryKey: ['admin', 'users', page, q],
    queryFn: ({ signal }) => fetchAdminUsers({ page, limit: 10, q: q || undefined }, signal),
  })

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'USER' | 'ADMIN' }) => updateUserRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  useEffect(() => {
    setPage(1)
  }, [q])

  if (user?.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center">
        <p className="text-sm tracking-widest text-ink-4 uppercase">Forbidden</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Admin only</h1>
        <p className="mt-2 text-sm text-ink-3">Your account does not have administrator privileges.</p>
        <Link to="/" className="mt-6 inline-flex rounded-sm border border-line px-4 py-2 text-sm text-ink-2 hover:border-accent hover:text-ink">
          Back to home
        </Link>
      </div>
    )
  }

  if (statsQ.isPending) return <div className="py-16 text-center text-sm text-ink-3">Loading command center…</div>
  if (statsQ.isError) return <div className="py-16 text-center text-sm text-danger">Failed to load stats</div>

  const s = statsQ.data!

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden space-y-5 pb-24 sm:space-y-6 lg:pb-0">
      {/* header */}
      <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:pb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] tracking-widest text-ink-4 uppercase sm:text-xs">
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-positive" />
            Live • Realtime monitoring
          </div>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-ink sm:mt-2 sm:text-2xl">Command Center</h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-3 sm:text-sm">Overview of Ranime growth, users, and system health. Auto-refresh every 10s.</p>
        </div>
        <div className="flex w-full items-center gap-2 overflow-x-auto rounded-sm border border-line bg-surface/50 px-2.5 py-2 text-[11px] text-ink-3 sm:w-auto sm:whitespace-nowrap sm:px-3 sm:text-xs">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
          <span className="whitespace-nowrap text-ink-2">{s.systemStatus.database}</span>
          <span className="text-ink-4">•</span>
          <span className="whitespace-nowrap">{(s.systemStatus.uptime / 3600).toFixed(1)}h uptime</span>
          <span className="text-ink-4">•</span>
          <span className="whitespace-nowrap">{new Date(s.systemStatus.serverTime).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* metrics — bespoke mobile-first: 1 col on <640 to prevent melebar, 2 cols on sm */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-4 lg:grid-cols-7">
        <MetricCard label="Total users" value={s.overview.totalUsers} icon={<span className="text-[11px]">◎</span>} />
        <MetricCard label="Admins" value={s.overview.totalAdmins} sub="privileged" icon={<span className="text-[11px]">◆</span>} />
        <MetricCard label="Anime" value={s.overview.totalAnime} icon={<span className="text-[11px]">▣</span>} />
        <MetricCard label="Reviews" value={s.overview.totalReviews} icon={<span className="text-[11px]">✎</span>} />
        <MetricCard label="Ratings" value={s.overview.totalRatings} icon={<span className="text-[11px]">★</span>} />
        <MetricCard label="Watchlist" value={s.overview.totalWatchlistEntries} icon={<span className="text-[11px]">≡</span>} />
        <MetricCard label="Activities" value={s.overview.totalActivities} icon={<span className="text-[11px]">◐</span>} />
      </div>

      {/* growth + recent */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.35fr_0.85fr]">
        <div className="min-w-0 rounded-md border border-line bg-surface/40 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold tracking-tight text-ink sm:text-sm">User growth — 14 days</h2>
            <span className="shrink-0 text-[11px] text-ink-4 sm:text-xs">{s.userGrowth.length} buckets</span>
          </div>
          <div className="mt-3 sm:mt-4">
            <Sparkline data={s.userGrowth} />
          </div>
          <div className="mt-3 flex gap-1 overflow-x-auto pb-1 slim-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
            {s.userGrowth.map((d) => (
              <span key={d.date} className="shrink-0 whitespace-nowrap rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-ink-3">
                {d.date.slice(5)} · {d.count}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-md border border-line bg-surface/40 p-3 sm:p-4">
          <h2 className="text-xs font-semibold tracking-tight text-ink sm:text-sm">Recent users</h2>
          <ul className="mt-3 divide-y divide-line/60">
            {s.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 py-2.5 sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{u.username}</p>
                  <p className="truncate text-xs text-ink-3">{u.email}</p>
                </div>
                <span
                  className={
                    u.role === 'ADMIN'
                      ? 'shrink-0 whitespace-nowrap rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold tracking-widest text-accent-strong uppercase ring-1 ring-accent/20'
                      : 'shrink-0 whitespace-nowrap rounded-full border border-line px-2 py-0.5 text-[10px] tracking-widest text-ink-4 uppercase'
                  }
                >
                  {u.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* activity + users table */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="min-w-0 rounded-md border border-line bg-surface/40 p-3 sm:p-4">
          <h2 className="text-sm font-semibold tracking-tight text-ink">Recent activity</h2>
          <ul className="mt-3 space-y-0">
            {s.recentActivities.map((a) => (
              <li key={a.id} className="flex gap-3 border-l border-line pl-3 py-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap gap-x-1.5 text-sm leading-snug text-ink-2">
                    <span className="font-medium text-ink">{a.username}</span>
                    <span className="break-words text-ink-3">{a.type.toLowerCase()}</span>
                    {a.animeTitle && <span className="min-w-0 break-words text-ink-3">— {a.animeTitle}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-4">{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
            {s.recentActivities.length === 0 && <p className="text-sm text-ink-4">No activity yet</p>}
          </ul>
        </div>

        <div className="flex min-w-0 flex-col rounded-md border border-line bg-surface/40 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-semibold tracking-tight text-ink">User management</h2>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search username or email…"
              className="w-full rounded-sm border border-line bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none sm:w-48"
            />
          </div>

          {/* Mobile: cards, Desktop: table — bespoke, no AI slop */}
          <div className="mt-3 grid gap-2 sm:hidden">
            {usersQ.data?.items.map((u) => (
              <div key={u.id} className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{u.username}</p>
                    <p className="break-all text-xs text-ink-3">{u.email}</p>
                  </div>
                  <span
                    className={
                      u.role === 'ADMIN'
                        ? 'shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-strong'
                        : 'shrink-0 rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-3'
                    }
                  >
                    {u.role}
                  </span>
                </div>
                <button
                  disabled={roleMut.isPending}
                  onClick={() => roleMut.mutate({ id: u.id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                  className="w-full rounded-sm border border-line bg-surface px-2 py-1.5 text-xs font-medium text-ink-2 hover:border-accent hover:text-ink"
                >
                  Make {u.role === 'ADMIN' ? 'User' : 'Admin'}
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 hidden overflow-x-auto slim-scrollbar sm:block">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="border-b border-line text-[10px] tracking-widest text-ink-4 uppercase">
                <tr>
                  <th className="px-2 py-2">User</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {usersQ.data?.items.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-raised/30">
                    <td className="max-w-[110px] truncate px-2 py-2 font-medium text-ink">{u.username}</td>
                    <td className="max-w-[160px] truncate px-2 py-2 text-ink-3">{u.email}</td>
                    <td className="px-2 py-2">
                      <span
                        className={
                          u.role === 'ADMIN'
                            ? 'rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-strong'
                            : 'rounded-full border border-line px-2 py-0.5 text-[10px] text-ink-3'
                        }
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button
                        disabled={roleMut.isPending}
                        onClick={() => roleMut.mutate({ id: u.id, role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
                        className="whitespace-nowrap rounded-sm border border-line px-2 py-1 text-[11px] text-ink-2 hover:border-accent hover:text-ink"
                      >
                        Make {u.role === 'ADMIN' ? 'User' : 'Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-ink-4">
            <span>
              Page {usersQ.data?.page ?? 1} • {usersQ.data?.total ?? 0} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={!page || page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-sm border border-line px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={!usersQ.data?.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-sm border border-line px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      <p className="break-words px-2 text-center text-[11px] leading-relaxed text-ink-4 sm:text-xs">
        LAN <span className="text-ink-3">http://&lt;wifi-ip&gt;:3000/admin</span> • Local <span className="text-ink-3">http://localhost:3000/admin</span>
      </p>
    </div>
  )
}
