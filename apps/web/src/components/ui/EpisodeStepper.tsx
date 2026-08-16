import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

export function EpisodeStepper({
  value,
  max,
  disabled,
  onCommit,
  className,
}: {
  value: number
  max?: number
  disabled?: boolean
  onCommit: (episode: number) => void
  className?: string
}) {
  const [draft, setDraft] = useState(String(value))
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(String(value))
  }, [value, editing])

  const clamp = (n: number) => {
    if (!Number.isFinite(n) || n < 0) return 0
    return max !== undefined ? Math.min(n, max) : n
  }

  const commit = () => {
    const ep = clamp(Number(draft) || 0)
    setDraft(String(ep))
    setEditing(false)
    if (ep !== value) onCommit(ep)
  }

  const step = (delta: number) => onCommit(clamp(value + delta))

  const btn =
    'flex items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 h-10 w-10 lg:h-8 lg:w-8'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-control-border bg-control p-1',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease episode"
        disabled={disabled || value <= 0}
        onClick={() => step(-1)}
        className={cn(btn, 'hover:bg-surface-hover text-ink active:scale-95')}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M5 10a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 015 10z" />
        </svg>
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
          onFocus={(e) => e.target.select()}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          aria-label="Current episode"
          className="h-8 w-12 rounded-md bg-surface-hover text-center text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        />
      ) : (
        <button
          type="button"
          aria-label="Edit current episode"
          disabled={disabled}
          onClick={() => {
            setEditing(true)
            requestAnimationFrame(() => inputRef.current?.focus())
          }}
          className="flex h-8 w-12 items-center justify-center rounded-md text-sm font-bold text-ink transition-colors hover:bg-surface-hover disabled:opacity-40"
        >
          {value}
        </button>
      )}
      {max !== undefined && <span className="px-0.5 text-xs text-ink-3">/ {max}</span>}

      <button
        type="button"
        aria-label="Increase episode"
        disabled={disabled || (max !== undefined && value >= max)}
        onClick={() => step(1)}
        className={cn(btn, 'bg-accent text-background hover:brightness-110 active:scale-95')}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path d="M10 5a.75.75 0 01.75.75v3.5h3.5a.75.75 0 010 1.5h-3.5v3.5a.75.75 0 01-1.5 0v-3.5h-3.5a.75.75 0 010-1.5h3.5v-3.5A.75.75 0 0110 5z" />
        </svg>
      </button>
    </div>
  )
}
