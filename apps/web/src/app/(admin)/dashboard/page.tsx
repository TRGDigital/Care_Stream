'use client'

import React, { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { BookOpen, ChevronDown, FileText, Info, Mail, MessageSquare, Mic, Users } from 'lucide-react'

const whatsappIconPath = "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts'

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
          <p><strong className="text-neutral-dark">Staff</strong> — add and manage your team members. Each staff member gets access to CareStreamAI through their preferred channel (Chat portal, WhatsApp, Email, or Voice). You can assign job roles, grant or remove admin access, and reset passwords from this section. Staff only see information drawn from your own uploaded policies — they cannot access another organisation's data.</p>
        </>
      ),
    },
    {
      name: 'Training',
      summary: 'Compliance, AI-generated assessments, and question history',
      content: (
        <>
          <p><strong className="text-neutral-dark">Compliance tab</strong> — assign statutory and specialist training modules to individual staff or your whole team. The compliance grid shows every staff member against every assigned module so you can see at a glance who is complete, in progress, overdue, or expiring soon. Click any cell to open the full training record including answers given and a manual completion option.</p>
          <p><strong className="text-neutral-dark">Modules &amp; Questions tab</strong> — build and manage the multiple-choice question sets used to assess staff. Each question has four options (A–D) with one correct answer. Use <strong className="text-neutral-dark">Generate questions</strong> to create a full set using CareStreamAI's care sector expertise and your <strong className="text-neutral-dark">Knowledge seed</strong> — information specific to your setting — or write your own and use <strong className="text-neutral-dark">Generate answer options</strong> to fill in the choices. Once all questions are complete, <strong className="text-neutral-dark">lock the question set</strong> to create a dated audit record. Locked questions cannot be edited until unlocked — this ensures the integrity of your training evidence over time.</p>
          <p><strong className="text-neutral-dark">Conversational training</strong> — once assigned, CareStreamAI delivers training questions directly to staff via WhatsApp, email, or the chat portal. Staff answer with a single letter (A, B, C, D). Every answer is recorded against the exact question text used at that time, and the compliance record updates instantly. No app, no login, no separate system.</p>
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
          <p><strong className="text-neutral-dark">Billing</strong> — manage your subscription plan, view your current usage against plan limits, and update payment details. You can see how many queries and staff users you have used out of your plan allowance.</p>
          <p><strong className="text-neutral-dark">Settings</strong> — configure your organisation name, inbound email domain, WhatsApp sender number, staff job role list, branding sign-off, and notification preferences. Changes here affect how staff interact with the AI across all channels.</p>
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

export default function DashboardPage() {
  const { data: session } = useSession()
  const [queries,    setQueries]    = useState<any[]>([])
  const [chartData,  setChartData]  = useState<Array<{ date: string; chat: number; email: number; whatsapp: number; voice: number }>>([])
  const [chartDays,  setChartDays]  = useState(30)
  const [loading,    setLoading]    = useState(true)
  const [channels,   setChannels]   = useState({ chat: 0, email: 0, whatsapp: 0, voice: 0 })
  const [stats,      setStats]      = useState({ activePolicies: '—', staffCount: '—', totalQueries: '—' })

  useEffect(() => {
    if (!session?.accessToken) return
    const api = createApiClient(session.accessToken)

    Promise.allSettled([
      api.policies.list({ status: 'active', limit: '1' }),
      api.users.list(),
      api.query.list({ limit: '20' }),
      api.analytics.dailyActivity(chartDays),
      api.analytics.get(),
    ]).then(([policiesRes, usersRes, queriesRes, chartRes, analyticsRes]) => {
      setStats({
        activePolicies: policiesRes.status === 'fulfilled' ? String(policiesRes.value?.total ?? '—') : '—',
        staffCount:     usersRes.status   === 'fulfilled' ? String(usersRes.value?.total ?? (Array.isArray(usersRes.value) ? usersRes.value.length : '—')) : '—',
        totalQueries:   queriesRes.status === 'fulfilled' ? String(queriesRes.value?.total ?? '—') : '—',
      })
      if (queriesRes.status === 'fulfilled') {
        setQueries(queriesRes.value?.queries ?? queriesRes.value?.items ?? [])
      }
      if (chartRes.status === 'fulfilled') {
        setChartData(chartRes.value.series.map((s: any) => ({ voice: 0, ...s })))
      }
      if (analyticsRes.status === 'fulfilled') {
        const ch = analyticsRes.value?.basic?.queries_by_channel
        if (ch) setChannels({ chat: ch.chat ?? 0, email: ch.email ?? 0, whatsapp: ch.whatsapp ?? 0, voice: ch.voice ?? 0 })
      }
    }).finally(() => setLoading(false))
  }, [session?.accessToken, chartDays])

  const totalChannelQueries = channels.chat + channels.email + channels.whatsapp + channels.voice

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-dark">Dashboard</h1>

      <SidebarGuide />

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

      <HelpAccordion title="About these numbers">
        <p><strong className="text-neutral-dark">Active policies</strong> — the number of uploaded documents (policies, procedures, handbooks) that have been fully processed and are ready for the AI to use. Documents that are still processing or have been archived are not counted here.</p>
        <p><strong className="text-neutral-dark">Staff members</strong> — the total number of registered staff accounts on your account, including both admin and standard staff roles.</p>
        <p><strong className="text-neutral-dark">Total queries</strong> — every question asked across all channels since your account was created. This number only goes up — it is a lifetime total, not a monthly figure. Use the Query history page to filter by date or channel.</p>
      </HelpAccordion>

      {/* Channel breakdown */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
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

        {/* WhatsApp */}
        <div className="rounded-card overflow-hidden border border-gray-100 bg-white shadow-card">
          <div className="h-1 bg-green-500" />
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#16a34a"><path d={whatsappIconPath}/></svg>
              </div>
              <p className="text-sm font-semibold text-neutral-dark">WhatsApp</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{channels.whatsapp}</p>
            <p className="mt-1 text-xs text-neutral-mid">queries this month</p>
            {totalChannelQueries > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-gray-100">
                  <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${Math.round((channels.whatsapp / totalChannelQueries) * 100)}%` }} />
                </div>
                <span className="text-xs text-neutral-mid">{Math.round((channels.whatsapp / totalChannelQueries) * 100)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <HelpAccordion title="About channels">
        <p>These cards show how many questions were asked through each access channel during the current month. CareStreamAI supports four channels — staff can use whichever suits them best:</p>
        <p><strong className="text-neutral-dark">Chat</strong> — the web portal at your CareStreamAI login. Staff type questions and receive instant written responses. Best for detailed or sensitive queries.</p>
        <p><strong className="text-neutral-dark">Voice</strong> — staff speak their question and receive a spoken response. Ideal for on-the-go use, particularly for care assistants who are not at a desk.</p>
        <p><strong className="text-neutral-dark">Email</strong> — staff email a question to your organisation's dedicated inbound address. The AI replies directly to their inbox. Good for non-urgent queries and those who prefer written records.</p>
        <p><strong className="text-neutral-dark">WhatsApp</strong> — staff message your organisation's WhatsApp number. Convenient for staff who already use WhatsApp and are away from a computer. The progress bar shows each channel's share of this month's total.</p>
      </HelpAccordion>

      {/* Daily activity chart */}
      <div className="mb-8 rounded-card bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="font-semibold text-neutral-dark">Daily interactions</h2>
            <p className="mt-0.5 text-xs text-neutral-mid">Queries by channel — Chat, Voice, Email, WhatsApp</p>
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
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 4, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={d => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  interval={chartDays <= 7 ? 0 : chartDays <= 30 ? 4 : 9}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                  labelFormatter={d => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  formatter={(value: any, name: any) => [value, name === 'chat' ? 'Chat' : name === 'voice' ? 'Voice' : name === 'email' ? 'Email' : 'WhatsApp']}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={name => name === 'chat' ? 'Chat' : name === 'voice' ? 'Voice' : name === 'email' ? 'Email' : 'WhatsApp'}
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                />
                <Line type="monotone" dataKey="chat"      stroke="#0d9488" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="voice"     stroke="#9333ea" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="email"     stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="whatsapp"  stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <HelpAccordion title="About the daily interactions chart">
        <p>Each line tracks how many queries came in per day through that channel. Use the <strong className="text-neutral-dark">7d / 30d / 90d</strong> buttons to zoom in or out on the time range.</p>
        <p>What to look for: a steady upward trend means staff are adopting the system well. Spikes often coincide with new staff starting, a policy update being published, or a CQC inspection being announced. Flat periods may indicate staff need a reminder that the tool is available.</p>
        <p>If one channel dominates, consider whether the less-used channels are set up and communicated to staff — for example, some teams only discover WhatsApp access after it is mentioned in a team meeting.</p>
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
          <p className="px-6 py-6 text-sm text-neutral-mid">No queries yet — staff can start asking questions from the chat portal.</p>
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
