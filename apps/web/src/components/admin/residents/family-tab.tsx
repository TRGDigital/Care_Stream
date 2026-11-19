'use client'

import { useState } from 'react'
import { Loader2, Mail, RefreshCw, Send, Ban, Link2, Check } from 'lucide-react'
import type { ResidentDetail } from '@/lib/residents-api'
import { Field, ErrorBox, StatusChip, inputCls, btnPrimary, btnSecondary, btnDangerOutline, errMsg, fmtDate } from './ui'

type Client = ReturnType<typeof import('@/lib/residents-api').createResidentsClient>
const RELATIONSHIPS = ['Daughter', 'Son', 'Wife', 'Husband', 'Partner', 'Sister', 'Brother', 'Grandchild', 'Niece', 'Nephew', 'Friend', 'Neighbour']

export function FamilyTab({ client, resident, onChanged }: { client: Client; resident: ResidentDetail; onChanged: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [rel, setRel] = useState('')
  const [busy, setBusy] = useState(false)
  const [rowBusy, setRowBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [shown, setShown] = useState<{ id: string; link: string } | null>(null)   // the link just made: shown once, then gone

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    try {
      await client.invite(resident.id, { name: name.trim(), email: email.trim(), relationship: rel.trim() })
      setNotice(`Invitation sent to ${email.trim()}.`)
      setName(''); setEmail(''); setRel('')
      onChanged()
    } catch (err) { setError(errMsg(err)) } finally { setBusy(false) }
  }

  // The browser blocks copying in some settings, so the link is also shown in a box to copy by hand.
  async function showLink(id: string, link: string) {
    setShown({ id, link })
    try { await navigator.clipboard.writeText(link); setNotice('Link copied. Paste it into your email.') } catch { setNotice('Select the link below and copy it.') }
  }

  async function makeLink() {
    if (!name.trim() || !rel.trim()) { setError('Add a name and relationship first. The email address is optional.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const r = await client.createInviteLink(resident.id, { name: name.trim(), email: email.trim() || undefined, relationship: rel.trim() })
      setName(''); setEmail(''); setRel('')
      await showLink(r.invite.id, r.link)
      onChanged()
    } catch (err) { setError(errMsg(err)) } finally { setBusy(false) }
  }

  async function copyLink(i: { id: string; status: string }) {
    if ((i.status === 'sent' || i.status === 'opened') && !window.confirm('This makes a new link. The link already sent to them will stop working. Continue?')) return
    setRowBusy(i.id + 'link'); setError(''); setNotice('')
    try { const r = await client.copyInviteLink(resident.id, i.id); await showLink(i.id, r.link); onChanged() }
    catch (err) { setError(errMsg(err)) } finally { setRowBusy(null) }
  }

  async function act(inviteId: string, kind: 'resend' | 'revoke') {
    if (kind === 'revoke' && !window.confirm('Cancel this invitation? The private link will stop working.')) return
    setRowBusy(inviteId + kind); setError(''); setNotice('')
    try {
      if (kind === 'resend') { await client.resendInvite(resident.id, inviteId); setNotice('Invitation sent again.') }
      else { await client.revokeInvite(resident.id, inviteId); setNotice('Invitation cancelled.') }
      onChanged()
    } catch (err) { setError(errMsg(err)) } finally { setRowBusy(null) }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-neutral-dark">Ask family and friends</h3>
        <p className="mt-1 text-sm text-neutral-mid">They receive an email with a private link to a short form. Nothing they write is shown to staff until you approve it.</p>
      </div>

      <form onSubmit={invite} className="grid gap-3 rounded-lg border border-gray-200 bg-neutral-light/40 p-4 sm:grid-cols-3" aria-label="Invite a family member or friend">
        <Field label="Name" htmlFor="fm-name"><input id="fm-name" required className={inputCls} value={name} onChange={e => setName(e.target.value)} autoComplete="off" /></Field>
        <Field label="Email (optional if you copy the link)" htmlFor="fm-email"><input id="fm-email" type="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" /></Field>
        <Field label="Relationship" htmlFor="fm-rel">
          <input id="fm-rel" required list="fm-rel-list" maxLength={40} placeholder="For example daughter" className={inputCls} value={rel} onChange={e => setRel(e.target.value)} autoComplete="off" />
          <datalist id="fm-rel-list">{RELATIONSHIPS.map(r => <option key={r} value={r} />)}</datalist>
        </Field>
        <div className="flex flex-wrap gap-2 sm:col-span-3">
          <button type="submit" disabled={busy || !email.trim()} className={btnPrimary} title={email.trim() ? '' : 'Add an email address to send the invitation'}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send invitation</button>
          <button type="button" disabled={busy} onClick={makeLink} className={btnSecondary}><Link2 size={14} /> Create link to copy</button>
        </div>
      </form>

      {error && <ErrorBox>{error}</ErrorBox>}
      <p role="status" aria-live="polite" className="text-sm text-green-700">{notice}</p>
      {shown && (
        <div className="rounded-lg border border-teal/30 bg-teal-light/20 p-3">
          <p className="text-xs text-neutral-mid">Private link. It is shown only now, so copy it before you leave this page. Anyone with it can add to this profile until it expires.</p>
          <input readOnly value={shown.link} onFocus={e => e.currentTarget.select()} className={`${inputCls} mt-2 font-mono text-xs`} aria-label="Private family link" />
          <button type="button" className={`${btnSecondary} mt-2`} onClick={() => showLink(shown.id, shown.link)}><Check size={13} /> Copy again</button>
          <button type="button" className="ml-3 text-xs text-neutral-mid hover:text-neutral-dark" onClick={() => setShown(null)}>Hide</button>
        </div>
      )}

      {resident.invites.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-neutral-mid">No one has been asked yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
          {resident.invites.map(i => {
            const canCopy = i.status === 'sent' || i.status === 'opened' || i.status === 'expired'
            const canResend = canCopy && !!i.email
            const canRevoke = i.status === 'sent' || i.status === 'opened'
            return (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-dark">
                    {i.name} <span className="font-normal text-neutral-mid">{i.relationship}</span> <StatusChip status={i.status} />
                  </p>
                  <p className="flex items-center gap-1 break-all text-xs text-neutral-mid"><Mail size={11} className="shrink-0" /> {i.email || 'No email address, link only'}</p>
                  <p className="text-xs text-neutral-mid">
                    Sent {fmtDate(i.sent_at)}{i.submitted_at ? `, answered ${fmtDate(i.submitted_at)}` : i.status === 'expired' ? '' : `, expires ${fmtDate(i.expires_at)}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canCopy && (
                    <button type="button" className={btnSecondary} disabled={rowBusy !== null} onClick={() => copyLink(i)}>
                      {rowBusy === i.id + 'link' ? <Loader2 size={13} className="animate-spin" /> : <Link2 size={13} />} Copy link
                    </button>
                  )}
                  {canResend && (
                    <button type="button" className={btnSecondary} disabled={rowBusy !== null} onClick={() => act(i.id, 'resend')}>
                      {rowBusy === i.id + 'resend' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Resend
                    </button>
                  )}
                  {canRevoke && (
                    <button type="button" className={btnDangerOutline} disabled={rowBusy !== null} onClick={() => act(i.id, 'revoke')}>
                      {rowBusy === i.id + 'revoke' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Revoke
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
