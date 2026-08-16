'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { persistentCache } from '@/lib/page-cache'
import { usePlanFeatures } from '@/lib/use-plan-features'
import { UpgradePanel } from '@/components/admin/upgrade-gate'
import { GapDetailModal } from '@/components/admin/gap-detail-modal'
import { PolicyLintModal } from '@/components/admin/policy-lint-modal'
import { ConflictModal } from '@/components/admin/conflict-modal'
import { WordingReviewModal } from '@/components/admin/wording-review-modal'
import { CheckCircle2, ChevronDown, FileQuestion, Info, Loader2, RefreshCw, ShieldAlert, Sparkles, TrendingUp, Wand2, FileClock, FileText, AlertCircle, CalendarClock, Check, X, Building2, Coins } from 'lucide-react'

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

// ── Guided pipeline (step framing) ──────────────────────────────────────────────
// One page-level fetch of /analytics/gaps/pipeline drives the step chips, status
// pills, staleness banners and the pre-run "pending changes" warning across all
// four analysis sections. Steps are framing only — the sections keep their
// physical order and content.
type PipelineData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['gapsPipeline']>>
type PipelineSection = PipelineData['sections'][number]

const PIPELINE_STEPS: Array<{ key: PipelineSection['section']; step: number; name: string }> = [
  { key: 'coverage',    step: 1, name: 'Regulation coverage' },
  { key: 'out_of_date', step: 2, name: 'Out-of-date content' },
  { key: 'consistency', step: 3, name: 'Cross-policy consistency' },
  { key: 'wording',     step: 4, name: 'CQC wording' },
]

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Compact teal circle with the step number — sits next to each section heading.
function StepChip({ step }: { step: number }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-[10px] font-bold text-white">{step}</span>
  )
}

// Status pill for a pipeline step: not run / up to date / stale.
function StepStatusPill({ info }: { info?: PipelineSection }) {
  if (!info || !info.ran_at) {
    return <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-mid">Not run yet</span>
  }
  if (info.stale) {
    return <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Policies changed since this ran</span>
  }
  return <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">Up to date · ran {fmtDay(info.ran_at)}</span>
}

// Hover "i": reminds the tenant of the run → adopt → review and publish cycle.
function StepInfoDot() {
  return (
    <span className="group relative inline-flex shrink-0">
      <Info size={13} className="cursor-help text-neutral-mid/50 group-hover:text-teal" />
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 hidden w-72 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-left text-[11px] font-normal normal-case leading-relaxed text-neutral-dark shadow-lg group-hover:block">
        Run the analysis, adopt the changes you want, then <span className="font-semibold">approve and publish them in Adopted changes to review on the Policies page</span>. Analyses always read the published version of your policies, so publish before re-running or moving to the next step.
      </span>
    </span>
  )
}

// Live ticker: how many policies have adopted changes waiting to be reviewed and
// published on /policies. Refreshed with the pipeline (and polled every minute).
function PublishTicker({ count }: { count: number }) {
  if (!count) return null
  return (
    <Link href="/policies" className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 transition-colors hover:bg-amber-200">
      {count === 1 ? '1 policy to publish' : `${count} policies to publish`}
    </Link>
  )
}

// The status cluster next to each step heading: pill + info hover. The single
// "policies to publish" ticker lives in the pipeline overview strip, not on
// every step (it was visually noisy repeated eight times).
function StepMeta({ info }: { info?: PipelineSection; pendingPolicies?: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5">
      <StepStatusPill info={info} />
      <StepInfoDot />
    </span>
  )
}

// Amber banner shown above a section's content when policies have been published
// since that section's analysis last ran.
function StaleBanner({ info }: { info?: PipelineSection }) {
  if (!info?.stale || !info.ran_at) return null
  const n = info.stale_policy_count
  return (
    <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
      <p className="text-xs leading-relaxed text-amber-800">
        {n === 1 ? '1 policy has' : `${n} policies have`} been published or newly added since this last ran on {fmtDay(info.ran_at)}. Re-run to refresh these results.
      </p>
    </div>
  )
}

// ── Resumable runs ──────────────────────────────────────────────────────────────
// One cheap page-level fetch of /analytics/gaps/run-state (counts only, no AI work)
// tells us whether a batch analysis was interrupted mid-run — the server keeps the
// finished items, so the section can offer Resume (batch loop only, never the
// destructive start endpoint) instead of a fresh run that wastes credits.
type RunStateData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['gapsRunState']>>
type SectionRunState = RunStateData['sections'][number]

// Amber banner inside a section when a run was interrupted part-way. Resume continues
// from where it stopped — already-analysed items are never re-run, so they cost nothing.
function ResumeBanner({ state, resuming, onResume }: { state?: SectionRunState; resuming: boolean; onResume: () => void }) {
  if (!state || state.total <= 0 || state.remaining <= 0 || state.analysed <= 0) return null
  return (
    <div className="mx-6 my-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      <AlertCircle size={15} className="shrink-0 text-amber-500" />
      <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-800">
        An analysis was interrupted: {state.analysed} of {state.total} done. Resume to finish without re-running what is already complete (no extra credits for finished items).
      </p>
      <button onClick={onResume} disabled={resuming}
        className="shrink-0 rounded-btn bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
        {resuming ? <span className="flex items-center gap-1.5"><Loader2 size={12} className="animate-spin" /> Resuming…</span> : 'Resume'}
      </button>
    </div>
  )
}

// Small inline error box with a Retry — shown when a section's data fails to load,
// instead of silently rendering an empty panel that reads as "nothing to show".
function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
      <AlertCircle size={15} className="shrink-0 text-red-500" />
      <p className="flex-1 text-xs text-red-700">Couldn&apos;t load this section.</p>
      <button onClick={onRetry}
        className="shrink-0 rounded-btn border border-red-200 bg-white px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">
        Retry
      </button>
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
  const [analysisAckOverride, setAnalysisAckOverride] = useState(false)   // set true once the credits notice is confirmed this session
  const [completedOverride, setCompletedOverride] = useState<Set<string>>(new Set())  // marked completed this session
  const [showArchive, setShowArchive] = useState(false)
  const [showCoverage, setShowCoverage] = useState(false)
  // First-run gate before analysis: org-details check → disclaimer → AI-credits notice, one at a time.
  const [orgDetails, setOrgDetails] = useState<Record<string, string> | null>(null)
  const [orgSkipped, setOrgSkipped] = useState(false)
  const [firstRunStep, setFirstRunStep] = useState<'org' | 'disclaimer' | 'credits' | null>(null)
  // Guided pipeline: per-step run/stale status + adopted changes still awaiting review.
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  // When a run button is clicked while adopted changes are pending, the run is parked
  // here until the tenant confirms (Run anyway) or cancels.
  const [pendingRun, setPendingRun] = useState<{ run: () => void } | null>(null)

  // Hydrate the pipeline strip from the persistent cache for instant paint, then revalidate.
  useEffect(() => {
    const cached = persistentCache.get<PipelineData>(`admin-gaps-pipeline-${userId}`)
    if (cached) setPipeline(cached)
  }, [userId])

  const loadPipeline = useCallback(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).analytics.gapsPipeline()
      .then(d => { setPipeline(d); persistentCache.set(`admin-gaps-pipeline-${userId}`, d) })
      .catch(() => { /* the strip just keeps its last snapshot */ })
  }, [session?.accessToken, userId])

  // Resumable runs: did a previous batch analysis stop part-way? Fetched once on load
  // (alongside the pipeline) and refreshed after every run, so each section can offer
  // Resume instead of a destructive fresh start.
  const [runState, setRunState] = useState<RunStateData | null>(null)
  const loadRunState = useCallback(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).analytics.gapsRunState()
      .then(setRunState)
      .catch(() => { /* the resume offer is best-effort */ })
  }, [session?.accessToken])
  const runStateFor = useCallback(
    (section: SectionRunState['section']) => runState?.sections.find(s => s.section === section),
    [runState]
  )
  // Sections call this when a run finishes: refresh the pipeline strip AND the run-state
  // (so a completed or resumed run clears its resume banner).
  const onRunComplete = useCallback(() => { loadPipeline(); loadRunState() }, [loadPipeline, loadRunState])

  useEffect(() => {
    if (planLoading || locked) return
    loadPipeline()
    loadRunState()
    // Keep the "policies to publish" ticker live while the page is open.
    const t = setInterval(loadPipeline, 60_000)
    return () => clearInterval(t)
  }, [planLoading, locked, loadPipeline, loadRunState])

  const stepInfo = useCallback(
    (key: PipelineSection['section']) => pipeline?.sections.find(s => s.section === key),
    [pipeline]
  )

  // Gate any of the four analysis runs behind a warning when adopted changes are still
  // awaiting review — analyses read the published version, so those drafts are invisible.
  const confirmRun = useCallback((run: () => void) => {
    // Guardrail on every run: remind the tenant that analyses read the PUBLISHED
    // version, and that adopted changes must be approved and published on /policies.
    setPendingRun({ run })
  }, [])

  async function reopenGap(referenceKey: string) {
    setCompletedOverride(prev => { const n = new Set(prev); n.delete(referenceKey); return n })
    if (session?.accessToken) {
      await createApiClient(session.accessToken).analytics.reopenGap(referenceKey).catch(() => {})
      load()
    }
  }

  // "Mark as updated" for a regulation gap — archives it to Completed until re-analysis re-flags it.
  async function markCoverageUpdated(referenceKey: string) {
    setCompletedOverride(prev => new Set(prev).add(referenceKey))
    if (session?.accessToken) createApiClient(session.accessToken).analytics.completeGap(referenceKey).catch(() => {})
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

  // The batch phase of a coverage run: loop the (idempotent, resumable) batch endpoint
  // until nothing remains. Shared by a fresh run (after the destructive start) and by
  // Resume, which never calls start — so already-analysed regulations are kept and cost
  // no further credits.
  async function driveCoverageBatches(api: ReturnType<typeof createApiClient>) {
    for (let i = 0; i < 200; i++) {   // guard; each batch does ~12 regulations
      const p = await api.analytics.analyseGapsBatch()
      setAnalyseProgress({ done: p.analysed, total: p.total })
      if (p.remaining <= 0) break
    }
  }

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
      await driveCoverageBatches(api)
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
      onRunComplete()
    }
  }

  // Resume an interrupted coverage run: the batch loop only — NEVER the start endpoint
  // (which wipes the finished rows), and no first-run gates or pre-run confirm, because
  // this simply continues a run the tenant already began and confirmed.
  async function resumeCoverage() {
    if (!session?.accessToken) return
    const st = runStateFor('coverage')
    setAnalysing(true); setError('')
    setAnalyseProgress(st ? { done: st.analysed, total: st.total } : null)
    const api = createApiClient(session.accessToken)
    try {
      await driveCoverageBatches(api)
      load()
    } catch (e: any) {
      setError(e.message ?? 'Coverage analysis failed — please try again.')
    } finally {
      setAnalysing(false); setAnalyseProgress(null)
      onRunComplete()
    }
  }

  // Fetch organisation details once so the first-run gate can check they're filled in.
  useEffect(() => {
    if (!session?.accessToken || locked) return
    createApiClient(session.accessToken).settings.get()
      .then(s => setOrgDetails(((s as any).organisation_details ?? {}) as Record<string, string>))
      .catch(() => setOrgDetails({}))
  }, [session?.accessToken, locked])

  // Organisation-details completeness. These fields personalise the policies, so they matter
  // for the analysis. An approver counts if either the default approver or registered manager is set.
  const REQUIRED_ORG: Array<{ key: string; label: string }> = [
    { key: 'nominated_individual', label: 'Nominated individual' },
    { key: 'address', label: 'Registered address' },
    { key: 'cqc_provider_id', label: 'CQC provider ID' },
    { key: 'cqc_location_id', label: 'CQC location ID' },
  ]
  const orgMissing = orgDetails ? REQUIRED_ORG.filter(f => !String(orgDetails[f.key] ?? '').trim()) : []
  const approverSet = orgDetails ? !!(String(orgDetails.default_approver ?? '').trim() || String(orgDetails.registered_manager ?? '').trim()) : true
  const orgIncomplete = !!orgDetails && (orgMissing.length > 0 || !approverSet)

  // The first outstanding gate step in order, or null if none are outstanding.
  function firstGate(): 'org' | 'disclaimer' | 'credits' | null {
    if (orgIncomplete && !orgSkipped) return 'org'
    if (data && !data.remediation_acknowledged && !ackOverride) return 'disclaimer'
    if (data && !data.analysis_acknowledged && !analysisAckOverride) return 'credits'
    return null
  }
  function beginAnalysis() {
    const step = firstGate()
    if (step) setFirstRunStep(step)
    else runAnalysis()
  }
  // Advance the queue after a step is cleared. Pass the flags that just changed so we don't wait
  // for async state before deciding the next step.
  function proceedAfter(step: 'org' | 'disclaimer' | 'credits') {
    const order: Array<'org' | 'disclaimer' | 'credits'> = ['org', 'disclaimer', 'credits']
    for (const s of order.slice(order.indexOf(step) + 1)) {
      if (s === 'disclaimer' && data && !data.remediation_acknowledged && !ackOverride) { setFirstRunStep('disclaimer'); return }
      if (s === 'credits' && data && !data.analysis_acknowledged && !analysisAckOverride) { setFirstRunStep('credits'); return }
    }
    setFirstRunStep(null)
    runAnalysis()
  }

  // While an analysis is running, warn before the tab is closed or refreshed: leaving pauses the
  // run part-way (progress is kept server-side and can be resumed, but staying is fastest).
  useEffect(() => {
    if (!analysing) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [analysing])

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
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-red-100 bg-red-50 px-6 py-5 text-sm text-red-700">
        <span className="min-w-0 flex-1">{error}</span>
        <button
          onClick={() => { setError(''); setLoading(true); load() }}
          className="shrink-0 rounded-btn border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100">
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  // Hide items that are corrected-to-covered (drill-in) or marked completed (archived).
  // Guard every field: a partial / unexpected API response must never white-screen the page.
  const regulationGaps = Array.isArray(data.regulation_gaps) ? data.regulation_gaps : []
  const completedGaps  = Array.isArray(data.completed_gaps) ? data.completed_gaps : []
  const meta           = data.meta ?? ({} as GapsData['meta'])
  const completedKeys = new Set<string>([...(data.completed_keys ?? []), ...completedOverride])
  const hidden = (k: string) => correctedToCovered.has(k) || completedKeys.has(k)
  const gapRegs     = regulationGaps.filter(r => r.status === 'gap' && !hidden(r.reference_key))
  const partialRegs = regulationGaps.filter(r => r.status === 'partial' && !hidden(r.reference_key))
  const coveredRegs = regulationGaps.filter(r => r.status === 'covered')
  const archived    = completedGaps.filter(g => completedKeys.has(g.reference_key))

  // Live metrics that reflect what the tenant sees below: partials/gaps they've
  // completed or corrected-to-covered now count as handled, so the score, the
  // "fully" count and the gaps block all move together as they close gaps —
  // rather than the percentage staying frozen at the last analysis run.
  const totalRegs    = meta.regulations_total ?? 0
  const handledExtra = Math.max(0, ((meta.regulations_partial ?? 0) + (meta.regulations_gap ?? 0)) - (partialRegs.length + gapRegs.length))
  const fullyCovered = coveredRegs.length + handledExtra
  const score = data.analysed && totalRegs > 0
    ? Math.round(((fullyCovered + partialRegs.length * 0.5) / totalRegs) * 100)
    : null

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
      {/* First-run gate: shown one at a time before the analysis starts, so they never overlap. */}
      {firstRunStep === 'org' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <Building2 size={22} className="mt-0.5 shrink-0 text-teal" />
              <div>
                <h2 className="text-lg font-bold text-neutral-dark">Complete your organisation details first</h2>
                <p className="mt-1 text-sm text-neutral-mid">These details personalise your policies and help the analysis be accurate. A few are still missing:</p>
              </div>
            </div>
            <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {orgMissing.map(f => <li key={f.key} className="flex items-center gap-2"><AlertCircle size={13} className="shrink-0" /> {f.label}</li>)}
              {!approverSet && <li className="flex items-center gap-2"><AlertCircle size={13} className="shrink-0" /> Default approver or registered manager</li>}
            </ul>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button onClick={() => { setOrgSkipped(true); proceedAfter('org') }} className="text-sm font-medium text-neutral-mid hover:text-neutral-dark">Continue anyway</button>
              <a href="/settings" className="rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">Go to settings</a>
            </div>
          </div>
        </div>
      )}

      {firstRunStep === 'disclaimer' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="mt-0.5 shrink-0 text-amber-500" />
              <div>
                <h2 className="text-lg font-bold text-neutral-dark">Before you run the analysis</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-mid">{data.remediation_disclaimer}</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button onClick={() => setFirstRunStep(null)} className="text-sm font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
              <button
                onClick={async () => { try { await createApiClient(session!.accessToken!).analytics.acknowledgeRemediation() } catch {} setAckOverride(true); proceedAfter('disclaimer') }}
                className="rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">I understand
              </button>
            </div>
          </div>
        </div>
      )}

      {firstRunStep === 'credits' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <Coins size={22} className="mt-0.5 shrink-0 text-teal" />
              <div>
                <h2 className="text-lg font-bold text-neutral-dark">A full re-run uses AI credits</h2>
                <p className="mt-1 text-sm leading-relaxed text-neutral-mid">Running the coverage analysis reads through all of your policies and can take a few minutes. It is fastest to keep this page open until it finishes. If you do leave or refresh, your progress is saved and you can resume the run from where it stopped, without re-running what is already complete.</p>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button onClick={() => setFirstRunStep(null)} className="text-sm font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
              <button
                onClick={async () => { try { await createApiClient(session!.accessToken!).analytics.acknowledgeAnalysis() } catch {} setAnalysisAckOverride(true); proceedAfter('credits') }}
                className="rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">Start analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-run warning: adopted changes are still awaiting review, so this run cannot see them. */}
      {pendingRun && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className={`mt-0.5 shrink-0 ${(pipeline?.pending_changes ?? 0) > 0 ? 'text-amber-500' : 'text-teal'}`} />
              <div>
                {(pipeline?.pending_changes ?? 0) > 0 ? (
                  <>
                    <h2 className="text-lg font-bold text-neutral-dark">Adopted changes are still awaiting review</h2>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-mid">
                      This analysis reads the published version of your policies. {pipeline?.pending_changes === 1
                        ? '1 adopted change is waiting'
                        : `${pipeline?.pending_changes ?? 0} adopted changes are waiting`} in Adopted changes to review and will not be seen by this run. For the best results, review and publish them first, then run the analysis.
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold text-neutral-dark">Before you run this analysis</h2>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-mid">
                      Analyses read the published version of your policies. After the run, adopt the changes you want,
                      then <span className="font-semibold text-neutral-dark">approve and publish them in Adopted changes to review on the Policies page</span> so
                      your policies are updated and the next step sees them.
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button onClick={() => setPendingRun(null)} className="text-sm font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
              <a href="/policies" className="rounded-btn border border-teal/30 bg-white px-4 py-2 text-sm font-semibold text-teal hover:bg-teal-light/30">Go to Policies</a>
              <button
                onClick={() => { const r = pendingRun.run; setPendingRun(null); r() }}
                className="rounded-btn bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark">
                {(pipeline?.pending_changes ?? 0) > 0 ? 'Run anyway' : 'Run analysis'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Blocking overlay while a coverage analysis runs — the batch loop is client-driven, so
          leaving the page pauses it. Finished work is kept server-side and can be resumed. */}
      {analysing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <Loader2 size={30} className="mx-auto animate-spin text-teal" />
            <h2 className="mt-3 text-lg font-bold text-neutral-dark">Analysing your policies…</h2>
            <p className="mt-1 text-sm text-neutral-mid">
              {analyseProgress && analyseProgress.total > 0
                ? <>Checked <strong className="text-neutral-dark">{analyseProgress.done}</strong> of <strong className="text-neutral-dark">{analyseProgress.total}</strong> regulations.</>
                : 'Getting started…'}
            </p>
            {analyseProgress && analyseProgress.total > 0 && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-teal transition-all" style={{ width: `${Math.min(100, Math.round((analyseProgress.done / analyseProgress.total) * 100))}%` }} />
              </div>
            )}
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-left">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed text-amber-800">
                Please keep this page open so the analysis can finish in one go. If you leave or refresh, it pauses, but your progress is saved and you can resume from where it stopped with no extra credits for finished items.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">Policy Gap Detection</h1>
          <p className="mt-1 text-sm text-neutral-mid">
            Regulation coverage is checked against the actual content of your policies, plus staff questions that went unanswered.
          </p>
          {analysedWhen && <p className="mt-1 text-xs text-neutral-mid">Coverage last analysed {analysedWhen}</p>}
        </div>
        <button onClick={() => confirmRun(beginAnalysis)} disabled={analysing}
          className="flex shrink-0 items-center gap-2 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50">
          {analysing
            ? <><Loader2 size={15} className="animate-spin" /> {analyseProgress && analyseProgress.total > 0 ? `Analysing… ${analyseProgress.done}/${analyseProgress.total}` : 'Analysing…'}</>
            : <><RefreshCw size={15} /> {data.analysed ? 'Re-run analysis' : 'Run coverage analysis'}</>}
        </button>
      </div>

      <HelpAccordion title="How the guided pipeline works">
        <p><strong className="text-neutral-dark">Four steps, in a recommended order.</strong> This page runs four analyses on your policies: <strong className="text-neutral-dark">Step 1 Regulation coverage</strong>, <strong className="text-neutral-dark">Step 2 Out-of-date content</strong>, <strong className="text-neutral-dark">Step 3 Cross-policy consistency</strong> and <strong className="text-neutral-dark">Step 4 CQC wording</strong>. Work through them in that order. Each step&apos;s fixes improve your policies, so later steps give better results when they run on the updated versions: coverage fills the biggest holes first, then out-of-date content removes stale references, then consistency irons out contradictions, and CQC wording polishes how the finished policies read.</p>
        <p><strong className="text-neutral-dark">The cycle for each step.</strong> Run the analysis, adopt the suggested changes, then review and publish them in <a href="/policies" className="font-semibold text-teal hover:underline">Policies</a> under Adopted changes to review. Analyses always read the published version of each policy, so a step&apos;s results only reflect your changes once they are published. Adopted changes that are still waiting for review are invisible to a new run.</p>
        <p><strong className="text-neutral-dark">What the status pills mean.</strong> <strong className="text-neutral-mid">Not run yet</strong> means that step has never been run. <strong className="text-green-600">Up to date</strong> means it has run and no policy has been published since. <strong className="text-amber-700">Policies changed since this ran</strong> means at least one policy was published after the step last ran, so its results may be out of date and a re-run is recommended.</p>
        <p><strong className="text-neutral-dark">Nothing is locked.</strong> You can run any step at any time, in any order. If adopted changes are still waiting for review when you start a run, the page warns you first so you do not analyse stale text by mistake. You can always choose to run anyway.</p>
        <p><strong className="text-neutral-dark">Interrupted runs resume where they stopped.</strong> The longer analyses save progress on our servers as they work. It is fastest to keep the page open, but if your connection drops or you leave mid-run, nothing is lost: an amber Resume banner appears on that section when you return, showing how much was already done. Pressing Resume continues from where it stopped, and finished items are not re-processed and cost no extra credits.</p>
        <p><strong className="text-neutral-dark">If something fails to load.</strong> A section that cannot reach the server shows a clear message with a Retry button instead of an empty panel. Retrying simply reloads your saved results and costs nothing.</p>
      </HelpAccordion>

      {/* ── Guided pipeline overview strip ─────────────────────────────────── */}
      {pipeline && (
        <div className="mb-6 rounded-card border border-gray-100 bg-white px-5 py-3 shadow-card">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {PIPELINE_STEPS.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <StepChip step={s.step} />
                <span className="text-xs font-semibold text-neutral-dark">{s.name}</span>
                <StepMeta info={stepInfo(s.key)} pendingPolicies={pipeline?.pending_policies ?? 0} />
              </div>
            ))}
          </div>
          {pipeline.pending_changes > 0 && (
            <div className="mt-2.5 flex items-start gap-2 border-t border-gray-50 pt-2.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" />
              <p className="flex-1 text-xs leading-relaxed text-amber-800">
                {pipeline.pending_changes === 1
                  ? '1 adopted change is awaiting review in'
                  : `${pipeline.pending_changes} adopted changes are awaiting review in`}{' '}
                <a href="/policies" className="font-semibold text-teal hover:underline">/policies</a>. Analyses read the published version, so publish them before re-running to get credit for them.
              </p>
              <PublishTicker count={pipeline.pending_policies ?? 0} />
            </div>
          )}
        </div>
      )}

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
            {data.analysed ? `${fullyCovered} fully · ${partialRegs.length} partial · ${gapRegs.length} gaps of ${totalRegs}` : 'Not yet analysed'}
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
          <StepChip step={1} />
          <h2 className="text-sm font-semibold text-neutral-dark">Regulation coverage{data.analysed && (gapRegs.length + partialRegs.length) > 0 && <span className="ml-1.5 font-normal text-neutral-mid">({gapRegs.length + partialRegs.length})</span>}</h2>
          <StepMeta info={stepInfo('coverage')} pendingPolicies={pipeline?.pending_policies ?? 0} />
          <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${showCoverage ? 'rotate-180' : ''}`} />
        </button>

        {/* Interrupted-run banner: visible even when the section is collapsed, so the
            tenant can pick the run back up without hunting for it. */}
        <ResumeBanner state={runStateFor('coverage')} resuming={analysing} onResume={resumeCoverage} />

        {showCoverage && (!data.analysed ? (
          <div className="flex items-center gap-3 border-t border-gray-100 px-6 py-8">
            <Sparkles size={18} className="shrink-0 text-teal" />
            <p className="text-sm text-neutral-mid">Run a coverage analysis to check each regulation against the content of your policies.</p>
          </div>
        ) : (
          <div className="border-t border-gray-100">
            <StaleBanner info={stepInfo('coverage')} />
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
                        <button
                          onClick={() => markCoverageUpdated(reg.reference_key)}
                          title="Mark as updated. It moves to Completed and reappears if the next analysis still flags it."
                          className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light"
                        >
                          <Check size={12} /> Mark as updated
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
      {session?.accessToken && <PolicyHealthSection token={session.accessToken} userId={userId} stepInfo={stepInfo('out_of_date')} confirmRun={confirmRun} onRunComplete={onRunComplete} pendingPolicies={pipeline?.pending_policies ?? 0} />}

      {/* ── Cross-policy consistency ──────────────────────────────────────── */}
      {session?.accessToken && <PolicyConsistencySection token={session.accessToken} userId={userId} stepInfo={stepInfo('consistency')} confirmRun={confirmRun} onRunComplete={onRunComplete} pendingPolicies={pipeline?.pending_policies ?? 0} runState={runStateFor('consistency')} />}

      {/* ── CQC wording alignment ─────────────────────────────────────────── */}
      {session?.accessToken && <PolicyWordingAlignmentSection token={session.accessToken} userId={userId} stepInfo={stepInfo('wording')} confirmRun={confirmRun} onRunComplete={onRunComplete} pendingPolicies={pipeline?.pending_policies ?? 0} runState={runStateFor('wording')} />}

      {session?.accessToken && <RecentlyUpdatedSection token={session.accessToken} />}

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
      {(data.regulation_alerts ?? []).filter(a => !dismissedAlerts.has(a.id)).length > 0 && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="mb-2 flex items-center gap-2">
            <Info size={16} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-900">Regulations you&apos;re assessed against have been updated</p>
          </div>
          <p className="mb-3 text-xs text-amber-800">Review your policies for these, then re-run the coverage analysis. You can also generate a short training module on the update for your staff.</p>
          <div className="space-y-2">
            {(data.regulation_alerts ?? []).filter(a => !dismissedAlerts.has(a.id)).map(a => (
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
          {(data.unanswered_themes ?? []).length === 0 ? (
            <div className="flex items-center gap-3 px-6 py-5">
              <CheckCircle2 size={18} className="text-green-500" />
              <p className="text-sm text-neutral-mid">No recurring unanswered questions — great coverage.</p>
            </div>
          ) : (data.unanswered_themes ?? []).map(theme => (
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

      {data.meta.no_match_total === 0 && (data.unanswered_themes ?? []).length === 0 && (
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

// "Recently updated" — the policies the team has marked as updated (out-of-date and
// CQC-wording sections). Attestations survive re-scans and lapse automatically when a
// policy's content changes or its review interval passes; Undo puts one straight back.
function RecentlyUpdatedSection({ token }: { token: string }) {
  type Row = { policy_id: string; policy_name: string; section: 'out_of_date' | 'wording'; resolved_by: string | null; resolved_at: string }
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [loadErr, setLoadErr] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadErr(false)
    try { const r = await createApiClient(token).analytics.reviewResolutions(); setRows(r.resolutions) } catch { setLoadErr(true) }
  }, [token])
  useEffect(() => { load() }, [load])

  async function undo(row: Row) {
    setBusy(`${row.policy_id}:${row.section}`)
    try {
      const api = createApiClient(token)
      if (row.section === 'out_of_date') await api.analytics.lintReopen(row.policy_id)
      else await api.analytics.wordingReopen(row.policy_id)
      setRows(rs => rs.filter(r => !(r.policy_id === row.policy_id && r.section === row.section)))
    } catch { /* quiet */ }
    finally { setBusy(null) }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <CheckCircle2 size={16} className="shrink-0 text-green-600" />
        <h2 className="text-sm font-semibold text-neutral-dark">Recently updated</h2>
        {rows.length > 0 && (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700">{rows.length}</span>
        )}
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-100 px-6 py-4">
          <p className="mb-3 text-xs text-neutral-mid">
            Policies your team has marked as updated. They stay off the lists — even after a re-scan — until the
            policy&apos;s content changes or its review interval passes. Use Undo to put one back for review.
          </p>
          {loadErr && rows.length === 0 ? (
            <LoadError onRetry={load} />
          ) : rows.length === 0 ? (
            <p className="text-sm text-neutral-mid">Nothing marked as updated yet.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {rows.map(r => (
                <li key={`${r.policy_id}:${r.section}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-dark">{r.policy_name}</p>
                    <p className="text-xs text-neutral-mid">
                      {r.section === 'out_of_date' ? 'Out-of-date content' : 'CQC wording'} · marked by {r.resolved_by ?? 'admin'} on {fmt(r.resolved_at)}
                    </p>
                  </div>
                  <button onClick={() => undo(r)} disabled={busy === `${r.policy_id}:${r.section}`}
                    className="shrink-0 rounded-btn border border-gray-200 px-2.5 py-1 text-[11px] font-semibold text-neutral-mid hover:border-amber-400 hover:text-amber-700 disabled:opacity-50">
                    {busy === `${r.policy_id}:${r.section}` ? 'Undoing…' : 'Undo'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function PolicyHealthSection({ token, userId, stepInfo, confirmRun, onRunComplete, pendingPolicies }: { token: string; userId: string; stepInfo?: PipelineSection; confirmRun: (run: () => void) => void; onRunComplete: () => void; pendingPolicies: number }) {
  const [data, setData] = useState<LintData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [selected, setSelected] = useState<LintData['policies'][number] | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const cached = persistentCache.get<LintData>(`admin-policy-lint-${userId}`)
    if (cached) { setData(cached); setLoading(false) }
  }, [userId])

  const load = useCallback(() => {
    setLoadErr(false)
    createApiClient(token).analytics.policyLint()
      .then(d => { setData(d); persistentCache.set(`admin-policy-lint-${userId}`, d) })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false))
  }, [token, userId])

  useEffect(() => { load() }, [load])

  async function scan() {
    setScanning(true)
    try { await createApiClient(token).analytics.policyLintScan(); load() }
    catch { /* surfaced as no change */ }
    finally { setScanning(false); onRunComplete() }
  }

  // "Mark as updated" — hide this policy from the list (until the next scan re-flags it).
  async function markUpdated(policyId: string) {
    setData(d => (d ? { ...d, policies: d.policies.filter(p => p.policy_id !== policyId), policies_with_issues: Math.max(0, d.policies_with_issues - 1) } : d))
    setSelected(s => (s?.policy_id === policyId ? null : s))
    try { await createApiClient(token).analytics.lintResolve(policyId) } catch { /* optimistic */ }
  }

  const when = data?.scanned_at ? new Date(data.scanned_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null

  return (
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <FileClock size={16} className="shrink-0 text-amber-600" />
        <StepChip step={2} />
        <h2 className="text-sm font-semibold text-neutral-dark">Out-of-date content</h2>
        {data?.scanned && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">
            {data.policies_with_issues} {data.policies_with_issues === 1 ? 'policy' : 'policies'}
          </span>
        )}
        <StepMeta info={stepInfo} pendingPolicies={pendingPolicies} />
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (<div className="border-t border-gray-100">
      <StaleBanner info={stepInfo} />
      <div className="flex items-center justify-end px-6 pt-4">
        <button onClick={() => confirmRun(scan)} disabled={scanning}
          className="flex shrink-0 items-center gap-2 rounded-btn border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30 disabled:opacity-50">
          {scanning ? <><Loader2 size={13} className="animate-spin" /> Scanning…</> : <><RefreshCw size={13} /> {data?.scanned ? 'Re-scan policies' : 'Scan policies'}</>}
        </button>
      </div>
      {loadErr && !data ? (
        <div className="px-6 py-4"><LoadError onRetry={load} /></div>
      ) : loading && !data ? (
        <div className="px-6 py-6"><div className="h-16 animate-pulse rounded bg-gray-50" /></div>
      ) : !data?.scanned ? (
        <div className="flex items-center gap-3 px-6 py-6">
          <Sparkles size={18} className="shrink-0 text-teal" />
          <p className="text-sm text-neutral-mid">Scan your policy library for out-of-date content, superseded law and regulators, pandemic-era wording and unfilled template placeholders. This runs instantly and uses no AI credits.</p>
        </div>
      ) : (data.policies ?? []).length === 0 ? (
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
            {(data.policies ?? []).map(p => {
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
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setSelected(p)}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30"
                    >
                      <Wand2 size={12} /> Review &amp; fix
                    </button>
                    <button
                      onClick={() => markUpdated(p.policy_id)}
                      title="Hide this policy from the list. It reappears if the next scan still finds issues."
                      className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light"
                    >
                      <Check size={12} /> Mark as updated
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

const SOURCE_LABEL: Record<string, string> = { coverage: 'Regulation coverage', out_of_date: 'Out-of-date content', consistency: 'Cross-policy consistency', wording: 'CQC wording' }
const SOURCE_STYLE: Record<string, string> = { coverage: 'bg-red-50 text-red-600', out_of_date: 'bg-amber-50 text-amber-700', consistency: 'bg-indigo-50 text-indigo-600', wording: 'bg-purple-50 text-purple-600' }
const MSTATUS: Record<string, { label: string; cls: string }> = {
  published:        { label: 'Live',              cls: 'bg-green-50 text-green-700' },
  draft:            { label: 'Draft',             cls: 'bg-gray-100 text-neutral-mid' },
  active:           { label: 'To review',         cls: 'bg-gray-100 text-neutral-mid' },
  pending_manager:  { label: 'With care manager', cls: 'bg-amber-50 text-amber-700' },
  pending_external: { label: 'Awaiting external', cls: 'bg-sky-50 text-sky-700' },
}

const REVIEW_INTERVALS = [{ v: 182, label: '6 months' }, { v: 365, label: '12 months' }, { v: 730, label: '2 years' }, { v: 1095, label: '3 years' }]

// Inline "next review due" cell that an admin can set/edit on any listed policy. Saves via the
// existing policies.setReview, then updates the row locally so the derived due date + badge move.
type MatrixRowT = MatrixData['policies'][number]
function ReviewDateCell({ token, row, onSaved }: { token: string; row: MatrixRowT; onSaved: (r: MatrixRowT) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const inferredInterval = row.last_reviewed_at && row.next_review_due
    ? Math.round((new Date(row.next_review_due).getTime() - new Date(row.last_reviewed_at).getTime()) / 86_400_000)
    : 365
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(row.last_reviewed_at ? row.last_reviewed_at.slice(0, 10) : today)
  const [interval, setInterval] = useState(REVIEW_INTERVALS.some(i => i.v === inferredInterval) ? inferredInterval : 365)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')

  async function save() {
    setBusy(true); setErr('')
    try {
      await createApiClient(token).policies.setReview(row.policy_id, { last_reviewed_at: new Date(date).toISOString(), review_interval_days: interval })
      const nextDue = new Date(new Date(date).getTime() + interval * 86_400_000)
      onSaved({ ...row, last_reviewed_at: new Date(date).toISOString(), next_review_due: nextDue.toISOString(), review_overdue: Date.now() > nextDue.getTime() })
      setEditing(false)
    } catch (e: any) { setErr(e.message ?? 'Could not save the review date.') }
    finally { setBusy(false) }
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-[10px] text-neutral-mid">Last reviewed
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className="mt-0.5 block rounded-md border border-gray-200 px-2 py-1 text-xs" />
        </label>
        <label className="text-[10px] text-neutral-mid">Every
          <select value={interval} onChange={e => setInterval(Number(e.target.value))} className="mt-0.5 block rounded-md border border-gray-200 px-2 py-1 text-xs">
            {REVIEW_INTERVALS.map(i => <option key={i.v} value={i.v}>{i.label}</option>)}
          </select>
        </label>
        <button onClick={save} disabled={busy} className="inline-flex items-center gap-1 rounded-btn bg-teal px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
        </button>
        <button onClick={() => setEditing(false)} className="text-[11px] text-neutral-mid hover:text-neutral-dark">Cancel</button>
        {err && <p className="w-full text-[11px] text-red-600">{err}</p>}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2">
      {row.last_reviewed_at ? (
        <>
          <span className={row.review_overdue ? 'font-semibold text-red-600' : 'text-neutral-dark'}>{fmt(row.next_review_due)}</span>
          {row.review_overdue && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Due</span>}
          <button onClick={() => setEditing(true)} className="text-[11px] font-medium text-teal hover:underline">Edit</button>
        </>
      ) : (
        <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-[11px] font-medium text-teal hover:underline"><CalendarClock size={12} /> Set review date</button>
      )}
    </div>
  )
}

function PolicyMatrixSection({ token, userId }: { token: string; userId: string }) {
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)
  const [open, setOpen] = useState(false)
  const [openUpdated, setOpenUpdated] = useState(false)

  const load = useCallback(() => {
    setLoadErr(false)
    createApiClient(token).analytics.policyMatrix()
      .then(d => { setData(d); persistentCache.set(`admin-matrix-${userId}`, d) })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false))
  }, [token, userId])

  useEffect(() => {
    const cached = persistentCache.get<MatrixData>(`admin-matrix-${userId}`)
    if (cached) { setData(cached); setLoading(false) }
    load()
  }, [userId, load])

  const rows = data?.policies ?? []
  const updatedRows = rows.filter(r => !!r.updated_at)   // policies that have had a change adopted/published
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
  const updateRow = (r: MatrixRowT) => setData(d => (d ? { ...d, policies: d.policies.map(p => (p.policy_id === r.policy_id ? r : p)) } : d))

  return (
    <>
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <FileClock size={16} className="shrink-0 text-teal" />
        <h2 className="text-sm font-semibold text-neutral-dark">Policies to review</h2>
        {rows.length > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">{rows.length}</span>}
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (<div className="border-t border-gray-100">
        {loadErr && !data ? (
          <div className="px-6 py-4"><LoadError onRetry={load} /></div>
        ) : loading && !data ? (
          <div className="px-6 py-6"><div className="h-16 animate-pulse rounded bg-gray-50" /></div>
        ) : rows.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-5">
            <Info size={18} className="shrink-0 text-neutral-mid" />
            <p className="text-sm text-neutral-mid">Every policy flagged across the sections above appears here once, so you can set a next review date for each. Run the analyses above to populate it.</p>
          </div>
        ) : (
          <>
          <p className="px-6 pt-3 text-xs text-neutral-mid">Each policy that needs attention appears once. Set a next review date so it reminds you on your dashboard when it comes around.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-mid">
                  <th className="px-6 py-2.5">Policy</th>
                  <th className="px-3 py-2.5">Flagged in</th>
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
                    <td className="px-6 py-3"><ReviewDateCell token={token} row={r} onSaved={updateRow} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>)}
    </div>

    {/* Original "what have we updated" view — policies that have had a change adopted/published. */}
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpenUpdated(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <FileText size={16} className="shrink-0 text-teal" />
        <h2 className="text-sm font-semibold text-neutral-dark">Updated policies</h2>
        {updatedRows.length > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">{updatedRows.length}</span>}
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${openUpdated ? 'rotate-180' : ''}`} />
      </button>
      {openUpdated && (<div className="border-t border-gray-100">
        {loadErr && !data ? (
          <div className="px-6 py-4"><LoadError onRetry={load} /></div>
        ) : updatedRows.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-5">
            <Info size={18} className="shrink-0 text-neutral-mid" />
            <p className="text-sm text-neutral-mid">No policies have been updated yet. When you adopt and publish a change from any section above, it appears here with what drove the update and its status.</p>
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
                {updatedRows.map(r => (
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
                      {r.last_reviewed_at ? (
                        <>
                          <span className={r.review_overdue ? 'font-semibold text-red-600' : 'text-neutral-dark'}>{fmt(r.next_review_due)}</span>
                          {r.review_overdue && <span className="ml-1.5 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Due</span>}
                        </>
                      ) : <span className="text-xs text-neutral-mid">not set</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>)}
    </div>
    </>
  )
}

// ── Cross-policy consistency ─────────────────────────────────────────────────────
type ConsistencyData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['consistency']>>
type Conflict = ConsistencyData['conflicts'][number]

const CSEV: Record<string, string> = { high: 'bg-rose-50 text-rose-700', medium: 'bg-amber-50 text-amber-700', low: 'bg-slate-100 text-slate-600' }

function PolicyConsistencySection({ token, userId, stepInfo, confirmRun, onRunComplete, pendingPolicies, runState }: { token: string; userId: string; stepInfo?: PipelineSection; confirmRun: (run: () => void) => void; onRunComplete: () => void; pendingPolicies: number; runState?: SectionRunState }) {
  const [data, setData] = useState<ConsistencyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)
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
    setLoadErr(false)
    createApiClient(token).analytics.consistency()
      .then(d => { setData(d); persistentCache.set(`admin-consistency-${userId}`, d) })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false))
  }, [token, userId])

  useEffect(() => { load() }, [load])

  // The batch phase of a consistency run: claim extraction batches, then detection.
  // Shared by a fresh run (after start rebuilds the comparison sets) and by Resume,
  // which skips start so already-extracted claims are kept (no extra credits).
  async function driveBatches(api: ReturnType<typeof createApiClient>, toExtract: number) {
    let last = toExtract
    for (let i = 0; i < 300; i++) {
      const p = await api.analytics.consistencyBatch()
      setProgress(`Reading policies… ${Math.max(0, toExtract - p.remaining)}/${toExtract}`)
      if (p.remaining <= 0) break
      if (p.remaining >= last) { /* no progress — stop rather than spin */ break }
      last = p.remaining
    }
    setProgress('Comparing for contradictions…')
    await api.analytics.consistencyDetect()
  }

  async function run() {
    setRunning(true); setProgress('Grouping related policies…'); setRunErr('')
    const api = createApiClient(token)
    try {
      const { to_extract } = await api.analytics.consistencyStart()
      await driveBatches(api, to_extract)
      load()
    } catch (e: any) {
      setRunErr(e?.message?.includes('credit') ? 'AI credit limit reached — the check stopped. It will resume where it left off next time.' : (e?.message ?? 'The check could not finish.'))
    } finally { setRunning(false); setProgress(null); onRunComplete() }
  }

  // Resume an interrupted run: batch loop + detection only — never the start endpoint,
  // and no pre-run confirm, because this continues a run the tenant already began.
  async function resume() {
    setRunning(true); setProgress('Resuming…'); setRunErr('')
    const api = createApiClient(token)
    try {
      await driveBatches(api, runState?.remaining ?? 0)
      load()
    } catch (e: any) {
      setRunErr(e?.message?.includes('credit') ? 'AI credit limit reached — the check stopped. It will resume where it left off next time.' : (e?.message ?? 'The check could not finish.'))
    } finally { setRunning(false); setProgress(null); onRunComplete() }
  }

  // "Mark as updated" — dismiss this conflict (until the next check re-detects it).
  async function markUpdated(conflict: Conflict) {
    setData(d => (d ? { ...d, conflicts: d.conflicts.filter(c => c.id !== conflict.id) } : d))
    setSelected(s => (s?.id === conflict.id ? null : s))
    try { await createApiClient(token).analytics.consistencyDismiss(conflict.key) } catch { /* optimistic */ }
  }

  const when = data?.analysed_at ? new Date(data.analysed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
  const conflicts = data?.conflicts ?? []

  return (
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <ShieldAlert size={16} className="shrink-0 text-indigo-500" />
        <StepChip step={3} />
        <h2 className="text-sm font-semibold text-neutral-dark">Cross-policy consistency</h2>
        {data?.analysed && conflicts.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">{conflicts.length} conflict{conflicts.length === 1 ? '' : 's'}</span>
        )}
        <StepMeta info={stepInfo} pendingPolicies={pendingPolicies} />
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Interrupted-run banner: visible even when the section is collapsed. */}
      <ResumeBanner state={runState} resuming={running} onResume={resume} />

      {open && (<div className="border-t border-gray-100">
        <StaleBanner info={stepInfo} />
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-4">
          <p className="text-xs text-neutral-mid">Finds where two policies contradict each other on the same point — conflicting timeframes, routes, roles or definitions, and drift between near-duplicate policies.</p>
          <button onClick={() => confirmRun(run)} disabled={running}
            className="flex shrink-0 items-center gap-2 rounded-btn border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30 disabled:opacity-50">
            {running ? <><Loader2 size={13} className="animate-spin" /> {progress ?? 'Running…'}</> : <><RefreshCw size={13} /> {data?.analysed ? 'Re-run check' : 'Run consistency check'}</>}
          </button>
        </div>
        {runErr && <p className="px-6 pt-2 text-xs text-red-600">{runErr}</p>}

        {loadErr && !data ? (
          <div className="px-6 py-4"><LoadError onRetry={load} /></div>
        ) : loading && !data ? (
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
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => setSelected(c)}
                      className="inline-flex items-center gap-1.5 rounded-btn border border-teal/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30">
                      <Wand2 size={12} /> Review &amp; resolve
                    </button>
                    <button onClick={() => markUpdated(c)}
                      title="Hide this conflict. It reappears if the next check still detects it."
                      className="inline-flex items-center gap-1.5 rounded-btn border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light">
                      <Check size={12} /> Mark as updated
                    </button>
                  </div>
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

// ── CQC wording alignment: its own analysis, checked per policy over the whole library ──
type WordingData = Awaited<ReturnType<ReturnType<typeof createApiClient>['analytics']['wordingAlignment']>>

function PolicyWordingAlignmentSection({ token, userId, stepInfo, confirmRun, onRunComplete, pendingPolicies, runState }: { token: string; userId: string; stepInfo?: PipelineSection; confirmRun: (run: () => void) => void; onRunComplete: () => void; pendingPolicies: number; runState?: SectionRunState }) {
  const [data, setData]       = useState<WordingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState(false)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [runErr, setRunErr]   = useState('')
  const [open, setOpen]       = useState(false)
  const [selected, setSelected] = useState<WordingData['policies'][number] | null>(null)

  useEffect(() => {
    const cached = persistentCache.get<WordingData>(`admin-wording-${userId}`)
    if (cached) { setData(cached); setLoading(false) }
  }, [userId])

  const load = useCallback(() => {
    setLoadErr(false)
    createApiClient(token).analytics.wordingAlignment()
      .then(d => { setData(d); persistentCache.set(`admin-wording-${userId}`, d) })
      .catch(() => setLoadErr(true))
      .finally(() => setLoading(false))
  }, [token, userId])
  useEffect(() => { load() }, [load])

  // The batch phase of a wording run: loop the (idempotent, resumable) batch endpoint
  // until nothing remains. Shared by a fresh run (after the destructive start) and by
  // Resume, which skips start so already-checked policies are kept (no extra credits).
  async function driveBatches(api: ReturnType<typeof createApiClient>, fallbackTotal: number) {
    for (let i = 0; i < 800; i++) {
      const p = await api.analytics.wordingAlignmentBatch()
      setProgress(`Checking policies… ${p.analysed}/${p.total || fallbackTotal}`)
      if (p.remaining <= 0) break
    }
  }

  async function run() {
    setRunning(true); setProgress('Preparing…'); setRunErr('')
    const api = createApiClient(token)
    try {
      const { total } = await api.analytics.wordingAlignmentStart()
      await driveBatches(api, total)
      load()
    } catch (e: any) {
      setRunErr(e?.message?.includes('credit') ? 'AI credit limit reached — the check stopped. It resumes where it left off next time.' : (e?.message ?? 'The check could not finish.'))
      load()
    } finally { setRunning(false); setProgress(null); onRunComplete() }
  }

  // Resume an interrupted run: the batch loop only — never the start endpoint (which
  // wipes finished results), and no pre-run confirm, because this continues a run the
  // tenant already began.
  async function resume() {
    setRunning(true); setProgress('Resuming…'); setRunErr('')
    const api = createApiClient(token)
    try {
      await driveBatches(api, runState?.total ?? 0)
      load()
    } catch (e: any) {
      setRunErr(e?.message?.includes('credit') ? 'AI credit limit reached — the check stopped. It resumes where it left off next time.' : (e?.message ?? 'The check could not finish.'))
      load()
    } finally { setRunning(false); setProgress(null); onRunComplete() }
  }

  // "Mark as updated" — hide this policy from the wording list (until the next run re-flags it).
  async function markUpdated(policyId: string) {
    setData(d => (d ? { ...d, policies: d.policies.filter(p => p.policy_id !== policyId) } : d))
    setSelected(s => (s?.policy_id === policyId ? null : s))
    try { await createApiClient(token).analytics.wordingResolve(policyId) } catch { /* optimistic */ }
  }

  const when = data?.analysed_at ? new Date(data.analysed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null
  const withSuggestions = (data?.policies ?? []).filter(p => p.has_suggestions)
  const analysed = data?.analysed ?? 0
  const cleanCount = Math.max(0, analysed - withSuggestions.length)

  return (
    <div className="mb-6 rounded-card border border-gray-100 bg-white shadow-card">
      <button onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-2 px-6 py-4 text-left">
        <Sparkles size={16} className="shrink-0 text-indigo-500" />
        <StepChip step={4} />
        <h2 className="text-sm font-semibold text-neutral-dark">CQC wording alignment</h2>
        {analysed > 0 && withSuggestions.length > 0 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-neutral-mid">{data!.total_suggestions} suggestion{data!.total_suggestions === 1 ? '' : 's'} · {withSuggestions.length} polic{withSuggestions.length === 1 ? 'y' : 'ies'}</span>
        )}
        <StepMeta info={stepInfo} pendingPolicies={pendingPolicies} />
        <ChevronDown size={15} className={`ml-auto shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Interrupted-run banner: visible even when the section is collapsed. */}
      <ResumeBanner state={runState} resuming={running} onResume={resume} />

      {open && (<div className="border-t border-gray-100">
        <StaleBanner info={stepInfo} />
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-4">
          <p className="max-w-2xl text-xs text-neutral-mid">Checks whether each policy <strong>reads</strong> the person-centred, outcomes-focused way the CQC Single Assessment Framework expects, and drafts a rewrite you can adopt. Re-running checks every policy and uses AI credits, so it runs only when you ask.</p>
          <button onClick={() => confirmRun(run)} disabled={running}
            className="flex shrink-0 items-center gap-2 rounded-btn border border-teal/30 bg-white px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30 disabled:opacity-50">
            {running ? <><Loader2 size={13} className="animate-spin" /> {progress ?? 'Running…'}</> : <><RefreshCw size={13} /> {analysed > 0 ? 'Re-run analysis' : 'Run wording analysis'}</>}
          </button>
        </div>
        {runErr && <p className="px-6 pt-2 text-xs text-red-600">{runErr}</p>}

        {loadErr && !data ? (
          <div className="px-6 py-4"><LoadError onRetry={load} /></div>
        ) : loading && !data ? (
          <div className="px-6 py-6"><div className="h-16 animate-pulse rounded bg-gray-50" /></div>
        ) : analysed === 0 ? (
          <div className="flex items-center gap-3 px-6 py-6">
            <Sparkles size={18} className="shrink-0 text-teal" />
            <p className="text-sm text-neutral-mid">Run the analysis to check every policy&rsquo;s wording against the CQC Single Assessment Framework. Run <strong>Regulation coverage</strong> first, so each policy is matched to the quality statements it supports.</p>
          </div>
        ) : withSuggestions.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-5">
            <CheckCircle2 size={18} className="text-green-500" />
            <p className="text-sm text-neutral-mid">All {analysed} policies read in a person-centred way for the quality statements they support.{when ? ` Last checked ${when}.` : ''}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-gray-50 px-6 py-2.5 text-xs text-neutral-mid">
              <span><strong className="text-neutral-dark">{withSuggestions.length}</strong> polic{withSuggestions.length === 1 ? 'y' : 'ies'} with wording to improve · {cleanCount} read well</span>
              {when && <span className="ml-auto text-gray-400">Checked {when}</span>}
            </div>
            <div className="divide-y divide-gray-50">
              {withSuggestions.map(p => (
                <div key={p.policy_id} className="flex items-center gap-3 px-6 py-3.5">
                  <FileText size={14} className="shrink-0 text-neutral-mid" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-dark">{p.policy_name}</p>
                    <p className="truncate text-xs text-neutral-mid">{p.message}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">{p.alignments.length}</span>
                  <button onClick={() => setSelected(p)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-btn border border-teal/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-teal-light/30">
                    <Wand2 size={12} /> Review &amp; resolve
                  </button>
                  <button onClick={() => markUpdated(p.policy_id)}
                    title="Hide this policy from the list. It reappears if the next run still finds wording to improve."
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-btn border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light">
                    <Check size={12} /> Mark as updated
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>)}

      {selected && (
        <WordingReviewModal
          token={token}
          policyId={selected.policy_id}
          policyName={selected.policy_name}
          statements={selected.statements}
          alignments={selected.alignments}
          onClose={() => setSelected(null)}
          onAdopted={load}
        />
      )}
    </div>
  )
}
