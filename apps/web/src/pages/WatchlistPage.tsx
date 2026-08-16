import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { fetchLibrary, removeWatchlist, updateWatchlist } from '../lib/api'
import { LibraryRow, LibraryRowActions } from '../components/library/LibraryRow'
import { Pagination } from '../components/Pagination'
import { Skeleton } from '../components/Skeleton'
import { EmptyState, ErrorState } from '../components/States'
import { useToast } from '../context/ToastContext'
import type { ListStatus } from '../lib/types'

export default function WatchlistPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1

  const data = useQuery({
    queryKey: ['watchlist', 'list', page],
    queryFn: ({ signal }) => fetchLibrary({ page, sort: 'RECENTLY_ADDED' }, signal),
    placeholderData: (prev) => prev,
  })

  const mutation = useMutation({
    mutationFn: ({
      animeId,
      input,
      remove,
    }: {
      animeId: number
      input?: { status: ListStatus; currentEpisode: number }
      remove?: boolean
    }) => (remove ? removeWatchlist(animeId) : updateWatchlist(animeId, input!)),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
      queryClient.invalidateQueries({ queryKey: ['library'] })
      toast(vars.remove ? 'Removed from watchlist' : 'Updated')
    },
    onError: (e) => toast(e instanceof Error ? e.message : 'Update failed', 'error'),
  })

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight text-ink">Watchlist</h1>
      <p className="mt-1 text-sm text-ink-3">Everything you added, most recent first.</p>

      <div className="mt-8">
        {data.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : data.isError ? (
          <ErrorState message="Watchlist is temporarily unavailable." retry={() => data.refetch()} />
        ) : data.data.items.length === 0 ? (
          <EmptyState
            title="Your watchlist is empty"
            hint="Start exploring anime and add something you want to watch."
            icon="library"
          />
        ) : (
          <>
            <ul className="space-y-3">
              {data.data.items.map((entry) => (
                <LibraryRow
                  key={entry.id}
                  entry={entry}
                  actions={
                    <LibraryRowActions
                      entry={entry}
                      actions={{
                        disabled: mutation.isPending,
                        onStatus: (status) =>
                          mutation.mutate({
                            animeId: entry.anime.id,
                            input: { status, currentEpisode: entry.currentEpisode },
                          }),
                        onEpisode: (episode) =>
                          mutation.mutate({
                            animeId: entry.anime.id,
                            input: { status: entry.status, currentEpisode: episode },
                          }),
                        onRemove: () => mutation.mutate({ animeId: entry.anime.id, remove: true }),
                      }}
                    />
                  }
                />
              ))}
            </ul>
            <Pagination
              page={data.data.page}
              perPage={data.data.perPage}
              total={data.data.total}
              hasNextPage={data.data.hasNextPage}
              onPage={(p) => setSearchParams({ page: String(p) })}
            />
          </>
        )}
      </div>
    </div>
  )
}