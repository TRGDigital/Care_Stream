'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { AiCreditsBar } from '@/components/ai-usage'
import { persistentCache } from '@/lib/page-cache'
import {
  AlertCircle, CheckCircle2, ChevronDown, ClipboardList,
  Info, Loader2, Plus, Sparkles, Trash2, Users, UserPlus,
} from 'lucide-react'
import { DOMAINS, type Delivery, type Question, type StaffUser } from '@/components/admin/cqc-questions/cqc-shared'

// Modals are lazy-loaded — only fetched when a dialog is opened.
const AddQuestionModal = dynamic(() => import('@/components/admin/cqc-questions/cqc-modals').then(m => m.AddQuestionModal), { ssr: false })
const SendModal = dynamic(() => import('@/components/admin/cqc-questions/cqc-modals').then(m => m.SendModal), { ssr: false })
const GenerateBatchModal = dynamic(() => import('@/components/admin/cqc-questions/cqc-modals').then(m => m.GenerateBatchModal), { ssr: false })

// ─── Shared UI helpers ──────────────────────────────────────────────────────

function scoreBadgeClass(score: number | null) {
  if (score === null) return null
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 60) return 'bg-amber-100 text-amber-700'
  if (score >= 40) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-600'
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

function DomainBadge({ domain }: { domain: string }) {
  const d = DOMAINS.find(x => x.key === domain)
  if (!d) return <span className="text-xs text-gray-500">{domain}</span>
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${d.bg} ${d.color}`}>
      {d.label}
    </span>
  )
}

// ─── Question Bank Tab ────────────────────────────────────────────────────────

function QuestionBankTab({
  questions, staff, deliveries, onDeactivate, onAdd, onAddMany, onSent, token,
}: {
  questions: Question[]; staff: StaffUser[]; deliveries: Delivery[]
  onDeactivate: (id: string) => void; onAdd: (q: Question) => void
  onAddMany: (qs: Question[]) => void
  onSent: () => void; token: string
}) {
  // Per-question delivery stats (sent / answered / average score), from the same
  // deliveries the Performance tab uses — no extra fetch.
  const statsByQ = useMemo(() => {
    const m = new Map<string, { sent: number; answered: number; total: number }>()
    for (const d of deliveries) {
      const s = m.get(d.question_id) ?? { sent: 0, answered: 0, total: 0 }
      s.sent++
      if (d.status === 'evaluated') { s.answered++; s.total += d.score ?? 0 }
      m.set(d.question_id, s)
    }
    return m
  }, [deliveries])

  const [expanded, setExpanded]       = useState<string[]>([])
  const [sendTarget, setSendTarget]   = useState<Question | null>(null)
  const [showAdd, setShowAdd]         = useState(false)
  const [showGenerate, setShowGen]    = useState(false)
  const [deactivating, setDeact]      = useState<string | null>(null)
  const [assigningDomain, setAssigningDom] = useState<string | null>(null)
  const [assignedDomain, setAssignedDomain] = useState<string | null>(null)
  const [assigningOne, setAssigningOne] = useState<string | null>(null)
  const [assignedOne, setAssignedOne]   = useState<string | null>(null)
  const api = createApiClient(token)

  function toggleDomain(domain: string) {
    setExpanded(e => e.includes(domain) ? e.filter(x => x !== domain) : [...e, domain])
  }

  async function handleDeactivate(id: string) {
    setDeact(id)
    try { await api.cqcQuestions.deactivate(id); onDeactivate(id) }
    finally { setDeact(null) }
  }

  // Assign every question in a domain to all staff at once.
  async function handleAssignAllDomain(domain: string, domainQuestions: Question[]) {
    if (staff.length === 0 || domainQuestions.length === 0) return
    setAssigningDom(domain)
    try {
      const allStaffIds = staff.map(s => s.id)
      await Promise.all(
        domainQuestions.map(q =>
          api.cqcQuestions.deliver(q.id, { user_ids: allStaffIds, channel: 'portal' })
        )
      )
      setAssignedDomain(domain)
      setTimeout(() => setAssignedDomain(null), 2500)
      onSent()
    } catch { /* silent — individual failures don't block */ }
    finally { setAssigningDom(null) }
  }

  // Assign a single question to all staff.
  async function handleAssignAllStaff(q: Question) {
    if (staff.length === 0) return
    setAssigningOne(q.id)
    try {
      await api.cqcQuestions.deliver(q.id, { user_ids: staff.map(s => s.id), channel: 'portal' })
      setAssignedOne(q.id)
      setTimeout(() => setAssignedOne(null), 2500)
      onSent()
    } catch { /* silent */ }
    finally { setAssigningOne(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-mid">
          {questions.length} active question{questions.length !== 1 ? 's' : ''} across {DOMAINS.length} CQC domains
        </p>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowGen(true)}
            className="flex items-center gap-2 rounded-btn border border-teal px-4 py-2 text-sm font-medium text-teal hover:bg-teal hover:text-white transition-colors"
          >
            <Sparkles size={15} /> Generate with AI
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
          >
            <Plus size={15} /> Add question
          </button>
        </div>
      </div>

      {DOMAINS.map(d => {
        const qs   = questions.filter(q => q.domain === d.key)
        const open = expanded.includes(d.key)
        return (
          <div key={d.key} className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
            <div className="flex items-center px-5 py-4">
              <button onClick={() => toggleDomain(d.key)}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className={`text-sm font-semibold ${d.color}`}>{d.label}</span>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${d.bg} ${d.color}`}>
                  {qs.length}
                </span>
                <ChevronDown size={15} className={`text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {qs.length > 0 && staff.length > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); handleAssignAllDomain(d.key, qs) }}
                  disabled={assigningDomain === d.key}
                  className="ml-3 flex items-center gap-1.5 rounded-btn border border-teal px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal hover:text-white transition-colors disabled:opacity-50 shrink-0"
                >
                  {assigningDomain === d.key ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : assignedDomain === d.key ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Users size={12} />
                  )}
                  {assigningDomain === d.key ? 'Assigning…' : assignedDomain === d.key ? 'Assigned!' : 'Assign all to staff'}
                </button>
              )}
            </div>

            {open && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {qs.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-neutral-mid">No questions in this domain yet.</p>
                ) : qs.map(q => (
                  <div key={q.id} className="px-5 py-4 space-y-2.5">
                    <p className="text-sm font-medium text-neutral-dark">{q.question}</p>

                    {/* Model answer — the factual standard the AI scores staff answers against. */}
                    <div className="rounded-lg border border-teal/15 bg-teal-light/15 px-3 py-2.5">
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal">
                        <CheckCircle2 size={12} /> Model answer · what a strong answer covers
                      </p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{q.model_answer}</p>
                    </div>

                    {/* Per-question tracking — how many staff this has gone to, how many answered, average score */}
                    {(() => {
                      const st = statsByQ.get(q.id)
                      if (!st || st.sent === 0) return <p className="text-xs text-neutral-mid/70">Not yet assigned to anyone.</p>
                      const avg = st.answered > 0 ? Math.round(st.total / st.answered) : null
                      return (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-mid">
                          <span><strong className="text-neutral-dark">{st.sent}</strong> assigned</span>
                          <span className="text-gray-300">·</span>
                          <span><strong className="text-neutral-dark">{st.answered}</strong> answered{st.sent > st.answered ? ` · ${st.sent - st.answered} awaiting` : ''}</span>
                          {avg !== null && <><span className="text-gray-300">·</span>
                            <span>avg <strong className={avg >= 80 ? 'text-green-600' : avg >= 60 ? 'text-amber-600' : 'text-red-600'}>{avg}%</strong></span></>}
                        </div>
                      )
                    })()}

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button onClick={() => handleAssignAllStaff(q)} disabled={assigningOne === q.id || staff.length === 0}
                        className="flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark disabled:opacity-50"
                      >
                        {assigningOne === q.id ? <Loader2 size={12} className="animate-spin" /> : assignedOne === q.id ? <CheckCircle2 size={12} /> : <Users size={12} />}
                        {assigningOne === q.id ? 'Assigning…' : assignedOne === q.id ? 'Assigned!' : 'Assign to all staff'}
                      </button>
                      <button onClick={() => setSendTarget(q)} disabled={staff.length === 0}
                        className="flex items-center gap-1.5 rounded-btn border border-teal px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal hover:text-white transition-colors disabled:opacity-50"
                      >
                        <UserPlus size={12} /> Assign to specific staff
                      </button>
                      <button onClick={() => handleDeactivate(q.id)} disabled={deactivating === q.id}
                        className="flex items-center gap-1.5 rounded-btn border border-gray-200 px-3 py-1.5 text-xs text-neutral-mid hover:text-red-600 hover:border-red-200"
                      >
                        {deactivating === q.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        Remove
                      </button>
                      {q.is_seed && <span className="text-xs text-neutral-mid">CQC default</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {showAdd && (
        <AddQuestionModal token={token} onClose={() => setShowAdd(false)}
          onSave={q => { onAdd(q); setShowAdd(false) }} />
      )}
      {showGenerate && (
        <GenerateBatchModal token={token} onClose={() => setShowGen(false)}
          onGenerated={qs => {
            onAddMany(qs)
            setExpanded(e => [...new Set([...e, ...qs.map(q => q.domain)])])
            setShowGen(false)
          }} />
      )}
      {sendTarget && (
        <SendModal question={sendTarget} staff={staff} token={token}
          onClose={() => setSendTarget(null)} onSent={() => { setSendTarget(null); onSent() }} />
      )}
    </div>
  )
}

// ─── Performance Tab ──────────────────────────────────────────────────────────

function PerformanceTab({ deliveries, staff }: { deliveries: Delivery[]; staff: StaffUser[] }) {
  const evaluated = deliveries.filter(d => d.status === 'evaluated')
  const pending   = deliveries.filter(d => d.status === 'pending')
  const [openStaff, setOpenStaff] = useState<string[]>([])
  const toggleStaff = (id: string) => setOpenStaff(e => e.includes(id) ? e.filter(x => x !== id) : [...e, id])

  // Build per-user per-domain avg score map
  type DomainStats = { count: number; total: number }
  const scoreMap = new Map<string, Record<string, DomainStats>>()

  for (const d of evaluated) {
    if (!scoreMap.has(d.user_id)) scoreMap.set(d.user_id, {})
    const userDomains = scoreMap.get(d.user_id)!
    const dom = d.question.domain
    if (!userDomains[dom]) userDomains[dom] = { count: 0, total: 0 }
    userDomains[dom].count++
    userDomains[dom].total += d.score ?? 0
  }

  // Only show staff who have received at least one delivery
  const staffWithDeliveries = staff.filter(s =>
    deliveries.some(d => d.user_id === s.id)
  )

  function avgScore(userId: string, domain: string): number | null {
    const s = scoreMap.get(userId)?.[domain]
    if (!s || s.count === 0) return null
    return Math.round(s.total / s.count)
  }

  function overallAvg(userId: string): number | null {
    const domains = scoreMap.get(userId)
    if (!domains) return null
    const vals = Object.values(domains)
    if (vals.length === 0) return null
    const total = vals.reduce((s, d) => s + d.total, 0)
    const count = vals.reduce((s, d) => s + d.count, 0)
    return count ? Math.round(total / count) : null
  }

  // Summary counts
  const staffAbove80 = staffWithDeliveries.filter(s => {
    const o = overallAvg(s.id)
    return o !== null && o >= 80
  }).length
  const staffBelow60 = staffWithDeliveries.filter(s => {
    const o = overallAvg(s.id)
    return o !== null && o < 60
  }).length

  if (deliveries.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
        <ClipboardList size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="font-medium text-neutral-dark">No questions sent yet</p>
        <p className="mt-1 text-sm text-neutral-mid">Use the Question Bank tab to send questions to your team.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Questions sent',       value: deliveries.length,          colour: 'text-teal',          bg: 'bg-teal-light/30',  note: 'total across all staff'         },
          { label: 'Answered & scored',    value: evaluated.length,           colour: 'text-green-600',     bg: 'bg-green-50',       note: `${pending.length} still pending` },
          { label: 'Scoring 80+',          value: staffAbove80,               colour: 'text-green-600',     bg: 'bg-green-50',       note: 'staff performing well'           },
          { label: 'Needs improvement',    value: staffBelow60,               colour: 'text-red-600',       bg: 'bg-red-50',         note: 'scoring below 60 average'        },
        ].map(card => (
          <div key={card.label} className={`rounded-card ${card.bg} border border-white/60 p-4 shadow-sm`}>
            <p className="text-xs font-medium text-neutral-mid">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.colour}`}>{card.value}</p>
            <p className="mt-0.5 text-xs text-neutral-mid">{card.note}</p>
          </div>
        ))}
      </div>

      {/* Staff × Domain performance grid */}
      {staffWithDeliveries.length === 0 ? (
        <div className="rounded-card border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
          <p className="text-sm text-neutral-mid">No answers submitted yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-gray-100 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="sticky left-0 z-10 bg-white px-5 py-3 text-left text-xs font-medium text-neutral-mid min-w-[180px]">
                  Staff member
                </th>
                {DOMAINS.map(d => (
                  <th key={d.key} className="px-3 py-3 text-center text-xs font-medium min-w-[90px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold border ${d.bg} ${d.color}`}>
                        {d.short}
                      </span>
                      <span className="text-neutral-mid leading-tight">{d.label}</span>
                    </div>
                  </th>
                ))}
                <th className="px-5 py-3 text-center text-xs font-medium text-neutral-mid min-w-[80px]">
                  Overall
                </th>
              </tr>
            </thead>
            <tbody>
              {staffWithDeliveries.map(s => {
                const overall = overallAvg(s.id)
                return (
                  <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-neutral-light/30">
                    <td className="sticky left-0 z-10 bg-white px-5 py-3 hover:bg-neutral-light/30">
                      <p className="font-medium text-neutral-dark">{s.name}</p>
                      <p className="text-xs text-neutral-mid">{s.job_role ?? '—'}</p>
                    </td>
                    {DOMAINS.map(d => {
                      const score = avgScore(s.id, d.key)
                      const badge = scoreBadgeClass(score)
                      // Check if any questions sent for this domain
                      const hasPending = deliveries.some(del => del.user_id === s.id && del.question.domain === d.key && del.status === 'pending')
                      return (
                        <td key={d.key} className="px-3 py-3 text-center">
                          {score !== null ? (
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${badge}`}>
                              {score}
                            </span>
                          ) : hasPending ? (
                            <span title="Awaiting answer" className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-teal bg-teal/10 text-teal text-[10px] font-bold">
                              …
                            </span>
                          ) : (
                            <span className="text-gray-300 font-bold">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-5 py-3 text-center">
                      {overall !== null ? (
                        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${scoreBadgeClass(overall)}`}>
                          {overall}
                        </span>
                      ) : (
                        <span className="text-gray-300 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-5 py-3 text-xs text-neutral-mid">
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-700 font-bold text-[9px]">80</span>
              80+ Excellent
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-[9px]">65</span>
              60–79 Good
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-700 font-bold text-[9px]">45</span>
              40–59 Partial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600 font-bold text-[9px]">25</span>
              &lt;40 Needs work
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-teal bg-teal/10 text-teal text-[10px] font-bold">…</span>
              Awaiting answer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-gray-300 font-bold">—</span> Not sent
            </span>
          </div>
        </div>
      )}

      {/* Recent answers — grouped into a collapsible accordion per staff member */}
      {evaluated.length > 0 && (() => {
        // Most-recent first, then group by staff so each person is one accordion.
        const recent = [...evaluated].sort((a, b) =>
          (b.answered_at ?? b.sent_at).localeCompare(a.answered_at ?? a.sent_at)
        )
        const order: string[] = []
        const byStaff = new Map<string, Delivery[]>()
        for (const d of recent) {
          if (!byStaff.has(d.user_id)) { byStaff.set(d.user_id, []); order.push(d.user_id) }
          byStaff.get(d.user_id)!.push(d)
        }
        return (
          <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
            <div className="border-b border-gray-100 px-5 py-4">
              <h3 className="text-sm font-semibold text-neutral-dark">Recent answers</h3>
              <p className="mt-0.5 text-xs text-neutral-mid">Grouped by staff member. Click a name to see their answers.</p>
            </div>
            <div className="divide-y divide-gray-50">
              {order.map(uid => {
                const items = byStaff.get(uid)!
                const person = items[0].user
                const avg = overallAvg(uid)
                const open = openStaff.includes(uid)
                return (
                  <div key={uid}>
                    <button
                      type="button"
                      onClick={() => toggleStaff(uid)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-neutral-light/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-dark">{person.name}</p>
                        {person.job_role && <p className="truncate text-xs text-neutral-mid">{person.job_role}</p>}
                      </div>
                      <span className="shrink-0 rounded-full bg-neutral-light px-2 py-0.5 text-xs font-medium text-neutral-mid">
                        {items.length} answer{items.length > 1 ? 's' : ''}
                      </span>
                      {avg !== null && (
                        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${scoreBadgeClass(avg)}`}>
                          {avg}
                        </span>
                      )}
                      <ChevronDown size={16} className={`shrink-0 text-neutral-mid transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="divide-y divide-gray-50 border-t border-gray-100 bg-neutral-light/20">
                        {items.map(d => (
                          <div key={d.id} className="flex items-start gap-4 px-5 py-4">
                            <div className="flex-1 min-w-0 space-y-1">
                              <DomainBadge domain={d.question.domain} />
                              <p className="text-xs text-neutral-mid">Q: {d.rephrased_q}</p>
                              <p className="text-sm text-neutral-dark bg-white rounded-lg px-3 py-2">"{d.answer_text}"</p>
                              {d.feedback && <p className="text-xs text-neutral-mid italic">{d.feedback}</p>}
                            </div>
                            <div className="shrink-0 text-center">
                              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${scoreBadgeClass(d.score)}`}>
                                {d.score}
                              </span>
                              <p className="text-[10px] text-neutral-mid mt-0.5">/100</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CqcQuestionsPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string
  const userId = session?.user?.email ?? 'guest'

  const [tab, setTab]               = useState<'bank' | 'performance'>('bank')
  const [questions, setQuestions]   = useState<Question[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [staff, setStaff]           = useState<StaffUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Hydrate from the persistent (localStorage) cache after mount — never during
  // render, to avoid an SSR/client hydration mismatch.
  useEffect(() => {
    const cached = persistentCache.get<{ questions: Question[]; deliveries: Delivery[]; staff: StaffUser[] }>(`admin-cqc-questions-${userId}`)
    if (cached) { setQuestions(cached.questions); setDeliveries(cached.deliveries); setStaff(cached.staff); setLoading(false) }
  }, [userId])

  const load = useCallback(async () => {
    if (!token) return
    const api = createApiClient(token)
    try {
      const [qRes, dRes, sRes] = await Promise.all([
        api.cqcQuestions.list(),
        api.cqcQuestions.deliveries(),
        api.users.list(),
      ])
      // Include admins too — they're often hands-on care staff who should practise CQC prep.
      const staffList = (sRes.users ?? []).filter((u: any) => u.is_active)
      setQuestions(qRes.questions)
      setDeliveries(dRes.deliveries)
      setStaff(staffList)
      persistentCache.set(`admin-cqc-questions-${userId}`, { questions: qRes.questions, deliveries: dRes.deliveries, staff: staffList })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, userId])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
      <div className="h-32 animate-pulse rounded-card bg-gray-100" />
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-dark">CQC Staff Prep</h1>
          <p className="mt-1 text-sm text-neutral-mid">
            Build staff confidence for CQC inspector interviews with practice questions and AI-scored answers.
          </p>
        </div>
      </div>

      {session?.accessToken && <AiCreditsBar token={session.accessToken} />}

      {/* Tab switcher */}
      <div className="mb-6 flex gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1 w-fit">
        {([
          { key: 'bank',        label: 'Question Bank' },
          { key: 'performance', label: 'Performance'   },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid hover:text-neutral-dark'
            }`}
          >
            {t.label}
            {t.key === 'performance' && deliveries.filter(d => d.status === 'evaluated').length > 0 && (
              <span className="ml-1.5 text-xs bg-teal-light text-teal px-1.5 py-0.5 rounded-full">
                {deliveries.filter(d => d.status === 'evaluated').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-card border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {tab === 'bank' && (
        <>
          <HelpAccordion title="How CQC Staff Prep works">
            <p><strong className="text-neutral-dark">Question Bank</strong> — 21 pre-loaded CQC inspector-style questions are organised across five domains: Safe, Effective, Caring, Responsive, and Well-led. Each question shows its <strong className="text-neutral-dark">model answer</strong> and a tracking line (how many staff it&apos;s been assigned to, how many answered, and their average score). Add your own with <strong className="text-neutral-dark">Add question</strong>, or use <strong className="text-neutral-dark">Generate with AI</strong> to create a whole batch at once (1 AI credit per question generated).</p>
            <p><strong className="text-neutral-dark">Assigning questions</strong> — use <strong className="text-neutral-dark">Assign to all staff</strong> to send a question to everyone, or <strong className="text-neutral-dark">Assign to specific staff</strong> to pick individuals. The system automatically rephrases the question before delivery so staff cannot memorise the exact wording.</p>
            <p><strong className="text-neutral-dark">How staff answer</strong> — staff write free-text answers in their portal (not multiple choice). There are no trick questions; they are assessed on whether they demonstrate the right knowledge and approach.</p>
            <p><strong className="text-neutral-dark">AI scoring</strong> — each answer is evaluated by AI against the model answer and given a score from 0 to 100 with constructive feedback. Scores appear in the Performance tab straight away.</p>
            <p><strong className="text-neutral-dark">Review &amp; retry</strong> — after answering, staff see the model answer. If they scored below 60 they can review it and <strong className="text-neutral-dark">try again</strong> in their own words; the new attempt is re-scored and replaces the old one, so weak answers get a built-in follow-up automatically.</p>
          </HelpAccordion>
          <QuestionBankTab
            questions={questions} staff={staff} deliveries={deliveries} token={token}
            onDeactivate={id => setQuestions(qs => qs.filter(q => q.id !== id))}
            onAdd={q => setQuestions(qs => [...qs, q])}
            onAddMany={newQs => setQuestions(qs => [...qs, ...newQs])}
            onSent={() => load()}
          />
        </>
      )}

      {tab === 'performance' && (
        <>
          <HelpAccordion title="How Performance Tracking works">
            <p><strong className="text-neutral-dark">The grid</strong> — each cell shows the average score (0–100) for a staff member across all answered questions in that CQC domain. A teal dot means a question has been sent but not yet answered. A dash means no questions have been sent for that domain yet.</p>
            <p><strong className="text-neutral-dark">Score bands</strong> — 80+ is excellent and indicates the staff member can speak confidently to inspectors on that topic. 60–79 is good with minor gaps. 40–59 indicates significant gaps that need attention. Below 40 means the staff member needs focused support on that domain.</p>
            <p><strong className="text-neutral-dark">Using the data</strong> — focus sending questions to the domains where scores are lowest. Repeated practice across all five domains builds the confidence staff need when talking to CQC inspectors.</p>
          </HelpAccordion>
          <PerformanceTab deliveries={deliveries} staff={staff} />
        </>
      )}
    </div>
  )
}
