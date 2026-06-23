'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, ArrowRight } from 'lucide-react'
import { SiteImage } from '@/components/site-image'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const GROUP_ORDER = ['core_mandatory', 'health_safety', 'care_clinical', 'conduct_governance', 'data_technology', 'role_specific']
const GROUP_BLURB: Record<string, string> = {
  core_mandatory:    'A core mandatory subject every care worker must complete.',
  health_safety:     'A statutory health and safety subject for your team.',
  care_clinical:     'A clinical care subject for staff who deliver hands-on care.',
  conduct_governance: 'A professional conduct and governance subject.',
  data_technology:   'A data protection, cyber and information-governance subject.',
  role_specific:     'A role- or service-specific subject.',
}

function frequencyLabel(f: string): string {
  switch (f) {
    case 'once':      return 'One-off'
    case 'biennial':  return 'Every 2 yrs'
    case 'triennial': return 'Every 3 yrs'
    case 'adhoc':     return 'As needed'
    default:          return 'Annual'
  }
}

export type LibraryTopic = {
  slug: string
  title: string
  group_key: string
  care_setting: string | null
  frequency: string
  requires_practical: boolean
  built: boolean
  description: string | null
  illustration_url: string | null
}

type Props = {
  groups: Record<string, string>
  settings: Array<{ key: string; label: string }>
  topics: LibraryTopic[]
}

// One library card. `accent` gives setting-specific modules a distinct blue
// treatment so they stand out from the universal core.
function ModuleCard({ t, accent, settingLabel }: { t: LibraryTopic; accent?: boolean; settingLabel?: string | null }) {
  return (
    <Link
      href={`/staff-training/${t.slug}`}
      className={`card-lift group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition ${accent ? 'border-2 border-blue-300 hover:border-blue-500' : 'border border-gray-100 hover:border-teal/40'}`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-teal-light">
        {t.illustration_url ? (
          <SiteImage src={`${API_URL}${t.illustration_url}`} alt={t.title} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className={`absolute inset-0 flex items-center justify-center ${accent ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-teal-gradient'}`}>
            <GraduationCap size={40} className="text-white/80" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-teal">
          {frequencyLabel(t.frequency)}
        </span>
        {accent && settingLabel && (
          <span className="absolute right-3 top-3 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">
            For {settingLabel}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h4 className={`mb-2 font-bold leading-snug text-neutral-dark ${accent ? 'group-hover:text-blue-700' : 'group-hover:text-teal'}`}>{t.title}</h4>
        <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-mid">
          {t.description ?? GROUP_BLURB[t.group_key] ?? 'A mandatory training subject, ready to assign.'}
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-neutral-mid">
          {t.requires_practical ? <span>Practical sign-off</span> : <span />}
          <span className={`inline-flex items-center gap-1 font-semibold ${accent ? 'text-blue-700' : 'text-teal'}`}>
            Read guide <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

// The standard-library grid with setting tabs. "All settings" shows the universal
// (cross-over) core; each setting tab surfaces that setting's specific modules FIRST
// (in a distinct blue accent), then the shared core below.
export function TrainingLibraryTabs({ groups, settings, topics }: Props) {
  const [active, setActive] = useState<string | null>(null) // null = All settings (universal core)

  const activeLabel = settings.find((s) => s.key === active)?.label ?? null
  const universal = topics.filter((t) => !t.care_setting)
  const settingSpecific = active ? topics.filter((t) => t.care_setting === active) : []
  const hasSpecific = !!activeLabel && settingSpecific.length > 0

  return (
    <div>
      {/* Setting tabs */}
      <div className="mb-10 flex flex-wrap gap-2">
        {[{ key: null as string | null, label: 'All settings' }, ...settings].map((tab) => {
          const on = active === tab.key
          return (
            <button
              key={tab.key ?? 'all'}
              type="button"
              onClick={() => setActive(tab.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${on ? 'bg-teal text-white' : 'bg-white text-neutral-mid shadow-card hover:text-teal'}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Intro copy */}
      <p className="mb-10 -mt-4 max-w-3xl text-sm leading-relaxed text-neutral-mid">
        {activeLabel ? (
          <>
            <strong>{activeLabel}</strong> teams get the full core library that every CQC-regulated service needs,
            <strong className="text-blue-700"> plus the modules built specifically for {activeLabel}</strong>, shown
            first below, in blue. Every module is a complete teach-then-assess course delivered in the hub in any
            language, with an assessment and automatic renewal reminders at 90, 30 and 7 days.
          </>
        ) : (
          <>
            The core mandatory library every care service needs, ready to assign to your whole team. Choose your
            setting above to see the extra modules we&apos;ve built specifically for it.
          </>
        )}
      </p>

      {/* Setting-specific modules — surfaced at the top, in blue */}
      {hasSpecific && (
        <div className="mb-16 rounded-2xl border border-blue-100 bg-blue-50/40 p-6 sm:p-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-700">Built specifically for {activeLabel}</h3>
          </div>
          <p className="mb-6 max-w-2xl text-sm leading-relaxed text-neutral-mid">
            These modules cover the topics and regulations unique to {activeLabel}. They are written for this setting, not adapted from a generic course.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {settingSpecific.map((t) => <ModuleCard key={t.slug} t={t} accent settingLabel={activeLabel} />)}
          </div>
        </div>
      )}

      {/* Universal core — grouped by subject */}
      {hasSpecific && (
        <h3 className="mb-8 text-sm font-bold uppercase tracking-widest text-neutral-mid">The core library every service gets</h3>
      )}
      <div className="space-y-16">
        {GROUP_ORDER.filter((g) => universal.some((t) => t.group_key === g)).map((g) => (
          <div key={g}>
            <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-teal">{groups[g] ?? g}</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {universal.filter((t) => t.group_key === g).map((t) => <ModuleCard key={t.slug} t={t} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
