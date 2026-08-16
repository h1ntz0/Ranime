import { cn } from '../lib/cn'

export function Pagination({
  page,
  perPage,
  total,
  hasNextPage,
  onPage,
}: {
  page: number
  perPage: number
  total: number
  hasNextPage: boolean
  onPage: (page: number) => void
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  if (totalPages <= 1) return null

  const pages: number[] = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let p = start; p <= end; p++) pages.push(p)

  const btn =
    'inline-flex h-11 min-w-11 items-center justify-center rounded-sm border border-line px-3 text-sm text-ink-2 transition-colors hover:border-line-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  const active = 'border-line-strong bg-surface-raised font-medium text-ink'

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1.5">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page">
        ←
      </button>
      {start > 1 && (
        <button type="button" className={btn} onClick={() => onPage(1)}>
          1
        </button>
      )}
      {start > 2 && <span className="px-1 text-ink-4">…</span>}
      {pages.map((p) => (
        <button
          type="button"
          key={p}
          className={cn(btn, p === page && active)}
          onClick={() => onPage(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      {end < totalPages - 1 && <span className="px-1 text-ink-4">…</span>}
      {end < totalPages && (
        <button type="button" className={btn} onClick={() => onPage(totalPages)}>
          {totalPages}
        </button>
      )}
      <button type="button" className={btn} disabled={!hasNextPage} onClick={() => onPage(page + 1)} aria-label="Next page">
        →
      </button>
    </nav>
  )
}