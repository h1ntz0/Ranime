import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchUserProfile, fetchUserActivity } from '../lib/api'
import { Poster } from '../components/Poster'
import { Skeleton } from '../components/Skeleton'
import { ErrorState } from '../components/States'
import { ActivityList } from '../components/ActivityList'
import { StatCard } from '../components/ui/StatCard'
import { buttonClass } from '../components/ui/buttonStyles'
import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user } = useAuth()
  const profile = useQuery({
    queryKey: ['user', username],
    queryFn: ({ signal }) => fetchUserProfile(username!, signal),
    enabled: !!username,
  })
  const activity = useQuery({
    queryKey: ['user', username, 'activity'],
    queryFn: ({ signal }) => fetchUserActivity(username!, 1, signal),
    enabled: !!username,
  })

  if (!username) return <ErrorState message="Invalid username." />

  if (profile.isPending) {
    return (
      <div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    )
  }

  if (profile.isError || !profile.data) {
    return <ErrorState message="User not found." />
  }

  const p = profile.data
  const joined = new Date(p.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Poster src={p.avatarUrl} alt={p.username} className="h-16 w-16 rounded-full border-2 border-line object-cover shrink-0" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink truncate">{p.username}</h1>
            <p className="text-sm text-ink-3">Joined {joined}</p>
          </div>
        </div>
        {user?.id === p.id && (
          <Link to="/settings" className={`${buttonClass('secondary')} w-full sm:w-auto text-center justify-center`}>
            Edit profile
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Anime in library" value={p.stats.animeCount} />
        <StatCard label="Completed" value={p.stats.completedCount} />
        <StatCard label="Average rating" value={p.stats.averageRating !== null ? p.stats.averageRating.toFixed(2) : '—'} />
        <StatCard label="Episodes watched" value={p.stats.episodesWatched} />
      </div>

      {user?.id === p.id && (
        <div className="mt-8 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
          <Link to="/statistics" className={`${buttonClass('primary')} text-center justify-center`}>
            View full statistics
          </Link>
          <Link to="/my-ratings" className={`${buttonClass('secondary')} text-center justify-center`}>
            My Ratings
          </Link>
          <Link to="/my-reviews" className={`${buttonClass('secondary')} text-center justify-center`}>
            My Reviews
          </Link>
        </div>
      )}

      <section aria-label="Recent activity" className="mt-10">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-4 w-1 rounded-full bg-accent" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight text-ink">Recent Activity</h2>
        </div>
        {activity.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : activity.isError ? (
          <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-ink-4">
            Activity is temporarily unavailable.
          </p>
        ) : (
          <ActivityList items={activity.data.items} />
        )}
      </section>
    </div>
  )
}