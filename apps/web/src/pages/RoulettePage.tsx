import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchGenres, fetchRouletteAnime } from '../lib/api'
import { Poster } from '../components/Poster'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { displayTitle, formatScore, formatStatus, stripHtml } from '../lib/format'
import { buttonClass } from '../components/ui/buttonStyles'

export default function RoulettePage() {
  const [genre, setGenre] = useState<string>('')
  const [format, setFormat] = useState<string>('')
  const [minScore, setMinScore] = useState<number | undefined>(undefined)
  const [spinCount, setSpinCount] = useState<number>(0)
  const [spinning, setSpinning] = useState<boolean>(false)

  const genresQuery = useQuery({
    queryKey: ['genres'],
    queryFn: ({ signal }) => fetchGenres(signal),
  })

  const rouletteQuery = useQuery({
    queryKey: ['anime', 'roulette', genre, format, minScore, spinCount],
    queryFn: ({ signal }) =>
      fetchRouletteAnime({ genre: genre || undefined, format: format || undefined, minScore }, signal),
  })

  function handleSpin() {
    setSpinning(true)
    setTimeout(() => {
      setSpinCount((c) => c + 1)
      setSpinning(false)
    }, 450)
  }

  const anime = rouletteQuery.data

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center space-y-2">
        <span className="inline-block rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
          Discovery Roulette
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          Don't know what to watch?
        </h1>
        <p className="text-sm text-ink-3">
          Set your filters and spin the wheel to discover your next favorite anime!
        </p>
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface/40 p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-3">
            Genre
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Any Genre</option>
            {genresQuery.data?.map((g) => (
              <option key={g.id} value={g.slug}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-3">
            Format
          </label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Any Format</option>
            <option value="TV">TV Series</option>
            <option value="MOVIE">Movie</option>
            <option value="OVA">OVA</option>
            <option value="ONA">ONA</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-ink-3">
            Min Score
          </label>
          <select
            value={minScore ?? ''}
            onChange={(e) => setMinScore(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            <option value="">Any Score</option>
            <option value="7">★ 7.0+</option>
            <option value="8">★ 8.0+</option>
            <option value="8.5">★ 8.5+</option>
          </select>
        </div>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleSpin}
          disabled={spinning || rouletteQuery.isFetching}
          className="h-12 px-8 text-base shadow-lg shadow-accent/20"
        >
          {spinning || rouletteQuery.isFetching ? 'Spinning...' : 'Spin Roulette'}
        </Button>
      </div>

      {/* Result Card */}
      {rouletteQuery.isPending || spinning ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-line bg-surface/30">
          <Spinner className="h-8 w-8" />
          <p className="mt-3 text-sm text-ink-3">Finding great matches...</p>
        </div>
      ) : anime ? (
        <div className="overflow-hidden rounded-xl border border-line bg-surface/40 p-6 shadow-xl transition-all">
          <div className="flex flex-col gap-6 sm:flex-row">
            <Poster
              src={anime.coverImage}
              alt={displayTitle(anime.title)}
              className="h-64 w-44 shrink-0 self-center rounded-lg border border-line object-cover sm:self-start"
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {anime.averageScore !== null && (
                  <span className="rounded-full bg-control px-2.5 py-0.5 text-xs font-bold text-warning ring-1 ring-control-border">
                    ★ {formatScore(anime.averageScore)}
                  </span>
                )}
                <span className="rounded-full bg-control px-2.5 py-0.5 text-xs font-medium text-ink-2 ring-1 ring-control-border">
                  {anime.format}
                </span>
                <span className="rounded-full bg-control px-2.5 py-0.5 text-xs font-medium text-ink-2 ring-1 ring-control-border">
                  {formatStatus(anime.status)}
                </span>
                {anime.seasonYear && (
                  <span className="text-xs text-ink-3">{anime.seasonYear}</span>
                )}
              </div>

              <h2 className="text-2xl font-bold text-ink">{displayTitle(anime.title)}</h2>

              <p className="line-clamp-4 text-sm leading-relaxed text-ink-2">
                {stripHtml(anime.description) || 'No synopsis available.'}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {anime.genres.map((g) => (
                  <span
                    key={g}
                    className="rounded-xs border border-line bg-surface px-2 py-0.5 text-xs text-ink-2"
                  >
                    {g}
                  </span>
                ))}
              </div>

              <div className="pt-3">
                <Link to={`/anime/${anime.id}`} className={buttonClass('primary')}>
                  View Anime Details →
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-surface/30 p-10 text-center text-ink-3">
          No anime matched your current filter criteria. Try relaxing your filters.
        </div>
      )}
    </div>
  )
}
