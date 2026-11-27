'use client'

// Policy testing (pilot, CS-1001 first). The owner's view of the whole chain:
//   legislation and guidance  ->  scenario and its expected points  ->  the judge prompt  ->  a policy  ->  the outcome
// Scenarios are drafted from the regulations and only reach a home once the owner approves them.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { PlatformShell } from '@/components/platform-shell'
import { Loader2, FlaskConical, Plus, Trash2, ExternalLink, ArrowRight, Check } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Point = { id?: string; text: string; source_label: string; source_url: string }
type Scenario = {
  id: string; title: string; description: string; policy_types: string[]; settings: string[]; regulation_keys: string[]; expected_points: Point[]
  extra_instructions: string; status: 'draft' | 'approved'; version: number; problems: string[]
  regulations: Array<{ reference_key: string; official_name: string; authority_basis: string }>; runs: number; avg_gaps: number | null
}
type Reg = { reference_key: string; official_name: string; authority_basis: string; required_count: number; has_requirements: boolean; scenario_count: number; source_urls: string[] }
type Overview = { types: Array<{ key: string; label: string; group: string }>; prompts: Array<{ usage: string; label: string }>; judge_usage: string; drafter_usage: string; regulations: Reg[]; scenarios: Scenario[] }
type Result = { id: string; created_at: string; account_number: string; tenant_name: string; policy_name: string; scenario_title: string; scenario_version: number; gaps: number; summary: string; prompt_hash: string; points: Array<{ id: string; text: string; verdict: string; quote: string; note: string }> }

const groupTypes = (types: Array<{ key: string; label: string; group: string }>) => types.reduce<Record<string, Array<{ key: string; label: string; group: string }>>>((m, t) => { (m[t.group] ??= []).push(t); return m }, {})

const VERDICT: Record<string, string> = { covered: 'bg-green-50 text-green-700', partly: 'bg-amber-50 text-amber-800', missing: 'bg-red-50 text-red-700' }

export default function PolicyTestingPage() {
  const token = usePlatformAuth()
  const [data, setData] = useState<Overview | null>(null)
  const [view, setView] = useState<'library' | 'map' | 'results'>('library')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState('')
  const [editing, setEditing] = useState<Scenario | null>(null)
  const [results, setResults] = useState<Result[] | null>(null)
  const [draftReg, setDraftReg] = useState(''), [draftType, setDraftType] = useState('falls'), [regQuery, setRegQuery] = useState('')

  const call = useCallback(async (path: string, init: RequestInit = {}) => {
    const r = await fetch(`${API_URL}/admin/policy-testing${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(j?.error?.message ?? 'Something went wrong.')
    return j.data
  }, [token])

  const load = useCallback(async () => {
    if (!token) return
    try { setData(await call('/overview')) } catch (e: any) { setMsg(e.message) }
  }, [token, call])
  useEffect(() => { void load() }, [load])
  useEffect(() => { if (view === 'results' && token && !results) call('/results').then(d => setResults(d.results)).catch(e => setMsg(e.message)) }, [view, token, results, call])

  const regName = useMemo(() => new Map((data?.regulations ?? []).map(r => [r.reference_key, r])), [data])
  const filteredRegs = useMemo(() => (data?.regulations ?? []).filter(r => !regQuery || r.official_name.toLowerCase().includes(regQuery.toLowerCase())).slice(0, 80), [data, regQuery])

  async function run(label: string, fn: () => Promise<any>, done: string) {
    setBusy(label); setMsg('')
    try { await fn(); setMsg(done); await load() } catch (e: any) { setMsg(e.message) } finally { setBusy('') }
  }
  const draft = () => run('draft', async () => { await call('/draft', { method: 'POST', body: JSON.stringify({ regulation_key: draftReg, policy_type: draftType, count: 2 }) }) }, 'Drafted. The new scenarios are below as drafts. Check every point and its source before approving.')
  const saveEditing = () => editing && run('save', async () => { await call(`/scenarios/${editing.id}`, { method: 'PUT', body: JSON.stringify(editing) }); setEditing(null) }, 'Saved.')
  const setStatus = (s: Scenario, status: 'approved' | 'draft') => run('status' + s.id, () => call(`/scenarios/${s.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }), status === 'approved' ? 'Approved. Accounts in the pilot can now test their policies against it.' : 'Moved back to draft.')
  const remove = (s: Scenario) => { if (window.confirm('Delete this draft scenario?')) void run('del' + s.id, () => call(`/scenarios/${s.id}`, { method: 'DELETE' }), 'Deleted.') }
  const addBlank = () => run('new', () => call('/scenarios', { method: 'POST', body: JSON.stringify({ title: 'New scenario', policy_types: [draftType] }) }), 'Added a blank draft.')

  return (
    <PlatformShell>
      <div className="space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-dark"><FlaskConical size={22} className="text-purple-600" /> Policy testing</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-mid">
            Test a policy against a real situation. Each scenario lists the points a good response must contain, and every point is tied to the regulation or guidance it comes from.
            The AI only judges whether the policy says each point. Pilot: account CS-1001 only. Nothing reaches an account until you approve it.
          </p>
          {msg && <p className="mt-2 max-w-3xl rounded-md bg-neutral-light px-3 py-2 text-xs text-neutral-dark">{msg}</p>}
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-medium">
          {([['library', 'Scenario library'], ['map', 'Judging map'], ['results', 'Results']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} className={`rounded-md px-3 py-1.5 ${view === k ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid'}`}>{l}</button>
          ))}
        </div>

        {!data ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading…</p> : (<>

        {view === 'library' && (<>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-bold text-neutral-dark">Draft scenarios from a regulation</h2>
            <p className="mb-3 text-xs text-neutral-mid">The drafter reads the regulation&apos;s authoritative requirements and required elements, and proposes two scenarios. Every point is taken from that record. Drafts only.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[260px] flex-1">
                <label className="block text-xs font-semibold text-neutral-dark" htmlFor="regq">Regulation</label>
                <input id="regq" value={regQuery} onChange={e => setRegQuery(e.target.value)} placeholder="Search regulations" className="mb-1 w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" />
                <select value={draftReg} onChange={e => setDraftReg(e.target.value)} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-sm" size={4}>
                  {filteredRegs.map(r => <option key={r.reference_key} value={r.reference_key}>{r.official_name} {r.has_requirements ? '' : '(no requirements recorded)'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-dark" htmlFor="pt">Policy type</label>
                <select id="pt" value={draftType} onChange={e => setDraftType(e.target.value)} className="rounded-md border border-gray-200 px-2 py-1.5 text-sm">
                  {Object.entries(groupTypes(data.types)).map(([g, ts]) => <optgroup key={g} label={g}>{ts.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}</optgroup>)}
                </select>
              </div>
              <button disabled={!draftReg || busy === 'draft'} onClick={draft} className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-40">
                {busy === 'draft' ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />} Draft scenarios
              </button>
              <button disabled={busy === 'new'} onClick={addBlank} className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-neutral-dark hover:border-purple-300"><Plus size={14} /> Add one by hand</button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {data.scenarios.length === 0 && <p className="px-5 py-6 text-sm text-neutral-mid">No scenarios yet. Draft some from a regulation above.</p>}
            {data.scenarios.map(s => (
              <div key={s.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                      <p className="text-sm font-semibold text-neutral-dark">{s.title}</p>
                      <span className="text-xs text-neutral-mid">v{s.version} · {s.expected_points.length} points · {s.policy_types.map(t => data.types.find(x => x.key === t)?.label ?? t).join(', ') || 'no policy type'}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-mid">{s.regulations.map(r => r.official_name).join(' · ') || 'No regulation linked'}{s.runs ? ` · run ${s.runs} times, ${s.avg_gaps?.toFixed(1)} gaps on average` : ''}</p>
                    {s.status === 'draft' && s.problems.length > 0 && <p className="mt-1 text-xs text-amber-700">To approve: {s.problems.join(' ')}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => setEditing(editing?.id === s.id ? null : JSON.parse(JSON.stringify(s)))} className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light">{editing?.id === s.id ? 'Close' : 'Edit'}</button>
                    {s.status === 'draft'
                      ? <button disabled={s.problems.length > 0 || busy === 'status' + s.id} onClick={() => setStatus(s, 'approved')} className="rounded-md bg-purple-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40">Approve</button>
                      : <button disabled={busy === 'status' + s.id} onClick={() => setStatus(s, 'draft')} className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light">Back to draft</button>}
                    {s.status === 'draft' && <button onClick={() => remove(s)} aria-label="Delete draft" className="rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:text-red-600"><Trash2 size={13} /></button>}
                  </div>
                </div>

                {editing?.id === s.id && (
                  <div className="mt-4 space-y-3 rounded-lg bg-neutral-light/60 p-4 text-sm">
                    <div><label className="text-xs font-semibold" htmlFor={`t-${s.id}`}>Title</label><input id={`t-${s.id}`} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full rounded-md border border-gray-200 px-2 py-1.5" /></div>
                    <div><label className="text-xs font-semibold" htmlFor={`d-${s.id}`}>The situation</label><textarea id={`d-${s.id}`} rows={3} value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} className="w-full rounded-md border border-gray-200 px-2 py-1.5" /></div>
                    <div>
                      <p className="text-xs font-semibold">Policy types</p>
                      <div className="mt-1 space-y-1">{Object.entries(groupTypes(data.types)).map(([g, ts]) => (
                        <details key={g} open={ts.some(t => editing.policy_types.includes(t.key))} className="rounded-md border border-gray-200 bg-white px-2 py-1">
                          <summary className="cursor-pointer text-xs font-medium text-neutral-dark">{g} <span className="text-neutral-mid">({ts.filter(t => editing.policy_types.includes(t.key)).length} chosen)</span></summary>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 pb-1">{ts.map(t => (
                            <label key={t.key} className="inline-flex items-center gap-1.5 text-xs"><input type="checkbox" checked={editing.policy_types.includes(t.key)} onChange={e => setEditing({ ...editing, policy_types: e.target.checked ? [...editing.policy_types, t.key] : editing.policy_types.filter(x => x !== t.key) })} />{t.label}</label>
                          ))}</div>
                        </details>
                      ))}</div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Expected points (each needs its source)</p>
                      <div className="mt-1 space-y-2">
                        {editing.expected_points.map((p, i) => (
                          <div key={i} className="grid gap-2 rounded-md border border-gray-200 bg-white p-2 md:grid-cols-[1fr_220px_220px_auto]">
                            <textarea aria-label={`Point ${i + 1}`} rows={2} value={p.text} onChange={e => setEditing({ ...editing, expected_points: editing.expected_points.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} className="rounded-md border border-gray-200 px-2 py-1 text-xs" />
                            <input aria-label={`Source ${i + 1}`} placeholder="Regulation or guidance" value={p.source_label} onChange={e => setEditing({ ...editing, expected_points: editing.expected_points.map((x, j) => j === i ? { ...x, source_label: e.target.value } : x) })} className="rounded-md border border-gray-200 px-2 py-1 text-xs" />
                            <input aria-label={`Source address ${i + 1}`} placeholder="https:// address" value={p.source_url} onChange={e => setEditing({ ...editing, expected_points: editing.expected_points.map((x, j) => j === i ? { ...x, source_url: e.target.value } : x) })} className="rounded-md border border-gray-200 px-2 py-1 text-xs" />
                            <button onClick={() => setEditing({ ...editing, expected_points: editing.expected_points.filter((_, j) => j !== i) })} aria-label="Remove point" className="self-start rounded-md border border-gray-200 p-1.5 text-neutral-mid hover:text-red-600"><Trash2 size={12} /></button>
                          </div>
                        ))}
                        <button onClick={() => setEditing({ ...editing, expected_points: [...editing.expected_points, { text: '', source_label: editing.regulations[0]?.official_name ?? '', source_url: '' }] })} className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700"><Plus size={12} /> Add a point</button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold" htmlFor={`x-${s.id}`}>Extra instructions for the judge (optional, added to the Scenario judge prompt for this scenario only)</label>
                      <textarea id={`x-${s.id}`} rows={2} value={editing.extra_instructions} onChange={e => setEditing({ ...editing, extra_instructions: e.target.value })} className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs" />
                    </div>
                    <button disabled={busy === 'save'} onClick={saveEditing} className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-40">{busy === 'save' ? 'Saving…' : 'Save changes'}</button>
                    <p className="text-xs text-neutral-mid">Changing the situation or the points makes a new version, so every result can be traced to the version it was run on.</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>)}

        {view === 'map' && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-mid">
              {data.regulations.filter(r => r.scenario_count > 0).length} of {data.regulations.length} regulations have a scenario. Each row follows one chain:
              regulation or guidance, the scenario and its points, the prompt that judges it, and the outcomes so far.
            </p>
            {data.scenarios.length === 0 && <p className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-sm text-neutral-mid">No scenarios yet, so there is nothing to map.</p>}
            {data.scenarios.map(s => (
              <div key={s.id} className="grid items-stretch gap-2 rounded-xl border border-gray-200 bg-white p-3 lg:grid-cols-[1fr_auto_1.2fr_auto_1fr_auto_1fr]">
                <div className="rounded-lg bg-neutral-light/60 p-3 text-xs"><p className="mb-1 font-bold uppercase tracking-wide text-neutral-mid">Legislation and guidance</p>
                  {s.regulations.length ? s.regulations.map(r => <p key={r.reference_key} className="font-medium text-neutral-dark">{r.official_name} <span className="text-neutral-mid">({r.authority_basis === 'advisory' ? 'advisory' : 'statutory'})</span></p>) : <p className="text-amber-700">None linked</p>}
                  {[...new Set(s.expected_points.map(p => p.source_url).filter(Boolean))].slice(0, 2).map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-purple-700 hover:underline">Source <ExternalLink size={10} /></a>)}
                </div>
                <ArrowRight size={16} className="hidden self-center text-neutral-mid lg:block" />
                <div className="rounded-lg bg-neutral-light/60 p-3 text-xs"><p className="mb-1 font-bold uppercase tracking-wide text-neutral-mid">Scenario (v{s.version}, {s.status})</p>
                  <p className="font-medium text-neutral-dark">{s.title}</p><p className="text-neutral-mid">{s.expected_points.length} expected points</p></div>
                <ArrowRight size={16} className="hidden self-center text-neutral-mid lg:block" />
                <div className="rounded-lg bg-purple-50 p-3 text-xs"><p className="mb-1 font-bold uppercase tracking-wide text-purple-700">Prompt</p>
                  <Link href="/platform/prompts" className="font-medium text-purple-700 hover:underline">Policy Testing: Scenario judge</Link>
                  <p className="text-neutral-mid">{s.extra_instructions.trim() ? 'plus this scenario\'s extra instructions' : 'no extra instructions'}</p></div>
                <ArrowRight size={16} className="hidden self-center text-neutral-mid lg:block" />
                <div className="rounded-lg bg-neutral-light/60 p-3 text-xs"><p className="mb-1 font-bold uppercase tracking-wide text-neutral-mid">Policies tested and outcome</p>
                  <p className="font-medium text-neutral-dark">{s.policy_types.map(t => data.types.find(x => x.key === t)?.label ?? t).join(', ') || 'No policy type'}</p>
                  <p className="text-neutral-mid">{s.runs ? `${s.runs} runs, ${s.avg_gaps?.toFixed(1)} gaps on average` : 'Not run yet'}</p></div>
              </div>
            ))}
            <details className="rounded-xl border border-gray-200 bg-white p-4 text-xs">
              <summary className="cursor-pointer font-semibold text-neutral-dark">Regulations with no scenario yet ({data.regulations.filter(r => r.scenario_count === 0).length})</summary>
              <ul className="mt-2 grid gap-1 md:grid-cols-2">{data.regulations.filter(r => r.scenario_count === 0).map(r => <li key={r.reference_key} className="flex items-center gap-2"><span className="text-neutral-dark">{r.official_name}</span><span className="text-neutral-mid">{r.has_requirements ? `${r.required_count} required elements` : 'no requirements recorded'}</span></li>)}</ul>
            </details>
          </div>
        )}

        {view === 'results' && (
          !results ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={15} className="animate-spin" /> Loading results…</p> :
          results.length === 0 ? <p className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-sm text-neutral-mid">No tests have been run yet.</p> : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
              {results.map(r => (
                <details key={r.id} className="px-5 py-3 text-sm">
                  <summary className="cursor-pointer">
                    <span className="font-semibold text-neutral-dark">{r.policy_name}</span> <span className="text-neutral-mid">against</span> <span className="font-medium">{r.scenario_title}</span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${r.gaps === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>{r.gaps === 0 ? 'No gaps' : `${r.gaps} gap${r.gaps === 1 ? '' : 's'}`}</span>
                    <span className="ml-2 text-xs text-neutral-mid">{r.account_number} · v{r.scenario_version} · prompt {r.prompt_hash} · {new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                  </summary>
                  <p className="mt-2 text-xs text-neutral-mid">{r.summary}</p>
                  <ul className="mt-2 space-y-1.5">{r.points.map(p => (
                    <li key={p.id} className="text-xs"><span className={`mr-2 rounded px-1.5 py-0.5 font-semibold ${VERDICT[p.verdict] ?? ''}`}>{p.verdict}</span>{p.text}{p.quote && <span className="block pl-2 text-neutral-mid">&ldquo;{p.quote}&rdquo;</span>}</li>
                  ))}</ul>
                </details>
              ))}
            </div>
          )
        )}
        </>)}
      </div>
    </PlatformShell>
  )
}
