import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/nav'
import { HomeFaq, type Faq } from '@/components/marketing/home-faq'
import { Typewriter } from '@/components/marketing/typewriter'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.carestreamai.com' },
  title:       'CareStreamAI · Policies, Training and CQC Tools for UK Care Homes',
  description: 'Give your entire care team instant access to your policies, training, audits and CQC tools in any language, 24/7. CareStream delivers grounded answers in the hub or by email, never the internet.',
  openGraph:   {
    images: ['/og-image.png'], title: 'CareStreamAI · Policies, Training and CQC Tools for UK Care Homes', description: 'One platform for UK care providers: policy access, staff training, audits and CQC preparation. Powered by your documents. Never the internet.', url: 'https://www.carestreamai.com' },
}
import { MarketingFooter } from '@/components/marketing/footer'
import { Mockup } from '@/components/marketing/mockup'
import { MOCKUPS } from '@/components/marketing/mockup-data'
import { LogoMarquee } from '@/components/marketing/logo-marquee'
import { SiteImage } from '@/components/site-image'
import { JsonLd } from '@/components/json-ld'
import { webApplicationSchema, faqPageSchema } from '@/lib/schema'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { HOME_SLOTS } from '@/lib/page-slots/home'
import {
  Zap, ClipboardCheck, Upload, MessageSquare, Mic,
  BookOpen, Shield, ArrowRight, Check, ShieldAlert,
  GraduationCap, HelpCircle, FileText,
} from 'lucide-react'

type Slot = (key: string) => string

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'
const RICH_LINK_WHITE = '[&_a]:font-semibold [&_a]:text-white [&_a]:underline [&_a]:underline-offset-2'

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`section-label mb-3 ${light ? 'text-white/50' : 'text-teal'}`}>{children}</p>
  )
}

function Hero({ s }: { s: Slot }) {
  const langPills = [
    { flag: '🇵🇱', label: 'Polski' },
    { flag: '🇷🇴', label: 'Română' },
    { flag: '🇵🇭', label: 'Tagalog' },
    { flag: '🇳🇬', label: 'Yoruba' },
    { flag: '🇮🇳', label: 'हिंदी' },
    { flag: '🇸🇦', label: 'العربية' },
    { flag: '🇧🇬', label: 'Български' },
    { flag: '🇸🇴', label: 'Soomaali' },
  ]

  return (
    <section className="relative overflow-hidden bg-hero-gradient">
      {/* Mesh pattern */}
      <div className="absolute inset-0 dot-mesh" />

      {/* Decorative circles */}
      <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-white/5" />
      <div className="absolute -bottom-48 -left-24 h-[400px] w-[400px] rounded-full bg-teal/30" />
      <div className="absolute right-1/4 top-1/3 h-[200px] w-[200px] rounded-full bg-white/3" />

      {/* Bottom wave */}
      <div
        className="absolute bottom-0 left-0 right-0 h-20"
        style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
      />

      <div className="relative mx-auto max-w-content px-6 pb-28 pt-20 md:pt-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            {/* Language pills row */}
            <div className="mb-8 flex flex-wrap gap-2">
              {langPills.map(({ flag, label }) => (
                <span key={label} className="lang-pill">
                  {flag} {label}
                </span>
              ))}
            </div>

            <h1 className="relative mb-6 text-5xl font-extrabold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-[62px]">
              {/* Invisible sizer — reserves the tallest layout (longest phrase) so the image
                  and all the text around the hero never shift while the word animates. */}
              <span aria-hidden="true" className="invisible">
                Your policies, turned into instant answers. In any language.
              </span>
              <span className="absolute inset-x-0 bottom-0">
                {s('hero.h1.lead')} <Typewriter words={['instant answers.', 'staff training.', 'care audits.', 'CQC evidence.']} rounds={2} />{' '}
                <span style={{ color: '#E8850A' }}>{s('hero.h1.emphasis')}</span>
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-white/75">
              {s('hero.sub')}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/demo" className="btn-amber rounded-btn px-8 py-4 text-sm text-center">
                {s('hero.cta.primary')}
              </Link>
              <Link
                href="/how-it-works"
                className="btn-ghost-white rounded-btn flex items-center justify-center gap-2 px-8 py-4 text-sm"
              >
                {s('hero.cta.secondary')} <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50 md:flex-nowrap md:whitespace-nowrap">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> {s('hero.trust1')}</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> {s('hero.trust2')}</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> {s('hero.trust3')}</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> {s('hero.trust4')}</span>
            </div>
          </div>

          <div className="relative lg:pl-4">
            <div className="overflow-hidden rounded-2xl shadow-elevated">
              <SiteImage
                src="/images/hero.jpg"
                alt="Care worker reviewing policies on a tablet in a residential care home"
                width={1600}
                height={1179}
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="w-full object-cover"
              />
            </div>

            {/* 60+ Languages, bottom left */}
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white px-5 py-4 shadow-card-hover">
              <p className="text-2xl font-extrabold text-teal">60+</p>
              <p className="text-xs font-medium text-neutral-mid">Languages supported</p>
            </div>

            {/* < 30s, top, inset */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-card-hover">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-light">
                <Zap size={14} className="text-teal" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-neutral-dark">{"<"}30 sec</p>
                <p className="text-[10px] text-neutral-mid">Response time</p>
              </div>
            </div>

            {/* CQC audit trail, bottom right */}
            <div className="absolute -bottom-4 right-6 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-card-hover">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-50">
                <ClipboardCheck size={14} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-dark">Every query logged</p>
                <p className="text-[10px] text-neutral-mid">CQC audit trail</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}

function StatsStrip({ s }: { s: Slot }) {
  const stats = [
    { num: s('stats.s1.num'), label: s('stats.s1.label') },
    { num: s('stats.s2.num'), label: s('stats.s2.label') },
    { num: s('stats.s3.num'), label: s('stats.s3.label') },
    { num: s('stats.s4.num'), label: s('stats.s4.label') },
  ]
  return (
    <section className="border-b border-gray-100 bg-white py-14">
      <div className="mx-auto max-w-content px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map(({ num, label }) => (
            <div key={num} className="text-center">
              <p className="mb-1 text-3xl font-extrabold text-teal">{num}</p>
              <p className="text-xs leading-snug text-neutral-mid">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function TheProblem({ s }: { s: Slot }) {
  return (
    <section className="relative overflow-hidden bg-neutral-dark py-24">
      {/* Decorative circle */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-teal/10" />

      <div className="relative mx-auto max-w-content px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel light>{s('problem.label')}</SectionLabel>
            <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl">
              {s('problem.h2.pre')}{' '}
              <span style={{ color: '#E8850A' }}>{s('problem.h2.emphasis')}</span>
            </h2>
            <div className={`space-y-5 text-lg leading-relaxed text-gray-300 ${RICH_LINK_WHITE}`}>
              <div dangerouslySetInnerHTML={{ __html: s('problem.p1') }} />
              <div dangerouslySetInnerHTML={{ __html: s('problem.p2') }} />
              <div className="text-gray-400" dangerouslySetInnerHTML={{ __html: s('problem.p3') }} />
            </div>
          </div>

          <div className="grid gap-4">
            {[
              { icon: '🌍', title: s('problem.card1.title'), body: s('problem.card1.body') },
              { icon: '🕐', title: s('problem.card2.title'), body: s('problem.card2.body') },
              { icon: '📋', title: s('problem.card3.title'), body: s('problem.card3.body') },
            ].map(({ icon, title, body }) => (
              <div key={title} className="card-lift flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">{icon}</div>
                <div>
                  <p className="mb-1 font-semibold text-white">{title}</p>
                  <p className="text-sm leading-relaxed text-gray-400">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── The centrepiece: policies in, everything out ──────────────────────────────
function PolicyEngine({ s }: { s: Slot }) {
  const spokes = [
    { Icon: MessageSquare,  href: '/care-policies',  title: s('engine.spoke1.title'), body: s('engine.spoke1.body') },
    { Icon: GraduationCap,  href: '/staff-training', title: s('engine.spoke2.title'), body: s('engine.spoke2.body') },
    { Icon: ClipboardCheck, href: '/care-audits',    title: s('engine.spoke3.title'), body: s('engine.spoke3.body') },
    { Icon: Shield,         href: '/cqc-compliance', title: s('engine.spoke4.title'), body: s('engine.spoke4.body') },
  ]
  const steps = [
    { num: '02', title: s('howitworks.step2.title'), body: s('howitworks.step2.body') },
    { num: '03', title: s('howitworks.step3.title'), body: s('howitworks.step3.body') },
    { num: '04', title: s('howitworks.step4.title'), body: s('howitworks.step4.body') },
  ]
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <SectionLabel>{s('engine.label')}</SectionLabel>
          <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('engine.h2.pre')}{' '}
            <span className="gradient-text-teal">{s('engine.h2.emphasis')}</span>
          </h2>
          <p className="text-lg leading-relaxed text-neutral-mid">{s('engine.intro')}</p>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Step 01: upload */}
          <div>
            <div className="mb-5 inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">01</span>
              <Upload size={20} className="text-teal" />
            </div>
            <h3 className="mb-4 text-2xl font-bold text-neutral-dark">{s('howitworks.step1.title')}</h3>
            <p className="mb-8 text-lg leading-relaxed text-neutral-mid">{s('howitworks.step1.body')}</p>
            <Mockup {...MOCKUPS['mockup-06']} />
          </div>

          {/* The spokes: everything that runs off the policy library */}
          <div className="grid gap-4 sm:grid-cols-2">
            {spokes.map(({ Icon, href, title, body }) => (
              <Link
                key={title}
                href={href}
                className="card-lift group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition-colors hover:border-teal/30"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon size={20} className="text-teal" />
                </div>
                <h3 className="mb-2 font-bold text-neutral-dark">{title}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-mid">{body}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal">
                  Learn more <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Steps 02–04, compact */}
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {steps.map(({ num, title, body }) => (
            <div key={num} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light text-sm font-extrabold text-teal">{num}</span>
              <h3 className="mb-2 font-bold text-neutral-dark">{title}</h3>
              <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/how-it-works" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
            {s('howitworks.cta')} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

function RegulationLayerSection({ s }: { s: Slot }) {
  const frameworks = [
    { name: s('reg.f1.name'), reg: s('reg.f1.reg'), desc: s('reg.f1.desc') },
    { name: s('reg.f2.name'), reg: s('reg.f2.reg'), desc: s('reg.f2.desc') },
    { name: s('reg.f3.name'), reg: s('reg.f3.reg'), desc: s('reg.f3.desc') },
    { name: s('reg.f4.name'), reg: s('reg.f4.reg'), desc: s('reg.f4.desc') },
    { name: s('reg.f5.name'), reg: s('reg.f5.reg'), desc: s('reg.f5.desc') },
    { name: s('reg.f6.name'), reg: s('reg.f6.reg'), desc: s('reg.f6.desc') },
  ]

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">

        {/* Heading row */}
        <div className="mb-14 grid items-end gap-8 lg:grid-cols-2">
          <div>
            <SectionLabel>{s('reg.label')}</SectionLabel>
            <h2 className="text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
              {s('reg.h2.pre')}{' '}
              <span className="gradient-text-teal">{s('reg.h2.emphasis')}</span>
            </h2>
          </div>
          <div className="lg:pb-1">
            <div className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('reg.intro') }} />
            <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-teal" />
              <span className="text-sm font-semibold text-teal">{s('reg.pill')}</span>
            </div>
          </div>
        </div>

        {/* Main visual: breakdown left + hub chat mockup right */}
        <div className="mb-14 grid items-center gap-10 lg:grid-cols-2">

          {/* Left: example breakdown */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
            <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-neutral-mid">How it works, an example</p>
            </div>
            <div className="divide-y divide-gray-100">
              {/* Question */}
              <div className="px-6 py-5">
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Staff asks in the hub</p>
                <p className="text-base font-medium text-neutral-dark">
                  &ldquo;What do I need to document after a medication error?&rdquo;
                </p>
              </div>
              {/* Sources */}
              <div className="px-6 py-5">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Drawn from</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 rounded-lg bg-teal-light px-3 py-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-teal" />
                    <span className="text-xs font-semibold text-teal">Your Medication Error Policy v2.1</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 px-3 py-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-amber-brand" />
                    <span className="text-xs font-semibold text-amber-brand">CQC Reg 12, Safe Care &amp; Treatment</span>
                  </div>
                  <div className="flex items-center gap-2.5 rounded-lg bg-amber-50 px-3 py-2">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-amber-brand" />
                    <span className="text-xs font-semibold text-amber-brand">RIDDOR 2013, Incident Reporting</span>
                  </div>
                </div>
              </div>
              {/* Answer */}
              <div className="px-6 py-5">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Answer includes</p>
                <ul className="space-y-1.5 text-sm leading-relaxed text-neutral-mid">
                  <li className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-teal" />Your home&apos;s exact documentation steps</li>
                  <li className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-teal" />CQC&apos;s requirements for recording medication incidents</li>
                  <li className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-teal" />Whether RIDDOR reporting is triggered</li>
                  <li className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-teal" />How the two align and where your policy goes further</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right: hub conversation mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-elevated">
              {/* Header */}
              <div className="flex items-center gap-3 bg-teal px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-extrabold text-white">CS</div>
                <div>
                  <p className="text-sm font-semibold text-white">CareStream</p>
                  <p className="text-xs text-white/60">Crossways Care Home</p>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 bg-gray-50 px-3 py-4" style={{ minHeight: 380 }}>
                {/* Staff question */}
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-br-sm bg-teal px-3 py-2.5">
                    <p className="text-xs leading-relaxed text-white">What do I need to document after a medication error?</p>
                    <p className="mt-0.5 text-right text-[10px] text-white/60">22:31 ✓✓</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-sm border border-gray-100 bg-white px-3 py-2.5 shadow-sm">

                    {/* Internal policy section */}
                    <div className="mb-2.5 rounded-lg border-l-2 border-teal bg-teal/10 px-2.5 py-2">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal">Your Medication Error Policy</p>
                      <p className="text-xs leading-relaxed text-neutral-dark">
                        Complete a Medication Error form within 1 hour, record in the MAR chart, and notify the GP and next of kin by end of shift.
                      </p>
                    </div>

                    {/* External regulation section */}
                    <div className="mb-2.5 rounded-lg border-l-2 border-amber-brand bg-amber-brand/10 px-2.5 py-2">
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-amber-brand">CQC Regulation 12 also requires</p>
                      <p className="text-xs leading-relaxed text-neutral-dark">
                        The incident must be reviewed as part of your quality monitoring. If the error caused harm, it may trigger a RIDDOR report within 10 days.
                      </p>
                    </div>

                    {/* Interaction note */}
                    <p className="text-xs italic leading-relaxed text-neutral-mid">
                      Your policy meets CQC Reg 12 and goes further with same-day notification requirements.
                    </p>

                    {/* Citations */}
                    <div className="mt-2 space-y-0.5">
                      <p className="text-[10px] text-neutral-mid">📄 Medication Error Policy v2.1 · Section 4.2</p>
                      <p className="text-[10px] text-neutral-mid">⚖️ CQC Fundamental Standards · Reg 12</p>
                      <p className="text-[10px] text-neutral-mid">⚖️ RIDDOR 2013 · Regulation 4</p>
                    </div>

                    <p className="mt-0.5 text-right text-[10px] text-gray-400">22:31</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Regulation cards */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-neutral-mid">{s('reg.frameworks.label')}</p>
          <span className="shrink-0 rounded-full bg-teal/10 px-3 py-1 text-xs font-bold text-teal">{s('reg.frameworks.badge')}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {frameworks.map(({ name, reg, desc }) => (
            <div key={name} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-card">
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-semibold leading-snug text-neutral-dark">{name}</p>
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-brand">{reg}</span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-mid">{desc}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}

function OurServices({ s }: { s: Slot }) {
  const services = [
    { Icon: FileText,      title: s('services.s1.title'), href: '/care-policies',       desc: s('services.s1.desc') },
    { Icon: BookOpen,      title: s('services.s2.title'), href: '/hr-policies',         desc: s('services.s2.desc') },
    { Icon: GraduationCap, title: s('services.s3.title'), href: '/staff-training',      desc: s('services.s3.desc') },
    { Icon: ClipboardCheck,title: s('services.s4.title'), href: '/care-audits',         desc: s('services.s4.desc') },
    { Icon: Shield,        title: s('services.s5.title'), href: '/cqc-compliance',      desc: s('services.s5.desc') },
    { Icon: HelpCircle,    title: s('services.s6.title'), href: '/cqc-staff-questions', desc: s('services.s6.desc') },
    { Icon: MessageSquare, title: s('services.s7.title'), href: '/cqc-report-chat',     desc: s('services.s7.desc') },
    { Icon: ShieldAlert,   title: s('services.s8.title'), href: '/business-continuity', desc: s('services.s8.desc') },
  ]
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>{s('services.label')}</SectionLabel>
        <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
          {s('services.h2')}
        </h2>
        <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
          {s('services.intro')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ Icon, title, href, desc }) => (
            <Link
              key={title}
              href={href}
              className="card-lift group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition-colors hover:border-teal/30"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                <Icon size={20} className="text-teal" />
              </div>
              <h3 className="mb-2 font-bold text-neutral-dark">{title}</h3>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-mid">{desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal">
                Learn more <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        {/* Who we serve, one line */}
        <div className="mt-12 flex flex-col items-center gap-1 text-center">
          <p className="font-semibold text-neutral-dark">{s('settings.h2')}</p>
          <Link href="/who-we-serve" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
            {s('settings.cta')} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ── One multilingual section: the six-language grid + a voice callout ─────────
function MultilingualSection({ s }: { s: Slot }) {
  const cards = [
    {
      lang: 'Tagalog',
      flag: '🇵🇭',
      question: 'Maaari mo bang ipadaan ang patakaran sa pagbagsak? Kailangan ko ito ngayon.',
      answer: 'Manatili kasama ang residente. Huwag ilipat kung may suspetsa ng pinsala sa gulugod. Tawagan ang senior carer agad.',
      source: 'Falls Policy v3.2 · Seksyon 4.1',
    },
    {
      lang: 'Polish',
      flag: '🇵🇱',
      question: 'Co powinienem zrobić po upadku mieszkańca?',
      answer: 'Pozostań z mieszkańcem. Nie przenoś, jeśli podejrzewasz uraz kręgosłupa. Natychmiast zadzwoń do starszego opiekuna.',
      source: 'Falls Policy v3.2 · Section 4.1',
    },
    {
      lang: 'Romanian',
      flag: '🇷🇴',
      question: 'Ce trebuie să fac după ce un rezident cade?',
      answer: 'Rămâneți cu rezidentul. Nu mutați dacă suspectați o leziune a coloanei vertebrale. Sunați imediat la îngrijitorul senior.',
      source: 'Falls Policy v3.2 · Section 4.1',
    },
    {
      lang: 'Hindi',
      flag: '🇮🇳',
      question: 'निवासी के गिरने के बाद मुझे क्या करना चाहिए?',
      answer: 'निवासी के साथ रहें। यदि रीढ़ की हड्डी में चोट का संदेह हो तो न हिलाएं। तुरंत वरिष्ठ देखभालकर्ता को कॉल करें।',
      source: 'Falls Policy v3.2 · Section 4.1',
    },
    {
      lang: 'Yoruba',
      flag: '🇳🇬',
      question: 'Kini mo yẹ ki n ṣe lẹhin ti olugbe ba subu?',
      answer: 'Duro pẹlu olugbe. Maṣe gbe e ti o ba fura si ipalara ẹhin. Pe agba abojuto lẹsẹkẹsẹ.',
      source: 'Falls Policy v3.2 · Section 4.1',
    },
    {
      lang: 'Somali',
      flag: '🇸🇴',
      question: 'Maxaan samayn karaa marka martida ay dhacdo?',
      answer: 'La joog martida. Ha dhaqaajalin haddaad shaki qabto dhaawaca dhabanka. La xiriir xubinta sare ee daryeelka markiiba.',
      source: 'Falls Policy v3.2 · Section 4.1',
    },
  ]
  return (
    <section className="relative overflow-hidden bg-neutral-dark py-24">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-teal/10" />

      <div className="relative mx-auto max-w-content px-6">
        <SectionLabel light>{s('knowledge.ml.label')}</SectionLabel>
        <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-3xl font-extrabold leading-tight text-white md:text-4xl lg:text-5xl">
            {s('knowledge.ml.h3.pre')}{' '}
            <span style={{ color: '#E8850A' }}>{s('knowledge.ml.h3.emphasis')}</span>
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-white/50">
            {s('knowledge.ml.sub')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ lang, flag, question, answer, source }) => (
            <div key={lang} className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
              {/* Language badge */}
              <div className="mb-4 flex items-center gap-2">
                <span className="text-lg">{flag}</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70 tracking-wide">
                  {lang} detected
                </span>
              </div>
              {/* Staff question */}
              <div className="mb-3 flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-teal px-4 py-2.5 text-xs leading-relaxed text-white">
                  {question}
                </div>
              </div>
              {/* AI response */}
              <div className="flex gap-2">
                <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" stroke="white" strokeWidth="1.2"/><path d="M3 5h4M5 3v4" stroke="white" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl rounded-bl-sm border border-white/10 bg-white/8 px-4 py-2.5 text-xs leading-relaxed text-white/80">
                    {answer}
                  </div>
                  <p className="mt-1.5 pl-1 text-[10px] text-white/30">{source}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Voice callout */}
        <div className="mt-14 flex flex-col items-start gap-6 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm md:flex-row md:items-center">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-teal shadow-teal-glow">
            <Mic size={22} className="text-white" />
          </div>
          <div>
            <p className="mb-1 text-lg font-bold text-white">
              {s('voice.h2.pre')} <span style={{ color: '#E8850A' }}>{s('voice.h2.emphasis')}</span>
            </p>
            <p className="text-sm leading-relaxed text-gray-400">{s('voice.body')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustSection({ s }: { s: Slot }) {
  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>{s('trust.label')}</SectionLabel>
            <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
              {s('trust.h2.pre')}{' '}
              <span className="gradient-text-teal">{s('trust.h2.emphasis')}</span>
            </h2>
            <div className={`mb-10 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('trust.body') }} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-green-50 p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-green-700">{s('trust.uses.heading')}</p>
                <ul className="space-y-2.5">
                  {[s('trust.uses.i1'), s('trust.uses.i2'), s('trust.uses.i3'), s('trust.uses.i4')].map(u => (
                    <li key={u} className="flex items-start gap-2.5 text-sm text-green-800">
                      <Check size={15} className="mt-0.5 flex-shrink-0 text-green-500" /> {u}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-red-50 p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-red-600">{s('trust.never.heading')}</p>
                <ul className="space-y-2.5">
                  {[s('trust.never.i1'), s('trust.never.i2'), s('trust.never.i3'), s('trust.never.i4')].map(n => (
                    <li key={n} className="flex items-start gap-2.5 text-sm text-red-800">
                      <span className="mt-0.5 flex-shrink-0 font-bold text-red-400">✕</span> {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/trust" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
                {s('trust.cta')} <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div>
            <Mockup {...MOCKUPS['mockup-03']} />
          </div>
        </div>
      </div>
    </section>
  )
}

function OperateAtScale({ s }: { s: Slot }) {
  const points = [
    s('scale.point1'),
    s('scale.point2'),
    s('scale.point3'),
    s('scale.point4'),
    s('scale.point5'),
    s('scale.point6'),
  ]

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left, heading + list + CTA */}
          <div>
            <SectionLabel>{s('scale.label')}</SectionLabel>
            <h2 className="mb-6 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl lg:text-5xl">
              {s('scale.h2')}
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
              {s('scale.intro')}
            </p>
            <ul className="mb-10 space-y-4">
              {points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-teal" />
                  <span className="text-neutral-dark">{point}</span>
                </li>
              ))}
            </ul>
            <a
              href="/demo"
              className="btn-amber inline-flex items-center gap-2 rounded-btn px-8 py-4 text-sm font-bold text-white"
            >
              {s('scale.cta')} <ArrowRight size={16} />
            </a>
          </div>

          {/* Right, image */}
          <div className="overflow-hidden rounded-2xl shadow-elevated">
            <SiteImage
              src="/images/operate-at-scale.jpg"
              alt="Care manager reviewing policy compliance on screen"
              width={1600}
              height={1409}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="w-full object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  )
}

function PricingSnapshot({ s }: { s: Slot }) {
  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>{s('pricing.label')}</SectionLabel>
        <h2 className="mb-4 text-4xl font-extrabold text-neutral-dark md:text-5xl">
          {s('pricing.h2')}
        </h2>
        <p className="mb-14 text-lg text-neutral-mid">{s('pricing.sub')}</p>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {/* Starter */}
          <div className="card-lift rounded-2xl border border-gray-200 bg-white p-8 shadow-card">
            <p className="mb-1 text-sm font-semibold text-neutral-mid">{s('pricing.starter.name')}</p>
            <p className="mb-1 text-4xl font-extrabold text-neutral-dark">{s('pricing.starter.price')}<span className="text-base font-normal text-neutral-mid">{s('pricing.starter.per')}</span></p>
            <p className="mb-8 text-sm text-neutral-mid">{s('pricing.starter.note')}</p>
            <ul className="mb-8 space-y-3 text-sm">
              {[s('pricing.starter.f1'), s('pricing.starter.f2'), s('pricing.starter.f3'), s('pricing.starter.f4'), s('pricing.starter.f5'), s('pricing.starter.f6')].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-neutral-dark">
                  <Check size={16} className="flex-shrink-0 text-teal" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block rounded-btn border-2 border-teal px-6 py-3 text-center text-sm font-bold text-teal hover:bg-teal-light">
              {s('pricing.starter.cta')}
            </Link>
          </div>

          {/* Professional */}
          <div className="card-lift relative rounded-2xl bg-teal-gradient p-8 shadow-teal-glow">
            <span className="absolute right-6 top-6 rounded-pill bg-amber-brand px-3 py-1 text-xs font-bold text-white">
              {s('pricing.pro.badge')}
            </span>
            <p className="mb-1 text-sm font-semibold text-white/60">{s('pricing.pro.name')}</p>
            <p className="mb-1 text-4xl font-extrabold text-white">{s('pricing.pro.price')}<span className="text-base font-normal text-white/60">{s('pricing.pro.per')}</span></p>
            <p className="mb-8 text-sm text-white/60">{s('pricing.pro.note')}</p>
            <ul className="mb-8 space-y-3 text-sm">
              {[s('pricing.pro.f1'), s('pricing.pro.f2'), s('pricing.pro.f3'), s('pricing.pro.f4'), s('pricing.pro.f5'), s('pricing.pro.f6')].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-white">
                  <Check size={16} className="flex-shrink-0 text-white/70" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-amber block rounded-btn px-6 py-3 text-center text-sm">
              {s('pricing.pro.cta')}
            </Link>
          </div>

          {/* Enterprise */}
          <div className="card-lift relative rounded-2xl border border-gray-200 bg-white p-8 shadow-card">
            <span className="absolute right-6 top-6 rounded-pill bg-teal-light px-3 py-1 text-xs font-bold text-teal">
              {s('pricing.ent.badge')}
            </span>
            <p className="mb-1 text-sm font-semibold text-neutral-mid">{s('pricing.ent.name')}</p>
            <p className="mb-1 text-4xl font-extrabold text-neutral-dark">{s('pricing.ent.price')}<span className="text-base font-normal text-neutral-mid">{s('pricing.ent.per')}</span></p>
            <p className="mb-8 text-sm text-neutral-mid">{s('pricing.ent.note')}</p>
            <ul className="mb-8 space-y-3 text-sm">
              {[s('pricing.ent.f1'), s('pricing.ent.f2'), s('pricing.ent.f3'), s('pricing.ent.f4'), s('pricing.ent.f5'), s('pricing.ent.f6')].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-neutral-dark">
                  <Check size={16} className="flex-shrink-0 text-teal" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block rounded-btn border-2 border-teal px-6 py-3 text-center text-sm font-bold text-teal hover:bg-teal-light">
              {s('pricing.ent.cta')}
            </Link>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
            {s('pricing.cta')} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

function FreeTrialBand({ s }: { s: Slot }) {
  return (
    <section className="bg-[#fce4a3]">
      <div className="mx-auto grid max-w-content items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-20">
        {/* Left — circular photo with playful decorations */}
        <div className="flex justify-center">
          <div className="relative h-72 w-72">
            {/* rotated square behind the circle */}
            <div className="absolute inset-0 rotate-45 rounded-[2.25rem] bg-[#f4bf43]" />
            {/* circular photo */}
            <div className="absolute inset-2 overflow-hidden rounded-full ring-8 ring-[#fce4a3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <SiteImage
                src="/images/free-trial.jpg"
                alt="A care worker chatting warmly with a resident over a cup of tea"
                width={1100}
                height={751}
                sizes="320px"
                className="h-full w-full object-cover"
              />
            </div>
            {/* FREE starburst badge */}
            <div className="absolute -left-3 top-2 z-20 h-16 w-16">
              <span className="absolute inset-0 rounded-[22%] bg-white shadow-md" />
              <span className="absolute inset-0 rotate-45 rounded-[22%] bg-white shadow-md" />
              <span className="absolute inset-0 flex items-center justify-center text-base font-extrabold text-neutral-dark">FREE</span>
            </div>
            {/* sparkles */}
            <svg className="absolute -right-1 top-7 h-7 w-7 text-neutral-dark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z" />
            </svg>
            <svg className="absolute right-7 top-1 h-4 w-4 text-neutral-dark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 4l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4z" />
            </svg>
            {/* squiggle */}
            <svg className="absolute -bottom-1 left-3 h-5 w-24 text-neutral-dark" viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
              <path d="M3 12 Q 14 2 25 12 T 47 12 T 69 12 T 91 12" />
            </svg>
          </div>
        </div>

        {/* Right — message and CTA */}
        <div>
          <p className="mb-4 text-lg font-medium text-neutral-dark/80">{s('freetrial.eyebrow')}</p>
          <h2 className="text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            {s('freetrial.h2.pre')}{' '}
            <span className="box-decoration-clone rounded-md bg-[#5eead4] px-2 py-0.5">{s('freetrial.h2.highlight')}</span>
            <br />
            {s('freetrial.h2.post')}
          </h2>
          <div className="mt-8 flex flex-col items-start gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-dark px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              {s('freetrial.cta')} <span aria-hidden="true">→</span>
            </Link>
            <p className="text-sm text-neutral-dark/70">{s('freetrial.sub')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function FinalCta({ s }: { s: Slot }) {
  return (
    <section className="relative overflow-hidden bg-hero-gradient py-28 text-center">
      <div className="absolute inset-0 dot-mesh" />
      <div className="absolute -left-32 top-0 h-[400px] w-[400px] rounded-full bg-white/5" />
      <div className="absolute -right-20 bottom-0 h-[300px] w-[300px] rounded-full bg-teal/30" />

      <div className="relative mx-auto max-w-3xl px-6">
        <p className="section-label mb-6 text-white/40">{s('finalcta.eyebrow')}</p>
        <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-[56px]">
          {s('finalcta.h2')}
        </h2>
        <p className="mb-12 text-xl leading-relaxed text-white/70">
          {s('finalcta.sub')}
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/demo" className="btn-amber rounded-btn px-10 py-4 text-base">
            {s('finalcta.primary')}
          </Link>
          <Link href="/register" className="btn-ghost-white rounded-btn px-10 py-4 text-base">
            {s('finalcta.secondary')}
          </Link>
        </div>
      </div>
    </section>
  )
}

export const revalidate = 60

// Code fallback. The live FAQs are managed in the platform Pages tab (home page),
// stored on the site_pages row for "/". This list is used only if that is empty.
const DEFAULT_HOME_FAQS: Faq[] = [
  { question: 'What is CareStream?', answer: 'CareStream is a platform for UK care providers that lets every member of your team ask questions about your own policies, training and CQC preparation, and get a clear answer in seconds, in the hub or by email.' },
  { question: 'How does CareStream work?', answer: 'You upload your policies once. Your staff can then ask a question in plain language and receive an answer drawn from your own documents, with the source policy shown so they can check it.' },
  { question: 'Who is CareStream for?', answer: 'It is built for care homes, nursing homes, domiciliary care and other registered care services, and for everyone in the team from new starters to senior managers.' },
  { question: 'Can staff ask questions in their own language?', answer: 'Yes. Staff can ask in the language they are most comfortable with and receive the answer back in that same language, which is a great help for international teams.' },
  { question: 'How do staff access CareStream?', answer: 'Staff can use it from any phone, tablet or computer, in the hub or by email. The hub works in any browser and can be installed like an app, with a one-tap sign-in link and no password to remember.' },
  { question: 'Will the answers always match our policies?', answer: 'Yes. Answers are based only on the documents you upload, so the guidance staff receive is always your own. The source policy is shown with each answer.' },
  { question: 'Does CareStream help with CQC inspections?', answer: 'Yes. It records how your team engages with your policies and can produce a CQC Readiness Report, giving you helpful evidence to prepare for inspection.' },
  { question: 'Is our data kept private and secure?', answer: 'Yes. Your information is private to your organisation, is stored within the UK and EEA, and is never used to train AI models. A Data Processing Agreement is available to every subscriber.' },
  { question: 'How long does it take to get started?', answer: 'Most homes are up and running the same day. You upload your first policy, invite your team, and staff can begin asking questions straight away.' },
  { question: 'How much does CareStream cost?', answer: 'Pricing is per home with unlimited staff users, so there are no per user fees. You can start with a free 14 day trial. We take your card to begin the trial, but you are not charged until day 14 — cancel anytime before then.' },
]

async function getHomeFaqs(): Promise<Faq[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  try {
    const res = await fetch(`${API_URL}/public/site-pages?path=/`, { next: { revalidate: 60 } })
    if (res.ok) {
      const body = await res.json()
      const faqs = body?.data?.page?.faqs
      if (Array.isArray(faqs) && faqs.length > 0) return faqs as Faq[]
    }
  } catch {
    // fall back to the code list below
  }
  return DEFAULT_HOME_FAQS
}

export default async function HomePage() {
  const [faqs, slots] = await Promise.all([getHomeFaqs(), getContentSlots('/')])
  const s = makeSlot(HOME_SLOTS, slots)
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={[webApplicationSchema(), faqPageSchema(faqs)]} />
      <MarketingNav />
      <main className="flex-1">
        <Hero s={s} />
        <StatsStrip s={s} />
        <TheProblem s={s} />
        <LogoMarquee />
        <PolicyEngine s={s} />
        <RegulationLayerSection s={s} />
        <OurServices s={s} />
        <MultilingualSection s={s} />
        <TrustSection s={s} />
        <OperateAtScale s={s} />
        <PricingSnapshot s={s} />
        <HomeFaq faqs={faqs} />
        <FreeTrialBand s={s} />
        <FinalCta s={s} />
      </main>
      <MarketingFooter />
    </div>
  )
}
