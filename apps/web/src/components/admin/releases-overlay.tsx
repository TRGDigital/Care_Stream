'use client'

// "What is new": an icon in the admin header (next to the support menu) that opens the release notes in a panel on top of the page, so nobody
// loses their place. The same panel opens from "Releases and Announcements" in the support menu (window event cs:open-releases).
// A small dot shows while there is a release the person has not seen; opening the panel marks the newest as seen.

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Megaphone, X } from 'lucide-react'
import { RELEASES, NEWEST_RELEASE_ID } from '@/data/releases'
import { hasUnreadRelease } from '@/lib/support'

export const OPEN_RELEASES_EVENT = 'cs:open-releases'
const SEEN_KEY = 'cs-release-seen'

export function ReleasesButton() {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try { setUnread(hasUnreadRelease(NEWEST_RELEASE_ID, window.localStorage.getItem(SEEN_KEY))) } catch { setUnread(false) }
  }, [])

  const show = useCallback(() => {
    setOpen(true)
    try { if (NEWEST_RELEASE_ID) window.localStorage.setItem(SEEN_KEY, NEWEST_RELEASE_ID) } catch { /* storage blocked */ }
    setUnread(false)
  }, [])
  const hide = useCallback(() => { setOpen(false); btn.current?.focus() }, [])

  useEffect(() => {
    const on = () => show()
    window.addEventListener(OPEN_RELEASES_EVENT, on)
    return () => window.removeEventListener(OPEN_RELEASES_EVENT, on)
  }, [show])

  useEffect(() => {
    if (!open) return
    panel.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') hide() }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [open, hide])

  return (
    <>
      <button ref={btn} type="button" onClick={show} aria-label="What is new" title="What is new"
        className="relative rounded-full p-2 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40">
        <Megaphone size={20} />
        {unread && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal" aria-label="New release notes" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/30" onMouseDown={e => { if (e.target === e.currentTarget) hide() }}>
          <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="releases-title"
            className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl outline-none">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
              <div>
                <h2 id="releases-title" className="text-lg font-bold text-neutral-dark">What is new</h2>
                <p className="text-sm text-neutral-mid">Releases and announcements, newest first.</p>
              </div>
              <button type="button" onClick={hide} aria-label="Close" className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {RELEASES.map(r => (
                <article key={r.id} className="rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal">{r.date}</p>
                  <h3 className="mt-1 text-base font-bold leading-snug text-neutral-dark">{r.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-mid">{r.summary}</p>
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-dark">
                    {r.items.map(i => <li key={i}>{i}</li>)}
                  </ul>
                </article>
              ))}
            </div>
            <div className="border-t border-gray-200 px-5 py-3 text-right">
              <Link href="/releases" onClick={() => setOpen(false)} className="text-sm font-semibold text-teal hover:underline">Open as a full page</Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
