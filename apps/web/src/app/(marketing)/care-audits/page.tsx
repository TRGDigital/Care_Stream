import Link from 'next/link'
import {
  CheckCircle2, BarChart2,
  Brain, AlertTriangle, FileText,
  ClipboardCheck, Printer, Layers, Save, Wrench, Users, GraduationCap,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { CARE_AUDITS_SLOTS } from '@/lib/page-slots/care-audits'

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
          <SectionLabel>See It In Action</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            Every question is consistent, and every answer is captured in the same structure.
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                A clear answer and a note for every question, formatted identically every time.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                The guided audit walks you through every required question in the right order.
                Each question takes a Yes, No or Not Applicable, with space for what you found and
                the action to take, so every audit is formatted the same way regardless of who
                completes it.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                It can be completed on any device, at any time. Answers save as you go, so a manager
                finishing a medicines audit at the end of a shift takes the same structured path as
                one completing it at the start of the day.
              </p>
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

      {/* ── Completed audit report ───────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>The Finished Report</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            A formatted report with every response, every section score, and your summary. Generated instantly.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            The moment the last question is answered, the report is ready. No formatting, no copying
            responses into a template. The completed audit is stored in CareStream and can be printed,
            saved as a PDF, shared with the management team, or presented directly to a CQC inspector.
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
          <SectionLabel>AI-Generated Recommendations</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Every completed audit generates a prioritised improvement plan. Automatically.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            CareStream reads the responses from each completed audit and generates specific,
            prioritised recommendations based on what your findings actually show. Not generic
            advice from a template. Every recommendation is drawn from the answers you gave and
            the actions you recorded in that audit.
          </p>

          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Recommendations tied directly to the findings that generated them.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Each recommendation references the specific finding it is based on, the risk it
                addresses, a suggested action, and a priority level, so managers can act immediately
                without having to interpret the audit data themselves.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Each completed audit is stored alongside its recommendations and an overall AI rating
                of Outstanding, Good, Requires Improvement, or Inadequate, giving you a clear,
                consistent picture of where the service stands at the end of every audit.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Specific to your findings',  text: 'Recommendations reference the exact questions that returned a No, not the audit as a whole.' },
                  { label: 'Prioritised for you',        text: 'Each recommendation carries a clear priority so the management team knows what to deal with first.' },
                  { label: 'An overall rating',          text: 'Every completed audit is given an Outstanding, Good, Requires Improvement, or Inadequate rating based on the responses.' },
                ].map(({ label, text }) => (
                  <div key={label} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{label}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{text}</p>
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
          <SectionLabel light>A Complete Audit Toolkit</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            From guided completion to section scoring to AI recommendations. One place for the whole audit.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            CareStream gives every audit the same structure, scores it as you go, and turns your
            answers into a formatted, inspection-ready report.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: ClipboardCheck,
                title: 'Ten pre-built templates',
                body: 'Medicines management, infection control, health and safety, fire safety, resident bedrooms, the kitchen, accident and incident records, and data protection. All ready to use, and you can build your own.',
              },
              {
                Icon: BarChart2,
                title: 'Section-by-section scoring',
                body: 'Every Yes, No or Not Applicable is scored as you go, so you can see exactly which sections are strong and which need attention before you finish.',
              },
              {
                Icon: Save,
                title: 'Auto-save and resume',
                body: 'Answers save automatically as you work. Pause an audit and pick it up later on any device, exactly where you left off.',
              },
              {
                Icon: Layers,
                title: 'Shift and room-by-room audits',
                body: 'Run audits by day or night shift, or room by room for resident bedroom checks, so the record matches how the audit is actually carried out.',
              },
              {
                Icon: Printer,
                title: 'Inspection-ready reports',
                body: 'Each completed audit is locked and formatted, ready to print, save as a PDF, or present directly to a CQC inspector.',
              },
              {
                Icon: Brain,
                title: 'AI recommendations and rating',
                body: 'Every completed audit generates prioritised recommendations from your findings, plus an overall rating of Outstanding, Good, Requires Improvement, or Inadequate.',
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Icon size={18} className="text-white" />
                </div>
                <h3 className="mb-2 font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/75">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CQC evidence ──────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>CQC Evidence</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            An audit record that shows inspectors a consistent, structured approach to quality.
          </h2>
          <div className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            <p>
              CQC inspectors assess whether internal audits are consistent, whether they produce
              clear findings, and whether those findings come with sensible actions. CareStream
              generates the evidence for all three.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>What CareStream records</span>
              <span>What this shows an inspector</span>
            </div>
            {[
              ['Structured report for every audit', 'A formatted report for every completed audit, with section scores, your findings, and the actions recorded. The same format regardless of who completed it.'],
              ['Section scores', 'A clear score for each section of the audit, showing which areas were met in full and which were flagged for action on the day.'],
              ['Findings and actions on every question', 'Each question carries the outcome of the audit and the action to be taken, so inspectors can see findings are noted and followed with a clear next step.'],
              ['AI recommendations and overall rating', 'Each completed audit is stored with prioritised recommendations and an Outstanding, Good, Requires Improvement, or Inadequate rating, showing a structured approach to quality improvement.'],
              ['A timestamped completion record', 'Every audit shows who completed it and when, demonstrating that audits are carried out and recorded as part of the routine of the service.'],
            ].map(([what, why], i) => (
              <div key={what} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 4 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-start gap-2 pr-4">
                  <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-teal" />
                  <span className="font-semibold text-neutral-dark">{what}</span>
                </div>
                <span className="text-sm leading-relaxed text-neutral-mid">{why}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature summary ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Everything Included</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">
            The complete care audit toolkit.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ClipboardCheck, label: 'Ten pre-built templates',        desc: 'Medicines, infection control, health and safety, fire, resident bedrooms, kitchen, accident and incident, and data protection. All ready to use, and you can build your own.', iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
              { icon: ClipboardCheck, label: 'Guided, structured completion',  desc: 'Work through each audit section by section with a clear Yes, No or Not Applicable and notes on every question. Consistent regardless of who completes it.',                  iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
              { icon: FileText,       label: 'Automatic report generation',    desc: 'A formatted report with section scores, your findings, your summary, and AI recommendations is generated the moment the audit is complete.',                               iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
              { icon: BarChart2,      label: 'Section-by-section scoring',      desc: 'Every answer is scored as you go, so you can see which sections are strong and which need attention before you finish.',                                                  iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
              { icon: Save,           label: 'Auto-save and resume',           desc: 'Answers save automatically as you work. Pause and pick the audit up later on any device, exactly where you left off.',                                                 iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
              { icon: Layers,         label: 'Shift and room-by-room audits',  desc: 'Run audits by day or night shift, or room by room for resident bedroom checks, so the record matches how the audit was carried out.',                                  iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
              { icon: Printer,        label: 'Inspection-ready reports',       desc: 'Each completed audit is locked and formatted, ready to print, save as a PDF, or present directly to a CQC inspector.',                                                 iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
              { icon: Brain,          label: 'AI recommendations and rating',  desc: 'Every completed audit generates prioritised recommendations from your findings, plus an overall Outstanding to Inadequate rating.',                                     iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
            ].map(({ icon: Icon, label, desc, iconBg, iconColor }) => (
              <div key={label} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon size={16} className={iconColor} />
                </div>
                <p className="mb-1.5 font-semibold text-neutral-dark">{label}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">{desc}</p>
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
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">Under an hour</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                to complete a structured audit in the hub instead of an afternoon on a spreadsheet.
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                A guided, structured audit with answers that save as you go is far quicker than a
                blank form, and produces a better formatted report at the end of it.
              </p>
            </div>
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">10</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                pre-built audit templates covering the areas CQC inspects, ready to use out of the box.
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                Medicines, infection control, health and safety, fire, resident bedrooms, the kitchen,
                accident and incident records, and data protection. Use them as they are or build your own.
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
