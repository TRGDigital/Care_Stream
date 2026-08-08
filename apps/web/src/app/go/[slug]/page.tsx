import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldCheck, Globe, Award, CheckCircle2, Star, RefreshCw, Users, GraduationCap, ArrowRight } from 'lucide-react'
import { type TrainingDemoData } from '@/components/marketing/training-demo'
import { GoDemoWithQuiz } from '@/components/go/go-demo-with-quiz'
import { GoQuiz, type QuizQuestion } from '@/components/go/go-quiz'
import { GoExitIntent } from '@/components/go/go-exit-intent'
import { GoStickyCta } from '@/components/go/go-sticky-cta'
import { HomeFaq } from '@/components/marketing/home-faq'
import { SiteImage } from '@/components/site-image'
import { GoogleCloud, OpenAI, Claude, Supabase, Pinecone, GoogleAds, Aws } from '@/components/marketing/tech-logos'

// PPC landing pages for the training modules (ad traffic only). Deliberately
// noindex + no site nav — a single-goal conversion page. The public /staff-training
// pages remain the indexed, SEO versions of the same content.
export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Section = { heading: string; body: string; image_url: string | null }
type Module = {
  title: string
  group_label?: string
  frequency?: string | null
  summary?: string | null
  outcomes?: string[]
  sections?: Section[]
  standards?: string[]
  illustration_url?: string | null
}

async function getModule(slug: string): Promise<Module | null> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } })
    if (res.ok) return (await res.json())?.data?.module ?? null
  } catch { /* fall through */ }
  return null
}

async function getModuleDemo(slug: string): Promise<TrainingDemoData | null> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules/${encodeURIComponent(slug)}/demo`, { next: { revalidate: 300 } })
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
  const title = m ? `${m.title} Training for Your Care Team | CareStream` : 'Training | CareStream'
  const description = m
    ? `Get your team CQC-ready with CareStream ${m.title} training. One licence per staff member, completed in the hub in over 60 languages, with a certificate for your CQC evidence.`
    : 'CareStream training for UK care teams.'
  // Ad-only page — keep it out of the index so it doesn't compete with the SEO page.
  return { title, description, robots: { index: false, follow: false } }
}

// Repeated conversion CTA row: buy now (primary) + get pricing form (secondary).
function CtaRow({ buyHref, className = '', showSecondary = true }: { buyHref: string; className?: string; showSecondary?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <Link href={buyHref} className="rounded-btn bg-blue-600 px-8 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
        Buy now for your team
      </Link>
      {showSecondary && (
        <a href="#enquire" className="rounded-btn border-2 border-gray-200 px-8 py-4 text-center text-sm font-semibold text-neutral-dark transition-colors hover:border-teal hover:text-teal">
          Get team pricing
        </a>
      )}
    </div>
  )
}

export default async function GoLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const [m, demo, unitPence] = await Promise.all([getModule(slug), getModuleDemo(slug), getUnitPence()])
  if (!m) notFound()

  const buyHref = `/buy/${encodeURIComponent(slug)}`
  const unitPrice = (unitPence / 100).toFixed(2)
  const tLc = m.title.toLowerCase()

  const quizQuestions: QuizQuestion[] = [
    { q: `How does your team do ${tLc} training now?`, options: ['Online e-learning', 'In-person sessions', 'A mix of both', "We're not sure it's up to date"] },
    { q: 'How do you track who has completed it?', options: ['A training system', 'Spreadsheets', 'Paper records', 'We struggle to keep track'] },
    { q: `When did your team last refresh ${tLc} training?`, options: ['In the last 6 months', '6 to 12 months ago', 'Over a year ago', 'Not sure'] },
    { q: `How many staff need ${m.title} training?`, options: ['1–10', '11–25', '26–50', '50+'] },
  ]
  // Message-match: an ad group can override the headline via ?h= to mirror its ad.
  const hParam = Array.isArray(sp.h) ? sp.h[0] : sp.h
  const headline = (hParam ? hParam.slice(0, 90) : '') || `${m.title} training that gets your team CQC-ready`

  const bullets = [
    'CQC-aligned, mapped to the Care Certificate framework',
    'CPD approved — recognised professional development for your team',
    'Completed in the hub in over 60 languages',
    'A certificate for every staff member, for your CQC evidence',
  ]

  const stats = [
    { value: '60+', label: 'Languages your staff can learn in' },
    { value: '90+', label: 'CQC-aligned training modules' },
    { value: '100%', label: 'Mapped to the Care Certificate' },
    { value: '24/7', label: 'Access in the hub, any device' },
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

  const sections = (m.sections ?? []).filter((s) => s.body)

  // NB: placeholder testimonials — replace with real quotes (will be admin-editable).
  const testimonials = [
    { quote: `Rolling out ${m.title} training across the team took an afternoon instead of weeks, and every record was ready for our inspection.`, name: 'Registered Manager', home: 'Residential care home' },
    { quote: 'Staff can finally do their training in their own language, and I can see exactly who has completed what at a glance.', name: 'Deputy Manager', home: 'Nursing home' },
  ]

  const faqs = [
    { question: `Does ${m.title} training count for CQC?`, answer: `Yes. CareStream ${m.title} training is aligned to CQC expectations and the Care Certificate framework, and every completion produces a certificate you can use as evidence.` },
    { question: 'Can staff complete it on their phones, in their own language?', answer: 'Yes. The whole module runs in the hub on any device, in over 60 languages. Staff read and answer in the language they are most confident in, while your records stay in English.' },
    { question: 'Do I need a full CareStream subscription?', answer: `No. You can buy ${m.title} training licences for just your team — one licence per staff member — without a full subscription. It is a simple one-off cost per staff member.` },
    { question: 'How quickly can I roll it out?', answer: 'Straight away. Buy licences, invite your team, and they can start the module immediately. Renewal reminders are then handled automatically.' },
  ]

  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      {/* Slim header — no nav, one goal */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-1.5">
          {/* Larger logo, but the bar stays slim via reduced vertical padding */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="CareStream" className="h-14 w-auto md:h-[4.75rem]" />
        </div>
      </header>

      {/* Hero — copy left, interactive demo focal card right, care photo bled into the white */}
      <section className="relative overflow-hidden bg-white">
        {/* Real care photo bleeding into the white from the LEFT, so the demo card on
            the right sits on clean white (desktop only) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
          {/* Fixed, generous height + top-anchored: tall enough to always cover the
              full hero (down to the tech strip), yet fixed so it never re-crops when
              the demo card changes height — the hero just reveals more of the same image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/care-provider-hero.jpg" alt="" className="absolute inset-x-0 top-0 h-[72rem] w-full object-cover object-[40%_12%]" />
          {/* Fade the photo smoothly into the white (no hard edge); kept faint so the
              copy stays clearly readable, and clean white where the demo sits */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/55 via-white/90 to-white" />
        </div>
        <div className="relative mx-auto max-w-content px-6 py-16 md:py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-light px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
                  <ShieldCheck size={14} /> CQC-aligned · Care Certificate framework
                </span>
                {/* CPD badge — swap in the official CPD Certified logo once approval lands */}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-brand/40 bg-white px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-brand shadow-sm">
                  <span className="rounded bg-amber-brand px-1.5 py-0.5 text-[10px] font-extrabold leading-none text-white">CPD</span>
                  Approved
                </span>
              </div>
              <h1 className="mb-6 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-neutral-dark md:text-5xl lg:text-6xl">
                {headline}
              </h1>
              <ul className="mb-8 space-y-3">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-neutral-dark">
                    <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-teal" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
              <CtaRow buyHref={buyHref} showSecondary={false} />
              <p className="mt-3 text-sm text-neutral-mid">
                From <span className="font-bold text-neutral-dark">£{unitPrice}</span> per staff member, one-off. No subscription needed.
              </p>
              {/* Directional cue pointing across to the live demo (desktop) */}
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

              {/* Mobile: the demo is below the copy, so prompt visitors to scroll down to it */}
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
                  team&apos;s {tLc} training stays accurate, always up to date with the latest guidance, and is
                  delivered in over 60 languages.
                </p>
              </div>
            </div>

            {/* Interactive demo as the hero focal element (with its gap-check quiz overlay) */}
            {demo ? (
              <GoDemoWithQuiz demo={demo} buyHref={buyHref} slug={slug} moduleTitle={m.title} questions={quizQuestions} />
            ) : (
              <div className="rounded-2xl bg-white p-8 shadow-elevated">
                <p className="mb-5 text-sm font-bold uppercase tracking-wide text-teal">What your team gets</p>
                <ul className="space-y-4">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-teal" />
                      <span className="leading-relaxed text-neutral-dark">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Key numbers banner */}
      <section className="border-b border-gray-100 bg-neutral-dark">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-8 px-6 py-10 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-extrabold text-white md:text-4xl">{s.value}</div>
              <div className="mt-1 text-xs leading-snug text-white/60">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What your team will learn — section by section, with images */}
      {sections.length > 0 && (
        <section className="bg-neutral-light py-24">
          <div className="mx-auto max-w-content px-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">What Your Team Will Learn</p>
            <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
              A closer look at the {tLc} module.
            </h2>
            <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
              The module is built in short, practical sections. Each one teaches a part of the topic, then
              applies it to a real care scenario and checks understanding before moving on.
            </p>
            <div className="space-y-14 lg:space-y-20">
              {sections.map((s, i) => {
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
                        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-white ring-1 ring-gray-100">
                          <GraduationCap size={56} className="text-teal/30" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-14 flex flex-col items-center gap-5 rounded-2xl bg-hero-gradient p-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <p className="text-lg font-semibold text-white">Give your whole team the full {m.title} module.</p>
              <CtaRow buyHref={buyHref} className="flex-shrink-0 [&_a:last-child]:border-white/30 [&_a:last-child]:text-white" />
            </div>
          </div>
        </section>
      )}

      {/* Outcomes */}
      {m.outcomes && m.outcomes.length > 0 && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-content px-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">By the end, your team can</p>
            <h2 className="mb-10 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
              Confident, compliant {tLc}.
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {m.outcomes.slice(0, 6).map((o) => (
                <div key={o} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-neutral-light p-5">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="leading-relaxed text-neutral-dark">{o}</span>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href={buyHref} className="inline-flex items-center gap-2 rounded-btn bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
                Buy {m.title} training for your team
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Social proof */}
      <section className="bg-neutral-light py-20">
        <div className="mx-auto max-w-content px-6">
          <h2 className="mb-10 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
            Care providers trust CareStream.
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-3 flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} className="fill-amber-brand text-amber-brand" />)}</div>
                <blockquote className="mb-4 text-lg leading-relaxed text-neutral-dark">“{t.quote}”</blockquote>
                <figcaption className="text-sm text-neutral-mid">
                  <span className="font-bold text-neutral-dark">{t.name}</span> · {t.home}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href={buyHref} className="inline-flex items-center gap-2 rounded-btn bg-blue-600 px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
              Buy {m.title} training for your team
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <HomeFaq faqs={faqs} />

      {/* Secondary capture — gamified training gap check for visitors not ready to buy */}
      <section id="enquire" className="scroll-mt-8 bg-neutral-light py-20">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">Not ready to buy yet?</p>
              <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
                Get a free {m.title} training gap check.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Answer a few quick questions and we&apos;ll send a personalised plan for your team&apos;s {m.title}
                {' '}training, within one working day. Or buy licences for your team now.
              </p>
              <ul className="space-y-3">
                {[
                  { Icon: Users, text: 'Pricing for your exact team size' },
                  { Icon: RefreshCw, text: 'A simple rollout plan for your service' },
                  { Icon: Award, text: 'CQC-ready certificates and records' },
                ].map(({ Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-neutral-dark">
                    <Icon size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                    <span className="leading-relaxed">{text}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link href={buyHref} className="inline-flex items-center gap-2 rounded-btn bg-blue-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
                  Or buy now for your team
                </Link>
              </div>
            </div>
            <GoQuiz slug={slug} moduleTitle={m.title} questions={quizQuestions} />
          </div>
        </div>
      </section>

      {/* Bottom banner — route non-converters to the main CareStream site */}
      <section className="bg-hero-gradient py-14">
        <div className="mx-auto max-w-content px-6 text-center">
          <h2 className="mb-3 text-2xl font-extrabold text-white md:text-3xl">
            There&apos;s more to CareStream than {tLc} training.
          </h2>
          <p className="mx-auto mb-7 max-w-xl leading-relaxed text-white/80">
            Policies, staff training, audits and CQC tools for your whole service — one platform, in any language.
          </p>
          <a href="https://www.carestreamai.com" className="inline-flex items-center gap-2 rounded-btn bg-white px-8 py-4 text-sm font-semibold text-neutral-dark transition-colors hover:bg-neutral-light">
            Explore the full CareStream platform <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Minimal footer */}
      <footer className="border-t border-gray-100 bg-white py-8">
        <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-3 px-6 text-sm text-neutral-mid sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="CareStream" className="h-7 w-auto" />
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-teal">Privacy</Link>
            <Link href="/terms" className="hover:text-teal">Terms</Link>
            <span>© CareStream</span>
          </div>
        </div>
      </footer>

      <GoStickyCta buyHref={buyHref} />
      <GoExitIntent slug={slug} moduleTitle={m.title} questions={quizQuestions} />
    </div>
  )
}
