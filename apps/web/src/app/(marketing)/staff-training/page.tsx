import Link from 'next/link'
import {
  CheckCircle2, MessageSquare, Mail, Globe, BarChart2,
  Bell, RefreshCw, Brain, ShieldCheck, Zap, Users, Clock,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title:       'Staff Training and Compliance | CareStreamAI',
  description: 'Move beyond annual tick-box training. CareStreamAI keeps your team engaged with their training all year through WhatsApp, email, and chat, with automatic renewal reminders and a full compliance dashboard.',
  openGraph: {
    title: 'Staff Training and Compliance | CareStreamAI',
    description: 'Year-round staff training engagement via WhatsApp, email, and chat — with compliance dashboards.',
    url: 'https://carestreamai.co.uk/staff-training',
  },
}

function WhatsAppIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#16a34a">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
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

export default function StaffTrainingPage() {
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
                Once a year is not enough. CareStreamAI keeps training front of mind all year round.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                Annual compliance training is a legal obligation, but a single renewal date does nothing for day-to-day knowledge retention. CareStreamAI transforms training from a yearly tick-box into an ongoing conversation your whole team stays engaged with.
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
                  label: 'CareStreamAI training',
                  text: 'Training questions, knowledge checks, and renewal reminders are delivered through WhatsApp, email, and chat continuously throughout the year.',
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
          <SectionLabel>How CareStreamAI Training Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Training delivered where your staff already are.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            No new app. No login. No LMS that only the manager uses. CareStreamAI meets your staff
            on WhatsApp, email, or the chat portal they already use to ask policy questions.
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: CheckCircle2,
                title: 'Assign training modules',
                body: 'Managers assign any combination of training modules to individual staff or entire teams from the admin dashboard. Modules cover mandatory topics including safeguarding, fire safety, manual handling, infection control, and more.',
              },
              {
                step: '02',
                Icon: MessageSquare,
                title: 'Questions delivered automatically',
                body: 'Each module contains multiple-choice questions with four options. CareStreamAI sends the first question automatically on assignment, or waits for the staff member to initiate contact. You choose which mode suits your team.',
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

      {/* ── Channel mockups ───────────────────────────────────────────────── */}
      <section className="bg-white py-12">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>See It In Action</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            Questions delivered on every channel your staff already use.
          </h2>

          {/* ── WhatsApp ── */}
          <div className="mb-12 grid items-start gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <WhatsAppIcon size={28} />
                <span className="text-xl font-bold text-neutral-dark">WhatsApp</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                A training question answered on a night shift in under 10 seconds.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                CareStreamAI sends the question directly to the staff member&apos;s mobile number.
                They tap one of the four answer buttons. Answer recorded, feedback sent, next question ready.
              </p>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                No app download. No login. Works on any phone, any network, any time of day.
              </p>
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">Available in every language your team speaks.</p>
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
                  <span className="flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-mid ring-1 ring-gray-200">+ many more</span>
                </div>
              </div>
            </div>

            {/* WhatsApp phone mockup */}
            <div className="flex justify-center lg:justify-center">
              <div className="w-full max-w-[380px] rounded-[2.5rem] bg-gray-900 p-2.5 shadow-2xl ring-1 ring-white/10">
                <div className="overflow-hidden rounded-[2rem] bg-[#0b141a]">
                  {/* WA header */}
                  <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[10px] font-extrabold text-white">CS</div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">CareStreamAI Training</p>
                      <p className="text-[10px] text-white/50">online</p>
                    </div>
                  </div>

                  {/* Chat area */}
                  <div className="space-y-2 bg-[#0b141a] px-3 py-3">
                    {/* Incoming: question bubble with quick-reply buttons */}
                    <div className="max-w-[92%] overflow-hidden rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-[#202c33]">
                      {/* Message body */}
                      <div className="p-3">
                        <p className="mb-0.5 text-[10px] font-semibold text-teal">📚 Training: Safeguarding</p>
                        <p className="mb-2 text-[9px] text-white/40">Question 2 of 8</p>
                        <p className="text-[11px] leading-snug text-white">
                          A resident discloses they feel unsafe and shows unexplained bruising. What is your immediate responsibility?
                        </p>
                      </div>
                      {/* Quick-reply buttons */}
                      <div className="border-t border-white/10">
                        {[
                          { label: 'A)  Document and report at handover', correct: false },
                          { label: 'B)  Report to the safeguarding lead', correct: true  },
                          { label: 'C)  Ask colleagues what they noticed', correct: false },
                          { label: 'D)  Speak to the family first',        correct: false },
                        ].map(({ label, correct }, i) => (
                          <div
                            key={i}
                            className={`border-t border-white/10 px-3 py-2 text-center text-[11px] font-medium ${
                              correct ? 'bg-[#005c4b] text-green-300' : 'text-[#53bdeb]'
                            } ${i === 0 ? 'border-t-0' : ''}`}
                          >
                            {label}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Outgoing: tapped answer */}
                    <div className="ml-auto w-fit rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-[#005c4b] px-4 py-2 text-center text-[11px] font-semibold text-white">
                      B) Report to the safeguarding lead
                    </div>

                    {/* Incoming: feedback */}
                    <div className="max-w-[85%] overflow-hidden rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-[#202c33] p-3">
                      <p className="text-[11px] text-white">✅ <span className="font-semibold">Correct!</span> Well done.</p>
                      <p className="mt-1 text-[10px] text-white/40">Question 3 of 8 loading...</p>
                    </div>
                  </div>

                  {/* WA input bar */}
                  <div className="flex items-center gap-2 bg-[#202c33] px-3 py-2">
                    <div className="flex-1 rounded-full bg-[#2a3942] px-3 py-1.5 text-[10px] text-white/25">Message</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Email ── */}
          <div className="mb-12 grid items-start gap-6 lg:grid-cols-2">
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
                  <div className="mb-0.5 text-[11px] text-gray-400">From: <span className="text-gray-600">CareStreamAI Training &lt;noreply@carestreamai.co.uk&gt;</span></div>
                  <div className="mb-0.5 text-[11px] text-gray-400">To: <span className="text-gray-600">sarah.jones@crosswayscare.co.uk</span></div>
                  <div className="text-[11px] text-gray-400">Subject: <span className="font-semibold text-gray-800">Training: Fire Safety</span></div>
                </div>
                {/* Email body */}
                <div className="bg-white px-5 py-4">
                  <p className="mb-1 text-sm text-gray-700">Hi Sarah,</p>
                  <p className="mb-4 text-xs leading-relaxed text-gray-500">You have a training question to complete. Please reply with a single letter.</p>
                  {/* Training card */}
                  <div className="rounded-lg border-l-4 border-teal bg-teal/5 p-4">
                    <p className="mb-0.5 text-xs font-bold text-teal">📚 Training: Fire Safety</p>
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
                Training arrives in the inbox. The reply takes one keystroke.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Each staff member already has an email address set up with CareStreamAI. Training questions
                arrive there automatically and the thread is preserved, so replies are handled in the same
                conversation with no separate system needed.
              </p>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                The correct answer is highlighted in the feedback reply. The compliance record is updated the moment the response lands.
              </p>
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">Available in every language your team speaks.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { flag: '🇮🇳', name: 'हिन्दी' },
                    { flag: '🇵🇰', name: 'اردو' },
                    { flag: '🇧🇩', name: 'বাংলা' },
                    { flag: '🇳🇬', name: 'Yorùbá' },
                    { flag: '🇸🇴', name: 'Soomaali' },
                  ].map(({ flag, name }) => (
                    <span key={name} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark ring-1 ring-gray-200">
                      <span>{flag}</span>
                      <span>{name}</span>
                    </span>
                  ))}
                  <span className="flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-mid ring-1 ring-gray-200">+ many more</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Chat portal ── */}
          <div className="grid items-start gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                  <Globe size={18} className="text-purple-600" />
                </div>
                <span className="text-xl font-bold text-neutral-dark">Chat portal</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Policy questions and training questions in one seamless conversation.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Staff who use the web chat portal to ask policy questions will see training questions
                woven naturally into the same conversation. Ask a policy question, get an answer, and
                if there is a pending training question it appears below.
              </p>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Staff can also type a question about any training topic at any time and receive an
                accurate, source-backed answer instantly.
              </p>
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">Available in every language your team speaks.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { flag: '🇱🇹', name: 'Lietuvių' },
                    { flag: '🇷🇴', name: 'Română' },
                    { flag: '🇪🇸', name: 'Español' },
                    { flag: '🇧🇬', name: 'Български' },
                    { flag: '🇨🇳', name: '中文' },
                  ].map(({ flag, name }) => (
                    <span key={name} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark ring-1 ring-gray-200">
                      <span>{flag}</span>
                      <span>{name}</span>
                    </span>
                  ))}
                  <span className="flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-mid ring-1 ring-gray-200">+ many more</span>
                </div>
              </div>
            </div>

            {/* Chat portal mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[360px] overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                {/* App header */}
                <div className="flex items-center justify-between bg-teal px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">CareStreamAI</p>
                    <p className="text-[11px] text-white/70">Crossways Care Home</p>
                  </div>
                  <div className="h-7 w-7 rounded-full bg-white/20 text-center text-xs font-bold leading-7 text-white">SJ</div>
                </div>
                {/* Chat area */}
                <div className="space-y-3 bg-gray-50 p-4">
                  {/* System: question */}
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[85%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="mb-0.5 text-[11px] font-semibold text-teal">📚 Training: Medication Management</p>
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
                  {/* User reply */}
                  <div className="flex justify-end">
                    <div className="rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-4 py-2 text-sm font-bold text-white">
                      C
                    </div>
                  </div>
                  {/* System: feedback */}
                  <div className="flex gap-2">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
                    <div className="max-w-[85%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-gray-800">✅ <span className="font-semibold">Correct!</span> Well done, Sarah.</p>
                      <p className="mt-1 text-[11px] text-gray-400">Question 2 of 5. Reply when you are ready.</p>
                    </div>
                  </div>
                </div>
                {/* Input bar */}
                <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
                  <div className="flex-1 rounded-full border border-gray-200 px-4 py-1.5 text-[11px] text-gray-300">Ask a question or type A, B, C, D</div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  </div>
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
            The most powerful part of CareStreamAI training is not the renewal certificate.
            It is what happens between renewals.
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: Brain,
                title: 'Ad-hoc knowledge checks',
                body: 'CareStreamAI can send training module questions to staff at any point in the year, not only at renewal. Spaced repetition keeps critical knowledge like safeguarding, medication management, and infection control at the forefront of their minds.',
              },
              {
                Icon: MessageSquare,
                title: 'Staff can ask training questions any time',
                body: 'A staff member who wants to refresh their knowledge on a training topic can ask CareStreamAI directly via WhatsApp, email, or chat. They get an accurate answer drawn from the training module and source materials, instantly.',
              },
              {
                Icon: RefreshCw,
                title: 'Renewal reminders at 90, 30, and 7 days',
                body: 'Automatic reminders sent to each individual staff member and to managers as the renewal date approaches. No spreadsheets, no manual chasing. The system manages it.',
              },
              {
                Icon: Zap,
                title: 'Immediate delivery on assignment',
                body: 'With auto-send mode enabled, the moment a manager assigns a training module the first question is delivered. No delay, no waiting for a session. Staff can complete a module on their phone during a break.',
              },
              {
                Icon: Users,
                title: 'Individual tracking at scale',
                body: 'Whether you have 10 staff or 200, the compliance dashboard shows every individual status across every module. See who is current, in progress, and overdue at a glance.',
              },
              {
                Icon: Clock,
                title: 'No time pressure, no friction',
                body: 'Staff answer one question at a time, when they have a moment. There is no timed session, no login required, and no rigid structure. One question. One reply. Progress recorded.',
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
              date from 11 months ago is a weak answer. CareStreamAI gives you something far stronger.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>What CareStreamAI records</span>
              <span>What this shows an inspector</span>
            </div>
            {[
              [
                'Training completion per staff member',
                'Every module completed, with exact date and pass/fail on each question. Not a bulk export from a third-party LMS.',
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
                'Staff-initiated training queries',
                'When a staff member asks a training question via WhatsApp or email, that interaction is logged, showing proactive engagement with training content.',
              ],
              [
                'Renewal reminder delivery',
                'Evidence that reminders were sent 90, 30, and 7 days before each renewal, showing a structured, proactive renewal management process.',
              ],
              [
                'Manager compliance overview',
                'The compliance dashboard shows the state of training across the whole team at any point in time. The evidence an inspector wants to see a manager actively monitoring.',
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
              { icon: ShieldCheck,    label: 'Pre-built mandatory modules',  desc: 'Safeguarding, fire safety, manual handling, infection control, and more. Ready to assign immediately.',        iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
              { icon: Bell,           label: 'Automatic renewal reminders',  desc: 'Staff and manager notifications at 90, 30, and 7 days before renewal. Fully configurable.',                    iconBg: 'bg-amber-100',   iconColor: 'text-amber-600' },
              { icon: BarChart2,      label: 'Live compliance dashboard',    desc: 'Real-time view of every staff member status across every module.',                                             iconBg: 'bg-teal-light',  iconColor: 'text-teal' },
              { icon: Brain,          label: 'MCQ assessment delivery',      desc: 'Multiple-choice questions sent via WhatsApp, email, or chat. Answers tracked and logged.',                     iconBg: 'bg-purple-100',  iconColor: 'text-purple-600' },
              { icon: MessageSquare,  label: 'Conversational training',      desc: 'Staff ask questions about any training topic and get accurate answers drawn from source materials.',           iconBg: 'bg-green-100',   iconColor: 'text-green-600' },
              { icon: Zap,            label: 'Instant question delivery',    desc: 'Send the first question the moment a module is assigned, or configure the system to wait for staff contact.', iconBg: 'bg-orange-100',  iconColor: 'text-orange-600' },
              { icon: Users,          label: 'Manager digest emails',        desc: 'A single digest email to managers listing every upcoming renewal. No spreadsheet required.',                  iconBg: 'bg-indigo-100',  iconColor: 'text-indigo-600' },
              { icon: RefreshCw,      label: 'Annual renewal tracking',      desc: 'Annual modules automatically set a 12-month expiry on completion. Never miss a renewal date.',               iconBg: 'bg-cyan-100',    iconColor: 'text-cyan-600' },
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
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid gap-12 text-center md:gap-0 md:grid-cols-2 md:divide-x md:divide-gray-100">
            <div className="md:pr-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">70%</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                of information is forgotten within 24 hours without reinforcement.
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                Research consistently shows that a single annual session cannot sustain working knowledge through the year.
              </p>
            </div>
            <div className="md:pl-12">
              <p className="mb-4 text-5xl font-extrabold text-teal">3 min</p>
              <p className="mb-3 text-xl font-bold text-neutral-dark">
                average time for a staff member to answer a training question on WhatsApp.
              </p>
              <p className="text-base leading-relaxed text-neutral-mid">
                One question. One reply. Progress recorded. No session to attend, no login required.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Turn compliance training into a year-round conversation."
        sub="See how CareStreamAI training works for your team."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
