import { Link } from 'react-router-dom'
import type { ActivityItem, ListStatus } from '../lib/types'
import { displayTitle, timeAgo } from '../lib/format'
import { STATUS_LABELS } from '../lib/types'
import { Poster } from './Poster'

function describe(item: ActivityItem): string {
  const title = displayTitle(item.anime.title)
  switch (item.type) {
    case 'LIBRARY_ADDED':
      return `added ${title} to their library`
    case 'STATUS_CHANGED':
      return `moved ${title} to ${STATUS_LABELS[item.payload?.status as ListStatus] ?? 'a new status'}`
    case 'COMPLETED':
      return `completed ${title}`
    case 'RATED':
      return `rated ${title} ${item.payload?.score?.toFixed(1) ?? ''}`
    case 'REVIEWED':
      return `reviewed ${title}`
  }
}

export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line px-4 py-8 text-center text-sm text-ink-4">
        No activity yet.
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-sm border border-line bg-surface/40 px-3 py-2.5"
        >
          <Poster src={item.anime.coverImage} alt="" className="h-14 w-10 shrink-0 rounded-sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-ink-2">
              <span className="text-ink-2">{describe(item)}</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-4">{timeAgo(item.createdAt)}</p>
          </div>
          <Link
            to={`/anime/${item.anime.id}`}
            className="shrink-0 text-xs text-accent underline-offset-2 transition-colors hover:text-accent-strong hover:underline"
          >
            View
          </Link>
        </li>
      ))}
    </ul>
  )
}