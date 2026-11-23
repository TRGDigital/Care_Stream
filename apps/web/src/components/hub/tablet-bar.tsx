'use client'

// Shared tablets in the hub. Two states:
//  - the tablet itself (device): NOTHING is shown except the "Who's using it?" screen (TabletLock); the server refuses everything else
//  - a staff member's personal session (after their PIN): their own full hub, with a banner and Done. After 4 minutes untouched a "Still there?"
//    prompt appears; after 5 minutes the session ends and the tablet returns to the lock screen. At most 45 minutes of continuous use.
// The server enforces what each may do (lib/shared-tablets.ts); this is the screen for it.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Delete, Loader2, Tablet, UserRound } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import { IDLE_MS, IDLE_WARN_MS, backToTablet, hasReturnToken, startPersonal } from '@/lib/tablet-client'

/** Shown in the page header while someone is using their own hub on a shared tablet. */
export function TabletBar() {
  const { data: session, status } = useSession()
  const dev = session?.user?.device
  const [warnLeft, setWarnLeft] = useState<number | null>(null)

  const done = useCallback(async () => {
    const ok = await backToTablet(session?.accessToken)
    window.location.href = ok ? '/chat' : '/login'
  }, [session?.accessToken])

  // 5 minutes with no touch, key or scroll ends the session; the last minute shows a "Still there?" prompt. Any touch counts as "still there".
  const last = useRef(Date.now())
  useEffect(() => {
    if (dev?.mode !== 'personal') return
    const poke = () => { last.current = Date.now() }
    const evs = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    evs.forEach(e => window.addEventListener(e, poke, { passive: true }))
    const t = setInterval(() => {
      const idle = Date.now() - last.current
      if (idle >= IDLE_MS || Date.now() >= dev.expiresAt - 5_000) { void done(); return }
      setWarnLeft(idle >= IDLE_MS - IDLE_WARN_MS ? Math.ceil((IDLE_MS - idle) / 1000) : null)
    }, 1_000)
    return () => { evs.forEach(e => window.removeEventListener(e, poke)); clearInterval(t) }
  }, [dev?.mode, dev?.expiresAt, done])

  // If a personal session simply ran out (or the browser was reloaded after it), the tablet gets itself back.
  useEffect(() => {
    if (status === 'unauthenticated' && hasReturnToken()) void backToTablet().then(ok => { if (ok) window.location.href = '/chat' })
  }, [status])

  if (dev?.mode !== 'personal') return null
  return (
    <>
      <div className="flex items-center justify-between gap-3 bg-teal px-4 py-2 text-sm text-white">
        <span className="flex min-w-0 items-center gap-2"><UserRound size={16} className="shrink-0" /><span className="truncate">You are using your own hub on a shared tablet: <strong>{session?.user?.name}</strong></span></span>
        <button onClick={() => void done()} className="shrink-0 rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-teal hover:bg-white/90">Done</button>
      </div>
      {warnLeft !== null && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-label="Still there?">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <p className="text-xl font-semibold text-neutral-dark">Still there?</p>
            <p className="mt-2 text-sm text-neutral-mid">This tablet will go back to the sign in screen in {warnLeft} second{warnLeft === 1 ? '' : 's'}.</p>
            <div className="mt-5 flex flex-col gap-2">
              <button onClick={() => { last.current = Date.now(); setWarnLeft(null) }} className="rounded-lg bg-teal px-4 py-3 text-base font-semibold text-white hover:bg-teal/90">Yes, I&rsquo;m still here</button>
              <button onClick={() => void done()} className="rounded-lg px-4 py-3 text-sm font-medium text-neutral-mid hover:bg-gray-50">No, I&rsquo;m done</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/** The whole screen of a connected tablet that nobody has signed in on. Nothing else is shown or reachable without a PIN. */
export function TabletLock() {
  const { data: session } = useSession()
  if (!session?.accessToken) return null
  return (
    <div className="flex h-[100dvh] flex-col bg-neutral-light">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-4 py-3 text-sm text-neutral-mid">
        <Tablet size={16} className="shrink-0 text-teal" /><span className="truncate">Shared tablet: <strong className="text-neutral-dark">{session.user.name}</strong></span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        <WhoPanel token={session.accessToken} tenantName={session.user.tenantName} />
      </div>
    </div>
  )
}

function WhoPanel({ token, tenantName }: { token: string; tenantName: string }) {
  const [people, setPeople] = useState<Array<{ id: string; name: string; photo_url: string | null; has_pin: boolean }> | null>(null)
  const [q, setQ] = useState('')
  const [who, setWho] = useState<{ id: string; name: string; photo_url: string | null; has_pin: boolean } | null>(null)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const load = useCallback(() => { createApiClient(token).tablets.roster().then(r => setPeople(r.people)).catch(() => setPeople([])) }, [token])
  useEffect(() => { load() }, [load])

  async function submit(p: string) {
    if (!who || busy) return
    setBusy(true); setMsg('')
    try { await startPersonal(token, tenantName, who.id, p); window.location.href = '/chat' }
    catch (e: any) { setMsg(e?.message ?? 'That PIN is not right.'); setPin(''); setBusy(false) }
  }
  function press(d: string) { if (busy) return; const n = (pin + d).slice(0, 4); setPin(n); if (n.length === 4) void submit(n) }

  const shown = (people ?? []).filter(p => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="flex w-full justify-center">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-lg font-semibold text-neutral-dark">{who ? `Hello ${who.name.split(' ')[0]}` : 'Who’s using it?'}</h2>
          {!who && <p className="mt-0.5 text-sm text-neutral-mid">To use chat, This is me, or to do your own training and actions, choose your name and enter your PIN.</p>}
        </div>
        {!who ? (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Type your name" autoFocus className="mb-3 w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
              {people === null && <Loader2 className="col-span-full mx-auto my-8 animate-spin text-teal" />}
              {shown.map(p => (
                <button key={p.id} onClick={() => { setWho(p); setPin(''); setMsg('') }} className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-3 hover:border-teal hover:bg-teal/5">
                  <StaffAvatar name={p.name} photoUrl={p.photo_url} size={64} onRefresh={load} />
                  <span className="text-center text-sm font-medium text-neutral-dark">{p.name}</span>
                </button>
              ))}
              {people && shown.length === 0 && <p className="col-span-full py-8 text-center text-sm text-neutral-mid">No one found.</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 p-6">
            <StaffAvatar name={who.name} photoUrl={who.photo_url} size={72} />
            <p className="text-sm text-neutral-mid">{who.has_pin ? 'Enter your 4 digit PIN' : 'You do not have a PIN yet. Ask your manager to send you one.'}</p>
            <div className="flex gap-3" aria-label="PIN">{[0, 1, 2, 3].map(i => <span key={i} className={`h-4 w-4 rounded-full border-2 ${i < pin.length ? 'border-teal bg-teal' : 'border-gray-300'}`} />)}</div>
            {msg && <p className="max-w-xs text-center text-sm text-red-600">{msg}</p>}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <button key={d} disabled={busy || !who.has_pin} onClick={() => press(d)} className="h-16 w-20 rounded-xl border border-gray-200 text-2xl font-semibold text-neutral-dark hover:bg-gray-50 disabled:opacity-40">{d}</button>)}
              <button onClick={() => { setWho(null); setPin(''); setMsg('') }} className="h-16 w-20 rounded-xl text-sm font-medium text-neutral-mid hover:bg-gray-50">Back</button>
              <button disabled={busy || !who.has_pin} onClick={() => press('0')} className="h-16 w-20 rounded-xl border border-gray-200 text-2xl font-semibold text-neutral-dark hover:bg-gray-50 disabled:opacity-40">0</button>
              <button disabled={busy} onClick={() => setPin(p => p.slice(0, -1))} className="flex h-16 w-20 items-center justify-center rounded-xl text-neutral-mid hover:bg-gray-50" aria-label="Delete"><Delete size={22} /></button>
            </div>
            {busy && <Loader2 className="animate-spin text-teal" />}
          </div>
        )}
      </div>
    </div>
  )
}
