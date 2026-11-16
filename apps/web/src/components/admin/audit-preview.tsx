'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Pencil, Plus, Lock, Loader2, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { createApiClient, type AuditEditorTemplate } from '@/lib/api-client'

// A read-only preview of an audit, as it would be asked, with small edits on every plan: reword questions, change a
// question's type and add a couple of questions. Anything bigger (more added questions, removing or reordering
// questions, new sections) is the audit builder, an Enterprise feature. The page never lets anyone answer here.

type Editor = { can_edit: boolean; unlimited: boolean; max_added: number | null; added_so_far: number | null; built_in: boolean; is_own_version: boolean; ready: boolean }

const TYPE_LABEL: Record<string, string> = {
  yes_no_na: 'Yes / No / Not applicable', yes_no: 'Yes / No', findings: 'Yes / No with findings', free_text: 'Free text',
  number: 'A number', date: 'A date', rating: 'A rating', choice: 'Pick one option', multi_choice: 'Pick several options',
}
const TYPE_ORDER = ['yes_no_na', 'yes_no', 'findings', 'free_text', 'number', 'date', 'rating', 'choice', 'multi_choice']

const optionsOf = (settings: any): string[] => (Array.isArray(settings?.options) ? settings.options.map((o: any) => String(o?.label ?? o)) : [])

type Draft = { text: string; type: string; options: string }
type NewQ = { key: string; section_id: string; text: string; type: string; options: string }

function Control({ type, settings }: { type: string; settings: any }) {
  const dis = 'cursor-not-allowed rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-neutral-mid'
  if (type === 'free_text') return <div className={clsx(dis, 'h-14 w-full')}>Free text answer</div>
  if (type === 'number') return <div className={clsx(dis, 'w-40')}>Number{settings?.unit ? ` (${settings.unit})` : ''}</div>
  if (type === 'date') return <div className={clsx(dis, 'w-40')}>Date</div>
  if (type === 'rating') return <div className="flex gap-1">{Array.from({ length: Number(settings?.max) || 5 }, (_, i) => <span key={i} className={clsx(dis, 'px-2.5')}>{i + 1}</span>)}</div>
  if (type === 'choice' || type === 'multi_choice') {
    const opts = optionsOf(settings)
    return <div className="flex flex-wrap gap-1.5">{(opts.length ? opts : ['Option']).map(o => <span key={o} className={dis}>{o}</span>)}</div>
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={dis}>Yes</span><span className={dis}>No</span>{type !== 'yes_no' && <span className={dis}>N/A</span>}
      {type === 'findings' && <span className={clsx(dis, 'w-56')}>Findings</span>}
    </div>
  )
}

export function AuditPreview({ token, templateId, onClose, onSaved }: { token: string; templateId: string; onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<{ template: AuditEditorTemplate; editor: Editor } | null>(null)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [added, setAdded] = useState<NewQ[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [upgrade, setUpgrade] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    createApiClient(token).audits.previewTemplate(templateId).then(setData).catch((e: any) => setLoadError(e?.message ?? 'Could not load the audit.'))
  }, [token, templateId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const t = data?.template
  const ed = data?.editor
  const max = ed?.max_added ?? null
  const addedTotal = (ed?.added_so_far ?? 0) + added.length
  const canAddMore = max === null || addedTotal < max
  const draftOf = (q: any): Draft => drafts[q.id] ?? { text: q.text, type: q.type, options: optionsOf(q.settings).join('\n') }
  const setDraft = (q: any, patch: Partial<Draft>) => setDrafts(d => ({ ...d, [q.id]: { ...draftOf(q), ...patch } }))
  const optionsToSettings = (type: string, options: string) =>
    (type === 'choice' || type === 'multi_choice') ? { options: options.split('\n').map(x => x.trim()).filter(Boolean).map(label => ({ label, fail: false })) } : undefined

  const changedEdits = () => {
    if (!t) return []
    const out: Array<{ id: string; text?: string; type?: string; settings?: any }> = []
    for (const s of t.sections) for (const q of s.questions) {
      const d = drafts[q.id!]; if (!d) continue
      const textChanged = d.text.trim() !== q.text
      const typeChanged = d.type !== q.type
      const optsChanged = (d.type === 'choice' || d.type === 'multi_choice') && d.options.trim() !== optionsOf(q.settings).join('\n')
      if (!textChanged && !typeChanged && !optsChanged) continue
      out.push({ id: q.id!, text: d.text.trim(), type: d.type, ...(typeChanged || optsChanged ? { settings: optionsToSettings(d.type, d.options) } : {}) })
    }
    return out
  }
  const pending = changedEdits().length + added.filter(a => a.text.trim()).length

  async function save() {
    setSaving(true); setError(''); setUpgrade(false)
    try {
      await createApiClient(token).audits.customiseTemplate(templateId, {
        edits: changedEdits(),
        added: added.filter(a => a.text.trim()).map(a => ({ section_id: a.section_id, text: a.text.trim(), type: a.type, settings: optionsToSettings(a.type, a.options) })),
      })
      setDone(true); onSaved()
    } catch (e: any) {
      if (e?.code === 'UPGRADE_REQUIRED') setUpgrade(true)
      setError(e?.message ?? 'Could not save your changes.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose} role="dialog" aria-modal="true" aria-label="Audit preview">
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-xl border-b border-gray-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-teal">Preview {editing ? '· editing' : '· read only'}</p>
            <h2 className="truncate text-lg font-bold text-neutral-dark">{t?.name ?? 'Audit'}</h2>
            {t && <p className="text-xs text-neutral-mid capitalize">{t.frequency}{t.sections.length ? ` · ${t.sections.length} section${t.sections.length === 1 ? '' : 's'} · ${t.sections.reduce((n, s) => n + s.questions.length, 0)} questions` : ''}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ed?.can_edit && !editing && !done && (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark"><Pencil size={13} /> Edit questions</button>
            )}
            <button onClick={onClose} aria-label="Close preview" className="rounded-lg p-1.5 text-neutral-mid hover:bg-gray-100"><X size={18} /></button>
          </div>
        </div>

        <div className="px-5 py-4">
          {!data && !loadError && <div className="flex justify-center py-12"><Loader2 className="animate-spin text-neutral-mid" /></div>}
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}

          {t && ed && (
            <>
              {!editing && <p className="mb-4 rounded-lg bg-neutral-light px-3 py-2 text-xs text-neutral-mid">This is how the audit looks when it is run. You cannot answer questions in the preview.{ed.can_edit ? ' Use Edit questions to reword questions, change a question type or add a question.' : ''}</p>}
              {editing && !done && (
                <div className="mb-4 rounded-lg border border-teal/30 bg-teal-light/30 px-3 py-2 text-xs text-neutral-dark">
                  <p><strong>Small edits:</strong> reword any question, change its type{max === null ? ', and add questions.' : `, and add up to ${max} questions to this audit.`} {max !== null && <span className="text-neutral-mid">Added so far: {addedTotal} of {max}. </span>}
                    {max !== null && <>Removing or reordering questions, or adding more, needs <Link href="/billing" className="font-semibold text-teal underline">an upgrade</Link>. </>}
                    {ed.built_in && 'Your changes are saved as your own version of this audit; the standard version is hidden from your lists.'}</p>
                </div>
              )}
              {done && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800"><Check size={16} className="mt-0.5 shrink-0" /><span>Saved. Your version is now the one your team runs, and it is under <strong>Your audits</strong> on the Audits page.</span></div>
              )}

              {t.sections.map((s, si) => (
                <div key={s.id ?? si} className="mb-5">
                  <h3 className="mb-2 text-sm font-semibold text-neutral-dark">{s.title}</h3>
                  <ol className="space-y-3">
                    {s.questions.map((q, qi) => {
                      const d = draftOf(q)
                      return (
                        <li key={q.id ?? qi} className="rounded-lg border border-gray-100 bg-white p-3">
                          {editing && !done ? (
                            <div className="space-y-2">
                              <textarea value={d.text} onChange={e => setDraft(q, { text: e.target.value })} rows={2} maxLength={1000}
                                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
                              <div className="flex flex-wrap items-start gap-2">
                                <select value={d.type} onChange={e => setDraft(q, { type: e.target.value })} className="rounded-md border border-gray-200 px-2 py-1.5 text-xs">
                                  {TYPE_ORDER.map(k => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
                                </select>
                                {(d.type === 'choice' || d.type === 'multi_choice') && (
                                  <textarea value={d.options} onChange={e => setDraft(q, { options: e.target.value })} rows={3} placeholder="One option per line"
                                    className="min-w-[14rem] flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-mid" title="Removing or reordering questions needs an upgrade"><Lock size={11} /> Remove and reorder need an upgrade</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="mb-2 text-sm text-neutral-dark"><span className="mr-1.5 text-neutral-mid">{si + 1}.{qi + 1}</span>{q.text}</p>
                              <Control type={q.type} settings={q.settings} />
                            </>
                          )}
                        </li>
                      )
                    })}
                    {added.filter(a => a.section_id === (s.id ?? '')).map(a => (
                      <li key={a.key} className="rounded-lg border border-dashed border-teal/50 bg-teal-light/20 p-3">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal">New question</p>
                        <textarea value={a.text} onChange={e => setAdded(list => list.map(x => x.key === a.key ? { ...x, text: e.target.value } : x))} rows={2} maxLength={1000} placeholder="Type the question"
                          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal" />
                        <div className="mt-2 flex flex-wrap items-start gap-2">
                          <select value={a.type} onChange={e => setAdded(list => list.map(x => x.key === a.key ? { ...x, type: e.target.value } : x))} className="rounded-md border border-gray-200 px-2 py-1.5 text-xs">
                            {TYPE_ORDER.map(k => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
                          </select>
                          {(a.type === 'choice' || a.type === 'multi_choice') && (
                            <textarea value={a.options} onChange={e => setAdded(list => list.map(x => x.key === a.key ? { ...x, options: e.target.value } : x))} rows={3} placeholder="One option per line"
                              className="min-w-[14rem] flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                          )}
                          <button onClick={() => setAdded(list => list.filter(x => x.key !== a.key))} className="text-xs text-neutral-mid underline">Remove</button>
                        </div>
                      </li>
                    ))}
                  </ol>
                  {editing && !done && (
                    <button disabled={!canAddMore} onClick={() => setAdded(list => [...list, { key: `n${Date.now()}${list.length}`, section_id: s.id ?? '', text: '', type: 'yes_no_na', options: '' }])}
                      className={clsx('mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium', canAddMore ? 'border-teal/40 text-teal hover:bg-teal-light/40' : 'cursor-not-allowed border-gray-200 text-neutral-mid')}
                      title={canAddMore ? undefined : `You have added the ${max} questions your plan allows. Upgrade to add more.`}>
                      <Plus size={13} /> Add a question to this section
                    </button>
                  )}
                </div>
              ))}

              {error && (
                <div className={clsx('mb-3 rounded-lg border px-3 py-2 text-sm', upgrade ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700')}>
                  {error} {upgrade && <Link href="/billing" className="font-semibold underline">See plans</Link>}
                </div>
              )}
              {!ed.ready && <p className="mb-3 text-xs text-amber-700">Editing is being set up and is not available yet.</p>}
            </>
          )}
        </div>

        {editing && !done && t && (
          <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-b-xl border-t border-gray-100 bg-white px-5 py-3">
            <p className="text-xs text-neutral-mid">{pending ? `${pending} change${pending === 1 ? '' : 's'} to save` : 'No changes yet'}{max !== null ? ` · ${addedTotal} of ${max} added questions used` : ''}</p>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setDrafts({}); setAdded([]); setError(''); setUpgrade(false) }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
              <button onClick={save} disabled={!pending || saving || !ed?.ready} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />} Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
