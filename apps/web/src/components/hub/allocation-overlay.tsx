'use client'

// The hub overlay shown when an admin has allocated something to this person. Same design and wording as the person-led email:
// small CareStream logo, headline, the admin's round picture (or initials), their name and role at the home, the details card, one
// primary button and a quiet Dismiss. Newest first, "1 of 3" with Next when several are waiting. Once dismissed or the button is
// used it is marked seen and never shows again. It checks on load and every 60 seconds while the hub is open.
//
// Never shown to CPD reviewers, locked-down hubs or an admin using "view as" (the parent passes enabled=false), and nothing is marked
// seen there.
import { useCallback, useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { StaffAvatar } from '@/components/admin/staff-avatar'

type Notice = Awaited<ReturnType<ReturnType<typeof createApiClient>['me']['notices']>>['notices'][number]

const POLL_MS = 60_000

/** "/chat?view=training" gives "training", "/cqc" gives "cqc", anything else (the hub home) gives null. */
export function hubViewFromHref(href: string | null | undefined): string | null {
  if (!href) return null
  try {
    const u = new URL(href, 'https://hub.local')
    const v = u.searchParams.get('view')
    if (v) return v
    if (u.pathname === '/cqc') return 'cqc'
  } catch { /* fall through */ }
  return null
}

export function AllocationOverlay({ token, enabled, onGo }: {
  token: string | undefined
  enabled: boolean
  /** Open a hub view by key. Called after the notice is marked seen. A null view means the hub home. */
  onGo: (view: string | null) => void
}) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [index, setIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<Element | null>(null)
  const seenHere = useRef<Set<string>>(new Set())

  const load = useCallback(() => {
    if (!enabled || !token) return
    createApiClient(token).me.notices()
      .then(r => {
        const fresh = (r.notices ?? []).filter(n => !seenHere.current.has(n.id))
        setNotices(prev => {
          // Keep what they are reading in place; add anything new at the front (newest first).
          if (!prev.length) return fresh
          const known = new Set(prev.map(n => n.id))
          const added = fresh.filter(n => !known.has(n.id))
          return added.length ? [...added, ...prev.filter(n => fresh.some(f => f.id === n.id))] : prev.filter(n => fresh.some(f => f.id === n.id))
        })
      })
      .catch(() => { /* quiet: an overlay is never worth an error message */ })
  }, [enabled, token])

  useEffect(() => {
    if (!enabled || !token) return
    load()
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, POLL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [enabled, token, load])

  const current = notices[Math.min(index, Math.max(0, notices.length - 1))]
  const open = enabled && !!current

  // Remember where focus was, move it into the dialog, and give it back when the overlay closes.
  useEffect(() => {
    if (!open) return
    returnFocus.current = document.activeElement
    primaryRef.current?.focus()
    return () => { (returnFocus.current as HTMLElement | null)?.focus?.() }
  }, [open])

  const markSeen = useCallback(async (n: Notice) => {
    seenHere.current.add(n.id)
    setNotices(prev => prev.filter(x => x.id !== n.id))
    if (token) { try { await createApiClient(token).me.markNoticeSeen(n.id) } catch { /* it will be marked next time */ } }
  }, [token])

  const dismiss = useCallback(async () => {
    if (!current || busy) return
    setBusy(true); await markSeen(current); setBusy(false)
  }, [current, busy, markSeen])

  const go = useCallback(async () => {
    if (!current || busy) return
    setBusy(true)
    const view = hubViewFromHref(current.href)
    await markSeen(current)
    setBusy(false)
    onGo(view)
  }, [current, busy, markSeen, onGo])

  // Escape dismisses; Tab stays inside the dialog.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); void dismiss(); return }
      if (e.key !== 'Tab') return
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])') ?? []).filter(el => !el.hasAttribute('disabled'))
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, dismiss])

  if (!open || !current) return null
  const total = notices.length
  const pos = Math.min(index, total - 1)
  const actor = current.actor
  const roleLine = actor ? (actor.home_name ? `${actor.job_role} at ${actor.home_name}` : actor.job_role) : ''

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-3 sm:p-6" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alloc-headline"
        className="max-h-[92vh] w-full max-w-[560px] overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between px-6 pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="CareStream" className="h-7 w-auto" />
          {total > 1 && <span className="text-xs font-medium text-neutral-mid" aria-live="polite">{pos + 1} of {total}</span>}
        </div>

        <h2 id="alloc-headline" className="px-8 pb-5 pt-5 text-center text-[22px] font-bold leading-[30px] text-neutral-dark">{current.headline}</h2>

        {actor && (
          <div className="flex flex-col items-center px-6">
            <StaffAvatar name={actor.name} photoUrl={actor.photo_url} size={96} />
            <p className="mt-2 text-[17px] font-bold text-neutral-dark">{actor.name}</p>
            <p className="pb-5 text-sm text-neutral-mid">{roleLine}</p>
          </div>
        )}

        {current.intro && <p className="px-8 pb-4 text-center text-[15px] leading-6 text-gray-700">{current.intro}</p>}

        {current.details.length > 0 && (
          <div className="mx-6 mb-2 rounded-xl border border-gray-200 bg-[#faf8fc] px-5 py-4">
            <dl className="space-y-3">
              {current.details.map((d, i) => (
                <div key={i} className="grid grid-cols-1 gap-0.5 sm:grid-cols-[130px_1fr] sm:gap-3">
                  <dt className="text-xs uppercase tracking-wide text-neutral-mid">{d.label}</dt>
                  <dd className="whitespace-pre-line text-[15px] font-semibold text-neutral-dark">{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        <div className="flex flex-col items-center gap-2 px-6 pb-6 pt-5">
          {current.button_label ? (
            <button
              ref={primaryRef}
              type="button"
              onClick={go}
              disabled={busy}
              className="min-h-[48px] w-full rounded-lg bg-[#9B52B5] px-8 py-3 text-[15px] font-bold text-white hover:bg-[#8a46a4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B52B5] focus-visible:ring-offset-2 disabled:opacity-60 sm:w-auto"
            >
              {current.button_label}
            </button>
          ) : null}
          <div className="flex items-center gap-4">
            <button
              ref={current.button_label ? undefined : primaryRef}
              type="button"
              onClick={dismiss}
              disabled={busy}
              className="min-h-[44px] rounded-md px-4 text-sm font-medium text-neutral-mid hover:text-neutral-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B52B5] disabled:opacity-60"
            >
              {current.button_label ? 'Dismiss' : 'Got it'}
            </button>
            {total > 1 && (
              <button
                type="button"
                onClick={() => setIndex(i => (i + 1) % total)}
                className="min-h-[44px] rounded-md px-4 text-sm font-medium text-[#7A3D9A] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B52B5]"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
