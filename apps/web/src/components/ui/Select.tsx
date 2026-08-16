import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

export function Select({ className, invalid, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'w-full rounded-sm border bg-surface px-3 py-2 text-sm text-ink transition-colors',
        invalid
          ? 'border-danger focus:border-danger focus:outline-none'
          : 'border-line focus:border-accent focus:outline-none',
        className,
      )}
      aria-invalid={invalid || undefined}
      {...props}
    />
  )
}