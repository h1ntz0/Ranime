import { cn } from '../../lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'destructive'
export type ButtonSize = 'sm' | 'md' | 'icon'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-background hover:bg-white disabled:cursor-not-allowed disabled:opacity-50',
  secondary:
    'border border-line-strong bg-transparent text-ink-2 hover:border-ink-4 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50',
  ghost:
    'bg-transparent text-ink-2 hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50',
  danger: 'bg-transparent text-danger hover:bg-danger-soft disabled:cursor-not-allowed disabled:opacity-50',
  destructive:
    'bg-danger text-background hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  icon: 'p-2',
}

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-sm font-medium transition-all duration-150 active:scale-[0.98]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
    variants[variant],
    sizes[size],
  )
}