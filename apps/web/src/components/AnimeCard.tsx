import { Link } from 'react-router-dom'
import type { AnimeCard } from '../lib/types'
import { displayTitle, formatScore, formatStatus } from '../lib/format'
import { Poster } from './Poster'

export function AnimeCardView({ anime }: { anime: AnimeCard }) {
  const title = displayTitle(anime.title)
  return (
    <Link
      to={`/anime/${anime.id}`}
      className="group flex flex-col gap-2 focus:outline-none"
      aria-label={title}
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-sm border border-line bg-surface transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:border-line-strong">
        <Poster
          src={anime.coverImage}
          alt={title}
          className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-background/95 to-transparent px-2 pb-1.5 pt-6">
          {anime.averageScore !== null ? (
            <span className="rounded-sm bg-positive px-1.5 py-0.5 text-xs font-semibold text-background">
              {formatScore(anime.averageScore)}★
            </span>
          ) : (
            <span className="rounded-sm bg-background/70 px-1.5 py-0.5 text-xs text-ink-2">—</span>
          )}
          <span className="text-[11px] font-medium text-ink">{anime.format ?? ''}</span>
        </div>
        <span className="absolute left-0 top-0 m-1.5 rounded-sm bg-background/70 px-1.5 py-0.5 text-[10px] font-medium text-ink-2">
          {anime.seasonYear ?? ''}
        </span>
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-ink-2 transition-colors group-hover:text-ink" title={title}>
          {title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-ink-3">
          {anime.episodes ? `${anime.episodes} eps` : ''}
          {anime.status ? ` · ${formatStatus(anime.status)}` : ''}
        </p>
        {anime.genres.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {anime.genres.slice(0, 2).map((g) => (
              <span
                key={g}
                className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] font-medium text-ink-3"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

export function AnimeCardGrid({ items }: { items: AnimeCard[] }) {
  if (items.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((anime) => (
        <AnimeCardView key={anime.id} anime={anime} />
      ))}
    </div>
  )
}