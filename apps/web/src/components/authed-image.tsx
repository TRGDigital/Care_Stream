'use client'

// Renders an image that lives behind an authenticated endpoint (can't be a plain
// <img src> because it needs a Bearer token). Fetches the bytes into a blob URL,
// shows a placeholder while loading, and revokes the URL on unmount.
import { useEffect, useState } from 'react'
import { clsx } from 'clsx'

export function AuthedImage({
  id, load, alt, className, onClick,
}: {
  id: string
  load: () => Promise<Blob>
  alt: string
  className?: string
  onClick?: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    setUrl(null); setErr(false)
    load()
      .then(b => { if (!active) return; objectUrl = URL.createObjectURL(b); setUrl(objectUrl) })
      .catch(() => { if (active) setErr(true) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (err) return <div className={clsx('flex items-center justify-center bg-neutral-light text-[10px] text-neutral-mid', className)} title="Could not load image">!</div>
  if (!url) return <div className={clsx('animate-pulse bg-neutral-light', className)} />
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} onClick={onClick} className={className} />
}
