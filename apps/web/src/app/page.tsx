import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/nav'
import { HomeFaq, type Faq } from '@/components/marketing/home-faq'
import { Typewriter } from '@/components/marketing/typewriter'

export const metadata: Metadata = {
  title:       'CareStreamAI · Policies, Training and CQC Tools for UK Care Homes',
  description: 'Give your entire care team instant access to your policies, training, audits and CQC tools in any language, 24/7. CareStream delivers grounded answers in the hub or by email, never the internet.',
  openGraph:   { title: 'CareStreamAI · Policies, Training and CQC Tools for UK Care Homes', description: 'One platform for UK care providers: policy access, staff training, audits and CQC preparation. Powered by your documents. Never the internet.', url: 'https://carestreamai.com' },
}
import { MarketingFooter } from '@/components/marketing/footer'
import { Mockup } from '@/components/marketing/mockup'
import { MOCKUPS } from '@/components/marketing/mockup-data'
import { HomeBlogSection, type HomeBlogPost } from '@/components/marketing/home-blog-section'
import { SettingsCarousel } from '@/components/marketing/settings-carousel'
import { SiteImage } from '@/components/site-image'
import { JsonLd } from '@/components/json-ld'
import { webApplicationSchema, faqPageSchema } from '@/lib/schema'
import {
  Globe, Zap, ClipboardCheck, Upload, MessageSquare, Mail, Mic,
  BarChart2, BookOpen, Shield, AlertTriangle, Users, ArrowRight, Check, ShieldAlert,
  GraduationCap, HelpCircle, FileText, Smartphone,
} from 'lucide-react'

function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`section-label mb-3 ${light ? 'text-white/50' : 'text-teal'}`}>{children}</p>
  )
}

function MockupPlaceholder({ label, aspect = 'aspect-video' }: { label: string; aspect?: string }) {
  return (
    <div className={`${aspect} w-full overflow-hidden rounded-2xl border border-teal/15 bg-gradient-to-br from-teal-light to-white shadow-elevated flex items-center justify-center`}>
      <div className="text-center p-6">
        <div className="mb-2 text-3xl opacity-40">🖼</div>
        <p className="text-xs font-medium text-teal/60">{label}</p>
      </div>
    </div>
  )
}

function Hero() {
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
                Your Risk Assessments are written in English. Your workforce isn&apos;t.
              </span>
              <span className="absolute inset-x-0 bottom-0">
                Your <Typewriter words={['Care Policies', 'HR Policies', 'Care Plans', 'Procedures', 'Risk Assessments']} rounds={2} /> are written in English.{' '}
                <span style={{ color: '#E8850A' }}>Your workforce isn&apos;t.</span>
              </span>
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-white/75">
              CareStream gives every member of your team instant, accurate answers from your own
              policies, training, audits and CQC tools, in the language they think in. Powered by
              your documents. Never the internet.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/demo" className="btn-amber rounded-btn px-8 py-4 text-sm text-center">
                Book a Free Demo
              </Link>
              <Link
                href="/how-it-works"
                className="btn-ghost-white rounded-btn flex items-center justify-center gap-2 px-8 py-4 text-sm"
              >
                See how it works <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50 md:flex-nowrap md:whitespace-nowrap">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> Set up in under an hour</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> GDPR Compliant</span>
            </div>
          </div>

          <div className="relative lg:pl-4">
            <div className="overflow-hidden rounded-2xl shadow-elevated">
              <SiteImage
                src="/images/hero.jpg"
                alt="Care worker reviewing policies on a tablet in a residential care home"
                className="w-full object-cover"
              />
            </div>

            {/* 60+ Languages, bottom left */}
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white px-5 py-4 shadow-card-hover">
              <p className="text-2xl font-extrabold text-teal">60+</p>
              <p className="text-xs font-medium text-neutral-mid">Languages supported</p>
            </div>

            {/* 24/7, top right */}
            <div className="absolute -right-2 top-6 rounded-2xl bg-white px-5 py-4 shadow-card-hover">
              <p className="text-2xl font-extrabold text-amber-brand">24/7</p>
              <p className="text-xs font-medium text-neutral-mid">Policy access</p>
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

            {/* Channels, left middle */}
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white px-4 py-3 shadow-card-hover">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Access via</p>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1.5 rounded-lg bg-teal-light px-2.5 py-1.5">
                  <Mail size={10} className="text-teal" />
                  <span className="text-xs font-semibold text-teal">Email</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
                  <MessageSquare size={10} className="text-amber-brand" />
                  <span className="text-xs font-semibold text-amber-brand">Chat</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5">
                  <Smartphone size={10} className="text-green-700" />
                  <span className="text-xs font-semibold text-green-700">App</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1.5">
                  <Mic size={10} className="text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600">Voice</span>
                </div>
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

function StatsStrip() {
  const stats = [
    { num: '30%+', label: 'UK care workers born outside the UK' },
    { num: '150+', label: 'Languages spoken in UK care settings' },
    { num: '1 in 3', label: 'Night-shift policy questions go unanswered' },
    { num: '£49', label: 'per month, less than one agency shift hour' },
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

function TheProblem() {
  return (
    <section className="relative overflow-hidden bg-neutral-dark py-24">
      {/* Decorative circle */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-teal/10" />

      <div className="relative mx-auto max-w-content px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel light>The Challenge in Care</SectionLabel>
            <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl">
              The language gap in care is a{' '}
              <span style={{ color: '#E8850A' }}>safety gap.</span>
            </h2>
            <div className="space-y-5 text-lg leading-relaxed text-gray-300">
              <p>
                Over 30% of the UK care workforce was born outside the United Kingdom. In many homes,
                the majority of the care team speaks English as a second language.
              </p>
              <p>
                Yet every policy system operates entirely in English, creating a persistent gap between
                what the policy says and what staff can confidently act on.
              </p>
              <p className="text-gray-400">
                At 3am, during an incident, in the first weeks of a new job, that gap leads to
                hesitation, misinterpretation, and decisions made without the guidance that should
                have been available.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              { icon: '🌍', title: 'Policies in English only', body: 'Your carefully written procedures are inaccessible to a large portion of the people they are designed to protect.' },
              { icon: '🕐', title: 'No support at 3am', body: 'Night staff face clinical uncertainty without a manager present, and no reliable way to find the right answer fast.' },
              { icon: '📋', title: 'Compliance gaps at inspection', body: "CQC expects evidence that staff actively use and understand your policies. A folder on a shelf isn't evidence." },
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

function CareSettings() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="mb-12 text-center">
          <SectionLabel>Who We Serve</SectionLabel>
          <h2 className="text-3xl font-extrabold text-neutral-dark md:text-4xl">
            Built for every care setting
          </h2>
        </div>

        <SettingsCarousel />

        <div className="mt-10 text-center">
          <Link href="/who-we-serve" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
            View all settings we serve <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

function ValueProposition() {
  const points = [
    {
      title: 'Policies your whole team can actually use',
      body: 'From clinical procedures to safeguarding, your library is accessible in any language, at any hour, on any device, with no app to download and no training required.',
    },
    {
      title: 'Compliance evidence that builds itself',
      body: 'Every query is logged. Your CQC Readiness Report is compiled automatically from the audit trail, policy access, language activity, version history, staff engagement.',
    },
    {
      title: 'Up and running in under an hour',
      body: 'Upload your policies, add your staff email addresses, and you are live. No integration project, no IT department, no months-long rollout.',
    },
  ]

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left, heading + feature list */}
          <div>
            <SectionLabel>Why CareStreamAI</SectionLabel>
            <h2 className="mb-10 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl lg:text-5xl">
              Built for care providers who want{' '}
              <span className="gradient-text-teal">confident staff</span>{' '}
              and watertight compliance
            </h2>

            <div className="space-y-8">
              {points.map(({ title, body }, i) => (
                <div key={i} className="flex gap-4">
                  <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal">
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-neutral-dark">{title}</p>
                    <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right, photo */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-elevated">
              <SiteImage
                src="/images/care-provider-hero.jpg"
                alt="Care worker using CareStreamAI on a tablet in a residential care home"
                className="w-full object-cover"
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

function TheSolution() {
  const cols = [
    {
      Icon: Globe,
      iconBg: 'bg-teal-light',
      iconColor: 'text-teal',
      title: 'Ask in any language',
      body: 'Staff ask about your policies in any of 60+ languages in the hub or by email. Language is detected automatically, no setup, no menus, no extra cost.',
    },
    {
      Icon: Zap,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-brand',
      title: 'Answer in any language',
      body: 'Responses are generated in the language the question was asked in, drawn exclusively from your own approved policies. Under 30 seconds. Cited.',
    },
    {
      Icon: ClipboardCheck,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-700',
      title: 'Evidence for inspection',
      body: 'Every query is logged. The CQC Readiness Report turns your audit trail into inspection evidence, showing equitable policy access across your multilingual team.',
    },
  ]
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>How CareStreamAI Helps</SectionLabel>
        <h2 className="mb-4 max-w-2xl text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
          Policy access that works for your whole team.
        </h2>
        <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
          Not just the ones who speak English.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {cols.map(({ Icon, iconBg, iconColor, title, body }) => (
            <div key={title} className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg}`}>
                <Icon size={24} className={iconColor} />
              </div>
              <h3 className="mb-3 text-xl font-bold text-neutral-dark">{title}</h3>
              <p className="leading-relaxed text-neutral-mid">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function GroupLevel() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left, text */}
          <div>
            <SectionLabel>Group Providers</SectionLabel>
            <h2 className="mb-5 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl lg:text-5xl">
              Built for group-level care delivery
            </h2>
            <p className="text-lg leading-relaxed text-neutral-mid">
              Real-time policy visibility across every service, for multi-site providers.
              With a single policy library and centralised oversight, group leaders can
              standardise procedures, spot compliance gaps earlier, and drive consistent
              outcomes across every location, without adding headcount.
            </p>
          </div>

          {/* Right, image */}
          <div className="overflow-hidden rounded-2xl shadow-elevated">
            <SiteImage
              src="/images/group-care.jpg"
              alt="Care team delivering group-level care across a residential setting"
              className="w-full object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  )
}

function FreeTrialBand() {
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
          <p className="mb-4 text-lg font-medium text-neutral-dark/80">A risk free way to get started</p>
          <h2 className="text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            CareStream is{' '}
            <span className="box-decoration-clone rounded-md bg-[#5eead4] px-2 py-0.5">free for 14 days</span>
            <br />
            for your whole team.
          </h2>
          <div className="mt-8 flex flex-col items-start gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-dark px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              Start Your Free Trial <span aria-hidden="true">→</span>
            </Link>
            <p className="text-sm text-neutral-dark/70">No card needed. Full access for 14 days.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function OperateAtScale() {
  const points = [
    'Clear total cost of ownership across your group',
    'Lower cost per service user as you grow',
    'One policy library, consistently applied across every site',
    'Multilingual access as standard, no extra configuration',
    'Group-level CQC Readiness Reports, generated automatically',
    'A partner that listens and scales with you',
  ]

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left, heading + list + CTA */}
          <div>
            <SectionLabel>Enterprise Ready</SectionLabel>
            <h2 className="mb-6 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl lg:text-5xl">
              Designed to operate at scale
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
              Everything a group operator needs to run consistent, compliant care across
              multiple sites, without the complexity of enterprise software.
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
              Book a demo with our group team <ArrowRight size={16} />
            </a>
          </div>

          {/* Right, image */}
          <div className="overflow-hidden rounded-2xl shadow-elevated">
            <SiteImage
              src="/images/operate-at-scale.jpg"
              alt="Care manager reviewing policy compliance on screen"
              className="w-full object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {
      num: '01',
      title: 'Upload your policies',
      body: 'Upload your policy library and staff handbook via the admin dashboard. PDF, Word, or plain text. CareStreamAI processes them and builds your private, searchable library.',
      mockup: 'mockup-06' as const,
    },
    {
      num: '02',
      title: 'Staff start asking',
      body: 'Your team sends questions via email or the web chat portal, in any language. CareStreamAI identifies the language automatically and retrieves the most relevant policy content.',
      mockup: 'mockup-01' as const,
    },
    {
      num: '03',
      title: 'Instant, grounded answers',
      body: 'Responses arrive in under 30 seconds, in the language the question was asked, drawn only from your approved documents. Never the internet.',
      mockup: 'mockup-02' as const,
    },
    {
      num: '04',
      title: 'Your compliance evidence builds',
      body: 'Every query is logged. Your CQC Readiness Report builds automatically, policy access, language activity, staff engagement, version history.',
      mockup: 'mockup-05' as const,
    },
  ]
  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>The Process</SectionLabel>
        <h2 className="mb-16 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
          Up and running in hours.<br className="hidden sm:block" /> Not months.
        </h2>

        <div className="space-y-20">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`grid items-center gap-12 md:grid-cols-2 ${i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''}`}
            >
              <div>
                <div className="mb-5 inline-flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                    {step.num}
                  </span>
                </div>
                <h3 className="mb-4 text-2xl font-bold text-neutral-dark">{step.title}</h3>
                <p className="text-lg leading-relaxed text-neutral-mid">{step.body}</p>
              </div>
              <div>
                <Mockup {...MOCKUPS[step.mockup]} />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/how-it-works"
            className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark"
          >
            See the full walkthrough <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionLabel>Why It Can Be Trusted</SectionLabel>
            <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
              The AI doesn&apos;t make things up.{' '}
              <span className="gradient-text-teal">It can&apos;t.</span>
            </h2>
            <p className="mb-10 text-lg leading-relaxed text-neutral-mid">
              CareStreamAI only answers from your uploaded, approved documents. Not the internet. Not
              general AI knowledge. Not another organisation&apos;s policies. If your policy doesn&apos;t say it,
              CareStreamAI won&apos;t say it.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-green-50 p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-green-700">What it uses</p>
                <ul className="space-y-2.5">
                  {['Your uploaded policies', 'Your staff handbook', 'Your approved regulatory guidance', 'Exact sections relevant to each query'].map(u => (
                    <li key={u} className="flex items-start gap-2.5 text-sm text-green-800">
                      <Check size={15} className="mt-0.5 flex-shrink-0 text-green-500" /> {u}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-red-50 p-6">
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-red-600">What it never uses</p>
                <ul className="space-y-2.5">
                  {['The internet', 'Other organisations\' policies', 'General AI training data', 'Anything outside your documents'].map(n => (
                    <li key={n} className="flex items-start gap-2.5 text-sm text-red-800">
                      <span className="mt-0.5 flex-shrink-0 font-bold text-red-400">✕</span> {n}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8">
              <Link href="/trust" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
                How we keep your data private and secure <ArrowRight size={16} />
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

function CareSectorAiSection() {
  const bubbles = [
    { label: 'Care Policies',       pos: 'left-3 top-[12%]' },
    { label: 'Care Training',       pos: 'left-1 top-[45%]' },
    { label: 'Care Audits',         pos: 'left-6 bottom-[12%]' },
    { label: 'HR Policies',         pos: 'right-3 top-[18%]' },
    { label: 'CQC Staff Questions', pos: 'right-2 top-[55%]' },
  ]
  return (
    <section className="bg-white pt-12 pb-24">
      <div className="mx-auto max-w-content px-6">
        <div className="overflow-hidden rounded-3xl bg-[#e8f1fc] p-8 md:p-12 lg:p-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            {/* Left — heading */}
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l1.7 5.1L19 9l-5.3 1.9L12 16l-1.7-5.1L5 9l5.3-1.9L12 2zM5 15l.9 2.6L8.5 18.5 5.9 19.4 5 22l-.9-2.6L1.5 18.5l2.6-.9L5 15zm14 0l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z" />
                </svg>
                New
              </span>
              <h2 className="mt-6 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
                Finally, AI that works for the Care Sector
              </h2>
            </div>

            {/* Right — image with glowing frame and floating bubbles */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl shadow-elevated">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <SiteImage
                  src="/images/care-sector-ai.jpg"
                  alt="A care professional reading policies on a tablet in a care home lounge"
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-5 rounded-xl border-2 border-cyan-300 shadow-[0_0_24px_4px_rgba(56,189,248,0.55)]" />
              </div>
              {bubbles.map((b) => (
                <span
                  key={b.label}
                  className={`absolute z-10 ${b.pos} rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-neutral-dark shadow-md ring-1 ring-black/5`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function RegulationLayerSection() {
  const frameworks = [
    { name: 'CQC Fundamental Standards',       reg: 'Reg 12, 17 & 19', desc: 'The baseline requirements every registered service must meet: safe care, governance, and fit and proper persons.' },
    { name: 'Health & Safety at Work Act 1974', reg: 'HSWA 1974',       desc: 'Employer and employee duties around risk assessment, safe systems of work, and incident reporting.' },
    { name: 'GDPR & Data Protection Act 2018',  reg: 'UK GDPR',         desc: 'How resident and staff data must be collected, stored, shared, and protected.' },
    { name: 'Mental Capacity Act 2005',          reg: 'MCA 2005',        desc: 'Supporting residents who may lack capacity to make decisions, including best-interest processes.' },
    { name: 'Safeguarding Adults',               reg: 'Care Act 2014',   desc: 'Legal duties to protect adults at risk from abuse, neglect, and exploitation.' },
    { name: 'RIDDOR',                            reg: 'RIDDOR 2013',     desc: 'When and how to report workplace injuries, diseases, and dangerous occurrences to the HSE.' },
  ]

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">

        {/* Heading row */}
        <div className="mb-14 grid items-end gap-8 lg:grid-cols-2">
          <div>
            <SectionLabel>Regulatory Intelligence</SectionLabel>
            <h2 className="text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
              Your policies and the law,{' '}
              <span className="gradient-text-teal">answered together.</span>
            </h2>
          </div>
          <div className="lg:pb-1">
            <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
              The UK care regulations and statutory frameworks that matter to a care service are loaded
              into CareStream and kept up to date. When a staff member asks something that touches both
              your internal policy and an external framework, the response explains how the two interact,
              not just what your policy says in isolation.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-teal/10 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-teal" />
              <span className="text-sm font-semibold text-teal">UK regulations, loaded and kept up to date</span>
            </div>
          </div>
        </div>

        {/* Main visual: breakdown left + WhatsApp mockup right */}
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

          {/* Right: WhatsApp conversation mockup */}
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
          <p className="text-sm font-semibold uppercase tracking-widest text-neutral-mid">A selection of frameworks included</p>
          <span className="shrink-0 rounded-full bg-teal/10 px-3 py-1 text-xs font-bold text-teal">and more</span>
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

function HomeKnowledgeCallout() {
  const rows = [
    {
      q: 'Who is the infection control lead?',
      generic: '"The designated lead as named in the policy."',
      specific: '"Maria Chen. On nights and weekends, cover is the senior carer on shift."',
    },
    {
      q: 'What colour mop for the bathrooms?',
      generic: '"Follow the colour-coding scheme in the Infection Control Policy."',
      specific: '"Blue mops and cloths for bathrooms. Yellow for kitchen areas. Red for high-risk only."',
    },
    {
      q: 'Who do I call for a medication discrepancy overnight?',
      generic: '"Contact the on-call manager as per the Medication Policy."',
      specific: '"Call Sarah Ambridge on the duty manager number. Out-of-hours number is on the medication room door."',
    },
  ]
  return (
    <section className="bg-neutral-dark py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel light>Your Home. Not a Generic Care Home.</SectionLabel>
        <h2 className="mb-6 max-w-3xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
          Not just what policies say.{' '}
          <span style={{ color: '#E8850A' }}>How your home works.</span>
        </h2>
        <p className="mb-14 max-w-2xl text-lg leading-relaxed text-gray-300">
          CareStreamAI extracts the specific facts from your documents, named individuals, schedules, exact
          local procedures, and makes them instantly answerable.
        </p>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-3 border-b border-white/10 bg-white/10 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-white/40">
            <span>Question</span>
            <span>Generic answer</span>
            <span className="text-amber-brand">CareStreamAI answer</span>
          </div>
          {rows.map(({ q, generic, specific }, i) => (
            <div
              key={q}
              className={`grid grid-cols-3 px-6 py-5 text-sm ${i < rows.length - 1 ? 'border-b border-white/8' : ''}`}
            >
              <span className="pr-4 font-medium text-white">{q}</span>
              <span className="pr-4 italic text-white/40">{generic}</span>
              <span className="font-medium text-white/90">{specific}</span>
            </div>
          ))}
        </div>

        {/* Multilingual visualization */}
        <div className="mt-20">
          <div className="mb-3">
            <SectionLabel light>60+ Languages</SectionLabel>
          </div>
          <div className="mb-10 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-2xl font-extrabold text-white md:text-3xl">
              Ask in any language. <span style={{ color: '#E8850A' }}>Answered in the same language.</span>
            </h3>
            <p className="max-w-xs text-sm leading-relaxed text-white/50">
              Language is detected automatically. No selection required.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
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
            ].map(({ lang, flag, question, answer, source }) => (
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
        </div>

      </div>
    </section>
  )
}

function FeaturesOverview() {
  const features: Array<{ icon: React.ReactNode; title: string; desc: string; highlight?: boolean }> = [
    { icon: '🌍', title: '60+ language support',        desc: 'Staff ask in any language. Answers come back in the same language, automatically.' },
    { icon: '💬', title: 'Hub and email',               desc: 'Use the hub in any browser or installed as an app, with a passwordless sign-in link. Email is there for anyone who prefers it.' },
    {
      icon: <Smartphone size={28} className="text-teal" />,
      title: 'Installable hub app',
      desc: 'Staff install the hub on their phone and get push notifications for training and reminders. Nothing to learn.',
    },
    {
      icon: <Mic size={28} className="text-purple-600" />,
      title: 'Voice input',
      desc: 'Speak a question in any language, hands-free, and hear the answer read back from your policies.',
    },
    { icon: '🏠', title: 'Your home, in detail',        desc: 'Knows your specific roles, schedules, and local procedures, not just generic policy text.', highlight: true },
    { icon: '📊', title: 'CQC Readiness Report',        desc: 'Inspection evidence generated automatically, covering access logs, language activity and staff engagement.' },
    { icon: '🔍', title: 'Policy gap detection',        desc: "Identify which questions your policies aren't answering, before CQC does." },
    { icon: '📚', title: 'Staff handbook self-service', desc: 'Turn your HR handbook into a 24/7 resource for leave, disciplinary, and employment questions.' },
    { icon: '🔒', title: 'Immutable audit trail',       desc: 'Every query logged, timestamped, and auditable. CQC-ready from day one.' },
  ]
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>What You Get</SectionLabel>
        <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark md:text-5xl">
          Nine reasons care teams love it.
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map(({ icon, title, desc, highlight }) => (
            <div
              key={title}
              className={`card-lift rounded-2xl p-6 ${
                highlight
                  ? 'bg-teal-gradient text-white shadow-teal-glow'
                  : 'border border-gray-100 bg-white shadow-card'
              }`}
            >
              <div className={`mb-4 flex h-8 w-8 items-center justify-center ${highlight ? 'opacity-90' : ''}`}>
                {typeof icon === 'string' ? <span className="text-2xl leading-none">{icon}</span> : icon}
              </div>
              <h3 className={`mb-2 font-bold ${highlight ? 'text-white' : 'text-neutral-dark'}`}>{title}</h3>
              <p className={`text-sm leading-relaxed ${highlight ? 'text-white/75' : 'text-neutral-mid'}`}>{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/care-policies" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
            See all features <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

function WhatsAppSection() {
  const chatMessages = [
    {
      side: 'right',
      bg: '#0d9488',
      text: 'Maaari mo bang ipadaan ang patakaran sa pagbagsak?',
      meta: '22:14 ✓✓',
    },
    {
      side: 'left',
      bg: '#202c33',
      label: '🇵🇭 Tagalog detected',
      text: 'Manatili kasama ang residente. Huwag ilipat kung may suspetsa ng pinsala sa gulugod. Tawagan ang senior carer agad.',
      source: 'Falls Policy v3.2 · Seksyon 4.1',
      meta: '22:14',
    },
    {
      side: 'right',
      bg: '#0d9488',
      text: 'Who is the on-call manager tonight?',
      meta: '22:15 ✓✓',
    },
    {
      side: 'left',
      bg: '#202c33',
      text: 'Sarah Ambridge is on call tonight. Duty number is on the medication room door.',
      source: 'On-Call Rota · Updated 6 Nov',
      meta: '22:15',
    },
  ]

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left, text */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-light px-4 py-2 border border-teal/20">
              <Smartphone size={16} className="text-teal" />
              <span className="text-sm font-semibold text-teal">The Hub</span>
            </div>
            <h2 className="mb-5 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl lg:text-5xl">
              Everything in one place, on the app your staff install.
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
              The hub is where your whole team works. They install it on their phone like any app, sign
              in once with a one-tap link, and can ask your policies a question in any language, at any
              hour, by typing or speaking.
            </p>
            <ul className="mb-10 space-y-4">
              {[
                'Installs like an app on any phone, with a passwordless sign-in link.',
                'Ask by typing or speaking, and hear the answer read back.',
                'Every conversation logged for your CQC audit trail.',
                'Push notifications bring training and reminders to staff in the hub.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <div className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                    <Check size={11} className="text-green-600" />
                  </div>
                  <span className="text-neutral-dark">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/demo"
              className="btn-amber inline-flex items-center gap-2 rounded-btn px-8 py-4 text-sm font-bold text-white"
            >
              See it in action <ArrowRight size={16} />
            </Link>
          </div>

          {/* Right, WhatsApp chat mockup */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-elevated">
              {/* Header */}
              <div className="flex items-center gap-3 bg-teal px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-extrabold text-white">CS</div>
                <div>
                  <p className="text-sm font-semibold text-white">CareStream</p>
                  <p className="text-xs text-white/60">Crossways Care Home</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 rounded-full bg-white/15 px-2 py-0.5">
                  <Smartphone size={11} className="text-white" />
                  <span className="text-[10px] font-semibold text-white">App</span>
                </div>
              </div>
              {/* Messages */}
              <div className="space-y-2.5 bg-gray-50 px-3 py-4" style={{ minHeight: 280 }}>
                {chatMessages.map((msg, i) => {
                  const isUser = msg.side === 'right'
                  return (
                    <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[82%] px-3 py-2 ${isUser ? 'bg-teal' : 'border border-gray-100 bg-white shadow-sm'}`}
                        style={{ borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px' }}
                      >
                        {msg.label && (
                          <p className="mb-1.5 text-[10px] font-semibold text-teal">{msg.label}</p>
                        )}
                        <p className={`text-xs leading-relaxed ${isUser ? 'text-white' : 'text-neutral-dark'}`}>{msg.text}</p>
                        {msg.source && (
                          <p className="mt-1 text-[10px] text-neutral-mid">{msg.source}</p>
                        )}
                        <p className={`mt-0.5 text-right text-[10px] ${isUser ? 'text-white/60' : 'text-gray-400'}`}>{msg.meta}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

function VoiceSection() {
  const bars = [18, 32, 52, 38, 68, 48, 62, 42, 72, 54, 38, 58, 32, 48, 22]

  return (
    <section className="relative overflow-hidden bg-neutral-dark py-24">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full border border-white/5" />
      <div className="pointer-events-none absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-teal/10" />

      <div className="relative mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left, voice visual */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center">
              {/* Pulse rings + mic button */}
              <div className="relative mb-10 flex h-48 w-48 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-teal/8" />
                <div className="absolute h-36 w-36 rounded-full bg-teal/12" />
                <div className="absolute h-28 w-28 rounded-full bg-teal/18" />
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal shadow-teal-glow">
                  <Mic size={30} className="text-white" />
                </div>
                {/* Recording indicator */}
                <div className="absolute right-8 top-8 flex items-center gap-1.5 rounded-full bg-red-500/90 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  <span className="text-[10px] font-bold text-white">REC</span>
                </div>
              </div>
              {/* Waveform */}
              <div className="flex items-end gap-1">
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="w-2 rounded-full bg-teal/60"
                    style={{ height: h }}
                  />
                ))}
              </div>
              {/* Language badge */}
              <div className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 backdrop-blur-sm">
                <span className="text-base">🇵🇱</span>
                <span className="text-xs font-semibold text-white">Polish detected</span>
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-green-400" />
              </div>
              {/* Transcript preview */}
              <div className="mt-4 max-w-xs rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
                <p className="text-center text-xs italic text-white/50">
                  &ldquo;Co powinienem zrobić po upadku mieszkańca?&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Right, text */}
          <div>
            <SectionLabel light>Voice in the Hub</SectionLabel>
            <h2 className="mb-5 text-3xl font-extrabold leading-tight text-white md:text-4xl lg:text-5xl">
              Speak your question.{' '}
              <span style={{ color: '#E8850A' }}>Hear your answer.</span>
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-gray-300">
              Not everyone types quickly in their second language. In the hub, staff can ask policy
              questions by speaking instead of typing, hands-free, mid-task, in their own language,
              and have the answer read back to them.
            </p>
            <div className="space-y-6">
              {[
                {
                  icon: '🗣️',
                  title: 'Speak in your own language',
                  body: 'The hub turns speech into text as staff talk, in over 60 languages, so anyone who finds typing in English hard can simply ask out loud.',
                },
                {
                  icon: '🔊',
                  title: 'Listen to the answer',
                  body: 'Every answer can be read aloud in the hub, so staff can keep their hands free on the care floor while they listen.',
                },
                {
                  icon: '📋',
                  title: 'Same audit trail',
                  body: 'Voice queries are logged identically to typed questions, capturing date, time, user and policy cited, all for your CQC records.',
                },
              ].map(({ icon, title, body }) => (
                <div key={title} className="flex gap-4">
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
      </div>
    </section>
  )
}

function PolicyGapsSection() {
  const gaps = [
    { question: 'What is the procedure for end-of-life care documentation?', status: 'gap',     queries: 14 },
    { question: 'How do we handle a resident requesting to leave against advice?',  status: 'gap',     queries: 9  },
    { question: 'What is the medication review process for new admissions?',        status: 'covered', queries: 22 },
    { question: 'Who authorises CCTV footage requests?',                            status: 'gap',     queries: 6  },
    { question: 'What is the falls risk score threshold for bed rails?',            status: 'covered', queries: 18 },
  ]

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left, text */}
          <div>
            <SectionLabel>Policy Gap Detection</SectionLabel>
            <h2 className="mb-5 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl lg:text-5xl">
              Find your policy gaps{' '}
              <span className="gradient-text-teal">before CQC does.</span>
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
              Every time a query can&apos;t be answered from your documents, it&apos;s flagged.
              Over time, patterns emerge. You can see exactly which questions your staff are asking
              that your policies don&apos;t yet address.
            </p>
            <ul className="mb-10 space-y-4">
              {[
                "See exactly which questions your policies can't answer.",
                'Prioritised by query frequency, so you can fix the most common gaps first.',
                'Monthly summary report, ready for your manager\'s review.',
                'Included in your CQC Readiness Report as evidence of continuous improvement.',
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <ShieldAlert size={16} className="mt-0.5 flex-shrink-0 text-amber-brand" />
                  <span className="text-neutral-dark">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/care-policies"
              className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark"
            >
              Learn more about Policy Gap Detection <ArrowRight size={16} />
            </Link>
          </div>

          {/* Right, gap detection panel */}
          <div>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-neutral-dark">Policy Gap Report</p>
                    <p className="text-xs text-neutral-mid">Last 30 days · Crossways Care Home</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-brand">
                    3 gaps found
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {gaps.map(({ question, status, queries }) => (
                  <div key={question} className="flex items-start gap-3 px-6 py-4">
                    <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${
                      status === 'gap' ? 'bg-red-50' : 'bg-green-50'
                    }`}>
                      {status === 'gap'
                        ? <AlertTriangle size={10} className="text-red-500" />
                        : <Check size={10} className="text-green-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-neutral-dark">{question}</p>
                      <p className="mt-0.5 text-xs text-neutral-mid">{queries} queries this month</p>
                    </div>
                    {status === 'gap' && (
                      <span className="flex-shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        Gap
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={14} className="mt-0.5 flex-shrink-0 text-amber-brand" />
                  <p className="text-xs text-neutral-mid">
                    <strong className="text-neutral-dark">Tip:</strong>{' '}
                    Adding a procedure for end-of-life care documentation would resolve 14
                    unanswered queries from the past month.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

function PricingSnapshot() {
  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>Pricing</SectionLabel>
        <h2 className="mb-4 text-4xl font-extrabold text-neutral-dark md:text-5xl">
          Simple, transparent pricing.
        </h2>
        <p className="mb-14 text-lg text-neutral-mid">No hidden costs. No per-user fees. No surprises.</p>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {/* Starter */}
          <div className="card-lift rounded-2xl border border-gray-200 bg-white p-8 shadow-card">
            <p className="mb-1 text-sm font-semibold text-neutral-mid">Starter</p>
            <p className="mb-1 text-4xl font-extrabold text-neutral-dark">£49<span className="text-base font-normal text-neutral-mid">/month</span></p>
            <p className="mb-8 text-sm text-neutral-mid">Per home. Unlimited staff users.</p>
            <ul className="mb-8 space-y-3 text-sm">
              {['Policy library (up to 25 policies)', 'Hub and email access for all staff', '60+ language support', '500 queries/month', 'Full audit trail', 'Basic analytics'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-neutral-dark">
                  <Check size={16} className="flex-shrink-0 text-teal" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block rounded-btn border-2 border-teal px-6 py-3 text-center text-sm font-bold text-teal hover:bg-teal-light">
              Start Free Trial
            </Link>
          </div>

          {/* Professional */}
          <div className="card-lift relative rounded-2xl bg-teal-gradient p-8 shadow-teal-glow">
            <span className="absolute right-6 top-6 rounded-pill bg-amber-brand px-3 py-1 text-xs font-bold text-white">
              Most popular
            </span>
            <p className="mb-1 text-sm font-semibold text-white/60">Professional</p>
            <p className="mb-1 text-4xl font-extrabold text-white">£129<span className="text-base font-normal text-white/60">/month</span></p>
            <p className="mb-8 text-sm text-white/60">Per home. Everything in Starter, plus:</p>
            <ul className="mb-8 space-y-3 text-sm">
              {['Unlimited policies', '5,000 queries/month', 'CQC Readiness Report PDF', 'Policy gap detection', 'Language analytics', 'Staff engagement by individual'].map(f => (
                <li key={f} className="flex items-center gap-2.5 text-white">
                  <Check size={16} className="flex-shrink-0 text-white/70" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-amber block rounded-btn px-6 py-3 text-center text-sm">
              Start Free Trial
            </Link>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link href="/pricing" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
            Full pricing and feature comparison <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  const slots = [
    {
      initials: 'JM',
      role: 'Registered Manager',
      location: 'Residential Care Home, West Midlands',
      placeholder: 'staff confidence and language access',
    },
    {
      initials: 'PT',
      role: 'Operations Director',
      location: 'Care Group, East of England',
      placeholder: 'CQC inspection readiness across 4 homes',
    },
    {
      initials: 'AO',
      role: 'HR Lead',
      location: 'Home Care Provider, Greater London',
      placeholder: 'staff handbook self-service and overseas onboarding',
    },
  ]
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>What People Say</SectionLabel>
        <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark md:text-5xl">
          Trusted by care professionals.
        </h2>

        <div className="grid gap-6 md:grid-cols-3">
          {slots.map(({ initials, role, location, placeholder }) => (
            <div key={role} className="card-lift rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-6 text-5xl font-bold leading-none text-teal/20">&ldquo;</div>
              <p className="mb-8 text-base italic leading-relaxed text-neutral-mid">
                [Testimonial, {placeholder}]
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-light text-sm font-bold text-teal">
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-dark">{role}</p>
                  <p className="text-xs text-neutral-mid">{location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-hero-gradient py-28 text-center">
      <div className="absolute inset-0 dot-mesh" />
      <div className="absolute -left-32 top-0 h-[400px] w-[400px] rounded-full bg-white/5" />
      <div className="absolute -right-20 bottom-0 h-[300px] w-[300px] rounded-full bg-teal/30" />

      <div className="relative mx-auto max-w-3xl px-6">
        <p className="section-label mb-6 text-white/40">Get Started</p>
        <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-[56px]">
          Give your whole team the policy access they deserve.
        </h2>
        <p className="mb-12 text-xl leading-relaxed text-white/70">
          14-day free trial. No credit card required. Set up in under an hour.
        </p>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/demo" className="btn-amber rounded-btn px-10 py-4 text-base">
            Book a Free Demo
          </Link>
          <Link href="/register" className="btn-ghost-white rounded-btn px-10 py-4 text-base">
            Start Free Trial
          </Link>
        </div>
      </div>
    </section>
  )
}

function OurServices() {
  const services = [
    { Icon: FileText,      title: 'Care Policies',       href: '/care-policies',       desc: 'Every policy answerable in seconds, in 60+ languages, with the source policy and version cited.' },
    { Icon: BookOpen,      title: 'HR Policies',         href: '/hr-policies',         desc: 'Your staff handbook on demand. Leave, pay and disciplinary questions answered in any language.' },
    { Icon: GraduationCap, title: 'Staff Training',      href: '/staff-training',      desc: 'Modules built from your own policies, delivered in the hub, with renewal reminders and tracking.' },
    { Icon: ClipboardCheck,title: 'Care Audits',         href: '/care-audits',         desc: 'Guided, structured audits that score each section and produce an inspection-ready report.' },
    { Icon: Shield,        title: 'CQC & Compliance',    href: '/cqc-compliance',      desc: 'Evidence that builds itself, plus regulation coverage showing exactly where your gaps are.' },
    { Icon: HelpCircle,    title: 'CQC Staff Questions', href: '/cqc-staff-questions', desc: 'Inspector-style questions, answered by staff in their own words and scored by AI, with retry.' },
    { Icon: MessageSquare, title: 'CQC Report Chat',     href: '/cqc-report-chat',     desc: 'Upload your inspection report and chat with it, cross-referenced against your own policies.' },
    { Icon: ShieldAlert,   title: 'Business Continuity', href: '/business-continuity', desc: 'Make your business continuity information instantly queryable by every member of staff, on any shift.' },
  ]
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>Our Services</SectionLabel>
        <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
          One platform for your whole care operation.
        </h2>
        <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
          CareStream is far more than policy access. Training, audits, CQC preparation and your staff
          handbook all run on the same engine, grounded in your own documents, and all in one hub your
          team signs into once.
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
  { question: 'How much does CareStream cost?', answer: 'Pricing is per home with unlimited staff users, so there are no per user fees. You can start with a free 14 day trial, and no card is needed to begin.' },
]

async function getFeaturedPosts(): Promise<HomeBlogPost[]> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
  const COLORS: Record<string, string> = {
    'CQC & Compliance':     'bg-teal-light text-teal',
    'Regulatory Knowledge': 'bg-amber-50 text-amber-brand',
    'Workforce':            'bg-green-50 text-green-700',
    'Technology':           'bg-purple-50 text-purple-700',
    'Registered Manager':   'bg-neutral-light text-neutral-mid',
  }
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
  try {
    const res = await fetch(`${API_URL}/public/blog/posts`, { next: { revalidate: 60 } })
    if (res.ok) {
      const body = await res.json()
      const posts = (body?.data?.posts ?? []) as Array<{
        slug: string; title: string; excerpt: string | null; category: string
        publication_date: string | null; read_time_minutes: number; is_featured: boolean
      }>
      const mapped = posts
        .filter(p => p.is_featured)
        .map(p => ({
          slug:          p.slug,
          date:          fmtDate(p.publication_date),
          category:      p.category,
          categoryColor: COLORS[p.category] ?? 'bg-teal-light text-teal',
          title:         p.title,
          summary:       p.excerpt ?? '',
          readTime:      `${p.read_time_minutes} min read`,
        }))
      if (mapped.length > 0) return mapped
    }
  } catch {
    // fall back to the static featured list inside HomeBlogSection
  }
  return []
}

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
  const [faqs, featuredPosts] = await Promise.all([getHomeFaqs(), getFeaturedPosts()])
  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={[webApplicationSchema(), faqPageSchema(faqs)]} />
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <StatsStrip />
        <TheProblem />
        <CareSettings />
        <ValueProposition />
        <TheSolution />
        <OurServices />
        <GroupLevel />
        <FreeTrialBand />
        <OperateAtScale />
        <HowItWorks />
        <TrustSection />
        <CareSectorAiSection />
        <RegulationLayerSection />
        <HomeKnowledgeCallout />
        <FeaturesOverview />
        <WhatsAppSection />
        <VoiceSection />
        <PolicyGapsSection />
        <HomeBlogSection posts={featuredPosts} />
        <PricingSnapshot />
        <HomeFaq faqs={faqs} />
        <Testimonials />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  )
}
