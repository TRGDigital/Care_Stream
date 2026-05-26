'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight, ClipboardList,
  Info, Loader2, Plus, Send, Sparkles, Trash2, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Domain = 'safe' | 'effective' | 'caring' | 'responsive' | 'well_led'

type Question = {
  id:           string
  domain:       Domain
  question:     string
  model_answer: string
  is_active:    boolean
  is_seed:      boolean
  created_at:   string
}

type Delivery = {
  id:          string
  user_id:     string
  question_id: string
  rephrased_q: string
  channel:     string
  answer_text: string | null
  score:       number | null
  feedback:    string | null
  status:      'pending' | 'answered' | 'evaluated'
  sent_at:     string
  answered_at: string | null
  user:        { id: string; name: string; job_role: string | null }
  question:    { id: string; domain: string; question: string; model_answer: string }
}

type StaffUser = { id: string; name: string; job_role: string | null }

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAINS: { key: Domain; label: string; short: string; color: string; bg: string }[] = [
  { key: 'safe',       label: 'Safe',       short: 'Safe',  color: 'text-red-700',    bg: 'bg-red-50 border-red-200'       },
  { key: 'effective',  label: 'Effective',  short: 'Eff.',  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200'     },
  { key: 'caring',     label: 'Caring',     short: 'Care',  color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  { key: 'responsive', label: 'Responsive', short: 'Resp.', color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200'   },
  { key: 'well_led',   label: 'Well-led',   short: 'W/Led', color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200'     },
]

function scoreBadgeClass(score: number | null) {
  if (score === null) return null
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 60) return 'bg-amber-100 text-amber-700'
  if (score >= 40) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-600'
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

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

// ─── Add Question Modal ───────────────────────────────────────────────────────

function AddQuestionModal({
  onClose, onSave, token,
}: {
  onClose: () => void
  onSave:  (q: Question) => void
  token:   string
}) {
  const api = createApiClient(token)
  const [tab, setTab]             = useState<'manual' | 'ai'>('ai')
  const [domain, setDomain]       = useState<Domain>('safe')
  const [topic, setTopic]         = useState('')
  const [question, setQuestion]   = useState('')
  const [modelAnswer, setModel]   = useState('')
  const [generating, setGen]      = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  async function handleGenerate() {
    if (!topic.trim()) return
    setGen(true); setError('')
    try {
      const res = await api.cqcQuestions.generate({ domain, topic })
      setQuestion(res.question)
      setModel(res.model_answer)
      setTab('manual')
    } catch (e: any) { setError(e.message) }
    finally { setGen(false) }
  }

  async function handleSave() {
    if (!question.trim() || !modelAnswer.trim()) { setError('Question and model answer are required'); return }
    setSaving(true); setError('')
    try {
      const res = await api.cqcQuestions.create({ domain, question, model_answer: modelAnswer })
      onSave(res.question)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-elevated w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-neutral-dark">Add CQC Question</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Domain */}
          <div>
            <label className="block text-xs font-medium text-neutral-mid uppercase tracking-wide mb-2">CQC Domain</label>
            <div className="flex flex-wrap gap-2">
              {DOMAINS.map(d => (
                <button key={d.key} onClick={() => setDomain(d.key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    domain === d.key ? `${d.bg} ${d.color} border-current` : 'bg-white text-neutral-mid border-gray-200 hover:border-gray-400'
                  }`}
                >{d.label}</button>
              ))}
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-50 border border-gray-100 rounded-lg p-1 w-fit">
            {(['ai', 'manual'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  tab === t ? 'bg-white text-neutral-dark shadow-sm' : 'text-neutral-mid hover:text-neutral-dark'
                }`}
              >
                {t === 'ai' ? <><Sparkles size={13} className="inline mr-1.5" />AI Generate</> : 'Write manually'}
              </button>
            ))}
          </div>
          {tab === 'ai' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Topic or scenario</label>
                <textarea rows={3} value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="e.g. responding to a resident who has fallen, managing aggressive behaviour, end-of-life care…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
              <button onClick={handleGenerate} disabled={!topic.trim() || generating}
                className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-btn text-sm font-medium hover:bg-teal-dark disabled:opacity-50"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {generating ? 'Generating…' : 'Generate question'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">Question</label>
                <textarea rows={3} value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="How would you…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-dark mb-1">
                  Model answer <span className="font-normal text-neutral-mid">(used by AI to evaluate staff responses)</span>
                </label>
                <textarea rows={5} value={modelAnswer} onChange={e => setModel(e.target.value)}
                  placeholder="The ideal answer would include…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal"
                />
              </div>
            </div>
          )}
          {error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={15} />{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-mid hover:text-neutral-dark">Cancel</button>
          {tab === 'manual' && (
            <button onClick={handleSave} disabled={!question.trim() || !modelAnswer.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-btn text-sm font-medium hover:bg-teal-dark disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              {saving ? 'Saving…' : 'Save question'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Send Modal ───────────────────────────────────────────────────────────────

function SendModal({
  question, staff, onClose, onSent, token,
}: {
  question: Question; staff: StaffUser[]
  onClose: () => void; onSent: () => void; token: string
}) {
  const api = createApiClient(token)
  const [selected, setSelected] = useState<string[]>([])
  const [sending, setSending]   = useState(false)
  const [error, setError]       = useState('')

  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  }

  async function handleSend() {
    if (selected.length === 0) return
    setSending(true); setError('')
    try {
      await api.cqcQuestions.deliver(question.id, { user_ids: selected, channel: 'portal' })
      onSent()
    } catch (e: any) { setError(e.message) }
    finally { setSending(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-card shadow-elevated w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-neutral-dark">Send to staff</h2>
          <button onClick={onClose} className="text-neutral-mid hover:text-neutral-dark"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-neutral-mid">
            The question will be rephrased before delivery so staff cannot memorise the exact wording.
          </p>
          <div className="bg-neutral-light rounded-lg p-3 text-sm text-neutral-dark italic">
            "{question.question}"
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-neutral-dark">Select staff members</label>
              <button onClick={() => setSelected(selected.length === staff.length ? [] : staff.map(s => s.id))}
                className="text-xs text-teal hover:underline"
              >
                {selected.length === staff.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {staff.map(s => (
                <label key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-light cursor-pointer">
                  <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
                    className="w-4 h-4 text-teal rounded" />
                  <div>
                    <p className="text-sm font-medium text-neutral-dark">{s.name}</p>
                    {s.job_role && <p className="text-xs text-neutral-mid">{s.job_role}</p>}
                  </div>
                </label>
              ))}
            </div>
          </div>
          {error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle size={15} />{error}</p>}
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-mid">Cancel</button>
          <button onClick={handleSend} disabled={selected.length === 0 || sending}
            className="flex items-center gap-2 px-4 py-2 bg-teal text-white rounded-btn text-sm font-medium hover:bg-teal-dark disabled:opacity-50"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {sending ? 'Sending…' : `Send to ${selected.length} staff`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Question Bank Tab ────────────────────────────────────────────────────────

function QuestionBankTab({
  questions, staff, onDeactivate, onAdd, onSent, token,
}: {
  questions: Question[]; staff: StaffUser[]
  onDeactivate: (id: string) => void; onAdd: (q: Question) => void
  onSent: () => void; token: string
}) {
  const [expanded, setExpanded]       = useState<string[]>([])
  const [sendTarget, setSendTarget]   = useState<Question | null>(null)
  const [showAdd, setShowAdd]         = useState(false)
  const [deactivating, setDeact]      = useState<string | null>(null)
  const [sendingDomain, setSendingDom] = useState<string | null>(null)
  const [sentDomain, setSentDomain]   = useState<string | null>(null)
  const api = createApiClient(token)

  function toggleDomain(domain: string) {
    setExpanded(e => e.includes(domain) ? e.filter(x => x !== domain) : [...e, domain])
  }

  async function handleDeactivate(id: string) {
    setDeact(id)
    try { await api.cqcQuestions.deactivate(id); onDeactivate(id) }
    finally { setDeact(null) }
  }

  async function handleSendAllDomain(domain: string, domainQuestions: Question[]) {
    if (staff.length === 0 || domainQuestions.length === 0) return
    setSendingDom(domain)
    try {
      const allStaffIds = staff.map(s => s.id)
      await Promise.all(
        domainQuestions.map(q =>
          api.cqcQuestions.deliver(q.id, { user_ids: allStaffIds, channel: 'portal' })
        )
      )
      setSentDomain(domain)
      setTimeout(() => setSentDomain(null), 2500)
      onSent()
    } catch { /* silent — individual failures don't block */ }
    finally { setSendingDom(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-mid">
          {questions.length} active question{questions.length !== 1 ? 's' : ''} across {DOMAINS.length} CQC domains
        </p>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-btn bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
        >
          <Plus size={15} /> Add question
        </button>
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
                  onClick={e => { e.stopPropagation(); handleSendAllDomain(d.key, qs) }}
                  disabled={sendingDomain === d.key}
                  className="ml-3 flex items-center gap-1.5 rounded-btn border border-teal px-3 py-1.5 text-xs font-medium text-teal hover:bg-teal hover:text-white transition-colors disabled:opacity-50 shrink-0"
                >
                  {sendingDomain === d.key ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : sentDomain === d.key ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Send size={12} />
                  )}
                  {sendingDomain === d.key ? 'Sending…' : sentDomain === d.key ? 'Sent!' : 'Send all to staff'}
                </button>
              )}
            </div>

            {open && (
              <div className="border-t border-gray-100 divide-y divide-gray-50">
                {qs.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-neutral-mid">No questions in this domain yet.</p>
                ) : qs.map(q => (
                  <div key={q.id} className="px-5 py-4 space-y-2">
                    <p className="text-sm font-medium text-neutral-dark">{q.question}</p>
                    <details>
                      <summary className="text-xs text-neutral-mid cursor-pointer hover:text-neutral-dark list-none">
                        Show model answer
                      </summary>
                      <p className="mt-2 text-sm text-neutral-mid bg-neutral-light rounded-lg px-3 py-2 leading-relaxed">
                        {q.model_answer}
                      </p>
                    </details>
                    <div className="flex items-center gap-2 pt-1">
                      <button onClick={() => setSendTarget(q)}
                        className="flex items-center gap-1.5 rounded-btn bg-teal px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-dark"
                      >
                        <Send size={12} /> Send to staff
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

      {/* Recent answers */}
      {evaluated.length > 0 && (
        <div className="overflow-hidden rounded-card border border-gray-100 bg-white shadow-card">
          <div className="border-b border-gray-100 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-dark">Recent answers</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {evaluated.slice(0, 15).map(d => (
              <div key={d.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-dark">{d.user.name}</span>
                    <DomainBadge domain={d.question.domain} />
                  </div>
                  <p className="text-xs text-neutral-mid">Q: {d.rephrased_q}</p>
                  <p className="text-sm text-neutral-dark bg-neutral-light rounded-lg px-3 py-2">"{d.answer_text}"</p>
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
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CqcQuestionsPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string

  const [tab, setTab]               = useState<'bank' | 'performance'>('bank')
  const [questions, setQuestions]   = useState<Question[]>([])
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [staff, setStaff]           = useState<StaffUser[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  const load = useCallback(async () => {
    if (!token) return
    const api = createApiClient(token)
    try {
      const [qRes, dRes, sRes] = await Promise.all([
        api.cqcQuestions.list(),
        api.cqcQuestions.deliveries(),
        api.users.list(),
      ])
      setQuestions(qRes.questions)
      setDeliveries(dRes.deliveries)
      setStaff((sRes.users ?? []).filter((u: any) => u.role === 'staff' && u.is_active))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

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
            <p><strong className="text-neutral-dark">Question Bank</strong> — 21 pre-loaded CQC inspector-style questions are organised across five domains: Safe, Effective, Caring, Responsive, and Well-led. You can add your own questions manually or generate them using AI by providing a topic.</p>
            <p><strong className="text-neutral-dark">Sending questions</strong> — click <strong className="text-neutral-dark">Send to staff</strong> on any question to send it to one or more team members. The system automatically rephrases the question before delivery so staff cannot memorise the exact wording.</p>
            <p><strong className="text-neutral-dark">How staff answer</strong> — staff write free-text answers in their portal (not multiple choice). There are no trick questions; they are assessed on whether they demonstrate the right knowledge and approach.</p>
            <p><strong className="text-neutral-dark">AI scoring</strong> — each answer is evaluated by AI against the model answer and given a score from 0 to 100 with constructive feedback. Scores appear in the Performance tab straight away.</p>
          </HelpAccordion>
          <QuestionBankTab
            questions={questions} staff={staff} token={token}
            onDeactivate={id => setQuestions(qs => qs.filter(q => q.id !== id))}
            onAdd={q => setQuestions(qs => [...qs, q])}
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
