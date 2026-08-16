import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchAnimeList } from '../lib/api'
import { displayTitle } from '../lib/format'
import { cn } from '../lib/cn'
import { Poster } from './Poster'
import { Spinner } from './ui/Spinner'

export function SearchBar({
  autoFocus = false,
  className,
  onClose,
}: {
  autoFocus?: boolean
  className?: string
  onClose?: () => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const results = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => fetchAnimeList({ q: debounced, limit: 6, page: 1 }, signal),
    enabled: debounced.length >= 2 && open,
    placeholderData: (prev) => prev,
  })

  const showPanel = open && (focused || query.length > 0) && query.trim().length > 0

  function close() {
    setOpen(false)
    setQuery('')
    setDebounced('')
    onClose?.()
  }

  function submit() {
    if (!query.trim()) return
    close()
    navigate(`/explore?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
        </svg>
        <input
          type="search"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submit()
            }
            if (e.key === 'Escape') close()
          }}
          placeholder="Search anime…"
          aria-label="Search anime"
          aria-expanded={showPanel}
          aria-controls="search-results"
          className="h-9 w-full rounded-sm border border-line bg-surface pl-9 pr-8 text-sm text-ink transition-colors placeholder:text-ink-3 focus:border-accent focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={close}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-surface-raised hover:text-ink"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showPanel && (
        <div
          id="search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-sm border border-line bg-surface-raised shadow-xl"
        >
          {results.isPending ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-ink-3">
              <Spinner size={1} />
              Searching…
            </div>
          ) : results.isError ? (
            <p className="px-4 py-6 text-sm text-ink-3">Search is temporarily unavailable.</p>
          ) : results.data && results.data.items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-ink-3">No anime found for “{debounced}”.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.data?.items.map((anime) => {
                const title = displayTitle(anime.title)
                return (
                  <li key={anime.id} role="option">
                    <Link
                      to={`/anime/${anime.id}`}
                      onClick={close}
                      className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface"
                    >
                      <Poster src={anime.coverImage} alt="" className="h-12 w-9 shrink-0 rounded-sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink">{title}</span>
                        <span className="block text-xs text-ink-3">
                          {anime.format ?? 'Anime'}
                          {anime.episodes ? ` · ${anime.episodes} eps` : ''}
                        </span>
                      </span>
                    </Link>
                  </li>
                )
              })}
              <li>
                <button
                  type="button"
                  onClick={submit}
                  className="w-full px-3 py-2 text-left text-xs text-accent transition-colors hover:bg-surface"
                >
                  View all results for “{query.trim()}” →
                </button>
              </li>
            </ul>
          )}
        </div>
      )}

      <span className={cn('sr-only', !showPanel && 'hidden')} aria-live="polite">
        {results.data ? `${results.data.items.length} results` : ''}
      </span>
    </div>
  )
}