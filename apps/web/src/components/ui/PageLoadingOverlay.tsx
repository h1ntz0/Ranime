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
        'fixed inset-0 z-[99999] pointer-events-auto flex items-center justify-center bg-black/60 backdrop-blur-xs select-none transition-all',
        className,
      )}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-line-strong/80 bg-surface/95 px-6 py-5 shadow-2xl shadow-black/80 backdrop-blur-md">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <div className="h-8 w-8 rounded-full border-2 border-line-strong" />
          <div className="absolute h-8 w-8 rounded-full border-2 border-accent border-t-transparent border-r-transparent animate-spin" />
        </div>
        <span className="text-xs font-semibold tracking-wider text-ink uppercase">
          {message}
        </span>
      </div>
    </div>
  )
}
