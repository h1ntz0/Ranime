import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../../lib/cn'

export type SelectOption = { value: string; label: string }

export type CustomSelectProps = {
  value: string
  onChange: (value: string) => void
  options: readonly SelectOption[]
  placeholder?: string
  className?: string
  ariaLabel: string
  disabled?: boolean
  size?: 'md' | 'sm'
  triggerClassName?: string
  panelPlacement?: 'down' | 'up'
  renderTriggerValue?: (selected: SelectOption | undefined) => React.ReactNode
  renderOptionLeading?: (option: SelectOption) => React.ReactNode
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Any',
  className,
  ariaLabel,
  disabled = false,
  size = 'md',
  triggerClassName,
  panelPlacement = 'down',
  renderTriggerValue,
  renderOptionLeading,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const selected = options.find((o) => o.value === value)

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

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value)
      setActiveIndex(idx)
    }
  }, [open, options, value])

  function commit(o: SelectOption) {
    onChange(o.value)
    setOpen(false)
  }

  function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (e.key === 'Enter') {
        const opt = options[activeIndex]
        if (opt) commit(opt)
        return
      }
      const delta = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((prev) => {
        const next = prev < 0 ? (delta > 0 ? 0 : options.length - 1) : prev + delta
        return (next + options.length) % options.length
      })
    }
  }

  useEffect(() => {
    if (open && activeIndex >= 0 && listRef.current) {
      listRef.current.children[activeIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, open])

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-sm border border-line bg-surface text-sm text-ink transition-colors',
          'hover:border-line-strong focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          size === 'md' ? 'h-11 px-3' : 'h-9 px-2.5',
          triggerClassName,
        )}
      >
        <span className={cn('flex min-w-0 flex-1 items-center gap-2 text-ink', !selected && 'text-ink')}>
          {renderTriggerValue ? (
            renderTriggerValue(selected)
          ) : (
            <span className="truncate">{selected ? selected.label : placeholder}</span>
          )}
        </span>
        <svg
          className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform duration-150', open && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'slim-scrollbar absolute z-50 mt-1.5 max-h-64 w-max min-w-full max-w-[calc(100vw-2rem)] overflow-y-auto rounded-sm border border-line bg-dropdown py-1 shadow-2xl shadow-black/50 animate-pop-in',
            panelPlacement === 'down' ? 'left-0' : 'left-0 bottom-full mb-1.5',
          )}
        >
          {options.map((o, i) => {
            const isActive = i === activeIndex
            const isSelected = o.value === value
            return (
              <li
                key={o.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  commit(o)
                }}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
                  isActive ? 'bg-surface-hover text-ink' : isSelected ? 'text-accent-strong' : 'text-ink-2',
                )}
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {renderOptionLeading?.(o)}
                  <span>{o.label}</span>
                </span>
                {isSelected && (
                  <svg
                    className="h-4 w-4 shrink-0 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}