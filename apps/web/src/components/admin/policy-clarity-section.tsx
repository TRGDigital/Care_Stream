'use client'

// Step 5 on the Gaps page: Policy clarity and precision (pilot: CS-1001 only). Does the policy actually tell staff what to do?
// Each policy opens as its own accordion. A policy opens even when it is not ready, but then shows what is still to do in steps 1 to 4 and offers nothing to run: wording that is about to change is not rewritten.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, FileSearch, ChevronDown, Sparkles, Check, X } from 'lucide-react'
import { stress, type ClarityPolicy, type ClarityResult } from '@/lib/stress-client'
import { BAND_STYLE } from './policy-health-pill'

const CHECKS = [
  { key: 'vague', label: 'Vague or ambiguous wording' }, { key: 'unclear_responsibility', label: 'Unclear responsibilities' }, { key: 'passive', label: 'Passive language' },
  { key: 'missing_escalation', label: 'Missing escalation routes' }, { key: 'undefined_timeframe', label: 'Undefined timeframes' },
  { key: 'generic', label: 'Generic statements without practical instructions' }, { key: 'jargon', label: 'Excessive jargon' },
]

function ResultView({ result }: { result: ClarityResult }) {
  return (
    <div className="mt-4 rounded-xl border border-purple-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-purple-700">Result · {new Date(result.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${BAND_STYLE[result.band].pill}`}>Clarity: {BAND_STYLE[result.band].label}</span>
      </div>
      {result.summary && <p className="mt-2 text-sm text-neutral-dark">{result.summary}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        {[['Words', result.metrics.words.toLocaleString('en-GB')], ['Average sentence', `${result.metrics.avg_sentence_words} words`], ['Long sentences', `${result.metrics.long_sentence_pct}%`], ['Reading ease', String(result.metrics.reading_ease)]].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-neutral-light px-3 py-2 text-xs"><b className="block text-base text-neutral-dark">{v}</b>{l}</div>
        ))}
      </div>
      <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {CHECKS.map(c => {
          const n = result.findings.filter(f => f.type === c.key).length, words = result.metrics.words || 1
          const band = n === 0 ? 'strong' : (n / words) * 1000 <= 1 ? 'good' : 'attention'
          return <div key={c.key} className="flex items-center gap-2 rounded-md border border-gray-100 px-2.5 py-1.5 text-xs"><span className={`h-2 w-2 shrink-0 rounded-full ${BAND_STYLE[band].dot}`} /><span className="text-neutral-dark">{c.label}</span><span className="ml-auto font-semibold text-neutral-mid">{n === 0 ? 'None' : n}</span></div>
        })}
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
  )
}

export function PolicyClaritySection({ token, focusPolicyId }: { token: string; focusPolicyId?: string | null }) {
  const [policies, setPolicies] = useState<ClarityPolicy[] | null>(null)
  const [results, setResults] = useState<Record<string, ClarityResult>>({})
  const [openPolicy, setOpenPolicy] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [open, setOpen] = useState(!!focusPolicyId)   // arriving from a policy's health panel opens this step
  const [focused, setFocused] = useState(false)
  const top = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => { try { setPolicies((await stress.clarityLibrary(token)).policies) } catch (e: any) { setError(e.message) } }, [token])
  useEffect(() => { void load() }, [load])

  const loadResult = useCallback(async (id: string) => {
    if (results[id]) return
    try { const r = (await stress.clarityResult(token, id)).result; setResults(cur => ({ ...cur, [r.policy_id]: r })) } catch (e: any) { setError(e.message) }
  }, [token, results])

  function toggle(p: ClarityPolicy) {
    const next = openPolicy === p.id ? null : p.id
    setOpenPolicy(next)
    if (next && p.ready && p.last) void loadResult(p.last.id)
  }

  async function run(p: ClarityPolicy) {
    setBusy(p.id); setError('')
    try { const r = (await stress.clarityRun(token, p.id, false)).result; setResults(cur => ({ ...cur, [r.policy_id]: r })); await load() } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  // Arriving from a policy's health panel: open step 5, scroll to it and open that policy, whether or not it is ready.
  useEffect(() => {
    if (!focusPolicyId || !policies || focused) return
    setFocused(true); setOpen(true); setShowAll(true)
    const p = policies.find(x => x.id === focusPolicyId)
    if (p) { setOpenPolicy(p.id); if (p.ready && p.last) void loadResult(p.last.id) }
    setTimeout(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [focusPolicyId, policies, focused, loadResult])

  const ready = (policies ?? []).filter(p => p.ready).length
  const list = (policies ?? []).filter(p => showAll || p.ready || p.last || p.id === focusPolicyId).sort((a, b) => (a.id === focusPolicyId ? -1 : b.id === focusPolicyId ? 1 : 0))

  return (
    <div ref={top} className="mb-6 scroll-mt-24 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left" aria-expanded={open}>
        <Sparkles size={16} className="shrink-0 text-indigo-500" />
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">5</span>
        <h2 className="text-sm font-semibold text-neutral-dark">Policy clarity and precision</h2>
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-700">Pilot</span>
        {policies && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">{ready} of {policies.length} ready</span>}
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 p-6">
          <p className="max-w-3xl text-sm text-neutral-mid">
            Does the policy actually tell staff what to do? This reads the whole policy and quotes wording that sounds professional but is not specific enough: vague wording, no named person, passive wording, no escalation route, no timeframe, jargon.
            A policy is ready once steps 1 to 4 have been run for it and have nothing open, so wording that is about to change is not rewritten.
          </p>
          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          {!policies ? <p className="mt-4 flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p> : (
            <>
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 divide-y divide-gray-100">
                {list.length === 0 && <p className="px-4 py-4 text-sm text-neutral-mid">No policy is ready yet. Complete steps 1 to 4 first, or show all policies below to see what each is waiting for.</p>}
                {list.map(p => {
                  const isOpen = openPolicy === p.id, res = results[p.id]
                  return (
                    <div key={p.id} className={p.id === focusPolicyId ? 'bg-purple-50/40' : ''}>
                      <button onClick={() => toggle(p)} aria-expanded={isOpen} className="flex w-full flex-wrap items-center gap-2 px-4 py-3 text-left hover:bg-neutral-light/50">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-neutral-dark">{p.name}</p>
                          {p.ready
                            ? <p className="text-xs text-neutral-mid">{p.last ? `Last checked ${new Date(p.last.at).toLocaleDateString('en-GB')}: ${p.last.findings} ${p.last.findings === 1 ? 'passage' : 'passages'} found` : 'Ready to check'}</p>
                            : <p className="text-xs text-amber-700">Steps 1 to 4 to complete first</p>}
                        </div>
                        {p.last && <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${BAND_STYLE[p.last.band].pill}`}>{BAND_STYLE[p.last.band].label}</span>}
                        <ChevronDown size={14} className={`shrink-0 text-neutral-mid transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOpen && (
                        <div className="border-t border-gray-100 bg-neutral-light/40 px-5 py-4">
                          {!p.ready ? (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                              <p className="text-sm font-semibold text-amber-900">Steps 1, 2, 3 and 4 need completing for this policy first.</p>
                              <p className="mt-1 text-sm text-amber-900/80">Clarity and precision can be checked once each step has been run for this policy and has nothing open. Nothing can be run here until then.</p>
                              <ul className="mt-3 space-y-1.5">
                                {p.steps.map(x => (
                                  <li key={x.step} className="flex items-center gap-2 text-sm text-neutral-dark">
                                    {x.done ? <Check size={14} className="text-green-600" /> : <X size={14} className="text-red-600" />}
                                    <span className="font-medium">Step {x.step}: {x.label}</span><span className="text-neutral-mid">· {x.detail}</span>
                                  </li>
                                ))}
                              </ul>
                              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="mt-3 text-sm font-semibold text-purple-700 hover:underline">Go to steps 1 to 4 at the top of this page</button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm text-neutral-mid">{p.last ? `Last checked ${new Date(p.last.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.` : 'Not checked yet.'}</p>
                                <button onClick={() => run(p)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
                                  {busy === p.id ? <><Loader2 size={12} className="animate-spin" /> Reading…</> : <><FileSearch size={12} /> {p.last ? 'Check again' : 'Check clarity'}</>}
                                </button>
                              </div>
                              {res ? <ResultView result={res} /> : p.last ? <p className="mt-3 flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={13} className="animate-spin" /> Loading the last result</p> : null}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <button onClick={() => setShowAll(v => !v)} className="mt-2 text-xs font-semibold text-purple-700 hover:underline">{showAll ? 'Show only ready or checked policies' : `Show all ${policies.length} policies`}</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
