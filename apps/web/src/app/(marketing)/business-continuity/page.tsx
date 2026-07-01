import Link from 'next/link'
import {
  CheckCircle2, MessageSquare, BarChart2,
  ShieldCheck, Users, Brain, Zap, Bell, AlertTriangle, FileText,
  RefreshCw, BookOpen, ShieldAlert,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title:       'Business Continuity Planning | CareStreamAI',
  description: 'Ensure your care setting can maintain safe operations during any disruption. CareStreamAI makes your business continuity plan instantly queryable by all staff via the hub, email, and voice, at any time.',
  openGraph: {
    title: 'Business Continuity Planning | CareStreamAI',
    description: 'Your business continuity plan, instantly queryable by every staff member, any time.',
    url: 'https://www.carestreamai.com/business-continuity',
  },
}

// ── BC Plan Coverage Card ─────────────────────────────────────────────────────

function BCPlanMockup() {
  const scenarios = [
    { name: 'Key staff absence',     status: 'Covered', dot: 'bg-green-500', text: 'text-green-600' },
    { name: 'IT system failure',     status: 'Covered', dot: 'bg-green-500', text: 'text-green-600' },
    { name: 'Power outage',          status: 'Covered', dot: 'bg-green-500', text: 'text-green-600' },
    { name: 'Severe weather',        status: 'Partial', dot: 'bg-amber-400', text: 'text-amber-500' },
    { name: 'Supply chain failure',  status: 'Partial', dot: 'bg-amber-400', text: 'text-amber-500' },
    { name: 'Communication failure', status: 'Review',  dot: 'bg-red-400',   text: 'text-red-500'   },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Business Continuity</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">4/6</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">scenarios</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Covered', value: '3', color: 'text-green-600' },
          { label: 'Partial', value: '2', color: 'text-amber-500' },
          { label: 'Review',  value: '1', color: 'text-red-500'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-3 text-center">
            <p className={`text-base font-extrabold ${color}`}>{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Scenario coverage</p>
        <div className="space-y-2.5">
          {scenarios.map(({ name, status, dot, text }) => (
            <div key={name} className="flex items-center justify-between">
              <p className="text-xs font-medium text-neutral-dark">{name}</p>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <p className={`text-[10px] font-semibold ${text}`}>{status}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
        <p className="text-[10px] text-neutral-mid">Plan last reviewed: <span className="font-semibold text-neutral-dark">14 May 2026</span></p>
      </div>
      <div className="border-t border-amber-100 bg-amber-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="flex-shrink-0 text-amber-600" />
          <p className="text-[11px] font-medium text-amber-800">2 scenarios need updated procedures before your July review.</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BusinessContinuityPage() {
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
              <SectionLabel light>Business Continuity</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                When things go wrong, your staff need answers fast. Not a folder they have never read.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                CQC requires every registered care service to have a business continuity plan. But
                a plan that sits in a filing cabinet and has never been accessed by frontline staff
                is not a plan your service can actually use. CareStreamAI makes every procedure in
                your plan instantly queryable by any member of your team, on any channel, at any time.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
                <Link href="/demo"     className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <BCPlanMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Problem With Business Continuity Plans</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Most BC plans are written for inspectors. Not for staff who need them at 2am.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  Care setting managers spend hours writing business continuity plans that cover power
                  failures, staff shortages, IT outages, severe weather, and supply disruptions.
                  Those plans are filed, reviewed at the annual inspection, and rarely opened again.
                </p>
                <p>
                  When a real disruption happens, the care worker on a night shift does not know
                  where the plan is, what it says about their specific scenario, or who to contact.
                  CareStreamAI makes the plan accessible to everyone, in the moment they need it,
                  on the phone already in their pocket.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: '📁',
                  label: 'Traditional BC plan',
                  text: 'A detailed document that satisfies inspectors during a visit, but which frontline staff have never read and cannot access during an actual disruption.',
                  dim: true,
                },
                {
                  icon: '💬',
                  label: 'CareStreamAI BC plan',
                  text: 'Your business continuity procedures are uploaded as knowledge and instantly queryable by any staff member via the hub, email, or voice, even when other systems are unavailable.',
                  dim: false,
                },
              ].map(({ icon, label, text, dim }) => (
                <div
                  key={label}
                  className={`card-lift rounded-2xl p-6 ${dim ? 'border border-gray-100 bg-white shadow-card' : 'bg-teal-gradient shadow-teal-glow'}`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${dim ? 'text-neutral-mid' : 'text-white/60'}`}>{label}</p>
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
          <SectionLabel>How CareStreamAI Business Continuity Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Upload your plan once. Your whole team can query it instantly.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            No new system. No login. No session to attend. Your business continuity plan becomes
            a live, queryable resource that any staff member can access via the hub or email,
            even when your care management system or internet connection is unavailable.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: BookOpen,
                title: 'Upload your business continuity plan',
                body: 'Add your business continuity plan to the CareStreamAI knowledge base. It joins your policies, procedures, and other documents as a source the AI can draw from when staff ask questions. Updates to the plan are reflected immediately.',
              },
              {
                step: '02',
                Icon: MessageSquare,
                title: 'Staff ask what to do in any scenario',
                body: 'During a disruption, any staff member can ask CareStreamAI exactly what the procedure is for their specific situation. Via the hub, email, or voice, they get an answer drawn from your actual plan, not a generic response.',
              },
              {
                step: '03',
                Icon: ShieldAlert,
                title: 'Gaps in your plan are surfaced automatically',
                body: 'CareStreamAI identifies questions your staff ask that your current plan does not cover. The policy gaps report shows you which scenarios are undocumented, so you can update the plan before a real disruption exposes the weakness.',
              },
            ].map(({ step, Icon, title, body }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
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

      {/* ── See it in action ──────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>See It In Action</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            A staff member gets the right answer in under 30 seconds during a live incident.
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                The answer comes from your plan. Not from memory.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                When a care worker asks what to do during a specific disruption, CareStreamAI
                retrieves the relevant section of your business continuity plan and delivers a
                clear, step-by-step response. The answer is specific to your service and your
                procedures, not a generic guide.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Because the response comes via the hub or email, staff can access it on any
                device, even when your care management system or internet connection is down.
              </p>
              <div className="space-y-3">
                {[
                  { scenario: 'Staff shortage',  q: 'We have three call-outs this morning and cannot safely cover the floor. What is the procedure?' },
                  { scenario: 'IT outage',       q: 'The care management system is down on a night shift and we cannot access care records. What do we do?' },
                  { scenario: 'Severe weather',  q: 'Two members of staff cannot get in due to snow. What are the steps for managing a weather-related staff shortage?' },
                ].map(({ scenario, q }) => (
                  <div key={scenario} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <span className="mb-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal">{scenario}</span>
                    <p className="text-sm font-medium leading-snug text-neutral-dark">{q}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                <div className="flex items-center justify-between bg-teal px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">CareStreamAI</p>
                    <p className="text-[11px] text-white/70">Crossways Care Home</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-white/20 text-center text-xs font-bold leading-7 text-white">NL</div>
                </div>
                <div className="space-y-3 bg-gray-50 p-4">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
                      <p className="text-xs text-white">The care system is down on nights and we cannot access resident records. What should we do?</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="mb-0.5 text-[10px] font-semibold text-teal">From your Business Continuity Plan</p>
                      <p className="mb-2 text-xs font-medium text-gray-800">IT System Failure: Night Shift Procedure</p>
                      <div className="space-y-1.5 text-[11px] leading-relaxed text-gray-600">
                        <p><span className="font-bold">1.</span> Activate paper-based care records from the red folder in the office.</p>
                        <p><span className="font-bold">2.</span> Contact the on-call manager to notify them of the outage.</p>
                        <p><span className="font-bold">3.</span> Document all care delivered manually until the system is restored.</p>
                      </div>
                      <p className="mt-2 text-[10px] italic text-gray-400">Source: BC Plan, Section 4.2</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
                      <p className="text-xs text-white">Thank you, that is really helpful.</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
                  <div className="flex-1 rounded-full border border-gray-200 px-4 py-1.5 text-[11px] text-gray-300">Ask a question...</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Resilience features ───────────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>Built for Real Disruptions</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            A business continuity resource that actually works when things go wrong.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            The true test of a business continuity plan is not whether it satisfies an inspector.
            It is whether a care worker on a night shift can use it.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: Zap,
                title: 'Accessible on any device when other systems are down',
                body: 'The hub runs on any phone or browser, independently of your care management system, your local network, and your building infrastructure. Staff can access your BC plan procedures even when everything else is unavailable.',
              },
              {
                Icon: ShieldAlert,
                title: 'Automatic gap detection',
                body: 'When staff ask questions that your current plan does not cover, CareStreamAI flags the gap in the policy gaps report. You find weaknesses before an incident exposes them.',
              },
              {
                Icon: RefreshCw,
                title: 'Instant plan updates',
                body: 'When you revise your business continuity plan, the updated version is available to all staff immediately. No printing, no distribution, no waiting for the next staff meeting.',
              },
              {
                Icon: Users,
                title: 'Accessible to every staff member',
                body: 'Every member of your team can query the plan, not only managers. A care worker, a kitchen assistant, or a new starter can ask what to do in a specific scenario and get the right answer.',
              },
              {
                Icon: Brain,
                title: 'Staff familiarisation testing',
                body: 'Use CareStreamAI to send scenario-based questions about your business continuity procedures to staff as part of their onboarding or annual refresher. Build genuine familiarity, not just a signed acknowledgement.',
              },
              {
                Icon: ShieldCheck,
                title: 'CQC-ready evidence at all times',
                body: 'Every staff query to the BC plan is logged. When an inspector asks how your staff access continuity procedures in a real emergency, you have a timestamped record of exactly how the plan is used.',
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
            Evidence that your business continuity plan is genuinely embedded in practice.
          </h2>
          <div className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            <p>
              CQC inspectors assess whether your business continuity arrangements are robust and
              whether staff know what to do in an emergency. A written plan is necessary but not
              sufficient. CareStreamAI gives you the evidence that the plan is actually used.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>What CareStreamAI records</span>
              <span>What this shows an inspector</span>
            </div>
            {[
              ['Staff queries to the BC plan', 'A log of every time a staff member accessed the business continuity plan via a question, showing it is a working resource rather than a document filed away for inspection purposes.'],
              ['Specific scenarios queried', 'The exact scenarios staff have asked about, demonstrating which parts of the plan are actively known and where gaps in staff awareness exist.'],
              ['Gap detection and remediation', 'When the system identifies a scenario not covered by the current plan, and the manager updates the plan in response, that sequence is recorded as evidence of active plan management.'],
              ['Staff familiarisation testing', 'Records of scenario-based questions sent to staff about BC procedures, showing that familiarisation with the plan is a formal, tracked activity and not just a one-off briefing.'],
              ['After-hours and out-of-hours access', 'Queries made outside normal working hours demonstrate that the plan is accessible to night staff and weekend workers, not only to managers during the working day.'],
              ['Plan review dates and update history', 'The knowledge base records when each version of the plan was uploaded, providing a clear audit trail of review activity that satisfies the requirement for regular plan maintenance.'],
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
            A business continuity plan your whole team can actually use.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen,    label: 'Queryable BC plan',               desc: 'Upload your business continuity plan to the knowledge base and make every procedure instantly accessible to any staff member on any channel.',               iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
              { icon: MessageSquare, label: 'Hub, email and voice access',     desc: 'Staff query the plan on the same channels they use for policy questions. No new system and no separate login.',                                              iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
              { icon: Zap,         label: 'Offline-resilient delivery',       desc: 'The hub runs on any internet-connected device, independently of your care management system. The plan remains accessible even when other systems are unavailable.', iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
              { icon: ShieldAlert, label: 'Automatic gap detection',          desc: 'Questions staff ask that the plan cannot answer are surfaced in the policy gaps report, helping you identify and fix weaknesses proactively.',                iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
              { icon: Brain,       label: 'Staff familiarisation testing',    desc: 'Send scenario-based questions about BC procedures to staff as part of onboarding or annual review. Build genuine familiarity.',                               iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
              { icon: RefreshCw,   label: 'Instant plan updates',             desc: 'When you revise the plan, the updated version is available immediately to all staff. No printing and no distribution required.',                               iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
              { icon: BarChart2,   label: 'Query analytics',                  desc: 'See which scenarios staff ask about most frequently, which sections of the plan are accessed in real incidents, and where knowledge gaps are concentrated.',   iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
              { icon: FileText,    label: 'CQC-ready audit log',              desc: 'A full log of all staff interactions with the BC plan, providing timestamped evidence that the plan is a genuinely embedded operational resource.',            iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
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
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-12 text-center md:gap-0 md:grid-cols-2 md:divide-x md:divide-gray-100">
            <div className="md:pr-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">30 sec</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                average time for a staff member to get a specific BC procedure in the hub.
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                The same time it takes to find the right person to call, your staff already have
                the answer and can act.
              </p>
            </div>
            <div className="md:pl-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">24/7</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                your business continuity plan is accessible to every shift, including nights and weekends.
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                Disruptions do not only happen during office hours. CareStreamAI is available at all times on all channels.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Turn your business continuity plan into a resource your whole team can actually use."
        sub="See how CareStreamAI business continuity works for your service."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
