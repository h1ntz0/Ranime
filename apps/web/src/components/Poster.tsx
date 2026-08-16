import { useState } from 'react'

const FALLBACK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 3"><rect width="2" height="3" fill="#18181b"/><text x="1" y="1.6" font-size="0.55" text-anchor="middle" fill="#52525b" font-family="sans-serif">?</text></svg>`,
  )

export function Poster({
  src,
  alt,
  className = '',
  eager = false,
}: {
  src: string | null | undefined
  alt: string
  className?: string
  eager?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const source = !src || failed ? FALLBACK : src
  return (
    <img
      src={source}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setFailed(true)}
      className={`bg-surface object-cover ${className}`}
      draggable={false}
    />
  )
}