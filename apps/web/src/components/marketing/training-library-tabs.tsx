'use client'

import { useState } from 'react'
import Link from 'next/link'
import { GraduationCap, ArrowRight, Search, X, ShoppingCart, Plus, Minus, Clock, ShieldCheck, Award } from 'lucide-react'
import { SiteImage } from '@/components/site-image'
import { useCart } from '@/lib/cart-store'
import { UNIT_PENCE, gbp, estimatedMinutes, formatDuration, TRAINING_ACCREDITED } from '@/lib/training-commerce'
import { CartButton } from './cart-button'
import { SaveCourseButton } from './save-course-button'

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
  duration_minutes?: number | null
}

type Props = {
  groups: Record<string, string>
  settings: Array<{ key: string; label: string }>
  topics: LibraryTopic[]
}

// One library card. `accent` gives setting-specific modules a distinct blue
// treatment so they stand out from the universal core. Cards now show price,
// estimated time to complete, and an add-to-basket control.
export function ModuleCard({ t, accent, settingLabel }: { t: LibraryTopic; accent?: boolean; settingLabel?: string | null }) {
  const { items, cart } = useCart()
  const inCart = items.find((i) => i.slug === t.slug)
  const duration = formatDuration(estimatedMinutes(t.group_key, t.duration_minutes))
  const ring = accent ? 'border-2 border-blue-300' : 'border border-gray-100'
  const brand = accent ? 'text-blue-700' : 'text-teal'

  return (
    <div className={`card-lift group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition ${ring}`}>
      <Link href={`/staff-training/${t.slug}`} className="block">
        <div className="relative aspect-[16/9] overflow-hidden bg-teal-light">
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
          {/* Right-hand badges stack, so the certificate mark never collides with
              the CPD or setting badge. "Certificate" is the completion certificate
              every course issues for CQC evidence — not an accreditation claim. */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-dark shadow">
              <Award size={12} className="text-teal" /> Certificate
            </span>
            {TRAINING_ACCREDITED && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">
                <ShieldCheck size={11} /> CPD Certified
              </span>
            )}
            {accent && settingLabel && !TRAINING_ACCREDITED && (
              <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">
                For {settingLabel}
              </span>
            )}
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <Link href={`/staff-training/${t.slug}`}>
          <h4 className="mb-2 text-lg font-bold leading-snug text-neutral-dark transition group-hover:text-teal">{t.title}</h4>
        </Link>
        {/* Full description, never truncated — buyers need to read what the course covers. */}
        <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-mid">
          {t.description ?? GROUP_BLURB[t.group_key] ?? 'A mandatory training subject, ready to assign.'}
        </p>

        {/* Meta row: price + duration */}
        <div className="mb-4 flex items-center gap-4 border-t border-gray-100 pt-4 text-sm">
          <span className="text-xl font-extrabold text-neutral-dark">{gbp(UNIT_PENCE)}</span>
          <span className="inline-flex items-center gap-1 text-neutral-mid"><Clock size={14} /> {duration}</span>
          <Link href={`/staff-training/${t.slug}`} className={`ml-auto inline-flex items-center gap-1 text-xs font-semibold ${brand}`}>
            Details <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Add to basket / quantity stepper, with Save alongside */}
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            {inCart ? (
              <div className="flex h-full items-center justify-between rounded-xl border border-teal/40 bg-teal-light/50 p-1.5">
                <div className="flex items-center">
                  <button type="button" onClick={() => cart.setQty(t.slug, inCart.qty - 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-teal hover:bg-white" aria-label="Fewer"><Minus size={15} /></button>
                  <span className="w-10 text-center text-sm font-bold text-neutral-dark">{inCart.qty}</span>
                  <button type="button" onClick={() => cart.setQty(t.slug, inCart.qty + 1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-teal hover:bg-white" aria-label="More"><Plus size={15} /></button>
                </div>
                <span className="pr-2 text-xs font-semibold text-teal">In basket</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => cart.add({ slug: t.slug, title: t.title, unitPence: UNIT_PENCE })}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
              >
                <ShoppingCart size={15} /> Add to basket
              </button>
            )}
          </div>
          <SaveCourseButton slug={t.slug} title={t.title} compact className="rounded-xl" />
        </div>
        <p className="mt-2 text-center text-[11px] text-neutral-mid">Bulk discounts from 10+ licences</p>
      </div>
    </div>
  )
}

// The standard-library grid with setting tabs. "All settings" shows the universal
// (cross-over) core; each setting tab surfaces that setting's specific modules FIRST
// (in a distinct blue accent), then the shared core below.
export function TrainingLibraryTabs({ groups, settings, topics }: Props) {
  const [active, setActive] = useState<string | null>(null) // null = All settings (universal core)
  const [query, setQuery] = useState('')

  const activeLabel = settings.find((s) => s.key === active)?.label ?? null
  const q = query.trim().toLowerCase()
  const matchesQuery = (t: LibraryTopic) =>
    !q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q)
  const universal = topics.filter((t) => !t.care_setting && matchesQuery(t))
  const settingSpecific = (active ? topics.filter((t) => t.care_setting === active) : []).filter(matchesQuery)
  const hasSpecific = !!activeLabel && settingSpecific.length > 0
  const totalMatches = universal.length + settingSpecific.length

  return (
    <div>
      {/* Search */}
      <div className="mb-8">
        <div className="relative max-w-xl">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search training modules, e.g. safeguarding, moving and handling…"
            aria-label="Search training modules"
            className="w-full rounded-full border border-gray-200 bg-white py-3.5 pl-12 pr-11 text-sm text-neutral-dark shadow-card placeholder:text-neutral-mid/70 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-mid transition-colors hover:text-neutral-dark"
            >
              <X size={17} />
            </button>
          )}
        </div>
        {q && (
          <p className="mt-3 text-sm text-neutral-mid" role="status" aria-live="polite">
            {totalMatches === 0 ? (
              <>No modules match &ldquo;<strong className="text-neutral-dark">{query}</strong>&rdquo; — try a broader term.</>
            ) : (
              <>{totalMatches} module{totalMatches === 1 ? '' : 's'} match &ldquo;<strong className="text-neutral-dark">{query}</strong>&rdquo;.</>
            )}
          </p>
        )}
      </div>

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

      {/* Intro copy — hidden while searching so results lead */}
      <p className={`mb-10 -mt-4 max-w-3xl text-sm leading-relaxed text-neutral-mid ${q ? 'hidden' : ''}`}>
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
          <div className="grid gap-6 sm:grid-cols-2">
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
            <div className="grid gap-6 sm:grid-cols-2">
              {universal.filter((t) => t.group_key === g).map((t) => <ModuleCard key={t.slug} t={t} />)}
            </div>
          </div>
        ))}
      </div>
      <CartButton />
    </div>
  )
}
