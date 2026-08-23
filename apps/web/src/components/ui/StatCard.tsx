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
    <div className={cn('relative overflow-hidden rounded-md border border-line/80 bg-surface/40 p-4 transition-all duration-200 hover:border-line-strong hover:bg-surface/60', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix ? <span className="ml-1 text-xs font-normal text-ink-3">{suffix}</span> : null}
      </p>
    </div>
  )
}