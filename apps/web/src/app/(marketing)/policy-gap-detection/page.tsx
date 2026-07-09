import Link from 'next/link'
import {
  ShieldAlert, ScanSearch, ListChecks, Scale, FileText, GraduationCap,
  History, SlidersHorizontal, Check, ArrowRight,
} from 'lucide-react'
import { SectionLabel, PageCta } from '@/components/marketing/ui'

export const metadata = {
  title: 'Policy Gap Detection',
  description: 'CareStream reads inside your policies, tells you exactly which regulations you cover and where the gaps are, shows what to add with the legal basis, tracks changes to the standards, and turns each change into staff training. A Professional and Enterprise feature.',
  openGraph: {
    title: 'Policy Gap Detection | CareStreamAI',
    description: 'Know exactly where your policies fall short of the regulations, and close the gap — with the legal basis, the wording, and the training.',
    url: 'https://www.carestreamai.com/policy-gap-detection',
  },
}

function PlanBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white ring-1 ring-white/25">
      <ShieldAlert size={13} /> Professional &amp; Enterprise
    </span>
  )
}

// ── Coverage mockup ───────────────────────────────────────────────────────────
function CoverageMockup() {
  const rows = [
    { name: 'Regulation 12: Safe care and treatment', status: 'Covered',  tone: 'green'  },
    { name: 'Mental Capacity Act 2005',               status: 'Covered',  tone: 'green'  },
    { name: 'Regulation 14: Nutrition & hydration',   status: 'Partial',  tone: 'amber'  },
    { name: 'Duty of candour',                        status: 'Gap',      tone: 'red'    },
  ]
  const tones: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    red:   'bg-red-50 text-red-600',
  }
  return (
    <div className="w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CareStream · Policy Gaps</p>
        <p className="text-sm font-bold text-white">Regulation coverage</p>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[{ label: 'Coverage score', value: '86%' }, { label: 'Partial', value: '3' }, { label: 'Gaps', value: '2' }].map(s => (
          <div key={s.label} className="py-3 text-center">
            <p className="text-base font-extrabold text-neutral-dark">{s.value}</p>
            <p className="text-[9px] text-neutral-mid">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2.5 px-5 py-4">
        {rows.map(r => (
          <div key={r.name} className="flex items-center justify-between gap-3">
            <p className="truncate text-[11px] font-medium text-neutral-dark">{r.name}</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${tones[r.tone]}`}>{r.status}</span>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-100 bg-rose-50/60 px-5 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">Legally required · Duty of candour</p>
        <p className="mt-0.5 text-[11px] text-neutral-dark">Add to your <span className="font-semibold">Being Open policy</span>: the process for notifying people of a notifiable safety incident…</p>
      </div>
    </div>
  )
}

const STEPS = [
  {
    Icon: ScanSearch,
    label: 'Regulation coverage',
    title: 'It reads inside your policies, not just the titles.',
    body: 'For every regulation that applies to your service, CareStream searches the actual content of your whole policy library and an AI auditor judges whether you substantively cover it: covered, partial, or a gap. A policy is only ever flagged when your documents genuinely do not address it, never because nothing happens to be named after it.',
    points: ['A coverage score mapped to the CQC framework', 'Covered, partial and gap verdicts with the evidencing policy named', 'Checked against every uploaded policy, so nothing held elsewhere is missed'],
  },
  {
    Icon: ListChecks,
    label: 'What to add',
    title: 'Not just where you fall short — exactly what to add.',
    body: 'Drill into any partial or gap and CareStream shows the specific requirements you are missing, with example wording you can adapt, verified against your whole library first so it never tells you to add something you already hold in another policy.',
    points: ['Requirement-by-requirement checklist per regulation', 'Example wording to review, adapt and approve', 'Highlights exactly where an existing policy already covers part of it'],
  },
  {
    Icon: Scale,
    label: 'The legal basis',
    title: 'Every recommendation shows why it matters.',
    body: 'Each item is marked Legally required or Advised good practice, and names the regulation or guidance behind it with a link to the source. So a recommendation is never a black-box suggestion, it is a defensible, cited requirement your inspectors would recognise.',
    points: ['Legally required vs advised, at a glance', 'The citing legislation, regulation or guidance named', 'Direct links to the source for evidence'],
  },
  {
    Icon: FileText,
    label: 'Where it goes',
    title: 'It tells you which policy to put it in.',
    body: 'For a partial, CareStream opens the policy that partly covers the regulation and highlights the passages that already address it. For a gap, it points to the existing policy the wording belongs in, or tells you a new policy is needed.',
    points: ['Matched to the right policy in your library', 'Covered passages highlighted in the document', 'Flags when a brand-new policy is required'],
  },
  {
    Icon: SlidersHorizontal,
    label: 'Right for your service',
    title: 'Only tested against what actually applies to you.',
    body: 'A short service profile, pre-filled from your setting type, tells CareStream what your service actually does. So a home that holds no controlled drugs is never assessed against controlled-drug rules, and a service that does not support people under the Mental Health Act is never flagged for it.',
    points: ['Scoped by care setting and what your service does', 'The CQC Fundamental Standards apply to everyone', 'No irrelevant gaps, no noise'],
  },
  {
    Icon: History,
    label: 'Track legal changes',
    title: 'When the standards change, you know.',
    body: 'CareStream tracks changes to the regulations and standards you are assessed against. When one changes, the homes affected are alerted on their gaps page so they can review and re-check their policies, before it becomes an inspection finding.',
    points: ['Change history for every standard', 'Homes assessed against a changed standard are alerted', 'Re-check coverage in a click'],
  },
  {
    Icon: GraduationCap,
    label: 'Turn changes into training',
    title: 'Every policy change becomes staff training.',
    body: 'Once you add the recommended wording, or when a standard updates, generate a short, ready-to-assign training module built from exactly that change. Diagnose the gap, close it, and make sure your staff learn it — in one flow.',
    points: ['A micro-lesson and assessment from the change', 'Lands as a draft for you to review and publish', 'Reuses your existing training and certificate flow'],
  },
]

export default function PolicyGapDetectionPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div className="absolute bottom-0 left-0 right-0 h-16" style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }} />
        <div className="relative mx-auto max-w-content px-6 pb-20 pt-20 md:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4"><PlanBadge /></div>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Know exactly where your policies fall short. Then close the gap.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                CareStream reads inside your policies, tells you which regulations you cover and where the gaps are, shows what to add and why it is required, tracks changes to the standards, and turns each change into staff training.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CoverageMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mb-4 max-w-3xl text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            From &ldquo;are we compliant?&rdquo; to exactly what to do about it.
          </h2>
          <p className="mb-16 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Most homes assume coverage rather than verify it. This turns policy compliance from a guess into a measured, defensible, actionable picture — and keeps it current as the rules change.
          </p>

          <div className="space-y-6">
            {STEPS.map(({ Icon, label, title, body, points }, i) => (
              <div key={label} className="grid items-start gap-6 rounded-2xl border border-gray-100 bg-white p-8 shadow-card lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-light text-teal">
                      <Icon size={20} />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-widest text-teal">{String(i + 1).padStart(2, '0')} · {label}</span>
                  </div>
                  <h3 className="mb-3 text-2xl font-extrabold leading-tight text-neutral-dark">{title}</h3>
                  <p className="leading-relaxed text-neutral-mid">{body}</p>
                </div>
                <ul className="space-y-2.5 rounded-xl bg-neutral-light/60 p-6 text-sm text-neutral-mid lg:mt-2">
                  {points.map(p => (
                    <li key={p} className="flex items-start gap-2.5"><Check size={14} className="mt-0.5 shrink-0 text-teal" />{p}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Availability strip */}
      <section className="bg-neutral-light py-16">
        <div className="mx-auto max-w-content px-6">
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-teal/20 bg-white px-8 py-10 text-center shadow-card">
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-teal-light px-3 py-1 text-xs font-bold text-teal">
              <ShieldAlert size={14} /> Professional &amp; Enterprise
            </span>
            <h2 className="max-w-2xl text-2xl font-extrabold text-neutral-dark md:text-3xl">Policy Gap Detection is included on the Professional and Enterprise plans.</h2>
            <p className="max-w-2xl leading-relaxed text-neutral-mid">Regulation coverage, remediation guidance with the legal basis, change tracking and gap-driven training are all part of Professional and Enterprise. Starter customers can upgrade in a click.</p>
            <Link href="/pricing" className="inline-flex items-center gap-1.5 rounded-btn bg-teal px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-dark">
              See plans &amp; pricing <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <PageCta
        heading="See where your policies stand — before an inspector does."
        sub="Start a free 14-day trial, or book a demo and we'll show you a live coverage report."
        primary={{ href: '/register', label: 'Start Free Trial' }}
        secondary={{ href: '/demo', label: 'Book a Demo' }}
      />
    </>
  )
}
