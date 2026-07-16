import Link from 'next/link'
import {
  ShieldAlert, ScanSearch, ListChecks, Scale, FileText, GraduationCap,
  History, SlidersHorizontal, Check, ArrowRight, Sparkles,
} from 'lucide-react'
import { SectionLabel, PageCta } from '@/components/marketing/ui'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { POLICY_GAP_DETECTION_SLOTS } from '@/lib/page-slots/policy-gap-detection'

export const metadata = {
  title: 'Policy Gap Detection',
  description: 'CareStream reads inside your policies, tells you exactly which regulations you cover and where the gaps are, checks the wording against the CQC Single Assessment Framework and suggests person-centred alternatives, shows what to add with the legal basis, and tracks changes to the standards. A Professional and Enterprise feature.',
  openGraph: {
    title: 'Policy Gap Detection | CareStreamAI',
    description: 'Know exactly where your policies fall short of the regulations, and whether they read the way CQC expects — with the legal basis, the wording, and person-centred alternatives.',
    url: 'https://www.carestreamai.com/policy-gap-detection',
  },
}

function PlanBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-white/25">
      <ShieldAlert size={13} /> {label}
    </span>
  )
}

// ── Coverage mockup ───────────────────────────────────────────────────────────
function CoverageMockup() {
  const rows = [
    { name: 'Regulation 12: Safe care and treatment', status: 'Covered',  tone: 'green'  },
    { name: 'Mental Capacity Act 2005',               status: 'Covered',  tone: 'green'  },
    { name: 'Regulation 14: Nutrition & hydration',   status: 'Partial',  tone: 'amber'  },
    { name: 'Duty of candour',                        status: 'Gap',      tone: 'red'    },
  ]
  const tones: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red:   'bg-red-50 text-red-600',
  }
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CareStream · Policy Gaps</p>
        <p className="text-sm font-bold text-white">Regulation coverage</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[{ label: 'Coverage score', value: '86%' }, { label: 'Partial', value: '3' }, { label: 'Gaps', value: '2' }].map(s => (
          <div key={s.label} className="py-3 text-center">
            <p className="text-base font-extrabold text-neutral-dark">{s.value}</p>
            <p className="text-[9px] text-neutral-mid">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2.5 px-5 py-4">
        {rows.map(r => (
          <div key={r.name} className="flex items-center justify-between gap-3">
            <p className="truncate text-[11px] font-medium text-neutral-dark">{r.name}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${tones[r.tone]}`}>{r.status}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 bg-rose-50/60 px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Legally required · Duty of candour</p>
        <p className="mt-0.5 text-[11px] text-neutral-dark">Add to your <span className="font-semibold">Being Open policy</span>: the process for notifying people of a notifiable safety incident…</p>
      </div>
    </div>
  )
}

const STEPS = [
  { Icon: ScanSearch,        key: 'step1' },
  { Icon: ListChecks,        key: 'step2' },
  { Icon: Sparkles,          key: 'step3' },
  { Icon: Scale,             key: 'step4' },
  { Icon: FileText,          key: 'step5' },
  { Icon: SlidersHorizontal, key: 'step6' },
  { Icon: History,           key: 'step7' },
  { Icon: GraduationCap,     key: 'step8' },
]

export default async function PolicyGapDetectionPage() {
  const s = makeSlot(POLICY_GAP_DETECTION_SLOTS, await getContentSlots('/policy-gap-detection'))
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }} />
        <div className="relative mx-auto max-w-content px-6 pb-20 pt-20 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4"><PlanBadge label={s('hero.badge')} /></div>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                {s('hero.h1')}
              </h1>
              <div className="mb-8 max-w-xl text-lg leading-relaxed text-white/75 [&_a]:font-semibold [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2" dangerouslySetInnerHTML={{ __html: s('hero.intro') }} />
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">{s('hero.cta.primary')}</Link>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">{s('hero.cta.secondary')}</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CoverageMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('steps.label')}</SectionLabel>
          <h2 className="mb-4 max-w-3xl text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('steps.h2')}
          </h2>
          <div className="mb-16 max-w-2xl text-lg leading-relaxed text-neutral-mid [&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2" dangerouslySetInnerHTML={{ __html: s('steps.intro') }} />

          <div className="space-y-6">
            {STEPS.map(({ Icon, key }, i) => (
              <div key={key} className="grid items-start gap-6 rounded-2xl border border-gray-100 bg-white p-8 shadow-card lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-light text-teal">
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-teal">{String(i + 1).padStart(2, '0')} · {s(`${key}.label`)}</span>
                  </div>
                  <h3 className="mb-3 text-2xl font-extrabold leading-tight text-neutral-dark">{s(`${key}.title`)}</h3>
                  <p className="leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
                </div>
                <ul className="space-y-2.5 rounded-xl bg-neutral-light/60 p-6 text-sm text-neutral-mid lg:mt-2">
                  {[1, 2, 3].map(n => (
                    <li key={n} className="flex items-start gap-2.5"><Check size={14} className="mt-0.5 shrink-0 text-teal" />{s(`${key}.point${n}`)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Availability strip */}
      <section className="bg-neutral-light py-16">
        <div className="mx-auto max-w-content px-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-teal/20 bg-white px-8 py-10 text-center shadow-card">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-teal-light px-3 py-1 text-xs font-bold text-teal">
              <ShieldAlert size={14} /> {s('availability.badge')}
            </span>
            <h2 className="max-w-2xl text-2xl font-extrabold text-neutral-dark md:text-3xl">{s('availability.h2')}</h2>
            <div className="max-w-2xl leading-relaxed text-neutral-mid [&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2" dangerouslySetInnerHTML={{ __html: s('availability.body') }} />
            <Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-dark">
              {s('availability.cta')} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <PageCta
        heading="See where your policies stand — before an inspector does."
        sub="Start a free 14-day trial, or book a demo and we'll show you a live coverage report."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
