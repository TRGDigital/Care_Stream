'use client'

// The sign in alert in the staff hub: "You have a notification from <name>". Shown on the first hub page after someone signs in (password, link or a
// PIN on a shared tablet) when they have notifications they have not read. "Read it" opens the notification; "Later" hides it until they next sign in.

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Bell } from 'lucide-react'
import { myNotifications, type MyItem } from '@/lib/notifications-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'
const store = (k: string, v?: string): string | null => { try { if (v !== undefined) { window.sessionStorage.setItem(k, v); return v } return window.sessionStorage.getItem(k) } catch { return null } }

export function NotificationOverlay() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [items, setItems] = useState<MyItem[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const token = session?.accessToken
  const user: any = session?.user ?? {}
  // A new sign in is a new token, so "Later" lasts for one sign in only (including each person's turn on a shared tablet).
  const key = token ? `cs-notif-later-${String(token).slice(-16)}` : ''
  const viewingAs = !!user.impersonation   // an administrator looking at someone's hub must not trigger or clear their alerts

  useEffect(() => {
    if (!token || viewingAs || !key || store(key)) return
    let live = true
    myNotifications.unread(token).then(r => { if (live && r.count > 0) { setItems(r.notifications); setOpen(true) } }).catch(() => undefined)
    return () => { live = false }
  }, [token, key, viewingAs])

  // Reading is the point: do not cover the notification itself.
  useEffect(() => { if (pathname?.startsWith('/my-notifications') || (typeof window !== 'undefined' && window.location.search.includes('view=notifications'))) setOpen(false) }, [pathname])

  // Focus moves into the dialog, Tab stays inside it, and Escape means Later.
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const btns = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])
    btns()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); later(); return }
      if (e.key !== 'Tab') return
      const b = btns(); if (!b.length) return
      const first = b[0], last = b[b.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function later() { if (key) store(key, '1'); setOpen(false) }
  function readIt() { if (key) store(key, '1'); setOpen(false); router.push(`/chat?view=notifications&id=${encodeURIComponent(items[0]?.id ?? '')}`) }

  if (!open || items.length === 0) return null
  const first = items[0]
  const many = items.length > 1
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="notif-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center gap-4">
          {first.sender_photo_url
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={`${API_URL}${first.sender_photo_url}`} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
            : <span aria-hidden="true" className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal/10 text-xl font-bold text-teal">{initials(first.sender_name)}</span>}
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal"><Bell size={13} aria-hidden="true" /> {many ? `${items.length} notifications` : 'New notification'}</p>
            <h2 id="notif-title" className="mt-0.5 text-lg font-bold leading-snug text-neutral-dark">You have {many ? 'notifications' : 'a notification'} from {first.sender_name}</h2>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5">
          {items.slice(0, 3).map(i => <li key={i.id} className="truncate rounded-lg bg-gray-50 px-3 py-2 text-sm font-medium text-neutral-dark">{i.title}</li>)}
          {items.length > 3 && <li className="px-1 text-xs text-neutral-mid">and {items.length - 3} more</li>}
        </ul>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" onClick={readIt} className="min-h-[48px] flex-1 rounded-xl bg-teal px-5 py-3 text-base font-semibold text-white hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal/40">Read it</button>
          <button type="button" onClick={later} className="min-h-[48px] flex-1 rounded-xl border border-gray-300 px-5 py-3 text-base font-semibold text-neutral-dark hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal/30">Later</button>
        </div>
      </div>
    </div>
  )
}
