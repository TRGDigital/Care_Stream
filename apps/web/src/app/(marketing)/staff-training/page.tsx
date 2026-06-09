import Link from 'next/link'
import {
  CheckCircle2, Mail, Globe, BarChart2,
  Bell, RefreshCw, Brain, ShieldCheck, Zap, Users,
  MessageSquare, Mic, Smartphone, Sparkles, GraduationCap, BadgeCheck, Clock,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { SiteImage } from '@/components/site-image'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type StandardModule = {
  id: string
  name: string
  description: string
  frequency: string
  duration_minutes: number | null
  pass_mark: number
  cpd_accredited: boolean
  illustration_url: string | null
}

async function getStandardModules(): Promise<StandardModule[]> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { next: { revalidate: 60 } })
    if (res.ok) {
      const body = await res.json()
      return (body?.data?.modules ?? []) as StandardModule[]
    }
  } catch {
    // fall through to an empty list
  }
  return []
}

export const metadata = {
  title:       'Staff Training and Compliance | CareStreamAI',
  description: 'Move beyond annual tick-box training. CareStream generates training modules from your own policies, keeps your team engaged in the hub all year, and tracks compliance with automatic renewal reminders.',
  openGraph: {
    title: 'Staff Training and Compliance | CareStreamAI',
    description: 'Training modules built from your own policies, delivered in the hub all year, with a full compliance dashboard.',
    url: 'https://carestreamai.com/staff-training',
  },
}

// ── Training Dashboard Mockup ─────────────────────────────────────────────────

function TrainingDashboardMockup() {
  const modules = [
    { name: 'Safeguarding Adults', completed: 22, total: 26 },
    { name: 'Fire Safety',         completed: 19, total: 26 },
    { name: 'Medication Admin',    completed: 17, total: 26 },
    { name: 'Infection Control',   completed: 14, total: 26 },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Training Compliance</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">73%</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">compliant</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Complete',    value: '18', color: 'text-green-600' },
          { label: 'In progress', value: '5',  color: 'text-amber-500' },
          { label: 'Overdue',     value: '3',  color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-3 text-center">
            <p className={`text-base font-extrabold ${color}`}>{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Module completion</p>
        <div className="space-y-3">
          {modules.map(({ name, completed, total }) => (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-dark">{name}</p>
                <p className="text-[10px] text-neutral-mid">{completed}/{total}</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-1.5 rounded-full bg-teal"
                  style={{ width: `${Math.round((completed / total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-amber-100 bg-amber-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <Bell size={13} className="flex-shrink-0 text-amber-600" />
          <p className="text-[11px] font-medium text-amber-800">3 renewals due in the next 7 days</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function StaffTrainingPage() {
  const modules = await getStandardModules()
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
              <SectionLabel light>Staff Training and Compliance</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Once a year is not enough. CareStream keeps training front of mind all year round.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                Annual compliance training is a legal obligation, but a single renewal date does nothing for day-to-day knowledge retention. CareStream builds training modules from your own policies and keeps your whole team engaged with them in the hub throughout the year.
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
              <TrainingDashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Problem With Annual Training</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Staff forget most of what they learn within days.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  Research consistently shows that people forget up to 70% of new information within 24 hours
                  without reinforcement. Yet the care sector still treats annual compliance training as the
                  gold standard. One renewal date. One completion record. Job done.
                </p>
                <p>
                  CQC expects your staff to actually apply their training in daily care delivery, not just
                  complete it once a year. The gap between a completion certificate and genuine working
                  knowledge is where risk lives.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: '📅',
                  label: 'Traditional annual training',
                  text: 'Staff complete a module once per year. A record is made. The knowledge fades within weeks and no one knows.',
                  dim: true,
                },
                {
                  icon: '💬',
                  label: 'CareStream training',
                  text: 'Modules built from your own policies, knowledge checks, and renewal reminders are delivered in the hub throughout the year, so knowledge is reinforced rather than left to fade.',
                  dim: false,
                },
              ].map(({ icon, label, text, dim }) => (
                <div
                  key={label}
                  className={`card-lift rounded-2xl p-6 ${
                    dim
                      ? 'border border-gray-100 bg-white shadow-card'
                      : 'bg-teal-gradient shadow-teal-glow'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${dim ? 'text-neutral-mid' : 'text-white/60'}`}>
                      {label}
                    </p>
                  </div>
                  <p className={`leading-relaxed ${dim ? 'text-neutral-mid' : 'text-white'}`}>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>How CareStream Training Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Choose or build a module, assign it, and track every answer.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Use the ready-made standard library for common mandatory topics, or have CareStream
            generate a module from your own policies. Either way, staff complete it in the hub and
            you see exactly where everyone stands.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: CheckCircle2,
                title: 'Choose or generate a module',
                body: 'Assign a ready-made module from the standard library covering safeguarding, fire safety, manual handling, infection control, and more, or have CareStream generate a tailored module from your own policy documents. Assign to individuals or whole teams from the dashboard.',
              },
              {
                step: '02',
                Icon: MessageSquare,
                title: 'Questions delivered in the hub',
                body: 'Each module contains multiple-choice questions with four options. CareStream nudges staff in the hub the moment a module is assigned, or waits for the staff member to start when it suits them. You choose which mode suits your team.',
              },
              {
                step: '03',
                Icon: BarChart2,
                title: 'Progress tracked in real time',
                body: 'Every answer is recorded. The compliance dashboard shows exactly who has completed what, who is in progress, and whose renewal is coming up, giving you a live picture of training compliance across your whole team.',
              },
            ].map(({ step, Icon, title, body }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                    {step}
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                    <Icon size={18} className="text-teal" />
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Two kinds of training ─────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Two Kinds of Training</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Ask anything any time, and cover every mandatory subject.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            CareStream covers both sides of training in one hub: quick, ad-hoc questions you send
            whenever you need them, and full annual modules for every mandatory subject.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-card">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-light">
                <MessageSquare size={22} className="text-teal" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-neutral-dark">Ad-hoc questions and knowledge checks</h3>
              <p className="mb-4 leading-relaxed text-neutral-mid">
                Raise a question or a knowledge check and send it to any staff member whenever you want.
                They answer in their own words in the hub, the AI marks it with feedback, and you see
                exactly who knows what. Ideal for a quick refresher after an incident, an audit finding,
                or a policy change.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {['Sent and answered in the hub', 'Marked instantly with feedback', 'Perfect for spot-checks and refreshers'].map((p) => (
                  <li key={p} className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />{p}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-teal/20 bg-teal/5 p-8 shadow-card">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-white shadow-teal-glow">
                <GraduationCap size={22} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-neutral-dark">Annual mandatory training modules</h3>
              <p className="mb-4 leading-relaxed text-neutral-mid">
                A full library of teach-then-assess modules covering every mandatory subject, ready to
                assign and included as standard. Each module teaches the topic, applies it to a real care
                scenario, and finishes with an assessment, with automatic renewal reminders so nobody
                falls out of date.
              </p>
              <ul className="space-y-2 text-sm text-neutral-mid">
                {['Every mandatory subject, ready to assign', 'Teach, scenario and assessment in each module', 'Renewal reminders at 90, 30 and 7 days'].map((p) => (
                  <li key={p} className="flex items-start gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-teal" />{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Annual mandatory training library ─────────────────────────────── */}
      {modules.length > 0 && (
        <section className="bg-neutral-light py-24">
          <div className="mx-auto max-w-content px-6">
            <SectionLabel>Annual Mandatory Training Library</SectionLabel>
            <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
              Every mandatory module, ready to assign.
            </h2>
            <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
              The standard library covers the mandatory training every care service needs, grounded in
              best practice for UK adult social care. Each module is a complete teach-then-assess course
              with its own cover, learning sections, a real care scenario, and an assessment.
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <div key={m.id} className="card-lift flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                  <div className="relative aspect-[16/10] overflow-hidden bg-teal-light">
                    {m.illustration_url ? (
                      <SiteImage src={`${API_URL}${m.illustration_url}`} alt={m.name} className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-teal-gradient">
                        <GraduationCap size={44} className="text-white/80" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-teal">
                      {m.frequency === 'annual' ? 'Annual' : m.frequency}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="mb-2 font-bold leading-snug text-neutral-dark">{m.name}</h3>
                    <p className="mb-4 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-mid">{m.description}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-mid">
                      {m.duration_minutes ? (
                        <span className="flex items-center gap-1"><Clock size={12} /> {(m.duration_minutes / 60).toFixed(1)} hours</span>
                      ) : null}
                      <span>Pass mark {m.pass_mark}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 text-sm text-neutral-mid">
              Every standard module is included and ready to assign. You can also generate tailored
              modules from your own policies.
            </p>
          </div>
        </section>
      )}

      {/* ── Built from your policies ──────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Built From Your Own Policies</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            Training modules generated from your policies, not generic content.
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                A complete module that teaches, applies, and assesses.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                CareStream can generate a full training module from your own policy documents. It reads
                the relevant policies, then writes a module that teaches the topic in short sections,
                walks staff through a real care home scenario, and checks understanding as it goes,
                finishing with a full assessment.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Every generated module is a draft until you approve it. You review it, edit anything you
                want, and only then does it reach your staff. The standard library of ready-made modules
                is included, and tailored modules generated from your own policies use one AI credit each.
              </p>
              <div className="space-y-3">
                {[
                  { Icon: Sparkles,      label: 'Teach then assess',  text: 'Each module teaches a topic in short sections, applies it to a real scenario, and finishes with a full assessment of four-option questions.' },
                  { Icon: GraduationCap, label: 'Learn and retry',    text: 'A staff member who gets a question wrong gets a short re-teach on that point and tries again, so the gap is closed, not just recorded.' },
                  { Icon: BadgeCheck,    label: 'External sign-off',  text: 'Send a module to an external specialist through a secure link so they can review and sign it off, giving you independent assurance for inspectors.' },
                ].map(({ Icon, label, text }) => (
                  <div key={label} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <Icon size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{label}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generated module mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="relative h-24 bg-teal-gradient">
                  <span className="absolute left-3 top-3 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">Draft, awaiting approval</span>
                  <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">Tailored, 1 credit</span>
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-white">
                    <Sparkles size={13} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">AI-generated module</span>
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="mb-3 text-sm font-bold text-neutral-dark">Annual Refresher: Medication Management</h4>
                  <div className="space-y-2">
                    {[
                      { tag: 'Teach',    text: 'Safe administration and the five rights' },
                      { tag: 'Scenario', text: 'A resident refuses their prescribed medication' },
                      { tag: 'Check',    text: 'One quick knowledge check' },
                    ].map(({ tag, text }) => (
                      <div key={tag} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                        <span className="rounded-full bg-teal/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-teal">{tag}</span>
                        <span className="text-[11px] text-neutral-dark">{text}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-lg border border-teal/20 bg-teal/5 px-3 py-2">
                    <p className="text-[11px] font-semibold text-teal">Assessment: 20 questions, four options each</p>
                  </div>
                  <p className="mt-3 text-[10px] text-neutral-mid">Grounded in your medicines policy and 5 more sources.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Channel mockups ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>See It In Action</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            Training answered in the hub, in seconds, in any language.
          </h2>

          {/* ── The hub ── */}
          <div className="mb-12 grid items-start gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-light">
                  <Smartphone size={18} className="text-teal" />
                </div>
                <span className="text-xl font-bold text-neutral-dark">The hub</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Policy questions and training questions, together in one place.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                The hub is where your staff already ask policy questions. Training questions appear in
                the same place. A staff member opens the hub on their phone, answers the question waiting
                for them, and the record updates the moment they reply.
              </p>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Staff can also ask about any training topic at any time, by typing or speaking, and get
                an accurate answer drawn from the module and your source materials.
              </p>
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">Answered in over 60 languages.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { flag: '🇬🇧', name: 'English' },
                    { flag: '🇵🇱', name: 'Polski' },
                    { flag: '🇵🇭', name: 'Filipino' },
                    { flag: '🇷🇴', name: 'Română' },
                    { flag: '🇵🇹', name: 'Português' },
                  ].map(({ flag, name }) => (
                    <span key={name} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark ring-1 ring-gray-200">
                      <span>{flag}</span>
                      <span>{name}</span>
                    </span>
                  ))}
                  <span className="flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-mid ring-1 ring-gray-200">+ 55 more</span>
                </div>
              </div>
            </div>

            {/* Hub mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                {/* App header */}
                <div className="flex items-center justify-between bg-teal px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">CareStream</p>
                    <p className="text-[11px] text-white/70">Crossways Care Home</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-white/20 text-center text-xs font-bold leading-7 text-white">SJ</div>
                </div>
                {/* Chat area */}
                <div className="space-y-3 bg-gray-50 p-4">
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[85%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="mb-0.5 text-[11px] font-semibold text-teal">Training: Medication Management</p>
                      <p className="mb-2 text-[10px] text-gray-400">Question 1 of 5</p>
                      <p className="mb-2.5 text-xs font-medium leading-snug text-gray-800">
                        A resident refuses their prescribed medication. What should you do first?
                      </p>
                      <div className="space-y-1 text-[11px] text-gray-600">
                        <p><span className="font-bold">A)</span> Administer it anyway as it is prescribed</p>
                        <p><span className="font-bold">B)</span> Contact the GP immediately</p>
                        <p className="rounded bg-teal/10 px-1.5 py-0.5 font-semibold text-teal">
                          <span className="font-bold">C)</span> Inform the nurse in charge and document ✓
                        </p>
                        <p><span className="font-bold">D)</span> Try again in 30 minutes without documenting</p>
                      </div>
                      <p className="mt-2 text-[10px] italic text-gray-400">Reply A, B, C, or D</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-4 py-2 text-sm font-bold text-white">
                      C
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[85%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-gray-800">✅ <span className="font-semibold">Correct.</span> Well done, Sarah.</p>
                      <p className="mt-1 text-[11px] text-gray-400">Question 2 of 5. Reply when you are ready.</p>
                    </div>
                  </div>
                </div>
                {/* Input bar */}
                <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
                  <div className="flex-1 rounded-full border border-gray-200 px-4 py-1.5 text-[11px] text-gray-300">Ask a question or type A, B, C, D</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal"><Mic size={13} /></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Email ── */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            {/* Email mockup, left on desktop */}
            <div className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-[11px] text-gray-400">
                    policies@crossways.carestreamai.co.uk
                  </div>
                </div>
                {/* Email header */}
                <div className="border-b border-gray-100 bg-white px-5 py-4">
                  <div className="mb-0.5 text-[11px] text-gray-400">From: <span className="text-gray-600">CareStream Training &lt;noreply@carestreamai.co.uk&gt;</span></div>
                  <div className="mb-0.5 text-[11px] text-gray-400">To: <span className="text-gray-600">sarah.jones@crosswayscare.co.uk</span></div>
                  <div className="text-[11px] text-gray-400">Subject: <span className="font-semibold text-gray-800">Training: Fire Safety</span></div>
                </div>
                {/* Email body */}
                <div className="bg-white px-5 py-4">
                  <p className="mb-1 text-sm text-gray-700">Hi Sarah,</p>
                  <p className="mb-4 text-xs leading-relaxed text-gray-500">You have a training question to complete. Please reply with a single letter.</p>
                  {/* Training card */}
                  <div className="rounded-lg border-l-4 border-teal bg-teal/5 p-4">
                    <p className="mb-0.5 text-xs font-bold text-teal">Training: Fire Safety</p>
                    <p className="mb-3 text-[11px] text-gray-400">Question 4 of 6</p>
                    <p className="mb-3 text-xs font-medium leading-snug text-gray-800">
                      In the event of a fire alarm sounding, what is the correct immediate action for care staff?
                    </p>
                    <div className="space-y-1.5 text-[11px] text-gray-700">
                      <p><span className="font-bold">A)</span> Call 999 before taking any other action</p>
                      <p><span className="font-bold">B)</span> Investigate the source before evacuating residents</p>
                      <p className="rounded bg-teal/10 px-2 py-0.5 font-semibold text-teal">
                        <span className="font-bold">C)</span> Activate the nearest call point and begin evacuation ✓
                      </p>
                      <p><span className="font-bold">D)</span> Wait for a manager to confirm action</p>
                    </div>
                    <p className="mt-3 text-[10px] italic text-gray-400">Reply to this email with just a single letter: A, B, C, or D.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                  <Mail size={18} className="text-blue-600" />
                </div>
                <span className="text-xl font-bold text-neutral-dark">Email</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Prefer email? Training arrives in the inbox. The reply takes one keystroke.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Staff who would rather use email get their training questions there automatically, and
                the thread is preserved so replies are handled in the same conversation with no separate
                system needed.
              </p>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                The correct answer is highlighted in the feedback reply, and the compliance record is
                updated the moment the response lands.
              </p>
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">Answered in over 60 languages.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { flag: '🇮🇳', name: 'हिन्दी' },
                    { flag: '🇪🇸', name: 'Español' },
                    { flag: '🇧🇩', name: 'বাংলা' },
                    { flag: '🇳🇬', name: 'Yorùbá' },
                    { flag: '🇱🇹', name: 'Lietuvių' },
                  ].map(({ flag, name }) => (
                    <span key={name} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark ring-1 ring-gray-200">
                      <span>{flag}</span>
                      <span>{name}</span>
                    </span>
                  ))}
                  <span className="flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-mid ring-1 ring-gray-200">+ 55 more</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── The ongoing engagement angle ──────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>Beyond the Renewal Date</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            Training that works throughout the year, not only when it is due.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            The most powerful part of CareStream training is not the renewal certificate.
            It is what happens between renewals.
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: Brain,
                title: 'Ad-hoc knowledge checks',
                body: 'CareStream can send training module questions to staff at any point in the year, not only at renewal. Spaced repetition keeps critical knowledge like safeguarding, medication management, and infection control fresh.',
              },
              {
                Icon: MessageSquare,
                title: 'Staff can ask training questions any time',
                body: 'A staff member who wants to refresh their knowledge on a training topic can ask CareStream directly in the hub or by email. They get an accurate answer drawn from the training module and source materials, instantly.',
              },
              {
                Icon: GraduationCap,
                title: 'Learn and retry',
                body: 'When a staff member gets a question wrong, they get a short re-teach on that exact point and try again. The gap in knowledge is closed at the moment it shows up, not just logged.',
              },
              {
                Icon: RefreshCw,
                title: 'Renewal reminders at 90, 30, and 7 days',
                body: 'Automatic reminders go to each staff member as their renewal date approaches, and managers receive a renewal digest listing what is coming up. No spreadsheets and no manual chasing.',
              },
              {
                Icon: Zap,
                title: 'Immediate delivery on assignment',
                body: 'With auto-send mode enabled, the moment a manager assigns a module the first question is delivered to the hub. Staff can make a start on their phone during a break.',
              },
              {
                Icon: Users,
                title: 'Individual tracking at scale',
                body: 'Whether you have 10 staff or 200, the compliance dashboard shows every individual status across every module. See who is current, in progress, and overdue at a glance.',
              },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="card-lift rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/20">
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

      {/* ── CQC evidence angle ────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>CQC Evidence</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            An audit trail that goes far beyond a completion date.
          </h2>
          <div className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            <p>
              When a CQC inspector asks how you ensure staff knowledge is current, a completion
              date from 11 months ago is a weak answer. CareStream gives you something far stronger.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>What CareStream records</span>
              <span>What this shows an inspector</span>
            </div>
            {[
              [
                'Training completion per staff member',
                'Every module completed, with the exact date and the result on each question. Not a bulk export from a third-party LMS.',
              ],
              [
                'Individual question answers',
                'The specific question asked, the answer given, and whether it was correct. Evidence that knowledge was tested, not just time was logged.',
              ],
              [
                'Ongoing knowledge checks between renewals',
                'Proof that training knowledge is actively reinforced throughout the year, directly addressing the question of how you maintain competence.',
              ],
              [
                'External specialist sign-off',
                'Where a module was reviewed and signed off by an external specialist through a secure link, that approval is on record as independent assurance.',
              ],
              [
                'Renewal reminder delivery',
                'Evidence that reminders were sent 90, 30, and 7 days before each renewal, showing a structured, proactive renewal management process.',
              ],
              [
                'Manager compliance overview',
                'The compliance dashboard shows the state of training across the whole team at any point in time. The evidence an inspector wants, of a manager actively monitoring.',
              ],
            ].map(([what, why], i) => (
              <div key={what} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 5 ? 'border-b border-gray-100' : ''}`}>
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
            The complete training compliance toolkit.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck,   label: 'Standard module library',    desc: 'Ready-made modules for safeguarding, fire safety, manual handling, infection control, and more. Assign immediately, included as standard.', iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
              { icon: Sparkles,      label: 'Built from your policies',    desc: 'Generate a tailored module from your own policy documents. Teach, scenario, knowledge check, and a full assessment. Uses one AI credit.',  iconBg: 'bg-purple-100',  iconColor: 'text-purple-600' },
              { icon: Brain,         label: 'Teach then assess',          desc: 'Short teaching sections and a real scenario, then four-option multiple-choice questions. Every answer tracked and logged.',               iconBg: 'bg-green-100',   iconColor: 'text-green-600' },
              { icon: GraduationCap, label: 'Learn and retry',            desc: 'A wrong answer triggers a short re-teach and another go, so knowledge gaps are closed at the moment they appear.',                        iconBg: 'bg-orange-100',  iconColor: 'text-orange-600' },
              { icon: BadgeCheck,    label: 'External specialist sign-off', desc: 'Send a module to an external specialist through a secure link for independent review and sign-off.',                                       iconBg: 'bg-teal-light',  iconColor: 'text-teal' },
              { icon: Bell,          label: 'Renewal reminders',          desc: 'Automatic reminders to staff at 90, 30, and 7 days before renewal, plus a renewal digest for managers.',                                  iconBg: 'bg-amber-100',   iconColor: 'text-amber-600' },
              { icon: BarChart2,     label: 'Live compliance dashboard',  desc: 'Real-time view of every staff member status across every module, with who is current, in progress, and overdue.',                          iconBg: 'bg-indigo-100',  iconColor: 'text-indigo-600' },
              { icon: Users,         label: 'Delivered in the hub',       desc: 'Staff answer in the hub on their phone, in over 60 languages, by typing or speaking. Email is there for anyone who prefers it.',         iconBg: 'bg-cyan-100',    iconColor: 'text-cyan-600' },
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

      {/* ── Quote / pull stat ─────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-16 text-center md:gap-0 md:grid-cols-2 md:divide-x md:divide-gray-100">
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">70%</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                of information is forgotten within 24 hours without reinforcement.
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                Research consistently shows that a single annual session cannot sustain working knowledge through the year.
              </p>
            </div>
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">All year</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                knowledge checks and reminders, not a single date in the calendar.
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                One question at a time, in the hub, whenever it suits. No session to attend and no rigid structure.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Turn compliance training into a year-round conversation."
        sub="See how CareStream training works for your team."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
