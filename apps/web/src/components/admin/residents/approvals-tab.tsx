'use client'

import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, Loader2, Pencil, X } from 'lucide-react'
import type { ResidentContribution, ResidentDetail, ResidentSectionDef } from '@/lib/residents-api'
import { PhotoApprovals } from './photos'
import { VideoApprovals } from './videos'
import { ErrorBox, inputCls, btnPrimary, btnSecondary, btnDangerOutline, errMsg, fmtDate } from './ui'

type Client = ReturnType<typeof import('@/lib/residents-api').createResidentsClient>

export function ApprovalsTab({ client, resident, sections, onChanged }: { client: Client; resident: ResidentDetail; sections: ResidentSectionDef[]; onChanged: () => void }) {
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const label = (k: string) => sections.find(s => s.key === k)?.label ?? k

  const byNewest = (a: ResidentContribution, b: ResidentContribution) => b.submitted_at.localeCompare(a.submitted_at)
  const pending = resident.contributions.filter(c => c.status === 'pending').sort(byNewest)
  const history = resident.contributions.filter(c => c.status !== 'pending').sort(byNewest)

  const groups: Array<{ invite_id: string; name: string; relationship: string; items: ResidentContribution[] }> = []
  for (const c of pending) {
    let g = groups.find(x => x.invite_id === c.invite_id)
    if (!g) { g = { invite_id: c.invite_id, name: c.contributor_name, relationship: c.relationship, items: [] }; groups.push(g) }
    g.items.push(c)
  }

  async function decide(c: ResidentContribution, decision: 'approve' | 'reject', text?: string) {
    setBusyId(c.id); setError('')
    try {
      await client.decide(resident.id, c.id, text !== undefined ? { decision, text } : { decision })
      setEditing(null)
      onChanged()
    } catch (e) { setError(errMsg(e)) } finally { setBusyId(null) }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-neutral-mid">Family answers, photos and videos appear here first. Only what you approve is shown to staff. Photos and videos are never used by the assistant.</p>
      {error && <ErrorBox>{error}</ErrorBox>}

      <PhotoApprovals client={client} resident={resident} onChanged={onChanged} />
      <VideoApprovals client={client} resident={resident} onChanged={onChanged} />

      {groups.length === 0 && !(resident.photos ?? []).some(p => p.status === 'pending') && !(resident.videos ?? []).some(v => v.status === 'pending' && v.state === 'ready') ? (
        <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-neutral-mid">Nothing is waiting for approval.</p>
      ) : groups.map(g => (
        <section key={g.invite_id} className="rounded-lg border border-amber-200 bg-amber-50/40" aria-label={`Answers from ${g.name}`}>
          <h4 className="border-b border-amber-200 px-4 py-2 text-sm font-semibold text-neutral-dark">
            {g.name} <span className="font-normal text-neutral-mid">{g.relationship}</span>
          </h4>
          <ul className="divide-y divide-amber-100">
            {g.items.map(c => {
              const isEditing = editing === c.id
              const busy = busyId === c.id
              return (
                <li key={c.id} className="space-y-2 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">{label(c.section_key)}</p>
                  {isEditing ? (
                    <>
                      <label htmlFor={`ed-${c.id}`} className="sr-only">Edit the answer before approving</label>
                      <textarea id={`ed-${c.id}`} rows={4} className={`${inputCls} resize-y`} value={draft} onChange={e => setDraft(e.target.value)} autoFocus />
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm text-neutral-dark">{c.text}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {isEditing ? (
                      <>
                        <button type="button" className={btnPrimary} disabled={busy || !draft.trim()} onClick={() => decide(c, 'approve', draft.trim())}>
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve edited answer
                        </button>
                        <button type="button" className={btnSecondary} disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className={btnPrimary} disabled={busyId !== null} onClick={() => decide(c, 'approve')}>
                          {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                        </button>
                        <button type="button" className={btnSecondary} disabled={busyId !== null} onClick={() => { setEditing(c.id); setDraft(c.text) }}>
                          <Pencil size={13} /> Edit then approve
                        </button>
                        <button type="button" className={btnDangerOutline} disabled={busyId !== null} onClick={() => decide(c, 'reject')}>
                          <X size={14} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}

      {history.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowHistory(v => !v)} aria-expanded={showHistory} className="flex items-center gap-1 text-sm font-medium text-neutral-mid hover:text-neutral-dark">
            {showHistory ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Approved and rejected ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {history.map(c => (
                <li key={c.id} className="px-4 py-3 text-sm">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-neutral-mid">
                    <span className="font-semibold uppercase tracking-wide">{label(c.section_key)}</span>
                    <span>{c.contributor_name}, {c.relationship}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{c.status === 'approved' ? 'Approved' : 'Rejected'}</span>
                    {c.decided_at && <span>{fmtDate(c.decided_at)}</span>}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-neutral-dark">{c.status === 'approved' && c.approved_text ? c.approved_text : c.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
