import Link from 'next/link'
import {
  Globe, FileText, Smartphone, ShieldCheck, Mic, GraduationCap, Check, CheckCircle2,
  Users, BarChart2, Calendar, RefreshCw, Lock, type LucideIcon,
} from 'lucide-react'
import type { LpContent } from '@/lib/lp/types'
import { FaqAccordion } from '@/components/marketing/home-faq'

const ICONS: Record<string, LucideIcon> = {
  Globe, FileText, Smartphone, ShieldCheck, Mic, GraduationCap, Check, CheckCircle2,
  Users, BarChart2, Calendar, RefreshCw, Lock,
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">{children}</p>
}

export function LpProblem({ data }: { data: LpContent['problem'] }) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-6">
        <Eyebrow>{data.eyebrow ?? 'The problem'}</Eyebrow>
        <h2 className="mb-6 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">{data.headline}</h2>
        <div className="space-y-5 text-lg leading-relaxed text-neutral-mid">
          {data.body.map((p, i) => <p key={i}>{p}</p>)}
        </div>
      </div>
    </section>
  )
}

export function LpHowItWorks({ data }: { data: LpContent['howItWorks'] }) {
  return (
    <section className="bg-neutral-light py-20">
      <div className="mx-auto max-w-content px-6">
        <Eyebrow>{data.eyebrow ?? 'How it works'}</Eyebrow>
        <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">{data.headline}</h2>
        {data.subheadline && <p className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">{data.subheadline}</p>}
        <div className="grid gap-6 md:grid-cols-3">
          {data.steps.map(s => (
            <div key={s.number} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
              <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{s.number}</span>
              <h3 className="mb-2 text-lg font-bold text-neutral-dark">{s.title}</h3>
              <p className="text-sm leading-relaxed text-neutral-mid">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LpFeatures({ data }: { data: LpContent['features'] }) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-content px-6">
        <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">{data.headline}</h2>
        {data.subheadline && <p className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">{data.subheadline}</p>}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map(item => {
            const Icon = ICONS[item.icon] ?? Check
            return (
              <div key={item.title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light"><Icon size={20} className="text-teal" /></div>
                <h3 className="mb-2 font-bold text-neutral-dark">{item.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{item.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function LpSocialProof({ data }: { data: NonNullable<LpContent['socialProof']> }) {
  const hasContent = (data.testimonials?.length ?? 0) > 0 || data.caseStudyHighlight || (data.logoWall?.length ?? 0) > 0
  if (!hasContent) return null
  return (
    <section className="bg-neutral-light py-20">
      <div className="mx-auto max-w-content px-6">
        {data.headline && <h2 className="mb-10 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">{data.headline}</h2>}
        {data.caseStudyHighlight && (
          <div className="mb-8 rounded-2xl bg-teal-gradient p-8 shadow-teal-glow md:p-10">
            <p className="mb-4 text-2xl font-extrabold text-white">{data.caseStudyHighlight.stat}</p>
            <p className="mb-3 text-lg leading-relaxed text-white/85">&ldquo;{data.caseStudyHighlight.quote}&rdquo;</p>
            <p className="text-sm font-semibold text-white/70">{data.caseStudyHighlight.company}</p>
          </div>
        )}
        {(data.testimonials?.length ?? 0) > 0 && (
          <div className="grid gap-6 md:grid-cols-3">
            {data.testimonials!.map(t => (
              <div key={t.name} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <p className="mb-4 leading-relaxed text-neutral-dark">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-sm font-bold text-neutral-dark">{t.name}</p>
                <p className="text-xs text-neutral-mid">{t.role}, {t.company}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function LpFaq({ data }: { data: NonNullable<LpContent['faq']> }) {
  if (!data.items?.length) return null
  return (
    <section className="bg-neutral-light py-20">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="mb-10 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">{data.headline ?? 'Common questions'}</h2>
        <FaqAccordion faqs={data.items} />
      </div>
    </section>
  )
}

export function LpFinalCta({ data }: { data: LpContent['finalCta'] }) {
  return (
    <section className="bg-teal-gradient py-20">
      <div className="mx-auto max-w-content px-6 text-center">
        <h2 className="mb-4 text-3xl font-extrabold leading-tight text-white md:text-4xl">{data.headline}</h2>
        {data.subheadline && <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-white/85">{data.subheadline}</p>}
        <a href={data.ctaAnchor ?? '#form'} className="btn-amber inline-block rounded-btn px-10 py-4 text-base">{data.ctaLabel}</a>
      </div>
    </section>
  )
}

export function LpFooter({ privacyLinkUrl }: { privacyLinkUrl: string }) {
  const year = 2026
  return (
    <footer className="bg-neutral-dark py-10">
      <div className="mx-auto flex max-w-content flex-col items-center gap-4 px-6 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs text-white/50">© {year} CareStreamAI Limited. Registered with the ICO.</p>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/60">
          <Link href={privacyLinkUrl} className="hover:text-white">Privacy</Link>
          <Link href="https://carestreamai.com/terms" className="hover:text-white">Terms</Link>
          <Link href="https://carestreamai.com/cookies" className="hover:text-white">Cookies</Link>
        </div>
      </div>
    </footer>
  )
}
