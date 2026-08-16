import { STATUS_LABELS, STATUS_BADGE_STYLES, LIST_STATUSES, type ListStatus } from '../lib/types'
import { CustomSelect } from './ui/CustomSelect'
import { cn } from '../lib/cn'

export const STATUS_OPTIONS = LIST_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))

const STATUS_DOT: Record<ListStatus, string> = {
  PLANNING: 'bg-sky-400',
  WATCHING: 'bg-amber-400',
  COMPLETED: 'bg-emerald-400',
  PAUSED: 'bg-zinc-400',
  DROPPED: 'bg-red-400',
}

export function StatusSelect({
  value,
  onChange,
  disabled = false,
  className,
  panelPlacement = 'down',
}: {
  value: ListStatus | null
  onChange: (status: ListStatus | '') => void
  disabled?: boolean
  className?: string
  panelPlacement?: 'down' | 'up'
}) {
  return (
    <CustomSelect
      value={value ?? ''}
      ariaLabel="Library status"
      onChange={(v) => onChange(v as ListStatus | '')}
      options={[{ value: '', label: 'Not in library' }, ...STATUS_OPTIONS]}
      placeholder="Not in library"
      disabled={disabled}
      className={className}
      panelPlacement={panelPlacement}
      triggerClassName="h-11 rounded-sm border-control-border bg-control px-3.5 text-sm font-medium text-ink hover:border-ink-4 hover:bg-control-hover"
      renderTriggerValue={(selected) => (
        <>
          {selected?.value ? (
            <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[selected.value as ListStatus])} />
          ) : null}
          <span className="truncate">{selected ? selected.label : 'Not in library'}</span>
        </>
      )}
      renderOptionLeading={(o) =>
        o.value ? (
          <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[o.value as ListStatus])} />
        ) : null
      }
    />
  )
}

export function StatusBadge({ status }: { status: ListStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium ${STATUS_BADGE_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

export function ProgressBar({ value, className = '' }: { value: number | null; className?: string }) {
  if (value === null) return null
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-surface-raised ${className}`}>
      <div
        className="h-full rounded-full bg-ink-2 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${value}% complete`}
      />
    </div>
  )
}
