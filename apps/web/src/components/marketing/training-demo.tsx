'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react'
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

// A live, interactive taster of a training module: one real lesson followed by one
// real assessment question, mirroring the hub's teach-then-check flow. Shown on the
// marketing training pages (and reused on the PPC landing pages) so a visitor can
// see exactly how the training works before buying.
export function TrainingDemo({ demo, buyHref }: { demo: TrainingDemoData; buyHref: string }) {
  const [selected, setSelected] = useState<number | null>(null)
  const { lesson, question } = demo
  if (!lesson || !question) return null

  const answered = selected !== null
  const isCorrect = answered && selected === question.correct

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-teal-light px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
          <Sparkles size={13} /> Try it yourself
        </div>
        <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
          See how the {demo.title} training works.
        </h2>
        <p className="mb-10 text-lg leading-relaxed text-neutral-mid">
          Here is a real lesson and question from the module — the same teach-then-check approach your
          team gets in the hub, available in over 60 languages. The full module has {demo.total_sections} lessons
          and a {demo.total_questions}-question assessment, with a certificate for your CQC evidence.
        </p>

        {/* Lesson */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
          {lesson.image_url && (
            <SiteImage
              src={`${API_URL}${lesson.image_url}`}
              alt={`${demo.title} training: ${lesson.heading}`}
              className="aspect-[16/7] w-full object-cover"
            />
          )}
          <div className="p-7 md:p-9">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-teal text-xs font-extrabold text-white">01</span>
              <span className="text-xs font-bold uppercase tracking-wide text-teal">Lesson</span>
            </div>
            <h3 className="mb-3 text-2xl font-bold text-neutral-dark">{lesson.heading}</h3>
            <p className="whitespace-pre-line leading-relaxed text-neutral-mid">{lesson.body}</p>
          </div>
        </div>

        {/* Question */}
        <div className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card md:p-9">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-brand text-sm font-extrabold text-white">?</span>
            <span className="text-xs font-bold uppercase tracking-wide text-amber-brand">Quick check</span>
          </div>
          <p className="mb-6 text-lg font-semibold text-neutral-dark">{question.text}</p>
          <div className="space-y-3">
            {question.options.map((opt, i) => {
              const showCorrect = answered && i === question.correct
              const showWrong = answered && i === selected && i !== question.correct
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => !answered && setSelected(i)}
                  disabled={answered}
                  className={[
                    'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors',
                    showCorrect ? 'border-green-500 bg-green-50'
                      : showWrong ? 'border-red-400 bg-red-50'
                      : answered ? 'cursor-default border-gray-200 bg-white opacity-60'
                      : 'border-gray-200 bg-white hover:border-teal hover:bg-teal-light/40',
                  ].join(' ')}
                >
                  <span className="mt-0.5 flex-shrink-0">
                    {showCorrect ? <CheckCircle2 size={18} className="text-green-600" />
                      : showWrong ? <XCircle size={18} className="text-red-500" />
                      : <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-300 text-[10px] font-bold text-gray-400">{String.fromCharCode(65 + i)}</span>}
                  </span>
                  <span className={showCorrect ? 'font-semibold text-green-900' : showWrong ? 'text-red-900' : 'text-neutral-dark'}>{opt}</span>
                </button>
              )
            })}
          </div>

          {answered && (
            <div className={`mt-5 rounded-xl p-4 text-sm leading-relaxed ${isCorrect ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'}`}>
              <p className="mb-1 font-bold">{isCorrect ? 'Correct.' : 'Not quite.'}</p>
              <p>
                {question.explanation
                  ? question.explanation
                  : isCorrect
                    ? 'That’s the right call. In the full module, a wrong answer triggers a short follow-up lesson and a fresh question, so the gap is always closed before completion.'
                    : `The correct answer is “${question.options[question.correct]}”. In the full module, a wrong answer triggers a short follow-up lesson and a fresh question, so the gap is always closed before completion.`}
              </p>
            </div>
          )}
        </div>

        {/* CTA after the taster */}
        <div className="mt-8 flex flex-col items-center gap-5 rounded-2xl bg-hero-gradient p-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-lg font-semibold text-white">
            Give your whole team the full {demo.title} module.
          </p>
          <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
            <Link href={buyHref} className="rounded-btn bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
              Buy for your team
            </Link>
            <Link href="/register" className="btn-ghost-white rounded-btn border-2 border-white/30 px-7 py-3.5 text-sm text-white">
              Start free trial
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
