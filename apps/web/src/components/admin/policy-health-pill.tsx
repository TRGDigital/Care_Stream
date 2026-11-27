'use client'

// Policy health (pilot: CS-1001 only): a badge beside each policy on the Policies page. Click it to see the six dimensions, or press Run health check to read the policy, test it against the approved
// situations that fit it, and get a rough score out of 100 with the three things to fix first. The score is worked out by a fixed rule from the six dimensions. It is not a compliance rating.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Loader2, Check, PlayCircle } from 'lucide-react'
import { stress, useStressMeta, type Band, type HealthCheckResult, type HealthPlan, type PolicyHealth } from '@/lib/stress-client'

export const BAND_STYLE: Record<Band, { label: string; pill: string; dot: string }> = {
  strong:    { label: 'Strong',          pill: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  good:      { label: 'Good',            pill: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-500' },
  attention: { label: 'Needs attention', pill: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  none:      { label: 'Not assessed',    pill: 'bg-gray-50 text-gray-600 border-gray-200',    dot: 'bg-gray-300' },
}

// One request for the whole page: every pill reads the same result. Reset after a check so the pill updates.
let cache: { token: string; at: number; p: Promise<PolicyHealth[]> } | null = null
function loadOnce(token: string, fresh = false): Promise<PolicyHealth[]> {
  if (fresh || !cache || cache.token !== token || Date.now() - cache.at > 60_000) cache = { token, at: Date.now(), p: stress.health(token).then(r => r.policies).catch(() => []) }
  return cache.p
}

type Step = { label: string; state: 'wait' | 'run' | 'done' | 'failed' }
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

export function PolicyHealthPill({ policyId }: { policyId: string }) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { enabled } = useStressMeta()
  const [h, setH] = useState<PolicyHealth | null | undefined>(undefined)
  const [open, setOpen] = useState(false)
  const [stage, setStage] = useState<'idle' | 'confirm' | 'running' | 'done'>('idle')
  const [plan, setPlan] = useState<HealthPlan | null>(null)
  const [withStress, setWithStress] = useState(true)
  const [steps, setSteps] = useState<Step[]>([])
  const [result, setResult] = useState<HealthCheckResult | null>(null)
  const [error, setError] = useState('')
  const box = useRef<HTMLSpanElement>(null)

  useEffect(() => { if (enabled && token) loadOnce(token).then(list => setH(list.find(x => x.id === policyId) ?? null)) }, [enabled, token, policyId])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node) && stage !== 'running') setOpen(false) }
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close)
  }, [open, stage])

  if (!enabled || !h || !token) return null
  const lc = h.last_check
  const band: Band = lc ? lc.band : 'none'
  const st = BAND_STYLE[band]

  async function start() {
    setError(''); setStage('confirm')
    try { setPlan(await stress.healthPlan(token!, policyId)) } catch (e: any) { setError(e.message); setStage('idle') }
  }
  async function runCheck() {
    if (!plan) return
    const list = withStress ? plan.scenarios : []
    const init: Step[] = [{ label: 'Reading the whole policy for unclear wording', state: 'run' }, ...list.map(s => ({ label: `Testing: ${s.title}`, state: 'wait' as const })), { label: 'Working out the score', state: 'wait' }]
    setSteps(init); setStage('running'); setError('')
    const mark = (i: number, state: Step['state']) => setSteps(cur => cur.map((x, j) => (j === i ? { ...x, state } : j === i + 1 && state === 'done' && x.state === 'wait' ? { ...x, state: 'run' } : x)))
    try {
      await stress.clarityRun(token!, policyId, true); mark(0, 'done')
      for (let i = 0; i < list.length; i++) {
        try { await stress.run(token!, policyId, list[i].id); mark(i + 1, 'done') } catch { mark(i + 1, 'failed') }
        if (i === list.length - 1) setSteps(cur => cur.map((x, j) => (j === cur.length - 1 ? { ...x, state: 'run' } : x)))
      }
      const r = await stress.healthSnapshot(token!, policyId, withStress)
      setResult(r.check); setStage('done')
      const fresh = await loadOnce(token!, true); setH(fresh.find(x => x.id === policyId) ?? h)
    } catch (e: any) { setError(e.message); setStage('idle') }
  }
  const close = () => { setOpen(false); setStage('idle'); setResult(null); setError('') }

  return (
    <span ref={box} className="relative inline-block shrink-0">
      <button type="button" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${st.pill}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} /> {lc ? `Health ${lc.score}${lc.stale ? ' · out of date' : ''}` : 'Health: not checked'}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-[640px] max-w-[92vw] rounded-xl border border-gray-200 bg-white p-6 text-left shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-neutral-dark">Policy health</p>
              {lc ? (
                <p className="mt-0.5"><span className="text-5xl font-extrabold text-neutral-dark">{lc.score}</span><span className="text-sm text-neutral-mid"> / 100 · </span><span className={`rounded-full border px-2 py-0.5 text-sm font-semibold ${st.pill}`}>{st.label}</span>
                  <span className="block text-sm text-neutral-mid">Checked {fmtDay(lc.at)}{lc.stale ? '. This policy has changed since, so check again.' : ''}</span></p>
              ) : <p className="mt-0.5 text-sm text-neutral-mid">Not checked yet. {h.assessed} of {h.dims.length} dimensions have results from other analyses.</p>}
            </div>
            {stage === 'idle' && <button onClick={start} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-purple-700"><PlayCircle size={13} /> {lc ? 'Check again' : 'Run health check'}</button>}
          </div>
          {error && <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-sm text-red-700">{error}</p>}

          {stage === 'confirm' && (
            <div className="mt-3 rounded-lg bg-neutral-light p-3 text-sm text-neutral-dark">
              {!plan ? <p className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Working out what to run…</p> : (<>
                <p className="font-semibold">This will read the policy in full and use about {1 + (withStress ? plan.credits.stress : 0)} AI {1 + (withStress ? plan.credits.stress : 0) === 1 ? 'credit' : 'credits'}.</p>
                <p className="mt-1 text-neutral-mid">1 for the clarity read{withStress && plan.credits.stress > 0 ? `, and 1 for each situation tested (${plan.credits.stress}).` : '.'}</p>
                {plan.scenarios.length > 0 ? (
                  <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={withStress} onChange={e => setWithStress(e.target.checked)} className="mt-0.5" />
                    <span>Include stress tests against {plan.scenarios.length === 1 ? 'the approved situation' : `the ${plan.scenarios.length} approved situations`} that fit this policy:
                      <span className="block text-neutral-mid">{plan.scenarios.map(s => s.title).join(' · ')}</span></span></label>
                ) : <p className="mt-2 text-neutral-mid">No approved situation fits this policy yet, so no stress tests will run.</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={runCheck} className="rounded-md bg-purple-600 px-3 py-1.5 font-semibold text-white hover:bg-purple-700">Run</button>
                  <button onClick={() => setStage('idle')} className="rounded-md border border-gray-200 px-3 py-1.5 font-medium text-neutral-dark hover:bg-white">Cancel</button>
                </div>
              </>)}
            </div>
          )}

          {stage === 'running' && (
            <ul className="mt-3 space-y-1.5 rounded-lg bg-neutral-light p-3 text-sm">
              {steps.map((x, i) => (
                <li key={i} className="flex items-center gap-2">
                  {x.state === 'run' ? <Loader2 size={12} className="animate-spin text-purple-600" /> : x.state === 'done' ? <Check size={12} className="text-green-600" /> : x.state === 'failed' ? <span className="text-red-600">✕</span> : <span className="h-3 w-3 rounded-full border border-gray-300" />}
                  <span className={x.state === 'wait' ? 'text-neutral-mid' : 'text-neutral-dark'}>{x.label}{x.state === 'failed' ? ' (could not be completed)' : ''}</span>
                </li>
              ))}
              <li className="pt-1 text-sm text-neutral-mid">This can take a minute or two. Keep this page open.</li>
            </ul>
          )}

          {(stage === 'done' && result ? result.fixes : lc?.fixes ?? h.fixes).length > 0 && stage !== 'running' && stage !== 'confirm' && (
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-900">Fix these first</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4 text-sm text-neutral-dark">
                {(stage === 'done' && result ? result.fixes : lc?.fixes ?? h.fixes).map(f => <li key={f.dim}>{f.text}. <Link href={f.href} className="font-semibold text-purple-700 hover:underline">Open</Link></li>)}
              </ol>
            </div>
          )}

          <ul className="mt-4 space-y-3.5">
            {h.dims.map(d => (
              <li key={d.key} className="flex gap-2 text-sm">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${BAND_STYLE[d.band].dot}`} />
                <span className="min-w-0 flex-1"><span className="font-semibold text-neutral-dark">{d.label}</span> <span className="text-neutral-mid">· {BAND_STYLE[d.band].label}{d.value != null ? ` · ${d.value}` : ''}</span>
                  <span className="block font-normal text-neutral-mid">{d.detail} <Link href={d.href} className="font-semibold text-purple-700 hover:underline">Open</Link></span>
                  {d.checks && (
                    <ul className="mt-1.5 space-y-1 border-l border-gray-100 pl-2">
                      {d.checks.map(c => (
                        <li key={c.key} className="flex items-center gap-1.5 font-normal text-neutral-dark"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${BAND_STYLE[c.band].dot}`} />{c.label}<span className="ml-auto text-neutral-mid">{c.band === 'none' ? 'not run' : c.count === 0 ? 'none' : c.count}</span></li>
                      ))}
                    </ul>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-gray-100 pt-2 text-sm leading-snug text-neutral-mid">
            A rough score from a fixed rule: each dimension is worth Strong 100, Good 70 or Needs attention 30, weighted, over those assessed (at least three). Regulatory coverage, up to date and consistency use your latest results on the Gaps page.
            It is not a compliance rating.
          </p>
        </div>
      )}
    </span>
  )
}
