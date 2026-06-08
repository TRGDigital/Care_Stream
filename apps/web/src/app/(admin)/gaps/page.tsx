'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { pageCache } from '@/lib/page-cache'
import { CheckCircle2, ChevronDown, FileQuestion, FileText, Info, Loader2, RefreshCw, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react'

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
  const [data,    setData]    = useState<GapsData | null>(() => pageCache.get<GapsData>('admin-gaps') ?? null)
  const [loading, setLoading] = useState(() => pageCache.get<GapsData>('admin-gaps') === undefined)
  const [error,   setError]   = useState('')
  const [analysing, setAnalysing] = useState(false)

  const load = useCallback(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).analytics.gaps()
      .then(d => { setData(d); pageCache.set('admin-gaps', d) })
      .catch((e: any) => setError(e.message ?? 'Failed to load gap analysis'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  useEffect(() => { load() }, [load])

  async function runAnalysis() {
    if (!session?.accessToken) return
    setAnalysing(true); setError('')
    try {
      await createApiClient(session.accessToken).analytics.analyseGaps()
      load()
    } catch (e: any) {
      setError(e.message ?? 'Coverage analysis failed — please try again.')
    } finally {
      setAnalysing(false)
    }
  }

  if (loading) {
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

  const gapRegs     = data.regulation_gaps.filter(r => r.status === 'gap')
  const partialRegs = data.regulation_gaps.filter(r => r.status === 'partial')
  const coveredRegs = data.regulation_gaps.filter(r => r.status === 'covered')
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
          {analysing ? <><Loader2 size={15} className="animate-spin" /> Analysing…</> : <><RefreshCw size={15} /> {data.analysed ? 'Re-run analysis' : 'Run coverage analysis'}</>}
        </button>
      </div>

      <HelpAccordion title="How Policy Gap Detection works">
        <p><strong className="text-neutral-dark">What this page is for</strong> — it shows where your policies may not meet the regulations that apply to a registered care setting, and what staff are asking that your policies don&apos;t answer. Use it to find and close gaps before a CQC inspection.</p>
        <p><strong className="text-neutral-dark">Coverage is read from your policy content, not titles</strong> — for each regulation, CareStream finds the most relevant passages across <em>all</em> your uploaded policies (using the same search that powers the staff chat) and an AI auditor judges, from that content alone, whether your policies substantively address it. So a regulation is only flagged when your documents genuinely don&apos;t cover it — not just because no policy happens to be named after it.</p>
        <p><strong className="text-neutral-dark">The three results</strong> — <strong className="text-green-600">Covered</strong>: a policy clearly addresses it (the evidence policy is named). <strong className="text-amber-700">Partial</strong>: it&apos;s touched on but incomplete — the policy that partly covers it is named. <strong className="text-red-600">Gap</strong>: nothing in your policies addresses it.</p>
        <p><strong className="text-neutral-dark">Running it</strong> — click <strong className="text-neutral-dark">Run coverage analysis</strong> to check all regulations. It reads through your policies and takes about a minute; the result is saved, so the page loads instantly afterwards. <strong className="text-neutral-dark">Re-run it whenever you upload or update policies</strong> to refresh the picture.</p>
        <p><strong className="text-neutral-dark">Unanswered questions</strong> — separately, this page clusters questions staff asked (in chat, email or WhatsApp) that the assistant couldn&apos;t answer from your policies over the last 90 days. Recurring themes are real-world evidence of a missing or unclear policy.</p>
        <p><strong className="text-neutral-dark">Coverage score</strong> — the headline percentage counts fully-covered regulations, plus partials at half weight, out of the total. It only appears once you&apos;ve run the analysis.</p>
      </HelpAccordion>

      {/* Prompt to run the (content-based) analysis if it's never been run */}
      {!data.analysed && (
        <div className="mb-8 flex items-start gap-3 rounded-card border border-teal/20 bg-teal-light/20 px-6 py-5">
          <Sparkles size={20} className="mt-0.5 shrink-0 text-teal" />
          <div>
            <p className="font-semibold text-neutral-dark">Run a coverage analysis to check your regulation gaps</p>
            <p className="mt-0.5 text-sm text-neutral-mid">CareStream reads inside your uploaded policies and judges each regulation against their actual content — not just policy titles. This takes about a minute.</p>
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Unanswered question themes */}
        <div className="rounded-card border border-gray-100 bg-white shadow-card">
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
                    <li key={i} className="truncate text-xs text-neutral-mid">
                      &ldquo;{q}&rdquo;
                    </li>
                  ))}
                </ul>
                <div className="mt-3">
                  <a
                    href="/policies"
                    className="text-xs font-semibold text-teal hover:underline"
                  >
                    Upload a policy to cover this →
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regulation coverage */}
        <div className="rounded-card border border-gray-100 bg-white shadow-card">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <ShieldAlert size={16} className="text-red-500" />
            <h2 className="text-sm font-semibold text-neutral-dark">Regulation coverage</h2>
          </div>

          {!data.analysed ? (
            <div className="flex items-center gap-3 px-6 py-8">
              <Sparkles size={18} className="shrink-0 text-teal" />
              <p className="text-sm text-neutral-mid">Run a coverage analysis to check each regulation against the content of your policies.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-50">
                {gapRegs.length === 0 && partialRegs.length === 0 ? (
                  <div className="flex items-center gap-3 px-6 py-5">
                    <CheckCircle2 size={18} className="text-green-500" />
                    <p className="text-sm text-neutral-mid">Every regulation is addressed by your policies — well done.</p>
                  </div>
                ) : [...gapRegs, ...partialRegs].map(reg => (
                  <div key={reg.reference_key} className="px-6 py-4">
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <p className="font-semibold text-neutral-dark">{reg.official_name}</p>
                      <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${reg.status === 'gap' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                        {reg.status === 'gap' ? 'Gap' : 'Partial'}
                      </span>
                    </div>
                    <p className="mb-1 text-xs text-neutral-mid">{reg.summary}</p>
                    {reg.reason && <p className="mb-2 text-xs italic text-neutral-mid">{reg.reason}</p>}
                    {reg.status === 'partial' && reg.evidence_policy_name && (
                      <p className="mb-2 flex items-center gap-1.5 text-xs text-neutral-mid"><FileText size={12} className="text-teal" /> Partially covered by <span className="font-medium text-neutral-dark">{reg.evidence_policy_name}</span></p>
                    )}
                    <a href="/policies" className="text-xs font-semibold text-teal hover:underline">
                      {reg.status === 'gap' ? 'Add a policy →' : 'Strengthen this policy →'}
                    </a>
                  </div>
                ))}
              </div>

              {coveredRegs.length > 0 && (
                <details className="border-t border-gray-100">
                  <summary className="cursor-pointer px-6 py-3 text-xs font-medium text-neutral-mid hover:text-neutral-dark">
                    {coveredRegs.length} regulation{coveredRegs.length > 1 ? 's' : ''} fully covered
                  </summary>
                  <div className="divide-y divide-gray-50">
                    {coveredRegs.map(reg => (
                      <div key={reg.reference_key} className="flex items-start gap-3 px-6 py-3">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-green-500" />
                        <div className="min-w-0">
                          <p className="text-sm text-neutral-dark">{reg.official_name}</p>
                          {reg.evidence_policy_name && <p className="text-xs text-neutral-mid">Covered by {reg.evidence_policy_name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          )}
        </div>

      </div>

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
