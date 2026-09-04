import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchGenres, fetchStudios } from '../lib/api'
import type { Genre, StudioSummary } from '../lib/types'
import { CardGridSkeleton } from '../components/Skeleton'
import { ErrorState } from '../components/States'

const FALLBACK_GENRES: Genre[] = [
  { id: 1, name: 'Action', slug: 'action' },
  { id: 2, name: 'Adventure', slug: 'adventure' },
  { id: 4, name: 'Comedy', slug: 'comedy' },
  { id: 7, name: 'Drama', slug: 'drama' },
  { id: 8, name: 'Ecchi', slug: 'ecchi' },
  { id: 9, name: 'Fantasy', slug: 'fantasy' },
  { id: 11, name: 'Horror', slug: 'horror' },
  { id: 12, name: 'Mahou Shoujo', slug: 'mahou-shoujo' },
  { id: 13, name: 'Mecha', slug: 'mecha' },
  { id: 14, name: 'Music', slug: 'music' },
  { id: 15, name: 'Mystery', slug: 'mystery' },
  { id: 16, name: 'Psychological', slug: 'psychological' },
  { id: 17, name: 'Romance', slug: 'romance' },
  { id: 18, name: 'Sci-Fi', slug: 'sci-fi' },
  { id: 19, name: 'Slice of Life', slug: 'slice-of-life' },
  { id: 20, name: 'Sports', slug: 'sports' },
  { id: 21, name: 'Supernatural', slug: 'supernatural' },
  { id: 22, name: 'Thriller', slug: 'thriller' },
]

const POPULAR_STUDIOS: StudioSummary[] = [
  { name: 'Toei Animation', slug: 'toei-animation', count: 27 },
  { name: 'MADHOUSE', slug: 'madhouse', count: 19 },
  { name: 'A-1 Pictures', slug: 'a-1-pictures', count: 14 },
  { name: 'J.C.STAFF', slug: 'j-c-staff', count: 13 },
  { name: 'Studio Pierrot', slug: 'studio-pierrot', count: 11 },
  { name: 'WIT STUDIO', slug: 'wit-studio', count: 11 },
  { name: 'bones', slug: 'bones', count: 10 },
  { name: 'CloverWorks', slug: 'cloverworks', count: 10 },
  { name: 'MAPPA', slug: 'mappa', count: 10 },
  { name: 'Production I.G', slug: 'production-i-g', count: 9 },
  { name: 'Kinema Citrus', slug: 'kinema-citrus', count: 8 },
  { name: 'Sunrise', slug: 'sunrise', count: 8 },
  { name: 'Studio DEEN', slug: 'studio-deen', count: 7 },
  { name: 'WHITE FOX', slug: 'white-fox', count: 7 },
  { name: 'Zero-G', slug: 'zero-g', count: 7 },
  { name: 'OLM', slug: 'olm', count: 6 },
  { name: 'TMS Entertainment', slug: 'tms-entertainment', count: 6 },
  { name: '8-bit', slug: '8-bit', count: 5 },
  { name: 'LIDENFILMS', slug: 'lidenfilms', count: 5 },
  { name: 'Shaft', slug: 'shaft', count: 5 },
  { name: 'ufotable', slug: 'ufotable', count: 5 },
  { name: 'Kyoto Animation', slug: 'kyoto-animation', count: 4 },
  { name: 'TRIGGER', slug: 'trigger', count: 4 },
  { name: 'Studio Bind', slug: 'studio-bind', count: 4 },
]

export default function GenresPage() {
  const genres = useQuery({
    queryKey: ['genres'],
    queryFn: ({ signal }) => fetchGenres(signal),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: FALLBACK_GENRES,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })
  const studios = useQuery({
    queryKey: ['studios'],
    queryFn: ({ signal }) => fetchStudios(signal),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    placeholderData: POPULAR_STUDIOS,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  })

  const genreList = genres.data && genres.data.length > 0 ? genres.data : FALLBACK_GENRES
  const studioList = studios.data && studios.data.length > 0 ? studios.data : POPULAR_STUDIOS

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Genres &amp; Studios</h1>
      <p className="mt-1 text-sm text-ink-3">Browse anime by genre or studio.</p>

      <div className="mt-8">
        {genres.isError && !genreList.length ? (
          <ErrorState message="Genres are temporarily unavailable." retry={() => genres.refetch()} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {genreList.map((g) => (
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
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-4 w-1 rounded-full bg-accent" aria-hidden="true" />
            <h2 className="text-lg font-semibold tracking-tight text-ink">Studios</h2>
          </div>
          {studios.isError && (
            <button
              onClick={() => studios.refetch()}
              className="text-xs text-accent hover:underline"
            >
              Refresh studios
            </button>
          )}
        </div>
        {studios.isPending && !studioList.length ? (
          <CardGridSkeleton count={12} />
        ) : (
          <div className="flex flex-wrap gap-2">
            {studioList.map((s) => (
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