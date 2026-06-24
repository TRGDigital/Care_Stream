'use client'

import { useCallback, useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api-client'
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, Globe, Loader2, RotateCcw, Send, Star,
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
  attempts?:   number
  question:    { domain: string; model_answer?: string | null }
}

const RETRY_BELOW = 60

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

const DOMAIN_ORDER = ['safe', 'effective', 'caring', 'responsive', 'well_led']

// Group deliveries by CQC domain, ordered by the five key questions.
function groupByDomain(list: Delivery[]): Array<[string, Delivery[]]> {
  const map = new Map<string, Delivery[]>()
  for (const d of list) {
    const k = d.question.domain
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(d)
  }
  const ordered: Array<[string, Delivery[]]> = []
  for (const k of DOMAIN_ORDER) if (map.has(k)) ordered.push([k, map.get(k)!])
  for (const [k, v] of map) if (!DOMAIN_ORDER.includes(k)) ordered.push([k, v])
  return ordered
}

// ─── Answer Form ──────────────────────────────────────────────────────────────

function AnswerForm({ delivery, token, onAnswered }: {
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
      onAnswered({ ...delivery, ...res.delivery, score: res.score, feedback: res.feedback, question: { ...delivery.question, model_answer: res.model_answer } })
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
        onPaste={e => e.preventDefault()}
        onDrop={e => e.preventDefault()}
        placeholder="Write your answer here. Think about what a CQC inspector would want to hear, be specific and practical. There are no trick questions; they want to understand what you would actually do."
        className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
      />
      <p className="text-xs text-gray-400">
        Your answer will be evaluated by AI against best practice guidelines. You&apos;ll get a score and feedback straight away.
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

function ResultCard({ delivery, token, onUpdated }: {
  delivery:  Delivery
  token:     string
  onUpdated: (updated: Delivery) => void
}) {
  const score = delivery.score ?? 0
  const [retrying, setRetrying]   = useState(false)
  const [answer, setAnswer]       = useState('')
  const [submitting, setSub]      = useState(false)
  const [error, setError]         = useState('')

  async function submitRetry() {
    if (!answer.trim()) return
    setSub(true); setError('')
    try {
      const api = createApiClient(token)
      await api.cqcQuestions.retry(delivery.id)
      const res = await api.cqcQuestions.submitAnswer(delivery.id, answer)
      onUpdated({
        ...delivery,
        answer_text: res.delivery?.answer_text ?? answer,
        score:       res.score,
        feedback:    res.feedback,
        status:      'evaluated',
        attempts:    (delivery.attempts ?? 1) + 1,
        question:    { ...delivery.question, model_answer: res.model_answer ?? delivery.question?.model_answer ?? null },
      })
      setRetrying(false); setAnswer('')
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong — please try again.')
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className={`text-3xl font-bold px-4 py-2 rounded-xl ${scoreBadge(score)}`}>
          {score}<span className="text-base font-normal">/100</span>
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {scoreLabel(score)}
            {(delivery.attempts ?? 1) > 1 && <span className="ml-2 text-xs font-normal text-gray-400">Attempt {delivery.attempts}</span>}
          </p>
          <p className="text-xs text-gray-500">
            {score >= 80 ? 'You\'re well prepared for this topic.' :
             score >= 60 ? 'Good foundation — a little more detail would strengthen your answer.' :
             'Keep practising — review the model answer below, then try again.'}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Your answer</p>
        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3">{delivery.answer_text}</p>
      </div>

      {delivery.feedback && (
        <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-1">Feedback</p>
          <p className="text-sm text-teal-800">{delivery.feedback}</p>
        </div>
      )}

      {delivery.question?.model_answer && (
        <div
          className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 select-none"
          style={{ WebkitTouchCallout: 'none' }}
          onCopy={e => e.preventDefault()}
          onCut={e => e.preventDefault()}
          onContextMenu={e => e.preventDefault()}
          onDragStart={e => e.preventDefault()}
        >
          <p className="flex items-center gap-1.5 text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
            <Star className="w-3.5 h-3.5" /> Model answer — what a strong answer covers
          </p>
          <p className="text-sm text-green-800 leading-relaxed">{delivery.question.model_answer}</p>
        </div>
      )}

      {!retrying ? (
        <button
          onClick={() => { setRetrying(true); setError('') }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
            score < RETRY_BELOW ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <RotateCcw className="w-4 h-4" /> {score < RETRY_BELOW ? 'Review & try again' : 'Practise again'}
        </button>
      ) : (
        <div className="space-y-3 border-t border-gray-100 pt-3">
          <p className="text-xs text-gray-500">Now that you&apos;ve seen the model answer, have another go in your own words:</p>
          <textarea
            rows={5}
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            onPaste={e => e.preventDefault()}
            onDrop={e => e.preventDefault()}
            placeholder="Write your improved answer here…"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
          />
          {error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4" /> {error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={submitRetry}
              disabled={!answer.trim() || submitting}
              className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Evaluating…' : 'Submit new answer'}
            </button>
            <button onClick={() => { setRetrying(false); setAnswer(''); setError('') }} disabled={submitting}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CQC View ─────────────────────────────────────────────────────────────────
// Rendered inside the hub (chat) layout so the sidebar persists, and by the
// standalone /cqc route. onChange lets the host refresh the pending-count badge.

export function CqcView({ token, onChange, secondLang = null }: { token: string; onChange?: () => void; secondLang?: { name: string } | null }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [expanded, setExpanded]     = useState<string | null>(null)        // question card open
  const [openDomains, setOpenDomains] = useState<Set<string>>(new Set())   // domain accordions open
  // Session-only second-language switch for the whole CQC prep list (each card is a
  // single question, so one toggle flips them all).
  const [lang, setLang] = useState<'1' | '2'>('1')
  const toggleDomain = (key: string) =>
    setOpenDomains(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const load = useCallback(async () => {
    if (!token) return
    try {
      const api = createApiClient(token)
      const res = await api.cqcQuestions.myDeliveries(lang === '2' ? '2' : undefined)
      setDeliveries(res.deliveries)
      const first = res.deliveries.find((d: Delivery) => d.status === 'pending')
      if (first) { setExpanded(first.id); setOpenDomains(new Set([`p:${first.question.domain}`])) }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [token, lang])

  useEffect(() => { load() }, [load])

  const pending   = deliveries.filter(d => d.status === 'pending')
  const evaluated = deliveries.filter(d => d.status === 'evaluated')
  const overallAvg = evaluated.length
    ? Math.round(evaluated.reduce((s, d) => s + (d.score ?? 0), 0) / evaluated.length)
    : null

  if (loading) return (
    <div className="flex flex-1 items-center justify-center min-h-64">
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">CQC Inspector Prep</h1>
          <p className="text-sm text-gray-500 mt-1">
            Practise answering the kinds of questions a CQC inspector would ask you. Write your answers in your own words — there&apos;s no multiple choice.
          </p>
        </div>
        {secondLang && (
          <button
            onClick={() => { setLoading(true); setLang(l => l === '2' ? '1' : '2') }}
            title={lang === '2' ? `Showing in ${secondLang.name}. Tap to read in English.` : `Read these questions in ${secondLang.name} instead of English`}
            className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${lang === '2' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-700'}`}
          >
            <Globe className="w-3 h-3" /> {secondLang.name}
          </button>
        )}
      </div>

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

      {deliveries.length === 0 && (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
          <ClipboardList className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-600 font-medium">No questions yet</p>
          <p className="text-xs text-gray-400 mt-1">Your manager will send you CQC preparation questions here.</p>
        </div>
      )}

      {pending.length > 0 && (() => {
        const groups = groupByDomain(pending)
        const multi  = groups.length > 1
        return (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Questions to answer ({pending.length})</h2>
            <div className="space-y-3">
              {groups.map(([domain, items]) => {
                const open = !multi || openDomains.has(`p:${domain}`)
                return (
                  <div key={domain} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    {/* Domain header */}
                    <button onClick={() => multi && toggleDomain(`p:${domain}`)} className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left ${multi ? 'hover:bg-gray-50' : 'cursor-default'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${DOMAIN_COLORS[domain] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                          {DOMAIN_LABELS[domain] ?? domain}
                        </span>
                        <span className="text-xs text-gray-500">{items.length} to answer</span>
                      </div>
                      {multi && (open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />)}
                    </button>
                    {/* Questions within the domain */}
                    {open && (
                      <div className="border-t border-gray-100 px-5">
                        {items.map(d => (
                          <div key={d.id} className="border-b border-gray-50 last:border-0">
                            <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="w-full flex items-start justify-between gap-3 py-3.5 text-left">
                              <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 leading-snug">{d.rephrased_q}</p>
                              {expanded === d.id ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                            </button>
                            {expanded === d.id && (
                              <div className="pb-4">
                                <AnswerForm delivery={d} token={token}
                                  onAnswered={updated => { setDeliveries(ds => ds.map(x => x.id === updated.id ? updated : x)); setExpanded(null); onChange?.() }} />
                              </div>
                            )}
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

      {evaluated.length > 0 && (() => {
        const groups = groupByDomain(evaluated)
        const multi  = groups.length > 1
        return (
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Completed ({evaluated.length})</h2>
            <div className="space-y-3">
              {groups.map(([domain, items]) => {
                const open = !multi || openDomains.has(`c:${domain}`)
                const avg  = Math.round(items.reduce((s, d) => s + (d.score ?? 0), 0) / items.length)
                return (
                  <div key={domain} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                    <button onClick={() => multi && toggleDomain(`c:${domain}`)} className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left ${multi ? 'hover:bg-gray-50' : 'cursor-default'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${DOMAIN_COLORS[domain] ?? 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                          {DOMAIN_LABELS[domain] ?? domain}
                        </span>
                        <span className="text-xs text-gray-500">{items.length} done</span>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${scoreBadge(avg)}`}>avg {avg}</span>
                      </div>
                      {multi && (open ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />)}
                    </button>
                    {open && (
                      <div className="border-t border-gray-100 px-5">
                        {items.map(d => (
                          <div key={d.id} className="border-b border-gray-50 last:border-0">
                            <button onClick={() => setExpanded(expanded === d.id ? null : d.id)} className="w-full flex items-start justify-between gap-3 py-3.5 text-left">
                              <div className="flex-1 min-w-0">
                                {d.score !== null && (
                                  <span className={`mb-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${scoreBadge(d.score)}`}>
                                    {d.score}/100 — {scoreLabel(d.score)}
                                  </span>
                                )}
                                <p className="text-sm font-medium text-gray-900 leading-snug">{d.rephrased_q}</p>
                              </div>
                              {expanded === d.id ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
                            </button>
                            {expanded === d.id && (
                              <div className="pb-4">
                                <ResultCard delivery={d} token={token}
                                  onUpdated={updated => { setDeliveries(ds => ds.map(x => x.id === updated.id ? updated : x)); onChange?.() }} />
                              </div>
                            )}
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
    </div>
  )
}
