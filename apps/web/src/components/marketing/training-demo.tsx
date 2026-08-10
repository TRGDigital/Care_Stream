'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, RotateCcw, Send, Info, Globe } from 'lucide-react'
import { SiteImage } from '@/components/site-image'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type TrainingDemoData = {
  slug: string
  title: string
  lesson: { heading: string; body: string; image_url: string | null } | null
  question: { text: string; options: string[]; correct: number; explanation: string | null } | null
  total_sections: number
  total_questions: number
  // Saved translations of the demo (English stays canonical; option order preserved
  // so the `correct` index is unchanged). Present only for languages that exist.
  translations?: Record<string, { lesson: { heading: string; body: string }; question: { text: string; options: string[]; explanation: string | null } }>
}

type Step = 'lesson' | 'question' | 'result'
const STEPS: { key: Step; label: string }[] = [
  { key: 'lesson', label: 'Lesson' },
  { key: 'question', label: 'Question' },
  { key: 'result', label: 'Result' },
]

// A live, interactive taster of a training module that steps through the same flow
// as the real hub: read the lesson, answer a question, then see whether you got it
// right. `variant='full'` renders the full section with sticky intro + CTA (used on
// the SEO training pages); `variant='card'` renders just the interactive card, for
// embedding as the focal element of a landing-page hero.
export function TrainingDemo({
  demo,
  buyHref,
  variant = 'full',
  onTakeQuiz,
}: {
  demo: TrainingDemoData
  buyHref: string
  variant?: 'full' | 'card'
  onTakeQuiz?: () => void
}) {
  const [step, setStep] = useState<Step>('lesson')
  const [selected, setSelected] = useState<number | null>(null)
  const [showInfo, setShowInfo] = useState(false)
  const [lang, setLang] = useState<'eng' | 'pol' | 'hin'>('eng')
  const { lesson, question } = demo
  if (!lesson || !question) return null

  // Swap in the saved translation when a language is selected (English is canonical).
  const availableLangs = (['pol', 'hin'] as const).filter((l) => demo.translations?.[l])
  const tr = lang !== 'eng' ? demo.translations?.[lang] : undefined
  const L = tr ? { heading: tr.lesson.heading, body: tr.lesson.body, image_url: lesson.image_url } : lesson
  const Q = tr ? { text: tr.question.text, options: tr.question.options, correct: question.correct, explanation: tr.question.explanation } : question

  const stepIdx = STEPS.findIndex((s) => s.key === step)
  const answered = selected !== null
  const isCorrect = selected === Q.correct

  const track = (event: string, extra?: Record<string, unknown>) => {
    try {
      ;(window as any).gtag?.('event', event, { event_category: 'training-demo', event_label: demo.slug, ...extra })
    } catch { /* tracking must never break the demo */ }
  }

  // The interactive card. Every step is rendered into the DOM (visibility toggled
  // with CSS) so the full lesson, question and answer are server-rendered and
  // crawlable by Googlebot, while the click-through wizard drives what's shown.
  const card = (
    <div className={`overflow-hidden rounded-2xl border border-gray-100 bg-white ${variant === 'card' ? 'shadow-elevated' : 'shadow-card'}`}>
      {/* Language toggle — saved Polish + Hindi translations, no runtime cost */}
      {availableLangs.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-2.5 sm:px-6">
          <span className="mr-auto flex items-center gap-1.5 text-xs font-semibold text-neutral-mid"><Globe size={13} /> This lesson in</span>
          {(([['eng', 'English'], ['pol', 'Polski'], ['hin', '\u0939\u093f\u0928\u094d\u0926\u0940']]) as [string, string][])
            .filter(([c]) => c === 'eng' || availableLangs.includes(c as 'pol' | 'hin'))
            .map(([code, label]) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code as 'eng' | 'pol' | 'hin')}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${lang === code ? 'bg-purple-600 text-white' : 'border border-gray-200 text-neutral-mid hover:border-purple-300 hover:text-purple-700'}`}
              >
                {label}
              </button>
            ))}
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4 sm:gap-3 sm:px-8">
        {STEPS.map((s, i) => {
          const active = i === stepIdx
          const done = i < stepIdx
          return (
            <div key={s.key} className="flex items-center gap-2 sm:gap-3">
              <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${active ? 'bg-teal text-white' : done ? 'bg-teal/15 text-teal' : 'bg-gray-100 text-gray-400'}`}>
                {done ? <CheckCircle2 size={16} /> : i + 1}
              </span>
              <span className={`text-sm font-bold ${active ? 'text-neutral-dark' : 'text-gray-400'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-gray-200 sm:w-7" />}
            </div>
          )
        })}
      </div>

      {/* Step: Lesson */}
      <div className={step === 'lesson' ? '' : 'hidden'}>
        {L.image_url && (
          <SiteImage
            src={`${API_URL}${L.image_url}`}
            alt={`${demo.title} training: ${L.heading}`}
            className="aspect-[16/7] w-full object-cover"
          />
        )}
        <div className="p-7 md:p-9">
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-wide text-teal">Lesson 1 of {demo.total_sections}</span>
          <h3 className="mb-3 text-2xl font-bold text-neutral-dark">{L.heading}</h3>
          <p className="mb-8 whitespace-pre-line leading-relaxed text-neutral-mid">{L.body}</p>
          <button
            type="button"
            onClick={() => { setStep('question'); track('demo_started') }}
            className="inline-flex items-center gap-2 rounded-btn bg-teal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Next: answer a question <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Step: Question */}
      <div className={step === 'question' ? 'p-7 md:p-9' : 'hidden'}>
        <span className="mb-4 inline-block text-xs font-bold uppercase tracking-wide text-amber-brand">Quick check</span>
        <p className="mb-6 text-lg font-semibold text-neutral-dark">{Q.text}</p>
        <div className="space-y-3">
          {Q.options.map((opt, i) => {
            const chosen = selected === i
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${chosen ? 'border-teal bg-teal-light/50 ring-1 ring-teal' : 'border-gray-200 bg-white hover:border-teal hover:bg-teal-light/30'}`}
              >
                <span className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${chosen ? 'bg-teal text-white' : 'border border-gray-300 text-gray-400'}`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className={chosen ? 'font-semibold text-neutral-dark' : 'text-neutral-dark'}>{opt}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-7 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep('lesson')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-mid hover:text-teal"
          >
            <ArrowLeft size={15} /> Back to lesson
          </button>
          <button
            type="button"
            disabled={!answered}
            onClick={() => { setStep('result'); track('demo_completed', { correct: isCorrect }) }}
            className="inline-flex items-center gap-2 rounded-btn bg-teal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-40"
          >
            See result <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Step: Result — the correct answer + explanation always render (crawlable);
          the visitor's own choice is highlighted once they've answered. */}
      <div className={step === 'result' ? 'p-7 md:p-9' : 'hidden'}>
        {answered && (
          <div className={`mb-6 flex items-center gap-3 rounded-xl p-4 ${isCorrect ? 'bg-green-50' : 'bg-amber-50'}`}>
            {isCorrect ? <CheckCircle2 size={24} className="flex-shrink-0 text-green-600" /> : <XCircle size={24} className="flex-shrink-0 text-amber-600" />}
            <p className={`text-lg font-bold ${isCorrect ? 'text-green-900' : 'text-amber-900'}`}>
              {isCorrect ? 'Correct.' : 'Not quite.'}
            </p>
          </div>
        )}

        <div className="space-y-3">
          {Q.options.map((opt, i) => {
            const showCorrect = i === Q.correct
            const showWrong = answered && i === selected && i !== Q.correct
            return (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-4 ${showCorrect ? 'border-green-500 bg-green-50' : showWrong ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white opacity-60'}`}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {showCorrect ? <CheckCircle2 size={18} className="text-green-600" /> : showWrong ? <XCircle size={18} className="text-red-500" /> : <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-400">{String.fromCharCode(65 + i)}</span>}
                </span>
                <span className={showCorrect ? 'font-semibold text-green-900' : showWrong ? 'text-red-900' : 'text-neutral-dark'}>{opt}</span>
              </div>
            )
          })}
        </div>

        <div className="mt-5 rounded-xl bg-neutral-light p-4 text-sm leading-relaxed text-neutral-dark">
          <p>
            <span className="font-bold">The correct answer is “{Q.options[Q.correct]}”.</span>{' '}
            {Q.explanation
              ? Q.explanation
              : 'In the full module, a wrong answer triggers a short follow-up lesson and a fresh question, so the gap is always closed before completion.'}
          </p>
        </div>

        {/* When wrong, mirror what the hub does: send a follow-up, with an info bubble. */}
        {answered && !isCorrect && (
          <div className="mt-3 rounded-xl border border-teal/20 bg-teal-light/40 p-4">
            <div className="flex items-center gap-2">
              <Send size={16} className="flex-shrink-0 text-teal" />
              <span className="font-semibold text-neutral-dark">A follow-up question has been sent.</span>
              <button
                type="button"
                onClick={() => setShowInfo((v) => !v)}
                aria-label="How follow-up questions work in the CareStream hub"
                aria-expanded={showInfo}
                className="ml-0.5 text-teal/70 transition-colors hover:text-teal"
              >
                <Info size={15} />
              </button>
            </div>
            {showInfo && (
              <p className="mt-2 text-sm leading-relaxed text-neutral-mid">
                In the CareStream hub, getting a question wrong automatically sends the staff member a short
                follow-up lesson and a fresh question on the same point. They close the gap before they can
                finish the module, and every attempt is recorded for your CQC evidence.
              </p>
            )}
          </div>
        )}

        {/* Completion CTA — buy now, or open the free gap-check quiz */}
        <div className="mt-6 border-t border-gray-100 pt-6">
          <p className="mb-4 font-semibold text-neutral-dark">
            That is how the training works. Give your whole team the full {demo.title} module.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={buyHref}
              className="flex-1 rounded-btn bg-blue-600 px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700"
            >
              Buy now for your team
            </Link>
            {onTakeQuiz && (
              <button
                type="button"
                onClick={onTakeQuiz}
                className="flex-1 rounded-btn border-2 border-gray-200 px-6 py-3.5 text-sm font-semibold text-neutral-dark transition-colors hover:border-teal hover:text-teal"
              >
                Not ready? Free gap check
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => { setSelected(null); setStep('lesson'); setShowInfo(false) }}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-mid hover:text-teal"
          >
            <RotateCcw size={15} /> Try the demo again
          </button>
        </div>
      </div>
    </div>
  )

  // Card-only, for embedding as a hero focal element.
  if (variant === 'card') return card

  // Full section with sticky intro + CTA (SEO training pages).
  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
          {/* Left: intro + CTA, sticky on desktop */}
          <div className="lg:sticky lg:top-28">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-light px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
              <Sparkles size={13} /> Try it yourself
            </div>
            <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
              See how the {demo.title} training works.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
              Read a real lesson from the module, then answer a real question, just like your team does in
              the hub. It is available in over 60 languages, and the full module has {demo.total_sections} lessons
              and an assessment of {demo.total_questions} questions, with a certificate for your CQC evidence.
            </p>
            <p className="mb-4 font-semibold text-neutral-dark">
              Give your whole team the full {demo.title} module.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
              <Link href={buyHref} className="rounded-btn bg-blue-600 px-7 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
                Buy for your team
              </Link>
              <Link href="/register" className="rounded-btn border-2 border-gray-200 px-7 py-3.5 text-center text-sm font-semibold text-neutral-dark transition-colors hover:border-teal hover:text-teal">
                Start free trial
              </Link>
            </div>
          </div>

          {/* Right: interactive demo card */}
          {card}
        </div>
      </div>
    </section>
  )
}
