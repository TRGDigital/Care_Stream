'use client'

import { useEffect, useRef, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import { X, Loader2, CheckCircle2, Plus, FileText, Sparkles, Mail, Scale, FilePlus2, GraduationCap } from 'lucide-react'

type Detail = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['gapDetail']>>

// Build a whitespace-tolerant, case-insensitive regex from a quoted sentence.
function quoteToRegex(q: string): RegExp | null {
  const words = q.trim().split(/\s+/).filter(Boolean)
  if (words.length < 3) return null
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  try { return new RegExp(escaped.join('\\s+'), 'i') } catch { return null }
}

// Wrap matched quotes in <mark> within the rendered preview — text nodes only, so
// tags are never broken. Cross-node matches simply don't highlight (graceful).
function highlightQuotes(root: HTMLElement, quotes: string[]) {
  const regexes = quotes.map(quoteToRegex).filter((r): r is RegExp => !!r)
  if (!regexes.length) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  for (const node of nodes) {
    const raw = node.nodeValue ?? ''
    if (raw.trim().length < 8) continue
    for (const re of regexes) {
      const m = re.exec(raw)
      if (!m) continue
      const before = raw.slice(0, m.index)
      const after  = raw.slice(m.index + m[0].length)
      const frag = document.createDocumentFragment()
      if (before) frag.appendChild(document.createTextNode(before))
      const mark = document.createElement('mark')
      mark.className = 'bg-yellow-200 rounded px-0.5'
      mark.textContent = m[0]
      frag.appendChild(mark)
      if (after) frag.appendChild(document.createTextNode(after))
      node.parentNode?.replaceChild(frag, node)
      break
    }
  }
}

export function GapDetailModal({ token, referenceKey, officialName, acknowledged, disclaimer, onAcknowledged, onClose, onVerdictCovered }: {
  token:            string
  referenceKey:     string
  officialName:     string
  acknowledged:     boolean
  disclaimer:       string
  onAcknowledged:   () => void
  onClose:          () => void
  onVerdictCovered: (referenceKey: string) => void
}) {
  const [detail,  setDetail]  = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState<'add' | 'coverage'>('add')
  // Legal disclaimer gate — the detail is only fetched once accepted.
  const [accepted, setAccepted] = useState(acknowledged)
  const [accepting, setAccepting] = useState(false)

  async function acceptDisclaimer() {
    setAccepting(true)
    try {
      await createApiClient(token).analytics.acknowledgeRemediation()
      onAcknowledged()
      setAccepted(true)
    } catch {
      setAccepted(true)   // don't hard-block on a failed record; proceed
    } finally {
      setAccepting(false)
    }
  }

  // Coverage tab (policy preview + highlight) — loaded lazily.
  const [html,        setHtml]        = useState<string | null>(null)
  const [previewErr,  setPreviewErr]  = useState('')
  const [previewLoad, setPreviewLoad] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  // Ad-hoc training module generation.
  const [modLoad, setModLoad] = useState(false)
  const [modDone, setModDone] = useState<{ name: string } | null>(null)
  const [modErr,  setModErr]  = useState('')

  async function generateModule() {
    setModLoad(true); setModErr('')
    try {
      const { module } = await createApiClient(token).analytics.gapTrainingModule(referenceKey)
      setModDone({ name: module.name })
    } catch (e: any) {
      setModErr(e.message ?? 'Could not generate the module.')
    } finally {
      setModLoad(false)
    }
  }

  useEffect(() => {
    if (!accepted) return   // don't fetch the remediation detail until the disclaimer is accepted
    let live = true
    createApiClient(token).analytics.gapDetail(referenceKey)
      .then(d => { if (!live) return; setDetail(d); if (d.effective_status === 'covered') onVerdictCovered(referenceKey) })
      .catch(e => { if (live) setError(e.message ?? 'Could not build the detail.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [token, referenceKey, accepted]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load the evidence policy preview when the Coverage tab is first opened.
  useEffect(() => {
    if (tab !== 'coverage' || !detail?.evidence_policy || html !== null || previewLoad) return
    setPreviewLoad(true)
    createApiClient(token).policies.preview(detail.evidence_policy.id)
      .then(d => setHtml(d.html || ''))
      .catch(e => setPreviewErr(e.message ?? 'Could not load the policy.'))
      .finally(() => setPreviewLoad(false))
  }, [tab, detail, html, previewLoad, token])

  // Apply highlights after the preview HTML paints.
  useEffect(() => {
    if (tab !== 'coverage' || !html || !previewRef.current || !detail) return
    highlightQuotes(previewRef.current, detail.covered_quotes)
  }, [tab, html, detail])

  const missing = detail?.requirements.filter(r => r.status === 'missing') ?? []
  const covered = detail?.requirements.filter(r => r.status === 'already_covered') ?? []
  const mailto = `mailto:hello@carestreamai.com?subject=${encodeURIComponent('Policy authoring request: ' + officialName)}&body=${encodeURIComponent(`We would like CareStream to write and supply a policy that covers ${officialName}.`)}`

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-card bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-teal">Coverage detail</p>
            <h2 className="mt-0.5 text-lg font-bold text-neutral-dark">{officialName}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
        </div>

        {!accepted ? (
          <div className="px-6 py-6">
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
              <Scale size={20} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="mb-1.5 text-sm font-bold text-amber-900">Before you use these recommendations</p>
                <p className="text-sm leading-relaxed text-amber-800">{disclaimer}</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-neutral-mid">By continuing, you confirm you understand this and accept responsibility for reviewing, adapting and approving any changes, and for having them checked by a qualified specialist where appropriate. We record this acknowledgement once, with your name and the date.</p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={onClose} className="rounded-btn border border-gray-300 px-4 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light">Cancel</button>
              <button onClick={acceptDisclaimer} disabled={accepting}
                className="inline-flex items-center justify-center gap-1.5 rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
                {accepting ? <><Loader2 size={14} className="animate-spin" /> Recording…</> : 'I understand and accept'}
              </button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16">
            <Loader2 size={26} className="animate-spin text-teal" />
            <p className="text-sm text-neutral-mid">Loading recommendations…</p>
          </div>
        ) : error ? (
          <div className="m-6 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : detail ? (
          <>
            {/* Verdict correction banner */}
            {detail.effective_status === 'covered' && (
              <div className="mx-6 mt-5 flex items-start gap-3 rounded-lg border border-green-100 bg-green-50 px-4 py-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Actually covered across your library</p>
                  <p className="text-xs text-green-700">On a closer read, every requirement of this regulation is already addressed in your policies, so there is nothing to add. We have updated the coverage result.</p>
                </div>
              </div>
            )}

            {/* Tabs (Coverage tab only when there is an evidence policy to open) */}
            {detail.evidence_policy && (
              <div className="flex gap-1 px-6 pt-4">
                <button onClick={() => setTab('add')} className={`rounded-t-md px-3 py-2 text-sm font-medium ${tab === 'add' ? 'bg-neutral-light text-neutral-dark' : 'text-neutral-mid hover:text-neutral-dark'}`}>What to add</button>
                <button onClick={() => setTab('coverage')} className={`rounded-t-md px-3 py-2 text-sm font-medium ${tab === 'coverage' ? 'bg-neutral-light text-neutral-dark' : 'text-neutral-mid hover:text-neutral-dark'}`}>Where it&rsquo;s covered</button>
              </div>
            )}

            <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
              {tab === 'add' ? (
                <div className="space-y-5">
                  {/* Legal basis + where to add */}
                  <div className="space-y-2">
                    <div className={`flex items-start gap-2 rounded-lg border px-4 py-2.5 ${detail.authority_basis === 'statutory' ? 'border-rose-200 bg-rose-50' : 'border-sky-200 bg-sky-50'}`}>
                      <Scale size={16} className={`mt-0.5 shrink-0 ${detail.authority_basis === 'statutory' ? 'text-rose-600' : 'text-sky-600'}`} />
                      <div className="min-w-0 text-sm">
                        <p className={`font-semibold ${detail.authority_basis === 'statutory' ? 'text-rose-800' : 'text-sky-800'}`}>
                          {detail.authority_basis === 'statutory' ? 'Legally required in your policies' : 'Advised — good practice'}
                        </p>
                        <p className={detail.authority_basis === 'statutory' ? 'text-rose-700' : 'text-sky-700'}>
                          {detail.authority_basis === 'statutory' ? 'Required by' : 'Recommended by'} {detail.official_name}.
                          {detail.source_urls.map((u, i) => (
                            <span key={u}>{i === 0 ? ' ' : ', '}<a href={u} target="_blank" rel="noopener noreferrer" className="underline hover:no-underline">source{detail.source_urls.length > 1 ? ` ${i + 1}` : ''}</a></span>
                          ))}
                        </p>
                      </div>
                    </div>
                    {(detail.target_policy || detail.suggested_new_policy_title) && detail.effective_status !== 'covered' && (
                      <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-neutral-light/40 px-4 py-2.5 text-sm">
                        {detail.target_policy ? <FileText size={15} className="mt-0.5 shrink-0 text-teal" /> : <FilePlus2 size={15} className="mt-0.5 shrink-0 text-teal" />}
                        <p className="text-neutral-dark">
                          {detail.target_policy
                            ? <>Add the wording below to your <span className="font-semibold">{detail.target_policy.name}</span> policy.</>
                            : <>You don&rsquo;t have a matching policy yet — you&rsquo;ll need a new <span className="font-semibold">{detail.suggested_new_policy_title}</span>.</>}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Missing requirements + suggested wording */}
                  {missing.length > 0 && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Plus size={15} className="text-amber-600" /> What to add ({missing.length})</p>
                      {missing.map((r, i) => (
                        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                          <p className="text-sm font-medium text-neutral-dark">{r.requirement}</p>
                          {r.suggested_addition && (
                            <div className="mt-2 rounded-md border border-amber-100 bg-white px-3 py-2.5">
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">Example wording</p>
                              <p className="text-sm leading-relaxed text-neutral-dark">{r.suggested_addition}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Already covered (in this policy or elsewhere) */}
                  {covered.length > 0 && (
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><CheckCircle2 size={15} className="text-green-600" /> Already covered ({covered.length})</p>
                      {covered.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50/50 px-4 py-2.5">
                          <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-500" />
                          <div className="min-w-0">
                            <p className="text-sm text-neutral-dark">{r.requirement}</p>
                            {r.already_covered_in && <p className="text-xs text-green-700">In your <span className="font-medium">{r.already_covered_in}</span> policy</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {missing.length === 0 && covered.length === 0 && (
                    <p className="text-sm text-neutral-mid">No specific requirements could be extracted for this regulation.</p>
                  )}

                  {/* Paid-authoring CTA */}
                  {missing.length > 0 && (
                    <div className="flex flex-col items-start gap-2 rounded-lg border border-teal/20 bg-teal-light/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-2">
                        <Sparkles size={16} className="mt-0.5 shrink-0 text-teal" />
                        <p className="text-sm text-neutral-dark">Prefer it done for you? CareStream can write and supply a compliant policy for this regulation.</p>
                      </div>
                      <a href={mailto} className="inline-flex shrink-0 items-center gap-1.5 rounded-btn bg-teal px-3 py-2 text-sm font-medium text-white hover:bg-teal-dark">
                        <Mail size={14} /> Request this policy
                      </a>
                    </div>
                  )}

                  {/* Turn the additions into staff training */}
                  {missing.length > 0 && (
                    modDone ? (
                      <div className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
                        <p className="text-green-800">Drafted <span className="font-semibold">{modDone.name}</span>. Review and publish it in <a href="/training" className="underline hover:no-underline">Training</a> before it reaches staff.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-2 rounded-lg border border-indigo-200 bg-indigo-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2">
                          <GraduationCap size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                          <p className="text-sm text-neutral-dark">Once you&rsquo;ve added this to your policy, turn it into a short training module so staff learn it.</p>
                        </div>
                        <button onClick={generateModule} disabled={modLoad}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-btn bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                          {modLoad ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate training module</>}
                        </button>
                      </div>
                    )
                  )}
                  {modErr && <p className="text-xs text-red-600">{modErr}</p>}

                  <p className="border-t border-gray-100 pt-3 text-xs italic text-neutral-mid">{detail.disclaimer}</p>
                </div>
              ) : (
                // Coverage tab: the evidence policy, with covered passages highlighted.
                <div>
                  {detail.evidence_policy && (
                    <p className="mb-3 flex items-center gap-1.5 text-sm text-neutral-mid"><FileText size={13} className="text-teal" /> Passages in <span className="font-medium text-neutral-dark">{detail.evidence_policy.name}</span> that address this regulation are highlighted.</p>
                  )}
                  {previewLoad ? (
                    <div className="flex items-center gap-2 py-10 text-sm text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading policy…</div>
                  ) : previewErr ? (
                    <div className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{previewErr}</div>
                  ) : html ? (
                    <div ref={previewRef} className="policy-content prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
                  ) : (
                    <p className="text-sm text-neutral-mid">This policy isn&rsquo;t ready to preview yet.</p>
                  )}

                  {/* Fallback list of matched passages (source of truth if inline highlight misses). */}
                  {detail.covered_quotes.length > 0 && (
                    <div className="mt-5 border-t border-gray-100 pt-4">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-mid">Matched passages</p>
                      <ul className="space-y-1.5">
                        {detail.covered_quotes.map((q, i) => (
                          <li key={i} className="rounded bg-yellow-100 px-2.5 py-1.5 text-xs text-neutral-dark">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
