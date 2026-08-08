import Link from 'next/link'
import {
  CheckCircle2, FileText, MessageSquare, BarChart2,
  ShieldCheck, AlertTriangle, HelpCircle,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { CQC_COMPLIANCE_SLOTS } from '@/lib/page-slots/cqc-compliance'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/cqc-compliance' },
  title: 'CQC & Compliance',
  description: 'CareStream builds your CQC evidence as staff use your policies, checks which regulations your policies cover, and produces an inspection-ready report you can download as a PDF.',
  openGraph: {
    type: 'website',
    images: ['/og-image.png'],
    title: 'CQC & Compliance | CareStreamAI',
    description: 'Always-on CQC readiness: evidence tracking, regulation coverage analysis, and a downloadable inspection report.',
    url: 'https://www.carestreamai.com/cqc-compliance',
  },
}

// ── Readiness Report Dashboard Mockup ────────────────────────────────────────

function ReadinessReportMockup() {
  const policies = [
    { name: 'Safeguarding Adults',   queries: 84, pct: 100 },
    { name: 'Medication Management', queries: 61, pct: 73  },
    { name: 'Infection Control',     queries: 52, pct: 62  },
    { name: 'Fire Safety',           queries: 38, pct: 45  },
    { name: 'Moving & Handling',     queries: 29, pct: 35  },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CQC Readiness Report</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2">
            <FileText size={13} className="text-white" />
            <p className="text-[11px] font-bold text-white">PDF</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Policies in use', value: '18/20' },
          { label: 'Staff active',    value: '24/26' },
          { label: 'Period',          value: 'Apr 2026' },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-sm font-extrabold text-neutral-dark">{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">
          Policy access this month
        </p>
        <div className="space-y-3">
          {policies.map(({ name, queries, pct }) => (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-dark">{name}</p>
                <p className="text-[10px] text-neutral-mid">{queries} queries</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 bg-teal/5 px-5 py-3">
        <CheckCircle2 size={13} className="flex-shrink-0 text-teal" />
        <p className="text-[11px] font-medium text-teal">Inspection evidence · Download as a PDF</p>
      </div>
    </div>
  )
}

// ── Regulation Coverage Mockup ───────────────────────────────────────────────

function CoverageMockup() {
  const rows = [
    { reg: 'Duty of Candour (Reg 20)',        status: 'gap',      reason: 'Not addressed in your current policies.' },
    { reg: 'RIDDOR 2013',                     status: 'partial',  reason: 'Touched on, but the reporting steps are incomplete.' },
    { reg: 'Mental Capacity Act 2005',        status: 'covered',  reason: 'Covered by your Mental Capacity policy.' },
    { reg: 'Safeguarding (Care Act 2014)',    status: 'covered',  reason: 'Covered by your Safeguarding Adults policy.' },
  ]
  const styles: Record<string, { badge: string; text: string; label: string }> = {
    gap:     { badge: 'bg-red-100',   text: 'text-red-600',   label: 'Gap' },
    partial: { badge: 'bg-amber-100', text: 'text-amber-600', label: 'Partial' },
    covered: { badge: 'bg-green-100', text: 'text-green-700', label: 'Covered' },
  }
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
      <div className="flex items-center justify-between bg-teal px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Regulation Coverage</p>
          <p className="text-sm font-bold text-white">Crossways Care Home</p>
        </div>
        <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
          <p className="text-lg font-extrabold leading-none text-white">84%</p>
          <p className="mt-0.5 text-[9px] font-medium text-white/70">coverage</p>
        </div>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map(({ reg, status, reason }) => {
          const s = styles[status]
          return (
            <div key={reg} className="px-5 py-3">
              <div className="mb-0.5 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-neutral-dark">{reg}</p>
                <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${s.badge} ${s.text}`}>{s.label}</span>
              </div>
              <p className="text-[11px] leading-snug text-neutral-mid">{reason}</p>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
        <AlertTriangle size={13} className="flex-shrink-0 text-amber-500" />
        <p className="text-[11px] font-medium text-neutral-mid">Gaps shown first, so you know what to write or update next.</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function CqcCompliancePage() {
  const s = makeSlot(CQC_COMPLIANCE_SLOTS, await getContentSlots('/cqc-compliance'))
  return (
    <>
      {/* ── Split hero ─────────────────────────────────────────────────────── */}
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
              <ReadinessReportMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The gap ────────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>{s('gap.label')}</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                {s('gap.h2')}
              </h2>
              <div className={`space-y-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}>
                <div dangerouslySetInnerHTML={{ __html: s('gap.p1') }} />
                <div dangerouslySetInnerHTML={{ __html: s('gap.p2') }} />
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: '📁',
                  key: 'gap.card1',
                  dim: true,
                },
                {
                  icon: '📊',
                  key: 'gap.card2',
                  dim: false,
                },
              ].map(({ icon, key, dim }) => (
                <div
                  key={key}
                  className={`card-lift rounded-2xl p-6 ${
                    dim
                      ? 'border-2 border-red-100 bg-red-50/70'
                      : 'bg-teal-gradient shadow-teal-glow'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${
                      dim ? 'text-red-400' : 'text-white/60'
                    }`}>
                      {s(`${key}.label`)}
                    </p>
                  </div>
                  <p className={`leading-relaxed ${dim ? 'text-neutral-mid' : 'text-white'}`}>{s(`${key}.text`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('how.label')}</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('how.h2')}
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: MessageSquare,
                iconBg: 'bg-blue-100',
                iconColor: 'text-blue-600',
                key: 'how.step1',
              },
              {
                step: '02',
                Icon: FileText,
                iconBg: 'bg-purple-100',
                iconColor: 'text-purple-600',
                key: 'how.step2',
              },
              {
                step: '03',
                Icon: BarChart2,
                iconBg: 'bg-teal-light',
                iconColor: 'text-teal',
                key: 'how.step3',
              },
            ].map(({ step, Icon, iconBg, iconColor, key }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                    {step}
                  </span>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
                    <Icon size={18} className={iconColor} />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Regulation coverage ────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('coverage.label')}</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('coverage.h2')}
          </h2>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('coverage.h3')}
              </h3>
              <div className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('coverage.p1') }} />
              <div className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('coverage.p2') }} />
              <div className="space-y-3">
                {[
                  { Icon: CheckCircle2,  key: 'coverage.item1' },
                  { Icon: ShieldCheck,   key: 'coverage.item2' },
                  { Icon: AlertTriangle, key: 'coverage.item3' },
                ].map(({ Icon, key }) => (
                  <div key={key} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <Icon size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{s(`${key}.label`)}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.text`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CoverageMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── Report sections ────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <SectionLabel>{s('report.label')}</SectionLabel>
            <span className="rounded-pill bg-teal px-3 py-1 text-xs font-bold text-white">{s('report.badge')}</span>
          </div>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">{s('report.h2')}</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>{s('report.col1')}</span>
              <span>{s('report.col2')}</span>
            </div>
            {[
              'report.row1',
              'report.row2',
              'report.row3',
              'report.row4',
              'report.row5',
              'report.row6',
              'report.row7',
            ].map((key, i) => (
              <div key={key} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 6 ? 'border-b border-gray-100' : ''}`}>
                <span className="pr-4 font-semibold text-neutral-dark">{s(`${key}.section`)}</span>
                <span className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.why`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CQC key questions ──────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('keyq.label')}</SectionLabel>
          <h2 className="mb-14 text-4xl font-extrabold text-neutral-dark">
            {s('keyq.h2')}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                key: 'keyq.q1', icon: '🏆',
                badgeBg: 'bg-teal', badgeText: 'text-white',
              },
              {
                key: 'keyq.q2', icon: '⚡',
                badgeBg: 'bg-amber-500', badgeText: 'text-white',
              },
              {
                key: 'keyq.q3', icon: '🛡️',
                badgeBg: 'bg-blue-600', badgeText: 'text-white',
              },
              {
                key: 'keyq.q4', icon: '📈',
                badgeBg: 'bg-green-600', badgeText: 'text-white',
              },
              {
                key: 'keyq.q5', icon: '❤️',
                badgeBg: 'bg-purple-600', badgeText: 'text-white',
              },
            ].map(({ key, icon, badgeBg, badgeText }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <span className={`rounded-pill ${badgeBg} px-3 py-1.5 text-xs font-bold ${badgeText}`}>{s(`${key}.title`)}</span>
                </div>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.evidence`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Works alongside ────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('toolkit.label')}</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('toolkit.h2')}
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                Icon: MessageSquare,
                key: 'toolkit.card1',
                href: '/cqc-report-chat',
              },
              {
                Icon: HelpCircle,
                key: 'toolkit.card2',
                href: '/cqc-staff-questions',
              },
            ].map(({ Icon, key, href }) => (
              <div key={key} className="card-lift flex flex-col rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon size={20} className="text-teal" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
                <Link href={href} className="text-sm font-semibold text-teal hover:underline">{s(`${key}.cta`)} →</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Legal note ─────────────────────────────────────────────────────── */}
      <section className="bg-amber-50 py-14">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex gap-4">
            <div className="mt-1 text-2xl text-amber-600">⚠</div>
            <div>
              <p className="mb-1 font-bold text-amber-900">{s('legal.title')}</p>
              <div className={`text-sm leading-relaxed text-amber-800 ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('legal.body') }} />
            </div>
          </div>
        </div>
      </section>

      <EditableContentBlock path="/cqc-compliance" />

      <PageCta
        heading="Build your inspection evidence from day one."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
