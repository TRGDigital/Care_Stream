'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, ArrowRight } from 'lucide-react'
import { SiteImage } from '@/components/site-image'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const GROUP_ORDER = ['core_mandatory', 'health_safety', 'care_clinical', 'conduct_governance', 'role_specific']
const GROUP_BLURB: Record<string, string> = {
  core_mandatory:    'A core mandatory subject every care worker must complete.',
  health_safety:     'A statutory health and safety subject for your team.',
  care_clinical:     'A clinical care subject for staff who deliver hands-on care.',
  conduct_governance: 'A professional conduct and governance subject.',
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

// The standard-library grid with setting tabs. "All settings" shows the universal
// (cross-over) modules; each setting tab adds that setting's specific modules on top.
// A setting tab only appears once it has at least one built (generated) module, so the
// page stays clean until a setting's overlay content exists.
export function TrainingLibraryTabs({ groups, settings, topics }: Props) {
  const [active, setActive] = useState<string | null>(null) // null = All settings (universal base)

  const activeLabel = settings.find((s) => s.key === active)?.label ?? null
  // All settings tab = the universal cross-over modules; a setting tab = universal +
  // that setting's specific modules. Tabs for every sector are always shown so the
  // full framework is visible (modules still being built show a "Coming soon" badge).
  const visible = topics.filter((t) => (active ? !t.care_setting || t.care_setting === active : !t.care_setting))

  return (
    <div>
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

      <p className="mb-10 -mt-4 text-sm text-neutral-mid">
        {activeLabel
          ? <>The modules every team gets, plus the ones specific to <strong>{activeLabel}</strong>.</>
          : <>The core modules every care service gets. Pick your setting to see the modules built specifically for it.</>}
      </p>

      <div className="space-y-16">
        {GROUP_ORDER.filter((g) => visible.some((t) => t.group_key === g)).map((g) => (
          <div key={g}>
            <h3 className="mb-6 text-xs font-bold uppercase tracking-widest text-teal">{groups[g] ?? g}</h3>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.filter((t) => t.group_key === g).map((t) => (
                <Link
                  key={t.slug}
                  href={`/staff-training/${t.slug}`}
                  className="card-lift group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition hover:border-teal/40"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-teal-light">
                    {t.illustration_url ? (
                      <SiteImage src={`${API_URL}${t.illustration_url}`} alt={t.title} className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-teal-gradient">
                        <GraduationCap size={40} className="text-white/80" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-teal">
                      {frequencyLabel(t.frequency)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h4 className="mb-2 font-bold leading-snug text-neutral-dark group-hover:text-teal">{t.title}</h4>
                    <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-mid">
                      {t.description ?? GROUP_BLURB[t.group_key] ?? 'A mandatory training subject, ready to assign.'}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-neutral-mid">
                      {t.requires_practical ? <span>Practical sign-off</span> : <span />}
                      <span className="inline-flex items-center gap-1 font-semibold text-teal">
                        Read guide <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
