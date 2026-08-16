import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Review } from '../lib/types'
import { timeAgo } from '../lib/format'
import { Poster } from './Poster'

export function ReviewCard({
  review,
  canEdit = false,
  onEdit,
  onDelete,
}: {
  review: Review
  canEdit?: boolean
  onEdit?: () => void
  onDelete?: () => void
}) {
  const [revealed, setRevealed] = useState(false)

  return (
    <article className="rounded-md border border-line bg-surface/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${review.user.username}`} className="flex items-center gap-3">
            <Poster
              src={review.user.avatarUrl}
              alt={review.user.username}
              className="h-9 w-9 rounded-full"
            />
            <div>
              <p className="text-sm font-medium text-ink">{review.user.username}</p>
              <p className="text-xs text-ink-3">{timeAgo(review.createdAt)}</p>
            </div>
          </Link>
          <span className="rounded bg-positive-soft px-1.5 py-0.5 text-xs font-semibold text-positive">
            {review.rating.toFixed(1)}
          </span>
          {review.containsSpoiler ? (
            <span className="rounded bg-amber-950 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              SPOILER
            </span>
          ) : null}
        </div>
        {canEdit ? (
          <div className="flex gap-2">
            <button type="button" onClick={onEdit} className="text-xs text-ink-2 transition-colors hover:text-ink">
              Edit
            </button>
            <button type="button" onClick={onDelete} className="text-xs text-danger transition-colors hover:text-danger">
              Delete
            </button>
          </div>
        ) : null}
      </div>

      <h4 className="mt-3 font-medium text-ink">{review.title}</h4>

      {review.containsSpoiler && !revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-2 w-full rounded-md border border-dashed border-amber-900 bg-amber-950/20 px-3 py-3 text-sm text-amber-300 transition-colors hover:bg-amber-950/40"
        >
          This review contains spoilers — click to show
        </button>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{review.content}</p>
      )}
    </article>
  )
}