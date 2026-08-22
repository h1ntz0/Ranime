import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchAnimeList, fetchCompareAnime } from '../lib/api'
import { Poster } from '../components/Poster'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { displayTitle, formatScore, formatStatus } from '../lib/format'
import { SearchBar } from '../components/SearchBar'
import type { AnimeCard } from '../lib/types'

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
  const [searchingSlot, setSearchingSlot] = useState<number | null>(null)

  const compareQuery = useQuery({
    queryKey: ['anime', 'compare', selectedIds.join(',')],
    queryFn: ({ signal }) => fetchCompareAnime(selectedIds, signal),
    enabled: selectedIds.length > 0,
  })

  const searchResults = useQuery({
    queryKey: ['search', 'compare', searchQuery],
    queryFn: ({ signal }) => fetchAnimeList({ q: searchQuery, limit: 6 }, signal),
    enabled: searchQuery.trim().length > 1,
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

  const items = compareQuery.data ?? []

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Compare Anime</h1>
          <p className="mt-1 text-sm text-ink-3">
            Compare stats, scores, formats, genres, and community reception side by side.
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Button variant="secondary" onClick={() => setSearchParams({})}>
            Clear All
          </Button>
        )}
      </div>

      {/* Slots selector */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((slotIndex) => {
          const animeItem = items[slotIndex]
          const isSlotSearching = searchingSlot === slotIndex

          if (animeItem) {
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
                      className="truncate font-semibold text-ink hover:text-accent-strong"
                    >
                      {displayTitle(animeItem.title)}
                    </Link>
                    <p className="mt-1 text-xs text-ink-3">{animeItem.format} · {animeItem.seasonYear ?? '—'}</p>
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
              className="flex min-h-[104px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface/20 p-4 text-center"
            >
              {isSlotSearching ? (
                <div className="w-full space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type anime title..."
                      className="w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchingSlot(null)
                        setSearchQuery('')
                      }}
                      className="text-xs text-ink-3 hover:text-ink"
                    >
                      Cancel
                    </button>
                  </div>
                  {searchResults.isPending && <Spinner className="h-4 w-4 mx-auto" />}
                  {searchResults.data?.items && searchResults.data.items.length > 0 && (
                    <ul className="max-h-48 overflow-y-auto rounded-md border border-line bg-surface-raised p-1 text-left text-xs">
                      {searchResults.data.items.map((card: AnimeCard) => (
                        <li key={card.id}>
                          <button
                            type="button"
                            onClick={() => addAnime(card.id)}
                            className="flex w-full items-center gap-2 rounded-sm p-1.5 hover:bg-surface hover:text-accent-strong"
                          >
                            <Poster src={card.coverImage} alt="" className="h-8 w-6 shrink-0 rounded-xs" />
                            <span className="truncate">{displayTitle(card.title)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
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

      {compareQuery.isPending && (
        <div className="flex min-h-[200px] items-center justify-center">
          <Spinner />
        </div>
      )}

      {items.length >= 2 && (
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
                    #{a.popularity?.toLocaleString() ?? '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Format</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    {a.format ?? '—'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3 sm:p-4 font-medium text-ink-3">Episodes / Duration</td>
                {items.map((a) => (
                  <td key={a.id} className="p-3 sm:p-4">
                    {a.episodes ? `${a.episodes} eps` : '—'} · {a.duration ? `${a.duration} min` : '—'}
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
                    {a.season ?? '—'} {a.seasonYear ?? ''}
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
                    {a.studios.join(', ') || '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
