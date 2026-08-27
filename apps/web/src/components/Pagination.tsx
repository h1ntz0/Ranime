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

  // Mobile (< sm) 3-item view: [1] ... [current] ... [last]
  const getMobilePageNumbers = () => {
    if (totalPages <= 4) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const items: (number | 'ellipsis')[] = []
    if (page === 1) {
      items.push(1, 2, 'ellipsis', totalPages)
    } else if (page === totalPages) {
      items.push(1, 'ellipsis', totalPages - 1, totalPages)
    } else {
      items.push(1)
      if (page > 2) items.push('ellipsis')
      items.push(page)
      if (page < totalPages - 1) items.push('ellipsis')
      items.push(totalPages)
    }
    return items
  }

  // Desktop (>= sm) sliding window
  const getDesktopPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const items: (number | 'ellipsis')[] = []
    items.push(1)

    if (page > 4) items.push('ellipsis')

    const start = Math.max(2, page - 2)
    const end = Math.min(totalPages - 1, page + 2)
    for (let p = start; p <= end; p++) {
      items.push(p)
    }

    if (page < totalPages - 3) items.push('ellipsis')

    items.push(totalPages)
    return items
  }

  const mobileItems = getMobilePageNumbers()
  const desktopItems = getDesktopPageNumbers()

  const btn =
    'inline-flex h-9 min-w-[36px] sm:h-10 sm:min-w-[40px] shrink-0 items-center justify-center rounded-md border border-line px-2 sm:px-3 text-xs sm:text-sm font-medium text-ink-2 whitespace-nowrap transition-colors hover:border-line-strong hover:bg-surface-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  const active = 'border-accent/60 bg-accent/15 text-accent font-semibold shadow-xs'

  return (
    <nav aria-label="Pagination" className="mt-8 flex w-full items-center justify-center gap-1.5 px-2">
      {/* Prev Button */}
      <button
        type="button"
        className={btn}
        disabled={page <= 1}
        onClick={() => handlePageChange(page - 1)}
        aria-label="Previous page"
      >
        <span aria-hidden="true" className="text-base leading-none">‹</span>
        <span className="hidden sm:inline ml-1 text-xs">Prev</span>
      </button>

      {/* Mobile Page Numbers (< sm) */}
      <div className="flex sm:hidden items-center gap-1">
        {mobileItems.map((item, idx) => {
          if (item === 'ellipsis') {
            return (
              <span key={`m-ellipsis-${idx}`} className="px-1 text-xs text-ink-4 select-none">
                …
              </span>
            )
          }
          const isCurrent = item === page
          return (
            <button
              type="button"
              key={`m-page-${item}`}
              className={cn(btn, isCurrent && active)}
              onClick={() => handlePageChange(item)}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {item}
            </button>
          )
        })}
      </div>

      {/* Desktop Page Numbers (>= sm) */}
      <div className="hidden sm:flex items-center gap-1.5">
        {desktopItems.map((item, idx) => {
          if (item === 'ellipsis') {
            return (
              <span key={`d-ellipsis-${idx}`} className="px-1.5 text-xs text-ink-4 select-none">
                …
              </span>
            )
          }
          const isCurrent = item === page
          return (
            <button
              type="button"
              key={`d-page-${item}`}
              className={cn(btn, isCurrent && active)}
              onClick={() => handlePageChange(item)}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {item}
            </button>
          )
        })}
      </div>

      {/* Next Button */}
      <button
        type="button"
        className={btn}
        disabled={!hasNextPage || page >= totalPages}
        onClick={() => handlePageChange(page + 1)}
        aria-label="Next page"
      >
        <span className="hidden sm:inline mr-1 text-xs">Next</span>
        <span aria-hidden="true" className="text-base leading-none">›</span>
      </button>
    </nav>
  )
}


