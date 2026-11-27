'use client'

// Policy testing (pilot: account CS-1001 only). Pick a policy, pick a situation, and see whether the policy says what staff need to do.
// The result quotes the policy's own words. It judges what the policy says, never the quality of anyone's care.

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, FlaskConical, ChevronDown, Check, AlertTriangle, X } from 'lucide-react'
import { WordingReviewModal } from '@/components/admin/wording-review-modal'
import { Wand2 } from 'lucide-react'
import { stress, useStressMeta, type StressPolicy, type StressResult } from '@/lib/stress-client'

const BADGE = {
  covered: { label: 'Covered', cls: 'bg-green-50 text-green-700 border-green-200', Icon: Check },
  partly:  { label: 'Partly',  cls: 'bg-amber-50 text-amber-800 border-amber-200', Icon: AlertTriangle },
  missing: { label: 'Missing', cls: 'bg-red-50 text-red-700 border-red-200', Icon: X },
} as const

export default function StressTestingPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const { enabled } = useStressMeta()
  const [policies, setPolicies] = useState<StressPolicy[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [result, setResult] = useState<StressResult | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [adoptedCount, setAdoptedCount] = useState(0)
  useEffect(() => { setAdoptedCount(0); setReviewing(false) }, [result?.id])

  const load = useCallback(async () => {
    if (!token) return
    try { setPolicies((await stress.library(token)).policies) } catch (e: any) { setError(e.message) }
  }, [token])
  useEffect(() => { if (enabled) void load() }, [enabled, load])

  // Arriving from a policy's health row (?policy=<id>): that policy opens and its latest result is shown.
  const [focusDone, setFocusDone] = useState(false)
  useEffect(() => {
    if (!policies || focusDone || !token) return
    setFocusDone(true)
    let id: string | null = null
    try { id = new URLSearchParams(window.location.search).get('policy') } catch { /* ignore */ }
    const p = id ? policies.find(x => x.id === id) : null
    if (!p) return
    setOpen(p.id)
    const latest = p.scenarios.filter(s => s.last).sort((a, b) => b.last!.at.localeCompare(a.last!.at))[0]
    if (latest?.last) void view(latest.last.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policies, focusDone, token])

  async function run(policyId: string, scenarioId: string) {
    if (!token) return
    setBusy(`${policyId}:${scenarioId}`); setError('')
    try { setResult((await stress.run(token, policyId, scenarioId)).result); await load() } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }
  async function view(id: string) {
    if (!token) return
    setBusy('view' + id); setError('')
    try { setResult((await stress.result(token, id)).result) } catch (e: any) { setError(e.message) } finally { setBusy('') }
  }

  if (enabled === null || !token) return <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading</p>
  if (!enabled) return <p className="text-sm text-neutral-mid">Policy testing is not switched on for this account.</p>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-neutral-dark"><FlaskConical size={22} className="text-purple-600" /> Policy testing</h1>
        <p className="mt-1 max-w-3xl text-sm text-neutral-mid">
          Test a policy against a real situation, such as a resident found on the floor overnight. Each test checks whether your policy tells staff what to do, point by point, and quotes your own words.
          It judges what the policy says, not the care your team gives. This is a pilot on your account.
        </p>
        {error && <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div>

      {!policies ? <p className="flex items-center gap-2 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading your policies</p>
        : policies.length === 0 ? <p className="rounded-xl border border-gray-200 bg-white px-5 py-6 text-sm text-neutral-mid">No situation is ready to test against your policies yet. A situation appears here once it has been approved on the platform (Policy Testing in the platform console) and one of your policies is of that type, for example a falls policy for a falls situation.</p>
        : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {policies.map(p => (
            <div key={p.id}>
              <button type="button" onClick={() => setOpen(open === p.id ? null : p.id)} className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-neutral-light/50">
                <span><span className="text-sm font-semibold text-neutral-dark">{p.name}</span> <span className="text-xs text-neutral-mid">{p.scenarios.length} {p.scenarios.length === 1 ? 'situation' : 'situations'} to test</span></span>
                <ChevronDown size={15} className={open === p.id ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {open === p.id && (
                <ul className="space-y-2 bg-neutral-light/40 px-5 py-3">
                  {p.scenarios.map(s => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-dark">{s.title}</p>
                        {s.last
                          ? <p className="text-xs text-neutral-mid">Last tested {new Date(s.last.at).toLocaleDateString('en-GB')}: {s.last.gaps === 0 ? 'nothing missing from your library' : `${s.last.gaps} not covered anywhere in your library`}{s.last.outdated ? ' (the situation has been updated since, test again)' : ''}</p>
                          : <p className="text-xs text-neutral-mid">Not tested yet</p>}
                      </div>
                      <div className="flex gap-2">
                        {s.last && <button onClick={() => view(s.last!.id)} disabled={!!busy} className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-50">See result</button>}
                        <button onClick={() => run(p.id, s.id)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
                          {busy === `${p.id}:${s.id}` ? <><Loader2 size={12} className="animate-spin" /> Testing…</> : s.last ? 'Test again' : 'Run test'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {result && (
        <div className="rounded-xl border border-purple-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-purple-700">Result</p>
              <h2 className="text-lg font-bold text-neutral-dark">{result.policy_name}</h2>
              <p className="text-sm text-neutral-mid">{result.scenario_title}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold ${result.gaps === 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'}`}>{result.gaps === 0 ? 'Nothing missing from your library' : `${result.gaps} not covered anywhere`}</span>
          </div>
          {result.summary && <p className="mt-3 text-sm text-neutral-dark">{result.summary}</p>}
          {(() => {
            const notHere = result.points.filter(p => p.verdict !== 'covered'), elsewhere = notHere.filter(p => (p.elsewhere ?? []).some(e => e.verdict === 'covered'))
            return notHere.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-lg bg-neutral-light px-3 py-2 text-xs"><b className="block text-base text-neutral-dark">{result.points.length - notHere.length} of {result.points.length}</b>covered in this policy</div>
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs"><b className="block text-base text-blue-800">{elsewhere.length}</b>not here, but covered in another policy</div>
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs"><b className="block text-base text-amber-800">{result.gaps}</b>not covered anywhere in your library</div>
              </div>
            ) : null
          })()}
          <ul className="mt-4 space-y-3">
            {result.points.map(pt => {
              const b = BADGE[pt.verdict]
              return (
                <li key={pt.id} className="rounded-lg border border-gray-100 p-3">
                  <div className="flex flex-wrap items-start gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${b.cls}`}><b.Icon size={11} /> {b.label}</span>
                    <p className="min-w-0 flex-1 text-sm font-medium text-neutral-dark">{pt.text}</p>
                  </div>
                  {pt.note && <p className="mt-1.5 text-xs text-neutral-mid">{pt.note}</p>}
                  {pt.quote && <blockquote className="mt-1.5 border-l-2 border-gray-200 pl-3 text-xs italic text-neutral-mid">&ldquo;{pt.quote}&rdquo;</blockquote>}
                  {(pt.elsewhere ?? []).length > 0 && (
                    <div className="mt-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-neutral-dark">
                      <span className="font-semibold text-blue-800">{pt.elsewhere!.some(e => e.verdict === 'covered') ? 'Covered in another policy: ' : 'Partly covered in another policy: '}</span>
                      {pt.elsewhere!.map(e => e.policy_name).filter((n, i, a) => a.indexOf(n) === i).join(', ')}
                      <blockquote className="mt-1 border-l-2 border-blue-200 pl-2 italic text-neutral-mid">&ldquo;{pt.elsewhere![0].quote}&rdquo;</blockquote>
                      <span className="mt-1 block text-neutral-mid">You may want this policy to refer to it, so staff using only this policy are pointed to the right place.</span>
                    </div>
                  )}
                  {pt.suggested_wording && <div className="mt-2 rounded-md bg-purple-50 px-3 py-2 text-xs text-neutral-dark"><span className="font-semibold text-purple-700">Suggested wording to review: </span>{pt.suggested_wording}</div>}
                  <p className="mt-1.5 text-[11px] text-neutral-mid">{pt.source_url ? <a href={pt.source_url} target="_blank" rel="noopener noreferrer" className="underline">{pt.source_label}</a> : pt.source_label}</p>
                </li>
              )
            })}
          </ul>
          {(() => {
            const alignments = result.points.filter(p => p.verdict !== 'covered' && p.suggested_wording).map(p => ({
              focus: `${p.text}${(p.elsewhere ?? []).length ? ` (also in ${p.elsewhere![0].policy_name})` : ''}`,
              placement: (p.verdict === 'partly' && p.quote ? 'amend' : 'new_section') as 'amend' | 'new_section',
              anchor: p.verdict === 'partly' ? p.quote : '', section_title: p.verdict === 'partly' && p.quote ? '' : p.text.slice(0, 70).replace(/[.:;,]+$/, ''), wording: p.suggested_wording, ref: `testing:${result.scenario_id}:${p.id}`,
            }))
            return alignments.length > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-3">
                <p className="text-sm text-neutral-dark">{alignments.length} {alignments.length === 1 ? 'point has' : 'points have'} wording ready to review next to the policy, and each can be adopted into your draft.{adoptedCount > 0 ? ` ${adoptedCount} adopted so far. Run the test again to confirm the gaps are closed.` : ''}</p>
                <button onClick={() => setReviewing(true)} className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30"><Wand2 size={13} /> Review &amp; resolve</button>
                {reviewing && <WordingReviewModal variant="testing" token={token!} policyId={result.policy_id} policyName={result.policy_name} statements={[]} alignments={alignments} onClose={() => setReviewing(false)} onAdopted={() => setAdoptedCount(n => n + 1)} />}
              </div>
            ) : null
          })()}
          <p className="mt-4 text-xs text-neutral-mid">This tests what your policy says. It does not judge the care your team gives, and it is not a compliance rating. Review any suggested wording before you use it.</p>
        </div>
      )}
    </div>
  )
}
