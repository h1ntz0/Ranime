import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'

interface PageLoadingOverlayProps {
  isLoading: boolean
  message?: string
  className?: string
  delayMs?: number
}

export function PageLoadingOverlay({
  isLoading,
  message = 'Loading...',
  className,
  delayMs = 250,
}: PageLoadingOverlayProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setVisible(false)
      return
    }
    const t = setTimeout(() => setVisible(true), delayMs)
    return () => clearTimeout(t)
  }, [isLoading, delayMs])

  if (!isLoading || !visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={message}
      className={cn(
        'pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-background/40 p-4 backdrop-blur-[2px] select-none animate-fade-in',
        className,
      )}
    >
      <div className="pointer-events-none flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface/90 px-6 py-5 shadow-2xl shadow-black/60 animate-pop-in">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-accent/20 animate-ping opacity-60" />
          <div className="h-9 w-9 rounded-full border-2 border-line-strong" />
          <div className="absolute h-9 w-9 rounded-full border-2 border-accent border-t-transparent border-r-transparent animate-spin" />
        </div>
        <span className="text-xs font-semibold tracking-wider text-ink uppercase">{message}</span>
      </div>
    </div>
  )
}
