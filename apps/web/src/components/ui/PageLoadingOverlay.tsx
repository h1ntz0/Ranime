import { useEffect } from 'react'
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
  useEffect(() => {
    if (!isLoading) return
    // Prevent accidental background scroll jump while loading full transition
    const originalStyle = window.getComputedStyle(document.body).overflow
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [isLoading])

  if (!isLoading) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-xs transition-opacity duration-200 animate-in fade-in',
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line-strong/80 bg-surface/95 px-6 py-5 shadow-2xl shadow-black/60 backdrop-blur-md transition-transform animate-in zoom-in-95">
        <div className="relative flex h-10 w-10 items-center justify-center">
          {/* Subtle outer glow pulse */}
          <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-75" />
          {/* Track ring */}
          <div className="h-9 w-9 rounded-full border-2 border-line-strong" />
          {/* Spinning accent head */}
          <div className="absolute h-9 w-9 rounded-full border-2 border-accent border-t-transparent border-r-transparent animate-spin" />
        </div>
        <span className="text-xs font-semibold tracking-wider text-ink uppercase">
          {message}
        </span>
      </div>
    </div>
  )
}
