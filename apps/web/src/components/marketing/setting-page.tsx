import Link from 'next/link'
import {
  CheckCircle2, Globe, ShieldCheck, GraduationCap, ClipboardCheck, HelpCircle,
  MessageSquare, BookOpen, FileText, ShieldAlert, Clock, Users, BarChart2,
  Mic, Send, Volume2, Stethoscope, Home, Heart, Building2, Pill, Lock,
  Phone, Brain, MapPin, RefreshCw, Calendar, Activity, type LucideIcon,
} from 'lucide-react'
import { PageCta, SectionLabel } from './ui'
import { HomeFaq } from './home-faq'
import { SiteImage } from '@/components/site-image'
import { SETTING_IMAGES } from '@/lib/settings/list'

// Icon registry — configs reference icons by key (pure data, no JSX in configs).
export const SETTING_ICONS: Record<string, LucideIcon> = {
  policies: FileText, hr: BookOpen, training: GraduationCap, audits: ClipboardCheck,
  cqc: ShieldCheck, staffq: HelpCircle, reportchat: MessageSquare, continuity: ShieldAlert,
  clock: Clock, users: Users, globe: Globe, shield: ShieldCheck, stethoscope: Stethoscope,
  graduation: GraduationCap, chart: BarChart2, home: Home, heart: Heart, building: Building2,
  pill: Pill, lock: Lock, phone: Phone, brain: Brain, mapPin: MapPin, refresh: RefreshCw,
  calendar: Calendar, activity: Activity, file: FileText, check: CheckCircle2,
}

export type IconKey = keyof typeof SETTING_ICONS

export interface SettingPageConfig {
  slug: string
  label: string          // e.g. "Nursing Homes"
  settingNoun: string    // singular, e.g. "nursing home"
  navDescription: string // one line for the index, footer and homepage
  iconKey: IconKey
  meta: { title: string; description: string; ogDescription: string }
  hero: { h1: string; subtitle: string }
  mockup: {
    orgName: string
    badge: string
    tabs: string[]
    question: string
    policyName: string
    answer: string
    citation: string
    followups: string[]
  }
  challenge: { h2: string; para1: string; para2: string; items: { iconKey: IconKey; title: string; body: string }[] }
  servicesH2: string
  serviceDescriptions: {
    policies: string; hr: string; training: string; audits: string
    cqc: string; staffq: string; reportchat: string; continuity: string
  }
  scenarios: { h2: string; sub: string; items: { tag: string; body: string }[] }
  deepDive: { label: string; h2: string; para1: string; para2: string; chips: string[]; panelH3: string; panelBody: string; points: string[] }
  outcomes: { h2: string; items: { iconKey: IconKey; title: string; body: string }[] }
  cqc: { h2: string; intro: string; cards: { iconKey: IconKey; title: string; body: string }[] }
  faqs: { question: string; answer: string }[]
  cta: { heading: string; sub: string }
}

const SERVICES: { key: keyof SettingPageConfig['serviceDescriptions']; title: string; href: string; iconKey: IconKey }[] = [
  { key: 'policies',   title: 'Care Policies',       href: '/care-policies',       iconKey: 'policies' },
  { key: 'hr',         title: 'HR Policies',         href: '/hr-policies',         iconKey: 'hr' },
  { key: 'training',   title: 'Staff Training',      href: '/staff-training',      iconKey: 'training' },
  { key: 'audits',     title: 'Care Audits',         href: '/care-audits',         iconKey: 'audits' },
  { key: 'cqc',        title: 'CQC & Compliance',    href: '/cqc-compliance',      iconKey: 'cqc' },
  { key: 'staffq',     title: 'CQC Staff Questions', href: '/cqc-staff-questions', iconKey: 'staffq' },
  { key: 'reportchat', title: 'CQC Report Chat',     href: '/cqc-report-chat',     iconKey: 'reportchat' },
  { key: 'continuity', title: 'Business Continuity', href: '/business-continuity', iconKey: 'continuity' },
]

function Icon({ k, ...props }: { k: IconKey; size?: number; className?: string }) {
  const C = SETTING_ICONS[k] ?? FileText
  return <C {...props} />
}

function HubMockup({ m }: { m: SettingPageConfig['mockup'] }) {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-white/20">
      <div className="flex items-center justify-between bg-teal px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-[10px] font-extrabold text-white">CS</div>
          <div>
            <p className="text-sm font-bold text-white">CareStream Hub</p>
            <p className="text-[10px] text-white/70">{m.orgName}</p>
          </div>
        </div>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white">{m.badge}</span>
      </div>
      <div className="flex gap-1.5 overflow-hidden border-b border-gray-100 bg-white px-3 py-2">
        {m.tabs.map((c, i) => (
          <span key={c} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${i === 0 ? 'bg-teal text-white' : 'bg-gray-100 text-neutral-mid'}`}>{c}</span>
        ))}
      </div>
      <div className="space-y-2.5 bg-gray-50 p-3.5">
        <div className="flex justify-end">
          <div className="max-w-[82%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
            <p className="text-xs leading-snug text-white">{m.question}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
          <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="mb-1.5 text-[11px] font-semibold text-teal">{m.policyName}</p>
            <p className="text-[11px] leading-relaxed text-neutral-dark">{m.answer}</p>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-teal/15 bg-teal/5 px-2 py-1">
              <FileText size={11} className="flex-shrink-0 text-teal" />
              <span className="text-[10px] font-medium text-teal">{m.citation}</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-mid"><Volume2 size={11} /> Listen</span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-mid"><Globe size={11} /> 60+ languages</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-8">
          {m.followups.map((s) => (
            <span key={s} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] text-neutral-mid">{s}</span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
        <div className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] text-gray-300">Ask a question…</div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal"><Mic size={13} /></div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white"><Send size={12} /></div>
      </div>
    </div>
  )
}

export function SettingPage({ config }: { config: SettingPageConfig }) {
  const c = config
  const image = SETTING_IMAGES[c.slug]
  return (
    <>
      {/* ── Split hero ───────────────────────────────────────────────────── */}
      {/* z-10 + no clip on the section so the floating mock-up can overflow into
          the white block below; decorations are clipped in their own layer. */}
      <section className="relative z-10 bg-hero-gradient">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 dot-mesh" />
          <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
          <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
          <div
            className="absolute bottom-0 left-0 right-0 h-16"
            style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
          />
        </div>
        <div className="relative mx-auto max-w-content px-6 pb-24 pt-20 md:pb-32 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel light>CareStream for {c.label}</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">{c.hero.h1}</h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">{c.hero.subtitle}</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/demo" className="btn-amber rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
                <Link href="/register" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
              </div>
            </div>
            <div className="relative">
              {image ? (
                <>
                  {/* Photo gets a generous fixed height on desktop so the floating
                      mock-up always tucks inside it rather than spilling above. */}
                  <div className="overflow-hidden rounded-2xl shadow-elevated ring-1 ring-white/10">
                    <SiteImage src={image} alt={`CareStream for ${c.label}`} className="aspect-[4/3] w-full object-cover lg:aspect-auto lg:h-[560px]" />
                  </div>
                  {/* Scaled down (not just narrowed) so the text doesn't re-wrap
                      taller, and dropped low so it clears most of the photo with
                      its tail spilling into the white block below. */}
                  <div className="mt-6 flex justify-center lg:absolute lg:-bottom-40 lg:-left-3 lg:mt-0 lg:w-[300px] lg:origin-bottom-left lg:scale-[0.78] lg:justify-start">
                    <HubMockup m={c.mockup} />
                  </div>
                </>
              ) : (
                <div className="flex justify-center lg:justify-end">
                  <HubMockup m={c.mockup} />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── The challenge ─────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Challenge in {c.label}</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">{c.challenge.h2}</h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>{c.challenge.para1}</p>
                <p>{c.challenge.para2}</p>
              </div>
            </div>
            <div className="grid gap-4">
              {c.challenge.items.map(({ iconKey, title, body }) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-light">
                    <Icon k={iconKey} size={18} className="text-teal" />
                  </div>
                  <div>
                    <p className="mb-0.5 font-semibold text-neutral-dark">{title}</p>
                    <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services applied ──────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Everything CareStream Does, For Your {c.label}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">{c.servicesH2}</h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            CareStream is far more than policy access. Every service runs on the same engine, grounded
            in your own documents, and all in one hub your team signs into once.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ key, title, href, iconKey }) => (
              <Link
                key={title}
                href={href}
                className="card-lift group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition-colors hover:border-teal/30"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon k={iconKey} size={20} className="text-teal" />
                </div>
                <h3 className="mb-2 font-bold text-neutral-dark">{title}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-mid">{c.serviceDescriptions[key]}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scenarios ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>In Practice</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">{c.scenarios.h2}</h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">{c.scenarios.sub}</p>
          <div className="grid gap-6 md:grid-cols-2">
            {c.scenarios.items.map(({ tag, body }) => (
              <div key={tag} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <span className="mb-3 inline-block rounded-full bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">{tag}</span>
                <p className="leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Deep dive ─────────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel>{c.deepDive.label}</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark">{c.deepDive.h2}</h2>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">{c.deepDive.para1}</p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">{c.deepDive.para2}</p>
              <div className="flex flex-wrap gap-2">
                {c.deepDive.chips.map((t) => (
                  <span key={t} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-dark">{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-teal-gradient p-8 shadow-teal-glow">
              <Globe size={28} className="mb-4 text-white" />
              <h3 className="mb-3 text-2xl font-extrabold leading-tight text-white">{c.deepDive.panelH3}</h3>
              <p className="mb-6 leading-relaxed text-white/85">{c.deepDive.panelBody}</p>
              <div className="space-y-2.5">
                {c.deepDive.points.map((p) => (
                  <div key={p} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-white" />
                    <span className="text-sm text-white/90">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What it does for you ──────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>What CareStream Does For You</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold leading-tight text-neutral-dark">{c.outcomes.h2}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {c.outcomes.items.map(({ iconKey, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                  <Icon k={iconKey} size={18} className="text-teal" />
                </div>
                <p className="mb-1.5 font-semibold text-neutral-dark">{title}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Getting started (generic) ─────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Getting Started</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Up and running in your {c.settingNoun}, usually the same day.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            There is no new hardware, no integration project, and no training day. You bring your own
            policies, and CareStream does the rest.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '01', title: 'Upload your policies', body: 'Add your policies, your staff handbook and any local procedures. CareStream reads and indexes them automatically within minutes, and keeps your version history.' },
              { step: '02', title: 'Invite your team', body: 'Staff get a one-tap sign-in link and install the hub on their phone like an app. No passwords to remember, no classroom session, and nothing for them to learn.' },
              { step: '03', title: 'Start asking', body: 'From day one, your team ask questions and get answers from your own documents, and your CQC evidence begins to build itself with every query.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                <h3 className="mb-2 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CQC ───────────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>CQC for {c.label}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">{c.cqc.h2}</h2>
          <div className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            <p>{c.cqc.intro}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {c.cqc.cards.map(({ iconKey, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon k={iconKey} size={20} className="text-teal" />
                </div>
                <h3 className="mb-2 font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeFaq faqs={c.faqs} />

      <PageCta
        heading={c.cta.heading}
        sub={c.cta.sub}
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
