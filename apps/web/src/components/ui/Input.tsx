import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-sm border bg-surface px-3 py-2 text-sm text-ink transition-colors',
        'placeholder:text-ink-3',
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