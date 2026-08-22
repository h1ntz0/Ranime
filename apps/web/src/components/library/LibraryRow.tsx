import { Link } from 'react-router-dom'
import type { LibraryEntry, ListStatus } from '../../lib/types'
import { displayTitle, formatScore } from '../../lib/format'
import { Poster } from '../Poster'
import { ProgressBar, StatusBadge } from '../StatusSelect'
import { EpisodeInput } from '../ui/EpisodeInput'

export function LibraryRow({
  entry,
  actions,
}: {
  entry: LibraryEntry
  actions?: React.ReactNode
}) {
  const title = displayTitle(entry.anime.title)
  return (
    <li className="flex flex-col gap-3 rounded-sm border border-line bg-surface/50 p-3 sm:flex-row sm:items-center">
      <Link to={`/anime/${entry.anime.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Poster src={entry.anime.coverImage} alt={title} className="h-20 w-14 shrink-0 rounded-sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium text-ink">{title}</h3>
            <StatusBadge status={entry.status} />
            {entry.anime.averageScore !== null && (
              <span className="rounded bg-positive-soft px-1.5 py-0.5 text-xs font-semibold text-positive">
                {formatScore(entry.anime.averageScore)}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-3">
            <span>
              Episode {entry.currentEpisode}
              {entry.totalEpisodes ? ` / ${entry.totalEpisodes}` : ''}
            </span>
            {entry.anime.genres.length > 0 && (
              <span className="hidden truncate sm:inline">· {entry.anime.genres.slice(0, 3).join(', ')}</span>
            )}
          </div>
          <ProgressBar value={entry.progress} className="mt-2" />
        </div>
      </Link>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </li>
  )
}

export type LibraryStatusAction = {
  onStatus: (status: ListStatus) => void
  onEpisode: (episode: number) => void
  onRemove: () => void
  disabled?: boolean
}

export function LibraryRowActions({ entry, actions }: { entry: LibraryEntry; actions: LibraryStatusAction }) {
  const selectClass =
    'rounded-sm border border-line bg-surface px-2 py-1.5 text-xs text-ink transition-colors focus:border-accent focus:outline-none disabled:opacity-50'
  const isCompleted = Boolean(entry.totalEpisodes && entry.currentEpisode >= entry.totalEpisodes)
  return (
    <>
      <button
        type="button"
        disabled={Boolean(actions.disabled) || isCompleted}
        onClick={() => actions.onEpisode(entry.currentEpisode + 1)}
        className="flex h-7 items-center justify-center rounded-sm bg-accent/20 px-2 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent hover:text-background disabled:opacity-40"
        title="Quick +1 Episode"
      >
        +1 Ep
      </button>
      <select
        value={entry.status}
        disabled={actions.disabled}
        onChange={(e) => actions.onStatus(e.target.value as ListStatus)}
        className={selectClass}
        aria-label="Change status"
      >
        <option value="PLANNING">Planning</option>
        <option value="WATCHING">Watching</option>
        <option value="COMPLETED">Completed</option>
        <option value="PAUSED">Paused</option>
        <option value="DROPPED">Dropped</option>
      </select>
      <EpisodeInput
        value={entry.currentEpisode}
        max={entry.totalEpisodes ?? 9999}
        disabled={actions.disabled}
        onCommit={actions.onEpisode}
        className="w-16 rounded-sm border border-line bg-surface px-2 py-1.5 text-xs text-ink transition-colors focus:border-accent focus:outline-none disabled:opacity-50"
        ariaLabel={`Current episode for ${displayTitle(entry.anime.title)}`}
      />
      <button
        type="button"
        onClick={actions.onRemove}
        disabled={actions.disabled}
        className="text-xs text-ink-3 transition-colors hover:text-danger disabled:opacity-50"
        aria-label={`Remove ${displayTitle(entry.anime.title)} from library`}
      >
        Remove
      </button>
    </>
  )
}