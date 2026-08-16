import { useEffect, useState } from 'react'

export function EpisodeInput({
  value,
  max = 9999,
  disabled,
  onCommit,
  className = '',
  ariaLabel,
}: {
  value: number
  max?: number
  disabled?: boolean
  onCommit: (episode: number) => void
  className?: string
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])

  const commit = () => {
    const ep = Math.min(max, Math.max(0, Number(draft) || 0))
    setDraft(String(ep))
    if (ep !== value) onCommit(ep)
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={max}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      aria-label={ariaLabel}
      className={className}
    />
  )
}
