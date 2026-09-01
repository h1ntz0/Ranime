import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchAnimeList } from '../../lib/api'
import { Poster } from '../Poster'
import { displayTitle, formatScore } from '../../lib/format'
import { Spinner } from '../ui/Spinner'
import type { AnimeCard } from '../../lib/types'

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const searchResults = useQuery({
    queryKey: ['command-palette', query],
    queryFn: ({ signal }) => fetchAnimeList({ q: query, limit: 8 }, signal),
    enabled: query.trim().length > 1,
  })

  function handleSelect(path: string) {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  if (!open) return null

  const quickLinks = [
    { label: 'Explore Catalog', path: '/explore' },
    { label: 'Discovery Roulette', path: '/roulette' },
    { label: 'Compare Anime', path: '/compare' },
    { label: 'Tier List Maker', path: '/tier-list' },
    { label: 'Top Anime', path: '/top' },
    { label: 'Current Season', path: '/season' },
    { label: 'Airing Calendar', path: '/airing' },
    { label: 'Anime Genres', path: '/genres' },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-16 backdrop-blur-xs animate-in fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface-raised shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <svg className="h-5 w-5 text-ink-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime, jump to pages... (Press Esc to close)"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-4"
          />
          <kbd className="hidden rounded-xs border border-line bg-surface px-1.5 py-0.5 text-[10px] font-medium text-ink-3 sm:inline">
            ESC
          </kbd>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim().length > 1 ? (
            <div>
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-4">
                Anime Results
              </p>
              {searchResults.isPending && (
                <div className="flex items-center justify-center p-6">
                  <Spinner className="h-5 w-5" />
                </div>
              )}
              {searchResults.data?.items.map((anime: AnimeCard) => (
                <button
                  key={anime.id}
                  type="button"
                  onClick={() => handleSelect(`/anime/${anime.id}`)}
                  className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface"
                >
                  <Poster src={anime.coverImage} alt="" className="h-10 w-7 shrink-0 rounded-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{displayTitle(anime.title)}</p>
                    <p className="text-xs text-ink-3">
                      {anime.format} · {anime.seasonYear ?? '-'}
                    </p>
                  </div>
                  {anime.averageScore && (
                    <span className="shrink-0 text-xs font-bold text-warning">
                      ★ {formatScore(anime.averageScore)}
                    </span>
                  )}
                </button>
              ))}
              {searchResults.data?.items.length === 0 && (
                <p className="p-4 text-center text-xs text-ink-4">No anime found matching "{query}"</p>
              )}
            </div>
          ) : (
            <div>
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-4">
                Quick Navigation
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {quickLinks.map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => handleSelect(link.path)}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-left text-sm text-ink-2 transition-colors hover:bg-surface hover:text-ink"
                  >
                    <span>{link.label}</span>
                    <span className="text-[11px] text-ink-4">↵</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
