'use client'

import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { Loader2, X, Check, Plus, Trash2, CalendarDays } from 'lucide-react'

// The supervision recording form sections (Skills for Care style). 1-9 are free text; section 10
// (Agreed actions) is captured as rows that become the staff member's "My actions" on completion.
export const SUP_SECTIONS: Array<{ key: string; label: string }> = [
  { key: 'prev_actions',         label: 'Actions from the previous meeting' },
  { key: 'achievement',          label: 'What has been my biggest achievement since my last supervision?' },
  { key: 'values',               label: 'How do I continue to display the values of the organisation in my everyday work?' },
  { key: 'challenges_overcome',  label: 'What challenges have I faced since my last supervision and how have I managed and overcome them?' },
  { key: 'challenges_remaining', label: 'Are there any challenges that remain? If so, what is needed to help me overcome them?' },
  { key: 'learning',             label: 'What learning and development have I done since my last supervision and how have I put this learning into practice? Include any future learning opportunities.' },
  { key: 'goals',                label: 'What do I want to achieve before my next supervision?' },
  { key: 'supervisor_feedback',  label: 'Feedback from supervisor' },
  { key: 'other',                label: 'Other areas of discussion' },
]

const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

// An agreed action can optionally allocate a resource to the supervisee.
type AllocType = '' | 'training' | 'induction' | 'cqc'
type ActionRow = { description: string; alloc_type: AllocType; alloc_id: string }
type LibItem = { id: string; name: string }
type Libraries = { training: LibItem[]; induction: LibItem[]; cqc: LibItem[] }
const EMPTY_LIBS: Libraries = { training: [], induction: [], cqc: [] }

const ALLOC_LABELS: Array<{ value: AllocType; label: string }> = [
  { value: '',          label: 'No allocation' },
  { value: 'training',  label: 'Training' },
  { value: 'induction', label: 'Induction' },
  { value: 'cqc',       label: 'CQC prep' },
]
const ALLOC_PICK: Record<Exclude<AllocType, ''>, string> = {
  training:  'Choose a training module…',
  induction: 'Choose an induction flow…',
  cqc:       'Choose a CQC prep question…',
}

export function SupervisionForm({ token, supervisionId, onClose, onSaved }: { token: string; supervisionId: string; onClose: () => void; onSaved?: () => void }) {
  const [rec, setRec]         = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sections, setSections] = useState<Record<string, string>>({})
  const [actions, setActions]   = useState<ActionRow[]>([])
  const [libs, setLibs]         = useState<Libraries>(EMPTY_LIBS)
  const [nextDate, setNextDate] = useState('')
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')

  useEffect(() => {
    createApiClient(token).me.conductingDetail(supervisionId)
      .then(d => {
        setRec(d.record)
        setLibs(d.libraries ?? EMPTY_LIBS)
        const f = d.record.form ?? {}
        setSections(f.sections ?? {})
        setActions(Array.isArray(f.agreed_actions) && f.agreed_actions.length
          ? f.agreed_actions.map((a: any) => ({ description: a.description ?? '', alloc_type: (a.alloc_type ?? '') as AllocType, alloc_id: a.alloc_id ?? '' }))
          : [{ description: '', alloc_type: '', alloc_id: '' }])
        setNextDate(d.record.next_due ? d.record.next_due.slice(0, 10) : '')
      })
      .catch(e => setErr(e?.message ?? 'Could not load the supervision.'))
      .finally(() => setLoading(false))
  }, [token, supervisionId])

  const patchAction = (k: number, patch: Partial<ActionRow>) => setActions(p => p.map((x, j) => j === k ? { ...x, ...patch } : x))

  async function save() {
    setSaving(true); setErr('')
    try {
      await createApiClient(token).me.completeConducting(supervisionId, {
        form: { sections, agreed_actions: actions.filter(a => a.description.trim()).map(a => {
          const item = a.alloc_type && a.alloc_id ? libs[a.alloc_type].find(o => o.id === a.alloc_id) : null
          return {
            description: a.description.trim(),
            alloc_type: item ? a.alloc_type : undefined,
            alloc_id:   item ? a.alloc_id : undefined,
            alloc_name: item?.name,          // denormalised for display on the staff record
          }
        }) },
        next_date: nextDate || null,
      })
      onSaved?.(); onClose()
    } catch (e: any) { setErr(e?.message ?? 'Could not save the supervision.'); setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-5" onClick={onClose}>
      <div className="my-2 w-full max-w-3xl rounded-2xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal">Supervision record</p>
            <h2 className="mt-0.5 text-lg font-bold capitalize text-neutral-dark">{rec ? `${rec.type} — ${rec.supervisee}` : 'Supervision'}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 px-6 py-16 text-sm text-neutral-mid"><Loader2 size={18} className="animate-spin text-teal" /> Loading…</div>
        ) : !rec ? (
          <div className="px-6 py-10 text-sm text-red-600">{err || 'Could not load the supervision.'}</div>
        ) : (
          <div className="max-h-[78vh] space-y-5 overflow-y-auto px-6 py-5">
            {/* Pre-filled header */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-gray-100 bg-neutral-light/30 px-4 py-3 text-sm sm:grid-cols-2">
              <div><span className="text-neutral-mid">Supervisee: </span><span className="font-medium text-neutral-dark">{rec.supervisee}{rec.supervisee_role ? ` · ${rec.supervisee_role}` : ''}</span></div>
              <div><span className="text-neutral-mid">Supervisor: </span><span className="font-medium text-neutral-dark">{rec.conducted_by ?? '—'}</span></div>
              <div><span className="text-neutral-mid">Date held: </span><span className="font-medium text-neutral-dark">{fmtDate(rec.held_on)}</span></div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-mid"><CalendarDays size={12} className="mr-1 inline" />Next supervision:</span>
                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-teal focus:outline-none" />
              </div>
            </div>

            {rec.status === 'completed' && <p className="rounded-md bg-green-50 px-3 py-2 text-xs text-green-800">This supervision is recorded. You can update it and save again.</p>}

            {/* Sections 1-9 */}
            {SUP_SECTIONS.map((s, i) => (
              <div key={s.key}>
                <label className="mb-1 block text-sm font-medium text-neutral-dark">{i + 1}. {s.label}</label>
                <textarea value={sections[s.key] ?? ''} onChange={e => setSections(p => ({ ...p, [s.key]: e.target.value }))} rows={3}
                  className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:border-teal focus:outline-none" />
              </div>
            ))}

            {/* Section 10 — Agreed actions */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-dark">10. Agreed actions</label>
              <p className="mb-2 text-xs text-neutral-mid">Each action is added to {rec.supervisee.split(' ')[0]}&rsquo;s hub under &ldquo;My actions&rdquo;. You can also allocate a training module, an induction flow or a CQC prep question against an action, and it will be sent straight to their hub.</p>
              <div className="space-y-2.5">
                {actions.map((a, k) => {
                  const options = a.alloc_type ? libs[a.alloc_type] : []
                  return (
                    <div key={k} className="rounded-lg border border-gray-200 p-2.5">
                      <div className="flex items-center gap-2">
                        <input value={a.description} onChange={e => patchAction(k, { description: e.target.value })}
                          placeholder="Describe the action…" className="flex-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:border-teal focus:outline-none" />
                        <button onClick={() => setActions(p => p.filter((_, j) => j !== k))} className="shrink-0 rounded p-1.5 text-neutral-mid hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <select value={a.alloc_type} onChange={e => patchAction(k, { alloc_type: e.target.value as AllocType, alloc_id: '' })}
                          className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-neutral-dark focus:border-teal focus:outline-none sm:w-44">
                          {ALLOC_LABELS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {a.alloc_type && (
                          <select value={a.alloc_id} onChange={e => patchAction(k, { alloc_id: e.target.value })}
                            className="flex-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-neutral-dark focus:border-teal focus:outline-none">
                            <option value="">{ALLOC_PICK[a.alloc_type]}</option>
                            {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            {options.length === 0 && <option value="" disabled>None set up yet</option>}
                          </select>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setActions(p => [...p, { description: '', alloc_type: '', alloc_id: '' }])} className="mt-2 inline-flex items-center gap-1.5 rounded-btn border border-teal/40 px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal-light/30"><Plus size={13} /> Add action</button>
            </div>

            {err && <p className="text-sm text-red-600">{err}</p>}
          </div>
        )}

        {rec && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-3">
            <button onClick={onClose} className="rounded-btn border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:border-gray-300">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} {rec.status === 'completed' ? 'Save changes' : 'Save & complete'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
