import React from 'react'
import Link from 'next/link'
import {
  Check, Home, Heart, Car, Users, Building2, Sunrise, Brain,
  Star, RefreshCw, Moon, ClipboardList, Camera,
  GraduationCap, Globe, Award, BarChart3, ArrowRight,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { SiteImage } from '@/components/site-image'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { WHO_ITS_FOR_SLOTS } from '@/lib/page-slots/who-its-for'
import { TrainingDemo, type TrainingDemoData } from '@/components/marketing/training-demo'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/who-its-for' },
  title: "Who It's For",
  description: 'CareStreamAI is built for every care setting — residential, nursing, domiciliary, supported living, hospice, and more. See how it fits your specific service.',
  openGraph: {
    type: 'website',
    title: "Who CareStreamAI Is For",
    description: 'Built for residential, nursing, domiciliary, supported living, hospice, and every regulated UK care setting.',
    url: 'https://www.carestreamai.com/who-its-for',
  },
}

// ─── Image component ──────────────────────────────────────────────────────────
// Images live in /public/images/who-its-for/{slug}.png (or .jpg).
// Slugs without a real image fall back to a styled placeholder.

const REAL_IMAGES: Record<string, string> = {
  'residential-care-homes': '/images/who-its-for/residential-care-homes.jpg',
  'nursing-homes':          '/images/who-its-for/nursing-homes.jpg',
  'home-care':              '/images/who-its-for/home-care.jpg',
  'extra-care':             '/images/who-its-for/extra-care.jpg',
  'hospices':               '/images/who-its-for/hospices.jpg',
  'day-services':           '/images/who-its-for/day-services.jpg',
  'mental-health':          '/images/who-its-for/mental-health.jpg',
  'learning-disability':    '/images/who-its-for/learning-disability.jpg',
  'reablement':             '/images/who-its-for/reablement.jpg',
  'community-care':         '/images/who-its-for/community-care.jpg',
  'supported-living':       '/images/who-its-for/supported-living.jpg',
}

function SettingImage({ slug, alt }: { slug: string; alt: string }) {
  const src = REAL_IMAGES[slug]

  if (src) {
    return (
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-elevated">
        <SiteImage
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-teal/15 bg-gradient-to-br from-teal-light via-white to-teal/5 shadow-elevated flex flex-col items-center justify-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-teal/25">
        <Camera size={22} className="text-teal/35" />
      </div>
      <p className="text-xs font-medium text-neutral-mid/70">{alt}</p>
      <p className="font-mono text-[10px] text-neutral-mid/40">images/who-its-for/{slug}.png</p>
    </div>
  )
}

// ─── How it works card ────────────────────────────────────────────────────────

interface HowItWorksData {
  channel:      string
  question:     string
  sources:      Array<{ type: 'policy' | 'regulation'; label: string }>
  answerPoints: string[]
}

function HowItWorksCard({ data }: { data: HowItWorksData }) {
  return (
    <div>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal">How it works, example</p>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-mid">
            Staff asks via {data.channel}
          </p>
        </div>
        <div className="divide-y divide-gray-100">
          {/* Question */}
          <div className="px-6 py-5">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Question</p>
            <p className="text-base font-medium text-neutral-dark">&ldquo;{data.question}&rdquo;</p>
          </div>
          {/* Sources */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Drawn from</p>
            <div className="space-y-2">
              {data.sources.map(s => (
                <div
                  key={s.label}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 ${
                    s.type === 'policy' ? 'bg-teal-light' : 'bg-amber-50'
                  }`}
                >
                  <div className={`h-2 w-2 shrink-0 rounded-full ${s.type === 'policy' ? 'bg-teal' : 'bg-amber-brand'}`} />
                  <span className={`text-xs font-semibold ${s.type === 'policy' ? 'text-teal' : 'text-amber-brand'}`}>
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Answer points */}
          <div className="px-6 py-5">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Answer includes</p>
            <ul className="space-y-1.5 text-sm leading-relaxed text-neutral-mid">
              {data.answerPoints.map(p => (
                <li key={p} className="flex items-start gap-2">
                  <Check size={13} className="mt-0.5 shrink-0 text-teal" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Policy topics + regulatory standards ────────────────────────────────────

function PolicyTopics({ topics }: { topics: string[] }) {
  return (
    <div className="mt-8">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Common policy queries</p>
      <div className="flex flex-wrap gap-2">
        {topics.map(t => (
          <span key={t} className="rounded-full bg-teal-light px-3 py-1.5 text-xs font-semibold text-teal">{t}</span>
        ))}
      </div>
    </div>
  )
}

function RegulatoryStandards({ standards }: { standards: Array<{ label: string; note: string }> }) {
  return (
    <div className="mt-6">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Key regulatory standards</p>
      <div className="space-y-2">
        {standards.map(s => (
          <div key={s.label} className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
            <p className="mb-0.5 text-xs font-semibold text-amber-brand">{s.label}</p>
            <p className="text-xs leading-relaxed text-neutral-mid">{s.note}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Care settings ────────────────────────────────────────────────────────────

// Structural config only. All copy is pulled from slots keyed by `slug` (see
// src/lib/page-slots/who-its-for.ts) so the design is fixed but copy is editable.
const SETTINGS: Array<{
  Icon:        React.ElementType
  slug:        string
  points:      number
  topics:      number
  standards:   number
  sourceTypes: Array<'policy' | 'regulation'>
  answers:     number
}> = [
  { Icon: Home,          slug: 'residential-care-homes', points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'regulation', 'regulation'], answers: 4 },
  { Icon: Heart,         slug: 'nursing-homes',          points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'regulation', 'regulation'], answers: 4 },
  { Icon: Car,           slug: 'home-care',              points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
  { Icon: Users,         slug: 'supported-living',       points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
  { Icon: Building2,     slug: 'extra-care',             points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
  { Icon: Moon,          slug: 'hospices',               points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
  { Icon: Sunrise,       slug: 'day-services',           points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
  { Icon: Brain,         slug: 'mental-health',          points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
  { Icon: Star,          slug: 'learning-disability',    points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
  { Icon: RefreshCw,     slug: 'reablement',             points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
  { Icon: ClipboardList, slug: 'community-care',         points: 4, topics: 6, standards: 3, sourceTypes: ['policy', 'policy', 'regulation'],     answers: 4 },
]

// ─── Personas (by role) ───────────────────────────────────────────────────────

// Structural config only. Copy is pulled from slots keyed by `key`.
const PERSONAS: Array<{ key: string; benefits: number }> = [
  { key: 'persona.1', benefits: 4 },
  { key: 'persona.2', benefits: 4 },
  { key: 'persona.3', benefits: 4 },
  { key: 'persona.4', benefits: 4 },
]

// ─── Care Settings Mockup ─────────────────────────────────────────────────────

function CareSettingsMockup() {
  return (
    <div className="w-full max-w-[380px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Who uses CareStreamAI</p>
        <p className="text-sm font-bold text-white">Across 11 care setting types</p>
      </div>
      <div className="grid grid-cols-3 gap-px bg-gray-100">
        {[
          { Icon: Home,    name: 'Residential Care',   active: true },
          { Icon: Heart,   name: 'Nursing Homes',      active: true },
          { Icon: Car,     name: 'Home Care',          active: true },
          { Icon: Brain,   name: 'Mental Health',      active: false },
          { Icon: Star,    name: 'Learning Disability', active: false },
          { Icon: Sunrise, name: 'Day Services',       active: false },
        ].map(({ Icon, name, active }) => (
          <div key={name} className={`flex flex-col items-center gap-1.5 p-4 text-center ${active ? 'bg-teal/5' : 'bg-white'}`}>
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-teal' : 'bg-gray-100'}`}>
              <Icon size={15} className={active ? 'text-white' : 'text-neutral-mid'} />
            </div>
            <p className={`text-[10px] font-semibold leading-tight ${active ? 'text-teal' : 'text-neutral-mid'}`}>{name}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        {[
          { value: '11',  label: 'Setting types' },
          { value: '4',   label: 'Role types' },
          { value: '50+', label: 'Languages' },
        ].map(({ value, label }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-sm font-extrabold text-teal">{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 px-5 py-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Built for every role</p>
        <div className="flex flex-wrap gap-1.5">
          {['Registered Manager', 'HR Director', 'Operations Director', 'Finance Director'].map(role => (
            <span key={role} className="rounded-full bg-teal-light px-2.5 py-1 text-[10px] font-semibold text-teal">{role}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Training managers: live module library showcase ─────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type TrainingCatalogue = {
  groups: Record<string, string>
  topics: Array<{ title: string; group_key: string }>
}

async function getTrainingCatalogue(): Promise<TrainingCatalogue> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { next: { revalidate: 300 } })
    if (res.ok) {
      const d = (await res.json())?.data
      if (Array.isArray(d?.topics)) return { groups: d.groups ?? {}, topics: d.topics }
    }
  } catch {
    // fall through to a sensible static showcase
  }
  return { groups: {}, topics: [] }
}

// The module we surface as the live, interactive taster in the Training Managers
// section — a universally relevant one that every care setting must train on.
const FEATURED_DEMO_SLUG = 'safeguarding-adults-and-children'

async function getModuleDemo(slug: string): Promise<TrainingDemoData | null> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules/${encodeURIComponent(slug)}/demo?v=2`, { next: { revalidate: 300 } })
    if (res.ok) return (await res.json())?.data?.demo ?? null
  } catch {
    // fall through — the section renders without the demo card
  }
  return null
}

const FALLBACK_MODULES = [
  'Safeguarding Adults and Children', 'Moving and Handling of People', 'Fire Safety',
  'First Aid / Basic Life Support', 'Infection Prevention and Control', 'Medication Management',
  'Mental Capacity Act and DoLS', 'Health and Safety', 'Food Hygiene', 'Dementia Awareness',
  'Equality, Diversity and Inclusion', 'Data Protection and GDPR',
]

const FALLBACK_CATEGORIES = [
  'Core mandatory', 'Health & safety / statutory', 'Care & clinical',
  'Conduct & governance', 'Data & technology', 'Role- or resident-specific',
]

const TM_BENEFITS: Array<{ Icon: React.ElementType; title: string; body: string }> = [
  { Icon: GraduationCap, title: 'Ready to assign', body: 'Roll out CQC-aligned annual training in a click, or generate new modules from your own policies.' },
  { Icon: BarChart3,     title: 'Compliance at a glance', body: 'Track completion across your whole team on one dashboard, with automatic renewal reminders.' },
  { Icon: Globe,         title: 'In 50+ languages', body: 'Staff learn in the language they think in, so training lands with every member of your team.' },
  { Icon: Award,         title: 'Evidence, gathered for you', body: 'Every module ends with a knowledge check and a certificate — your CQC evidence, captured automatically.' },
]

function TrainingManagersSection({ catalogue, demo }: { catalogue: TrainingCatalogue; demo: TrainingDemoData | null }) {
  const { groups, topics } = catalogue
  const moduleCount = topics.length || 98
  const categoryEntries = Object.keys(groups).length
    ? Object.entries(groups).map(([key, label]) => ({
        label,
        count: topics.filter(t => t.group_key === key).length,
      }))
    : FALLBACK_CATEGORIES.map(label => ({ label, count: 0 }))
  const categoryCount = categoryEntries.length
  const sampleModules = (topics.length ? topics.map(t => t.title).filter(Boolean) : FALLBACK_MODULES).slice(0, 12)

  return (
    <section id="training-managers" className="scroll-mt-28 bg-neutral-light py-24">
      <div className="mx-auto max-w-content px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-start">
          {/* Sticky intro */}
          <div className="lg:sticky lg:top-28">
            <div className="mb-5 inline-flex items-center gap-2 rounded-pill bg-teal px-5 py-2">
              <GraduationCap size={15} className="text-white" />
              <span className="text-sm font-bold text-white">Training Managers</span>
            </div>
            <h2 className="text-2xl font-extrabold leading-snug text-neutral-dark md:text-3xl">
              Assign, track and prove training — from one library, in every language
            </h2>
            <p className="mt-4 leading-relaxed text-neutral-mid">
              Move beyond the annual tick-box. Roll out ready-built modules or generate new ones
              from your own policies, then watch completion and compliance across your whole team
              on a single dashboard.
            </p>
            <Link href="/staff-training" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:underline">
              Explore staff training <ArrowRight size={15} />
            </Link>
          </div>

          {/* Live interactive taster + benefits + module library */}
          <div className="space-y-8">
            {demo && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal">
                  Try a lesson — the exact experience your team gets
                </p>
                <TrainingDemo demo={demo} buyHref={`/buy/${FEATURED_DEMO_SLUG}`} variant="card" />
                <p className="mt-3 text-sm leading-relaxed text-neutral-mid">
                  Read the lesson, answer the question, then tap the language button to flip the whole
                  step into another language — the same flow, in over 50 languages, that your staff use in the hub.
                </p>
              </div>
            )}

            <ul className="grid gap-5 sm:grid-cols-2">
              {TM_BENEFITS.map(({ Icon, title, body }) => (
                <li key={title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-teal-light">
                    <Icon size={17} className="text-teal" />
                  </span>
                  <p className="mb-1 font-bold text-neutral-dark">{title}</p>
                  <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
                </li>
              ))}
            </ul>

            {/* The training library */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
              <div className="flex items-center justify-between bg-teal px-6 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">The training library</p>
                  <p className="text-sm font-bold text-white">{moduleCount} ready-built modules</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold leading-none text-white">{categoryCount}</p>
                  <p className="text-[10px] text-white/60">categories</p>
                </div>
              </div>

              <div className="border-b border-gray-100 px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {categoryEntries.map(({ label, count }) => (
                    <span key={label} className="rounded-full bg-teal-light px-3 py-1.5 text-xs font-semibold text-teal">
                      {label}{count ? ` · ${count}` : ''}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-px bg-gray-100 sm:grid-cols-2">
                {sampleModules.map(name => (
                  <div key={name} className="flex items-center gap-2.5 bg-white px-6 py-3">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                    <span className="text-sm leading-tight text-neutral-dark">{name}</span>
                  </div>
                ))}
              </div>

              <div className="px-6 py-3 text-center">
                <Link href="/staff-training" className="text-xs font-semibold text-teal hover:underline">
                  See the full training library →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function WhoItsForPage() {
  const s = makeSlot(WHO_ITS_FOR_SLOTS, await getContentSlots('/who-its-for'))
  const [trainingCatalogue, trainingDemo] = await Promise.all([
    getTrainingCatalogue(),
    getModuleDemo(FEATURED_DEMO_SLUG),
  ])
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
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">
                  Start Free Trial
                </Link>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">
                  Book a Demo
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CareSettingsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Care settings, alternating image and text */}
      {SETTINGS.map(({ Icon, slug, points, topics, standards, sourceTypes, answers }, i) => {
        const name = s(`${slug}.name`)
        const settingPoints = Array.from({ length: points }, (_, n) => s(`${slug}.point.${n + 1}`))
        const policyTopics  = Array.from({ length: topics }, (_, n) => s(`${slug}.topic.${n + 1}`))
        const regulatoryStandards = Array.from({ length: standards }, (_, n) => ({
          label: s(`${slug}.std.${n + 1}.label`),
          note:  s(`${slug}.std.${n + 1}.note`),
        }))
        const howItWorks: HowItWorksData = {
          channel:  s(`${slug}.channel`),
          question: s(`${slug}.question`),
          sources:  sourceTypes.map((type, n) => ({ type, label: s(`${slug}.src.${n + 1}`) })),
          answerPoints: Array.from({ length: answers }, (_, n) => s(`${slug}.ans.${n + 1}`)),
        }
        return (
        <section key={slug} className={`py-20 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-light'}`}>
          <div className="mx-auto max-w-content px-6">
            <div className={`grid items-start gap-12 lg:grid-cols-2 ${i % 2 !== 0 ? 'lg:[&>div:first-child]:order-last' : ''}`}>

              {/* Text */}
              <div>
                <div className="mb-5 inline-flex items-center gap-2.5 rounded-pill bg-teal-light px-4 py-2">
                  <Icon size={15} className="text-teal" />
                  <span className="text-sm font-bold text-teal">{name}</span>
                </div>
                <h2 className="mb-4 text-2xl font-extrabold leading-snug text-neutral-dark md:text-3xl">
                  {s(`${slug}.headline`)}
                </h2>
                <div className={`mb-7 leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s(`${slug}.desc`) }} />
                <ul className="space-y-4">
                  {settingPoints.map((p, n) => (
                    <li key={n} className="flex items-start gap-3.5">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-light">
                        <Check size={11} className="text-teal" />
                      </span>
                      <p className="leading-relaxed text-neutral-mid">{p}</p>
                    </li>
                  ))}
                </ul>
                <PolicyTopics topics={policyTopics} />
                <RegulatoryStandards standards={regulatoryStandards} />
              </div>

              {/* Image + optional how it works card */}
              <div className="flex flex-col gap-6">
                <SettingImage slug={slug} alt={name} />
                <HowItWorksCard data={howItWorks} />
              </div>

            </div>
          </div>
        </section>
        )
      })}

      {/* Disclaimer */}
      <section className="bg-white py-10 border-t border-gray-100">
        <div className="mx-auto max-w-content px-6">
          <div className="rounded-2xl border border-gray-200 bg-neutral-light px-8 py-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-mid">{s('disclaimer.label')}</p>
            <div className={`leading-relaxed text-neutral-mid text-sm ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('disclaimer.p1') }} />
            <div className={`mt-3 leading-relaxed text-neutral-mid text-sm ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('disclaimer.p2') }} />
          </div>
        </div>
      </section>

      {/* Cross-cutting benefits strip */}
      <section className="bg-neutral-dark py-16">
        <div className="mx-auto max-w-content px-6">
          <p className="mb-8 text-center text-sm font-semibold uppercase tracking-widest text-teal">
            {s('strip.label')}
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="rounded-xl bg-white/5 p-5">
                <p className="mb-2 font-bold text-white">{s(`strip.${n}.heading`)}</p>
                <p className="text-sm leading-relaxed text-white/70">{s(`strip.${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles section */}
      <div>
        {PERSONAS.map(({ key, benefits }, i) => (
          <section key={key} className={`py-24 ${i % 2 === 0 ? 'bg-neutral-light' : 'bg-white'}`}>
            <div className="mx-auto max-w-content px-6">
              <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:items-start">
                <div className="lg:sticky lg:top-28">
                  <div className="mb-5 inline-flex items-center rounded-pill bg-teal px-5 py-2">
                    <span className="text-sm font-bold text-white">{s(`${key}.badge`)}</span>
                  </div>
                  <h2 className="text-2xl font-extrabold leading-snug text-neutral-dark md:text-3xl">
                    {s(`${key}.headline`)}
                  </h2>
                </div>
                <ul className="space-y-5">
                  {Array.from({ length: benefits }, (_, n) => s(`${key}.benefit.${n + 1}`)).map((b, n) => (
                    <li key={n} className="flex items-start gap-4">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-light">
                        <Check size={13} className="text-teal" />
                      </span>
                      <p className="leading-relaxed text-neutral-mid">{b}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Training managers — live demo + showcase of the ready-built training library */}
      <TrainingManagersSection catalogue={trainingCatalogue} demo={trainingDemo} />

      <EditableContentBlock path="/who-its-for" />

      <PageCta
        heading="Whatever your care setting, CareStreamAI works for you."
        primary={{ href: '/demo', label: 'Book a Free Demo' }}
        secondary={{ href: '/register', label: 'Start Free Trial' }}
      />
    </>
  )
}
