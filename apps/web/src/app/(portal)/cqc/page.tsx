'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, Loader2, Send, Star,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Delivery = {
  id:          string
  rephrased_q: string
  channel:     string
  answer_text: string | null
  score:       number | null
  feedback:    string | null
  status:      'pending' | 'answered' | 'evaluated'
  sent_at:     string
  answered_at: string | null
  question:    { domain: string }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  safe: 'Safe', effective: 'Effective', caring: 'Caring',
  responsive: 'Responsive', well_led: 'Well-led',
}

const DOMAIN_COLORS: Record<string, string> = {
  safe: 'text-red-700 bg-red-50 border-red-200',
  effective: 'text-blue-700 bg-blue-50 border-blue-200',
  caring: 'text-purple-700 bg-purple-50 border-purple-200',
  responsive: 'text-amber-700 bg-amber-50 border-amber-200',
  well_led: 'text-teal-700 bg-teal-50 border-teal-200',
}

function scoreBadge(score: number) {
  if (score >= 80) return 'bg-green-100 text-green-700'
  if (score >= 60) return 'bg-yellow-100 text-yellow-700'
  if (score >= 40) return 'bg-orange-100 text-orange-700'
  return 'bg-red-100 text-red-700'
}

function scoreLabel(score: number) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Needs work'
  return 'Keep practising'
}

// ─── Answer Form ──────────────────────────────────────────────────────────────

function AnswerForm({
  delivery,
  token,
  onAnswered,
}: {
  delivery:   Delivery
  token:      string
  onAnswered: (updated: Delivery) => void
}) {
  const [answer, setAnswer]   = useState('')
  const [submitting, setSub]  = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit() {
    if (!answer.trim()) return
    setSub(true); setError('')
    try {
      const api = createApiClient(token)
      const res = await api.cqcQuestions.submitAnswer(delivery.id, answer)
      onAnswered({ ...delivery, ...res.delivery, score: res.score, feedback: res.feedback })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        rows={6}
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        placeholder="Write your answer here. Think about what a CQC inspector would want to hear — be specific and practical. There are no trick questions; they want to understand what you would actually do."
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
      />
      <p className="text-xs text-gray-400">
        Your answer will be evaluated by AI against best practice guidelines. You'll get a score and feedback straight away.
      </p>
      {error && (
        <p className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4" /> {error}
        </p>
      )}
      <button
        onClick={handleSubmit}
        disabled={!answer.trim() || submitting}
        className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        {submitting ? 'Evaluating…' : 'Submit answer'}
      </button>
    </div>
  )
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function ResultCard({ delivery }: { delivery: Delivery }) {
  const score = delivery.score ?? 0
  return (
    <div className="space-y-3">
      {/* Score */}
      <div className="flex items-center gap-3">
        <div className={`text-3xl font-bold px-4 py-2 rounded-xl ${scoreBadge(score)}`}>
          {score}<span className="text-base font-normal">/100</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900">{scoreLabel(score)}</p>
          <p className="text-xs text-gray-500">
            {score >= 80 ? 'You\'re well prepared for this topic.' :
             score >= 60 ? 'Good foundation — a little more detail would strengthen your answer.' :
             'Keep practising — reviewing the key points below will help.'}
          </p>
        </div>
      </div>

      {/* Your answer */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Your answer</p>
        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">
          {delivery.answer_text}
        </p>
      </div>

      {/* AI feedback */}
      {delivery.feedback && (
        <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-1">Feedback</p>
          <p className="text-sm text-teal-800">{delivery.feedback}</p>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CqcPortalPage() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [expanded, setExpanded]     = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const api = createApiClient(token)
      const res = await api.cqcQuestions.myDeliveries()
      setDeliveries(res.deliveries)
      // Auto-open first pending question
      const first = res.deliveries.find((d: Delivery) => d.status === 'pending')
      if (first) setExpanded(first.id)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const pending   = deliveries.filter(d => d.status === 'pending')
  const evaluated = deliveries.filter(d => d.status === 'evaluated')

  const overallAvg = evaluated.length
    ? Math.round(evaluated.reduce((s, d) => s + (d.score ?? 0), 0) / evaluated.length)
    : null

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
    </div>
  )

  if (error) return (
    <div className="flex items-center gap-2 text-red-600 p-6">
      <AlertCircle className="w-5 h-5" /> {error}
    </div>
  )

  return (
    <div className="flex-1 overflow-y-auto">
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">CQC Inspector Prep</h1>
        <p className="text-sm text-gray-500 mt-1">
          Practise answering the kinds of questions a CQC inspector would ask you. Write your answers in your own words — there's no multiple choice.
        </p>
      </div>

      {/* Stats */}
      {(pending.length > 0 || evaluated.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">To answer</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-teal-600">{evaluated.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">Completed</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${overallAvg !== null ? (overallAvg >= 60 ? 'text-green-600' : 'text-orange-600') : 'text-gray-300'}`}>
              {overallAvg !== null ? overallAvg : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Avg score</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {deliveries.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium">No questions yet</p>
          <p className="text-xs text-gray-400 mt-1">Your manager will send you CQC preparation questions here.</p>
        </div>
      )}

      {/* Pending questions */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Questions to answer ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(d => (
              <div key={d.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                  className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${DOMAIN_COLORS[d.question.domain] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                        {DOMAIN_LABELS[d.question.domain] ?? d.question.domain}
                      </span>
                      <span className="text-xs text-amber-600 font-medium">Awaiting answer</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 leading-snug">{d.rephrased_q}</p>
                  </div>
                  {expanded === d.id
                    ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                  }
                </button>
                {expanded === d.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <AnswerForm
                      delivery={d}
                      token={token}
                      onAnswered={updated => {
                        setDeliveries(ds => ds.map(x => x.id === updated.id ? updated : x))
                        setExpanded(null)
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {evaluated.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Completed ({evaluated.length})
          </h2>
          <div className="space-y-3">
            {evaluated.map(d => (
              <div key={d.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                  className="w-full flex items-start justify-between gap-3 px-5 py-4 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${DOMAIN_COLORS[d.question.domain] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                        {DOMAIN_LABELS[d.question.domain] ?? d.question.domain}
                      </span>
                      {d.score !== null && (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${scoreBadge(d.score)}`}>
                          {d.score}/100 — {scoreLabel(d.score)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 leading-snug">{d.rephrased_q}</p>
                  </div>
                  {expanded === d.id
                    ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                    : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                  }
                </button>
                {expanded === d.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <ResultCard delivery={d} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
