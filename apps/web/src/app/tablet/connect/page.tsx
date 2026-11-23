'use client'

// "Connect a tablet": the page the printed poster's QR opens. It signs nobody in by itself: a staff member finds their name (by typing the
// first letters, there is no full list here), enters their PIN, and chooses which tablet this is. Then this browser becomes that tablet.
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Delete, Loader2, Tablet } from 'lucide-react'
import { StaffAvatar } from '@/components/admin/staff-avatar'
import { connectApi, connectTablet } from '@/lib/tablet-client'

type Person = { id: string; name: string; photo_url: string | null }
type Pad = { id: string; name: string; location: string | null; connected: boolean }

function Connect() {
  const key = useSearchParams().get('k') ?? ''
  const [home, setHome] = useState<string | null>(null)
  const [bad, setBad] = useState('')
  const [q, setQ] = useState('')
  const [people, setPeople] = useState<Person[]>([])
  const [who, setWho] = useState<Person | null>(null)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ticket, setTicket] = useState<{ ticket: string; tablets: Pad[] } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { if (!key) { setBad('This page needs the poster’s QR code.'); return } connectApi.info(key).then(r => setHome(r.home_name)).catch(e => setBad(e.message)) }, [key])
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (q.trim().length < 3 || !key) { setPeople([]); return }
    timer.current = setTimeout(() => { connectApi.search(key, q.trim()).then(r => setPeople(r.people)).catch(e => setMsg(e.message)) }, 250)
  }, [q, key])

  async function verify(p: string) {
    if (!who || busy) return
    setBusy(true); setMsg('')
    try { const r = await connectApi.verify(key, who.id, p); setTicket({ ticket: r.ticket, tablets: r.tablets }) }
    catch (e: any) { setMsg(e.message); setPin('') } finally { setBusy(false) }
  }
  function press(d: string) { if (busy) return; const n = (pin + d).slice(0, 4); setPin(n); if (n.length === 4) void verify(n) }
  async function pick(id: string) {
    if (!ticket || busy) return
    setBusy(true); setMsg('')
    try { await connectTablet(ticket.ticket, id); window.location.href = '/chat' } catch (e: any) { setMsg(e.message); setBusy(false) }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <Tablet className="mx-auto mb-2 text-teal" size={34} />
        <h1 className="text-2xl font-bold text-neutral-dark">Connect a tablet</h1>
        {home && <p className="mt-1 text-neutral-mid">{home}</p>}
      </div>
      {bad ? <p className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-700">{bad}</p> : !home ? <Loader2 className="mx-auto animate-spin text-teal" /> : ticket ? (
        <div>
          <p className="mb-3 text-center text-neutral-dark">Thank you, {who?.name.split(' ')[0]}. Which tablet is this?</p>
          {ticket.tablets.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-800">No tablets have been set up yet. An administrator needs to add one first.</p>}
          <div className="space-y-2">{ticket.tablets.map(t => (
            <button key={t.id} disabled={busy} onClick={() => pick(t.id)} className="flex w-full items-center justify-between rounded-xl border border-gray-200 px-4 py-4 text-left hover:border-teal hover:bg-teal/5 disabled:opacity-50">
              <span><span className="block font-semibold text-neutral-dark">{t.name}</span>{t.location && <span className="text-sm text-neutral-mid">{t.location}</span>}</span>
              {t.connected && <span className="text-xs text-neutral-mid">connected, replace</span>}
            </button>))}</div>
          {msg && <p className="mt-3 text-center text-sm text-red-600">{msg}</p>}
        </div>
      ) : !who ? (
        <div>
          <label className="mb-2 block text-center text-neutral-dark">Type the first letters of your name</label>
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg outline-none focus:border-teal focus:ring-2 focus:ring-teal/20" />
          {msg && <p className="mt-2 text-center text-sm text-red-600">{msg}</p>}
          <div className="mt-3 space-y-2">{people.map(p => (
            <button key={p.id} onClick={() => { setWho(p); setPin(''); setMsg('') }} className="flex w-full items-center gap-3 rounded-xl border border-gray-200 px-3 py-3 text-left hover:border-teal hover:bg-teal/5">
              <StaffAvatar name={p.name} photoUrl={p.photo_url} size={44} /><span className="font-medium text-neutral-dark">{p.name}</span>
            </button>))}
            {q.trim().length >= 3 && people.length === 0 && <p className="text-center text-sm text-neutral-mid">No one found. Check the spelling.</p>}</div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <StaffAvatar name={who.name} photoUrl={who.photo_url} size={72} />
          <p className="text-neutral-dark">{who.name}, enter your 4 digit PIN</p>
          <div className="flex gap-3">{[0, 1, 2, 3].map(i => <span key={i} className={`h-4 w-4 rounded-full border-2 ${i < pin.length ? 'border-teal bg-teal' : 'border-gray-300'}`} />)}</div>
          {msg && <p className="max-w-xs text-center text-sm text-red-600">{msg}</p>}
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => <button key={d} disabled={busy} onClick={() => press(d)} className="h-16 w-20 rounded-xl border border-gray-200 text-2xl font-semibold hover:bg-gray-50 disabled:opacity-40">{d}</button>)}
            <button onClick={() => { setWho(null); setPin(''); setMsg('') }} className="h-16 w-20 rounded-xl text-sm text-neutral-mid hover:bg-gray-50">Back</button>
            <button disabled={busy} onClick={() => press('0')} className="h-16 w-20 rounded-xl border border-gray-200 text-2xl font-semibold hover:bg-gray-50 disabled:opacity-40">0</button>
            <button disabled={busy} onClick={() => setPin(p => p.slice(0, -1))} className="flex h-16 w-20 items-center justify-center rounded-xl text-neutral-mid hover:bg-gray-50" aria-label="Delete"><Delete size={22} /></button>
          </div>
          {busy && <Loader2 className="animate-spin text-teal" />}
        </div>
      )}
    </div>
  )
}

export default function TabletConnectPage() { return <Suspense><Connect /></Suspense> }
