'use client'

// Floating stats bar that straddles the hero and the section below it on the
// course landing pages (/staff-training/[slug] and /go/[slug]). Three columns:
// average duration, a LIVE "is my language supported" checker, and a reserved
// (currently blank) space for the CPD-Accredited badge once approval lands.

import { useMemo, useState } from 'react'
import { Clock, Globe, Search, CheckCircle2 } from 'lucide-react'
import { COURSE_LANGUAGES } from '@/lib/languages'

function formatDuration(min?: number | null): string {
  if (!min || min <= 0) return '45 to 90 minutes'
  if (min < 60) return `About ${min} minutes`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} hr ${m} min` : `About ${h} hour${h > 1 ? 's' : ''}`
}

// Live language checker: type a language, see instantly whether the course is
// available in it. Matches on name (case-insensitive, partial), reading from
// the same supported-languages list the platform uses.
function LanguageChecker() {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const match = useMemo(() => {
    if (!query) return null
    return (
      COURSE_LANGUAGES.find(l => l.name.toLowerCase() === query) ??
      COURSE_LANGUAGES.find(l => l.name.toLowerCase().startsWith(query)) ??
      COURSE_LANGUAGES.find(l => l.name.toLowerCase().includes(query)) ??
      null
    )
  }, [query])

  return (
    <div>
      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-mid" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Type your language"
          aria-label="Check if your language is supported"
          className="w-full rounded-lg border border-gray-200 py-1.5 pl-8 pr-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
        />
      </div>
      <div className="mt-1.5 min-h-[18px] text-xs" aria-live="polite">
        {!query ? (
          <span className="text-neutral-mid">Over 60 languages supported</span>
        ) : match ? (
          <span className="inline-flex items-center gap-1 font-semibold text-green-600">
            <CheckCircle2 size={13} /> Yes — {match.name} is supported
          </span>
        ) : (
          <span className="text-neutral-mid">Not listed yet — ask us, we add languages on request</span>
        )}
      </div>
    </div>
  )
}

export function CourseStatsBar({ durationMinutes, cpdAccredited = false }: { durationMinutes?: number | null; cpdAccredited?: boolean }) {
  return (
    <div className="relative z-20 mx-auto -mt-14 max-w-4xl px-6 md:-mt-16">
      <div className="grid grid-cols-1 items-center gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-elevated sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-gray-100">
        {/* Avg. duration */}
        <div className="sm:pr-6">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-mid">
            <Clock size={13} className="text-teal" /> Avg. Duration
          </p>
          <p className="mt-1.5 text-sm font-semibold text-neutral-dark">{formatDuration(durationMinutes)}</p>
        </div>

        {/* Available languages — live checker */}
        <div className="sm:px-6">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-mid">
            <Globe size={13} className="text-teal" /> Available Languages (60+)
          </p>
          <div className="mt-1.5">
            <LanguageChecker />
          </div>
        </div>

        {/* Publisher, and the CPD-Accredited mark once a course is approved */}
        <div className="flex items-center justify-center gap-4 sm:pl-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-mid">Course Published by</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.png" alt="CareStream" className="mx-auto mt-1.5 h-7 w-auto" />
          </div>
          {cpdAccredited && (
            <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cpd-approved.png" alt="CPD Certification Service" className="h-9 w-auto" />
              <p className="text-xs leading-tight text-neutral-dark">CPD<br /><span className="font-bold">Accredited</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
