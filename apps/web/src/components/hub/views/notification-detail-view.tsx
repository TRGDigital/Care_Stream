'use client'

// Staff hub: one notification. Reading it and pressing Mark as read tells the manager it has been seen.
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Check, ChevronLeft, Loader2 } from 'lucide-react'
import { myNotifications, fmtWhen } from '@/lib/notifications-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'

export function NotificationDetailView({ id, onBack }: { id: string; onBack: () => void }) {
  const { data: session } = useSession()
  const token = session?.accessToken
  const viewingAs = !!(session?.user as any)?.impersonation
  const [n, setN] = useState<Awaited<ReturnType<typeof myNotifications.get>>['notification'] | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { if (token && id) myNotifications.get(token, id).then(r => setN(r.notification)).catch(() => setMissing(true)) }, [token, id])

  async function markRead() {
    if (!token || !n || busy) return
    setBusy(true); setError('')
    try { const r = await myNotifications.markRead(token, n.id); setN({ ...n, read_at: r.read_at }) }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not mark it as read. Please try again.') } finally { setBusy(false) }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-2xl">
        <button type="button" onClick={onBack} className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium text-teal hover:underline"><ChevronLeft size={16} aria-hidden="true" /> All notifications</button>
        {missing ? <p className="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-neutral-mid">We could not find that notification. It may have been sent to someone else.</p>
          : !n ? <p className="mt-6 flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={16} className="animate-spin" /> Loading</p>
          : (
            <article className="mt-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                {n.sender_photo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`${API_URL}${n.sender_photo_url}`} alt="" className="h-12 w-12 rounded-full object-cover" />
                  : <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full bg-teal/10 text-base font-bold text-teal">{initials(n.sender_name)}</span>}
                <div><p className="text-sm font-semibold text-neutral-dark">{n.sender_name}</p><p className="text-xs text-neutral-mid">{fmtWhen(n.created_at)}</p></div>
              </div>
              <h1 className="mt-4 text-xl font-bold leading-snug text-neutral-dark">{n.title}</h1>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-neutral-dark">
                {n.body.split(/\n{2,}/).filter(p => p.trim()).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
              </div>
              <div className="mt-6 border-t border-gray-100 pt-5">
                {n.read_at
                  ? <p className="inline-flex items-center gap-2 text-base font-semibold text-green-700" role="status"><Check size={18} aria-hidden="true" /> Read {fmtWhen(n.read_at)}</p>
                  : viewingAs
                    ? <p className="text-sm text-neutral-mid">You are viewing this hub as someone else, so you cannot mark it as read for them.</p>
                    : <button type="button" onClick={markRead} disabled={busy} className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-teal px-6 py-3 text-lg font-semibold text-white hover:bg-teal-dark disabled:opacity-60 sm:w-auto">
                        {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Mark as read
                      </button>}
                {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              </div>
            </article>
          )}
      </div>
    </div>
  )
}
