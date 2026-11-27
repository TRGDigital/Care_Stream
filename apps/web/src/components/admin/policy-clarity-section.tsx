'use client'

// Step 5 on the Gaps page: Policy clarity and precision (pilot: CS-1001 only). Does the policy actually tell staff what to do?
// A policy only becomes ready once its regulation gaps, out of date terms and conflicts are dealt with, so wording that is about to change is not rewritten. It can still be run anyway.
import { useCallback, useEffect, useState } from 'react'
import { Loader2, FileSearch } from 'lucide-react'
import { stress, type ClarityPolicy, type ClarityResult } from '@/lib/stress-client'
import { BAND_STYLE } from './policy-health-pill'

const CHECKS = [
  { key: 'vague', label: 'Vague or ambiguous wording' }, { key: 'unclear_responsibility', label: 'Unclear responsibilities' }, { key: 'passive', label: 'Passive language' },
  { key: 'missing_escalation', label: 'Missing escalation routes' }, { key: 'undefined_timeframe', label: 'Undefined timeframes' },
  { key: 'generic', label: 'Generic statements without practical instructions' }, { key: 'jargon', label: 'Excessive jargon' },
]

export function PolicyClaritySection({ token }: { token: string }) {
  const [policies, setPolicies] = useState<ClarityPolicy[] | null>(null)
  const [result, setResult] = useState<ClarityResult | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)

  const load = useCallback(async () => { try { setPolicies((await stress.clarityLibrary(token)).policies) } catch (e: any) { setError(e.message) } }, [token])
  useEffect(() => { void load() }, [load])

  async function run(p: ClarityPolicy, force: boolean) {
    setBusy(p.id); setError('')
    try { setResult((await stress.clarityRun(token, p.id, force)).result); await load() } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }
  async function view(id: string) {
    setBusy('v' + id); setError('')
    try { setResult((await stress.clarityResult(token, id)).result) } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  const ready = (policies ?? []).filter(p => p.ready).length
  const list = (policies ?? []).filter(p => showAll || p.ready || p.last)

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-neutral-dark"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs text-white">5</span> Policy clarity and precision <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700">Pilot</span></p>
          <p className="mt-1 max-w-3xl text-sm text-neutral-mid">
            Does the policy actually tell staff what to do? This reads the whole policy and quotes wording that sounds professional but is not specific enough: vague wording, no named person, passive wording, no escalation route, no timeframe, jargon.
            It is only offered for a policy once its regulation gaps, out of date terms and conflicts are sorted, so wording that is about to change is not rewritten.
          </p>
        </div>
        {policies && <p className="text-xs text-neutral-mid">{ready} of {policies.length} policies are ready</p>}
      </div>
      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

      {!policies ? <p className="mt-4 flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p> : (
        <>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-100">
            {list.length === 0 && <p className="px-4 py-4 text-sm text-neutral-mid">No policy is ready yet. Fix the open items in steps 1 to 4 first, or show all policies below to run one anyway.</p>}
            {list.map(p => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-dark">{p.name}</p>
                  {p.ready
                    ? <p className="text-xs text-neutral-mid">{p.last ? `Last checked ${new Date(p.last.at).toLocaleDateString('en-GB')}: ${p.last.findings} ${p.last.findings === 1 ? 'passage' : 'passages'} found` : 'Ready to check'}</p>
                    : <p className="text-xs text-amber-700">Waiting for: {p.waiting.join(', ')}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {p.last && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${BAND_STYLE[p.last.band].pill}`}>{BAND_STYLE[p.last.band].label}</span>}
                  {p.last && <button onClick={() => view(p.last!.id)} disabled={!!busy} className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">See result</button>}
                  <button onClick={() => run(p, !p.ready)} disabled={!!busy}
                          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold disabled:opacity-50 ${p.ready ? 'bg-purple-600 text-white hover:bg-purple-700' : 'border border-gray-200 text-neutral-dark hover:bg-neutral-light'}`}>
                    {busy === p.id ? <><Loader2 size={12} className="animate-spin" /> Reading…</> : <><FileSearch size={12} /> {p.ready ? (p.last ? 'Check again' : 'Check clarity') : 'Run anyway'}</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => setShowAll(v => !v)} className="mt-2 text-xs font-semibold text-purple-700 hover:underline">{showAll ? 'Show only ready policies' : `Show all ${policies.length} policies`}</button>
        </>
      )}

      {result && (
        <div className="mt-6 rounded-xl border border-purple-200 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wide text-purple-700">Result</p><h3 className="text-lg font-bold text-neutral-dark">{result.policy_name}</h3></div>
            <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${BAND_STYLE[result.band].pill}`}>Clarity: {BAND_STYLE[result.band].label}</span>
          </div>
          {result.summary && <p className="mt-2 text-sm text-neutral-dark">{result.summary}</p>}
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {[['Words', result.metrics.words.toLocaleString('en-GB')], ['Average sentence', `${result.metrics.avg_sentence_words} words`], ['Long sentences', `${result.metrics.long_sentence_pct}%`], ['Reading ease', String(result.metrics.reading_ease)]].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-neutral-light px-3 py-2 text-xs"><b className="block text-base text-neutral-dark">{v}</b>{l}</div>
            ))}
          </div>
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {CHECKS.map(c => { const n = result.findings.filter(f => f.type === c.key).length; const words = result.metrics.words || 1; const band = n === 0 ? 'strong' : (n / words) * 1000 <= 1 ? 'good' : 'attention'
              return <div key={c.key} className="flex items-center gap-2 rounded-md border border-gray-100 px-2.5 py-1.5 text-xs"><span className={`h-2 w-2 shrink-0 rounded-full ${BAND_STYLE[band].dot}`} /><span className="text-neutral-dark">{c.label}</span><span className="ml-auto font-semibold text-neutral-mid">{n === 0 ? 'None' : n}</span></div> })}
          </div>
          {result.findings.length === 0 ? <p className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">No unclear wording was found. Every instruction was specific enough.</p> : (
            <ul className="mt-4 space-y-3">
              {result.findings.map((f, i) => (
                <li key={i} className="rounded-lg border border-gray-100 p-3">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{f.type_label}</span>
                  <blockquote className="mt-1.5 border-l-2 border-gray-200 pl-3 text-sm italic text-neutral-dark">&ldquo;{f.quote}&rdquo;</blockquote>
                  <p className="mt-1.5 text-xs text-neutral-mid">{f.issue}</p>
                  {f.suggestion && <div className="mt-2 rounded-md bg-purple-50 px-3 py-2 text-xs text-neutral-dark"><span className="font-semibold text-purple-700">Suggested wording to review: </span>{f.suggestion}</div>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-neutral-mid">This judges the wording of the policy, not the care your team gives. Words in square brackets are for you to decide. Review every suggestion before you use it.</p>
        </div>
      )}
    </section>
  )
}
