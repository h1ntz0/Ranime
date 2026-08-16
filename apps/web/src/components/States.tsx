import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export function EmptyState({
  title,
  hint,
  icon,
  action,
  className,
}: {
  title: string
  hint?: string
  icon?: 'search' | 'library' | 'default'
  action?: ReactNode
  className?: string
}) {
  const glyph = icon === 'search' ? (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z"
    />
  ) : icon === 'library' ? (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
    />
  ) : (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
    />
  )

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line px-6 py-16 text-center',
        className,
      )}
    >
      <svg
        className="h-9 w-9 text-ink-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.25}
        aria-hidden="true"
      >
        {glyph}
      </svg>
      <h3 className="text-sm font-medium text-ink-2">{title}</h3>
      {hint ? <p className="max-w-md text-sm text-ink-3">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-line bg-surface/40 px-6 py-16 text-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-danger-soft text-danger">
        <svg
          className="h-4.5 w-4.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <p className="text-sm text-ink-2">{message}</p>
      {retry ? (
        <button
          type="button"
          onClick={retry}
          className="rounded-sm border border-line-strong px-3 py-1.5 text-sm text-ink-2 transition-colors hover:border-ink-4 hover:text-ink"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}