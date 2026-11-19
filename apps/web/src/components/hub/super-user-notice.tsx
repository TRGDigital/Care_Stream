'use client'

// For the company's Super User only. 1) The first time they open the hub after being tagged: what it means, and a choice to agree or decline.
// 2) Once they have agreed: a small heartbeat that adds seconds of real use (tab visible, used in the last 2 minutes) so CareStream can see
// how long they spend on the hub. Nobody else is timed. An admin viewing the hub as them is never timed, and can only see the notice in act mode on a test account.
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Award, Loader2 } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'

const BEAT_MS = 30_000
const IDLE_MS = 120_000

// actingAs: an admin using "View hub as" in act mode (test accounts only) sees the agree notice so the flow can be tried, but nothing is
// ever timed, because the minutes would be the admin's and not the Super User's.
export function SuperUserNotice({ actingAs = false }: { actingAs?: boolean }) {
  const { data: session } = useSession()
  const token = session?.accessToken
  const [state, setState] = useState<{ is: boolean; consented: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null)
  const lastActive = useRef(Date.now())

  useEffect(() => {
    if (!token) return
    createApiClient(token).users.superUserMe().then(r => setState({ is: r.is_super_user, consented: r.consented })).catch(() => setState({ is: false, consented: false }))
  }, [token])

  const timing = !actingAs && !!token && state?.is === true && (state.consented || done === 'accepted')
  useEffect(() => {
    if (!timing || !token) return
    const mark = () => { lastActive.current = Date.now() }
    const evs = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    evs.forEach(e => window.addEventListener(e, mark, { passive: true }))
    const api = createApiClient(token)
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - lastActive.current > IDLE_MS) return
      api.users.superUserActiveTime(BEAT_MS / 1000).catch(() => {})
    }, BEAT_MS)
    return () => { clearInterval(t); evs.forEach(e => window.removeEventListener(e, mark)) }
  }, [timing, token])

  if (!token || !state?.is || state.consented || done) {
    return done === 'accepted' ? <p className="sr-only">Thank you. You are now your service's Super User.</p> : null
  }
  async function answer(accept: boolean) {
    setBusy(true)
    try { await createApiClient(token!).users.superUserConsent(accept); setDone(accept ? 'accepted' : 'declined') } catch { /* try again */ } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label="Super User">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-teal/10"><Award size={22} className="text-teal" /></div>
        <h2 className="text-lg font-bold text-neutral-dark">You have been chosen as our Super User</h2>
        <p className="mt-2 text-sm text-neutral-mid">Your manager thinks you are the right person to champion CareStream here: using it well, and helping your colleagues use it for training and for getting quick answers.</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-neutral-dark">
          <li>CareStream says thank you with a <strong>£25 M&amp;S voucher</strong> if it goes well over your first 60 days.</li>
          <li>To do that, CareStream can see <strong>your own use of the hub</strong>: the days you use it, the training and audits you complete, your questions, and roughly how long you spend on it. We only see counts for your colleagues, never who they are or what they ask.</li>
          <li>You can say no, and you can stop any time. Saying no just means nothing is shared.</li>
        </ul>
        {actingAs && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">Test account: you are acting as this person. Agreeing here is recorded in the audit log, and nothing you do is timed.</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => answer(true)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60">{busy && <Loader2 size={14} className="animate-spin" />} Yes, I agree</button>
          <button type="button" onClick={() => answer(false)} disabled={busy} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-gray-300 disabled:opacity-60">No thanks</button>
        </div>
      </div>
    </div>
  )
}
