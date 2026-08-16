import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchUserProfile } from '../lib/api'
import { Poster } from '../components/Poster'
import { Skeleton } from '../components/Skeleton'
import { ErrorState } from '../components/States'
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
      <div className="flex items-center gap-4">
        <Poster src={p.avatarUrl} alt={p.username} className="h-16 w-16 rounded-full" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{p.username}</h1>
          <p className="text-sm text-ink-3">Joined {joined}</p>
        </div>
        {user?.id === p.id && (
          <Link to="/settings" className={`${buttonClass('secondary')} ml-auto`}>
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
        <div className="mt-8">
          <Link to="/statistics" className={buttonClass('primary')}>
            View full statistics
          </Link>
        </div>
      )}
    </div>
  )
}