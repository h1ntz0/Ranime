import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTop } from '../lib/api'
import { Poster } from '../components/Poster'
import { Button } from '../components/ui/Button'
import { displayTitle } from '../lib/format'
import { Spinner } from '../components/ui/Spinner'
import type { AnimeCard } from '../lib/types'

interface TierRow {
  tier: string
  color: string
  items: AnimeCard[]
}

const INITIAL_TIERS: TierRow[] = [
  { tier: 'S', color: 'bg-red-500/20 text-red-400 border-red-500/40', items: [] },
  { tier: 'A', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40', items: [] },
  { tier: 'B', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', items: [] },
  { tier: 'C', color: 'bg-green-500/20 text-green-400 border-green-500/40', items: [] },
  { tier: 'D', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', items: [] },
]

export default function TierListPage() {
  const [tiers, setTiers] = useState<TierRow[]>(INITIAL_TIERS)
  const [selectedAnime, setSelectedAnime] = useState<AnimeCard | null>(null)

  const topAnime = useQuery({
    queryKey: ['tier-list', 'top'],
    queryFn: ({ signal }) => fetchTop('top-rated', 1, signal),
  })

  // Pool of anime not yet placed in any tier
  const placedIds = new Set(tiers.flatMap((t) => t.items.map((i) => i.id)))
  const pool = (topAnime.data?.items ?? []).filter((a) => !placedIds.has(a.id))

  function placeInTier(tierIndex: number, anime: AnimeCard) {
    setTiers((prev) =>
      prev.map((t, idx) => {
        if (idx === tierIndex) {
          return { ...t, items: [...t.items, anime] }
        }
        return { ...t, items: t.items.filter((item) => item.id !== anime.id) }
      }),
    )
    setSelectedAnime(null)
  }

  function removeFromTier(animeId: number) {
    setTiers((prev) =>
      prev.map((t) => ({ ...t, items: t.items.filter((item) => item.id !== animeId) })),
    )
  }

  function resetTiers() {
    setTiers(INITIAL_TIERS)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Anime Tier List Maker</h1>
          <p className="mt-1 text-sm text-ink-3">
            Rank and build your personalized anime tier list. Tap or click an anime and choose a tier.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={resetTiers}>
            Reset Tiers
          </Button>
        </div>
      </div>

      {/* Selected Action Floating Helper for Mobile */}
      {selectedAnime && (
        <div className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent bg-surface-raised p-3 shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <Poster src={selectedAnime.coverImage} alt="" className="h-10 w-7 rounded-xs" />
            <span className="truncate text-xs font-semibold text-ink max-w-[150px] sm:max-w-xs">
              {displayTitle(selectedAnime.title)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-3">Place into:</span>
            {tiers.map((t, i) => (
              <button
                key={t.tier}
                type="button"
                onClick={() => placeInTier(i, selectedAnime)}
                className={`flex h-8 w-8 items-center justify-center rounded-md border font-bold text-xs transition-transform active:scale-95 ${t.color}`}
              >
                {t.tier}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSelectedAnime(null)}
              className="ml-2 text-xs text-ink-3 hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tier Board */}
      <div className="space-y-3 rounded-xl border border-line bg-surface/30 p-3 sm:p-4">
        {tiers.map((tierRow) => (
          <div
            key={tierRow.tier}
            className="flex min-h-[90px] flex-col rounded-lg border border-line bg-surface/40 sm:flex-row"
          >
            {/* Label */}
            <div
              className={`flex h-12 w-full sm:h-auto sm:w-20 shrink-0 items-center justify-center border-b sm:border-b-0 sm:border-r font-extrabold text-xl ${tierRow.color}`}
            >
              {tierRow.tier}
            </div>
            {/* Drop / Row Area */}
            <div className="flex min-h-[70px] flex-1 flex-wrap items-center gap-2 p-2.5">
              {tierRow.items.map((item) => (
                <div
                  key={item.id}
                  className="group relative cursor-pointer"
                  onClick={() => removeFromTier(item.id)}
                  title="Click to remove"
                >
                  <Poster
                    src={item.coverImage}
                    alt={displayTitle(item.title)}
                    className="h-16 w-12 rounded-sm border border-line object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-danger/80 opacity-0 transition-opacity group-hover:opacity-100">
                    <span className="text-xs text-white font-bold">✕</span>
                  </div>
                </div>
              ))}
              {tierRow.items.length === 0 && (
                <span className="text-xs italic text-ink-4 pl-2">Tap an anime below to add here</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Anime Pool */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Anime Pool (Top Ranked)</h2>
        {topAnime.isPending ? (
          <div className="flex justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {pool.map((anime) => (
              <button
                key={anime.id}
                type="button"
                onClick={() => setSelectedAnime(anime)}
                className={`group flex flex-col items-center rounded-md border p-1 text-left transition-all hover:border-accent ${
                  selectedAnime?.id === anime.id
                    ? 'border-accent ring-2 ring-accent/50 scale-105'
                    : 'border-line bg-surface/40'
                }`}
              >
                <Poster
                  src={anime.coverImage}
                  alt={displayTitle(anime.title)}
                  className="h-28 w-full rounded-sm object-cover"
                />
                <span className="mt-1.5 line-clamp-1 w-full text-[11px] font-medium text-ink-2 group-hover:text-ink">
                  {displayTitle(anime.title)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
