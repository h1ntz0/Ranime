import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchAnimeList, fetchCompareAnime, fetchTop } from '../lib/api'
import { Poster } from '../components/Poster'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { ErrorState } from '../components/States'
import { displayTitle, formatScore, formatStatus } from '../lib/format'
import type { AnimeCard } from '../lib/types'

const PRESETS = [
  { label: 'Classic Legends', ids: [1, 20], desc: 'Cowboy Bebop vs Naruto' },
  { label: 'Psychological Masterpieces', ids: [1535, 9253], desc: 'Death Note vs Steins;Gate' },
  { label: 'Epic Shonen', ids: [16498, 11061], desc: 'Attack on Titan vs Hunter x Hunter' },
]

export default function ComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawIds = searchParams.get('ids')
  const selectedIds = rawIds
    ? rawIds
        .split(',')
        .map(Number)
        .filter((n) => Number.isFinite(n) && n > 0)
        .slice(0, 3)
    : []

  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [searchingSlot, setSearchingSlot] = useState<number | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 200)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const compareQuery = useQuery({
    queryKey: ['anime', 'compare', selectedIds.join(',')],
    queryFn: ({ signal }) => fetchCompareAnime(selectedIds, signal),
    enabled: selectedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    retry: 1,
  })

  // Quick top anime pool for instant add without typing
  const topAnimeQuery = useQuery({
    queryKey: ['top', 'compare-pool'],
    queryFn: ({ signal }) => fetchTop('top-rated', 1, signal),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  })

  const searchResults = useQuery({
    queryKey: ['search', 'compare', debouncedSearch],
    queryFn: ({ signal }) => fetchAnimeList({ q: debouncedSearch, limit: 6 }, signal),
    enabled: debouncedSearch.trim().length > 1,
    staleTime: 60 * 1000,
    retry: 1,
  })

  function addAnime(id: number) {
    if (selectedIds.includes(id)) return
    const next = [...selectedIds, id].slice(0, 3)
    setSearchParams({ ids: next.join(',') })
    setSearchingSlot(null)
    setSearchQuery('')
  }

  function removeAnime(id: number) {
    const next = selectedIds.filter((x) => x !== id)
    if (next.length) {
      setSearchParams({ ids: next.join(',') })
    } else {
      setSearchParams({})
    }
  }

  function applyPreset(ids: number[]) {
    setSearchParams({ ids: ids.join(',') })
    setSearchingSlot(null)
    setSearchQuery('')
  }

  const items = compareQuery.data ?? []

  // Pool to show when user opens "+ Add Anime"
  const poolCards = searchQuery.trim().length > 1
    ? (searchResults.data?.items ?? [])
    : (topAnimeQuery.data?.items ?? []).filter((a) => !selectedIds.includes(a.id)).slice(0, 8)

  return (
    <div className="space-y-8">
      {/* Header & Preset Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Compare Anime</h1>
          <p className="mt-1 text-sm text-ink-3">
            Compare stats, scores, formats, genres, and community reception side by side.
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button variant="secondary" size="sm" onClick={() => setSearchParams({})}>
            Clear All
          </Button>
        )}
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface/30 p-3 text-xs">
        <span className="font-semibold text-ink-3">Quick Presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => applyPreset(preset.ids)}
            className="rounded-sm border border-line bg-surface px-2.5 py-1 text-ink-2 transition-colors hover:border-accent hover:text-accent-strong"
          >
            ⚡ {preset.label}
          </button>
        ))}
      </div>

      {/* Slots selector */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((slotIndex) => {
          const animeItem = items[slotIndex]
          const isSlotSearching = searchingSlot === slotIndex

          if (animeItem && !isSlotSearching) {
            return (
              <div
                key={animeItem.id}
                className="relative flex flex-col rounded-lg border border-line bg-surface/40 p-4 transition-all hover:border-accent/40"
              >
                <button
                  type="button"
                  onClick={() => removeAnime(animeItem.id)}
                  aria-label="Remove anime from comparison"
                  className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-ink-3 transition-colors hover:bg-danger hover:text-white"
                >
                  ✕
                </button>
                <div className="flex items-center gap-3">
                  <Poster src={animeItem.coverImage} alt="" className="h-20 w-14 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/anime/${animeItem.id}`}
                      className="truncate font-semibold text-ink hover:text-accent-strong block"
                    >
                      {displayTitle(animeItem.title)}
                    </Link>
                    <p className="mt-1 text-xs text-ink-3">{animeItem.format ?? 'TV'} · {animeItem.seasonYear ?? '-'}</p>
                    <p className="mt-1 text-xs font-semibold text-warning">
                      ★ {formatScore(animeItem.averageScore)}
                    </p>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <div
              key={slotIndex}
              className="flex min-h-[120px] flex-col justify-center rounded-lg border border-dashed border-line bg-surface/20 p-3 text-center"
            >
              {isSlotSearching ? (
                <div className="w-full space-y-2 text-left">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search or pick anime below..."
                      className="w-full rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchingSlot(null)
                        setSearchQuery('')
                      }}
                      className="text-xs text-ink-3 hover:text-ink shrink-0"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Instant suggestions list */}
                  <div className="max-h-48 overflow-y-auto rounded-md border border-line bg-surface-raised p-1 text-xs">
                    {searchQuery.trim().length > 1 && searchResults.isPending && (
                      <div className="flex items-center justify-center p-3 text-ink-3">
                        <Spinner className="h-4 w-4 mr-2" /> Searching...
                      </div>
                    )}

                    {poolCards.length > 0 ? (
                      <ul className="space-y-0.5">
                        {poolCards.map((card: AnimeCard) => (
                          <li key={card.id}>
                            <button
                              type="button"
                              onClick={() => addAnime(card.id)}
                              className="flex w-full items-center gap-2 rounded-sm p-1.5 transition-colors hover:bg-surface hover:text-accent-strong text-left"
                            >
                              <Poster src={card.coverImage} alt="" className="h-8 w-6 shrink-0 rounded-xs" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-ink">{displayTitle(card.title)}</p>
                                <p className="text-[10px] text-ink-3">{card.format ?? 'TV'} · ★ {formatScore(card.averageScore)}</p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      !searchResults.isPending && (
                        <p className="p-2 text-center text-xs text-ink-3">No anime found</p>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mx-auto"
                  onClick={() => {
                    setSearchingSlot(slotIndex)
                    setSearchQuery('')
                  }}
                >
                  + Add Anime
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {compareQuery.isError && selectedIds.length > 0 && (
        <ErrorState
          message="Failed to load comparison data. Please try again."
          retry={() => compareQuery.refetch()}
        />
      )}

      {compareQuery.isPending && items.length === 0 && selectedIds.length > 0 && (
        <div className="flex min-h-[150px] items-center justify-center gap-2 text-sm text-ink-3">
          <Spinner className="h-5 w-5" /> Comparing selected anime...
        </div>
      )}

      {items.length >= 2 ? (
        <div className="overflow-x-auto rounded-lg border border-line bg-surface/30 [scrollbar-width:thin]">
          <table className="w-full min-w-[500px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-raised/50 text-xs font-semibold uppercase text-ink-3">
                <th className="p-3 sm:p-4 w-1/4">Metric</th>
                {items.map((a) => (
                  <th key={a.id} className="p-3 sm:p-4 text-ink min-w-[140px]">
                    {displayTitle(a.title)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink-2">
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Score</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4 font-bold text-warning text-base">
                    ★ {formatScore(a.averageScore)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Community Rating</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    {a.communityRating?.average
                      ? `${a.communityRating.average.toFixed(1)} / 10 (${a.communityRating.count} votes)`
                      : 'No votes yet'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Popularity</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    #{a.popularity?.toLocaleString() ?? '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Format</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    {a.format ?? '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Episodes / Duration</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    {a.episodes ? `${a.episodes} eps` : '-'} · {a.duration ? `${a.duration} min` : '-'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Status</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    {formatStatus(a.status)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Season / Year</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    {a.season ?? '-'} {a.seasonYear ?? ''}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Genres</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    <div className="flex flex-wrap gap-1">
                      {a.genres.map((g) => (
                        <span
                          key={g}
                          className="rounded-xs border border-line bg-surface px-1.5 py-0.5 text-xs text-ink-2"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Studios</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    {a.studios.join(', ') || '-'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        selectedIds.length < 2 && !compareQuery.isPending && (
          <div className="rounded-lg border border-dashed border-line bg-surface/20 p-8 text-center text-sm text-ink-3">
            <p className="font-medium text-ink-2">Select at least 2 anime above to see side-by-side comparison</p>
            <p className="mt-1 text-xs text-ink-4">You can use "+ Add Anime" or choose one of the Quick Presets above.</p>
          </div>
        )
      )}
    </div>
  )
}
