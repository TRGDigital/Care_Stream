import Link from 'next/link'
import { MarketingNav } from '@/components/marketing/nav'
import { MarketingFooter } from '@/components/marketing/footer'
import { Mockup } from '@/components/marketing/mockup'
import { MOCKUPS } from '@/components/marketing/mockup-data'
import {
  Globe, Zap, ClipboardCheck, Upload, MessageSquare, Mail,
  BarChart2, BookOpen, Shield, AlertTriangle, Users, ArrowRight, Check,
} from 'lucide-react'

// ─── Shared ───────────────────────────────────────────────────────────────────

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

// ─── Hero ─────────────────────────────────────────────────────────────────────

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

            <h1 className="mb-6 text-5xl font-extrabold leading-[1.08] tracking-tight text-white md:text-6xl lg:text-[62px]">
              Your policies are written in English.{' '}
              <span style={{ color: '#E8850A' }}>Your workforce isn&apos;t.</span>
            </h1>

            <p className="mb-10 max-w-xl text-lg leading-relaxed text-white/75">
              CareStreamAI gives every member of your care team instant access to your policies —
              in the language they think in. Powered by your documents. Never the internet.
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

            <div className="mt-8 flex flex-wrap gap-5 text-sm text-white/50">
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> 14-day free trial</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Check size={14} className="text-white/40" /> Set up in under an hour</span>
            </div>
          </div>

          <div className="relative lg:pl-4">
            <Mockup {...MOCKUPS['mockup-01']} />

            {/* 50+ Languages — bottom left */}
            <div className="absolute -bottom-4 -left-4 rounded-2xl bg-white px-5 py-4 shadow-card-hover">
              <p className="text-2xl font-extrabold text-teal">50+</p>
              <p className="text-xs font-medium text-neutral-mid">Languages supported</p>
            </div>

            {/* 24/7 — top right */}
            <div className="absolute -right-2 top-6 rounded-2xl bg-white px-5 py-4 shadow-card-hover">
              <p className="text-2xl font-extrabold text-amber-brand">24/7</p>
              <p className="text-xs font-medium text-neutral-mid">Policy access</p>
            </div>

            {/* < 30s — top, inset */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 shadow-card-hover">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-light">
                <Zap size={14} className="text-teal" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-neutral-dark">{"<"}30 sec</p>
                <p className="text-[10px] text-neutral-mid">Response time</p>
              </div>
            </div>

            {/* Email + Chat channels — left middle */}
            <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white px-4 py-3 shadow-card-hover">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Access via</p>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-teal-light px-2.5 py-1.5">
                  <Mail size={11} className="text-teal" />
                  <span className="text-xs font-semibold text-teal">Email</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5">
                  <MessageSquare size={11} className="text-amber-brand" />
                  <span className="text-xs font-semibold text-amber-brand">Chat</span>
                </div>
              </div>
            </div>

            {/* CQC audit trail — bottom right */}
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

// ─── Stats Strip ──────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { num: '30%+', label: 'UK care workers born outside the UK' },
    { num: '150+', label: 'Languages spoken in UK care settings' },
    { num: '1 in 3', label: 'Night-shift policy questions go unanswered' },
    { num: '£49', label: 'per month — less than one agency shift hour' },
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

// ─── The Problem ──────────────────────────────────────────────────────────────

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
                Yet every policy system operates entirely in English — creating a persistent gap between
                what the policy says and what staff can confidently act on.
              </p>
              <p className="text-gray-400">
                At 3am, during an incident, in the first weeks of a new job — that gap leads to
                hesitation, misinterpretation, and decisions made without the guidance that should
                have been available.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              { icon: '🌍', title: 'Policies in English only', body: 'Your carefully written procedures are inaccessible to a large portion of the people they are designed to protect.' },
              { icon: '🕐', title: 'No support at 3am', body: 'Night staff face clinical uncertainty without a manager present — and no reliable way to find the right answer fast.' },
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

// ─── Care Settings ────────────────────────────────────────────────────────────

function CareSettings() {
  const settings = [
    {
      slug: 'residential',
      href: '/residential-care',
      label: 'Residential Care Homes',
      description: 'Supporting registered managers and care staff with 24/7 policy access, multilingual answers, and automatic CQC compliance evidence.',
      image: '/images/residential-care.png',
      gradient: 'from-teal to-teal-dark',
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <rect x="8" y="28" width="48" height="28" rx="3" fill="white" fillOpacity="0.15"/>
          <path d="M4 32 L32 10 L60 32" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          <rect x="24" y="40" width="16" height="16" rx="2" fill="white" fillOpacity="0.3"/>
          <circle cx="32" cy="48" r="3" fill="white" fillOpacity="0.6"/>
          <rect x="12" y="36" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.25"/>
          <rect x="42" y="36" width="10" height="10" rx="1.5" fill="white" fillOpacity="0.25"/>
        </svg>
      ),
    },
    {
      slug: 'nursing',
      href: '/nursing-homes',
      label: 'Nursing Homes',
      description: 'Giving nursing and care teams instant access to clinical procedures in any language, at any hour — with every query logged for inspection.',
      image: '/images/nursing-home.png',
      gradient: 'from-[#0A5F5F] to-[#0D4A6E]',
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="20" r="10" fill="white" fillOpacity="0.2"/>
          <path d="M18 56c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          <rect x="27" y="13" width="10" height="14" rx="5" fill="white" fillOpacity="0.35"/>
          <path d="M26 32h12M32 26v12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          <circle cx="32" cy="20" r="10" stroke="white" strokeWidth="2.5" strokeOpacity="0.5"/>
        </svg>
      ),
    },
    {
      slug: 'domiciliary',
      href: '/domiciliary-care',
      label: 'Domiciliary Care',
      description: 'Keeping dispersed home-care teams connected to approved procedures whether they are in the office, on the road, or supporting a client.',
      image: '/images/domiciliary-care.png',
      gradient: 'from-[#1A6B6B] to-[#0E5550]',
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="20" stroke="white" strokeWidth="2.5" strokeOpacity="0.4"/>
          <path d="M12 32h40M32 12v40" stroke="white" strokeWidth="1.5" strokeOpacity="0.25"/>
          <path d="M32 12c-6 8-9 14-9 20s3 12 9 20c6-8 9-14 9-20s-3-12-9-20z" fill="white" fillOpacity="0.15"/>
          <circle cx="32" cy="32" r="5" fill="white" fillOpacity="0.5"/>
          <circle cx="20" cy="26" r="3" fill="white" fillOpacity="0.35"/>
          <circle cx="44" cy="38" r="3" fill="white" fillOpacity="0.35"/>
        </svg>
      ),
    },
  ]

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="mb-12 text-center">
          <SectionLabel>Who We Serve</SectionLabel>
          <h2 className="text-3xl font-extrabold text-neutral-dark md:text-4xl">
            Built for every care setting
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {settings.map(({ slug, href, label, description, image, gradient, icon }) => (
            <a
              key={slug}
              href={href}
              className="group block"
            >
              {/* Image card */}
              <div className={`relative mb-5 overflow-hidden rounded-2xl aspect-[4/3] ${image ? '' : `bg-gradient-to-br ${gradient}`}`}>
                {image ? (
                  <img
                    src={image}
                    alt={label}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <>
                    <div className="dot-mesh absolute inset-0 opacity-40" />
                    <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
                    <div className="pointer-events-none absolute -bottom-10 -left-10 h-52 w-52 rounded-full bg-black/10" />
                    <div className="absolute inset-0 flex items-center justify-center">{icon}</div>
                  </>
                )}
                {/* Explore badge */}
                <div className="absolute right-4 top-4 rounded-full bg-amber-brand px-4 py-1.5 text-xs font-bold text-white shadow-amber-glow transition-transform duration-200 group-hover:scale-105">
                  Explore
                </div>
              </div>

              {/* Text */}
              <h3 className="mb-2 text-xl font-bold text-neutral-dark transition-colors group-hover:text-teal">
                {label}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-neutral-mid">{description}</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal transition-colors group-hover:text-teal-dark">
                Read more <ArrowRight size={14} />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Value Proposition ────────────────────────────────────────────────────────

function ValueProposition() {
  const points = [
    {
      title: 'Policies your whole team can actually use',
      body: 'From clinical procedures to safeguarding, your library is accessible in any language, at any hour, on any device — with no app to download and no training required.',
    },
    {
      title: 'Compliance evidence that builds itself',
      body: 'Every query is logged. Your CQC Readiness Report is compiled automatically from the audit trail — policy access, language activity, version history, staff engagement.',
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

          {/* Left — heading + feature list */}
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

          {/* Right — photo */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-elevated">
              <img
                src="/images/care-provider-hero.png"
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

// ─── The Solution ─────────────────────────────────────────────────────────────

function TheSolution() {
  const cols = [
    {
      Icon: Globe,
      iconBg: 'bg-teal-light',
      iconColor: 'text-teal',
      title: 'Ask in any language',
      body: 'Staff ask about your policies in any of 50+ languages via email or chat. Language is detected automatically — no setup, no menus, no extra cost.',
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
      body: 'Every query is logged. The CQC Readiness Report turns your audit trail into inspection evidence — showing equitable policy access across your multilingual team.',
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

// ─── Group Level ──────────────────────────────────────────────────────────────

function GroupLevel() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left — text */}
          <div>
            <SectionLabel>Group Providers</SectionLabel>
            <h2 className="mb-5 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl lg:text-5xl">
              Built for group-level care delivery
            </h2>
            <p className="text-lg leading-relaxed text-neutral-mid">
              Real-time policy visibility across every service, for multi-site providers.
              With a single policy library and centralised oversight, group leaders can
              standardise procedures, spot compliance gaps earlier, and drive consistent
              outcomes across every location — without adding headcount.
            </p>
          </div>

          {/* Right — image */}
          <div className="overflow-hidden rounded-2xl shadow-elevated">
            <img
              src="/images/group-care.png"
              alt="Care team delivering group-level care across a residential setting"
              className="w-full object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── Operate at Scale ─────────────────────────────────────────────────────────

function OperateAtScale() {
  const points = [
    'Clear total cost of ownership across your group',
    'Lower cost per service user as you grow',
    'One policy library, consistently applied across every site',
    'Multilingual access as standard — no extra configuration',
    'Group-level CQC Readiness Reports, generated automatically',
    'A partner that listens and scales with you',
  ]

  return (
    <section className="bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left — heading + list + CTA */}
          <div>
            <SectionLabel>Enterprise Ready</SectionLabel>
            <h2 className="mb-6 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl lg:text-5xl">
              Designed to operate at scale
            </h2>
            <p className="mb-8 text-lg leading-relaxed text-neutral-mid">
              Everything a group operator needs to run consistent, compliant care across
              multiple sites — without the complexity of enterprise software.
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

          {/* Right — image */}
          <div className="overflow-hidden rounded-2xl shadow-elevated">
            <img
              src="/images/operate-at-scale.png"
              alt="Care manager reviewing policy compliance on screen"
              className="w-full object-cover"
            />
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

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
      body: 'Your team sends questions via email or the web chat portal — in any language. CareStreamAI identifies the language automatically and retrieves the most relevant policy content.',
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
      body: 'Every query is logged. Your CQC Readiness Report builds automatically — policy access, language activity, staff engagement, version history.',
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

// ─── Trust ────────────────────────────────────────────────────────────────────

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

// ─── Home Knowledge Callout ───────────────────────────────────────────────────

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
          CareStreamAI extracts the specific facts from your documents — named individuals, schedules, exact
          local procedures — and makes them instantly answerable.
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
            <SectionLabel light>50+ Languages</SectionLabel>
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

// ─── Features Overview ────────────────────────────────────────────────────────

function FeaturesOverview() {
  const features = [
    { icon: '🌍', title: '50+ language support',        desc: 'Staff ask in any language. Answers come back in the same language — automatically.' },
    { icon: '💬', title: 'Email & chat interface',      desc: 'No app downloads or training. Access via web chat or plain email.' },
    { icon: '🏠', title: 'Your home, in detail',        desc: 'Knows your specific roles, schedules, and local procedures — not just generic policy text.', highlight: true },
    { icon: '📊', title: 'CQC Readiness Report',        desc: 'Inspection evidence generated automatically — access logs, language activity, staff engagement.' },
    { icon: '🔍', title: 'Policy gap detection',        desc: 'Identify which questions your policies aren\'t answering — before CQC does.' },
    { icon: '📚', title: 'Staff handbook self-service', desc: 'Turn your HR handbook into a 24/7 resource for leave, disciplinary, and employment questions.' },
    { icon: '🔒', title: 'Immutable audit trail',       desc: 'Every query logged, timestamped, and auditable. CQC-ready from day one.' },
  ]
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-content px-6">
        <SectionLabel>What You Get</SectionLabel>
        <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark md:text-5xl">
          Seven reasons care teams love it.
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
              <div className={`mb-4 text-2xl ${highlight ? 'opacity-90' : ''}`}>{icon}</div>
              <h3 className={`mb-2 font-bold ${highlight ? 'text-white' : 'text-neutral-dark'}`}>{title}</h3>
              <p className={`text-sm leading-relaxed ${highlight ? 'text-white/75' : 'text-neutral-mid'}`}>{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/features" className="inline-flex items-center gap-2 font-semibold text-teal hover:text-teal-dark">
            See all features <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Pricing Snapshot ─────────────────────────────────────────────────────────

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
              {['Policy library (up to 25 policies)', 'Email & chat access for all staff', '50+ language support', '500 queries/month', 'Full audit trail', 'Basic analytics'].map(f => (
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

// ─── Testimonials ─────────────────────────────────────────────────────────────

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
                [Testimonial — {placeholder}]
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

// ─── Final CTA ────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingNav />
      <main className="flex-1">
        <Hero />
        <StatsStrip />
        <TheProblem />
        <CareSettings />
        <ValueProposition />
        <TheSolution />
        <GroupLevel />
        <OperateAtScale />
        <HowItWorks />
        <TrustSection />
        <HomeKnowledgeCallout />
        <FeaturesOverview />
        <PricingSnapshot />
        <Testimonials />
        <FinalCta />
      </main>
      <MarketingFooter />
    </div>
  )
}
