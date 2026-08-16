import { cn } from '../../lib/cn'

export function Spinner({ className, size = 8 }: { className?: string; size?: number }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: `${size * 4}px`, height: `${size * 4}px` }}
      className={cn('inline-block animate-spin rounded-full border-2 border-line-strong border-t-ink', className)}
    />
  )
}