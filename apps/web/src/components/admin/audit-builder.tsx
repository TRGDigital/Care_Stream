'use client'

// Build or edit a home's own audit: sections, questions of every type, "only ask if" conditions and
// CQC quality statement tags. Saved as a tenant-owned AuditTemplate. Editing never rewrites history:
// the API retires a question that already has answers and adds the new wording as a new question,
// and every save becomes a new version (see the version history on the audits page).

import { useEffect, useMemo, useState } from 'react'
import { createApiClient, type AuditEditorQuestion } from '@/lib/api-client'
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, isYesNo } from '@/lib/audit-questions'
import { ArrowDown, ArrowUp, ChevronDown, Loader2, Plus, Trash2, X } from 'lucide-react'
import { clsx } from 'clsx'

type Section = { id: string | null; key: string; title: string; questions: AuditEditorQuestion[] }

const FREQS = ['periodic', 'daily', 'weekly', 'monthly', 'quarterly']
const SCOPES = [
  { value: 'none', label: 'The whole service' },
  { value: 'room', label: 'One room at a time' },
  { value: 'resident', label: 'One resident at a time' },
  { value: 'staff', label: 'One staff member at a time' },
]
const KQ_LABEL: Record<string, string> = { safe: 'Safe', effective: 'Effective', caring: 'Caring', responsive: 'Responsive', 'well-led': 'Well-led' }

let keySeq = 0
const newKey = () => `new-${Date.now().toString(36)}-${keySeq++}`
const blankQuestion = (): AuditEditorQuestion => ({ id: null, key: newKey(), text: '', type: 'yes_no_na', settings: null, show_if: null, quality_statement_id: null })

// The answers a condition can match for a question: yes / no / n/a, or its options.
function conditionChoices(q: AuditEditorQuestion): Array<{ value: string; label: string }> {
  if (isYesNo(q.type)) return [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }, ...(q.type === 'yes_no_na' ? [{ value: 'na', label: 'N/A' }] : [])]
  if (q.type === 'choice' || q.type === 'multi_choice') return (q.settings?.options ?? []).filter((o: any) => o.label).map((o: any) => ({ value: o.label, label: o.label }))
  return []
}

export function AuditBuilder({ token, templateId, onClose, onCreated }: {
  token: string
  templateId?: string | null
  onClose: () => void
  onCreated: () => void
}) {
  const editing = !!templateId
  const [loading, setLoading]     = useState(editing)
  const [name, setName]           = useState('')
  const [frequency, setFrequency] = useState('periodic')
  const [description, setDesc]    = useState('')
  const [scope, setScope]         = useState('none')
  const [requiresShift, setRequiresShift] = useState(false)
  const [version, setVersion]     = useState(0)
  const [changeNote, setChangeNote] = useState('')
  const [sections, setSections]   = useState<Section[]>([{ id: null, key: newKey(), title: 'Questions', questions: [blankQuestion()] }])
  const [open, setOpen]           = useState<string | null>(null)
  const [modules, setModules]     = useState<Array<{ id: string; name: string }>>([])
  const [moduleIds, setModuleIds] = useState<string[]>([])
  const [statements, setStatements] = useState<Array<{ id: string; name: string; key_question: string }>>([])
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    const api = createApiClient(token)
    api.audits.qualityStatements().then(d => setStatements(d.statements)).catch(() => {})
    if (!editing) api.faceToFace.modules().then(d => setModules(d.modules)).catch(() => {})
    if (editing && templateId) {
      api.audits.templateStructure(templateId).then(({ template: t }) => {
        setName(t.name); setFrequency(t.frequency); setDesc(t.description ?? ''); setScope(t.subject_scope)
        setRequiresShift(t.requires_shift); setVersion(t.version)
        setSections(t.sections.map(s => ({ id: s.id, key: s.id ?? newKey(), title: s.title, questions: s.questions })))
      }).catch(e => setError(e?.message ?? 'Could not load the audit.')).finally(() => setLoading(false))
    }
  }, [token, templateId, editing])

  // Every question in order, for condition pickers (a condition may only point at an earlier question).
  const ordered = useMemo(() => sections.flatMap(s => s.questions), [sections])

  function patchSection(si: number, patch: Partial<Section>) {
    setSections(ss => ss.map((s, i) => (i === si ? { ...s, ...patch } : s)))
  }
  function patchQuestion(si: number, qi: number, patch: Partial<AuditEditorQuestion>) {
    setSections(ss => ss.map((s, i) => (i !== si ? s : { ...s, questions: s.questions.map((q, j) => (j === qi ? { ...q, ...patch } : q)) })))
  }
  function patchSettings(si: number, qi: number, patch: any) {
    const q = sections[si].questions[qi]
    patchQuestion(si, qi, { settings: { ...(q.settings ?? {}), ...patch } })
  }
  function moveQuestion(si: number, qi: number, dir: -1 | 1) {
    setSections(ss => ss.map((s, i) => {
      if (i !== si) return s
      const qs = [...s.questions]; const j = qi + dir
      if (j < 0 || j >= qs.length) return s
      ;[qs[qi], qs[j]] = [qs[j], qs[qi]]
      return { ...s, questions: qs }
    }))
  }
  function moveSection(si: number, dir: -1 | 1) {
    setSections(ss => { const n = [...ss]; const j = si + dir; if (j < 0 || j >= n.length) return ss; [n[si], n[j]] = [n[j], n[si]]; return n })
  }
  function removeQuestion(si: number, qi: number) {
    const key = sections[si].questions[qi].key
    setSections(ss => ss.map((s, i) => ({
      ...s,
      questions: (i === si ? s.questions.filter((_, j) => j !== qi) : s.questions)
        .map(q => (q.show_if?.key === key ? { ...q, show_if: null } : q)),
    })))
  }

  async function save() {
    setError('')
    if (!name.trim()) { setError('Give the audit a name.'); return }
    const cleaned = sections
      .map(s => ({ id: s.id, title: s.title.trim() || 'Questions', questions: s.questions.filter(q => q.text.trim()) }))
      .filter(s => s.questions.length)
    if (!cleaned.length) { setError('Add at least one question.'); return }
    for (const s of cleaned) for (const q of s.questions) {
      if ((q.type === 'choice' || q.type === 'multi_choice') && (q.settings?.options ?? []).filter((o: any) => o.label?.trim()).length < 2) {
        setError(`"${q.text.slice(0, 50)}" needs at least two options.`); return
      }
    }
    const body = { name: name.trim(), description: description.trim() || null, frequency, subject_scope: scope, requires_shift: requiresShift, sections: cleaned }
    setSaving(true)
    try {
      const api = createApiClient(token)
      if (editing && templateId) await api.audits.updateTemplate(templateId, { ...body, change_note: changeNote.trim() || null })
      else await api.audits.createTemplate({ ...body, module_ids: moduleIds })
      onCreated()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Could not save the audit.')
    } finally {
      setSaving(false)
    }
  }

  const statementsByKq = useMemo(() => {
    const m = new Map<string, typeof statements>()
    for (const st of statements) { const k = st.key_question.toLowerCase(); if (!m.has(k)) m.set(k, []); m.get(k)!.push(st) }
    return [...m.entries()]
  }, [statements])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-dark">{editing ? `Edit audit${version ? ` (version ${version})` : ''}` : 'Build your own audit'}</h2>
            <p className="mt-0.5 text-sm text-neutral-mid">
              {editing
                ? 'Changes apply to new and in-progress audits. Completed audits keep the questions they were answered against.'
                : 'Name it, add sections and questions, and choose how each question is answered.'}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"><X size={18} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-neutral-mid" /></div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Audit name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Kitchen hygiene check" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">How often</label>
                <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm capitalize focus:border-teal focus:outline-none">
                  {FREQS.map(f => <option key={f} value={f} className="capitalize">{f}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-mid">Description (optional)</label>
              <input value={description} onChange={e => setDesc(e.target.value)} placeholder="What this audit covers" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Each audit covers</label>
                <select value={scope} onChange={e => setScope(e.target.value)} className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
                  {SCOPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-neutral-dark">
                <input type="checkbox" checked={requiresShift} onChange={e => setRequiresShift(e.target.checked)} className="accent-teal" />
                Ask for day or night shift when starting
              </label>
            </div>

            {!editing && (
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-neutral-mid">Linked training (optional)</label>
                <p className="mb-2 text-xs text-neutral-mid">Pick the training module(s) this audit measures. CareStream then tracks whether completing that training improves this audit&apos;s scores over time (Analytics → Training Impact).</p>
                {modules.length === 0 ? (
                  <p className="text-xs text-neutral-mid">No training modules available to link yet.</p>
                ) : (
                  <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
                    {modules.map(m => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-neutral-light/50">
                        <input type="checkbox" checked={moduleIds.includes(m.id)} onChange={() => setModuleIds(ids => ids.includes(m.id) ? ids.filter(x => x !== m.id) : [...ids, m.id])} className="accent-teal" />
                        <span className="text-neutral-dark">{m.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {sections.map((s, si) => (
                <div key={s.key} className="rounded-xl border border-gray-200 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input value={s.title} onChange={e => patchSection(si, { title: e.target.value })} placeholder="Section title" className="flex-1 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold focus:border-teal focus:outline-none" />
                    <button onClick={() => moveSection(si, -1)} disabled={si === 0} aria-label="Move section up" className="rounded p-1 text-neutral-mid hover:text-teal disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button onClick={() => moveSection(si, 1)} disabled={si === sections.length - 1} aria-label="Move section down" className="rounded p-1 text-neutral-mid hover:text-teal disabled:opacity-30"><ArrowDown size={14} /></button>
                    <button onClick={() => setSections(ss => ss.filter((_, i) => i !== si))} disabled={sections.length === 1} aria-label="Remove section" className="rounded p-1 text-neutral-mid hover:text-red-500 disabled:opacity-30"><Trash2 size={14} /></button>
                  </div>

                  <div className="space-y-2">
                    {s.questions.map((q, qi) => {
                      const isOpen = open === q.key
                      const before = ordered.slice(0, ordered.findIndex(x => x.key === q.key)).filter(x => x.text.trim() && conditionChoices(x).length)
                      const parent = q.show_if ? ordered.find(x => x.key === q.show_if!.key) : null
                      return (
                        <div key={q.key} className={clsx('rounded-lg border bg-neutral-light/40 p-2.5', q.show_if ? 'border-teal/40' : 'border-gray-100')}>
                          <div className="flex flex-wrap items-start gap-2">
                            <span className="mt-2 w-5 shrink-0 text-center text-xs font-semibold text-neutral-mid">{qi + 1}</span>
                            <input value={q.text} onChange={e => patchQuestion(si, qi, { text: e.target.value })} placeholder="Type the question" className="min-w-[12rem] flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
                            <select value={q.type} onChange={e => patchQuestion(si, qi, { type: e.target.value, settings: e.target.value === 'choice' || e.target.value === 'multi_choice' ? { options: q.settings?.options ?? [{ label: '' }, { label: '' }] } : null })} className="rounded-md border border-gray-200 px-2 py-2 text-xs text-neutral-dark focus:border-teal focus:outline-none">
                              {QUESTION_TYPES.map(t => <option key={t} value={t}>{QUESTION_TYPE_LABELS[t]}</option>)}
                            </select>
                            <button onClick={() => setOpen(isOpen ? null : q.key)} className="mt-1 inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-teal hover:bg-teal/10">
                              Options <ChevronDown size={12} className={isOpen ? 'rotate-180' : ''} />
                            </button>
                            <div className="mt-1 flex">
                              <button onClick={() => moveQuestion(si, qi, -1)} disabled={qi === 0} aria-label="Move up" className="rounded p-1 text-neutral-mid hover:text-teal disabled:opacity-30"><ArrowUp size={13} /></button>
                              <button onClick={() => moveQuestion(si, qi, 1)} disabled={qi === s.questions.length - 1} aria-label="Move down" className="rounded p-1 text-neutral-mid hover:text-teal disabled:opacity-30"><ArrowDown size={13} /></button>
                              <button onClick={() => removeQuestion(si, qi)} aria-label="Remove question" className="rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={13} /></button>
                            </div>
                          </div>
                          {!isOpen && (q.show_if || q.quality_statement_id) && (
                            <p className="ml-7 mt-1 text-[11px] text-neutral-mid">
                              {parent && <>Only asked if &ldquo;{parent.text.slice(0, 40)}&rdquo; is {q.show_if!.equals.join(' or ')}. </>}
                              {q.quality_statement_id && <>CQC: {statements.find(x => x.id === q.quality_statement_id)?.name ?? 'tagged'}.</>}
                            </p>
                          )}

                          {isOpen && (
                            <div className="ml-7 mt-2 space-y-3 rounded-lg border border-gray-100 bg-white p-3 text-xs">
                              {q.type === 'number' && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-neutral-mid">Unit</span>
                                  <input value={q.settings?.unit ?? ''} onChange={e => patchSettings(si, qi, { unit: e.target.value })} placeholder="e.g. °C" className="w-20 rounded border border-gray-200 px-2 py-1" />
                                  <span className="text-neutral-mid">Pass if between</span>
                                  <input type="number" value={q.settings?.min ?? ''} onChange={e => patchSettings(si, qi, { min: e.target.value === '' ? null : Number(e.target.value) })} placeholder="min" className="w-20 rounded border border-gray-200 px-2 py-1" />
                                  <span className="text-neutral-mid">and</span>
                                  <input type="number" value={q.settings?.max ?? ''} onChange={e => patchSettings(si, qi, { max: e.target.value === '' ? null : Number(e.target.value) })} placeholder="max" className="w-20 rounded border border-gray-200 px-2 py-1" />
                                  <span className="text-neutral-mid">(leave blank for no pass rule)</span>
                                </div>
                              )}
                              {(q.type === 'choice' || q.type === 'multi_choice') && (
                                <div className="space-y-1.5">
                                  <p className="text-neutral-mid">Options. Tick &ldquo;counts as a fail&rdquo; for answers that show a gap.</p>
                                  {(q.settings?.options ?? []).map((o: any, oi: number) => (
                                    <div key={oi} className="flex items-center gap-2">
                                      <input value={o.label} onChange={e => patchSettings(si, qi, { options: q.settings.options.map((x: any, k: number) => (k === oi ? { ...x, label: e.target.value } : x)) })} placeholder={`Option ${oi + 1}`} className="flex-1 rounded border border-gray-200 px-2 py-1" />
                                      <label className="flex items-center gap-1 text-neutral-mid"><input type="checkbox" checked={!!o.fail} onChange={e => patchSettings(si, qi, { options: q.settings.options.map((x: any, k: number) => (k === oi ? { ...x, fail: e.target.checked } : x)) })} className="accent-red-500" /> counts as a fail</label>
                                      <button onClick={() => patchSettings(si, qi, { options: q.settings.options.filter((_: any, k: number) => k !== oi) })} aria-label="Remove option" className="text-neutral-mid hover:text-red-500"><X size={12} /></button>
                                    </div>
                                  ))}
                                  <button onClick={() => patchSettings(si, qi, { options: [...(q.settings?.options ?? []), { label: '' }] })} className="inline-flex items-center gap-1 font-medium text-teal"><Plus size={12} /> Add option</button>
                                </div>
                              )}
                              {q.type === 'rating' && (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-neutral-mid">Scale 1 to</span>
                                  <select value={q.settings?.max_rating ?? 5} onChange={e => patchSettings(si, qi, { max_rating: Number(e.target.value) })} className="rounded border border-gray-200 px-2 py-1">
                                    {[3, 4, 5, 10].map(n => <option key={n} value={n}>{n}</option>)}
                                  </select>
                                  <span className="text-neutral-mid">Pass at</span>
                                  <input type="number" min={1} max={q.settings?.max_rating ?? 5} value={q.settings?.pass_min ?? ''} onChange={e => patchSettings(si, qi, { pass_min: e.target.value === '' ? null : Number(e.target.value) })} placeholder="none" className="w-16 rounded border border-gray-200 px-2 py-1" />
                                  <span className="text-neutral-mid">or above</span>
                                </div>
                              )}
                              {!isYesNo(q.type) && q.type !== 'findings' && q.type !== 'free_text' && (
                                <label className="flex items-center gap-2 text-neutral-dark"><input type="checkbox" checked={!!q.settings?.allow_na} onChange={e => patchSettings(si, qi, { allow_na: e.target.checked })} className="accent-teal" /> Allow N/A</label>
                              )}

                              <div>
                                <p className="mb-1 text-neutral-mid">Only ask this question if</p>
                                <div className="flex flex-wrap items-center gap-2">
                                  <select value={q.show_if?.key ?? ''} onChange={e => patchQuestion(si, qi, { show_if: e.target.value ? { key: e.target.value, equals: [] } : null })} className="max-w-full rounded border border-gray-200 px-2 py-1">
                                    <option value="">Always ask</option>
                                    {before.map(b => <option key={b.key} value={b.key}>{b.text.slice(0, 60)}</option>)}
                                  </select>
                                  {parent && conditionChoices(parent).map(c => (
                                    <label key={c.value} className="flex items-center gap-1 text-neutral-dark">
                                      <input type="checkbox" checked={q.show_if!.equals.includes(c.value)} onChange={e => patchQuestion(si, qi, { show_if: { key: q.show_if!.key, equals: e.target.checked ? [...q.show_if!.equals, c.value] : q.show_if!.equals.filter(v => v !== c.value) } })} className="accent-teal" />
                                      is {c.label}
                                    </label>
                                  ))}
                                </div>
                                {q.show_if && !q.show_if.equals.length && <p className="mt-1 text-amber-600">Tick at least one answer, or the condition is ignored.</p>}
                              </div>

                              <div>
                                <p className="mb-1 text-neutral-mid">CQC quality statement this question evidences</p>
                                <select value={q.quality_statement_id ?? ''} onChange={e => patchQuestion(si, qi, { quality_statement_id: e.target.value || null })} className="max-w-full rounded border border-gray-200 px-2 py-1">
                                  <option value="">None</option>
                                  {statementsByKq.map(([kq, list]) => (
                                    <optgroup key={kq} label={KQ_LABEL[kq] ?? kq}>
                                      {list.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                    </optgroup>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <button onClick={() => patchSection(si, { questions: [...s.questions, blankQuestion()] })} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal hover:underline"><Plus size={14} /> Add question</button>
                </div>
              ))}
              <button onClick={() => setSections(ss => [...ss, { id: null, key: newKey(), title: '', questions: [blankQuestion()] }])} className="inline-flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-sm font-medium text-neutral-mid hover:border-teal hover:text-teal"><Plus size={14} /> Add section</button>
            </div>

            {editing && (
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-neutral-mid">What changed? (optional, saved in the version history)</label>
                <input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="e.g. Added fridge temperature checks" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              </div>
            )}
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
          <button onClick={save} disabled={saving || loading} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editing ? 'Save new version' : 'Create audit'}
          </button>
        </div>
      </div>
    </div>
  )
}
