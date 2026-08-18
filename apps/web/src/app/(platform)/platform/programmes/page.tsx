'use client'

// Platform Console — Diplomas & Pathways. A programme groups published standard
// modules into an ordered container with one completion rule, one synoptic
// (cross-unit) assessment and one certificate.
//
// Build one in three steps: assemble from a template (or create empty) → pick and
// order the units → draft and review the final assessment → attest and publish.

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { CpdProgrammeSheet, CPD_PROG_DOCS, type CpdProgDoc } from '@/components/training/cpd-programme-pack'
import {
  Loader2, Sparkles, CheckCircle2, Circle, Plus, Trash2, ChevronLeft, ChevronUp, ChevronDown,
  AlertTriangle, ShieldCheck, Award, GraduationCap, Wand2, Clock, X, FileText,
} from 'lucide-react'

const INPUT = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const KINDS = [
  { key: 'diploma', label: 'Diploma', hint: 'Broad, multi-unit, needs a cross-unit final assessment' },
  { key: 'pathway', label: 'Pathway', hint: 'Focused role or topic route; final assessment optional' },
  { key: 'award',   label: 'Award',   hint: 'Short recognition of a small set of units' },
]

function fmtDate(d?: string | null): string {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}

function hrs(minutes?: number | null): string {
  if (!minutes) return '—'
  return `${Math.round((minutes / 60) * 10) / 10} h`
}

export default function ProgrammesPage() {
  const token = usePlatformAuth()
  const [data, setData] = useState<any>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn' | 'err'; text: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newKind, setNewKind] = useState('diploma')

  const api = token ? createPlatformClient(token) : null

  function load() {
    if (!api) return
    api.standardProgrammes.list().then(setData).catch(e => setMsg({ tone: 'err', text: e?.message ?? 'Could not load programmes.' }))
  }
  useEffect(() => { if (token) load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token])

  async function buildFromTemplate(slug: string) {
    if (!api) return
    setBusy(`tpl:${slug}`); setMsg(null)
    try {
      const r = await api.standardProgrammes.fromTemplate(slug)
      const parts = [`Built "${r.programme.name}" with ${r.matched.length} unit${r.matched.length === 1 ? '' : 's'}.`]
      if (r.missing.length) parts.push(`Not in the published library yet: ${r.missing.join(', ')}.`)
      if (r.replaced) parts.push('(Rebuilt an existing draft.)')
      setMsg({ tone: r.missing.length ? 'warn' : 'ok', text: parts.join(' ') })
      load()
      setOpenId(r.programme.id)
    } catch (e: any) {
      setMsg({ tone: 'err', text: e?.message ?? 'Could not build from that template.' })
    } finally { setBusy('') }
  }

  async function create() {
    if (!api || !newName.trim()) return
    setBusy('create')
    try {
      const r = await api.standardProgrammes.create({ name: newName.trim(), kind: newKind })
      setCreating(false); setNewName(''); load(); setOpenId(r.programme.id)
    } catch (e: any) {
      setMsg({ tone: 'err', text: e?.message ?? 'Could not create.' })
    } finally { setBusy('') }
  }

  if (!token) return <PlatformShell><div className="p-6"><Loader2 className="animate-spin text-teal" /></div></PlatformShell>

  return (
    <PlatformShell>
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-1 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-neutral-dark">Diplomas &amp; Pathways</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-mid">
              A programme groups published standard modules behind one completion rule, one cross-unit final
              assessment and one certificate. Unit progress comes from the learner&apos;s ordinary training records —
              a diploma is a view over the same evidence, never a second training system.
            </p>
          </div>
          <button
            onClick={() => setCreating(v => !v)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
          >
            <Plus size={14} /> New
          </button>
        </div>

        {/* Naming guardrail — the thing most likely to cause trouble later. */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p>
            <strong>Naming:</strong> these are CareStream programmes, not Ofqual-regulated qualifications.
            &ldquo;Diploma in Health and Social Care&rdquo; is fine; never add an RQF level
            (&ldquo;Level 3 Diploma&hellip;&rdquo;) — that implies regulated status we do not hold.
          </p>
        </div>

        {msg && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${msg.tone === 'ok' ? 'border-green-200 bg-green-50 text-green-800' : msg.tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <div className="flex items-start justify-between gap-3">
              <p>{msg.text}</p>
              <button onClick={() => setMsg(null)} className="shrink-0 text-neutral-mid hover:text-neutral-dark"><X size={14} /></button>
            </div>
          </div>
        )}

        {creating && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm font-semibold text-neutral-dark">New programme</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Diploma in Health and Social Care" className={INPUT} />
              <select value={newKind} onChange={e => setNewKind(e.target.value)} className={INPUT}>
                {KINDS.map(k => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
              <button onClick={create} disabled={busy === 'create' || !newName.trim()} className="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                {busy === 'create' ? 'Creating…' : 'Create'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-neutral-mid">{KINDS.find(k => k.key === newKind)?.hint}</p>
          </div>
        )}

        {/* Templates */}
        {data?.templates?.length > 0 && (
          <div className="mt-5 rounded-xl border border-teal/25 bg-teal-light/15 p-4">
            <p className="text-sm font-semibold text-teal-dark">Build from a ready-made template</p>
            <p className="mt-0.5 text-xs text-neutral-mid">
              Assembles the programme from your published standard library, matching units by title.
              Anything not published yet is reported so you can fill the gap.
            </p>
            {/* Grouped so the three kinds read as three decisions, not one long list:
                universal diplomas sell to everyone, setting-specific ones only appear
                for tenants of that setting, pathways are the shorter routes. */}
            {[
              { key: 'universal', label: 'Universal diplomas — every setting', test: (t: any) => t.kind === 'diploma' && !t.care_setting },
              { key: 'setting',   label: 'Setting-specific diplomas',          test: (t: any) => t.kind === 'diploma' && !!t.care_setting },
              { key: 'pathway',   label: 'Pathways — shorter, focused routes',  test: (t: any) => t.kind !== 'diploma' },
            ].map(group => {
              const items = data.templates.filter(group.test)
              if (!items.length) return null
              return (
                <div key={group.key} className="mt-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">{group.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((t: any) => (
                      <button
                        key={t.slug}
                        onClick={() => buildFromTemplate(t.slug)}
                        disabled={busy === `tpl:${t.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-teal/40 bg-white px-3 py-2 text-left text-sm font-medium text-teal-dark hover:bg-teal-light/40 disabled:opacity-50"
                      >
                        {busy === `tpl:${t.slug}` ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                        {t.name}
                        <span className="text-xs font-normal text-neutral-mid">
                          {t.required_count} req{t.unit_count > t.required_count ? ` +${t.unit_count - t.required_count}` : ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Programme list */}
        <div className="mt-6 space-y-3">
          {!data && <div className="p-6"><Loader2 className="animate-spin text-teal" /></div>}
          {data?.programmes?.length === 0 && (
            <p className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-neutral-mid">
              No programmes yet — build one from a template above.
            </p>
          )}
          {data?.programmes?.map((p: any) => (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white">
              <button onClick={() => setOpenId(openId === p.id ? null : p.id)} className="flex w-full items-start gap-3 p-4 text-left">
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${p.approved ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {p.approved ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-neutral-dark">{p.name}</h2>
                    <span className="rounded-full bg-teal-light/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-dark">{p.kind}</span>
                    {p.approved
                      ? <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Published</span>
                      : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Draft</span>}
                    {p.pilot_tenant_ids?.length > 0 && (
                      <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Pilot · {p.pilot_tenant_ids.length} tenant{p.pilot_tenant_ids.length === 1 ? '' : 's'} only
                      </span>
                    )}
                    {p.qa_hard_fails > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        <AlertTriangle size={10} /> {p.qa_hard_fails} blocking
                      </span>
                    )}
                    {p.independently_reviewed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-light/50 px-2 py-0.5 text-[10px] font-semibold text-teal-dark">
                        <ShieldCheck size={10} /> Independently reviewed
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-neutral-mid">{p.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-mid">
                    <span><strong className="text-neutral-dark">{p.unit_count}</strong> units{p.units_missing > 0 && <span className="text-red-600"> ({p.units_missing} missing)</span>}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {hrs(p.duration_minutes)}</span>
                    <span><strong className="text-neutral-dark">{p.synoptic_count}</strong> final-assessment Qs</span>
                    <span>{p.outcomes_count} outcomes · {p.standards_count} standards</span>
                    {p.price_pence != null && <span>£{(p.price_pence / 100).toFixed(2)}</span>}
                    {/* CPD accreditation progress. Publishing never depends on this —
                        it only governs whether the certificate carries CPD branding. */}
                    <span className={p.cpd_ready ? 'font-medium text-teal' : ''}>
                      CPD {p.cpd_units}/{p.unit_count - p.units_missing} units
                      {p.cpd_ready ? ' — ready' : ''}
                    </span>
                    {p.enrolled > 0 && <span><strong className="text-neutral-dark">{p.enrolled}</strong> enrolled · {p.completed} complete</span>}
                  </div>
                </div>
                {openId === p.id ? <ChevronUp size={16} className="mt-1 text-neutral-mid" /> : <ChevronDown size={16} className="mt-1 text-neutral-mid" />}
              </button>

              {openId === p.id && api && (
                <ProgrammeEditor
                  api={api} id={p.id} tenants={data?.tenants ?? []}
                  onChanged={load}
                  onDeleted={() => { setOpenId(null); load() }}
                  onMessage={setMsg}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </PlatformShell>
  )
}

// ─── Editor ───────────────────────────────────────────────────────────────────

function ProgrammeEditor({
  api, id, tenants, onChanged, onDeleted, onMessage,
}: {
  api: any
  id: string
  tenants: Array<{ id: string; name: string; account_number: string }>
  onChanged: () => void
  onDeleted: () => void
  onMessage: (m: { tone: 'ok' | 'warn' | 'err'; text: string } | null) => void
}) {
  const [full, setFull] = useState<any>(null)
  const [avail, setAvail] = useState<any[] | null>(null)
  const [busy, setBusy] = useState('')
  const [reviewer, setReviewer] = useState({ name: '', role: '' })
  const [draftSynoptic, setDraftSynoptic] = useState<any[] | null>(null)
  // CPD accreditation submission pack — generated from this programme's live structure.
  const [packDoc, setPackDoc] = useState<CpdProgDoc | null>(null)

  function load() {
    api.standardProgrammes.full(id).then(setFull).catch((e: any) => onMessage({ tone: 'err', text: e?.message ?? 'Could not load.' }))
  }
  useEffect(() => {
    load()
    api.standardProgrammes.availableModules().then((d: any) => setAvail(d.modules)).catch(() => setAvail([]))
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [id])

  if (!full) return <div className="border-t border-gray-100 p-6"><Loader2 className="animate-spin text-teal" /></div>

  const p = full.programme
  const units: any[] = p.units ?? []
  const usedIds = new Set(units.map((u: any) => u.module_id))
  const synoptic: any[] = Array.isArray(p.synoptic_questions) ? p.synoptic_questions : []

  async function patch(data: any) {
    setBusy('patch')
    try { await api.standardProgrammes.update(id, data); load(); onChanged() }
    catch (e: any) { onMessage({ tone: 'err', text: e?.message ?? 'Could not save.' }) }
    finally { setBusy('') }
  }

  async function saveUnits(next: Array<{ module_id: string; is_optional?: boolean }>) {
    setBusy('units')
    try { await api.standardProgrammes.setUnits(id, next); load(); onChanged() }
    catch (e: any) { onMessage({ tone: 'err', text: e?.message ?? 'Could not save units.' }) }
    finally { setBusy('') }
  }

  const unitPayload = () => units.map(u => ({ module_id: u.module_id, is_optional: u.is_optional }))

  function move(i: number, dir: -1 | 1) {
    const next = unitPayload()
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    saveUnits(next)
  }

  async function draftSynopticQs() {
    setBusy('synoptic')
    try {
      const r = await api.standardProgrammes.generateSynoptic(id, 15)
      setDraftSynoptic(r.questions)
    } catch (e: any) {
      onMessage({ tone: 'err', text: e?.message ?? 'Could not draft the final assessment.' })
    } finally { setBusy('') }
  }

  async function publish() {
    if (!reviewer.name.trim() || !reviewer.role.trim()) {
      onMessage({ tone: 'err', text: 'A reviewer name and role are required to attest and publish.' })
      return
    }
    setBusy('publish')
    try {
      await api.standardProgrammes.approve(id, { approved: true, reviewer_name: reviewer.name.trim(), reviewer_role: reviewer.role.trim() })
      onMessage({ tone: 'ok', text: 'Published — every tenant can now assign it.' })
      load(); onChanged()
    } catch (e: any) {
      onMessage({ tone: 'err', text: e?.message ?? 'Could not publish.' })
    } finally { setBusy('') }
  }

  return (
    <div className="space-y-5 border-t border-gray-100 bg-neutral-light/20 p-5">
      {/* QA gate */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-teal-dark">Quality checks</p>
        <ul className="space-y-1 text-sm">
          {full.qa.checks.map((c: any) => (
            <li key={c.key} className="text-neutral-dark">
              <span className={c.status === 'pass' ? 'text-green-600' : c.status === 'warn' ? 'text-amber-600' : 'text-red-600'}>
                {c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✗'}
              </span>{' '}
              {c.label} — <span className="text-neutral-mid">{c.detail}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Settings */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-3 text-sm font-semibold text-teal-dark">Completion rule</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-2 text-sm text-neutral-dark">
            <input type="checkbox" checked={!!p.sequential} onChange={e => patch({ sequential: e.target.checked })} className="mt-1" />
            <span>Units must be taken in order<br /><span className="text-xs text-neutral-mid">Locks later units until earlier ones pass</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm text-neutral-dark">
            <input type="checkbox" checked={!!p.require_practical} onChange={e => patch({ require_practical: e.target.checked })} className="mt-1" />
            <span>Require observed sign-off<br /><span className="text-xs text-neutral-mid">Every practical unit needs a manager signature</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm text-neutral-dark">
            <input type="checkbox" checked={!!p.require_reflection} onChange={e => patch({ require_reflection: e.target.checked })} className="mt-1" />
            <span>Require a reflective account<br /><span className="text-xs text-neutral-mid">What they will do differently, in their words</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm text-neutral-dark">
            <input type="checkbox" checked={!!p.cpd_accredited} onChange={e => patch({ cpd_accredited: e.target.checked })} className="mt-1" />
            <span>CPD accredited<br /><span className="text-xs text-neutral-mid">Only tick when every unit genuinely is</span></span>
          </label>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Final-assessment pass mark (%)</label>
            <input type="number" min={0} max={100} defaultValue={p.synoptic_pass_mark} onBlur={e => patch({ synoptic_pass_mark: Number(e.target.value) })} className={INPUT} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-mid">Price (pence, blank = not sold separately)</label>
            <input type="number" min={0} defaultValue={p.price_pence ?? ''} onBlur={e => patch({ price_pence: e.target.value === '' ? null : Number(e.target.value) })} className={INPUT} />
          </div>
        </div>
        <p className="mt-3 text-xs text-neutral-mid">
          Taught volume <strong className="text-neutral-dark">{hrs(p.duration_minutes)}</strong>
          {p.cpd_hours != null && <> ({p.cpd_hours} CPD hours)</>} across {units.length} units.
        </p>
      </div>

      {/* Units */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-teal-dark">Units ({units.length})</p>
        <p className="mb-3 text-xs text-neutral-mid">Only published standard modules can be units. Order matters when &ldquo;take in order&rdquo; is on.</p>

        <div className="space-y-1.5">
          {units.map((u: any, i: number) => (
            <div key={u.module_id} className={`flex items-center gap-2 rounded-md border p-2 ${u.approved ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50'}`}>
              <span className="w-6 text-center text-xs font-bold text-neutral-mid">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-dark">
                  {u.name}
                  {!u.approved && <span className="ml-1.5 text-[10px] font-semibold uppercase text-red-600">not published</span>}
                </p>
                <p className="text-[11px] text-neutral-mid">
                  {u.duration_minutes ? `${u.duration_minutes} min` : 'no duration set'}
                  {u.requires_practical && ' · practical'}
                  {u.cpd_accredited && ' · CPD'}
                  {u.question_count ? ` · ${u.question_count} Qs` : ''}
                  {!u.attested_by_name && ' · not attested'}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-1 text-[11px] text-neutral-mid">
                <input
                  type="checkbox" checked={!!u.is_optional}
                  onChange={e => saveUnits(unitPayload().map((x, xi) => xi === i ? { ...x, is_optional: e.target.checked } : x))}
                />
                optional
              </label>
              <div className="flex shrink-0 flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0 || !!busy} className="text-neutral-mid hover:text-neutral-dark disabled:opacity-30"><ChevronUp size={13} /></button>
                <button onClick={() => move(i, 1)} disabled={i === units.length - 1 || !!busy} className="text-neutral-mid hover:text-neutral-dark disabled:opacity-30"><ChevronDown size={13} /></button>
              </div>
              <button
                onClick={() => saveUnits(unitPayload().filter((_, xi) => xi !== i))}
                disabled={!!busy}
                className="shrink-0 text-neutral-mid hover:text-red-600 disabled:opacity-30"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {/* Add a unit */}
        {avail && (
          <div className="mt-3">
            <select
              value=""
              onChange={e => { if (e.target.value) saveUnits([...unitPayload(), { module_id: e.target.value }]) }}
              disabled={!!busy}
              className={INPUT}
            >
              <option value="">+ Add a unit…</option>
              {avail.filter(m => !usedIds.has(m.id)).map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}{m.duration_minutes ? ` (${m.duration_minutes} min)` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Outcomes */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-1 text-sm font-semibold text-teal-dark">Programme learning outcomes</p>
        <p className="mb-2 text-xs text-neutral-mid">One per line. These print on the certificate. Needs at least 4 to publish.</p>
        <textarea
          rows={8}
          defaultValue={(Array.isArray(p.outcomes) ? p.outcomes : []).join('\n')}
          onBlur={e => patch({ outcomes: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
          className={INPUT}
        />
      </div>

      {/* Synoptic assessment */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-teal-dark">Final (synoptic) assessment — {synoptic.length} questions</p>
          <button
            onClick={draftSynopticQs}
            disabled={busy === 'synoptic' || units.length < 2}
            className="inline-flex items-center gap-1.5 rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {busy === 'synoptic' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
            Draft from the units
          </button>
        </div>
        <p className="mb-3 text-xs text-neutral-mid">
          Questions that need knowledge from two or more units at once. This is what makes a diploma more than a
          bundle of certificates — a diploma cannot be published without it.
        </p>

        {draftSynoptic && (
          <div className="mb-3 rounded-lg border border-teal/30 bg-teal-light/20 p-3">
            <p className="text-xs font-semibold text-teal-dark">Draft — review before saving ({draftSynoptic.length} questions)</p>
            <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
              {draftSynoptic.map((q: any, i: number) => (
                <div key={i} className="rounded-md bg-white p-2.5 text-xs">
                  <p className="font-medium text-neutral-dark">{i + 1}. {q.text}</p>
                  <ul className="mt-1 space-y-0.5">
                    {q.options.map((o: string, oi: number) => (
                      <li key={oi} className={oi === q.correct ? 'font-semibold text-green-700' : 'text-neutral-mid'}>
                        {String.fromCharCode(65 + oi)}. {o} {oi === q.correct && '✓'}
                      </li>
                    ))}
                  </ul>
                  {q.draws_on?.length > 0 && <p className="mt-1 text-[10px] text-teal-dark">Draws on: {q.draws_on.join(' + ')}</p>}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { patch({ synoptic_questions: draftSynoptic }); setDraftSynoptic(null) }}
                className="rounded-md bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark"
              >
                Save these {draftSynoptic.length} questions
              </button>
              <button onClick={() => setDraftSynoptic(null)} className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-neutral-dark hover:bg-neutral-light">
                Discard
              </button>
            </div>
          </div>
        )}

        {synoptic.length > 0 && !draftSynoptic && (
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {synoptic.map((q: any, i: number) => (
              <div key={q.id ?? i} className="rounded-md border border-gray-100 bg-neutral-light/30 p-2 text-xs">
                <p className="text-neutral-dark">{i + 1}. {q.text}</p>
                <p className="mt-0.5 text-[10px] text-green-700">Correct: {String.fromCharCode(65 + (q.correct ?? 0))} — {q.options?.[q.correct ?? 0]}</p>
                {q.draws_on?.length > 0 && <p className="text-[10px] text-teal-dark">Draws on: {q.draws_on.join(' + ')}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pilot gate — who can see it once published */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4">
        <p className="mb-1 text-sm font-semibold text-indigo-900">Who sees it once published</p>
        <p className="mb-3 text-xs text-neutral-mid">
          Pick one or more tenants to pilot it — only they will see it, so you can test a new diploma on a real
          URL without it reaching clients. Leave every box unticked and it goes to <strong>all</strong> tenants.
        </p>
        {(() => {
          const pilots: string[] = Array.isArray(p.pilot_tenant_ids) ? p.pilot_tenant_ids : []
          return (
            <>
              <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border border-indigo-100 bg-white p-2">
                {tenants.length === 0 && <p className="p-1 text-xs text-neutral-mid">No tenants found.</p>}
                {tenants.map(t => (
                  <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-indigo-50/60">
                    <input
                      type="checkbox"
                      checked={pilots.includes(t.id)}
                      onChange={e => patch({
                        pilot_tenant_ids: e.target.checked ? [...pilots, t.id] : pilots.filter(x => x !== t.id),
                      })}
                    />
                    <span className="font-mono text-xs text-neutral-mid">{t.account_number}</span>
                    <span className="text-neutral-dark">{t.name}</span>
                  </label>
                ))}
              </div>
              <p className={`mt-2 text-xs font-medium ${pilots.length ? 'text-indigo-800' : 'text-amber-700'}`}>
                {pilots.length
                  ? `Pilot only — ${pilots.length} tenant${pilots.length === 1 ? '' : 's'} can see this.`
                  : 'Currently set to go live for ALL tenants when published.'}
              </p>
            </>
          )
        })()}
      </div>

      {/* CPD submission pack */}
      <div className="rounded-lg border border-violet-200 bg-violet-50/40 p-4">
        <p className="mb-1 text-sm font-semibold text-violet-900">CPD submission pack</p>
        <p className="mb-3 text-xs text-neutral-mid">
          The four documents the CPD Certification Service asks for, generated from this programme&apos;s own
          structure — so a submission can never drift from what participants actually receive. Open one, then
          Print / save PDF.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CPD_PROG_DOCS.map(d => (
            <button
              key={d.key}
              onClick={() => setPackDoc(d.key)}
              title={d.hint}
              className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100"
            >
              <FileText size={12} /> {d.label}
            </button>
          ))}
        </div>
        {units.length === 0 && (
          <p className="mt-2 text-xs text-amber-700">Add units first — the documents describe the units and the synoptic assessment.</p>
        )}
      </div>

      {packDoc && (
        <CpdProgrammeSheet doc={packDoc} p={{ ...p, units }} onClose={() => setPackDoc(null)} />
      )}

      {/* Publish */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="mb-2 text-sm font-semibold text-teal-dark">Attest &amp; publish</p>
        {p.approved ? (
          <>
            <p className="text-sm text-green-700">
              <CheckCircle2 size={14} className="mr-1 inline" />
              Published {fmtDate(p.approved_at)} — attested by {p.attested_by_name}{p.attested_by_role ? `, ${p.attested_by_role}` : ''}.
            </p>
            <button
              onClick={async () => { setBusy('unpub'); try { await api.standardProgrammes.approve(id, { approved: false }); load(); onChanged() } finally { setBusy('') } }}
              disabled={!!busy}
              className="mt-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-neutral-dark hover:bg-neutral-light disabled:opacity-50"
            >
              Un-publish (back to draft)
            </button>
          </>
        ) : (
          <>
            <p className="mb-2 text-xs text-neutral-mid">
              Publishing needs a named competent person, exactly like a module. Blocked while any quality check fails.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={reviewer.name} onChange={e => setReviewer(r => ({ ...r, name: e.target.value }))} placeholder="Reviewer name" className={INPUT} />
              <input value={reviewer.role} onChange={e => setReviewer(r => ({ ...r, role: e.target.value }))} placeholder="Reviewer role / qualification" className={INPUT} />
            </div>
            <button
              onClick={publish}
              disabled={busy === 'publish' || !full.qa.ok_to_approve}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
            >
              {busy === 'publish' ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
              Attest &amp; publish
            </button>
            {!full.qa.ok_to_approve && (
              <p className="mt-1.5 text-xs text-red-600">Fix the {full.qa.hard_fails} blocking quality check(s) first.</p>
            )}
          </>
        )}

        <button
          onClick={async () => {
            setBusy('del')
            try { await api.standardProgrammes.remove(id); onDeleted() }
            catch (e: any) { onMessage({ tone: 'err', text: e?.message ?? 'Could not delete.' }) }
            finally { setBusy('') }
          }}
          disabled={!!busy}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-neutral-mid hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 size={12} /> Delete programme
        </button>
      </div>
    </div>
  )
}
