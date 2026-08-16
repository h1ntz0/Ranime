import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchAnimeList, fetchAiring, fetchSeason } from '../lib/api'
import { AnimeCardGrid, AnimeCardView } from '../components/AnimeCard'
import { CardGridSkeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { displayTitle, formatScore, formatStatus } from '../lib/format'
import { Poster } from '../components/Poster'
import { Spinner } from '../components/ui/Spinner'
import { buttonClass } from '../components/ui/buttonStyles'
import { useAuth } from '../context/AuthContext'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: { to: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section className="mt-12" aria-label={title}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2.5">
          <span className="h-4 w-1 self-center rounded-full bg-accent" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
          </div>
        </div>
        {action && (
          <Link
            to={action.to}
            className="shrink-0 text-xs font-medium text-ink-3 transition-colors hover:text-accent-strong"
          >
            {action.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function SectionState({
  state,
  emptyTitle,
  emptyHint,
  skeletonCount,
}: {
  state: { isPending: boolean; isError: boolean; hasItems?: boolean }
  emptyTitle: string
  emptyHint?: string
  skeletonCount: number
}) {
  if (state.isPending) return <CardGridSkeleton count={skeletonCount} />
  if (state.isError) return <ErrorState message="This section is temporarily unavailable." />
  if (state.hasItems === false) return <EmptyState title={emptyTitle} hint={emptyHint} />
  return null
}

function sectionState(query: { isPending: boolean; isError: boolean; data?: { items: unknown[] } | null }): {
  isPending: boolean
  isError: boolean
  hasItems?: boolean
} {
  return {
    isPending: query.isPending,
    isError: query.isError,
    hasItems: query.data ? query.data.items.length > 0 : undefined,
  }
}

export default function HomePage() {
  const { user } = useAuth()
  const [heroIndex, setHeroIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const trending = useQuery({
    queryKey: ['home', 'trending'],
    queryFn: ({ signal }) => fetchAnimeList({ sort: 'TRENDING', limit: 24 }, signal),
  })
  const popular = useQuery({
    queryKey: ['home', 'popular'],
    queryFn: ({ signal }) => fetchAnimeList({ sort: 'POPULARITY', limit: 12 }, signal),
  })
  const airing = useQuery({
    queryKey: ['home', 'airing'],
    queryFn: ({ signal }) => fetchAiring(1, signal),
  })
  const topRated = useQuery({
    queryKey: ['home', 'top'],
    queryFn: ({ signal }) => fetchAnimeList({ sort: 'SCORE', limit: 12 }, signal),
  })

  const season = new Date().getMonth() >= 2 && new Date().getMonth() <= 4 ? 'SPRING' : new Date().getMonth() <= 1 ? 'WINTER' : new Date().getMonth() <= 7 ? 'SUMMER' : 'FALL'
  const currentSeason = useQuery({
    queryKey: ['home', 'season', season],
    queryFn: ({ signal }) => fetchSeason(new Date().getFullYear(), season, 1, signal),
  })

  const heroSlides = (trending.data?.items ?? []).slice(0, 5)
  const slideCount = heroSlides.length
  const safeIndex = slideCount > 0 ? heroIndex % slideCount : 0
  const hero = heroSlides[safeIndex]

  useEffect(() => {
    if (slideCount < 2 || paused) return
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % slideCount), 6000)
    return () => clearInterval(t)
  }, [slideCount, paused])

  function nextSlide() {
    if (slideCount > 0) setHeroIndex((i) => (i + 1) % slideCount)
  }
  function prevSlide() {
    if (slideCount > 0) setHeroIndex((i) => (i - 1 + slideCount) % slideCount)
  }

  const trendingRowRef = useRef<HTMLDivElement>(null)
  function scrollTrending(dir: 1 | -1) {
    const el = trendingRowRef.current
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div>
      <section
        aria-label="Featured anime"
        aria-roledescription="carousel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
        className="relative"
      >
        {hero ? (
          <div className="relative flex min-h-[400px] flex-col justify-end overflow-hidden rounded-md border border-line">
            {heroSlides.map((slide, i) => (
              <div
                key={slide.id}
                aria-hidden={i !== safeIndex}
                className={cn(
                  'absolute inset-0 transition-opacity duration-700',
                  i === safeIndex ? 'opacity-100' : 'pointer-events-none invisible opacity-0',
                )}
              >
                {slide.bannerImage || slide.coverImage ? (
                  <Poster
                    src={slide.bannerImage ?? slide.coverImage}
                    alt=""
                    eager
                    className="absolute inset-0 h-full w-full object-cover object-top opacity-50"
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
                <div className="relative z-10 max-w-2xl p-6 sm:p-10">
                  <p className="inline-flex items-center gap-1.5 rounded-sm border border-accent/40 bg-accent-soft/60 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent-strong">
                    Featured · #{i + 1} of {slideCount} trending
                  </p>
                  <h1 className="mt-3 text-2xl font-bold leading-tight text-ink sm:text-4xl">
                    {displayTitle(slide.title)}
                  </h1>
                  <p className="mt-1 text-sm text-ink-2">
                    {slide.title.english && slide.title.english !== displayTitle(slide.title)
                      ? slide.title.english
                      : slide.title.native ?? ''}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {slide.averageScore !== null && (
                      <span className="rounded-sm bg-positive px-1.5 py-0.5 font-semibold text-background">
                        {formatScore(slide.averageScore)}★
                      </span>
                    )}
                    <span className="text-ink-3">{slide.format}</span>
                    <span className="text-ink-3">{slide.seasonYear}</span>
                    {slide.episodes ? <span className="text-ink-3">{slide.episodes} eps</span> : null}
                    {slide.status ? <span className="text-ink-3">{formatStatus(slide.status)}</span> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {slide.genres.slice(0, 3).map((g) => (
                      <span key={g} className="rounded-sm border border-line-strong px-1.5 py-0.5 text-xs text-ink-2">
                        {g}
                      </span>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={`/anime/${slide.id}`} className={buttonClass('primary')}>
                      View Details
                    </Link>
                    {user && (
                      <Link to={`/anime/${slide.id}?action=watchlist`} className={buttonClass('secondary')}>
                        Add to Watchlist
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                aria-label="Previous featured anime"
                className="flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-background/60 text-ink-2 backdrop-blur transition-colors hover:bg-surface-raised hover:text-ink"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next featured anime"
                className="flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-background/60 text-ink-2 backdrop-blur transition-colors hover:bg-surface-raised hover:text-ink"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
              <div className="ml-1 flex items-center gap-1">
                {heroSlides.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setHeroIndex(i)}
                    aria-label={`Show featured anime ${i + 1}`}
                    aria-current={i === safeIndex ? 'true' : undefined}
                    className="flex h-8 w-8 items-center justify-center"
                  >
                    <span
                      className={cn(
                        'h-1.5 rounded-full transition-all',
                        i === safeIndex ? 'w-6 bg-accent-strong' : 'w-1.5 bg-ink-4 hover:bg-ink-3',
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : trending.isError ? (
          <ErrorState message="Anime data is temporarily unavailable. Please try again later." />
        ) : (
          <div className="flex min-h-[400px] items-center justify-center rounded-md border border-line">
            <Spinner />
          </div>
        )}
      </section>

      <Section
        title="Trending Now"
        subtitle="What everyone is watching right now."
        action={{ to: '/explore?sort=TRENDING', label: 'View all' }}
      >
        <SectionState state={sectionState(trending)} emptyTitle="No trending anime right now." skeletonCount={10} />
        {!trending.isPending && !trending.isError && trending.data && trending.data.items.length > 0 && (
          <div className="relative">
            <div
              ref={trendingRowRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {trending.data.items.slice(0, 12).map((anime) => (
                <div key={anime.id} className="w-36 shrink-0 snap-start sm:w-40 md:w-44 lg:w-48">
                  <AnimeCardView anime={anime} />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => scrollTrending(-1)}
              aria-label="Scroll trending backwards"
              className="absolute left-0 top-[38%] z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-background/80 text-ink-2 backdrop-blur transition-colors hover:bg-surface-raised hover:text-ink"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollTrending(1)}
              aria-label="Scroll trending forwards"
              className="absolute right-0 top-[38%] z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-background/80 text-ink-2 backdrop-blur transition-colors hover:bg-surface-raised hover:text-ink"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        )}
      </Section>

      <Section
        title="Popular Anime"
        subtitle="The most-watched anime of all time."
        action={{ to: '/explore?sort=POPULARITY', label: 'View all' }}
      >
        <SectionState state={sectionState(popular)} emptyTitle="Nothing popular yet." skeletonCount={8} />
        {!popular.isPending && !popular.isError && popular.data && popular.data.items.length > 0 && (
          <AnimeCardGrid items={popular.data.items} />
        )}
      </Section>

      <Section
        title="Airing Now"
        subtitle="Weekly episodes airing at the moment."
        action={{ to: '/airing', label: 'View all' }}
      >
        <SectionState state={sectionState(airing)} emptyTitle="Nothing is airing right now." skeletonCount={8} />
        {!airing.isPending && !airing.isError && airing.data && airing.data.items.length > 0 && (
          <AnimeCardGrid items={airing.data.items.slice(0, 12)} />
        )}
      </Section>

      <Section
        title="Current Season"
        subtitle="Fresh releases from this season."
        action={{ to: '/season', label: 'View all' }}
      >
        <SectionState state={sectionState(currentSeason)} emptyTitle="No anime this season." skeletonCount={8} />
        {!currentSeason.isPending && !currentSeason.isError && currentSeason.data && currentSeason.data.items.length > 0 && (
          <AnimeCardGrid items={currentSeason.data.items.slice(0, 12)} />
        )}
      </Section>

      <Section
        title="Top Rated"
        subtitle="The highest community-rated anime."
        action={{ to: '/top', label: 'View all' }}
      >
        <SectionState state={sectionState(topRated)} emptyTitle="No top anime yet." skeletonCount={8} />
        {!topRated.isPending && !topRated.isError && topRated.data && topRated.data.items.length > 0 && (
          <AnimeCardGrid items={topRated.data.items} />
        )}
      </Section>
    </div>
  )
}