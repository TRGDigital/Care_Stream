import Link from 'next/link'
import { CheckCircle2, ClipboardCheck, ChevronDown } from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { JsonLd } from '@/components/json-ld'
import { BlogFaqs } from '@/components/marketing/blog-faqs'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { faqPageSchema, howToSchema, breadcrumbSchema } from '@/lib/schema'
import { SERVICE_LABEL } from '@/lib/audit-catalogue'
import type { AuditPageData } from '@/lib/audit-pages/types'

const FREQ: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', periodic: 'Periodic' }
const SCOPE: Record<string, string> = { resident: 'One person at a time', staff: 'One staff member at a time', room: 'One room at a time', none: 'Whole service' }

export function AuditProductPage({ page: p }: { page: AuditPageData }) {
  const path = `/care-audits/${p.slug}`
  const total = p.sections.reduce((n, s) => n + s.questions.length, 0)
  const register = `/register?tier=free&source=audit-${p.slug}`
  return (
    <>
      <JsonLd data={breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Care audits', path: '/care-audits' }, { name: p.name, path }])} />
      <JsonLd data={howToSchema({ name: `How to run the ${p.name}`, description: p.description, path, steps: p.steps })} />
      <JsonLd data={faqPageSchema(p.faqs)} />

      {/* Hero */}
      <section className="bg-hero-gradient pb-20 pt-28 text-white">
        <div className="mx-auto max-w-6xl px-6">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <Link href="/care-audits" className="hover:text-white hover:underline">Care audits</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span>{p.name}</span>
          </nav>
          <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
            <span className="rounded-full bg-white/15 px-2.5 py-1">{FREQ[p.frequency] ?? p.frequency}</span>
            <span className="rounded-full bg-white/15 px-2.5 py-1">{SCOPE[p.scope] ?? p.scope}</span>
            <span className="rounded-full bg-green-400/25 px-2.5 py-1 text-green-100">Free to run</span>
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight md:text-5xl">{p.h1}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/85">{p.intro}</p>
          <ul className="mt-6 max-w-3xl space-y-2">
            {p.lead_points.map(t => (
              <li key={t} className="flex items-start gap-2 text-base text-white/90">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-300" aria-hidden="true" />{t}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={register} className="inline-flex items-center rounded-lg bg-white px-5 py-3 text-base font-bold text-teal hover:bg-teal-light">Run this audit free</Link>
            <a href="#questions" className="inline-flex items-center rounded-lg border border-white/50 px-5 py-3 text-base font-semibold text-white hover:bg-white/10">See all {total} checks</a>
          </div>
        </div>
      </section>

      {/* At a glance */}
      <section className="border-b border-gray-100 bg-white py-10">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'How often', value: FREQ[p.frequency] ?? p.frequency },
            { label: 'Who runs it', value: p.who_runs_it },
            { label: 'Checks', value: `${total} checks in ${p.sections.length} sections` },
            { label: 'Cost', value: 'Free on every plan' },
          ].map(x => (
            <div key={x.label}>
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-teal">{x.label}</p>
              <p className="mt-1 text-base font-semibold text-neutral-dark">{x.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What it checks */}
      <section className="bg-white py-20" id="what-it-checks">
        <div className="mx-auto max-w-6xl px-6">
          <SectionLabel>What it covers</SectionLabel>
          <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-dark md:text-4xl">{p.what_it_is_title}</h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-neutral-mid">{p.what_it_is}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {p.sections.map(s => (
              <li key={s.title} className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-teal" aria-hidden="true" />
                  <h3 className="text-base font-bold text-neutral-dark">{s.title}</h3>
                </div>
                <p className="mt-1 text-xs font-semibold text-neutral-mid">{s.questions.length} checks</p>
                <p className="mt-3 text-sm leading-relaxed text-neutral-mid">{s.questions.find(q => !/^(number|how many|date|name)/i.test(q)) ?? s.questions[0]}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How to use */}
      <section className="bg-neutral-light py-20" id="how-to-use">
        <div className="mx-auto max-w-6xl px-6">
          <SectionLabel>How to use it</SectionLabel>
          <h2 className="max-w-3xl text-3xl font-extrabold tracking-tight text-neutral-dark md:text-4xl">How to run the {p.name.replace(/\s*\(.*\)$/, '')}, step by step</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {p.steps.map((s, i) => (
              <li key={s.name} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal text-sm font-bold text-white">{i + 1}</span>
                <h3 className="mt-3 text-base font-bold text-neutral-dark">{s.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-neutral-mid">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Every question, readable without an account */}
      <section className="bg-white py-20" id="questions">
        <div className="mx-auto max-w-4xl px-6">
          <SectionLabel>The full question set</SectionLabel>
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-dark md:text-4xl">All {total} checks, section by section</h2>
          <p className="mt-3 text-base leading-relaxed text-neutral-mid">You can read every check before you sign up. Inside CareStream each one is scored, can carry a finding and can raise an action.</p>
          <div className="mt-8 space-y-3">
            {p.sections.map((s, i) => (
              <details key={s.title} className="group rounded-xl border border-gray-200 bg-white" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4">
                  <h3 className="flex-1 text-base font-bold text-neutral-dark">{s.title} <span className="font-medium text-neutral-mid">({s.questions.length})</span></h3>
                  <ChevronDown size={18} className="shrink-0 text-neutral-mid transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <ol className="list-decimal space-y-2 border-t border-gray-100 px-5 py-4 pl-10 text-sm leading-relaxed text-neutral-dark">
                  {s.questions.map(q => <li key={q}>{q}</li>)}
                </ol>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Services and regulations */}
      <section className="bg-neutral-light py-20" id="who-for">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2">
          <div>
            <SectionLabel>Who it is for</SectionLabel>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-dark">Care services this audit suits</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.services.map(s => <span key={s} className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700">{SERVICE_LABEL[s] ?? s}</span>)}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-neutral-mid">{p.evidence_note}</p>
          </div>
          <div>
            <SectionLabel>What it evidences</SectionLabel>
            <h2 className="text-2xl font-extrabold tracking-tight text-neutral-dark">Regulations it supports</h2>
            <ul className="mt-4 space-y-3">
              {p.regulations.map(r => (
                <li key={r.ref} className="text-sm leading-relaxed text-neutral-mid">
                  <a href={r.url} target="_blank" rel="noopener" className="font-semibold text-teal underline underline-offset-2">{r.ref}</a>: {r.title}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-neutral-mid">This audit checks that things are in place, recorded and reviewed. It does not give clinical or legal advice.</p>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-white py-20" id="faqs">
        <div className="mx-auto max-w-4xl px-6">
          <BlogFaqs faqs={p.faqs} />
        </div>
      </section>

      <EditableContentBlock path={path} />

      {/* Related */}
      <section className="bg-white pb-16">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-sm text-neutral-mid">
            More free audits: {p.related.join(', ')}. <Link href="/care-audits#audit-library" className="font-semibold text-teal underline underline-offset-2">See the full audit library</Link>.
          </p>
        </div>
      </section>

      <PageCta heading={`Run the ${p.name.replace(/\s*\(.*\)$/, '')} free`} sub="Create a free account and run it today. No card needed." primary={{ href: register, label: 'Run this audit free' }} secondary={{ href: '/care-audits', label: 'Browse all free audits' }} />
    </>
  )
}
