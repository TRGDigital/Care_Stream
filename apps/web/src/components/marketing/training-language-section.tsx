'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Globe, CheckCircle2, Clock, ArrowRight } from 'lucide-react'
import { SiteImage } from '@/components/site-image'

// A big USP: on any lesson or question, a staff member taps "This step in <their
// language>" and the whole step flips into one of 60+ languages. This section pairs
// the pitch with an on-brand recreation of the hub lesson view — with a live,
// clickable language toggle (cycles the language) so visitors feel the idea.
const DEMO_LANGS = ['Hindi', 'Polish', 'Romanian', 'Urdu', 'Tagalog', 'Portuguese', 'Spanish', 'Bengali']

export function TrainingLanguageSection({
  moduleTitle,
  illustrationUrl,
  lessonSnippet,
}: {
  moduleTitle: string
  illustrationUrl?: string
  lessonSnippet?: string
}) {
  const [i, setI] = useState(0)
  const lang = DEMO_LANGS[i]
  const snippet =
    lessonSnippet ||
    'This training covers how we keep the people we support safe, the standards expected of every team member, and how to apply it in real situations while respecting dignity and independence.'

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy (right on desktop, so it alternates with the section above) */}
          <div className="lg:order-2">
            <p className="section-label mb-3 text-teal">In every language</p>
            <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
              Any step, in their language, in one tap.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
              Care teams are diverse and training should not leave anyone behind. On any lesson or question,
              a staff member taps the language button and the whole step flips into the language they think
              in. They understand it properly, and your records stay in English.
            </p>
            <ul className="mb-8 space-y-3">
              {[
                'One tap flips any lesson or question into their language, instantly.',
                'Over 60 languages, with no setup and no separate versions to manage.',
                'Completions and certificates stay in English for your CQC evidence.',
              ].map((b) => (
                <li key={b} className="flex items-start gap-3 text-neutral-dark">
                  <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="leading-relaxed">{b}</span>
                </li>
              ))}
            </ul>
            <p className="text-neutral-mid">
              Try the language button in the preview, or{' '}
              <Link href="/languages" className="inline-flex items-center gap-1 font-semibold text-teal hover:text-teal-dark">
                see every language <ArrowRight size={14} />
              </Link>
            </p>
          </div>

          {/* Hub lesson mock with the live language toggle (left on desktop) */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated lg:order-1">
            <div className="flex items-center gap-1.5 border-b border-gray-100 bg-neutral-light px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              <span className="ml-3 text-xs text-neutral-mid">The CareStream hub</span>
            </div>
            <div className="bg-[#faf8ff] p-5 md:p-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-neutral-mid">‹ My Training</span>
                <button
                  type="button"
                  onClick={() => setI((n) => (n + 1) % DEMO_LANGS.length)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-white px-3 py-1.5 text-xs font-bold text-purple-700 shadow-sm transition-colors hover:bg-purple-50"
                >
                  <Globe size={13} /> This step in {lang}
                </button>
              </div>
              <h3 className="text-lg font-extrabold text-neutral-dark">{moduleTitle}</h3>
              <div className="mb-3 mt-0.5 flex items-center justify-between text-xs text-neutral-mid">
                <span>Overview</span>
                <span>0% complete</span>
              </div>
              {illustrationUrl ? (
                <SiteImage src={illustrationUrl} alt="" className="aspect-[16/9] w-full rounded-xl object-cover" />
              ) : (
                <div className="aspect-[16/9] w-full rounded-xl bg-gradient-to-br from-teal-light to-neutral-light" />
              )}
              <div className="mt-4 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wide text-purple-700">Learning: what to read first</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] text-neutral-mid ring-1 ring-gray-200">
                  <Clock size={11} /> About 35 min
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-mid">{snippet}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
