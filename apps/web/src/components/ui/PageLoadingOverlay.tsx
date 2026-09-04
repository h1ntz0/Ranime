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
        'pointer-events-none fixed inset-0 z-40 flex items-center justify-center p-4 select-none',
        className,
      )}
    >
      <div className="pointer-events-none flex items-center gap-2.5 rounded-full border border-line bg-surface/95 px-4 py-2 shadow-xl shadow-black/50 backdrop-blur">
        <div className="h-4 w-4 shrink-0 rounded-full border-2 border-line-strong border-t-accent animate-spin" />
        <span className="text-xs font-medium whitespace-nowrap text-ink-2">{message}</span>
      </div>
    </div>
  )
}
