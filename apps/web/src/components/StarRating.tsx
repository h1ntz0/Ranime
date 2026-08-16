import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'

const STAR_COUNT = 10

function StarIcon({
  className,
  filled = false,
  half = false,
}: {
  className?: string
  filled?: boolean
  half?: boolean
}) {
  return (
    <span className={cn('relative inline-flex', className)} aria-hidden="true">
      <svg viewBox="0 0 20 20" className={cn('h-full w-full', filled || half ? 'text-warning' : 'text-ink-4')}>
        <path
          fill="currentColor"
          d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.77l-5.2 2.75.99-5.8L1.58 7.62l5.82-.85L10 1.5z"
        />
      </svg>
      {half && (
        <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
          <svg viewBox="0 0 20 20" className="h-full w-full text-warning">
            <path
              fill="currentColor"
              d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.8L10 14.77l-5.2 2.75.99-5.8L1.58 7.62l5.82-.85L10 1.5z"
            />
          </svg>
        </span>
      )}
    </span>
  )
}

function StarRow({
  value,
  onChange,
  disabled,
  compact = false,
}: {
  value: number | null
  onChange: (score: number) => void
  disabled?: boolean
  compact?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const active = hover ?? value

  return (
    <div
      role="radiogroup"
      aria-label="Rate this anime from 1 to 10"
      className={cn('flex items-center', compact ? 'gap-0' : 'gap-0.5')}
      onMouseLeave={() => setHover(null)}
    >
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const idx = i + 1
        const filled = active !== null && idx <= Math.floor(active)
        const half =
          active !== null && active % 1 >= 0.5 && idx === Math.ceil(active) && idx > Math.floor(active)
        return (
          <button
            key={idx}
            type="button"
            role="radio"
            aria-checked={active !== null && idx <= Math.ceil(active)}
            aria-label={`${idx - 0.5} stars`}
            disabled={disabled}
            onClick={() => onChange(idx)}
            onMouseEnter={() => setHover(idx)}
            className={cn(
              'group/star flex items-center disabled:cursor-not-allowed disabled:opacity-60',
              compact ? 'h-7 w-5 p-0.5' : 'h-8 w-6 p-0.5',
            )}
          >
            <StarIcon
              className={cn(
                'transition-transform duration-75',
                filled || half ? '' : 'group-hover/star:scale-110',
              )}
              filled={filled}
              half={half}
            />
          </button>
        )
      })}
    </div>
  )
}

export function StarRating({
  value,
  onChange,
  disabled = false,
  variant = 'inline',
  menuPlacement = 'down',
}: {
  value: number | null
  onChange: (score: number) => void
  disabled?: boolean
  variant?: 'inline' | 'pill'
  menuPlacement?: 'down' | 'up'
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (variant === 'pill') {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={value !== null ? `Your rating: ${value.toFixed(1)} of 10` : 'Rate this anime'}
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-sm border bg-control px-3 py-2 text-sm font-medium text-ink transition-colors',
            'border-control-border hover:bg-control-hover focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <StarIcon className="h-4 w-4" filled={value !== null} />
          {value !== null ? (
            <span className="tabular-nums">{value.toFixed(1)}</span>
          ) : (
            <span className="text-ink-2">Rate</span>
          )}
        </button>

        {open && (
          <div
            role="dialog"
            aria-label="Set your rating"
            className={cn(
              'animate-pop-in absolute right-0 z-50 max-w-[calc(100vw-2rem)] rounded-sm border border-line bg-dropdown p-3 shadow-2xl shadow-black/50',
              menuPlacement === 'down' ? 'top-full mt-1.5' : 'bottom-full mb-1.5',
            )}
          >
            <div className="mb-2 flex items-center justify-between gap-6">
              <p className="text-xs text-ink-3">Tap a star to rate</p>
              {value !== null && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(0)
                    setOpen(false)
                  }}
                  className="text-xs text-ink-3 underline-offset-2 transition-colors hover:text-ink hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <StarRow
              value={value}
              onChange={(s) => {
                onChange(s)
                setOpen(false)
              }}
              disabled={disabled}
              compact
            />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <StarRow value={value} onChange={onChange} disabled={disabled} />
      {value !== null && !disabled && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="text-xs text-ink-3 underline-offset-2 transition-colors hover:text-ink hover:underline"
          aria-label="Remove rating"
        >
          Remove
        </button>
      )}
    </div>
  )
}
