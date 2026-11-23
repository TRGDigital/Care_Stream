'use client'

// Admin side of shared tablets: the list, adding a tablet, revoking, the printable "Connect a tablet" poster (and renewing it), sending PINs
// to everyone once, and the small dialogs for one person's PIN. Admins never see a PIN unless they choose "Show PIN" (it is logged).
import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Loader2, Plus, Printer, RefreshCw, Tablet, X, Mail } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'

type List = Awaited<ReturnType<ReturnType<typeof createApiClient>['tablets']['list']>>
const when = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'never'
const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

/** The fields for a new tablet (used in the panel, and in Add staff member when "Shared tablet" is ticked). */
export function NewTabletForm({ token, onDone, onCancel }: { token: string; onDone: () => void; onCancel?: () => void }) {
  const [name, setName] = useState(''); const [location, setLocation] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('')
  async function save() {
    setBusy(true); setMsg('')
    try { await createApiClient(token).tablets.create(name, location); onDone() } catch (e: any) { setMsg(e?.message ?? 'Could not add the tablet.') } finally { setBusy(false) }
  }
  return (
    <div className="space-y-4">
      <p className="rounded-lg bg-teal/5 p-3 text-sm text-neutral-mid">A shared tablet is for a home that uses one or two tablets on the floor. Anyone can use Chat and This is me on it. Staff tap <strong>Who&rsquo;s using it?</strong> and enter their own PIN to use their own training and actions. A tablet is not counted as a staff member.</p>
      <div><label className="mb-1.5 block text-sm font-medium text-neutral-dark">Tablet name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Ward 2 tablet" className={inputCls} /></div>
      <div><label className="mb-1.5 block text-sm font-medium text-neutral-dark">Where is it kept? (optional)</label><input value={location} onChange={e => setLocation(e.target.value)} placeholder="Nurses' station" className={inputCls} /></div>
      {msg && <p className="text-sm text-red-600">{msg}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>}
        <button type="button" disabled={busy || !name.trim()} onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal/90 disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} Add tablet</button>
      </div>
    </div>
  )
}

/** A small live view of this account's tablets, shown at the top of the Staff page when there are any. Click to manage them. */
export function TabletStrip({ token, reloadKey, onOpen }: { token: string; reloadKey: number; onOpen: () => void }) {
  const [data, setData] = useState<List | null>(null)
  useEffect(() => { createApiClient(token).tablets.list().then(setData).catch(() => setData(null)) }, [token, reloadKey])
  const tablets = (data?.tablets ?? []).filter(t => !t.revoked)
  if (tablets.length === 0) return null
  const ago = (iso: string | null) => { if (!iso) return 'not used yet'; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 2 ? 'in use just now' : m < 60 ? `last used ${m} min ago` : m < 1440 ? `last used ${Math.round(m / 60)} h ago` : `last used ${when(iso)}` }
  return (
    <button type="button" onClick={onOpen} className="mb-5 flex w-full flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-gray-100 bg-white px-5 py-3 text-left shadow-card hover:border-teal/40">
      <span className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Tablet size={15} className="text-teal" /> Shared tablets</span>
      {tablets.map(t => (
        <span key={t.id} className="flex items-center gap-1.5 text-sm text-neutral-mid">
          <span className={`h-2 w-2 rounded-full ${t.connected ? 'bg-green-500' : 'bg-gray-300'}`} />
          <span className="font-medium text-neutral-dark">{t.name}</span>
          <span className="text-xs">{t.connected ? ago(t.last_seen_at) : 'not connected'}</span>
        </span>
      ))}
      <span className="ml-auto text-xs font-medium text-teal">Manage</span>
    </button>
  )
}

async function printPoster(token: string) {
  const w = window.open('', '_blank'); if (!w) { alert('Please allow pop ups to print the poster.'); return }
  w.document.write('<p style="font-family:sans-serif;padding:24px">Preparing the poster…</p>')
  try {
    const k = await createApiClient(token).tablets.posterKey()
    const url = `${window.location.origin}/tablet/connect?k=${encodeURIComponent(k.key)}`
    const qr = await QRCode.toDataURL(url, { width: 640, margin: 2 })
    const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
    const csLogo = `${window.location.origin}/logo-color.png`
    // The organisation's own logo comes first and large. With no logo saved the home's name stands in its place.
    const top = k.logo_url
      ? `<img src="${k.logo_url.replace(/"/g, '')}" alt="${esc(k.home_name)}" style="max-width:460px;max-height:190px;object-fit:contain;display:block;margin:0 auto 18px">`
      : `<div style="font-size:42px;font-weight:700;margin:0 0 18px">${esc(k.home_name)}</div>`
    w.document.open()
    w.document.write(`<!doctype html><title>Connect a tablet</title><body style="font-family:Arial,sans-serif;text-align:center;padding:40px 48px;color:#1A1530;margin:0">
      ${top}
      ${k.logo_url ? `<p style="font-size:22px;margin:0 0 22px;color:#5E4D70">${esc(k.home_name)}</p>` : ''}
      <h1 style="font-size:46px;margin:0 0 20px">Connect a tablet</h1>
      <img src="${qr}" style="width:400px;height:400px">
      <p style="font-size:26px;margin:24px auto 8px;max-width:640px">Scan this with the tablet&rsquo;s camera, find your name and enter your PIN.</p>
      <p style="font-size:17px;color:#5E4D70;max-width:640px;margin:0 auto 28px">For staff only. Printed ${new Date(k.rotated_at).toLocaleDateString('en-GB')}. Your manager will replace this poster ${({ 1: 'every month', 3: 'every three months', 6: 'every six months', 12: 'once a year' } as Record<number, string>)[k.reminder_months] ?? 'regularly'}.</p>
      <div style="border-top:1px solid #e5e7eb;padding-top:16px;max-width:640px;margin:0 auto"><img src="${csLogo}" alt="CareStream" style="height:44px"><div style="font-size:13px;color:#9ca3af;margin-top:4px">Powered by CareStream</div></div>
      <script>window.onload=function(){setTimeout(function(){window.print()},400)}</script></body>`)
    w.document.close()
  } catch { w.document.body.innerHTML = '<p style="font-family:sans-serif;padding:24px">Could not prepare the poster. Please close this window and try again.</p>' }
}

export function SharedTabletsPanel({ token, onClose }: { token: string; onClose: () => void }) {
  const api = createApiClient(token)
  const [data, setData] = useState<List | null>(null)
  const [err, setErr] = useState('')
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState('')
  const [info, setInfo] = useState('')
  const load = useCallback(() => { createApiClient(token).tablets.list().then(setData).catch(e => setErr(e?.message ?? 'Could not load shared tablets.')) }, [token])
  useEffect(() => { load() }, [load])
  const run = async (label: string, fn: () => Promise<string | void>) => { setBusy(label); setInfo(''); setErr(''); try { const m = await fn(); if (m) setInfo(m); load() } catch (e: any) { setErr(e?.message ?? 'That did not work.') } finally { setBusy('') } }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-card bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-dark"><Tablet size={18} className="text-teal" /> Shared tablets</h2><button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark" aria-label="Close"><X size={18} /></button></div>
        {err && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        {info && <p className="mb-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>}
        {!data ? (err ? null : <div className="h-32 animate-pulse rounded bg-gray-100" />) : adding ? (
          <NewTabletForm token={token} onDone={() => { setAdding(false); load() }} onCancel={() => setAdding(false)} />
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              {data.tablets.filter(t => !t.revoked).length === 0 && <p className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-sm text-neutral-mid">No shared tablets yet.</p>}
              {data.tablets.filter(t => !t.revoked).map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3">
                  <div className="min-w-0"><p className="font-medium text-neutral-dark">{t.name}{t.location && <span className="font-normal text-neutral-mid"> · {t.location}</span>}</p>
                    <p className="text-xs text-neutral-mid">{t.connected ? `Connected ${when(t.paired_at)}${t.paired_by ? ` by ${t.paired_by}` : ''} · last used ${when(t.last_seen_at)}` : 'Not connected yet. Scan the poster on the tablet.'}</p></div>
                  <button disabled={!!busy} onClick={() => confirm(`Disconnect ${t.name}? It stops working straight away and will need to be connected again from the poster.`) && run('rev' + t.id, async () => { await api.tablets.revoke(t.id) })} className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-50">Disconnect</button>
                </div>
              ))}
              {data.tablets.filter(t => !t.revoked).length < data.max_tablets && <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"><Plus size={14} /> Add a tablet</button>}
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-1 text-sm font-semibold text-neutral-dark">Connect a tablet poster</p>
              <p className="mb-3 text-sm text-neutral-mid">Print this and put it in staff areas. It shows your organisation logo at the top{!data.poster.has_logo && <strong className="text-amber-700"> (you have not added one yet: add it in Settings, Organisation logo, and the poster will use it)</strong>}. Scanning it signs nobody in: a staff member still has to find their name and enter their PIN to connect a tablet. {data.poster.rotated_at ? `Current poster made ${when(data.poster.rotated_at)}.` : ''}</p>
              {data.poster.due && <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">This poster is {data.poster.days_old} days old, past the reminder you set in Settings. Print a new one and take the old ones down.</p>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => printPoster(token)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal/90"><Printer size={14} /> Print poster</button>
                <button disabled={!!busy} onClick={() => confirm('Make a new poster? Old posters stop working for connecting new tablets. Tablets that are already connected stay connected.') && run('rot', async () => { await api.tablets.rotatePoster(); await printPoster(token); return 'New poster made. Take the old ones down.' })} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50"><RefreshCw size={14} /> Print a new poster</button>
                {data.tablets.some(t => t.connected) && <button disabled={!!busy} onClick={() => confirm('Disconnect every tablet? Each will need to be connected again from the poster.') && run('all', async () => { const r = await api.tablets.revokeAll(); return `${r.revoked} tablet${r.revoked === 1 ? '' : 's'} disconnected.` })} className="rounded-lg px-3 py-2 text-sm text-red-600 hover:underline disabled:opacity-50">Disconnect all</button>}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <p className="mb-1 text-sm font-semibold text-neutral-dark">Staff PINs</p>
              <p className="mb-3 text-sm text-neutral-mid">Each person has their own 4 digit PIN, emailed to them. {data.pins.with_pin} of {data.pins.staff_total} staff have one. New staff are sent theirs with their welcome. For one person, use the three dots menu on the Staff page (Show, Re-send or Regenerate PIN).</p>
              {data.pins.with_pin < data.pins.staff_total && (
                <button disabled={!!busy} onClick={() => confirm(`Email a PIN to the ${data.pins.staff_total - data.pins.with_pin} staff who do not have one yet?`) && run('pins', async () => { const r = await api.tablets.sendAllPins(); return `PINs sent to ${r.sent} staff.` })} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">{busy === 'pins' ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />} Send PINs to {data.pins.staff_total - data.pins.with_pin} staff</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** For the three dots menu. Returns a message to show. */
export async function staffPinAction(token: string, userId: string, name: string, action: 'show' | 'resend' | 'regenerate'): Promise<string> {
  const api = createApiClient(token)
  if (action === 'show') {
    if (!confirm(`Show ${name}'s PIN on this screen? This is recorded. Only do it if they cannot read their email.`)) return ''
    const r = await api.tablets.pin(userId, 'show'); return `${name}'s PIN is ${r.pin}. Tell them in person.`
  }
  if (action === 'regenerate' && !confirm(`Make ${name} a new PIN and email it to them? Their old PIN stops working and they are signed out of any tablet.`)) return ''
  if (action === 'resend' && !confirm(`Email ${name} their PIN again?`)) return ''
  const r = await api.tablets.pin(userId, action); return `${action === 'regenerate' ? 'New PIN' : 'PIN'} sent to ${r.to}.`
}
