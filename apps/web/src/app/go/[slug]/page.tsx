import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ShieldCheck, Globe, Award, CheckCircle2, Star, RefreshCw, Users } from 'lucide-react'
import { TrainingDemo, type TrainingDemoData } from '@/components/marketing/training-demo'
import { GoLeadForm } from '@/components/go/go-lead-form'
import { GoStickyCta } from '@/components/go/go-sticky-cta'
import { HomeFaq } from '@/components/marketing/home-faq'

// PPC landing pages for the training modules (ad traffic only). Deliberately
// noindex + no site nav — a single-goal conversion page. The public /staff-training
// pages remain the indexed, SEO versions of the same content.
export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Module = {
  title: string
  group_label?: string
  frequency?: string | null
  summary?: string | null
  outcomes?: string[]
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

export default async function GoLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const sp = await searchParams
  const [m, demo] = await Promise.all([getModule(slug), getModuleDemo(slug)])
  if (!m) notFound()

  const buyHref = `/buy/${encodeURIComponent(slug)}`
  // Message-match: an ad group can override the headline via ?h= to mirror its ad.
  const hParam = Array.isArray(sp.h) ? sp.h[0] : sp.h
  const headline = (hParam ? hParam.slice(0, 90) : '') || `${m.title} training that gets your team CQC-ready`

  const trust = [
    { Icon: ShieldCheck, text: 'CQC-aligned, mapped to the Care Certificate framework' },
    { Icon: Globe, text: 'Completed in the hub in over 60 languages' },
    { Icon: Award, text: 'A certificate for every staff member, for your CQC evidence' },
    { Icon: RefreshCw, text: 'A wrong answer triggers a follow-up lesson, so gaps are closed' },
  ]

  // NB: placeholder testimonials — replace with real quotes (will be admin-editable).
  const testimonials = [
    { quote: `Rolling out ${m.title} training across the team took an afternoon instead of weeks, and every record was ready for our inspection.`, name: 'Registered Manager', home: 'Residential care home' },
    { quote: 'Staff can finally do their training in their own language, and I can see exactly who has completed what at a glance.', name: 'Deputy Manager', home: 'Nursing home' },
  ]

  const faqs = [
    { question: `Does ${m.title} training count for CQC?`, answer: `Yes. CareStream ${m.title} training is aligned to CQC expectations and the Care Certificate framework, and every completion produces a certificate you can use as evidence.` },
    { question: 'Can staff complete it on their phones, in their own language?', answer: 'Yes. The whole module runs in the hub on any device, in over 60 languages. Staff read and answer in the language they are most confident in, while your records stay in English.' },
    { question: 'Do I need a full CareStream subscription?', answer: `No. You can buy ${m.title} training licences for just your team — one licence per staff member — without a full subscription. You can also start a free trial to see everything first.` },
    { question: 'How quickly can I roll it out?', answer: 'Straight away. Buy licences, invite your team, and they can start the module immediately. Renewal reminders are then handled automatically.' },
  ]

  return (
    <div className="min-h-screen bg-white pb-20 lg:pb-0">
      {/* Slim header — no nav, one goal */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="CareStream" className="h-8 w-auto" />
          <a href="#enquire" className="rounded-btn border-2 border-gray-200 px-5 py-2.5 text-sm font-semibold text-neutral-dark transition-colors hover:border-teal hover:text-teal">
            Get team pricing
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="relative mx-auto max-w-content px-6 py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                <ShieldCheck size={14} /> CQC-aligned · Care Certificate framework
              </div>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                {headline}
              </h1>
              <p className="mb-8 max-w-lg text-lg leading-relaxed text-white/80">
                Give your whole team the {m.title} module — one licence per staff member, completed in the
                hub in over 60 languages, with a certificate for your CQC evidence. No full subscription needed.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={buyHref} className="rounded-btn bg-blue-600 px-8 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
                  Buy now for your team
                </Link>
                <a href="#enquire" className="btn-ghost-white rounded-btn border-2 border-white/30 px-8 py-4 text-center text-sm font-semibold text-white">
                  Get team pricing
                </a>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
                <span className="flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={15} className="fill-amber-brand text-amber-brand" />)}</span>
                Trusted by UK care providers
              </div>
            </div>

            {/* Trust card */}
            <div className="rounded-2xl bg-white p-8 shadow-elevated">
              <p className="mb-5 text-sm font-bold uppercase tracking-wide text-teal">What your team gets</p>
              <ul className="space-y-4">
                {trust.map(({ Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <Icon size={20} className="mt-0.5 flex-shrink-0 text-teal" />
                    <span className="leading-relaxed text-neutral-dark">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Live interactive demo — the engagement hook */}
      {demo && <TrainingDemo demo={demo} buyHref={buyHref} />}

      {/* What they will be able to do */}
      {m.outcomes && m.outcomes.length > 0 && (
        <section className="bg-white py-20">
          <div className="mx-auto max-w-content px-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">What your team will be able to do</p>
            <h2 className="mb-10 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
              Confident, compliant {m.title.toLowerCase()}.
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {m.outcomes.slice(0, 6).map((o) => (
                <div key={o} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-neutral-light p-5">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="leading-relaxed text-neutral-dark">{o}</span>
                </div>
              ))}
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
        </div>
      </section>

      {/* FAQ */}
      <HomeFaq faqs={faqs} />

      {/* Lead capture */}
      <section id="enquire" className="scroll-mt-8 bg-white py-20">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">Get team pricing</p>
              <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">
                Get pricing and a rollout plan for {m.title} training.
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Tell us a little about your team and we will reply personally with pricing and how to roll
                out {m.title} training. Or skip the wait and buy licences for your team now.
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
            <div className="rounded-2xl border border-gray-100 bg-neutral-light p-7 shadow-card md:p-9">
              <GoLeadForm slug={slug} moduleTitle={m.title} />
            </div>
          </div>
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
    </div>
  )
}
