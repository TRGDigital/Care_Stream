'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api-client'
import { AiUsageCards } from '@/components/ai-usage'
import { SetupChecklist } from '@/components/admin/setup-checklist'
import { PlanCard } from '@/components/admin/plan-card'
import { persistentCache } from '@/lib/page-cache'
import { BookOpen, ChevronDown, FileText, Info, Lightbulb, Mail, MessageSquare, Mic, Users, CalendarClock, Loader2, RefreshCw, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

const whatsappIconPath = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"

// recharts is heavy (~90KB) — lazy-load the shared chart component.
const QueryVolumeChart = dynamic(() => import('@/components/query-volume-chart'), {
  ssr: false,
  loading: () => <div className="flex h-[220px] items-center justify-center"><p className="text-sm text-neutral-mid">Loading chart…</p></div>,
})

const LANG_NAMES: Record<string, string> = {
  eng: 'English', spa: 'Spanish', pol: 'Polish', ron: 'Romanian',
  fra: 'French',  deu: 'German',  por: 'Portuguese', hin: 'Hindi',
  tgl: 'Tagalog', yor: 'Yoruba',  ben: 'Bengali',    urd: 'Urdu',
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function ChannelBadge({ channel }: { channel: string }) {
  if (channel === 'email')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
        <Mail size={10} /> Email
      </span>
    )
  if (channel === 'whatsapp')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d={whatsappIconPath}/></svg>
        WhatsApp
      </span>
    )
  if (channel === 'voice')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
        <Mic size={10} /> Voice
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-xs font-medium text-teal">
      <MessageSquare size={10} /> Chat
    </span>
  )
}

// ─── Help accordion (per-block explanations) ─────────────────────────────────

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

// ─── Sidebar guide (top-of-page orientation panel) ───────────────────────────

function SidebarGuide() {
  const [guideOpen, setGuideOpen] = useState(false)
  const [open,      setOpen]      = useState<string | null>(null)
  const toggle = (s: string) => setOpen(o => o === s ? null : s)

  const sections = [
    {
      name: 'Overview',
      summary: 'Dashboard and Query history',
      content: (
        <>
          <p><strong className="text-neutral-dark">Dashboard</strong> — your real-time snapshot of system activity. See how many active policies you have, how many staff are registered, and how many queries have been asked. The channel cards and chart below show exactly when and how staff are using CareStreamAI.</p>
          <p><strong className="text-neutral-dark">Query history</strong> — a complete, searchable log of every question your staff have asked the AI. You can filter by channel, date range, and language, and click into any query to see the full question and the AI's response.</p>
        </>
      ),
    },
    {
      name: 'Content',
      summary: 'Policies and Knowledge Base',
      content: (
        <>
          <p><strong className="text-neutral-dark">Policies</strong> — upload your care home's policies, procedures, and staff handbooks here. CareStreamAI reads and processes each document so the AI can answer questions directly from your own content. Supported formats: PDF, DOCX, TXT. Once a policy is marked "active" the AI can use it immediately.</p>
          <p><strong className="text-neutral-dark">Knowledge Base</strong> — question-and-answer pairs extracted from your policies, plus any entries you add manually. This is the AI's searchable knowledge store. The more complete and up-to-date your policies are, the more accurate the answers your staff will receive.</p>
        </>
      ),
    },
    {
      name: 'Team',
      summary: 'Staff management',
      content: (
        <>
          <p><strong className="text-neutral-dark">Staff</strong> — add and manage your team members. Each staff member gets access to CareStreamAI through their preferred channel (Chat Hub, WhatsApp, Email, or Voice). You can assign job roles, grant or remove admin access, and reset passwords from this section. Staff only see information drawn from your own uploaded policies — they cannot access another organisation's data.</p>
        </>
      ),
    },
    {
      name: 'Training',
      summary: 'Compliance, AI-generated assessments, and question history',
      content: (
        <>
          <p><strong className="text-neutral-dark">Compliance tab</strong> — assign statutory and specialist training modules to individual staff or your whole team. The compliance grid shows every staff member against every assigned module so you can see at a glance who is complete, in progress, overdue, or expiring soon. Click any cell to open the full training record including answers given and a manual completion option.</p>
          <p><strong className="text-neutral-dark">Adhoc Training Modules &amp; Questions tab</strong> — build and manage the multiple-choice question sets used to assess staff. Each question has four options (A–D) with one correct answer. Use <strong className="text-neutral-dark">Generate questions</strong> to create a full set using CareStreamAI's care sector expertise and your <strong className="text-neutral-dark">Knowledge seed</strong> — information specific to your setting — or write your own and use <strong className="text-neutral-dark">Generate answer options</strong> to fill in the choices. Once all questions are complete, <strong className="text-neutral-dark">lock the question set</strong> to create a dated audit record. Locked questions cannot be edited until unlocked — this ensures the integrity of your training evidence over time.</p>
          <p><strong className="text-neutral-dark">Conversational training</strong> — once assigned, CareStreamAI delivers training questions directly to staff via WhatsApp, email, or Chat Hub. Staff answer with a single letter (A, B, C, D). Every answer is recorded against the exact question text used at that time, and the compliance record updates instantly. No app, no login, no separate system.</p>
          <p><strong className="text-neutral-dark">Question History tab</strong> — every saved question set is version-stamped and stored here. You can see exactly which questions were in use on any given date, filter by date range, and expand any version to review the full question set with correct answers. This gives you a complete, traceable audit trail for CQC inspections.</p>
          <p><strong className="text-neutral-dark">Renewal reminders</strong> — automatic reminders are sent to staff at 90, 30, and 7 days before their renewal date. Managers receive a digest email listing all upcoming renewals so nothing falls through the cracks.</p>
          <p><strong className="text-neutral-dark">CQC evidence</strong> — training compliance data, answer records, and knowledge gap analysis are all included in the CQC Inspection Evidence Report. The Analytics page highlights questions with a high incorrect-answer rate across your team, identifying where training needs reinforcing.</p>
        </>
      ),
    },
    {
      name: 'Reporting',
      summary: 'Analytics, CQC Report, and Policy Gaps',
      content: (
        <>
          <p><strong className="text-neutral-dark">Analytics</strong> — charts and trends showing query volumes over time, peak usage periods, most-asked topics, and a language breakdown of your staff's queries. Useful for understanding how the system is being used and identifying training needs.</p>
          <p><strong className="text-neutral-dark">CQC Report</strong> — a structured summary of AI interactions formatted as inspection evidence. This report demonstrates staff engagement with policies and the specific topics and regulatory areas they are actively referencing — useful for CQC well-led inspections.</p>
          <p><strong className="text-neutral-dark">Policy Gaps</strong> — a list of questions that didn't match any policy in your knowledge base. These are topics your staff are asking about that your current policies don't yet cover. Review this regularly to prioritise which policies to write or update next.</p>
        </>
      ),
    },
    {
      name: 'Admin',
      summary: 'Onboarding, Billing, and Settings',
      content: (
        <>
          <p><strong className="text-neutral-dark">Onboarding</strong> — build structured induction flows for new starters. Assign policies to read and questions to answer; the system tracks completion and reminds staff of outstanding steps. Ideal for evidencing induction for CQC purposes.</p>
          <p><strong className="text-neutral-dark">Billing</strong> — manage your subscription plan, view your current usage against plan limits, and update payment details. You can see how many queries and staff users you have used out of your plan allowance, and <strong className="text-neutral-dark">upgrade your plan</strong> to unlock more features and a bigger monthly training allocation.</p>
          <p><strong className="text-neutral-dark">Settings</strong> — configure your organisation name, inbound email domain, staff job role list, branding sign-off, and notification preferences. Changes here affect how staff interact with the AI across all channels. The <strong className="text-neutral-dark">Danger zone</strong> at the bottom lets an admin delete the account (cancels billing, signs everyone out, and queues your data for erasure, recoverable by support for 30 days).</p>
        </>
      ),
    },
  ]

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-teal/20 bg-teal-light/20">
      {/* Outer toggle */}
      <button
        type="button"
        onClick={() => setGuideOpen(o => !o)}
        className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left transition-colors hover:bg-teal-light/40"
      >
        <BookOpen size={15} className="shrink-0 text-teal" />
        <h2 className="flex-1 text-sm font-semibold text-teal">Your guide to CareStreamAI</h2>
        <span className="mr-2 text-xs text-neutral-mid">{guideOpen ? 'Collapse' : 'Expand guide'}</span>
        <ChevronDown size={13} className={`shrink-0 text-teal transition-transform ${guideOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Inner section accordions */}
      {guideOpen && (
        <div className="divide-y divide-teal/10 border-t border-teal/10">
          {sections.map(({ name, summary, content }) => (
            <div key={name}>
              <button
                type="button"
                onClick={() => toggle(name)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-teal-light/30"
              >
                <span className="w-20 shrink-0 text-xs font-bold uppercase tracking-wide text-teal">{name}</span>
                <span className="flex-1 text-xs text-neutral-mid">{summary}</span>
                <ChevronDown size={13} className={`shrink-0 text-teal transition-transform ${open === name ? 'rotate-180' : ''}`} />
              </button>
              {open === name && (
                <div className="space-y-2.5 bg-white/50 px-5 py-4 text-xs leading-relaxed text-neutral-mid">
                  {content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type DashboardCache = {
  stats:     { activePolicies: string; staffCount: string; totalQueries: string }
  queries:   any[]
  chartData: Array<{ date: string; chat: number; email: number; whatsapp: number; voice: number }>
  channels:  { chat: number; email: number; whatsapp: number; voice: number }
  followUp:  { staff: Array<{ id: string; name: string; job_role: string | null; unreviewed: number }>; summary: { total: number; total_gaps: number } } | null
  dueReview?: DuePolicy[]
}

type DuePolicy = { policy_id: string; name: string; last_reviewed_at: string; next_review_due: string; days_overdue: number }

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.email ?? 'guest'
  const [dueReview, setDueReview] = useState<DuePolicy[]>([])
  const [reReviewing, setReReviewing] = useState(false)
  const [queries,    setQueries]    = useState<any[]>([])
  const [chartData,  setChartData]  = useState<Array<{ date: string; chat: number; email: number; whatsapp: number; voice: number }>>([])
  const [chartDays,  setChartDays]  = useState(30)
  const [loading,    setLoading]    = useState(true)
  const [channels,   setChannels]   = useState({ chat: 0, email: 0, whatsapp: 0, voice: 0 })
  const [stats,      setStats]      = useState({ activePolicies: '—', staffCount: '—', totalQueries: '—' })
  const [followUp,   setFollowUp]   = useState<{ staff: Array<{ id: string; name: string; job_role: string | null; unreviewed: number }>; summary: { total: number; total_gaps: number } } | null>(null)

  // Hydrate from the persistent (localStorage) cache after mount — never during
  // render, to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    const cached = persistentCache.get<DashboardCache>(`admin-dashboard-${userId}`)
    if (cached) {
      setQueries(cached.queries); setChartData(cached.chartData); setChannels(cached.channels); setStats(cached.stats); setFollowUp(cached.followUp ?? null); setDueReview(cached.dueReview ?? [])
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)

    Promise.allSettled([
      api.policies.list({ status: 'active', limit: '1' }),
      api.users.list(),
      api.query.list({ limit: '20' }),
      api.analytics.dailyActivity(chartDays),
      api.analytics.get(),
      api.analytics.followUp(),
      api.analytics.policiesDueForReview().catch(() => ({ policies: [] })),
    ]).then(([policiesRes, usersRes, queriesRes, chartRes, analyticsRes, followUpRes, dueRes]) => {
      const nextFollowUp = followUpRes.status === 'fulfilled' ? followUpRes.value : null
      setFollowUp(nextFollowUp)
      const nextDueReview = dueRes.status === 'fulfilled' ? (dueRes.value?.policies ?? []) : []
      setDueReview(nextDueReview)
      const nextStats = {
        activePolicies: policiesRes.status === 'fulfilled' ? String(policiesRes.value?.total ?? '—') : '—',
        // Count ACTIVE staff only — deactivated members shouldn't inflate the headcount.
        staffCount:     usersRes.status   === 'fulfilled' ? String(((usersRes.value?.users ?? []) as any[]).filter(u => u?.is_active !== false).length) : '—',
        totalQueries:   queriesRes.status === 'fulfilled' ? String(queriesRes.value?.total ?? '—') : '—',
      }
      const nextQueries  = queriesRes.status === 'fulfilled' ? (queriesRes.value?.queries ?? queriesRes.value?.items ?? []) : queries
      const nextChart    = chartRes.status === 'fulfilled' ? chartRes.value.series.map((s: any) => ({ voice: 0, ...s })) : chartData
      let   nextChannels = channels
      if (analyticsRes.status === 'fulfilled') {
        const ch = analyticsRes.value?.basic?.queries_by_channel
        if (ch) nextChannels = { chat: ch.chat ?? 0, email: ch.email ?? 0, whatsapp: ch.whatsapp ?? 0, voice: ch.voice ?? 0 }
      }
      setStats(nextStats); setQueries(nextQueries); setChartData(nextChart); setChannels(nextChannels)
      persistentCache.set<DashboardCache>(`admin-dashboard-${userId}`, { stats: nextStats, queries: nextQueries, chartData: nextChart, channels: nextChannels, followUp: nextFollowUp, dueReview: nextDueReview })
    }).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, chartDays])

  const totalChannelQueries = channels.chat + channels.email + channels.voice

  // Re-run the out-of-date scan for the due policies and open /gaps to review them.
  async function reReviewDuePolicies() {
    if (!session?.accessToken || dueReview.length === 0) return
    setReReviewing(true)
    try { await createApiClient(session.accessToken).analytics.reReviewPolicies(dueReview.map(p => p.policy_id)) } catch { /* still navigate */ }
    router.push('/gaps')
  }

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  // Mark one policy reviewed (records today), removing it from "due" here and on the hub / admin policies.
  async function markReviewedDue(policyId: string) {
    if (!session?.accessToken) return
    try { await createApiClient(session.accessToken).policies.setReview(policyId, { last_reviewed_at: new Date().toISOString() }) }
    catch { return }
    setDueReview(list => {
      const n = list.filter(x => x.policy_id !== policyId)
      const cached = persistentCache.get<DashboardCache>(`admin-dashboard-${userId}`)
      if (cached) persistentCache.set(`admin-dashboard-${userId}`, { ...cached, dueReview: n })
      return n
    })
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Dashboard</h1>

      {/* Policies due for review — surfaces when a policy's review date has come around. */}
      {dueReview.length > 0 && (
        <div className="mb-6 rounded-card border border-red-200 bg-red-50/50 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <CalendarClock size={16} className="text-red-600" />
            <h2 className="text-sm font-semibold text-neutral-dark">Policies due for review</h2>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">{dueReview.length}</span>
            <button
              onClick={reReviewDuePolicies}
              disabled={reReviewing}
              className="ml-auto inline-flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
            >
              {reReviewing ? <><Loader2 size={13} className="animate-spin" /> Re-reviewing…</> : <><RefreshCw size={13} /> Re-review these policies</>}
            </button>
          </div>
          <p className="mb-3 text-xs text-neutral-mid">These policies have reached the review date you set. Re-review them to re-check for out-of-date content and refresh their status, then run the AI analyses on the Policy Gap Detection page if needed.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {dueReview.slice(0, 9).map(p => (
              <div key={p.policy_id} className="flex items-center justify-between gap-2 rounded-lg border border-red-100 bg-white px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-dark">{p.name}</p>
                  <p className="truncate text-xs text-neutral-mid">Due {fmtDate(p.next_review_due)}{p.days_overdue > 0 ? ` · ${p.days_overdue}d over` : ''}</p>
                </div>
                <button onClick={() => markReviewedDue(p.policy_id)} className="inline-flex shrink-0 items-center gap-1 rounded-btn bg-teal px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-teal-dark"><Check size={11} /> Reviewed</button>
              </div>
            ))}
          </div>
          {dueReview.length > 9 && <p className="mt-2 text-xs text-neutral-mid">+{dueReview.length - 9} more.</p>}
        </div>
      )}

      {session?.accessToken && (session.user as any)?.tenantId && (
        <SetupChecklist token={session.accessToken} tenantId={(session.user as any).tenantId} tier={(session.user as any)?.tier} />
      )}

      {session?.accessToken && (session.user as any)?.tier !== 'training_only' && <PlanCard token={session.accessToken} />}

      <SidebarGuide />

      {/* AI usage this month */}
      {session?.accessToken && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-mid">AI usage this month</h2>
          <AiUsageCards token={session.accessToken} />
        </div>
      )}

      {/* Top stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Active policies', value: stats.activePolicies, Icon: FileText,      bg: 'bg-blue-50',       border: 'border-blue-200',   valueColor: 'text-blue-700',   iconBg: 'bg-blue-100',   iconColor: 'text-blue-500'   },
          { label: 'Staff members',   value: stats.staffCount,     Icon: Users,         bg: 'bg-purple-50',     border: 'border-purple-200', valueColor: 'text-purple-700', iconBg: 'bg-purple-100', iconColor: 'text-purple-500' },
          { label: 'Total queries',   value: stats.totalQueries,   Icon: MessageSquare, bg: 'bg-teal-light/50', border: 'border-teal/20',    valueColor: 'text-teal',       iconBg: 'bg-teal/10',    iconColor: 'text-teal'       },
        ].map(card => (
          <div key={card.label} className={`rounded-card border p-6 shadow-card ${card.bg} ${card.border}`}>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-mid">{card.label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.iconBg}`}>
                <card.Icon size={18} className={card.iconColor} />
              </div>
            </div>
            <p className={`text-3xl font-bold ${card.valueColor}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Needs follow-up — staff with unreviewed knowledge gaps */}
      {followUp && followUp.staff.length > 0 && (
        <div className="mb-6 rounded-card border border-amber-200 bg-amber-50/50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb size={16} className="text-amber-600" />
            <h2 className="text-sm font-semibold text-neutral-dark">Needs follow-up</h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">{followUp.summary.total} staff · {followUp.summary.total_gaps} gaps</span>
          </div>
          <p className="mb-3 text-xs text-neutral-mid">Staff with training or induction questions answered incorrectly that you haven&apos;t reviewed yet. Open a record to reinforce their learning.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {followUp.staff.slice(0, 9).map(s => (
              <Link key={s.id} href={`/staff/${s.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white px-3 py-2.5 transition-colors hover:border-amber-300">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-dark">{s.name}</p>
                  {s.job_role && <p className="truncate text-xs text-neutral-mid">{s.job_role}</p>}
                </div>
                <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[11px] font-medium leading-none text-red-600">{s.unreviewed} to review</span>
              </Link>
            ))}
          </div>
          {followUp.staff.length > 9 && <p className="mt-2 text-xs text-neutral-mid">+{followUp.staff.length - 9} more.</p>}
        </div>
      )}

      <HelpAccordion title="About these numbers">
        <p><strong className="text-neutral-dark">Active policies</strong> — the number of uploaded documents (policies, procedures, handbooks) that have been fully processed and are ready for the AI to use. Documents that are still processing or have been archived are not counted here.</p>
        <p><strong className="text-neutral-dark">Staff members</strong> — the total number of registered staff accounts on your account, including both admin and standard staff roles.</p>
        <p><strong className="text-neutral-dark">Total queries</strong> — every question asked across all channels since your account was created. This number only goes up — it is a lifetime total, not a monthly figure. Use the Query history page to filter by date or channel.</p>
      </HelpAccordion>

      {/* Channel breakdown */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Chat */}
        <div className="rounded-card overflow-hidden border border-gray-100 bg-white shadow-card">
          <div className="h-1 bg-teal" />
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10">
                <MessageSquare size={15} className="text-teal" />
              </div>
              <p className="text-sm font-semibold text-neutral-dark">Chat</p>
            </div>
            <p className="text-3xl font-bold text-teal">{channels.chat}</p>
            <p className="mt-1 text-xs text-neutral-mid">queries this month</p>
            {totalChannelQueries > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-teal" style={{ width: `${Math.round((channels.chat / totalChannelQueries) * 100)}%` }} />
                </div>
                <span className="text-xs text-neutral-mid">{Math.round((channels.chat / totalChannelQueries) * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Voice */}
        <div className="rounded-card overflow-hidden border border-gray-100 bg-white shadow-card">
          <div className="h-1 bg-purple-400" />
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                <Mic size={15} className="text-purple-600" />
              </div>
              <p className="text-sm font-semibold text-neutral-dark">Voice</p>
            </div>
            <p className="text-3xl font-bold text-purple-600">{channels.voice}</p>
            <p className="mt-1 text-xs text-neutral-mid">queries this month</p>
            {totalChannelQueries > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${Math.round((channels.voice / totalChannelQueries) * 100)}%` }} />
                </div>
                <span className="text-xs text-neutral-mid">{Math.round((channels.voice / totalChannelQueries) * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Email */}
        <div className="rounded-card overflow-hidden border border-gray-100 bg-white shadow-card">
          <div className="h-1 bg-indigo-400" />
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                <Mail size={15} className="text-indigo-500" />
              </div>
              <p className="text-sm font-semibold text-neutral-dark">Email</p>
            </div>
            <p className="text-3xl font-bold text-indigo-600">{channels.email}</p>
            <p className="mt-1 text-xs text-neutral-mid">queries this month</p>
            {totalChannelQueries > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${Math.round((channels.email / totalChannelQueries) * 100)}%` }} />
                </div>
                <span className="text-xs text-neutral-mid">{Math.round((channels.email / totalChannelQueries) * 100)}%</span>
              </div>
            )}
          </div>
        </div>

      </div>

      <HelpAccordion title="About channels">
        <p>These cards show how many questions were asked through each access channel during the current month. CareStreamAI supports three channels — staff can use whichever suits them best:</p>
        <p><strong className="text-neutral-dark">Chat</strong> — the web portal at your CareStreamAI login. Staff type questions and receive instant written responses. Best for detailed or sensitive queries.</p>
        <p><strong className="text-neutral-dark">Voice</strong> — staff speak their question and receive a spoken response. Ideal for on-the-go use, particularly for care assistants who are not at a desk.</p>
        <p><strong className="text-neutral-dark">Email</strong> — staff email a question to your organisation's dedicated inbound address. The AI replies directly to their inbox. Good for non-urgent queries and those who prefer written records. The progress bar shows each channel's share of this month's total.</p>
      </HelpAccordion>

      {/* Daily activity chart */}
      <div className="mb-8 rounded-card bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-dark">Daily interactions</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">Queries by channel — Chat, Voice, Email</p>
          </div>
          <div className="flex gap-1 rounded-md border border-gray-200 p-0.5 text-xs font-medium">
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setChartDays(d)}
                className={`rounded px-3 py-1.5 transition-colors ${
                  chartDays === d ? 'bg-teal text-white' : 'text-neutral-mid hover:text-neutral-dark'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 py-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm text-neutral-mid">Loading…</p>
            </div>
          ) : (
            <QueryVolumeChart data={chartData} days={chartDays} />
          )}
        </div>
      </div>

      <HelpAccordion title="About the daily interactions chart">
        <p>Each line tracks how many queries came in per day through that channel. Use the <strong className="text-neutral-dark">7d / 30d / 90d</strong> buttons to zoom in or out on the time range.</p>
        <p>What to look for: a steady upward trend means staff are adopting the system well. Spikes often coincide with new staff starting, a policy update being published, or a CQC inspection being announced. Flat periods may indicate staff need a reminder that the tool is available.</p>
        <p>If one channel dominates, consider whether the less-used channels are set up and communicated to staff — for example, some teams only discover email or voice access after it is mentioned in a team meeting.</p>
      </HelpAccordion>

      {/* Recent queries */}
      <div className="rounded-card bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="font-semibold text-neutral-dark">Recent queries</h2>
          <a href="/queries" className="text-sm font-medium text-teal hover:underline">View all</a>
        </div>

        {loading ? (
          <p className="px-6 py-6 text-sm text-neutral-mid">Loading…</p>
        ) : queries.length === 0 ? (
          <p className="px-6 py-6 text-sm text-neutral-mid">No queries yet — staff can start asking questions from Chat Hub.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Channel</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Staff member</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Query</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Area</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Language</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Match?</th>
                  <th className="px-6 py-3 text-xs font-medium text-neutral-mid">Date &amp; time</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((q: any) => (
                  <tr key={q.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/50">
                    <td className="px-6 py-3">
                      <ChannelBadge channel={q.channel} />
                    </td>
                    <td className="px-6 py-3">
                      {q.user ? (
                        <div>
                          <p className="font-medium text-neutral-dark">{q.user.name}</p>
                          <p className="text-xs text-neutral-mid">{q.user.email}</p>
                        </div>
                      ) : q.channel === 'whatsapp' ? (
                        <span className="text-xs text-neutral-mid">WhatsApp user</span>
                      ) : q.channel === 'email' ? (
                        <span className="text-xs text-neutral-mid">Email sender</span>
                      ) : (
                        <span className="text-neutral-mid">—</span>
                      )}
                    </td>
                    <td className="max-w-xs px-6 py-3">
                      <span className="line-clamp-2 text-neutral-dark">{q.query_text}</span>
                    </td>
                    <td className="px-6 py-3">
                      {q.document_category_queried ? (
                        <span className="flex items-center gap-1 text-xs text-neutral-mid">
                          {q.document_category_queried === 'internal_policy'
                            ? <BookOpen size={11} className="text-teal" />
                            : <Users    size={11} className="text-teal" />}
                          {q.document_category_queried === 'internal_policy' ? 'Policies' : 'Handbook'}
                        </span>
                      ) : <span className="text-xs text-neutral-mid">—</span>}
                    </td>
                    <td className="px-6 py-3 text-xs text-neutral-mid">
                      {LANG_NAMES[q.language_detected] ?? q.language_detected ?? '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        q.no_match ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-700'
                      }`}>
                        {q.no_match ? 'No match' : 'Matched'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-xs text-neutral-mid">
                      {q.created_at ? formatDateTime(q.created_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HelpAccordion title="About recent queries">
        <p>This table shows the 20 most recent questions asked by your staff across all channels. Each row tells you who asked, what they asked, which channel they used, and whether the AI found a matching policy.</p>
        <p><strong className="text-neutral-dark">Matched</strong> — the AI found relevant content in your uploaded policies and gave an answer based on that content. The staff member received a response drawn directly from your organisation's documentation.</p>
        <p><strong className="text-neutral-dark">No match</strong> — the AI could not find relevant content in your policies for that question. This does not mean the question was refused — the AI still responds helpfully — but it indicates a potential gap in your documentation. Visit <strong className="text-neutral-dark">Reporting &rarr; Policy Gaps</strong> to see a full list of unmatched questions so you can decide which policies to add or update.</p>
        <p>The <strong className="text-neutral-dark">Area</strong> column shows whether the query was answered from your internal policies or from your staff handbook. The <strong className="text-neutral-dark">Language</strong> column records the detected language of the question — useful for understanding the needs of a multilingual team.</p>
        <p>Click <strong className="text-neutral-dark">View all</strong> to go to Query history for a full searchable and filterable log.</p>
      </HelpAccordion>
    </div>
  )
}
