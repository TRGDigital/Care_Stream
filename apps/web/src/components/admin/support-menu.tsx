'use client'

// The support menu in the admin header, for every plan: help centre, release notes, report a bug, suggest a feature, and how to get in touch.
// Closes on Escape, on a click outside and when the page changes; focus goes back to the button. Bug and feature forms post to /feature-requests.

import { OPEN_EVENT } from '@/lib/support-chat-widget'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Bug, CircleHelp, Info, LifeBuoy, Lightbulb, Loader2, Mail, MessageCircle, Phone, X } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { SUPPORT_PHONE, isPaidTier, mailtoSupport, hasUnreadRelease } from '@/lib/support'
import { NEWEST_RELEASE_ID } from '@/data/releases'

const SEEN_KEY = 'cs-release-seen'
type FormKind = 'bug' | 'feature' | null

function Item({ icon, title, hint, href, onClick }: { icon: React.ReactNode; title: string; hint: string; href?: string; onClick?: () => void }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-light text-neutral-dark">{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-neutral-dark">{title}</span>
        <span className="block text-sm leading-snug text-neutral-mid">{hint}</span>
      </span>
    </>
  )
  const cls = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-neutral-light focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40'
  return href
    ? <Link href={href} className={cls} onClick={onClick} role="menuitem">{inner}</Link>
    : <button type="button" className={cls} onClick={onClick} role="menuitem">{inner}</button>
}

function ReportModal({ kind, onClose, token }: { kind: 'bug' | 'feature'; onClose: () => void; token?: string }) {
  const bug = kind === 'bug'
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [page, setPage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const id = useId()
  useEffect(() => { setPage(typeof window !== 'undefined' ? window.location.href : ''); first.current?.focus() }, [])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [onClose])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !token) return
    if (!title.trim()) { setError(bug ? 'Please give the problem a short title.' : 'Please give your idea a short title.'); return }
    if (!details.trim()) { setError(bug ? 'Please tell us what happened.' : 'Please describe the feature.'); return }
    setBusy(true); setError('')
    try {
      await createApiClient(token).featureRequests.create(title.trim(), details.trim(), { kind, ...(bug && page.trim() ? { page_url: page.trim() } : {}) })
      setDone(true)
    } catch (err: any) { setError(err?.message || 'Something went wrong. Please try again.') } finally { setBusy(false) }
  }

  const input = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id={`${id}-t`} className="text-lg font-bold text-neutral-dark">{bug ? 'Report a bug' : 'Suggest a feature'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>
        {done ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-neutral-dark">{bug ? 'Thank you. We have your report and will look into it.' : 'Thank you. We read every suggestion.'}</p>
            <button type="button" onClick={onClose} className="rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">Close</button>
          </div>
        ) : (
          <form onSubmit={send} className="space-y-4" noValidate>
            <p className="text-sm text-neutral-mid">{bug ? 'Tell us what went wrong. The more detail, the quicker we can fix it.' : 'Tell us what would make CareStream better for you.'}</p>
            <div>
              <label htmlFor={`${id}-a`} className="mb-1 block text-sm font-medium text-neutral-dark">{bug ? 'What went wrong? (short title)' : 'Your idea (short title)'}</label>
              <input id={`${id}-a`} ref={first} className={input} value={title} maxLength={200} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label htmlFor={`${id}-b`} className="mb-1 block text-sm font-medium text-neutral-dark">{bug ? 'What happened, and what did you expect?' : 'How would it work, and how would it help?'}</label>
              <textarea id={`${id}-b`} rows={5} className={input} value={details} maxLength={5000} onChange={e => setDetails(e.target.value)} />
            </div>
            {bug && (
              <div>
                <label htmlFor={`${id}-c`} className="mb-1 block text-sm font-medium text-neutral-dark">Where did it happen? (the page address, filled in for you)</label>
                <input id={`${id}-c`} className={input} value={page} maxLength={500} onChange={e => setPage(e.target.value)} />
              </div>
            )}
            {bug && <p className="text-xs text-neutral-mid">Please do not include names or health details of the people you support.</p>}
            {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-neutral-dark hover:bg-neutral-light">Cancel</button>
              <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60">
                {busy && <Loader2 size={14} className="animate-spin" />} Send
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function SupportMenu() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormKind>(null)
  const [unread, setUnread] = useState(false)
  const [ref, setRef] = useState<string | null>(null)
  const btn = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const token = session?.accessToken
  const paid = isPaidTier((session?.user as any)?.tier)

  useEffect(() => {
    try { setUnread(hasUnreadRelease(NEWEST_RELEASE_ID, window.localStorage.getItem(SEEN_KEY))) } catch { setUnread(false) }
  }, [pathname])

  // The customer reference (the account number) is read the first time the menu opens.
  useEffect(() => {
    if (!open || ref !== null || !token) return
    createApiClient(token).settings.get().then((s: any) => setRef(String(s?.account_number ?? ''))).catch(() => setRef(''))
  }, [open, ref, token])

  const close = useCallback((refocus = true) => { setOpen(false); if (refocus) btn.current?.focus() }, [])
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const click = (e: MouseEvent) => { if (!panel.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(false) }
    document.addEventListener('keydown', key); document.addEventListener('mousedown', click)
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('mousedown', click) }
  }, [open, close])

  function openReleases() {
    try { if (NEWEST_RELEASE_ID) window.localStorage.setItem(SEEN_KEY, NEWEST_RELEASE_ID) } catch { /* storage blocked */ }
    setUnread(false); setOpen(false)
  }
  function openForm(k: 'bug' | 'feature') { setOpen(false); setForm(k) }

  return (
    <div className="relative">
      <button ref={btn} type="button" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-haspopup="menu" aria-label="Support and help" title="Support and help"
        className="relative rounded-full p-2 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/40">
        <LifeBuoy size={20} />
        {unread && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-teal" aria-label="New release notes" />}
      </button>

      {open && (
        <div ref={panel} role="menu" aria-label="Support" className="absolute right-0 top-full z-[60] mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-2">
            <Item icon={<CircleHelp size={20} />} title="Help Centre" hint="Read our dedicated help articles" href="/guides" onClick={() => setOpen(false)} />
            <Item icon={<Info size={20} />} title="Releases and Announcements" hint="View our latest releases and announcements" href="/releases" onClick={openReleases} />
            <Item icon={<Bug size={20} />} title="Report a Bug" hint="Describe a bug you have spotted" onClick={() => openForm('bug')} />
            <Item icon={<Lightbulb size={20} />} title="Request Feature" hint="Suggest a new feature to add" onClick={() => openForm('feature')} />

            <div className="mx-1 mt-1 rounded-xl border border-teal/40 bg-teal/5 p-3.5">
              <div className="flex gap-3">
                <span className="mt-0.5 text-teal"><MessageCircle size={20} aria-hidden="true" /></span>
                <div className="min-w-0 text-sm">
                  <p className="font-semibold text-neutral-dark">Get In Touch</p>
                  <p className="mt-0.5 leading-snug text-neutral-mid">If you have any queries, get in touch with our team.</p>
                  {paid && SUPPORT_PHONE && (
                    <p className="mt-2 flex items-center gap-1.5 font-semibold text-neutral-dark"><Phone size={14} aria-hidden="true" /> <a href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`} className="hover:underline">{SUPPORT_PHONE}</a></p>
                  )}
                  {ref ? <p className="mt-1 text-xs text-neutral-mid">Customer reference: <span className="font-semibold text-neutral-dark">{ref}</span></p> : null}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 border-t border-gray-200 bg-neutral-light/60">
            <button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent(OPEN_EVENT)) }} className="flex items-center justify-center gap-2 px-3 py-3 text-sm font-semibold text-neutral-dark hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/40"><MessageCircle size={16} aria-hidden="true" /> Live Chat</button>
            <a href={mailtoSupport(ref)} className="flex items-center justify-center gap-2 border-l border-gray-200 px-3 py-3 text-sm font-semibold text-neutral-dark hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal/40"><Mail size={16} aria-hidden="true" /> Email Support</a>
          </div>
        </div>
      )}

      {form && <ReportModal kind={form} token={token} onClose={() => { setForm(null); btn.current?.focus() }} />}
    </div>
  )
}
