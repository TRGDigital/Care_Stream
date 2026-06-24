'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient, apiAssetUrl } from '@/lib/api-client'
import { SectionsEditor } from '@/components/training-sections-editor'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft, Sparkles, Loader2, CheckCircle2, Circle, FileText, Pencil, Users,
  Plus, Trash2, RefreshCw, ShieldAlert, ChevronLeft, ChevronDown, ChevronUp, BookOpen, Info, Image as ImageIcon,
} from 'lucide-react'

const FREQ_LABEL: Record<string, string> = { annual: 'Annual', biennial: 'Every 2 years', triennial: 'Every 3 years', once: 'One-off', adhoc: 'Ad-hoc' }
const FREQS = ['annual', 'biennial', 'triennial', 'once', 'adhoc']

export default function AnnualTrainingPage() {
  const { data: session } = useSession()
  const api = session?.accessToken ? createApiClient(session.accessToken) : null

  const [groups,  setGroups]  = useState<Record<string, string>>({})
  const [topics,  setTopics]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [busy,    setBusy]    = useState<string | null>(null)   // topic id being generated
  const [helpOpen, setHelpOpen] = useState(false)
  const [usage,   setUsage]   = useState<{ used: number; limit: number | null; remaining: number | null; resets_at: string } | null>(null)
  const [view,    setView]    = useState<{ mode: 'list' } | { mode: 'review'; id: string } | { mode: 'assign'; id: string; name: string }>({ mode: 'list' })

  function load() {
    if (!api) return
    setLoading(true); setError('')
    api.training.catalogue().then(d => { setGroups(d.groups); setTopics(d.topics) }).catch(e => setError(e?.message ?? 'Could not load the catalogue')).finally(() => setLoading(false))
    api.training.aiUsage().then(d => setUsage(d.credits)).catch(() => {})
  }
  useEffect(() => { load() }, [session?.accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  const outOfCredits = !!usage && usage.limit !== null && (usage.remaining ?? 0) <= 0

  async function generate(topicId: string) {
    if (!api || busy) return
    setBusy(topicId); setError('')
    try {
      const { module } = await api.training.generateModule(topicId)
      load()
      setView({ mode: 'review', id: module.id })
    } catch (e: any) { setError(e?.message ?? 'Generation failed'); load() } finally { setBusy(null) }
  }

  if (view.mode === 'review' && api) return <ReviewModule api={api} id={view.id} onBack={() => { load(); setView({ mode: 'list' }) }} onAssign={(id, name) => setView({ mode: 'assign', id, name })} />
  if (view.mode === 'assign' && api) return <AssignModule api={api} moduleId={view.id} moduleName={view.name} onBack={() => setView({ mode: 'list' })} />

  const byGroup = Object.keys(groups).map(g => ({ key: g, label: groups[g], items: topics.filter(t => t.group_key === g) })).filter(g => g.items.length)
  const byGroupEmpty = byGroup.length === 0

  return (
    <div>
      <Link href="/training" className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-teal"><ArrowLeft size={14} /> Training</Link>
      <h1 className="text-2xl font-bold text-neutral-dark">Annual training modules</h1>
      <p className="mb-4 mt-1 max-w-3xl text-sm text-neutral-mid">
        Annual training your staff complete in the hub, in their first language. Assign a ready-made <strong>standard</strong> module, or generate one <strong>tailored to your own policies</strong>.
      </p>

      {usage && usage.limit !== null && (
        <div className={`mb-4 flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${outOfCredits ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-neutral-mid'}`}>
          <Sparkles size={14} className={outOfCredits ? 'text-amber-500' : 'text-teal'} />
          <span><strong className="text-neutral-dark">{usage.used}</strong> of <strong className="text-neutral-dark">{usage.limit}</strong> AI credits used this month{usage.remaining !== null ? ` · ${usage.remaining} left` : ''}.</span>
          <span className="text-xs">Resets {new Date(usage.resets_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.</span>
          {outOfCredits && <span className="text-xs font-medium">Assign standard modules (free) or upgrade your plan.</span>}
        </div>
      )}

      {/* How this works — explainer accordion */}
      <div className="mb-6 overflow-hidden rounded-card border border-teal/30 bg-teal-light/10">
        <button onClick={() => setHelpOpen(o => !o)} className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-teal-light/20">
          <Info size={16} className="shrink-0 text-teal" />
          <span className="flex-1 text-sm font-semibold text-neutral-dark">How annual training modules work</span>
          {helpOpen ? <ChevronUp size={16} className="text-teal" /> : <ChevronDown size={16} className="text-teal" />}
        </button>
        {helpOpen && (
          <div className="space-y-3 border-t border-teal/20 px-4 py-3 text-sm text-neutral-mid">
            <p>Each module <strong>teaches</strong> the topic (a short lesson) then <strong>assesses</strong> it (multiple-choice). Staff take it in the hub in their first language, and <strong>pass = a certificate</strong> on their record (and in your CQC evidence). Renewals resurface automatically based on the module&apos;s frequency.</p>
            <div>
              <p className="font-medium text-neutral-dark">Two ways to add a module to a topic:</p>
              <ul className="mt-1 space-y-1.5">
                <li className="flex gap-2"><Users size={14} className="mt-0.5 shrink-0 text-teal" /><span><strong>Assign standard</strong> — a ready-made module we maintain for you, <strong>free</strong> (no AI generation). Just assign it to staff. Best for getting going quickly.</span></li>
                <li className="flex gap-2"><Sparkles size={14} className="mt-0.5 shrink-0 text-teal" /><span><strong>Tailor to our policies</strong> — generate a version built from <strong>your own policy documents</strong> for content specific to your home. You review and approve it before staff see it.</span></li>
              </ul>
            </div>
            <p>A topic shows <span className="rounded-full bg-teal/10 px-1.5 py-0.5 text-xs font-medium text-teal">Standard available — free</span> when a ready-made module exists. If you tailor your own, your version is used instead.</p>
            <p className="flex items-start gap-2 text-xs"><ShieldAlert size={14} className="mt-0.5 shrink-0 text-amber-500" /><span>Topics marked <strong>&ldquo;practical also required&rdquo;</strong> (e.g. Moving &amp; Handling, Medication) — the module is the knowledge part only; record the observed/practical assessment on the staff record.</span></p>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Couldn&apos;t load the catalogue.</p>
          <p className="mt-1 text-xs">{error}</p>
          <button onClick={load} className="mt-2 rounded-lg border border-red-300 px-3 py-1 text-xs font-medium hover:bg-red-100">Retry</button>
        </div>
      )}
      {!loading && !error && byGroupEmpty && (
        <div className="rounded-card border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-neutral-mid">No training topics found.</div>
      )}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 animate-pulse rounded-card bg-gray-100" />)}</div>
      ) : (
        <div className="space-y-7">
          {byGroup.map(group => (
            <div key={group.key}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-mid">{group.label}</h2>
              <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
                {group.items.map((t, i) => {
                  const m = t.module
                  const hero = m?.illustration_url ?? t.standard_module?.illustration_url ?? null
                  return (
                    <div key={t.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                      {m?.approved ? <CheckCircle2 size={16} className="shrink-0 text-green-500" />
                        : m ? <FileText size={16} className="shrink-0 text-amber-500" />
                        : <Circle size={16} className="shrink-0 text-gray-300" />}
                      {hero && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={apiAssetUrl(hero) ?? ''} alt="" className="h-10 w-16 shrink-0 rounded-md border border-gray-100 object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-neutral-dark">{t.title}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-neutral-mid">
                          <span className="rounded-full bg-gray-100 px-1.5 py-0.5 font-medium">{FREQ_LABEL[t.default_frequency] ?? t.default_frequency}</span>
                          {t.requires_practical && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-600">Practical also required</span>}
                          {m && <span className={`rounded-full px-1.5 py-0.5 font-medium ${m.approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{m.approved ? 'Published' : 'Draft'}</span>}
                          {m && <span>· {m.question_count} questions</span>}
                          {!m && t.standard_module && <span className="rounded-full bg-teal/10 px-1.5 py-0.5 font-medium text-teal">Standard available — free</span>}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!m && (
                          <>
                            {t.standard_module && (
                              <button onClick={() => setView({ mode: 'assign', id: t.standard_module!.id, name: t.standard_module!.name })} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90">
                                <Users size={12} /> Assign standard
                              </button>
                            )}
                            <Button size="sm" variant={t.standard_module ? 'secondary' : 'primary'} onClick={() => generate(t.id)} disabled={busy === t.id || outOfCredits} title={outOfCredits ? 'No tailored generations left this month' : undefined}>
                              {busy === t.id ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Sparkles size={13} /> {t.standard_module ? 'Tailor to our policies' : 'Generate'}</>}
                            </Button>
                          </>
                        )}
                        {m && (
                          <>
                            <button onClick={() => setView({ mode: 'review', id: m.id })} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal">
                              <Pencil size={12} /> {m.approved ? 'Edit' : 'Review'}
                            </button>
                            {m.approved && (
                              <button onClick={() => setView({ mode: 'assign', id: m.id, name: m.name })} className="inline-flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal/90">
                                <Users size={12} /> Assign
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Review / edit a generated module ─────────────────────────────────────────

function ReviewModule({ api, id, onBack, onAssign }: { api: ReturnType<typeof createApiClient>; id: string; onBack: () => void; onAssign: (id: string, name: string) => void }) {
  const [m, setM] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [imgBusy, setImgBusy] = useState(false)
  const [savedNote, setSavedNote] = useState('')
  const [ackOpen, setAckOpen] = useState(false)
  const [ack1, setAck1] = useState(false)

  function load() { setLoading(true); api.training.moduleFull(id).then(d => setM(d.module)).catch(() => {}).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  function setField(k: string, v: any) { setM((prev: any) => ({ ...prev, [k]: v })) }
  function setLearning(k: string, v: any) { setM((prev: any) => ({ ...prev, learning_content: { ...(prev.learning_content ?? {}), [k]: v } })) }
  function setQuestion(i: number, patch: any) { setM((prev: any) => ({ ...prev, questions: prev.questions.map((q: any, j: number) => j === i ? { ...q, ...patch } : q) })) }
  function setOption(qi: number, oi: number, v: string) { setM((prev: any) => ({ ...prev, questions: prev.questions.map((q: any, j: number) => j === qi ? { ...q, options: q.options.map((o: string, k: number) => k === oi ? v : o) } : q) })) }

  async function save() {
    setSaving(true); setSavedNote('')
    try {
      await api.training.updateModule(id, { name: m.name, learning_content: m.learning_content, questions: m.questions, pass_mark: m.pass_mark, frequency: m.frequency, duration_minutes: m.duration_minutes })
      setSavedNote('Saved'); setTimeout(() => setSavedNote(''), 2000)
    } catch { /* ignore */ } finally { setSaving(false) }
  }
  async function approve(val: boolean) {
    setSaving(true)
    try {
      await api.training.updateModule(id, { name: m.name, learning_content: m.learning_content, questions: m.questions, pass_mark: m.pass_mark, frequency: m.frequency, duration_minutes: m.duration_minutes })
      const { module } = await api.training.approveModule(id, val)
      setM(module); setAckOpen(false); setAck1(false)
    } catch { /* ignore */ } finally { setSaving(false) }
  }
  async function regenerate() {
    if (!confirm('Regenerate this module from your policies? Your current edits will be replaced and it will return to draft.')) return
    setRegenerating(true)
    try { await api.training.generateModule(m.topic_id); load() } catch (e: any) { alert(e?.message ?? 'Regeneration failed') } finally { setRegenerating(false) }
  }
  async function generateImage() {
    if (!m.illustration_url && !confirm('Generating a cover image uses 1 AI credit. Continue?')) return
    setImgBusy(true)
    try { const { illustration_url } = await api.training.generateModuleImage(id); setM((prev: any) => ({ ...prev, illustration_url })) }
    catch (e: any) { alert(e?.message ?? 'Image generation failed') } finally { setImgBusy(false) }
  }

  if (loading || !m) return <div className="space-y-4">{[1, 2].map(i => <div key={i} className="h-24 animate-pulse rounded-card bg-gray-100" />)}</div>
  const kp: string[] = m.learning_content?.key_points ?? []
  const refs: any[] = Array.isArray(m.policy_refs) ? m.policy_refs : []

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> Annual Training</button>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${m.approved ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>{m.approved ? 'Published' : 'Draft'}</span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-neutral-mid">AI-generated · review before publishing</span>
      </div>

      {m.requires_practical && (
        <div className="mb-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-sm text-amber-800">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <span>This topic also needs a <strong>practical / observed competency assessment</strong>. This module is the knowledge component only — the certificate reflects that.</span>
        </div>
      )}

      <label className="mb-1 block text-xs font-medium text-neutral-mid">Module title</label>
      <input value={m.name} onChange={e => setField('name', e.target.value)} className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium focus:border-teal focus:outline-none" />

      <div className="mb-4 overflow-hidden rounded-card border border-gray-200 bg-white">
        {m.illustration_url
          ? <img src={apiAssetUrl(m.illustration_url) ?? ''} alt="" className="aspect-[16/9] w-full object-cover" />
          : <div className="flex aspect-[16/9] w-full items-center justify-center bg-neutral-light/60"><ImageIcon size={28} className="text-gray-300" /></div>}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <p className="text-xs text-neutral-mid">Cover image <span className="text-gray-400">· uses 1 AI credit</span></p>
          <button onClick={generateImage} disabled={imgBusy} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-dark hover:border-teal/40 hover:text-teal disabled:opacity-50">
            {imgBusy ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Sparkles size={12} /> {m.illustration_url ? 'Regenerate image' : 'Generate image'}</>}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Frequency</label>
          <select value={m.frequency} onChange={e => setField('frequency', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none">
            {FREQS.map(f => <option key={f} value={f}>{FREQ_LABEL[f]}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Pass mark (%)</label>
          <input type="number" min={0} max={100} value={m.pass_mark} onChange={e => setField('pass_mark', Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Duration (min)</label>
          <input type="number" min={0} max={600} value={m.duration_minutes ?? ''} onChange={e => setField('duration_minutes', e.target.value === '' ? null : Number(e.target.value))} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
          <p className="mt-1 text-[11px] text-neutral-mid">{m.duration_minutes ? `≈ ${(m.duration_minutes / 60).toFixed(1)} CPD hours` : 'estimated learning time'}</p>
        </div>
      </div>

      {refs.length > 0 && (
        <p className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-neutral-mid">
          <BookOpen size={12} className="text-teal" /> Grounded in: {refs.map((r, i) => <span key={i} className="rounded bg-teal-light/40 px-1.5 py-0.5 text-teal-dark">{r.title}</span>)}
        </p>
      )}

      {/* Learning section */}
      <div className="mb-5 rounded-card border border-gray-100 bg-white p-4 shadow-card">
        <p className="mb-2 text-sm font-semibold text-neutral-dark">Learning — what staff read first</p>
        <label className="mb-1 block text-xs font-medium text-neutral-mid">Summary</label>
        <textarea value={m.learning_content?.summary ?? ''} onChange={e => setLearning('summary', e.target.value)} rows={3} className="mb-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
        <p className="mb-3 text-xs text-neutral-mid">A short intro shown above the lesson sections.</p>

        <label className="mb-1 block text-xs font-medium text-neutral-mid">Learning outcomes — &ldquo;by the end you will be able to…&rdquo;</label>
        <div className="mb-3 space-y-2">
          {(m.learning_content?.outcomes ?? []).map((o: string, i: number) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o} onChange={e => setLearning('outcomes', (m.learning_content?.outcomes ?? []).map((x: string, j: number) => j === i ? e.target.value : x))} className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none" />
              <button onClick={() => setLearning('outcomes', (m.learning_content?.outcomes ?? []).filter((_: string, j: number) => j !== i))} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          ))}
          <button onClick={() => setLearning('outcomes', [...(m.learning_content?.outcomes ?? []), ''])} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add outcome</button>
        </div>

        <label className="mb-1 block text-xs font-medium text-neutral-mid">Lesson sections — teach → scenario → quick check</label>
        <SectionsEditor value={m.learning_content?.sections ?? []} onChange={next => setLearning('sections', next)} assetUrl={apiAssetUrl} imageHint="uses 1 AI credit" onGenerateImage={async (i) => {
          if (!confirm('Generating a section image uses 1 AI credit. Continue?')) return
          await api.training.updateModule(id, { name: m.name, learning_content: m.learning_content, questions: m.questions, pass_mark: m.pass_mark, frequency: m.frequency, duration_minutes: m.duration_minutes })
          try { await api.training.generateSectionImage(id, i); load() } catch (e: any) { alert(e?.message ?? 'Image generation failed') }
        }} />

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Key points (recap)</label>
          <div className="space-y-2">
            {kp.map((p, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={p} onChange={e => setLearning('key_points', kp.map((x, j) => j === i ? e.target.value : x))} className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none" />
                <button onClick={() => setLearning('key_points', kp.filter((_, j) => j !== i))} className="shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={() => setLearning('key_points', [...kp, ''])} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add key point</button>
          </div>
        </div>
      </div>

      {/* Questions */}
      <p className="mb-2 text-sm font-semibold text-neutral-dark">Assessment — {m.questions?.length ?? 0} questions</p>
      <div className="space-y-3">
        {(m.questions ?? []).map((q: any, qi: number) => (
          <div key={qi} className="rounded-card border border-gray-100 bg-white p-4 shadow-card">
            <div className="mb-2 flex items-start gap-2">
              <span className="mt-1.5 text-xs font-semibold text-neutral-mid">{qi + 1}.</span>
              <textarea value={q.text} onChange={e => setQuestion(qi, { text: e.target.value })} rows={2} className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
              <button onClick={() => setM((prev: any) => ({ ...prev, questions: prev.questions.filter((_: any, j: number) => j !== qi) }))} className="mt-1 shrink-0 rounded p-1 text-neutral-mid hover:text-red-500"><Trash2 size={14} /></button>
            </div>
            <div className="space-y-1.5 pl-5">
              {q.options.map((o: string, oi: number) => (
                <label key={oi} className="flex items-center gap-2">
                  <input type="radio" name={`correct-${qi}`} checked={q.correct === oi} onChange={() => setQuestion(qi, { correct: oi })} className="accent-green-500" />
                  <input value={o} onChange={e => setOption(qi, oi, e.target.value)} className={`flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none ${q.correct === oi ? 'border-green-300 bg-green-50/40' : 'border-gray-200 focus:border-teal'}`} />
                </label>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => setM((prev: any) => ({ ...prev, questions: [...prev.questions, { id: `q${prev.questions.length + 1}`, text: '', options: ['', '', '', ''], correct: 0 }] }))} className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline"><Plus size={12} /> Add question</button>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-4">
        <Button onClick={save} disabled={saving} variant="secondary" size="md">{saving ? 'Saving…' : 'Save draft'}</Button>
        {!m.approved
          ? <Button onClick={() => setAckOpen(true)} disabled={saving} size="md"><CheckCircle2 size={14} /> Approve &amp; publish</Button>
          : <>
              <Button onClick={() => onAssign(m.id, m.name)} size="md"><Users size={14} /> Assign to staff</Button>
              <button onClick={() => approve(false)} disabled={saving} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-mid hover:border-amber-300 hover:text-amber-600">Unpublish</button>
            </>}
        <button onClick={regenerate} disabled={regenerating} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-neutral-mid hover:border-teal/40 hover:text-teal disabled:opacity-50">
          {regenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Regenerate
        </button>
        {savedNote && <span className="text-sm font-medium text-green-600">{savedNote}</span>}
      </div>

      {/* Internal-generation verification overlay */}
      {ackOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-card bg-white p-5 shadow-xl">
            <p className="mb-1 flex items-center gap-1.5 text-base font-bold text-neutral-dark"><ShieldAlert size={18} className="text-amber-500" /> Before you publish</p>
            <p className="mb-3 text-sm text-neutral-mid">This module was <strong>generated by AI from your own policies</strong>. It is your home&apos;s internal training material.</p>
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-800">
              It is <strong>not</strong> part of CareStream&apos;s independently-reviewed / CPD-accredited standard course library. You are responsible for checking it is accurate and appropriate for your service before assigning it to staff.
            </div>
            <label className="mb-4 flex items-start gap-2 text-xs text-neutral-dark"><input type="checkbox" checked={ack1} onChange={e => setAck1(e.target.checked)} className="mt-0.5 accent-teal" /> I understand this is internally-generated training, sits outside the independently-reviewed course library, and I have reviewed it.</label>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setAckOpen(false); setAck1(false) }} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-neutral-mid hover:bg-neutral-light">Cancel</button>
              <Button onClick={() => approve(true)} disabled={saving || !ack1} size="md">{saving ? 'Publishing…' : <><CheckCircle2 size={14} /> Confirm &amp; publish</>}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Assign a module to staff (by role or individual) ─────────────────────────

function AssignModule({ api, moduleId, moduleName, onBack }: { api: ReturnType<typeof createApiClient>; moduleId: string; moduleName: string; onBack: () => void }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [due, setDue] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(0)

  useEffect(() => { api.users.list().then((d: any) => setUsers(d.users ?? d ?? [])).catch(() => {}).finally(() => setLoading(false)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const roles = [...new Set(users.map(u => u.job_role || u.role || 'Staff'))]
  function toggle(id: string) { setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  function selectRole(role: string) {
    const ids = users.filter(u => (u.job_role || u.role || 'Staff') === role).map(u => u.id)
    setSel(prev => { const n = new Set(prev); const all = ids.every(i => n.has(i)); ids.forEach(i => all ? n.delete(i) : n.add(i)); return n })
  }
  async function assign() {
    if (!sel.size || saving) return
    setSaving(true)
    try { const r = await api.training.enroll({ user_ids: [...sel], module_ids: [moduleId], ...(due ? { due_date: new Date(due).toISOString() } : {}) }); setDone(r.enrolled || sel.size) }
    catch { /* ignore */ } finally { setSaving(false) }
  }

  if (done > 0) return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <CheckCircle2 size={36} className="mx-auto mb-3 text-green-500" />
      <p className="text-lg font-semibold text-neutral-dark">Assigned to {done} staff member{done === 1 ? '' : 's'}</p>
      <p className="mt-1 text-sm text-neutral-mid">They&apos;ll see &ldquo;{moduleName}&rdquo; in their hub Annual Training, in their first language.</p>
      <Button onClick={onBack} size="md" className="mt-5">Back to catalogue</Button>
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <button onClick={onBack} className="mb-3 inline-flex items-center gap-1.5 text-sm text-neutral-mid hover:text-teal"><ChevronLeft size={14} /> Annual Training</button>
      <h1 className="text-xl font-bold text-neutral-dark">Assign: {moduleName}</h1>
      <p className="mb-4 mt-1 text-sm text-neutral-mid">Pick staff individually, or tap a role to select everyone in it.</p>

      <div className="mb-3 flex flex-wrap gap-2">
        {roles.map(r => <button key={r} onClick={() => selectRole(r)} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-neutral-mid hover:border-teal hover:text-teal">{r}</button>)}
      </div>

      {loading ? <div className="h-40 animate-pulse rounded-card bg-gray-100" /> : (
        <div className="mb-4 max-h-[50vh] overflow-y-auto rounded-card border border-gray-100 bg-white shadow-card">
          {users.map((u, i) => (
            <label key={u.id} className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-gray-50' : ''} ${sel.has(u.id) ? 'bg-teal-light/20' : ''}`}>
              <input type="checkbox" checked={sel.has(u.id)} onChange={() => toggle(u.id)} className="accent-teal" />
              <div className="min-w-0 flex-1"><p className="truncate text-sm text-neutral-dark">{u.name}</p><p className="truncate text-xs text-neutral-mid">{u.job_role || u.role}</p></div>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-mid">Due date (optional)</label>
          <input type="date" value={due} onChange={e => setDue(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none" />
        </div>
        <Button onClick={assign} disabled={!sel.size || saving} size="md" className="mt-5">{saving ? 'Assigning…' : `Assign to ${sel.size || 0} staff`}</Button>
      </div>
    </div>
  )
}
