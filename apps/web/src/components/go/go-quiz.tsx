'use client'

import { useState } from 'react'
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type QuizQuestion = { q: string; options: string[] }

// Capture ad attribution from the URL so leads can be tied back to ad group/keyword.
function captureUtm(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    const p = new URLSearchParams(window.location.search)
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid']) {
      const v = p.get(k)
      if (v) out[k] = v
    }
  } catch { /* no-op */ }
  return out
}

// A gamified "training gap check": one question per step (near-zero friction taps),
// then a short contact step. Answers + UTM/gclid ride along with the lead. This is
// the secondary capture path — for visitors who don't buy — and is reused in the
// exit-intent popup.
export function GoQuiz({
  slug,
  moduleTitle,
  questions,
}: {
  slug: string
  moduleTitle: string
  questions: QuizQuestion[]
}) {
  const total = questions.length
  const [step, setStep] = useState(-1) // -1 intro, 0..total-1 questions, total contact
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [form, setForm] = useState({ name: '', email: '', home: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const contactStep = step >= total
  const track = (event: string, extra?: Record<string, unknown>) => {
    try {
      ;(window as any).gtag?.('event', event, { event_category: 'go-quiz', event_label: slug, ...extra })
    } catch { /* tracking must never break the quiz */ }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  function start() {
    setStep(0)
    track('quiz_start')
  }

  function pick(q: string, option: string) {
    setAnswers((a) => ({ ...a, [q]: option }))
    track('quiz_question_answered', { step: step + 1, question: q.slice(0, 80) })
    const next = step + 1
    setStep(next)
    if (next >= total) track('quiz_contact_step', { step: total })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    const utm = captureUtm()
    const answerLines = questions.map((q) => `- ${q.q}  →  ${answers[q.q] ?? '(skipped)'}`).join('\n')
    const utmLine = Object.entries(utm).map(([k, v]) => `${k}=${v}`).join('  ')
    try {
      track('generate_lead')
      // Fire a Google Ads conversion when the send-to target is configured.
      const sendTo = process.env.NEXT_PUBLIC_GADS_SEND_TO
      if (sendTo) {
        try { (window as any).gtag?.('event', 'conversion', { send_to: sendTo }) } catch { /* no-op */ }
      }
      const res = await fetch(`${API_URL}/public/marketing/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'demo',
          name: form.name,
          email: form.email,
          organisation: form.home || null,
          subject: `Training gap check: ${moduleTitle}`,
          message: `Training gap check from /go/${slug} (${moduleTitle}).\n\n${answerLines}${utmLine ? `\n\n${utmLine}` : ''}`,
          source: 'web',
        }),
      })
      if (!res.ok) throw new Error('failed')
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-neutral-dark outline-none transition-colors focus:border-teal focus:ring-1 focus:ring-teal'
  const pct = Math.round(((contactStep ? total : Math.max(step, 0)) / (total + 1)) * 100)

  if (status === 'done') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
        <CheckCircle2 size={40} className="mx-auto mb-4 text-green-600" />
        <h3 className="mb-2 text-xl font-extrabold text-neutral-dark">Thank you.</h3>
        <p className="leading-relaxed text-neutral-mid">
          A member of the CareStream team will reply <strong>within one working day</strong> with a
          personalised {moduleTitle} training plan for your team.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card md:p-8">
      {/* Progress */}
      {step >= 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-neutral-mid">
            <span>{contactStep ? 'Last step' : `Question ${step + 1} of ${total}`}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Intro */}
      {step === -1 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal">Free training gap check</p>
          <h3 className="mb-3 text-2xl font-extrabold leading-tight text-neutral-dark">
            Is your team&apos;s {moduleTitle} training inspection-ready?
          </h3>
          <p className="mb-6 leading-relaxed text-neutral-mid">
            Answer {total} quick questions and we&apos;ll send a personalised plan for your team, within one
            working day. Free, no obligation, under a minute.
          </p>
          <button type="button" onClick={start} className="inline-flex items-center gap-2 rounded-btn bg-teal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark">
            Start the check <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Questions */}
      {step >= 0 && !contactStep && questions[step] && (
        <div>
          <p className="mb-5 text-lg font-semibold text-neutral-dark">{questions[step].q}</p>
          <div className="space-y-3">
            {questions[step].options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => pick(questions[step].q, o)}
                className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left font-medium text-neutral-dark transition-colors hover:border-teal hover:bg-teal-light/30"
              >
                {o}
                <ArrowRight size={16} className="flex-shrink-0 text-neutral-mid" />
              </button>
            ))}
          </div>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-mid hover:text-teal">
              <ArrowLeft size={15} /> Back
            </button>
          )}
        </div>
      )}

      {/* Contact */}
      {contactStep && (
        <form onSubmit={submit}>
          <h3 className="mb-2 text-xl font-extrabold text-neutral-dark">Where should we send your plan?</h3>
          <p className="mb-5 text-sm leading-relaxed text-neutral-mid">
            We&apos;ll review your answers and reply personally within one working day.
          </p>
          <div className="space-y-4">
            <input required placeholder="Your name" value={form.name} onChange={set('name')} className={inputCls} autoComplete="name" />
            <input required type="email" placeholder="Work email" value={form.email} onChange={set('email')} className={inputCls} autoComplete="email" />
            <input placeholder="Care home or group" value={form.home} onChange={set('home')} className={inputCls} autoComplete="organization" />
          </div>
          {status === 'error' && (
            <p className="mt-3 text-sm font-semibold text-red-600">Something went wrong — please try again, or email hello@carestreamai.com.</p>
          )}
          <button type="submit" disabled={status === 'sending'} className="mt-5 w-full rounded-btn bg-teal px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-teal-dark disabled:opacity-60">
            {status === 'sending' ? 'Sending…' : 'Send me my training plan'}
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-gray-400">
            No spam, ever. We only use your details to reply about {moduleTitle} training.
          </p>
        </form>
      )}
    </div>
  )
}
