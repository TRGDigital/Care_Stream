'use client'

// Bulk hub invitations: get many staff into the chat hub at once, either by
// emailing each person their own passwordless sign-in link, or by printing a
// QR sheet for the staff room. Reuses the per-user /users/:id/login-link
// endpoint (links are single use and last 14 days), looped sequentially.

import { useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { CheckCircle2, Loader2, Mail, Printer, QrCode, X } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

type StaffLite = { id: string; name: string; email: string; first_login_at?: string | null }

export function HubInviteModal({ token, staff, onClose }: { token: string; staff: StaffLite[]; onClose: () => void }) {
  // Staff who have never signed in are the ones an invite helps — preselected.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(staff.filter(s => !s.first_login_at).map(s => s.id))
  )
  const [working,  setWorking]  = useState<'email' | 'print' | null>(null)
  const [progress, setProgress] = useState(0)
  const [emailed,  setEmailed]  = useState<number | null>(null)
  const [failed,   setFailed]   = useState<string[]>([])

  const chosen = useMemo(() => staff.filter(s => selected.has(s.id)), [staff, selected])
  const neverIn = staff.filter(s => !s.first_login_at)

  function toggle(id: string) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  async function emailLinks() {
    setWorking('email'); setProgress(0); setEmailed(null); setFailed([])
    const api = createApiClient(token)
    let sent = 0
    const bad: string[] = []
    for (let i = 0; i < chosen.length; i++) {
      try { await api.users.loginLink(chosen[i].id, true); sent++ } catch { bad.push(chosen[i].name) }
      setProgress(i + 1)
    }
    setEmailed(sent); setFailed(bad); setWorking(null)
  }

  async function printQrSheet() {
    setWorking('print'); setProgress(0); setFailed([])
    const api = createApiClient(token)
    const cards: Array<{ name: string; qr: string }> = []
    const bad: string[] = []
    for (let i = 0; i < chosen.length; i++) {
      try {
        const { url } = await api.users.loginLink(chosen[i].id, false)
        cards.push({ name: chosen[i].name, qr: await QRCode.toDataURL(url, { width: 240, margin: 1 }) })
      } catch { bad.push(chosen[i].name) }
      setProgress(i + 1)
    }
    setFailed(bad); setWorking(null)
    if (cards.length === 0) return

    // A standalone print window keeps the sheet free of the app's styles.
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) { alert('Please allow pop-ups to print the QR sheet.') ; return }
    w.document.write(`<!doctype html><html><head><title>CareStream hub sign-in QR sheet</title><style>
      body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#1f2937}
      h1{font-size:18px;margin:0 0 4px}
      p.note{font-size:12px;color:#6b7280;margin:0 0 18px}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
      .card{border:1px solid #d1d5db;border-radius:10px;padding:14px;text-align:center;page-break-inside:avoid}
      .card img{width:170px;height:170px}
      .card .name{font-weight:bold;font-size:14px;margin:8px 0 4px}
      .card .steps{font-size:11px;color:#4b5563;text-align:left;margin:6px 0 0;padding-left:16px}
      @media print{.grid{grid-template-columns:repeat(3,1fr)}}
    </style></head><body>
      <h1>Sign in to the CareStream staff hub</h1>
      <p class="note">Each QR code is personal: it signs that one person straight in with no password. A code works once and lasts 14 days. Cut out your card and keep it private.</p>
      <div class="grid">${cards.map(c => `
        <div class="card">
          <img src="${c.qr}" alt="Sign-in QR code" />
          <div class="name">${esc(c.name)}</div>
          <ol class="steps"><li>Open your phone camera and scan your code</li><li>You are signed straight in</li><li>Add CareStream to your home screen and allow notifications</li></ol>
        </div>`).join('')}
      </div>
      <script>window.onload = function(){ window.print() }</script>
    </body></html>`)
    w.document.close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-full w-full max-w-2xl flex-col rounded-card bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <QrCode size={18} className="text-teal" />
            <h2 className="text-lg font-semibold text-neutral-dark">Get your team into the hub</h2>
          </div>
          {!working && <button onClick={onClose} className="rounded p-1 text-neutral-mid hover:text-neutral-dark" aria-label="Close"><X size={18} /></button>}
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <p className="mb-4 text-sm text-neutral-mid">
            Send everyone a <strong>passwordless sign-in link</strong>: no password to type or remember. Email each
            person their own link, or print a QR sheet for the staff room, each code signs its owner straight in.
            Links work once and last 14 days. Staff who have never signed in are ticked for you.
          </p>

          <div className="mb-2 flex items-center gap-4 text-xs font-semibold">
            <button onClick={() => setSelected(new Set(staff.map(s => s.id)))} className="text-teal hover:underline">Select everyone ({staff.length})</button>
            <button onClick={() => setSelected(new Set(neverIn.map(s => s.id)))} className="text-teal hover:underline">Never signed in ({neverIn.length})</button>
            <button onClick={() => setSelected(new Set())} className="text-neutral-mid hover:underline">Clear</button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-gray-100 bg-gray-50/60 p-3">
            {staff.map(s => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm text-neutral-dark">
                <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4 accent-[#9B52B5]" />
                <span className="min-w-0 truncate">{s.name}</span>
                {!s.first_login_at && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">Never signed in</span>}
              </label>
            ))}
          </div>

          {working && (
            <p className="mt-3 flex items-center gap-2 text-sm text-neutral-mid">
              <Loader2 size={14} className="animate-spin text-teal" />
              {working === 'email' ? 'Emailing links' : 'Preparing QR codes'}&hellip; {progress} of {chosen.length}
            </p>
          )}
          {emailed !== null && !working && (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle2 size={15} /> {emailed} sign-in link{emailed === 1 ? '' : 's'} emailed
            </p>
          )}
          {failed.length > 0 && !working && (
            <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Could not create a link for: {failed.join(', ')}. Try them again, or use the Sign-in link button on their detail card.</p>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={printQrSheet} disabled={!!working || chosen.length === 0}>
              <Printer size={14} className="mr-1.5" /> Print QR sheet ({chosen.length})
            </Button>
            <Button onClick={emailLinks} disabled={!!working || chosen.length === 0}>
              <Mail size={14} className="mr-1.5" /> Email sign-in links ({chosen.length})
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
