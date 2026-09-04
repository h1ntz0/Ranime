import { cn } from '../../lib/cn'

interface PageLoadingOverlayProps {
  isLoading: boolean
  message?: string
  className?: string
}

export function PageLoadingOverlay({
  isLoading,
  message = 'Loading...',
  className,
}: PageLoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        'pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center select-none',
        className,
      )}
    >
      <div className="pointer-events-none flex items-center gap-2 rounded-full border border-line bg-surface/90 px-3 py-1.5 shadow-lg shadow-black/40 backdrop-blur">
        <div className="h-3.5 w-3.5 rounded-full border-2 border-line-strong border-t-accent animate-spin" />
        <span className="text-xs font-medium text-ink-2">{message}</span>
      </div>
    </div>
  )
}
