import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  GraduationCap, ShieldCheck, Globe, RefreshCw, CheckCircle2, Calendar,
  Users, MessageSquare, ArrowRight, Star,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { SiteImage } from '@/components/site-image'
import { HomeFaq } from '@/components/marketing/home-faq'
import { pageMetadata } from '@/lib/page-meta'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { relatedModules } from '@/lib/related-modules'
import { ModuleCard, type LibraryTopic } from '@/components/marketing/training-library-tabs'
import { CartButton } from '@/components/marketing/cart-button'
import { TrainingDemo, type TrainingDemoData } from '@/components/marketing/training-demo'
import { GoogleCloud, OpenAI, Claude, Supabase, Pinecone, GoogleAds, Aws } from '@/components/marketing/tech-logos'
import { TrainingHubPreview } from '@/components/marketing/training-hub-preview'
import { TrainingLanguageSection } from '@/components/marketing/training-language-section'
import { JsonLd } from '@/components/json-ld'
import { courseSchema } from '@/lib/schema'
import { COURSE_LANGUAGE_CODES } from '@/lib/languages'
import { WhyChooseCareStream } from '@/components/marketing/why-choose-carestream'
import { estimatedMinutes, formatDuration } from '@/lib/training-commerce'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type ModuleSection = { heading: string; body: string; image_url: string | null }
type ModuleDetail = {
  slug: string
  title: string
  group_key: string
  group_label: string
  care_setting: string | null
  built: boolean
  frequency: string
  requires_practical: boolean
  description: string | null
  summary: string | null
  outcomes: string[]
  key_points: string[]
  sections: ModuleSection[]
  standards: string[]
  illustration_url: string | null
}

// The generated module content is written for a care-home voice ("our home").
// CareStream serves every kind of CQC-regulated service, so present it as
// "care setting" on the public pages.
function careSetting(input?: string | null): string {
  if (!input) return ''
  return input
    .replace(/\bat our home\b/gi, 'at the care setting')
    .replace(/\bcare homes\b/gi, 'care settings')
    .replace(/\bcare home\b/gi, 'care setting')
    .replace(/\bnursing homes\b/gi, 'care settings')
    .replace(/\bnursing home\b/gi, 'care setting')
    .replace(/\bour home\b/gi, 'the care setting')
    .replace(/\bthe home\b/gi, 'the care setting')
    .replace(/\bthis home\b/gi, 'this care setting')
    .replace(/\byour home\b/gi, 'your care setting')
}

async function getModule(slug: string): Promise<ModuleDetail | null> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
    if (res.ok) return ((await res.json())?.data?.module ?? null) as ModuleDetail | null
  } catch {
    // fall through
  }
  return null
}

export async function generateStaticParams() {
  try {
    // no-store: always read the live list at build time. A cached (revalidate)
    // entry can pin an empty response from a window when the API was down,
    // which would prerender zero pages and 404 every slug.
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { cache: 'no-store' })
    if (res.ok) {
      const topics = (await res.json())?.data?.topics ?? []
      return (topics as Array<{ slug?: string }>).map((t) => ({ slug: t.slug })).filter((p) => p.slug)
    }
  } catch {
    // fall through
  }
  return []
}

function freqLabel(f: string): string {
  return f === 'annual' ? 'Annual' : f === 'biennial' ? 'Biennial' : f === 'triennial' ? 'Triennial'
    : f === 'once' ? 'One-off' : f === 'adhoc' ? 'Ad-hoc' : f
}
function freqWord(f: string): string {
  return f === 'annual' ? 'every year' : f === 'biennial' ? 'every two years' : f === 'triennial' ? 'every three years'
    : f === 'once' ? 'once, usually at induction' : 'regularly'
}

// Related modules as full, buyable catalogue cards. Keeps the rotating-window +
// same-group selection (so every module page still gets several dofollow internal
// links) but enriches each pick with its full catalogue data so we can render the
// same add-to-basket cards as the /staff-training library.
async function getRelatedTopics(currentSlug: string): Promise<LibraryTopic[]> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { next: { revalidate: 900 } })
    if (!res.ok) return []
    const topics = ((await res.json())?.data?.topics ?? []) as LibraryTopic[]
    const links = topics.map((t) => ({ slug: t.slug, title: t.title, group_key: t.group_key }))
    const bySlug = new Map(topics.map((t) => [t.slug, t]))
    return relatedModules(links, currentSlug, { sameGroup: 3, windowCount: 6 })
      .slice(0, 6)
      .map((r) => bySlug.get(r.slug))
      .filter((t): t is LibraryTopic => !!t)
  } catch {
    return []
  }
}

// Live one-lesson + one-question taster for this module (null if not yet built).
async function getModuleDemo(slug: string): Promise<TrainingDemoData | null> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules/${encodeURIComponent(slug)}/demo?v=2`, { next: { revalidate: 300 } })
    if (res.ok) return (await res.json())?.data?.demo ?? null
  } catch { /* fall through */ }
  return null
}

async function getUnitPence(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/public/training/licence-price`, { next: { revalidate: 300 } })
    if (res.ok) return Number((await res.json())?.data?.unit_pence) || 2599
  } catch { /* fall through */ }
  return 2599
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const m = await getModule(slug)
  if (!m) return { title: 'Staff Training | CareStreamAI' }
  // Module-derived fallback; overridden by the Pages tab (site_pages) when set.
  const title = `${m.title} Training for Care Staff | CareStreamAI`
  const description = careSetting(m.summary ?? m.description) || `${m.title} training for UK care staff: what it covers, who needs it, how often, and how CareStream delivers it in any language.`
  // Reuse the page's hero illustration as the social sharing image.
  const image = m.illustration_url ? `${API_URL}${m.illustration_url}` : undefined
  return pageMetadata(`/staff-training/${slug}`, { title, description, image })
}

export default async function TrainingModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const m = await getModule(slug)
  if (!m) notFound()
  const [related, demo, unitPence] = await Promise.all([getRelatedTopics(slug), getModuleDemo(slug), getUnitPence()])
  const unitPrice = (unitPence / 100).toFixed(2)

  const heroBullets = [
    'CQC-aligned, mapped to the Care Certificate framework',
    'Completed in the hub in over 60 languages',
    'A certificate for every staff member, for your CQC evidence',
    'A wrong answer triggers a follow-up lesson, so gaps are closed',
  ]
  const techLogos = [
    { name: 'Google Cloud', Icon: GoogleCloud },
    { name: 'OpenAI', Icon: OpenAI },
    { name: 'Claude', Icon: Claude },
    { name: 'Supabase', Icon: Supabase },
    { name: 'Pinecone', Icon: Pinecone },
    { name: 'Google Ads', Icon: GoogleAds },
    { name: 'AWS', Icon: Aws },
  ]

  const summary = careSetting(m.summary ?? m.description) || `What ${m.title.toLowerCase()} training covers, who needs it and how often, and how CareStream delivers it to your whole team in any language.`
  const outcomes = m.outcomes.map(careSetting)
  const keyPoints = m.key_points.map(careSetting)
  const sections = m.sections.map((s) => ({ heading: careSetting(s.heading), body: careSetting(s.body), image_url: s.image_url })).filter((s) => s.body)
  const hasSectionImages = sections.some((s) => s.image_url)

  // Modules not yet generated still get a full-shaped page (with image slots) using
  // sensible placeholders, so the framework is visible across every setting.
  const tLc = m.title.toLowerCase()
  const placeholderOutcomes = [
    `Explain what ${tLc} means and why it matters in your service`,
    `Apply ${tLc} correctly in everyday situations`,
    `Recognise the risks and know the right action to take`,
    `Understand your responsibilities and when to escalate a concern`,
  ]
  const placeholderSections: ModuleSection[] = [
    { heading: `Understanding ${tLc}`,        body: `An introduction to ${tLc}: the key principles and why they matter for the people you support.`, image_url: null },
    { heading: 'Your responsibilities',        body: 'What every member of the team must do, and the standards expected across your service.', image_url: null },
    { heading: 'Applying it in practice',      body: `Realistic scenarios that show ${tLc} in action, with the right course of action explained.`, image_url: null },
    { heading: 'Getting it right, and escalating', body: 'Common pitfalls, how to avoid them, and when and how to raise a concern.', image_url: null },
  ]
  const placeholderKeyPoints = [
    `${m.title} is part of the mandatory training expected in CQC-regulated services`,
    'It applies to every member of the team whose role requires it',
    `Refreshed ${freqWord(m.frequency)}, with renewal reminders handled automatically`,
    'Completed in the hub, in any language, with an assessment at the end',
  ]
  const outcomesToShow  = outcomes.length  ? outcomes  : placeholderOutcomes
  const sectionsToShow  = sections.length  ? sections  : placeholderSections
  const keyPointsToShow = keyPoints.length ? keyPoints : placeholderKeyPoints
  const showSectionImages = hasSectionImages || !m.built // image-slot layout for placeholders too

  const buyHref = `/buy/${encodeURIComponent(m.slug)}`

  const faqs = [
    { question: `Is ${m.title} training mandatory in care settings?`, answer: `${m.title} is part of the training that CQC-regulated care settings are expected to provide. CareStream includes it in the standard library so you can assign it to your whole team.` },
    { question: `How often should staff complete ${m.title} training?`, answer: `Most services refresh ${m.title} training ${freqWord(m.frequency)}. CareStream tracks each person's renewal date and sends automatic reminders at 90, 30 and 7 days.` },
    { question: `Can CareStream deliver ${m.title} training in other languages?`, answer: `Yes. Staff can complete it in over 60 languages, reading and answering in the language they are most confident in, while your records stay in English.` },
    { question: `Does the training include an assessment?`, answer: `Yes. Each module teaches the topic, applies it to a real care scenario, and finishes with an assessment. If a question is answered incorrectly, CareStream gives a short follow-up lesson and a fresh question to close the gap.` },
  ]

  // ── Course (schema.org) ─────────────────────────────────────────────────────
  // Detailed, self-contained course facts for the Course JSON-LD.
  const courseTeaches = Array.from(new Set([...outcomesToShow, ...keyPointsToShow].map((t) => t.trim()).filter(Boolean))).slice(0, 12)
  const courseDescription = [
    `${m.title} training for UK care staff, delivered by CareStream. ${summary}`,
    `The module is built as ${sectionsToShow.length} short, practical sections: each teaches part of the topic, applies it to a real care scenario, then checks understanding with an assessment before moving on. If a staff member answers incorrectly they receive a short follow-up lesson and a fresh question, so knowledge gaps are always closed before completion.`,
    `Staff complete it in the CareStream hub on any device, in over 60 languages, reading and answering in the language they are most confident in while your records stay in English. Every completion produces a dated certificate you can use as evidence for CQC inspections.`,
    `Most services refresh it ${freqWord(m.frequency)}, with renewal reminders handled automatically. Buy one licence per staff member, with no full subscription required.`,
  ].join(' ')
  const courseJson = courseSchema({
    name: `${m.title} Training`,
    description: courseDescription,
    path: `/staff-training/${m.slug}`,
    buyPath: buyHref,
    teaches: courseTeaches,
    languages: COURSE_LANGUAGE_CODES,
    pricePence: unitPence,
    workloadMinutes: Math.min(120, Math.max(30, sectionsToShow.length * 10)),
  })

  return (
    <>
      <JsonLd data={courseJson} />
      {/* ── Hero — care photo bled into the white, interactive demo focal card ── */}
      <section className="relative overflow-hidden bg-white">
        {/* Real care photo bleeding into the white (desktop); fixed height so it
            never re-crops when the demo card changes height */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/care-provider-hero.jpg" alt="" className="absolute inset-x-0 top-0 h-[72rem] w-full object-cover object-[40%_12%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/55 via-white/90 to-white" />
        </div>
        <div className="relative mx-auto max-w-content px-6 py-14 md:py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-mid">
                <Link href="/staff-training" className="hover:text-teal">Staff Training</Link>
                <span>/</span>
                <span className="text-neutral-dark">{m.group_label}</span>
              </div>
              <div className="mb-5 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-light px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
                  <ShieldCheck size={14} /> CQC-aligned · Care Certificate framework
                </span>
              </div>
              <h1 className="mb-6 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-neutral-dark md:text-5xl lg:text-6xl">
                {m.title} training that gets your team CQC-ready
              </h1>
              <ul className="mb-8 space-y-3">
                {heroBullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-neutral-dark">
                    <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-teal" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={buyHref} className="rounded-btn bg-blue-600 px-8 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
                  Buy now for your team
                </Link>
                <Link href="/demo" className="rounded-btn border-2 border-gray-200 px-8 py-4 text-center text-sm font-semibold text-neutral-dark transition-colors hover:border-teal hover:text-teal">
                  Book a demo
                </Link>
              </div>
              <p className="mt-3 text-sm text-neutral-mid">
                From <span className="font-bold text-neutral-dark">£{unitPrice}</span> per staff member, one-off. No subscription needed.
              </p>
              {/* Directional cue to the live demo (desktop) */}
              <div className="mt-5 hidden items-center gap-3 lg:flex">
                <span className="text-lg font-extrabold text-teal">Try it — a real lesson &amp; question</span>
                <svg width="88" height="30" viewBox="0 0 88 30" fill="none" className="flex-shrink-0 text-teal" aria-hidden>
                  <path d="M3 16 C 30 17, 56 19, 80 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path d="M70 4 L 83 11 L 69 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-neutral-mid">
                <span className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={15} className="fill-amber-brand text-amber-brand" />)}</span>
                Trusted by UK care providers
              </div>
              {/* Mobile: prompt to scroll to the demo below */}
              <div className="mt-5 flex items-center gap-2 lg:hidden">
                <span className="text-base font-extrabold text-teal">Try it — a real lesson &amp; question</span>
                <svg width="26" height="34" viewBox="0 0 26 34" fill="none" className="flex-shrink-0 text-teal" aria-hidden>
                  <path d="M13 2 C 13 16, 11 22, 13 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  <path d="M6 22 L 13 30 L 20 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {/* The technology behind it all */}
              <div className="mt-8 border-t border-gray-200/70 pt-6">
                <p className="text-xs font-bold uppercase tracking-widest text-neutral-mid">
                  Specialists in the technology behind it all
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {techLogos.map(({ name, Icon }) => (
                    <span key={name} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-dark shadow-sm">
                      <span className="h-3.5 w-3.5"><Icon /></span>
                      {name}
                    </span>
                  ))}
                </div>
                <p className="mt-3 max-w-xl text-xs leading-relaxed text-neutral-mid">
                  The same AI and technology behind the world&apos;s best products powers CareStream, so your
                  team&apos;s {m.title.toLowerCase()} training stays accurate, always up to date with the latest
                  guidance, and is delivered in{' '}
                  <Link href="/languages" className="font-semibold text-teal hover:text-teal-dark">over 60 languages</Link>.
                </p>
              </div>
            </div>

            {/* Interactive demo as the hero focal element (illustration fallback if not built) */}
            {demo ? (
              <TrainingDemo demo={demo} buyHref={buyHref} variant="card" />
            ) : (
              <div className="overflow-hidden rounded-2xl shadow-elevated ring-1 ring-gray-100">
                {m.illustration_url ? (
                  <SiteImage src={`${API_URL}${m.illustration_url}`} alt={`${m.title} training`} className="aspect-[16/10] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/10] w-full items-center justify-center bg-teal-gradient">
                    <GraduationCap size={72} className="text-white/80" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── What it covers ────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <SectionLabel>What This Training Covers</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            A clear, practical grounding in {m.title.toLowerCase()}.
          </h2>
          <p className="text-lg leading-relaxed text-neutral-mid">{summary}</p>
        </div>
      </section>

      {/* ── Outcomes ──────────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Learning Outcomes</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold leading-tight text-neutral-dark">
            By the end, your staff will be able to:
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {outcomesToShow.map((o) => (
              <div key={o} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                <span className="leading-relaxed text-neutral-dark">{o}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What your team will learn (section by section) ────────────────── */}
      <section className="bg-white py-24">
          <div className="mx-auto max-w-content px-6">
            <SectionLabel>What Your Team Will Learn</SectionLabel>
            <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
              A closer look at the {m.title.toLowerCase()} module.
            </h2>
            <p className="mb-14 text-lg leading-relaxed text-neutral-mid">
              The module is built in short, practical sections. Each one teaches a part of the topic,
              then applies it to a real care scenario and checks understanding before moving on.
            </p>
            {showSectionImages ? (
              <div className="space-y-14 lg:space-y-20">
                {sectionsToShow.map((s, i) => {
                  const flip = i % 2 === 1
                  return (
                    <div key={s.heading} className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
                      <div className={flip ? 'lg:order-2' : ''}>
                        <div className="mb-4 flex items-center gap-3">
                          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <h3 className="text-2xl font-bold text-neutral-dark">{s.heading}</h3>
                        </div>
                        <p className="text-lg leading-relaxed text-neutral-mid">{s.body}</p>
                      </div>
                      <div className={flip ? 'lg:order-1' : ''}>
                        {s.image_url ? (
                          <div className="overflow-hidden rounded-2xl shadow-elevated ring-1 ring-gray-100">
                            <SiteImage src={`${API_URL}${s.image_url}`} alt={`${m.title} training: ${s.heading}`} className="aspect-[4/3] w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-neutral-light ring-1 ring-gray-100">
                            <GraduationCap size={56} className="text-teal/30" />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="space-y-8">
                {sectionsToShow.map((s, i) => (
                  <div key={s.heading} className="flex gap-5">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div>
                      <h3 className="mb-1.5 text-lg font-bold text-neutral-dark">{s.heading}</h3>
                      <p className="max-w-2xl leading-relaxed text-neutral-mid">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      {/* ── Key points + who/how often + standards ────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionLabel>Key Points Covered</SectionLabel>
              <h2 className="mb-6 text-3xl font-extrabold leading-tight text-neutral-dark">The things your team must remember.</h2>
              <ul className="space-y-3">
                {keyPointsToShow.map((k) => (
                  <li key={k} className="flex items-start gap-3 text-lg leading-relaxed text-neutral-mid">
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-teal" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-3 flex items-center gap-2"><Calendar size={18} className="text-teal" /><p className="font-bold text-neutral-dark">Who and how often</p></div>
                <p className="text-sm leading-relaxed text-neutral-mid">
                  {m.title} is {m.frequency === 'once' ? 'completed' : 'refreshed'} {freqWord(m.frequency)}, for the staff in your care setting whose roles require it.{m.requires_practical ? ' It includes a practical sign-off.' : ''}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-3 flex items-center gap-2"><ShieldCheck size={18} className="text-teal" /><p className="font-bold text-neutral-dark">CQC and standards</p></div>
                <p className="text-sm leading-relaxed text-neutral-mid">
                  {m.standards.length > 0
                    ? `Supports your evidence against ${m.standards.slice(0, 3).join(', ')}${m.standards.length > 3 ? ' and more' : ''}.`
                    : 'Supports the training evidence CQC expects to see for a well-run, safe care setting.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How CareStream delivers it ────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>How CareStream Delivers It</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            Not a slideshow once a year. Training that sticks.
          </h2>
          <p className="mb-14 text-lg leading-relaxed text-white/80">
            CareStream delivers {m.title.toLowerCase()} training in the hub your team already uses, grounded in
            best practice and your own policies, so it fits your care setting and not a generic template.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: GraduationCap, title: 'Teach, then assess', body: 'Short teaching sections and a real care scenario, then an assessment that checks understanding.' },
              { Icon: Globe,         title: 'In any language', body: 'Staff complete it in over 60 languages, while your records stay in English.' },
              { Icon: RefreshCw,     title: 'Learn and retry', body: 'A wrong answer triggers a short follow-up lesson and a fresh question, so the gap is closed.' },
              { Icon: Calendar,      title: 'Renewals handled', body: 'Automatic reminders at 90, 30 and 7 days, with a live compliance dashboard.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><Icon size={18} className="text-white" /></div>
                <h3 className="mb-2 font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/75">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/staff-training" className="inline-flex items-center gap-2 font-semibold text-white hover:underline">
              See how training works <ArrowRight size={16} />
            </Link>
            <Link href="/care-policies" className="inline-flex items-center gap-2 font-semibold text-white/80 hover:underline">
              <MessageSquare size={16} /> Built from your own policies
            </Link>
          </div>
        </div>
      </section>

      {/* How your team gets trained — hub delivery preview */}
      <TrainingHubPreview moduleTitle={m.title} illustrationUrl={m.illustration_url ? `${API_URL}${m.illustration_url}` : undefined} />

      {/* In every language — the language-toggle USP */}
      <TrainingLanguageSection moduleTitle={m.title} illustrationUrl={m.illustration_url ? `${API_URL}${m.illustration_url}` : undefined} lessonSnippet={summary} />

      {/* Why choose CareStream */}
      <WhyChooseCareStream className="bg-neutral-light" durationLabel={formatDuration(estimatedMinutes(m.group_key))} />

      <HomeFaq faqs={faqs} />

      {/* Related modules — buyable cards so visitors can add more courses to their basket. */}
      {related.length > 0 && (
        <section className="bg-neutral-light py-16">
          <div className="mx-auto max-w-content px-6">
            <h2 className="mb-2 text-2xl font-extrabold text-neutral-dark md:text-3xl">Related training modules</h2>
            <p className="mb-8 max-w-2xl text-neutral-mid">More mandatory and role-specific training CareStream delivers to your team, in the hub, in any language. Add any of these to your basket.</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <ModuleCard key={r.slug} t={r} />)}
            </div>
          </div>
        </section>
      )}

      <CartButton />

      {/* CMS-editable content + FAQs (platform Blog → Training pages). */}
      <EditableContentBlock path={`/staff-training/${slug}`} />

      <PageCta
        heading={`Give your team ${m.title.toLowerCase()} training that actually sticks.`}
        sub="See how CareStream delivers your mandatory training in the hub, in any language."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See all training', href: '/staff-training' }}
      />
    </>
  )
}
