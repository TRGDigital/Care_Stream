'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { UpgradePanel } from '@/components/admin/upgrade-gate'
import { GapDetailModal } from '@/components/admin/gap-detail-modal'
import { PolicyLintModal } from '@/components/admin/policy-lint-modal'
import { ConflictModal } from '@/components/admin/conflict-modal'
import { CheckCircle2, ChevronDown, FileQuestion, Info, Loader2, RefreshCw, ShieldAlert, Sparkles, TrendingUp, Wand2, FileClock } from 'lucide-react'

type GapsData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['gaps']>>

function fmtWhen(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function HelpAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-teal/20 bg-teal-light/20">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-teal-light/40"
      >
        <Info size={13} className="shrink-0 text-teal" />
        <span className="flex-1 text-xs font-semibold text-teal">{title}</span>
        <ChevronDown size={13} className={`shrink-0 text-teal transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-teal/10 px-4 py-3 text-xs leading-relaxed text-neutral-mid">
          {children}
        </div>
      )}
    </div>
  )
}

export default function GapsPage() {
  const { data: session } = useSession()
  const { features, loading: planLoading } = usePlanFeatures()
  const locked = !!features && !features.has_gap_detection
  const userId = session?.user?.email ?? 'guest'
  const [data,    setData]    = useState<GapsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [analysing, setAnalysing] = useState(false)
  const [analyseProgress, setAnalyseProgress] = useState<{ done: number; total: number } | null>(null)
  // Deep-dive modal + client-side verdict corrections (reg keys the drill-in found covered).
  const [detailReg, setDetailReg] = useState<{ reference_key: string; official_name: string } | null>(null)
  const [correctedToCovered, setCorrectedToCovered] = useState<Set<string>>(new Set())
  const [ackOverride, setAckOverride] = useState(false)   // set true once the disclaimer is accepted this session
  const [completedOverride, setCompletedOverride] = useState<Set<string>>(new Set())  // marked completed this session
  const [showArchive, setShowArchive] = useState(false)
  const [showCoverage, setShowCoverage] = useState(false)

  async function reopenGap(referenceKey: string) {
    setCompletedOverride(prev => { const n = new Set(prev); n.delete(referenceKey); return n })
    if (session?.accessToken) {
      await createApiClient(session.accessToken).analytics.reopenGap(referenceKey).catch(() => {})
      load()
    }
  }
  // "Regulation updated" alerts — dismissed ids + per-alert training generation state.
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [alertTraining, setAlertTraining] = useState<Record<string, 'loading' | 'done'>>({})

  async function dismissAlert(id: string) {
    setDismissedAlerts(prev => new Set(prev).add(id))
    if (session?.accessToken) createApiClient(session.accessToken).analytics.dismissGapAlert(id).catch(() => {})
  }

  async function trainOnAlert(referenceKey: string) {
    if (!session?.accessToken) return
    setAlertTraining(p => ({ ...p, [referenceKey]: 'loading' }))
    try {
      await createApiClient(session.accessToken).analytics.gapTrainingModule(referenceKey)
      setAlertTraining(p => ({ ...p, [referenceKey]: 'done' }))
    } catch {
      setAlertTraining(p => { const n = { ...p }; delete n[referenceKey]; return n })
    }
  }

  // Hydrate from the persistent (localStorage) cache after mount — never during
  // render, to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    const cached = persistentCache.get<GapsData>(`admin-gaps-${userId}`)
    if (cached) { setData(cached); setLoading(false) }
  }, [userId])

  const load = useCallback(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).analytics.gaps()
      .then(d => { setData(d); persistentCache.set(`admin-gaps-${userId}`, d) })
      .catch((e: any) => setError(e.message ?? 'Failed to load gap analysis'))
      .finally(() => setLoading(false))
  }, [session?.accessToken, userId])

  // Only call the (plan-gated) gaps API once we know the plan includes gap
  // detection — otherwise a locked tenant briefly sees the API's raw
  // "not included" error before the upgrade panel renders.
  useEffect(() => {
    if (planLoading) return          // plan unknown yet — wait
    if (locked) { setLoading(false); return }
    load()
  }, [planLoading, locked, load])

  // Run the analysis in batches so no single request is held open for minutes. The
  // per-regulation matching is deliberately thorough (semantic floor + requirements
  // grounding + adversarial confirm), so the whole run can take a few minutes — we
  // show live progress and let each batch return promptly. Details warm afterwards.
  async function runAnalysis() {
    if (!session?.accessToken) return
    setAnalysing(true); setError(''); setAnalyseProgress(null)
    const api = createApiClient(session.accessToken)
    try {
      const { total } = await api.analytics.analyseGapsStart()
      setAnalyseProgress({ done: 0, total })
      for (let i = 0; i < 200; i++) {   // guard; each batch does ~12 regulations
        const p = await api.analytics.analyseGapsBatch()
        setAnalyseProgress({ done: p.analysed, total: p.total })
        if (p.remaining <= 0) break
      }
      load()
      // Deep-dive "what to add" detail is generated LAZILY, only when a gap is opened
      // (then cached). We deliberately do NOT pre-generate every gap here: that was ~5
      // Sonnet calls per gap across all gaps on every re-run, which burned credits for
      // gaps the tenant never opened. Now the coverage run is the only cost of re-running,
      // and the expensive detail is paid for only when a tenant actually views a gap.
    } catch (e: any) {
      setError(e.message ?? 'Coverage analysis failed — please try again.')
    } finally {
      setAnalysing(false); setAnalyseProgress(null)
    }
  }

  // Policy gap detection is a Professional+ feature. While the plan is still
  // loading, show a skeleton (never the raw API error); once known, show the
  // upgrade prompt for locked tenants.
  if (locked) {
    return (
      <UpgradePanel
        title="Policy gap analysis"
        description="See which CQC regulations your policies cover, where the gaps are, and the unmatched questions your staff are asking. Available on the Professional and Enterprise plans."
        tier="Professional"
      />
    )
  }

  // Only show the skeleton when we have nothing cached to render. If the persistent cache
  // hydrated data, show it immediately (and refresh in the background) rather than blocking
  // on the plan-features fetch — so the page loads instantly like the other cached pages.
  if ((planLoading || loading) && !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 animate-pulse rounded-card bg-gray-100" />)}
        </div>
        <div className="h-64 animate-pulse rounded-card bg-gray-100" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-card border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!data) return null

  // Hide items that are corrected-to-covered (drill-in) or marked completed (archived).
  const completedKeys = new Set<string>([...data.completed_keys, ...completedOverride])
  const hidden = (k: string) => correctedToCovered.has(k) || completedKeys.has(k)
  const gapRegs     = data.regulation_gaps.filter(r => r.status === 'gap' && !hidden(r.reference_key))
  const partialRegs = data.regulation_gaps.filter(r => r.status === 'partial' && !hidden(r.reference_key))
  const coveredRegs = data.regulation_gaps.filter(r => r.status === 'covered')
  const archived    = data.completed_gaps.filter(g => completedKeys.has(g.reference_key))
  const score       = data.coverage_score

  const scoreColour =
    score == null  ? 'text-neutral-mid' :
    score >= 80    ? 'text-green-600' :
    score >= 50    ? 'text-amber-600' :
    'text-red-600'

  const scoreBg =
    score == null  ? 'bg-gray-50 border-gray-100' :
    score >= 80    ? 'bg-green-50 border-green-100' :
    score >= 50    ? 'bg-amber-50 border-amber-100' :
    'bg-red-50 border-red-100'

  const analysedWhen = fmtWhen(data.analysed_at)

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Policy Gap Detection</h1>
          <p className="mt-1 text-sm text-neutral-mid">
            Regulation coverage is checked against the actual content of your policies, plus staff questions that went unanswered.
          </p>
          {analysedWhen && <p className="mt-1 text-xs text-neutral-mid">Coverage last analysed {analysedWhen}</p>}
        </div>
        <button onClick={runAnalysis} disabled={analysing}
          className="flex shrink-0 items-center gap-2 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
          {analysing
            ? <><Loader2 size={15} className="animate-spin" /> {analyseProgress && analyseProgress.total > 0 ? `Analysing… ${analyseProgress.done}/${analyseProgress.total}` : 'Analysing…'}</>
            : <><RefreshCw size={15} /> {data.analysed ? 'Re-run analysis' : 'Run coverage analysis'}</>}
        </button>
      </div>

      <HelpAccordion title="How Policy Gap Detection works">
        <p><strong className="text-neutral-dark">What this page is for</strong> — it shows where your policies may not meet the regulations that apply to a registered care setting, and what staff are asking that your policies don&apos;t answer. Use it to find and close gaps before a CQC inspection.</p>
        <p><strong className="text-neutral-dark">Coverage is read from your policy content, not titles</strong> — for each regulation, CareStream finds the most relevant passages across <em>all</em> your uploaded policies (using the same search that powers the staff chat) and an AI auditor judges, from that content alone, whether your policies substantively address it. So a regulation is only flagged when your documents genuinely don&apos;t cover it — not just because no policy happens to be named after it.</p>
        <p><strong className="text-neutral-dark">The three results</strong> — <strong className="text-green-600">Covered</strong>: a policy clearly addresses it (the evidence policy is named). <strong className="text-amber-700">Partial</strong>: it&apos;s touched on but incomplete — the policy that partly covers it is named. <strong className="text-red-600">Gap</strong>: nothing in your policies addresses it.</p>
        <p><strong className="text-neutral-dark">Running it</strong> — click <strong className="text-neutral-dark">Run coverage analysis</strong> to check all regulations. It reads through your policies (about a minute), then quietly prepares each &ldquo;what to add&rdquo; recommendation in the background so drill-ins open instantly. You can start reviewing gaps straight away. <strong className="text-neutral-dark">Re-run it whenever you upload or update policies</strong> to refresh the picture.</p>
        <p><strong className="text-neutral-dark">Unanswered questions</strong> — separately, this page clusters questions staff asked (in chat, email or by voice) that the assistant couldn&apos;t answer from your policies over the last 90 days. Recurring themes are real-world evidence of a missing or unclear policy.</p>
        <p><strong className="text-neutral-dark">Coverage score</strong> — the headline percentage counts fully-covered regulations, plus partials at half weight, out of the total. It only appears once you&apos;ve run the analysis.</p>
      </HelpAccordion>

      {/* Prompt to run the (content-based) analysis if it's never been run */}
      {!data.analysed && (
        <div className="mb-8 flex items-start gap-3 rounded-card border border-teal/20 bg-teal-light/20 px-6 py-5">
          <Sparkles size={20} className="mt-0.5 shrink-0 text-teal" />
          <div>
            <p className="font-semibold text-neutral-dark">Run a coverage analysis to check your regulation gaps</p>
            <p className="mt-0.5 text-sm text-neutral-mid">CareStream reads inside your uploaded policies and judges each regulation against their actual content — not just policy titles. This takes about a minute; your recommendations then prepare in the background.</p>
          </div>
        </div>
      )}

      {/* Headline metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`rounded-card border px-6 py-5 ${scoreBg}`}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-mid">Coverage score</p>
          <p className={`text-4xl font-extrabold ${scoreColour}`}>{score == null ? '—' : `${score}%`}</p>
          <p className="mt-1 text-xs text-neutral-mid">
            {data.analysed ? `${coveredRegs.length} fully · ${partialRegs.length} partial · ${gapRegs.length} gaps of ${data.meta.regulations_total}` : 'Not yet analysed'}
          </p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white px-6 py-5 shadow-card">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-mid">Unanswered questions</p>
          <p className="text-4xl font-extrabold text-neutral-dark">{data.meta.no_match_total}</p>
          <p className="mt-1 text-xs text-neutral-mid">In the last {data.meta.days_analysed} days</p>
        </div>

        <div className="rounded-card border border-gray-100 bg-white px-6 py-5 shadow-card">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-mid">Regulation gaps</p>
          <p className="text-4xl font-extrabold text-neutral-dark">{data.analysed ? gapRegs.length : '—'}</p>
          <p className="mt-1 text-xs text-neutral-mid">Not addressed by any policy</p>
        </div>
      </div>

      {/* ── Regulation coverage — full width ─────────────────────────────── */}
      <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
        <button onClick={() => setShowCoverage(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
          <ShieldAlert size={16} className="shrink-0 text-red-500" />
          <h2 className="flex-1 text-sm font-semibold text-neutral-dark">Regulation coverage{data.analysed && (gapRegs.length + partialRegs.length) > 0 && <span className="ml-1.5 font-normal text-neutral-mid">({gapRegs.length + partialRegs.length})</span>}</h2>
          <ChevronDown size={15} className={`shrink-0 text-neutral-mid transition-transform ${showCoverage ? 'rotate-180' : ''}`} />
        </button>

        {showCoverage && (!data.analysed ? (
          <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-8">
            <Sparkles size={18} className="shrink-0 text-teal" />
            <p className="text-sm text-neutral-mid">Run a coverage analysis to check each regulation against the content of your policies.</p>
          </div>
        ) : (
          <div className="border-t border-gray-100">
            <div className="divide-y divide-gray-50">
              {gapRegs.length === 0 && partialRegs.length === 0 ? (
                <div className="flex items-center gap-3 px-6 py-5">
                  <CheckCircle2 size={18} className="text-green-500" />
                  <p className="text-sm text-neutral-mid">Every regulation is addressed by your policies — well done.</p>
                </div>
              ) : [...gapRegs, ...partialRegs].flatMap(reg => {
                // Phase 1b: name the relevant policy beneath the regulation, like we do for
                // partials. When a regulation's coverage detail routes its fixes to more than
                // one policy, we list the regulation once PER policy (each row names its own
                // policy) — a clearer index than a nested box. Rows only carry a policy once
                // the drill-in detail has been generated (open one, or re-run the analysis);
                // until then the regulation shows as a single plain row.
                const targets = (reg.target_policies ?? []).filter(t => t.count > 0)
                // One entry per row. Prefer the per-requirement routing (a row per policy);
                // if that's empty but the drill-in resolved a primary policy, show that one;
                // otherwise a single plain row until the detail is generated.
                const primary = reg.target_policy
                const rows: Array<{ policy: { id: string | null; name: string } | null }> =
                  targets.length > 0
                    ? targets.map(t => ({ policy: { id: t.id, name: t.name } }))
                    : primary
                      ? [{ policy: primary }]
                      : [{ policy: null }]

                return rows.map((row, ri) => {
                  const policy = row.policy
                  // For a partial, "Partially covered by X" already names the covering policy;
                  // only add the routing line when the fix goes somewhere different (or it's a gap).
                  const showRouting = !!policy && (reg.status === 'gap' || policy.id !== reg.evidence_policy_id)
                  return (
                    <div key={`${reg.reference_key}::${policy?.id ?? (policy ? `new-${ri}` : 'only')}`} className="flex items-center justify-between gap-3 px-6 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-neutral-dark">{reg.official_name}</p>
                        {reg.status === 'partial' && reg.evidence_policy_name && (!policy || policy.id === reg.evidence_policy_id) && (
                          <p className="truncate text-xs text-neutral-mid">Partially covered by {reg.evidence_policy_name}</p>
                        )}
                        {showRouting && policy && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                            <FileQuestion size={11} className={`shrink-0 ${policy.id ? 'text-teal' : 'text-amber-500'}`} />
                            <span className="truncate text-neutral-mid">
                              {policy.id
                                ? <>Relevant policy: <span className="font-medium text-neutral-dark">{policy.name}</span></>
                                : <>New policy needed: <span className="font-medium text-neutral-dark">{policy.name}</span></>}
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${reg.status === 'gap' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                          {reg.status === 'gap' ? 'Gap' : 'Partial'}
                        </span>
                        <button
                          onClick={() => setDetailReg({ reference_key: reg.reference_key, official_name: reg.official_name })}
                          className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30"
                        >
                          <Wand2 size={12} /> {reg.status === 'gap' ? 'See what to add' : 'Show coverage'}
                        </button>
                      </div>
                    </div>
                  )
                })
              })}
            </div>

            {coveredRegs.length > 0 && (
              <details className="border-t border-gray-100">
                <summary className="cursor-pointer px-6 py-3 text-xs font-medium text-neutral-mid hover:text-neutral-dark">
                  {coveredRegs.length} regulation{coveredRegs.length > 1 ? 's' : ''} fully covered
                </summary>
                <div className="divide-y divide-gray-50">
                  {coveredRegs.map(reg => (
                    <div key={reg.reference_key} className="flex items-center gap-3 px-6 py-2.5">
                      <CheckCircle2 size={14} className="shrink-0 text-green-500" />
                      <p className="truncate text-sm text-neutral-dark">{reg.official_name}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* ── Out-of-date content (policy lint) — under Regulation coverage ─── */}
      {session?.accessToken && <PolicyHealthSection token={session.accessToken} userId={userId} />}

      {/* ── Cross-policy consistency ──────────────────────────────────────── */}
      {session?.accessToken && <PolicyConsistencySection token={session.accessToken} userId={userId} />}

      {/* ── Policy update matrix ──────────────────────────────────────────── */}
      {session?.accessToken && <PolicyMatrixSection token={session.accessToken} userId={userId} />}

      {/* ── Completed / archived remediations ────────────────────────────── */}
      {archived.length > 0 && (
        <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
          <button onClick={() => setShowArchive(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
            <CheckCircle2 size={16} className="text-green-500" />
            <h2 className="flex-1 text-sm font-semibold text-neutral-dark">Completed ({archived.length})</h2>
            <ChevronDown size={15} className={`text-neutral-mid transition-transform ${showArchive ? 'rotate-180' : ''}`} />
          </button>
          {showArchive && (
            <div className="divide-y divide-gray-50 border-t border-gray-100">
              {archived.map(g => (
                <div key={g.reference_key} className="flex items-center justify-between gap-3 px-6 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-neutral-dark">{g.official_name}</p>
                    <p className="text-xs text-neutral-mid">
                      Completed{g.completed_by_name ? ` by ${g.completed_by_name}` : ''}{g.completed_at ? ` · ${fmtWhen(g.completed_at)}` : ''}
                      {g.status === 'covered' && <span className="ml-1 text-green-600">· now covered</span>}
                      {(g.status === 'gap' || g.status === 'partial') && <span className="ml-1 text-amber-600">· still flagged at last analysis</span>}
                    </p>
                  </div>
                  <button onClick={() => reopenGap(g.reference_key)} className="shrink-0 text-xs font-semibold text-teal hover:underline">Reopen</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Regulation-updated alerts — under the coverage section ────────── */}
      {data.regulation_alerts.filter(a => !dismissedAlerts.has(a.id)).length > 0 && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Info size={16} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">Regulations you&apos;re assessed against have been updated</p>
          </div>
          <p className="mb-3 text-xs text-amber-800">Review your policies for these, then re-run the coverage analysis. You can also generate a short training module on the update for your staff.</p>
          <div className="space-y-2">
            {data.regulation_alerts.filter(a => !dismissedAlerts.has(a.id)).map(a => (
              <div key={a.id} className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-neutral-dark">{a.official_name}</p>
                <div className="flex flex-shrink-0 items-center gap-3">
                  {alertTraining[a.reference_key] === 'done' ? (
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600"><CheckCircle2 size={13} /> Module drafted — see <a href="/training" className="underline">Training</a></span>
                  ) : (
                    <button onClick={() => trainOnAlert(a.reference_key)} disabled={alertTraining[a.reference_key] === 'loading'}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50">
                      {alertTraining[a.reference_key] === 'loading' ? <><Loader2 size={12} className="animate-spin" /> Generating…</> : <><Sparkles size={12} /> Generate training</>}
                    </button>
                  )}
                  <button onClick={() => dismissAlert(a.id)} className="text-xs font-medium text-neutral-mid hover:text-neutral-dark">Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top unanswered question themes — full width ───────────────────── */}
      <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
        <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
          <FileQuestion size={16} className="text-amber-600" />
          <h2 className="text-sm font-semibold text-neutral-dark">Top unanswered question themes</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {data.unanswered_themes.length === 0 ? (
            <div className="flex items-center gap-3 px-6 py-5">
              <CheckCircle2 size={18} className="text-green-500" />
              <p className="text-sm text-neutral-mid">No recurring unanswered questions — great coverage.</p>
            </div>
          ) : data.unanswered_themes.map(theme => (
            <div key={theme.theme} className="px-6 py-4">
              <div className="mb-2 flex items-start justify-between gap-4">
                <p className="font-semibold capitalize text-neutral-dark">{theme.theme}</p>
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                  {theme.count} {theme.count === 1 ? 'question' : 'questions'}
                </span>
              </div>
              <ul className="space-y-1">
                {theme.sample_questions.map((q, i) => (
                  <li key={i} className="truncate text-xs text-neutral-mid">&ldquo;{q}&rdquo;</li>
                ))}
              </ul>
              <div className="mt-3">
                <a href="/policies" className="text-xs font-semibold text-teal hover:underline">Upload a policy to cover this →</a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detailReg && session?.accessToken && (
        <GapDetailModal
          token={session.accessToken}
          referenceKey={detailReg.reference_key}
          officialName={detailReg.official_name}
          acknowledged={data.remediation_acknowledged || ackOverride}
          disclaimer={data.remediation_disclaimer}
          onAcknowledged={() => setAckOverride(true)}
          // Opening a drill-in generates & caches its policy routing; refresh the list on
          // close so the newly-identified policies appear under the regulation immediately.
          onClose={() => { setDetailReg(null); load() }}
          onVerdictCovered={key => setCorrectedToCovered(prev => new Set(prev).add(key))}
          onCompleted={key => setCompletedOverride(prev => new Set(prev).add(key))}
        />
      )}

      {data.meta.no_match_total === 0 && data.unanswered_themes.length === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-card border border-green-100 bg-green-50 px-6 py-5">
          <TrendingUp size={20} className="text-green-600" />
          <div>
            <p className="font-semibold text-green-800">No gaps detected in the last 90 days.</p>
            <p className="text-sm text-green-700">Every staff question was matched to a policy. Keep your library up to date and check back regularly.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Out-of-date content (policy lint) ────────────────────────────────────────────
// Deterministic, zero-AI scan of the whole policy library against the stale-signal catalogue.
// Reads the cached result instantly; "Scan policies" re-runs it. Sits under Regulation coverage.
type LintData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['policyLint']>>

function PolicyHealthSection({ token, userId }: { token: string; userId: string }) {
  const [data, setData] = useState<LintData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [selected, setSelected] = useState<LintData['policies'][number] | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const cached = persistentCache.get<LintData>(`admin-policy-lint-${userId}`)
    if (cached) { setData(cached); setLoading(false) }
  }, [userId])

  const load = useCallback(() => {
    createApiClient(token).analytics.policyLint()
      .then(d => { setData(d); persistentCache.set(`admin-policy-lint-${userId}`, d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, userId])

  useEffect(() => { load() }, [load])

  async function scan() {
    setScanning(true)
    try { await createApiClient(token).analytics.policyLintScan(); load() }
    catch { /* surfaced as no change */ }
    finally { setScanning(false) }
  }

  const when = data?.scanned_at ? new Date(data.scanned_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <FileClock size={16} className="shrink-0 text-amber-600" />
        <h2 className="text-sm font-semibold text-neutral-dark">Out-of-date content</h2>
        {data?.scanned && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">
            {data.policies_with_issues} {data.policies_with_issues === 1 ? 'policy' : 'policies'}
          </span>
        )}
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (<div className="border-t border-gray-100">
      <div className="flex items-center justify-end px-6 pt-4">
        <button onClick={scan} disabled={scanning}
          className="flex shrink-0 items-center gap-2 rounded-btn border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30 disabled:opacity-50">
          {scanning ? <><Loader2 size={13} className="animate-spin" /> Scanning…</> : <><RefreshCw size={13} /> {data?.scanned ? 'Re-scan policies' : 'Scan policies'}</>}
        </button>
      </div>
      {loading && !data ? (
        <div className="px-6 py-6"><div className="h-16 animate-pulse rounded bg-gray-50" /></div>
      ) : !data?.scanned ? (
        <div className="flex items-center gap-3 px-6 py-6">
          <Sparkles size={18} className="shrink-0 text-teal" />
          <p className="text-sm text-neutral-mid">Scan your policy library for out-of-date content, superseded law and regulators, pandemic-era wording and unfilled template placeholders. This runs instantly and uses no AI credits.</p>
        </div>
      ) : data.policies.length === 0 ? (
        <div className="flex items-center gap-3 px-6 py-5">
          <CheckCircle2 size={18} className="text-green-500" />
          <p className="text-sm text-neutral-mid">No out-of-date content found across your policies.{when ? ` Last scanned ${when}.` : ''}</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-50 px-6 py-2.5 text-xs text-neutral-mid">
            <span><strong className="text-neutral-dark">{data.policies_with_issues}</strong> of {data.policies_scanned} policies flagged</span>
            {data.high_findings > 0 && <span className="text-rose-600">{data.high_findings} high-severity</span>}
            {data.medium_findings > 0 && <span className="text-amber-600">{data.medium_findings} medium</span>}
            {when && <span className="ml-auto text-gray-400">Scanned {when}</span>}
          </div>
          <div className="divide-y divide-gray-50">
            {data.policies.map(p => {
              const highs = p.findings.filter(f => f.severity === 'high').length
              return (
                <div key={p.policy_id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-dark">{p.policy_name}</p>
                    <p className="text-xs text-neutral-mid">
                      {p.findings.length} {p.findings.length === 1 ? 'issue' : 'issues'}
                      {highs > 0 && <span className="text-rose-600"> · {highs} high-severity</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => setSelected(p)}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30"
                    >
                      <Wand2 size={12} /> Review &amp; fix
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
      </div>)}

      {selected && (
        <PolicyLintModal
          token={token}
          policyId={selected.policy_id}
          policyName={selected.policy_name}
          findings={selected.findings}
          onClose={() => setSelected(null)}
          onAdopted={load}
        />
      )}
    </div>
  )
}

// ── Policy update matrix ─────────────────────────────────────────────────────────
type MatrixData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['policyMatrix']>>

const SOURCE_LABEL: Record<string, string> = { coverage: 'Regulation coverage', out_of_date: 'Out-of-date content', consistency: 'Cross-policy consistency' }
const SOURCE_STYLE: Record<string, string> = { coverage: 'bg-red-50 text-red-600', out_of_date: 'bg-amber-50 text-amber-700', consistency: 'bg-indigo-50 text-indigo-600' }
const MSTATUS: Record<string, { label: string; cls: string }> = {
  published:        { label: 'Live',              cls: 'bg-green-50 text-green-700' },
  draft:            { label: 'Draft',             cls: 'bg-gray-100 text-neutral-mid' },
  pending_manager:  { label: 'With care manager', cls: 'bg-amber-50 text-amber-700' },
  pending_external: { label: 'Awaiting external', cls: 'bg-sky-50 text-sky-700' },
}

function PolicyMatrixSection({ token, userId }: { token: string; userId: string }) {
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const cached = persistentCache.get<MatrixData>(`admin-matrix-${userId}`)
    if (cached) { setData(cached); setLoading(false) }
    createApiClient(token).analytics.policyMatrix()
      .then(d => { setData(d); persistentCache.set(`admin-matrix-${userId}`, d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, userId])

  const rows = data?.policies ?? []
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

  return (
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <FileClock size={16} className="shrink-0 text-teal" />
        <h2 className="text-sm font-semibold text-neutral-dark">Policy update matrix</h2>
        {rows.length > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">{rows.length} updated</span>}
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (<div className="border-t border-gray-100">
        {loading && !data ? (
          <div className="px-6 py-6"><div className="h-16 animate-pulse rounded bg-gray-50" /></div>
        ) : rows.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-5">
            <Info size={18} className="shrink-0 text-neutral-mid" />
            <p className="text-sm text-neutral-mid">No policies have been updated and published yet. Adopt and publish a change from any of the sections above and it will appear here with its next review date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">
                  <th className="px-6 py-2.5">Policy</th>
                  <th className="px-3 py-2.5">Updated from</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Last change</th>
                  <th className="px-6 py-2.5">Next review due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map(r => (
                  <tr key={r.policy_id}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-neutral-dark">{r.name}</p>
                      <p className="text-xs text-neutral-mid">v{r.version}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.sources.length === 0 ? <span className="text-xs text-neutral-mid">—</span> : r.sources.map(s => (
                          <span key={s} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${SOURCE_STYLE[s] ?? 'bg-gray-100 text-neutral-mid'}`}>{SOURCE_LABEL[s] ?? s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${MSTATUS[r.status]?.cls ?? 'bg-gray-100 text-neutral-mid'}`}>{MSTATUS[r.status]?.label ?? r.status}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap text-neutral-dark tabular-nums">{fmt(r.updated_at)}</td>
                    <td className="px-6 py-3 whitespace-nowrap tabular-nums">
                      {r.status !== 'published' ? <span className="text-xs text-neutral-mid">once published</span> : (
                        <>
                          <span className={r.review_overdue ? 'font-semibold text-red-600' : 'text-neutral-dark'}>{fmt(r.next_review_due)}</span>
                          {r.review_overdue && <span className="ml-1.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Due</span>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>)}
    </div>
  )
}

// ── Cross-policy consistency ─────────────────────────────────────────────────────
type ConsistencyData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['consistency']>>
type Conflict = ConsistencyData['conflicts'][number]

const CSEV: Record<string, string> = { high: 'bg-rose-50 text-rose-700', medium: 'bg-amber-50 text-amber-700', low: 'bg-slate-100 text-slate-600' }

function PolicyConsistencySection({ token, userId }: { token: string; userId: string }) {
  const [data, setData] = useState<ConsistencyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [runErr, setRunErr] = useState('')
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Conflict | null>(null)

  useEffect(() => {
    const cached = persistentCache.get<ConsistencyData>(`admin-consistency-${userId}`)
    if (cached) { setData(cached); setLoading(false) }
  }, [userId])

  const load = useCallback(() => {
    createApiClient(token).analytics.consistency()
      .then(d => { setData(d); persistentCache.set(`admin-consistency-${userId}`, d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token, userId])

  useEffect(() => { load() }, [load])

  async function run() {
    setRunning(true); setProgress('Grouping related policies…'); setRunErr('')
    const api = createApiClient(token)
    try {
      const { to_extract } = await api.analytics.consistencyStart()
      let last = to_extract
      for (let i = 0; i < 300; i++) {
        const p = await api.analytics.consistencyBatch()
        setProgress(`Reading policies… ${Math.max(0, to_extract - p.remaining)}/${to_extract}`)
        if (p.remaining <= 0) break
        if (p.remaining >= last) { /* no progress — stop rather than spin */ break }
        last = p.remaining
      }
      setProgress('Comparing for contradictions…')
      await api.analytics.consistencyDetect()
      load()
    } catch (e: any) {
      setRunErr(e?.message?.includes('credit') ? 'AI credit limit reached — the check stopped. It will resume where it left off next time.' : (e?.message ?? 'The check could not finish.'))
    } finally { setRunning(false); setProgress(null) }
  }

  const when = data?.analysed_at ? new Date(data.analysed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
  const conflicts = data?.conflicts ?? []

  return (
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <ShieldAlert size={16} className="shrink-0 text-indigo-500" />
        <h2 className="text-sm font-semibold text-neutral-dark">Cross-policy consistency</h2>
        {data?.analysed && conflicts.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">{conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}</span>
        )}
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (<div className="border-t border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-4">
          <p className="text-xs text-neutral-mid">Finds where two policies contradict each other on the same point — conflicting timeframes, routes, roles or definitions, and drift between near-duplicate policies.</p>
          <button onClick={run} disabled={running}
            className="flex shrink-0 items-center gap-2 rounded-btn border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30 disabled:opacity-50">
            {running ? <><Loader2 size={13} className="animate-spin" /> {progress ?? 'Running…'}</> : <><RefreshCw size={13} /> {data?.analysed ? 'Re-run check' : 'Run consistency check'}</>}
          </button>
        </div>
        {runErr && <p className="px-6 pt-2 text-xs text-red-600">{runErr}</p>}

        {loading && !data ? (
          <div className="px-6 py-6"><div className="h-16 animate-pulse rounded bg-gray-50" /></div>
        ) : !data?.analysed ? (
          <div className="flex items-center gap-3 px-6 py-6">
            <Sparkles size={18} className="shrink-0 text-teal" />
            <p className="text-sm text-neutral-mid">Run the check to compare related and near-duplicate policies for contradictions. It reads policies and uses AI credits, so it runs only when you ask.</p>
          </div>
        ) : conflicts.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-5">
            <CheckCircle2 size={18} className="text-green-500" />
            <p className="text-sm text-neutral-mid">No contradictions found across your policies.{when ? ` Last checked ${when}.` : ''}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-50 px-6 py-2.5 text-xs text-neutral-mid">
              <span><strong className="text-neutral-dark">{conflicts.length}</strong> conflict{conflicts.length === 1 ? '' : 's'} across {data.sets} comparison groups</span>
              {data.high > 0 && <span className="text-rose-600">{data.high} high-severity</span>}
              {when && <span className="ml-auto text-gray-400">Checked {when}</span>}
            </div>
            <div className="divide-y divide-gray-50">
              {conflicts.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 font-medium text-neutral-dark">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${CSEV[c.severity] ?? CSEV.low}`}>{c.severity}</span>
                      {c.topic}
                    </p>
                    <p className="truncate text-xs text-neutral-mid">{c.positions.map(p => p.policy_name).join(' vs ')}</p>
                  </div>
                  <button onClick={() => setSelected(c)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-btn border border-teal/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30">
                    <Wand2 size={12} /> Review &amp; resolve
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>)}

      {selected && (
        <ConflictModal
          token={token}
          conflict={selected}
          onClose={() => setSelected(null)}
          onResolved={load}
          onDismissed={() => { setSelected(null); load() }}
        />
      )}
    </div>
  )
}
