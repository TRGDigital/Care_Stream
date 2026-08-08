'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react'
import { SiteImage } from '@/components/site-image'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type TrainingDemoData = {
  slug: string
  title: string
  lesson: { heading: string; body: string; image_url: string | null } | null
  question: { text: string; options: string[]; correct: number; explanation: string | null } | null
  total_sections: number
  total_questions: number
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
}: {
  demo: TrainingDemoData
  buyHref: string
  variant?: 'full' | 'card'
}) {
  const [step, setStep] = useState<Step>('lesson')
  const [selected, setSelected] = useState<number | null>(null)
  const { lesson, question } = demo
  if (!lesson || !question) return null

  const stepIdx = STEPS.findIndex((s) => s.key === step)
  const answered = selected !== null
  const isCorrect = selected === question.correct

  // The interactive card. Every step is rendered into the DOM (visibility toggled
  // with CSS) so the full lesson, question and answer are server-rendered and
  // crawlable by Googlebot, while the click-through wizard drives what's shown.
  const card = (
    <div className={`overflow-hidden rounded-2xl border border-gray-100 bg-white ${variant === 'card' ? 'shadow-elevated' : 'shadow-card'}`}>
      {/* Stepper */}
      <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4 sm:gap-3 sm:px-8">
        {STEPS.map((s, i) => {
          const active = i === stepIdx
          const done = i < stepIdx
          return (
            <div key={s.key} className="flex items-center gap-2 sm:gap-3">
              <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${active ? 'bg-teal text-white' : done ? 'bg-teal/15 text-teal' : 'bg-gray-100 text-gray-400'}`}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </span>
              <span className={`text-xs font-semibold ${active ? 'text-neutral-dark' : 'text-gray-400'}`}>{s.label}</span>
              {i < STEPS.length - 1 && <span className="h-px w-5 bg-gray-200 sm:w-8" />}
            </div>
          )
        })}
      </div>

      {/* Step: Lesson */}
      <div className={step === 'lesson' ? '' : 'hidden'}>
        {lesson.image_url && (
          <SiteImage
            src={`${API_URL}${lesson.image_url}`}
            alt={`${demo.title} training: ${lesson.heading}`}
            className="aspect-[16/7] w-full object-cover"
          />
        )}
        <div className="p-7 md:p-9">
          <span className="mb-4 inline-block text-xs font-bold uppercase tracking-wide text-teal">Lesson 1 of {demo.total_sections}</span>
          <h3 className="mb-3 text-2xl font-bold text-neutral-dark">{lesson.heading}</h3>
          <p className="mb-8 whitespace-pre-line leading-relaxed text-neutral-mid">{lesson.body}</p>
          <button
            type="button"
            onClick={() => setStep('question')}
            className="inline-flex items-center gap-2 rounded-btn bg-teal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-teal-dark"
          >
            Next: answer a question <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Step: Question */}
      <div className={step === 'question' ? 'p-7 md:p-9' : 'hidden'}>
        <span className="mb-4 inline-block text-xs font-bold uppercase tracking-wide text-amber-brand">Quick check</span>
        <p className="mb-6 text-lg font-semibold text-neutral-dark">{question.text}</p>
        <div className="space-y-3">
          {question.options.map((opt, i) => {
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
            onClick={() => setStep('result')}
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
          {question.options.map((opt, i) => {
            const showCorrect = i === question.correct
            const showWrong = answered && i === selected && i !== question.correct
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
            <span className="font-bold">The correct answer is “{question.options[question.correct]}”.</span>{' '}
            {question.explanation
              ? question.explanation
              : 'In the full module, a wrong answer triggers a short follow-up lesson and a fresh question, so the gap is always closed before completion.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => { setSelected(null); setStep('lesson') }}
          className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-mid hover:text-teal"
        >
          <RotateCcw size={15} /> Try the demo again
        </button>
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
