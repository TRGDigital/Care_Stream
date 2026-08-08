import Link from 'next/link'
import {
  CheckCircle2, MessageSquare, BarChart2,
  ShieldCheck, Users, Brain, Zap, Bell, AlertTriangle, FileText,
  RefreshCw, BookOpen, ShieldAlert,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { BUSINESS_CONTINUITY_SLOTS } from '@/lib/page-slots/business-continuity'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/business-continuity' },
  title:       'Business Continuity Planning | CareStreamAI',
  description: 'Ensure your care setting can maintain safe operations during any disruption. CareStreamAI makes your business continuity plan instantly queryable by all staff via the hub, email, and voice, at any time.',
  openGraph: {
    type: 'website',
    images: ['/og-image.png'],
    title: 'Business Continuity Planning | CareStreamAI',
    description: 'Your business continuity plan, instantly queryable by every staff member, any time.',
    url: 'https://www.carestreamai.com/business-continuity',
  },
}

// ── BC Plan Coverage Card ─────────────────────────────────────────────────────

function BCPlanMockup() {
  const scenarios = [
    { name: 'Key staff absence',     status: 'Covered', dot: 'bg-green-500', text: 'text-green-600' },
    { name: 'IT system failure',     status: 'Covered', dot: 'bg-green-500', text: 'text-green-600' },
    { name: 'Power outage',          status: 'Covered', dot: 'bg-green-500', text: 'text-green-600' },
    { name: 'Severe weather',        status: 'Partial', dot: 'bg-amber-400', text: 'text-amber-500' },
    { name: 'Supply chain failure',  status: 'Partial', dot: 'bg-amber-400', text: 'text-amber-500' },
    { name: 'Communication failure', status: 'Review',  dot: 'bg-red-400',   text: 'text-red-500'   },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Business Continuity</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">4/6</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">scenarios</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Covered', value: '3', color: 'text-green-600' },
          { label: 'Partial', value: '2', color: 'text-amber-500' },
          { label: 'Review',  value: '1', color: 'text-red-500'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-3 text-center">
            <p className={`text-base font-extrabold ${color}`}>{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Scenario coverage</p>
        <div className="space-y-2.5">
          {scenarios.map(({ name, status, dot, text }) => (
            <div key={name} className="flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-dark">{name}</p>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <p className={`text-[10px] font-semibold ${text}`}>{status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
        <p className="text-[10px] text-neutral-mid">Plan last reviewed: <span className="font-semibold text-neutral-dark">14 May 2026</span></p>
      </div>
      <div className="border-t border-amber-100 bg-amber-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="flex-shrink-0 text-amber-600" />
          <p className="text-[11px] font-medium text-amber-800">2 scenarios need updated procedures before your July review.</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function BusinessContinuityPage() {
  const s = makeSlot(BUSINESS_CONTINUITY_SLOTS, await getContentSlots('/business-continuity'))

  const COMPARE = [
    { icon: '📁', dim: true,  key: 'problem.compare1' },
    { icon: '💬', dim: false, key: 'problem.compare2' },
  ]
  const STEPS = [
    { step: '01', Icon: BookOpen,       key: 'how.step1' },
    { step: '02', Icon: MessageSquare,  key: 'how.step2' },
    { step: '03', Icon: ShieldAlert,    key: 'how.step3' },
  ]
  const SCENARIOS = [
    { key: 'action.scenario1' },
    { key: 'action.scenario2' },
    { key: 'action.scenario3' },
  ]
  const RESILIENCE = [
    { Icon: Zap,         key: 'resilience.card1' },
    { Icon: ShieldAlert, key: 'resilience.card2' },
    { Icon: RefreshCw,   key: 'resilience.card3' },
    { Icon: Users,       key: 'resilience.card4' },
    { Icon: Brain,       key: 'resilience.card5' },
    { Icon: ShieldCheck, key: 'resilience.card6' },
  ]
  const CQC_ROWS = ['cqc.row1', 'cqc.row2', 'cqc.row3', 'cqc.row4', 'cqc.row5', 'cqc.row6']
  const FEATURES = [
    { icon: BookOpen,      key: 'features.card1', iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
    { icon: MessageSquare, key: 'features.card2', iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
    { icon: Zap,           key: 'features.card3', iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
    { icon: ShieldAlert,   key: 'features.card4', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { icon: Brain,         key: 'features.card5', iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
    { icon: RefreshCw,     key: 'features.card6', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { icon: BarChart2,     key: 'features.card7', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { icon: FileText,      key: 'features.card8', iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
  ]

  return (
    <>
      {/* ── Split hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
        />
        <div className="relative mx-auto max-w-content px-6 pb-20 pt-20 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel light>{s('hero.label')}</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                {s('hero.h1')}
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                {s('hero.intro')}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
                <Link href="/demo"     className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <BCPlanMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>{s('problem.label')}</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                {s('problem.h2')}
              </h2>
              <div className={`space-y-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}>
                <div dangerouslySetInnerHTML={{ __html: s('problem.p1') }} />
                <div dangerouslySetInnerHTML={{ __html: s('problem.p2') }} />
              </div>
            </div>
            <div className="grid gap-4">
              {COMPARE.map(({ icon, dim, key }) => (
                <div
                  key={key}
                  className={`card-lift rounded-2xl p-6 ${dim ? 'border border-gray-100 bg-white shadow-card' : 'bg-teal-gradient shadow-teal-glow'}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${dim ? 'text-neutral-mid' : 'text-white/60'}`}>{s(`${key}.label`)}</p>
                  </div>
                  <p className={`leading-relaxed ${dim ? 'text-neutral-mid' : 'text-white'}`}>{s(`${key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('how.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('how.h2')}
          </h2>
          <p className="mb-14 text-lg leading-relaxed text-neutral-mid">
            {s('how.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(({ step, Icon, key }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                    <Icon size={18} className="text-teal" />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── See it in action ──────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('action.label')}</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('action.h2')}
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('action.h3')}
              </h3>
              <div
                className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
                dangerouslySetInnerHTML={{ __html: s('action.p1') }}
              />
              <div
                className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
                dangerouslySetInnerHTML={{ __html: s('action.p2') }}
              />
              <div className="space-y-3">
                {SCENARIOS.map(({ key }) => (
                  <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <span className="mb-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal">{s(`${key}.tag`)}</span>
                    <p className="text-sm font-medium leading-snug text-neutral-dark">{s(`${key}.q`)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                <div className="flex items-center justify-between bg-teal px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">CareStreamAI</p>
                    <p className="text-[11px] text-white/70">Crossways Care Home</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-white/20 text-center text-xs font-bold leading-7 text-white">NL</div>
                </div>
                <div className="space-y-3 bg-gray-50 p-4">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
                      <p className="text-xs text-white">The care system is down on nights and we cannot access resident records. What should we do?</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="mb-0.5 text-[10px] font-semibold text-teal">From your Business Continuity Plan</p>
                      <p className="mb-2 text-xs font-medium text-gray-800">IT System Failure: Night Shift Procedure</p>
                      <div className="space-y-1.5 text-[11px] leading-relaxed text-gray-600">
                        <p><span className="font-bold">1.</span> Activate paper-based care records from the red folder in the office.</p>
                        <p><span className="font-bold">2.</span> Contact the on-call manager to notify them of the outage.</p>
                        <p><span className="font-bold">3.</span> Document all care delivered manually until the system is restored.</p>
                      </div>
                      <p className="mt-2 text-[10px] italic text-gray-400">Source: BC Plan, Section 4.2</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
                      <p className="text-xs text-white">Thank you, that is really helpful.</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
                  <div className="flex-1 rounded-full border border-gray-200 px-4 py-1.5 text-[11px] text-gray-300">Ask a question...</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Resilience features ───────────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>{s('resilience.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            {s('resilience.h2')}
          </h2>
          <p className="mb-14 text-lg leading-relaxed text-white/80">
            {s('resilience.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {RESILIENCE.map(({ Icon, key }) => (
              <div key={key} className="card-lift rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="mb-2 font-bold text-white">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-white/75">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CQC evidence ──────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('cqc.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('cqc.h2')}
          </h2>
          <div className={`mb-12 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}>
            <div dangerouslySetInnerHTML={{ __html: s('cqc.intro') }} />
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>{s('cqc.col1')}</span>
              <span>{s('cqc.col2')}</span>
            </div>
            {CQC_ROWS.map((row, i) => (
              <div key={row} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 5 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-start gap-2 pr-4">
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="font-semibold text-neutral-dark">{s(`${row}.what`)}</span>
                </div>
                <span className="text-sm leading-relaxed text-neutral-mid">{s(`${row}.why`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature summary ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('features.label')}</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">
            {s('features.h2')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, key, iconBg, iconColor }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon size={16} className={iconColor} />
                </div>
                <p className="mb-1.5 font-semibold text-neutral-dark">{s(`${key}.label`)}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-12 text-center md:gap-0 md:grid-cols-2 md:divide-x md:divide-gray-100">
            <div className="md:pr-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">{s('stats.stat1.value')}</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                {s('stats.stat1.title')}
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                {s('stats.stat1.body')}
              </p>
            </div>
            <div className="md:pl-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">{s('stats.stat2.value')}</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                {s('stats.stat2.title')}
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                {s('stats.stat2.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <EditableContentBlock path="/business-continuity" />

      <PageCta
        heading="Turn your business continuity plan into a resource your whole team can actually use."
        sub="See how CareStreamAI business continuity works for your service."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
