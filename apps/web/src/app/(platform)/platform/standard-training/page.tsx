'use client'

// Platform Console — standard annual-training library. Generate (seed-grounded),
// review/edit and publish standard modules that every tenant can assign for free.

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, platformAssetUrl } from '@/lib/platform-api'
import { SectionsEditor } from '@/components/training-sections-editor'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, Sparkles, CheckCircle2, Circle, FileText, Pencil, Plus, Trash2, RefreshCw, ChevronLeft, ShieldAlert, Image as ImageIcon, Calendar, History, AlertTriangle } from 'lucide-react'

const FREQ_LABEL: Record<string, string> = { annual: 'Annual', biennial: 'Every 2 years', triennial: 'Every 3 years', once: 'One-off', adhoc: 'Ad-hoc' }
const FREQS = ['annual', 'biennial', 'triennial', 'once', 'adhoc']
const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

function fmtDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}

export default function StandardTrainingPage() {
  const token = usePlatformAuth()
  const api = token ? createPlatformClient(token) : null
  const [groups, setGroups] = useState<Record<string, string>>({})
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [reviewId, setReviewId] = useState<string | null>(null)

  function load() {
    if (!api) return
    setLoading(true)
    api.standardTraining.catalogue().then(d => { setGroups(d.groups); setTopics(d.topics) }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generate(topicId: string) {
    if (!api || busy) return
    setBusy(topicId)
    try { const { module } = await api.standardTraining.generate(topicId); load(); setReviewId(module.id) }
    catch { /* ignore */ } finally { setBusy(null) }
  }

  if (reviewId && token) return (
    <PlatformShell>
      <Review token={token} id={reviewId} onBack={() => { load(); setReviewId(null) }} />
    </PlatformShell>
  )

  const byGroup = Object.keys(groups).map(g => ({ key: g, label: groups[g], items: topics.filter(t => t.group_key === g) })).filter(g => g.items.length)

  return (
    <PlatformShell>
      <h1 className="text-2xl font-bold text-neutral-dark">Standard Training</h1>
      <p className="mb-6 mt-1 max-w-3xl text-sm text-neutral-mid">
        Generate standard annual-training modules (grounded in the anonymised <strong>policy seeds</strong>). Review and <strong>publish</strong> them, and every tenant can assign them to staff at <strong>no AI-generation cost</strong>. Tenants who want policy-specific versions use &ldquo;Tailor to our policies&rdquo; (metered).
      </p>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />)}</div>
      ) : (
        <div className="space-y-7">
          {byGroup.map(group => (
            <div key={group.key}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-mid">{group.label}</h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {group.items.map((t, i) => {
                  const m = t.module
                  return (
                    <div key={t.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      {m?.approved ? <CheckCircle2 size={16} className="shrink-0 text-green-500" /> : m ? <FileText size={16} className="shrink-0 text-amber-500" /> : <Circle size={16} className="shrink-0 text-gray-300" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-dark">{t.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-mid">
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-medium">{FREQ_LABEL[t.default_frequency] ?? t.default_frequency}</span>
                          {t.requires_practical && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-600">Practical also required</span>}
                          {m && <span className={`rounded-full px-1.5 py-0.5 font-medium ${m.approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{m.approved ? 'Published' : 'Draft'}</span>}
                          {m && <span>· {m.question_count} questions</span>}
                          {m?.duration_minutes ? <span>· {m.duration_minutes} min ({(m.duration_minutes / 60).toFixed(1)} CPD h)</span> : null}
                        </p>
                        {m && (
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                            <Calendar size={11} /> Created {fmtDate(m.created_at)}{m.approved_at ? ` · Published ${fmtDate(m.approved_at)}` : ''}
                          </p>
                        )}
                      </div>
                      {!m
                        ? <button onClick={() => generate(t.id)} disabled={busy === t.id} className="flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy === t.id ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> Generate</>}</button>
                        : <button onClick={() => setReviewId(m.id)} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal"><Pencil size={12} /> {m.approved ? 'Edit' : 'Review'}</button>}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </PlatformShell>
  )
}

function Review({ token, id, onBack }: { token: string; id: string; onBack: () => void }) {
  const api = createPlatformClient(token)
  const [m, setM] = useState<any>(null)
  const [hist, setHist] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenQ, setRegenQ] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const [savedNote, setSavedNote] = useState('')

  function load() { setLoading(true); api.standardTraining.moduleFull(id).then(d => { setM(d.module); setHist(d.question_history) }).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function setField(k: string, v: any) { setM((p: any) => ({ ...p, [k]: v })) }
  function setLearning(k: string, v: any) { setM((p: any) => ({ ...p, learning_content: { ...(p.learning_content ?? {}), [k]: v } })) }
  function setQuestion(i: number, patch: any) { setM((p: any) => ({ ...p, questions: p.questions.map((q: any, j: number) => j === i ? { ...q, ...patch } : q) })) }
  function setOption(qi: number, oi: number, v: string) { setM((p: any) => ({ ...p, questions: p.questions.map((q: any, j: number) => j === qi ? { ...q, options: q.options.map((o: string, k: number) => k === oi ? v : o) } : q) })) }

  async function save() {
    setSaving(true); setSavedNote('')
    try { await api.standardTraining.updateModule(id, { name: m.name, learning_content: m.learning_content, questions: m.questions, pass_mark: m.pass_mark, frequency: m.frequency, duration_minutes: m.duration_minutes }); setSavedNote('Saved'); setTimeout(() => setSavedNote(''), 2000) }
    catch { /* ignore */ } finally { setSaving(false) }
  }
  async function approve(val: boolean) {
    setSaving(true)
    try { await api.standardTraining.updateModule(id, { name: m.name, learning_content: m.learning_content, questions: m.questions, pass_mark: m.pass_mark, frequency: m.frequency, duration_minutes: m.duration_minutes }); const { module } = await api.standardTraining.approveModule(id, val); setM(module) }
    catch { /* ignore */ } finally { setSaving(false) }
  }
  async function regenerate() {
    if (!confirm('Regenerate from the policy seeds? Current edits will be replaced and it returns to draft.')) return
    setRegenerating(true)
    try { await api.standardTraining.generate(m.topic_id); load() } catch { /* ignore */ } finally { setRegenerating(false) }
  }
  async function generateImage() {
    setImgBusy(true)
    try { const { illustration_url } = await api.standardTraining.generateImage(id); setM((p: any) => ({ ...p, illustration_url })) }
    catch { /* ignore */ } finally { setImgBusy(false) }
  }
  async function regenerateQuestions() {
    if (!confirm('Generate a fresh ASSESSMENT question bank that AVOIDS every question used before?\n\nThis refreshes the assessment questions ONLY — your lesson (sections & scenarios) is left unchanged. To regenerate the lesson too, use "Rebuild whole module".\n\nThe current questions are saved to history, and the module returns to draft for review before re-publishing.')) return
    setRegenQ(true)
    try { const r = await api.standardTraining.regenerateQuestions(id); load(); alert(`Generated ${r.generated} new questions, avoiding ${r.avoided} previously-used. Review and re-publish.`) }
    catch (e: any) { alert(e?.message ?? 'Regeneration failed') } finally { setRegenQ(false) }
  }

  if (loading || !m) return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />)}</div>
  const kp: string[] = m.learning_content?.key_points ?? []

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> Standard Training</button>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{m.approved ? 'Published' : 'Draft'}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-neutral-mid">Standard library · shared to all tenants</span>
      </div>

      {/* Tracking & question history */}
      <div className={`mb-4 rounded-xl border p-4 ${hist?.review_due ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200 bg-white'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 text-xs text-neutral-mid">
            <p className="flex items-center gap-1.5"><Calendar size={13} className="text-neutral-mid" /> <span className="font-medium text-neutral-dark">Created</span> {fmtDate(m.created_at)}</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 size={13} className={m.approved_at ? 'text-green-500' : 'text-gray-300'} /> <span className="font-medium text-neutral-dark">Published</span> {m.approved_at ? fmtDate(m.approved_at) : 'not yet published'}</p>
            <p className="flex items-center gap-1.5"><History size={13} className="text-neutral-mid" /> <span className="font-medium text-neutral-dark">Questions current since</span> {fmtDate(hist?.last_regenerated_at ?? m.created_at)}{hist?.prior_versions ? ` · ${hist.prior_versions} prior version${hist.prior_versions === 1 ? '' : 's'} on record` : ''}</p>
            <p className="text-[11px] text-gray-400">{hist?.used_count ?? 0} question{(hist?.used_count ?? 0) === 1 ? '' : 's'} used to date — a regeneration avoids all of them.</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {hist?.review_due && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700"><AlertTriangle size={11} /> Review due</span>}
            <button onClick={regenerateQuestions} disabled={regenQ} className="inline-flex items-center gap-1.5 rounded-lg border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal hover:text-white disabled:opacity-50">
              {regenQ ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><RefreshCw size={13} /> Regenerate questions</>}
            </button>
            <span className="text-[10px] text-gray-400">assessment only · avoids repeats · {hist?.interval_months ?? 6}-monthly</span>
          </div>
        </div>
      </div>

      {m.requires_practical && (
        <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <span>This topic also needs a <strong>practical / observed competency assessment</strong>. This module is the knowledge component only.</span>
        </div>
      )}

      <label className="mb-1 block text-xs font-medium text-neutral-mid">Module title</label>
      <input value={m.name} onChange={e => setField('name', e.target.value)} className={`${INPUT} mb-3 font-medium`} />

      <div className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {m.illustration_url
          ? <img src={platformAssetUrl(m.illustration_url) ?? ''} alt="" className="aspect-[16/9] w-full object-cover" />
          : <div className="flex aspect-[16/9] w-full items-center justify-center bg-neutral-light/60"><ImageIcon size={28} className="text-gray-300" /></div>}
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-xs text-neutral-mid">Cover illustration <span className="text-gray-400">· free for standard library</span></p>
          <button onClick={generateImage} disabled={imgBusy} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">
            {imgBusy ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Sparkles size={12} /> {m.illustration_url ? 'Regenerate image' : 'Generate image'}</>}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Frequency</label><select value={m.frequency} onChange={e => setField('frequency', e.target.value)} className={INPUT}>{FREQS.map(f => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}</select></div>
        <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Pass mark (%)</label><input type="number" min={0} max={100} value={m.pass_mark} onChange={e => setField('pass_mark', Number(e.target.value))} className={INPUT} /></div>
        <div><label className="mb-1 block text-xs font-medium text-neutral-mid">Duration (min)</label><input type="number" min={0} max={600} value={m.duration_minutes ?? ''} onChange={e => setField('duration_minutes', e.target.value === '' ? null : Number(e.target.value))} className={INPUT} /><p className="mt-1 text-[11px] text-neutral-mid">{m.duration_minutes ? `≈ ${(m.duration_minutes / 60).toFixed(1)} CPD hours` : 'estimated learning time'}</p></div>
      </div>

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-neutral-dark">Learning — what staff read first</p>
        <label className="mb-1 block text-xs font-medium text-neutral-mid">Summary</label>
        <textarea value={m.learning_content?.summary ?? ''} onChange={e => setLearning('summary', e.target.value)} rows={3} className={`${INPUT} mb-1`} />
        <p className="mb-3 text-xs text-neutral-mid">A short intro shown above the lesson sections.</p>

        <label className="mb-1 block text-xs font-medium text-neutral-mid">Learning outcomes — &ldquo;by the end you will be able to…&rdquo;</label>
        <div className="mb-3 space-y-2">
          {(m.learning_content?.outcomes ?? []).map((o: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o} onChange={e => setLearning('outcomes', (m.learning_content?.outcomes ?? []).map((x: string, j: number) => j === i ? e.target.value : x))} className={INPUT} />
              <button onClick={() => setLearning('outcomes', (m.learning_content?.outcomes ?? []).filter((_: string, j: number) => j !== i))} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={() => setLearning('outcomes', [...(m.learning_content?.outcomes ?? []), ''])} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add outcome</button>
        </div>

        <label className="mb-1 block text-xs font-medium text-neutral-mid">Lesson sections — teach → scenario → quick check</label>
        <SectionsEditor value={m.learning_content?.sections ?? []} onChange={next => setLearning('sections', next)} />

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Key points (recap)</label>
          <div className="space-y-2">
            {kp.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={p} onChange={e => setLearning('key_points', kp.map((x, j) => j === i ? e.target.value : x))} className={INPUT} />
                <button onClick={() => setLearning('key_points', kp.filter((_, j) => j !== i))} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setLearning('key_points', [...kp, ''])} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add key point</button>
          </div>
        </div>
      </div>

      <p className="mb-2 text-sm font-semibold text-neutral-dark">Assessment — {m.questions?.length ?? 0} questions</p>
      <div className="space-y-3">
        {(m.questions ?? []).map((q: any, qi: number) => (
          <div key={qi} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-start gap-2">
              <span className="mt-1.5 text-xs font-semibold text-neutral-mid">{qi + 1}.</span>
              <textarea value={q.text} onChange={e => setQuestion(qi, { text: e.target.value })} rows={2} className={INPUT} />
              <button onClick={() => setM((p: any) => ({ ...p, questions: p.questions.filter((_: any, j: number) => j !== qi) }))} className="mt-1 shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
            </div>
            <div className="space-y-1.5 pl-5">
              {q.options.map((o: string, oi: number) => (
                <label key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`c-${qi}`} checked={q.correct === oi} onChange={() => setQuestion(qi, { correct: oi })} className="accent-green-500" />
                  <input value={o} onChange={e => setOption(qi, oi, e.target.value)} className={`flex-1 rounded-md border px-3 py-1.5 text-sm outline-none ${q.correct === oi ? 'border-green-300 bg-green-50/40' : 'border-gray-300 focus:border-teal'}`} />
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => setM((p: any) => ({ ...p, questions: [...p.questions, { id: `q${p.questions.length + 1}`, text: '', options: ['', '', '', ''], correct: 0 }] }))} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add question</button>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
        <button onClick={save} disabled={saving} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-neutral-dark hover:bg-neutral-light disabled:opacity-50">{saving ? 'Saving…' : 'Save draft'}</button>
        {!m.approved
          ? <button onClick={() => approve(true)} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"><CheckCircle2 size={14} /> Approve &amp; publish</button>
          : <button onClick={() => approve(false)} disabled={saving} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-mid hover:border-amber-300 hover:text-amber-600">Unpublish</button>}
        <button onClick={regenerate} disabled={regenerating} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-mid hover:border-teal/40 hover:text-teal disabled:opacity-50">{regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Rebuild whole module</button>
        {savedNote && <span className="text-sm font-medium text-green-600">{savedNote}</span>}
      </div>
    </div>
  )
}
