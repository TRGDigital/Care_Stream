'use client'

// How a paid policy was built, and what it might still be missing.
//
// The panel exists because "verified" was, for a while, a claim nobody could inspect. It
// is deliberately in two halves, and the halves are not interchangeable.
//
// WHAT WE USED is recorded fact, loaded with no model in the loop: the regulations the
// policy was written against, each required element with the judge's verdict, and the CQC
// quality statements those regulations carry. It answers "what happened".
//
// WHAT WE MIGHT HAVE MISSED is a second opinion, asked cold from the title alone and then
// diffed against what was actually used. It answers the question the first half structurally
// cannot: the coverage judge measures the policy against the mapping, so a short mapping
// passes and looks complete. Only something that never saw the mapping can catch that.
//
// The distinction is on the page, not just in this comment, because a reader who thinks the
// first half is assurance will be reassured by exactly the case that should worry them.

import { useEffect, useState } from 'react'
import {
  createPlatformClient,
  type PolicyProvenance, type PolicyChallenge, type ProvenanceRegulation,
} from '@/lib/platform-api'
import {
  Loader2, ShieldCheck, ShieldAlert, ScanSearch, ExternalLink, ChevronRight,
  BookOpen, AlertTriangle, CircleHelp, Landmark,
} from 'lucide-react'

const KEY_QUESTION: Record<string, string> = {
  safe: 'Safe', effective: 'Effective', caring: 'Caring',
  responsive: 'Responsive', 'well-led': 'Well-led', wellled: 'Well-led',
}

function ElementRow({ text, met }: { text: string; met: boolean | null }) {
  const icon = met === true
    ? <ShieldCheck size={13} className="mt-0.5 shrink-0 text-green-600" />
    : met === false
      ? <ShieldAlert size={13} className="mt-0.5 shrink-0 text-red-600" />
      : <CircleHelp size={13} className="mt-0.5 shrink-0 text-neutral-mid" />
  return (
    <li className="flex items-start gap-2 py-1">
      {icon}
      <span className={`text-xs leading-relaxed ${met === false ? 'text-red-800' : 'text-neutral-dark'}`}>{text}</span>
    </li>
  )
}

function RegulationCard({ r }: { r: ProvenanceRegulation }) {
  const [open, setOpen] = useState(false)
  const missing = r.required_elements.filter(e => e.met === false).length
  const unjudged = r.required_elements.filter(e => e.met === null).length
  const total = r.required_elements.length
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-neutral-light/30">
        <ChevronRight size={14} className={`mt-0.5 shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-90' : ''}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-sm font-semibold text-neutral-dark">{r.official_name}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              r.authority_basis === 'statutory' ? 'bg-indigo-50 text-indigo-700' : 'bg-neutral-light text-neutral-mid'}`}>
              {r.authority_basis === 'statutory' ? 'Statutory' : 'Guidance'}
            </span>
            {r.needs_update && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                <AlertTriangle size={9} /> Flagged for update
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-mid">
            {total} required element{total === 1 ? '' : 's'}
            {missing > 0 && <span className="font-semibold text-red-700"> · {missing} not addressed</span>}
            {unjudged > 0 && <span className="text-neutral-mid"> · {unjudged} not yet judged</span>}
            {missing === 0 && unjudged === 0 && total > 0 && <span className="font-semibold text-green-700"> · all addressed</span>}
          </p>
        </div>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3 py-3">
          {r.care_home_context && (
            <p className="mb-2 text-xs leading-relaxed text-neutral-dark">
              <span className="font-semibold">Why it matters here: </span>{r.care_home_context}
            </p>
          )}
          {r.practical_meaning && (
            <p className="mb-2 text-xs leading-relaxed text-neutral-mid">{r.practical_meaning}</p>
          )}
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-neutral-mid">What the policy must contain</p>
          <ul className="mb-2">
            {r.required_elements.map((e, i) => <ElementRow key={i} text={e.text} met={e.met} />)}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            {r.source_urls.slice(0, 3).map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal hover:underline">
                <ExternalLink size={10} /> Source
              </a>
            ))}
            <span className="text-[11px] text-neutral-mid">
              {r.last_reviewed_at
                ? `Reviewed ${new Date(r.last_reviewed_at).toLocaleDateString('en-GB')}`
                : 'Never reviewed'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export function PolicyProvenancePanel({ token, orderId }: { token: string; orderId: string }) {
  const [prov, setProv] = useState<PolicyProvenance | null>(null)
  const [challenge, setChallenge] = useState<PolicyChallenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let live = true
    setLoading(true); setError('')
    createPlatformClient(token).policyGaps.orderProvenance(orderId)
      .then(r => { if (live) setProv(r.provenance) })
      .catch(e => { if (live) setError(e?.message ?? 'Could not load the provenance.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token, orderId])

  async function runChallenge() {
    setRunning(true); setError('')
    try {
      const r = await createPlatformClient(token).policyGaps.challengeOrder(orderId)
      setChallenge(r.challenge)
    } catch (e: any) {
      setError(e?.message ?? 'Could not run the challenge.')
    } finally { setRunning(false) }
  }

  if (loading) {
    return <div className="flex items-center gap-2 px-5 py-6 text-sm text-neutral-mid">
      <Loader2 size={16} className="animate-spin text-teal" /> Loading how this policy was built…
    </div>
  }
  if (error && !prov) {
    return <div className="mx-5 my-4 rounded-md border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
  }
  if (!prov) return null

  const t = prov.element_totals
  const byQuestion = prov.quality_statements.reduce<Record<string, typeof prov.quality_statements>>((acc, q) => {
    const k = KEY_QUESTION[q.key_question] ?? q.key_question
    ;(acc[k] ||= []).push(q)
    return acc
  }, {})

  return (
    <div className="border-b border-gray-100 bg-neutral-light/20 px-5 py-4">

      {/* ── Half one: recorded fact ─────────────────────────────────────────── */}
      <div className="mb-1 flex items-center gap-2">
        <BookOpen size={14} className="text-teal" />
        <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-dark">What this policy was written against</h3>
      </div>
      <p className="mb-3 text-[11px] text-neutral-mid">
        Recorded, not generated: this is the actual input to the writer and the actual verdict of the checker.
      </p>

      {!prov.grounded ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="text-xs font-bold text-red-800">No regulations are mapped to this policy.</p>
          <p className="mt-0.5 text-xs text-red-700">
            It was written from its title alone, and its coverage cannot be assessed. Seed the
            catalogue, then write and verify it again before this is delivered.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-3 text-xs">
            <span className="text-neutral-dark"><span className="font-bold">{prov.regulations.length}</span> regulation{prov.regulations.length === 1 ? '' : 's'}</span>
            <span className="text-neutral-dark"><span className="font-bold">{t.total}</span> required elements</span>
            {t.met > 0 && <span className="font-semibold text-green-700">{t.met} addressed</span>}
            {t.missing > 0 && <span className="font-semibold text-red-700">{t.missing} not addressed</span>}
            {t.unjudged > 0 && <span className="text-neutral-mid">{t.unjudged} not yet judged</span>}
          </div>
          <div className="mb-4 space-y-2">
            {prov.regulations.map(r => <RegulationCard key={r.reference_key} r={r} />)}
          </div>

          {prov.quality_statements.length > 0 && (
            <>
              <div className="mb-1 flex items-center gap-2">
                <Landmark size={14} className="text-teal" />
                <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-dark">
                  CQC quality statements this policy serves
                </h3>
              </div>
              <p className="mb-2 text-[11px] text-neutral-mid">
                Reached through the regulations above, so these are the statements an inspector
                would assess this policy under.
              </p>
              <div className="mb-4 space-y-2">
                {Object.entries(byQuestion).map(([q, list]) => (
                  <div key={q} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-teal">{q}</p>
                    <ul className="mt-1 space-y-1">
                      {list.map(s => (
                        <li key={s.reference_key} className="text-xs text-neutral-dark">
                          <span className="font-semibold">{s.number}. {s.name}</span>
                          {s.we_statement && <span className="text-neutral-mid"> — &ldquo;{s.we_statement}&rdquo;</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Half two: the independent check ─────────────────────────────────── */}
      <div className="mb-1 flex items-center gap-2">
        <ScanSearch size={14} className="text-amber-700" />
        <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-dark">What we might have missed</h3>
      </div>
      <p className="mb-2 text-[11px] text-neutral-mid">
        The checker above can only measure this policy against the regulations we mapped to it,
        so a short mapping passes and looks complete. This asks the question cold, from the
        title alone, and compares the answer with what we actually used.
      </p>

      {!challenge ? (
        <button onClick={runChallenge} disabled={running}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60">
          {running ? <><Loader2 size={13} className="animate-spin" /> Asking…</> : <><ScanSearch size={13} /> Run the independent check</>}
        </button>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap gap-3 text-xs">
            <span className="font-semibold text-green-700">{challenge.summary.grounded} already covered</span>
            {challenge.summary.missing_from_mapping > 0 && (
              <span className="font-semibold text-red-700">{challenge.summary.missing_from_mapping} we hold but did not use</span>
            )}
            {challenge.summary.not_in_library > 0 && (
              <span className="font-semibold text-amber-800">{challenge.summary.not_in_library} not in our library</span>
            )}
          </div>
          <ul className="space-y-1.5">
            {challenge.items.map((i, n) => {
              const tone = i.status === 'grounded'
                ? { dot: 'bg-green-500', label: 'Used', cls: 'text-green-700' }
                : i.status === 'missing_from_mapping'
                  ? { dot: 'bg-red-500', label: 'Held, not used', cls: 'text-red-700' }
                  : { dot: 'bg-amber-500', label: 'Not in library', cls: 'text-amber-800' }
              return (
                <li key={n} className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-dark">
                      {i.name}
                      <span className={`ml-1.5 text-[10px] font-bold uppercase tracking-wide ${tone.cls}`}>{tone.label}</span>
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-neutral-mid">{i.basis}</span>
                    </p>
                    {i.why && <p className="mt-0.5 text-xs leading-relaxed text-neutral-mid">{i.why}</p>}
                  </div>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[11px] text-neutral-mid">
            Asked {new Date(challenge.ran_at).toLocaleString('en-GB')}. A second opinion, not a
            verdict: judge each one on whether the policy genuinely needs it.
          </p>
        </>
      )}

      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  )
}
