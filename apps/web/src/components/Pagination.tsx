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
    onPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Generate pages window adaptively for mobile & desktop
  const getPageNumbers = () => {
    // For small page counts, show all
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    const pages: (number | 'ellipsis')[] = []
    
    // Always include page 1
    pages.push(1)

    if (page > 3) {
      pages.push('ellipsis')
    }

    // Dynamic sibling window
    const start = Math.max(2, page - 1)
    const end = Math.min(totalPages - 1, page + 1)

    for (let p = start; p <= end; p++) {
      pages.push(p)
    }

    if (page < totalPages - 2) {
      pages.push('ellipsis')
    }

    // Always include last page
    if (totalPages > 1) {
      pages.push(totalPages)
    }

    return pages
  }

  const pageItems = getPageNumbers()

  const btn =
    'inline-flex h-9 min-w-9 sm:h-10 sm:min-w-10 items-center justify-center rounded-md border border-line px-2 sm:px-3 text-xs sm:text-sm font-medium text-ink-2 transition-colors hover:border-line-strong hover:bg-surface-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  const active = 'border-accent/60 bg-accent/15 text-accent font-semibold shadow-xs'

  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1 sm:gap-1.5 px-2">
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

      {pageItems.map((item, idx) => {
        if (item === 'ellipsis') {
          return (
            <span key={`ellipsis-${idx}`} className="px-1 text-xs text-ink-4 select-none">
              …
            </span>
          )
        }

        const isCurrent = item === page
        return (
          <button
            type="button"
            key={item}
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
        <span className="hidden sm:inline mr-1 text-xs">Next</span>
        <span aria-hidden="true" className="text-base leading-none">›</span>
      </button>
    </nav>
  )
}
