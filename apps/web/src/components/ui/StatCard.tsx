import { cn } from '../../lib/cn'

export function StatCard({
  label,
  value,
  suffix,
  className,
}: {
  label: string
  value: number | string
  suffix?: string
  className?: string
}) {
  return (
    <div className={cn('rounded-sm border border-line bg-surface/40 p-4', className)}>
      <p className="text-xs uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix ? <span className="ml-0.5 text-sm font-normal text-ink-3">{suffix}</span> : null}
      </p>
    </div>
  )
}