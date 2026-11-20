'use client'

// A staff member's picture, or a tidy initials avatar when there is none (colour comes from the name, so the same person always
// gets the same colour). Used everywhere a person is shown: the staff list, the staff page, the hub header and "Your picture".
// Picture links are signed and expire after about ten minutes, so when the image fails to load we ask the parent for a fresh
// link once (onRefresh) and only then fall back to initials.

import { useEffect, useState } from 'react'
import { photoSrc } from '@/lib/residents-api'

// Soft backgrounds with dark text: light designs only.
const PALETTE: Array<{ bg: string; fg: string }> = [
  { bg: '#d9f0ee', fg: '#0f5c56' }, { bg: '#e0e7ff', fg: '#3730a3' }, { bg: '#fde8d7', fg: '#9a4a12' },
  { bg: '#fce7f3', fg: '#9d174d' }, { bg: '#e6f4d7', fg: '#3f6212' }, { bg: '#ede9fe', fg: '#5b21b6' },
  { bg: '#fef3c7', fg: '#92400e' }, { bg: '#dbeafe', fg: '#1e40af' },
]

export function initialsOf(name: string): string {
  const parts = (name || '').replace(/[^\p{L}\p{N}\s'-]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = Array.from(parts[0])[0] ?? '?'
  const last = parts.length > 1 ? (Array.from(parts[parts.length - 1])[0] ?? '') : ''
  return (first + last).toUpperCase()
}

export function colourFor(name: string) {
  let h = 0
  for (const c of name || '?') h = (h * 31 + c.codePointAt(0)!) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function StaffAvatar({ name, photoUrl, size = 36, className = '', onRefresh }: {
  name: string
  photoUrl?: string | null
  size?: number
  className?: string
  /** Called once when the picture fails to load (an expired link). Should fetch fresh data so photoUrl changes. */
  onRefresh?: () => void
}) {
  const [failed, setFailed] = useState(false)
  const [asked, setAsked] = useState(false)
  // A new link (after a refresh, replace or remove) gets a fresh chance.
  useEffect(() => { setFailed(false) }, [photoUrl])

  const { bg, fg } = colourFor(name)
  const dim = { width: size, height: size, minWidth: size }
  if (photoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoSrc(photoUrl)}
        alt={`Photo of ${name}`}
        width={size}
        height={size}
        style={dim}
        className={`shrink-0 rounded-full border border-gray-200 bg-white object-cover ${className}`}
        onError={() => {
          if (onRefresh && !asked) { setAsked(true); onRefresh() }
          setFailed(true)
        }}
      />
    )
  }
  return (
    <span
      role="img"
      aria-label={name ? `Initials of ${name}` : 'No picture'}
      style={{ ...dim, background: bg, color: fg, fontSize: Math.max(10, Math.round(size * 0.38)) }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none ${className}`}
    >
      {initialsOf(name)}
    </span>
  )
}
