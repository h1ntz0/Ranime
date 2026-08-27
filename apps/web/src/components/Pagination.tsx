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

  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return
    onPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Generate mobile-safe compact page numbers
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const items: (number | 'ellipsis')[] = []

    if (page <= 3) {
      // Near beginning: 1, 2, 3, 4, ..., total
      items.push(1, 2, 3, 4, 'ellipsis', totalPages)
    } else if (page >= totalPages - 2) {
      // Near end: 1, ..., total-3, total-2, total-1, total
      items.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
    } else {
      // Middle: 1, ..., page-1, page, page+1, ..., total
      items.push(1, 'ellipsis', page - 1, page, page + 1, 'ellipsis', totalPages)
    }

    return items
  }

  const pageItems = getPageNumbers()

  const btn =
    'inline-flex h-8 min-w-8 sm:h-9 sm:min-w-9 items-center justify-center rounded-md border border-line px-1.5 sm:px-2.5 text-xs sm:text-sm font-medium text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  const active = 'border-accent/60 bg-accent/15 text-accent font-semibold shadow-xs'

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-1 sm:gap-1.5 px-2 overflow-x-hidden">
      <button
        type="button"
        className={btn}
        disabled={page <= 1}
        onClick={() => handlePageChange(page - 1)}
        aria-label="Previous page"
      >
        <span aria-hidden="true" className="text-sm font-bold">‹</span>
      </button>

      {pageItems.map((item, idx) => {
        if (item === 'ellipsis') {
          return (
            <span key={`ellipsis-${idx}`} className="px-0.5 text-xs text-ink-4 select-none">
              …
            </span>
          )
        }

        const isCurrent = item === page
        return (
          <button
            type="button"
            key={`page-${item}`}
            className={cn(btn, isCurrent && active)}
            onClick={() => handlePageChange(item)}
            aria-current={isCurrent ? 'page' : undefined}
          >
            {item}
          </button>
        )
      })}

      <button
        type="button"
        className={btn}
        disabled={!hasNextPage || page >= totalPages}
        onClick={() => handlePageChange(page + 1)}
        aria-label="Next page"
      >
        <span aria-hidden="true" className="text-sm font-bold">›</span>
      </button>
    </nav>
  )
}

