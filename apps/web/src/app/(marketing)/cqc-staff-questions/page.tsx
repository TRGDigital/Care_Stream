import Link from 'next/link'
import {
  CheckCircle2, MessageSquare, BarChart2,
  ShieldCheck, Users, Brain, Zap, Bell, AlertTriangle, FileText, ClipboardList, Target,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title:       'CQC Staff Preparation Questions | CareStreamAI',
  description: 'Prepare your care staff to answer CQC inspector questions with confidence. CareStreamAI delivers practice questions aligned to the five key lines of enquiry through WhatsApp, email, and chat.',
  openGraph: {
    title: 'CQC Staff Preparation Questions | CareStreamAI',
    description: 'Practice CQC inspector questions aligned to the five key lines of enquiry — delivered via WhatsApp, email, and chat.',
    url: 'https://carestreamai.com/cqc-staff-questions',
  },
}

// ── CQC Readiness Score Card ──────────────────────────────────────────────────

function CQCReadinessMockup() {
  const categories = [
    { name: 'Safe',       score: 88, color: 'bg-green-500' },
    { name: 'Effective',  score: 74, color: 'bg-teal' },
    { name: 'Caring',     score: 92, color: 'bg-green-500' },
    { name: 'Responsive', score: 63, color: 'bg-amber-500' },
    { name: 'Well-led',   score: 71, color: 'bg-teal' },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CQC Staff Readiness</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">78%</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">prepared</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Confident',   value: '19', color: 'text-green-600' },
          { label: 'Developing',  value: '6',  color: 'text-amber-500' },
          { label: 'Not started', value: '1',  color: 'text-red-500'   },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-3 text-center">
            <p className={`text-base font-extrabold ${color}`}>{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Key lines of enquiry</p>
        <div className="space-y-3">
          {categories.map(({ name, score, color }) => (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-dark">{name}</p>
                <p className="text-[10px] font-semibold text-neutral-mid">{score}%</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-amber-100 bg-amber-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={13} className="flex-shrink-0 text-amber-600" />
          <p className="text-[11px] font-medium text-amber-800">Responsive category below target. Focus recommended.</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CQCStaffQuestionsPage() {
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
              <SectionLabel light>CQC Staff Preparation</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                CQC inspectors speak to your staff directly. Are they ready to answer?
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                During every CQC inspection, inspectors speak to frontline care workers individually
                and ask them about safeguarding, medication, care planning, and values. Staff who have
                never practiced those conversations give hesitant, inconsistent answers. CareStreamAI
                prepares every member of your team before the inspector arrives.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
                <Link href="/demo"     className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <CQCReadinessMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Problem With Unprepared Staff</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Inspectors ask your care workers questions you cannot predict in advance.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  CQC inspectors are trained to seek out inconsistency. When they speak to a senior
                  carer on the floor and ask how the service handles a safeguarding concern, a vague
                  answer raises a flag. When three different staff give three different answers to
                  the same question, that becomes a finding.
                </p>
                <p>
                  Most managers focus inspection preparation on documentation, policies, and paperwork.
                  The staff conversations are left to chance. CareStreamAI closes that gap by giving
                  every member of your team regular practice with the exact types of questions
                  inspectors ask.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: '📋',
                  label: 'Without preparation',
                  text: 'Staff give vague, inconsistent answers to inspector questions. Gaps in knowledge become visible in conversation, not in documentation.',
                  dim: true,
                },
                {
                  icon: '✅',
                  label: 'With CareStreamAI',
                  text: 'Staff have practiced answering questions across all five key lines of enquiry via WhatsApp, email, and chat. Their answers are confident, consistent, and accurate.',
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
          <SectionLabel>How CareStreamAI Staff Prep Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Practice questions delivered through the channels your team already uses.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            No training day. No login. No LMS. Questions aligned to the five CQC key lines of
            enquiry are delivered to each staff member via WhatsApp, email, or the chat portal,
            and their readiness is tracked in real time.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: ClipboardList,
                title: 'Questions mapped to every KLOE',
                body: 'CareStreamAI includes a library of practice questions covering all five CQC key lines of enquiry: Safe, Effective, Caring, Responsive, and Well-led. Each question reflects the type of conversation an inspector has with frontline staff, not the type of question a manager writes in a self-assessment.',
              },
              {
                step: '02',
                Icon: MessageSquare,
                title: 'Delivered where your staff already are',
                body: 'Questions arrive via WhatsApp, email, or the chat portal. Staff answer in their own time without needing to attend a training session. The system records every answer, tracks progress across each KLOE category, and surfaces areas where knowledge is weak.',
              },
              {
                step: '03',
                Icon: BarChart2,
                title: 'Manager sees readiness scores per category',
                body: 'The readiness dashboard shows each KLOE category as a percentage score across the whole team. Managers can see at a glance which categories need attention before the next inspection and target practice accordingly.',
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

      {/* ── Question examples ─────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>See It In Action</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            A practice session that mirrors exactly what an inspector asks.
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Scenario-based questions across all five key lines of enquiry.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                CareStreamAI does not send generic knowledge questions. It sends scenario-based
                practice questions that reflect how inspectors actually test understanding. Staff
                are asked what they would do in a given situation, not just asked to recall a definition.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Questions are distributed across all five KLOE categories so every member of the
                team builds familiarity with the full range of topics an inspector might raise.
              </p>
              <div className="space-y-3">
                {[
                  { kloe: 'Safe',       q: 'A resident shows you an unexplained bruise and seems distressed. You are alone with them. What is your immediate responsibility?' },
                  { kloe: 'Caring',     q: 'A resident tells you they feel their preferences about personal care are not being respected. How do you respond?' },
                  { kloe: 'Responsive', q: 'A family member tells you their relative has been waiting three weeks to see a GP. What steps do you take?' },
                ].map(({ kloe, q }) => (
                  <div key={kloe} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <span className="mb-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal">{kloe}</span>
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
                    <p className="text-[11px] text-white/70">CQC Prep Practice</p>
                  </div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">Safe</span>
                </div>
                <div className="space-y-3 bg-gray-50 p-4">
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="mb-0.5 text-[11px] font-semibold text-teal">CQC Prep: Safe</p>
                      <p className="mb-2 text-[10px] text-gray-400">Question 3 of 6</p>
                      <p className="mb-2.5 text-xs font-medium leading-snug text-gray-800">
                        A resident shows you an unexplained bruise and seems distressed. You are alone with them. What is your immediate responsibility?
                      </p>
                      <div className="space-y-1 text-[11px] text-gray-600">
                        <p><span className="font-bold">A)</span> Photograph it and report at handover</p>
                        <p><span className="font-bold">B)</span> Speak to a family member before escalating</p>
                        <p className="rounded bg-teal/10 px-1.5 py-0.5 font-semibold text-teal"><span className="font-bold">C)</span> Report to the safeguarding lead immediately ✓</p>
                        <p><span className="font-bold">D)</span> Document and wait for a manager to raise it</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-4 py-2 text-sm font-bold text-white">C</div>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-gray-800">✅ <span className="font-semibold">Correct.</span> Safeguarding concerns must be escalated immediately, not deferred to handover.</p>
                      <p className="mt-1 text-[11px] text-gray-400">Question 4 of 6 when you are ready.</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
                  <div className="flex-1 rounded-full border border-gray-200 px-4 py-1.5 text-[11px] text-gray-300">Reply A, B, C or D</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Readiness at scale ────────────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>Staff Readiness at Scale</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            Know exactly where every member of your team stands before the inspector arrives.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            CQC inspections are rarely announced with enough time to run a full preparation session.
            CareStreamAI keeps your team in a state of continuous readiness so you never have to scramble.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: Target,
                title: 'Targeted gap filling',
                body: 'When the readiness dashboard shows a specific KLOE category is weak across the team, managers can push a focused batch of practice questions to close that gap before the next inspection.',
              },
              {
                Icon: Users,
                title: 'Individual staff scores',
                body: 'Every staff member has their own readiness score per KLOE category. A new starter or recently returned member of staff is clearly visible in the dashboard and can be prioritised for catch-up practice.',
              },
              {
                Icon: Brain,
                title: 'Scenario variety prevents memorisation',
                body: 'Questions are not repeated in the same form. Each practice session uses different scenarios that test the same underlying knowledge, so staff develop genuine understanding rather than memorised answers.',
              },
              {
                Icon: Zap,
                title: 'Pre-inspection readiness report',
                body: 'Managers can generate a readiness report at any point showing team-wide scores across all five KLOE categories, individual staff performance, and the areas most likely to come up in conversation during an inspection.',
              },
              {
                Icon: Bell,
                title: 'Automatic alerts when scores drop',
                body: 'If a KLOE category score falls below a set threshold, managers receive an alert and practice questions are automatically distributed to bring the score back up.',
              },
              {
                Icon: ShieldCheck,
                title: 'Consistent answers across the team',
                body: 'When all staff have practiced the same scenarios, inspectors hear consistent, confident answers regardless of which staff member they approach. Consistency is one of the strongest signals of a well-run service.',
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
            A preparation record that shows inspectors exactly how you develop staff competence.
          </h2>
          <div className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            <p>
              When an inspector asks how you ensure staff are competent to carry out their roles,
              a completed supervision record from six months ago is a limited answer.
              CareStreamAI gives you something more current and specific.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>What CareStreamAI records</span>
              <span>What this shows an inspector</span>
            </div>
            {[
              ['Individual readiness scores per KLOE', 'Each staff member has a tracked score against every key line of enquiry, showing how their knowledge compares to expectations across all five inspection categories.'],
              ['Question and answer history', 'The exact question asked, the answer given, and whether it was correct. Evidence that staff knowledge is actively tested, not only supervised or observed.'],
              ['Category-level trend over time', 'Managers can show that a KLOE category which was weak six months ago has improved as a direct result of targeted practice delivery.'],
              ['Pre-inspection reports generated', 'A time-stamped report showing team-wide readiness at a specific point, demonstrating that inspection preparation is a structured, ongoing process.'],
              ['New starter catch-up activity', 'Evidence that new staff are brought up to speed on all KLOE categories within the onboarding period, not only at their first formal supervision.'],
              ['Manager response to low scores', 'When an alert fires and questions are pushed to the team, the record shows the manager identified a gap and took action, which is exactly the type of active oversight inspectors look for.'],
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
            The complete CQC staff preparation toolkit.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ClipboardList, label: 'KLOE-mapped question library',       desc: 'Questions across all five key lines of enquiry, designed to mirror the conversations inspectors actually have with frontline care staff.',       iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
              { icon: MessageSquare, label: 'WhatsApp, email and chat delivery',   desc: 'Questions delivered on every channel. Staff answer in under two minutes with no app, no login, and no session to attend.',                         iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
              { icon: BarChart2,     label: 'Readiness scores per KLOE category', desc: 'Track each staff member and the whole team across Safe, Effective, Caring, Responsive, and Well-led. See gaps at a glance.',                        iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
              { icon: Target,        label: 'Gap-targeted question delivery',      desc: 'Push a focused batch of questions to any KLOE category that falls below the threshold. Close gaps before the inspector arrives.',                    iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
              { icon: Brain,         label: 'Scenario-based question format',      desc: 'Questions reflect real inspector conversations. Staff practice responses to realistic scenarios, not definitions.',                                   iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
              { icon: FileText,      label: 'Pre-inspection readiness report',     desc: 'Generate a team-wide report at any time showing readiness scores per KLOE category, with individual staff breakdowns.',                             iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
              { icon: Bell,          label: 'Low score alerts for managers',       desc: 'Automatic notification when any KLOE category drops below the target threshold, with triggered practice delivery to bring scores back up.',          iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
              { icon: Users,         label: 'Individual and team-level tracking',  desc: 'See whole-team averages and individual staff scores. Identify the people who need the most practice before the next inspection.',                    iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
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
              <p className="mb-4 text-5xl font-extrabold text-teal">5</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                CQC key lines of enquiry that inspectors use to assess every care service.
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                CareStreamAI maps every practice question to a specific KLOE so you always know
                where your team is strong and where they need more work.
              </p>
            </div>
            <div className="md:pl-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">2 min</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                average time for a staff member to complete a CQC practice question via WhatsApp.
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                One question. One reply. Readiness score updated. No session to attend and no login required.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Give every member of your team the confidence to speak to an inspector."
        sub="See how CareStreamAI CQC preparation works for your service."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
