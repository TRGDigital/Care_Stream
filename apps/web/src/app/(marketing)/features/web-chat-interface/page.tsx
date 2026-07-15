import type { Metadata } from 'next'
import Link from 'next/link'
import {
  MessageSquare, Globe, ShieldCheck, Clock, CheckCircle2, Users,
  FileText, Search, ArrowRight, Zap,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { HomeFaq } from '@/components/marketing/home-faq'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

// DUMMY feature page — a benefit-led template for the features listed on /pricing, built on the
// same structure as the staff-training pages. First one: Web chat interface.

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/features/web-chat-interface', {
    title: 'Web Chat Interface for Care Staff | CareStreamAI',
    description: 'Give every member of your care team one place to ask anything and get an instant answer grounded in your own policies, in their own language, on any device.',
  })
}

const OUTCOMES = [
  'Staff get the right answer in seconds, instead of waiting for a senior or a manager.',
  'Everyone gets the same, policy-accurate guidance, so care stays consistent across every shift.',
  'Seniors and managers are interrupted far less often for routine questions.',
  'New starters find their feet quickly, without needing someone free to ask.',
  'You get a picture of what your team is actually unsure about, so you can close the gaps.',
  'Available around the clock, on any phone, tablet or computer, wherever care happens.',
]

const SECTIONS = [
  { heading: 'Ask in plain language', body: 'No jargon and no folders to dig through. A member of staff simply types their question the way they would ask a colleague, and CareStream understands it.' },
  { heading: 'Answers grounded in your own policies', body: 'This is not a generic web search. Every answer is drawn from your service’s own policies and procedures, so the guidance matches how your care setting actually works.' },
  { heading: 'Every answer shows where it came from', body: 'Each response points back to the policy it is based on, so staff can trust it and check it, and you have a clear, traceable line from the answer to your documented practice.' },
  { heading: 'In the language they are most confident in', body: 'Staff can ask and read answers in over 60 languages, while your records stay in English — so a language barrier never gets in the way of the right care decision.' },
  { heading: 'It learns what your policies don’t cover', body: 'When a question can’t be answered from your library, it is captured as a gap, so you can see the real-world questions your policies leave unanswered and act on them.' },
]

const KEY_POINTS = [
  'A single, familiar question box for your whole team, on any device',
  'Answers are grounded in your own uploaded policies, never generic advice',
  'Every answer is traceable back to the source policy',
  'Works in over 60 languages, with your records kept in English',
  'Unanswered questions are surfaced so you can improve your library',
]

const DELIVERS = [
  { Icon: Zap,        title: 'Answers in seconds',   body: 'Staff get an instant, accurate answer at the point of care, instead of pausing to find someone to ask.' },
  { Icon: FileText,   title: 'From your policies',   body: 'Grounded in your own documents, so the guidance reflects your service, not a template.' },
  { Icon: Globe,      title: 'In any language',      body: 'Over 60 languages supported, so every member of the team can use it with confidence.' },
  { Icon: Search,     title: 'Surfaces the gaps',    body: 'Questions your policies can’t answer are captured, so you can see and close the gaps.' },
]

const FAQS = [
  { question: 'What can staff ask the web chat?', answer: 'Anything about how your service works: policies and procedures, what to do in a situation, where to record something, who to escalate to. CareStream answers from your own uploaded policies, so the guidance is specific to your care setting.' },
  { question: 'How does it know the answers?', answer: 'CareStream reads your own policies and procedures and answers from them, pointing back to the source. It is not a generic web search, so staff get guidance that matches your documented practice.' },
  { question: 'Can staff use it in other languages?', answer: 'Yes. Staff can ask and read answers in over 60 languages, using the language they are most confident in, while your records stay in English.' },
  { question: 'What happens if a question isn’t covered?', answer: 'CareStream tells the member of staff it cannot answer from your policies, and captures the question as a gap so you can see what your library is missing and improve it.' },
]

export default function WebChatInterfacePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }} />
        <div className="relative mx-auto max-w-content px-6 pb-24 pt-20 md:pb-28 md:pt-24">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr]">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-white/60">
                <Link href="/pricing" className="hover:text-white">Features</Link>
                <span>/</span>
                <span className="text-white/80">For your whole team</span>
              </div>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Web chat interface
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                One place for every member of your team to ask anything, and get an instant answer grounded in your own policies, in their own language, on any device.
              </p>
              <div className="mb-8 flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"><Users size={13} /> For your whole team</span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"><Globe size={13} /> 60+ languages</span>
                <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white"><Clock size={13} /> Available 24/7</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link href="/demo" className="btn-amber rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
                <Link href="/register" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
              </div>
            </div>
            <div>
              <div className="overflow-hidden rounded-2xl shadow-elevated ring-1 ring-white/10">
                <div className="flex aspect-[16/10] w-full items-center justify-center bg-teal-gradient">
                  <MessageSquare size={72} className="text-white/80" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What it is ────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-3xl px-6">
          <SectionLabel>What It Is</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            One question box for your whole team.
          </h2>
          <p className="text-lg leading-relaxed text-neutral-mid">
            The web chat interface is where your care team goes to ask anything, in plain language, and get an instant, accurate answer drawn from your own policies and procedures. No folders to search, no waiting for a manager to be free, and no guessing. It puts the right guidance in the hands of every member of staff, on whatever device they already use.
          </p>
        </div>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>The Benefits</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold leading-tight text-neutral-dark">
            What it means for your service:
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {OUTCOMES.map((o) => (
              <div key={o} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                <span className="leading-relaxed text-neutral-dark">{o}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works, section by section ──────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How It Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            A closer look at the web chat interface.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Simple for staff to use, and built to give answers you can trust and stand behind at inspection.
          </p>
          <div className="space-y-14 lg:space-y-20">
            {SECTIONS.map((s, i) => {
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
                    <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-neutral-light ring-1 ring-gray-100">
                      <MessageSquare size={56} className="text-teal/30" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Key points + sidebar ──────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-12 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <SectionLabel>At A Glance</SectionLabel>
              <h2 className="mb-6 text-3xl font-extrabold leading-tight text-neutral-dark">The essentials, in one place.</h2>
              <ul className="space-y-3">
                {KEY_POINTS.map((k) => (
                  <li key={k} className="flex items-start gap-3 text-lg leading-relaxed text-neutral-mid">
                    <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-teal" />
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-3 flex items-center gap-2"><Users size={18} className="text-teal" /><p className="font-bold text-neutral-dark">Who it&rsquo;s for</p></div>
                <p className="text-sm leading-relaxed text-neutral-mid">
                  Every member of your care team, from new starters to seniors and managers, on any phone, tablet or computer.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-3 flex items-center gap-2"><ShieldCheck size={18} className="text-teal" /><p className="font-bold text-neutral-dark">Confidence at inspection</p></div>
                <p className="text-sm leading-relaxed text-neutral-mid">
                  Because every answer is grounded in your own policies and traceable to its source, you can show that staff are guided by your documented practice.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How CareStream delivers it ────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>Why It Works</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            The right answer, in the moment it&rsquo;s needed.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            Care doesn&rsquo;t wait for office hours. The web chat interface puts accurate, policy-grounded guidance into every member of your team&rsquo;s hands, whenever and wherever they need it.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {DELIVERS.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20"><Icon size={18} className="text-white" /></div>
                <h3 className="mb-2 font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/75">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link href="/how-it-works" className="inline-flex items-center gap-2 font-semibold text-white hover:underline">
              See how CareStream works <ArrowRight size={16} />
            </Link>
            <Link href="/care-policies" className="inline-flex items-center gap-2 font-semibold text-white/80 hover:underline">
              <FileText size={16} /> Built from your own policies
            </Link>
          </div>
        </div>
      </section>

      <HomeFaq faqs={FAQS} />

      <PageCta
        heading="Put the right answer in every team member's hands."
        sub="See how CareStream gives your whole team instant, policy-grounded guidance in the hub, in any language."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
