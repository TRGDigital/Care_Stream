import Link from 'next/link'
import {
  CheckCircle2, BarChart2,
  Brain, AlertTriangle, FileText,
  ClipboardCheck, Printer, Layers, Save, Wrench, Users, GraduationCap,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { CARE_AUDITS_SLOTS } from '@/lib/page-slots/care-audits'
import { SiteImage } from '@/components/site-image'
import { FEATURE_IMAGE_ALT } from '@/lib/feature-images'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'

export const metadata = {
  title:       'Care Audits | CareStreamAI',
  description: 'Replace slow manual audits with structured, guided audits in the CareStream hub. Score every section, record your findings and actions, and generate a formatted report with AI recommendations the moment you finish.',
  openGraph: {
    title: 'Care Audits | CareStreamAI',
    description: 'Guided, structured audits in the hub with section scoring, recorded findings and actions, and AI recommendations on completion.',
    url: 'https://www.carestreamai.com/care-audits',
  },
}

// ── Audit Results Card ────────────────────────────────────────────────────────

function AuditResultsMockup() {
  const sections = [
    { name: 'Storage and security',     score: 95, pass: true  },
    { name: 'MAR charts',               score: 90, pass: true  },
    { name: 'Competency and training',  score: 67, pass: false },
    { name: 'PRN protocols',            score: 88, pass: true  },
    { name: 'Receipt and disposal',     score: 92, pass: true  },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Medicines Management Audit</p>
            <p className="text-sm font-bold text-white">Completed 22 May 2026</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-base font-extrabold leading-none text-white">Good</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">AI rating</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Sections',  value: '5',    color: 'text-neutral-dark' },
          { label: 'Answered',  value: '24',   color: 'text-neutral-dark' },
          { label: 'Flagged',   value: '1',    color: 'text-amber-500'    },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-3 text-center">
            <p className={`text-base font-extrabold ${color}`}>{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Section scores</p>
        <div className="space-y-2.5">
          {sections.map(({ name, score, pass }) => (
            <div key={name} className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-neutral-dark">{name}</p>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${pass ? 'bg-green-500' : 'bg-amber-400'}`} />
                <p className={`text-[10px] font-bold ${pass ? 'text-green-600' : 'text-amber-500'}`}>{score}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-amber-100 bg-amber-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="flex-shrink-0 text-amber-600" />
          <p className="text-[11px] font-medium text-amber-800">1 area flagged: competency renewals due before 10 June.</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function CareAuditsPage() {
  const s = makeSlot(CARE_AUDITS_SLOTS, await getContentSlots('/care-audits'))

  const PROBLEM_CARDS = [
    { icon: '📝', key: 'problem.card1', dim: true },
    { icon: '✅', key: 'problem.card2', dim: false },
  ]
  const HOW_STEPS = [
    { step: '01', Icon: ClipboardCheck, key: 'how.card1' },
    { step: '02', Icon: ClipboardCheck, key: 'how.card2' },
    { step: '03', Icon: FileText,       key: 'how.card3' },
  ]
  const BUILD_CARDS = [
    { Icon: Wrench,         key: 'build.card1' },
    { Icon: ClipboardCheck, key: 'build.card2' },
    { Icon: Users,          key: 'build.card3' },
    { Icon: Brain,          key: 'build.card4' },
  ]
  const LOOP_STEPS = [
    { step: '01', Icon: FileText,      key: 'loop.card1' },
    { step: '02', Icon: GraduationCap, key: 'loop.card2' },
    { step: '03', Icon: ClipboardCheck, key: 'loop.card3' },
    { step: '04', Icon: BarChart2,     key: 'loop.card4' },
  ]
  const REC_ITEMS = ['rec.item1', 'rec.item2', 'rec.item3']
  const TOOLKIT_CARDS = [
    { Icon: ClipboardCheck, key: 'toolkit.card1' },
    { Icon: BarChart2,      key: 'toolkit.card2' },
    { Icon: Save,           key: 'toolkit.card3' },
    { Icon: Layers,         key: 'toolkit.card4' },
    { Icon: Printer,        key: 'toolkit.card5' },
    { Icon: Brain,          key: 'toolkit.card6' },
  ]
  const CQC_ROWS = ['cqc.row1', 'cqc.row2', 'cqc.row3', 'cqc.row4', 'cqc.row5']
  const SUMMARY_CARDS = [
    { icon: ClipboardCheck, key: 'summary.card1', iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
    { icon: ClipboardCheck, key: 'summary.card2', iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
    { icon: FileText,       key: 'summary.card3', iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
    { icon: BarChart2,      key: 'summary.card4', iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
    { icon: Save,           key: 'summary.card5', iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
    { icon: Layers,         key: 'summary.card6', iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
    { icon: Printer,        key: 'summary.card7', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
    { icon: Brain,          key: 'summary.card8', iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
  ]

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
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">{s('hero.cta1')}</Link>
                <Link href="/demo"     className="btn-ghost-white rounded-btn px-8 py-4 text-sm">{s('hero.cta2')}</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <AuditResultsMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>{s('problem.label')}</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                {s('problem.h2')}
              </h2>
              <div className={`space-y-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}>
                <div dangerouslySetInnerHTML={{ __html: s('problem.p1') }} />
                <div dangerouslySetInnerHTML={{ __html: s('problem.p2') }} />
              </div>
            </div>
            <div className="grid gap-4">
              {PROBLEM_CARDS.map(({ icon, key, dim }) => (
                <div
                  key={key}
                  className={`card-lift rounded-2xl p-6 ${dim ? 'border border-gray-100 bg-white shadow-card' : 'bg-teal-gradient shadow-teal-glow'}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${dim ? 'text-neutral-mid' : 'text-white/60'}`}>{s(`${key}.label`)}</p>
                  </div>
                  <p className={`leading-relaxed ${dim ? 'text-neutral-mid' : 'text-white'}`}>{s(`${key}.body`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('how.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('how.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('how.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {HOW_STEPS.map(({ step, Icon, key }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                    <Icon size={18} className="text-teal" />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Build your own audits ─────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('build.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('build.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('build.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {BUILD_CARDS.map(({ Icon, key }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-neutral-light/40 p-7 shadow-card">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light"><Icon size={18} className="text-teal" /></div>
                <h3 className="mb-2 text-lg font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Link audits to training: the closed loop ───────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('loop.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('loop.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('loop.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {LOOP_STEPS.map(({ step, Icon, key }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light"><Icon size={18} className="text-teal" /></div>
                </div>
                <h3 className="mb-2 text-lg font-bold text-neutral-dark">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
          <div className={`mt-10 max-w-2xl text-base leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('loop.note') }} />
        </div>
      </section>

      {/* ── See it in action ──────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('action.label')}</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('action.h2')}
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('action.h3')}
              </h3>
              <div className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('action.p1') }} />
              <div className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('action.p2') }} />
              <div className="space-y-3">
                {[
                  { domain: 'Medicines',      q: 'Are all controlled drugs stored in a locked cabinet with access restricted to authorised staff only?' },
                  { domain: 'Infection',      q: 'Is there documented evidence that PPE stocks are checked and replenished at least weekly?' },
                  { domain: 'Resident rooms', q: 'Is each resident bedroom clean, safe, and free of slip or trip hazards on the day of the check?' },
                ].map(({ domain, q }) => (
                  <div key={domain} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <span className="mb-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal">{domain}</span>
                    <p className="text-sm font-medium leading-snug text-neutral-dark">{q}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Guided audit form mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-center justify-between bg-teal px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">Medicines Management Audit</p>
                    <p className="text-[11px] text-white/70">Section 2 of 5 · Competency and training</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                    <Save size={10} /> Saving
                  </span>
                </div>
                <div className="space-y-4 p-4">
                  {/* Question with answered toggle */}
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="mb-2.5 text-xs font-medium leading-snug text-neutral-dark">
                      <span className="mr-1.5 text-[10px] text-neutral-mid">4.</span>
                      Does every member of staff administering medication hold a current, in-date competency sign-off?
                    </p>
                    <div className="mb-3 flex gap-2">
                      <button className="rounded-md border border-gray-200 px-4 py-1 text-[11px] font-semibold text-neutral-mid">Yes</button>
                      <button className="rounded-md bg-red-500 px-4 py-1 text-[11px] font-semibold text-white">No</button>
                      <button className="rounded-md border border-gray-200 px-4 py-1 text-[11px] font-semibold text-neutral-mid">N/A</button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-mid">Outcome of audit</p>
                        <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] text-neutral-dark">
                          Two staff due for renewal in June.
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-neutral-mid">Actions to be taken</p>
                        <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] text-neutral-dark">
                          Book both renewals before 10 June.
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Next question preview */}
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-xs font-medium leading-snug text-neutral-dark">
                      <span className="mr-1.5 text-[10px] text-neutral-mid">5.</span>
                      Are all medication administration errors from the last 30 days documented and reviewed by a senior member of staff?
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-1.5 w-1/2 rounded-full bg-teal" />
                  </div>
                  <p className="mt-1 text-[10px] text-neutral-mid">12 of 24 questions answered</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Photo evidence ───────────────────────────────────────────────── */}
      <section className="bg-teal-light/25 py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="mx-auto mb-14 max-w-3xl text-center">
            <SectionLabel>{s('evidence.label')}</SectionLabel>
            <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark">
              {s('evidence.h2')}
            </h2>
            <div className={`text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('evidence.intro') }} />
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            {/* Phone — capture on the floor (portrait, spans both rows on desktop) */}
            <figure className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card lg:col-span-4 lg:row-span-2">
              <div className="flex flex-1 items-center justify-center bg-neutral-light/40 p-5">
                <SiteImage
                  src="/features/audit-evidence/hub-mobile.jpg"
                  alt={FEATURE_IMAGE_ALT['/features/audit-evidence/hub-mobile.jpg']}
                  width={792} height={1600}
                  sizes="(max-width: 1024px) 90vw, 30vw"
                  className="h-auto w-full max-w-[300px] rounded-xl ring-1 ring-gray-200"
                />
              </div>
              <figcaption className="border-t border-gray-100 px-5 py-3 text-sm font-medium text-neutral-dark">{s('evidence.cap.mobile')}</figcaption>
            </figure>

            {/* Hub — evidence attached to the question (landscape) */}
            <figure className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card lg:col-span-8">
              <div className="bg-neutral-light/40 p-5">
                <SiteImage
                  src="/features/audit-evidence/hub-desktop.png"
                  alt={FEATURE_IMAGE_ALT['/features/audit-evidence/hub-desktop.png']}
                  width={1800} height={1117}
                  sizes="(max-width: 1024px) 90vw, 55vw"
                  className="h-auto w-full rounded-xl ring-1 ring-gray-200"
                />
              </div>
              <figcaption className="border-t border-gray-100 px-5 py-3 text-sm font-medium text-neutral-dark">{s('evidence.cap.desktop')}</figcaption>
            </figure>

            {/* Admin review — evidence when the audit is audited (landscape) */}
            <figure className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card lg:col-span-8">
              <div className="bg-neutral-light/40 p-5">
                <SiteImage
                  src="/features/audit-evidence/admin-review.png"
                  alt={FEATURE_IMAGE_ALT['/features/audit-evidence/admin-review.png']}
                  width={1800} height={926}
                  sizes="(max-width: 1024px) 90vw, 55vw"
                  className="h-auto w-full rounded-xl ring-1 ring-gray-200"
                />
              </div>
              <figcaption className="border-t border-gray-100 px-5 py-3 text-sm font-medium text-neutral-dark">{s('evidence.cap.admin')}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* ── Completed audit report ───────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('report.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('report.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('report.intro')}
          </p>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-elevated">
            {/* Report header */}
            <div className="border-b border-gray-100 bg-white px-8 py-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal">Completed</span>
                    <span className="text-[11px] text-neutral-mid">22 May 2026 at 09:14</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-neutral-dark">Medicines Management Audit</h3>
                  <p className="mt-0.5 text-sm text-neutral-mid">Completed by Sarah Mitchell, Deputy Manager</p>
                </div>
                <div className="flex gap-4 sm:text-right">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-3 text-center">
                    <p className="text-xl font-extrabold text-teal">Good</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">AI rating</p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-5 py-3 text-center">
                    <p className="text-2xl font-extrabold text-amber-600">1</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Area flagged</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Responses table */}
            <div className="divide-y divide-gray-50">
              {/* Table header */}
              <div className="grid grid-cols-[2fr_80px_1fr] gap-4 bg-gray-50 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">
                <span>Question</span>
                <span className="text-center">Response</span>
                <span>Outcome and actions</span>
              </div>
              {[
                {
                  q: 'Are all controlled drugs stored in a locked cabinet with access restricted to authorised staff only?',
                  r: 'Yes',
                  note: '',
                },
                {
                  q: 'Is there a current MAR chart for every resident receiving prescribed medication, with no unexplained gaps in the last 14 days?',
                  r: 'Yes',
                  note: '',
                },
                {
                  q: 'Have all medication administration errors from the last 30 days been documented and reviewed by a senior member of staff?',
                  r: 'Yes',
                  note: 'One near-miss logged on 14 May. Reviewed and signed off by RGN.',
                },
                {
                  q: 'Does every member of staff administering medication hold a current, in-date competency sign-off?',
                  r: 'No',
                  note: 'Two staff due for renewal in June. Action: book both renewals before 10 June.',
                  action: true,
                },
                {
                  q: 'Are PRN medication protocols in place for every resident prescribed as-required medication, reviewed within the last three months?',
                  r: 'Yes',
                  note: '',
                },
                {
                  q: 'Is there a clear process for receiving, checking, and recording new medication from the pharmacy?',
                  r: 'Yes',
                  note: 'Process documented in the medicines policy.',
                },
                {
                  q: 'Are medication storage temperatures checked and recorded daily for all items requiring refrigeration?',
                  r: 'Yes',
                  note: '',
                },
                {
                  q: 'Is there documented evidence that the medication trolley is cleaned and checked at least monthly?',
                  r: 'Yes',
                  note: 'Last cleaned 18 May 2026. Record in the medication log.',
                },
              ].map(({ q, r, note, action }, i) => (
                <div key={i} className={`grid grid-cols-[2fr_80px_1fr] items-start gap-4 px-8 py-4 ${action ? 'bg-amber-50/50' : ''}`}>
                  <div className="flex items-start gap-2">
                    {action
                      ? <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-amber-500" />
                      : <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0 text-teal" />
                    }
                    <p className="text-sm leading-snug text-neutral-dark">{q}</p>
                  </div>
                  <div className="flex justify-center pt-0.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      r === 'Yes' ? 'bg-green-100 text-green-700' :
                      r === 'No'  ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-600'
                    }`}>{r}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-neutral-mid">{note}</p>
                </div>
              ))}
            </div>

            {/* Audit summary */}
            <div className="border-t border-gray-100 bg-gray-50 px-8 py-5">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Audit summary</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-green-600">Strengths</p>
                  <p className="text-xs leading-relaxed text-neutral-mid">Storage, MAR charts, and PRN protocols all met in full.</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-600">Areas to improve</p>
                  <p className="text-xs leading-relaxed text-neutral-mid">Two competency sign-offs approaching expiry.</p>
                </div>
                <div className="rounded-xl border border-gray-100 bg-white p-4">
                  <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-teal">Deadline for actions</p>
                  <p className="text-xs leading-relaxed text-neutral-mid">10 June 2026</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI recommendations ───────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('rec.label')}</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('rec.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            {s('rec.intro')}
          </p>

          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('rec.h3')}
              </h3>
              <div className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('rec.p1') }} />
              <div className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('rec.p2') }} />
              <div className="space-y-3">
                {REC_ITEMS.map((key) => (
                  <div key={key} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{s(`${key}.label`)}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations panel mockup */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
              {/* Panel header */}
              <div className="border-b border-gray-100 bg-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-mid">AI Recommendations</p>
                    <p className="text-sm font-bold text-neutral-dark">Medicines Management Audit</p>
                    <p className="text-[11px] text-neutral-mid">Based on your completed audit: 22 May 2026</p>
                  </div>
                  <span className="rounded-full bg-teal/10 px-2.5 py-1 text-[11px] font-bold text-teal">3 recommendations</span>
                </div>
              </div>

              {/* Recommendation 1 – High */}
              <div className="border-b border-gray-100 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600">High priority</span>
                  <span className="text-[10px] text-neutral-mid">Based on: Q4 finding</span>
                </div>
                <p className="mb-1.5 text-sm font-semibold text-neutral-dark">Book medication competency renewals for two staff members before their sign-off lapses.</p>
                <p className="text-xs leading-relaxed text-neutral-mid">
                  Two staff members are approaching the end of their current medication competency period.
                  Administering medication without a current sign-off is a risk under the Safe key question.
                  The audit records an action to complete both renewals before 10 June.
                </p>
              </div>

              {/* Recommendation 2 – Medium */}
              <div className="border-b border-gray-100 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">Medium priority</span>
                  <span className="text-[10px] text-neutral-mid">Based on: Q4 finding</span>
                </div>
                <p className="mb-1.5 text-sm font-semibold text-neutral-dark">Set competency renewals to be booked 60 days before they expire.</p>
                <p className="text-xs leading-relaxed text-neutral-mid">
                  Booking renewals well ahead of the expiry date would keep every member of the
                  medication team in date and remove the risk of a last-minute lapse.
                </p>
              </div>

              {/* Recommendation 3 – Low */}
              <div className="p-5">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">Low priority</span>
                  <span className="text-[10px] text-neutral-mid">Based on: near-miss note</span>
                </div>
                <p className="mb-1.5 text-sm font-semibold text-neutral-dark">Confirm the near-miss from 14 May has been shared with the wider medication team.</p>
                <p className="text-xs leading-relaxed text-neutral-mid">
                  The near-miss on 14 May was documented and reviewed. To close the learning loop,
                  confirm the finding was shared at the next team handover and record that a debrief
                  took place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Audit programme features ──────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>{s('toolkit.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            {s('toolkit.h2')}
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            {s('toolkit.intro')}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TOOLKIT_CARDS.map(({ Icon, key }) => (
              <div key={key} className="card-lift rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="mb-2 font-bold text-white">{s(`${key}.title`)}</h3>
                <p className="text-sm leading-relaxed text-white/75">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CQC evidence ──────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('cqc.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('cqc.h2')}
          </h2>
          <div className={`mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`} dangerouslySetInnerHTML={{ __html: s('cqc.intro') }} />
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>{s('cqc.th1')}</span>
              <span>{s('cqc.th2')}</span>
            </div>
            {CQC_ROWS.map((key, i) => (
              <div key={key} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 4 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-start gap-2 pr-4">
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="font-semibold text-neutral-dark">{s(`${key}.what`)}</span>
                </div>
                <span className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.why`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature summary ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('summary.label')}</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">
            {s('summary.h2')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SUMMARY_CARDS.map(({ icon: Icon, key, iconBg, iconColor }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon size={16} className={iconColor} />
                </div>
                <p className="mb-1.5 font-semibold text-neutral-dark">{s(`${key}.title`)}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-16 text-center md:gap-0 md:grid-cols-2 md:divide-x md:divide-gray-100">
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">{s('stats.stat1.figure')}</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                {s('stats.stat1.title')}
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                {s('stats.stat1.body')}
              </p>
            </div>
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">{s('stats.stat2.figure')}</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                {s('stats.stat2.title')}
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                {s('stats.stat2.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Replace inconsistent manual audits with a structured process that produces reports you can use."
        sub="See how CareStream audits work for your service."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
