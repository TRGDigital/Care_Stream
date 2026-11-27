'use client'

// Policy health (pilot: CS-1001 only). A badge beside each policy on the Policies page; clicking it opens an accordion row under the policy (PolicyHealthPanel) showing the six dimensions, when each was last run,
// and a Run health check button: read the policy, test it against the approved situations that fit it, and get a rough score out of 100 with the three things to fix first.
// The score is worked out by a fixed rule from the six dimensions. It is not a compliance rating.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Loader2, Check, PlayCircle, ChevronDown } from 'lucide-react'
import { stress, useStressMeta, type Band, type HealthCheckResult, type HealthDim, type HealthPlan, type PolicyHealth } from '@/lib/stress-client'

export const BAND_STYLE: Record<Band, { label: string; pill: string; dot: string }> = {
  strong:    { label: 'Strong',          pill: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  good:      { label: 'Good',            pill: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
  attention: { label: 'Needs attention', pill: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  none:      { label: 'Not assessed',    pill: 'bg-gray-50 text-gray-600 border-gray-200',    dot: 'bg-gray-300' },
}

// One request for the whole page: every badge reads the same result, and a finished check refreshes them all.
let cache: { token: string; at: number; p: Promise<PolicyHealth[]> } | null = null
const listeners = new Set<() => void>()
function loadOnce(token: string, fresh = false): Promise<PolicyHealth[]> {
  if (fresh || !cache || cache.token !== token || Date.now() - cache.at > 60_000) cache = { token, at: Date.now(), p: stress.health(token).then(r => r.policies).catch(() => []) }
  return cache.p
}
function useHealth(policyId: string): { h: PolicyHealth | null | undefined; token?: string; refresh: () => Promise<void> } {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { enabled } = useStressMeta()
  const [h, setH] = useState<PolicyHealth | null | undefined>(undefined)
  useEffect(() => {
    if (!enabled || !token) return
    const load = () => loadOnce(token).then(list => setH(list.find(x => x.id === policyId) ?? null))
    void load(); listeners.add(load); return () => { listeners.delete(load) }
  }, [enabled, token, policyId])
  const refresh = async () => { if (token) { await loadOnce(token, true); listeners.forEach(fn => fn()) } }
  return { h: enabled ? h : null, token, refresh }
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** The badge. Open and toggle belong to the table, so the accordion row can sit under the policy. */
export function PolicyHealthPill({ policyId, open, onToggle }: { policyId: string; open: boolean; onToggle: () => void }) {
  const { h } = useHealth(policyId)
  if (!h) return null
  const lc = h.last_check
  const st = BAND_STYLE[lc ? lc.band : 'none']
  return (
    <button type="button" onClick={onToggle} aria-expanded={open}
            className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {lc ? `Health ${lc.score}${lc.stale ? ' · out of date' : ''}` : 'Health: not checked'}
      <ChevronDown size={10} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
    </button>
  )
}

type Step = { label: string; state: 'wait' | 'run' | 'done' | 'failed' }

function DimCard({ d, h }: { d: HealthDim; h: PolicyHealth }) {
  const st = BAND_STYLE[d.band]
  const isClarity = d.key === 'clarity'
  return (
    <li className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${st.dot}`} />
        <h4 className="text-base font-semibold text-neutral-dark">{d.label}</h4>
        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${st.pill}`}>{st.label}{d.value != null ? ` · ${d.value}` : ''}</span>
        <span className="ml-auto text-xs text-neutral-mid">{d.last_run ? `Last run ${fmtDate(d.last_run)}` : 'Not run yet'}</span>
      </div>
      <p className="mt-1.5 text-sm text-neutral-dark">{d.detail}</p>
      {isClarity && !h.ready && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">Steps 1, 2, 3 and 4 need completing for this policy before clarity can be run. Still to do: {h.waiting.join('; ')}.</p>
      )}
      {isClarity && d.checks && (
        <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {d.checks.map(c => (
            <div key={c.key} className="flex items-center gap-2 text-sm text-neutral-dark"><span className={`h-2 w-2 shrink-0 rounded-full ${BAND_STYLE[c.band].dot}`} />{c.label}<span className="ml-auto text-neutral-mid">{c.band === 'none' ? 'not run' : c.count === 0 ? 'none' : c.count}</span></div>
          ))}
        </div>
      )}
      {d.testing && (d.testing.available.length > 0 || d.testing.results.length > 0) && (
        <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {(() => {
            const t = d.testing!, byScenario = new Map(t.results.map(r => [r.scenario_id, r]))
            const rows = [...t.available.map(a => ({ id: a.id, title: a.title, r: byScenario.get(a.id) })), ...t.results.filter(r => !t.available.some(a => a.id === r.scenario_id)).map(r => ({ id: r.scenario_id, title: r.title, r }))]
            return rows.map(x => (
              <li key={x.id} className="text-sm text-neutral-dark">
                <span className="font-medium">{x.title}</span>
                {x.r ? (
                  <span className="block text-neutral-mid">Tested {fmtDate(x.r.at)}: {x.r.covered} of {x.r.total} points covered in this policy{x.r.elsewhere > 0 ? `, ${x.r.elsewhere} covered in another policy` : ''}, {x.r.gaps === 0 ? 'nothing missing from your library' : `${x.r.gaps} not covered anywhere`}.
                    {(x.r.policy_changed || x.r.scenario_changed) && <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-800">{x.r.policy_changed ? 'Policy changed since, test again' : 'Situation updated, test again'}</span>}</span>
                ) : <span className="block text-neutral-mid">Set up for this policy. Not tested yet.</span>}
              </li>
            ))
          })()}
          {d.testing.changes > 0 && <li className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">{d.testing.changes} {d.testing.changes === 1 ? 'change has' : 'changes have'} been adopted into this policy because of policy testing{d.testing.last_change_at ? ` (last on ${fmtDate(d.testing.last_change_at)})` : ''}. This is recorded in the health check.</li>}
        </ul>
      )}
      {isClarity && d.readability && (
        <div className="mt-3 flex items-start gap-2 border-t border-gray-100 pt-3 text-sm text-neutral-dark">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${BAND_STYLE[d.readability.band].dot}`} />
          <span><b className="font-semibold">Staff readability</b> <span className="text-neutral-mid">· {BAND_STYLE[d.readability.band].label}</span><span className="block text-neutral-mid">{d.readability.detail}</span></span>
        </div>
      )}
      <p className="mt-3 text-sm"><Link href={d.href} className="font-semibold text-purple-700 hover:underline">{isClarity ? 'Open this policy in step 5 on the Gaps page' : d.key === 'practical' ? (d.testing && d.testing.results.length > 0 ? 'See the results and review changes in Policy Testing' : 'Open Policy Testing for this policy') : 'Open on the Gaps page'}</Link></p>
    </li>
  )
}

/** The accordion content under a policy. */
export function PolicyHealthPanel({ policyId, onBusy }: { policyId: string; onBusy: (busy: boolean) => void }) {
  const { h, token, refresh } = useHealth(policyId)
  const [stage, setStage] = useState<'idle' | 'confirm' | 'running' | 'done'>('idle')
  const [plan, setPlan] = useState<HealthPlan | null>(null)
  const [withStress, setWithStress] = useState(true)
  const [steps, setSteps] = useState<Step[]>([])
  const [result, setResult] = useState<HealthCheckResult | null>(null)
  const [error, setError] = useState('')
  if (!h || !token) return <div className="px-6 py-5 text-sm text-neutral-mid"><Loader2 size={14} className="mr-2 inline animate-spin" />Loading</div>
  const lc = h.last_check
  const st = BAND_STYLE[lc ? lc.band : 'none']
  const fixes = stage === 'done' && result ? result.fixes : lc?.fixes ?? h.fixes

  async function start() {
    setError(''); setStage('confirm')
    try { setPlan(await stress.healthPlan(token!, policyId)) } catch (e: any) { setError(e.message); setStage('idle') }
  }
  async function runCheck() {
    if (!plan) return
    const list = withStress ? plan.scenarios : []
    setSteps([{ label: 'Reading the whole policy for unclear wording', state: 'run' }, ...list.map(s => ({ label: `Policy testing: ${s.title}`, state: 'wait' as const })), { label: 'Working out the score', state: 'wait' }])
    setStage('running'); setError(''); onBusy(true)
    const set = (i: number, state: Step['state']) => setSteps(cur => cur.map((x, j) => (j === i ? { ...x, state } : j === i + 1 && state !== 'run' && x.state === 'wait' ? { ...x, state: 'run' } : x)))
    try {
      await stress.clarityRun(token!, policyId, true); set(0, 'done')
      for (let i = 0; i < list.length; i++) { try { await stress.run(token!, policyId, list[i].id); set(i + 1, 'done') } catch { set(i + 1, 'failed') } }
      const r = await stress.healthSnapshot(token!, policyId, withStress)
      setResult(r.check); setStage('done'); await refresh()
    } catch (e: any) { setError(e.message); setStage('idle') } finally { onBusy(false) }
  }

  return (
    <div className="grid items-start gap-6 bg-neutral-light/50 px-6 py-6 lg:grid-cols-[340px_minmax(0,1fr)]">
      {/* Stays in view while the dimension cards scroll past. */}
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-neutral-mid">Policy health</p>
          {lc ? (
            <>
              <p className="mt-1"><span className="text-6xl font-extrabold leading-none text-neutral-dark">{lc.score}</span><span className="text-lg text-neutral-mid"> / 100</span></p>
              <p className="mt-2"><span className={`rounded-full border px-3 py-1 text-sm font-semibold ${st.pill}`}>{st.label}</span></p>
              <p className="mt-2 text-sm text-neutral-mid">Checked {fmtDate(lc.at)}{lc.stale ? '. This policy has changed since, so check again.' : '.'}</p>
            </>
          ) : <p className="mt-1 text-sm text-neutral-dark">Not checked yet. {h.assessed} of {h.dims.length} dimensions already have results from the analyses on the Gaps page.</p>}
        </div>

        {stage === 'idle' && (
          <button onClick={start} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"><PlayCircle size={16} /> {lc ? 'Check again' : 'Run health check'}</button>
        )}
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {stage === 'confirm' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-neutral-dark">
            {!plan ? <p className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Working out what to run…</p> : (<>
              <p className="font-semibold">This reads the policy in full and uses about {1 + (withStress ? plan.credits.stress : 0)} AI {1 + (withStress ? plan.credits.stress : 0) === 1 ? 'credit' : 'credits'}.</p>
              <p className="mt-1 text-neutral-mid">1 for the clarity read{withStress && plan.credits.stress > 0 ? `, and 1 for each situation tested (${plan.credits.stress}).` : '.'}</p>
              {plan.scenarios.length > 0 ? (
                <label className="mt-3 flex items-start gap-2"><input type="checkbox" checked={withStress} onChange={e => setWithStress(e.target.checked)} className="mt-1" />
                  <span>Include policy testing against {plan.scenarios.length === 1 ? 'the approved situation' : `the ${plan.scenarios.length} approved situations`} that fit this policy:
                    <span className="mt-1 block text-neutral-mid">{plan.scenarios.map(s => s.title).join(' · ')}</span></span></label>
              ) : <p className="mt-3 text-neutral-mid">No approved situation fits this policy yet, so no policy testing will run.</p>}
              <div className="mt-4 flex gap-2">
                <button onClick={runCheck} className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700">Run</button>
                <button onClick={() => setStage('idle')} className="rounded-lg border border-gray-200 px-4 py-2 font-medium text-neutral-dark hover:bg-neutral-light">Cancel</button>
              </div>
            </>)}
          </div>
        )}

        {stage === 'running' && (
          <ul className="space-y-2 rounded-xl border border-gray-200 bg-white p-4 text-sm">
            {steps.map((x, i) => (
              <li key={i} className="flex items-center gap-2.5">
                {x.state === 'run' ? <Loader2 size={14} className="animate-spin text-purple-600" /> : x.state === 'done' ? <Check size={14} className="text-green-600" /> : x.state === 'failed' ? <span className="text-red-600">✕</span> : <span className="h-3.5 w-3.5 rounded-full border border-gray-300" />}
                <span className={x.state === 'wait' ? 'text-neutral-mid' : 'text-neutral-dark'}>{x.label}{x.state === 'failed' ? ' (could not be completed)' : ''}</span>
              </li>
            ))}
            <li className="pt-1 text-xs text-neutral-mid">This can take a minute or two. Keep this page open.</li>
          </ul>
        )}

        {stage !== 'running' && stage !== 'confirm' && fixes.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-900">Fix these first</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-neutral-dark">
              {fixes.map(f => <li key={f.dim}>{f.text}. <Link href={f.href} className="font-semibold text-purple-700 hover:underline">Open</Link></li>)}
            </ol>
          </div>
        )}
        <p className="text-xs leading-relaxed text-neutral-mid">
          A rough score from a fixed rule: each dimension is worth Strong 100, Good 70 or Needs attention 30, weighted, over those assessed (at least three). Regulation coverage, up to date, consistency and CQC wording use the latest results on the Gaps page, with the date each was run.
          Staff readability is part of clarity and precision. It is not a compliance rating.
        </p>
      </div>

      <ul className="space-y-3">
        {h.dims.map(d => <DimCard key={d.key} d={d} h={h} />)}
      </ul>
    </div>
  )
}
