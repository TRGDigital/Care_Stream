import Link from 'next/link'
import {
  CheckCircle2, Mail, Globe, BarChart2,
  BookOpen, Users, Clock, ShieldCheck, Zap, Bell, Lock,
  MessageSquare, Mic, Volume2, Languages, Smartphone, Layers,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'

export const metadata = {
  title:       'HR Policies and Staff Handbook | CareStreamAI',
  description: 'Give every member of your team instant answers to HR and employment questions from your actual staff handbook. Available in any language, in the CareStream hub or by email, 24 hours a day.',
  openGraph: {
    title: 'HR Policies and Staff Handbook | CareStreamAI',
    description: 'Instant HR and employment answers from your actual staff handbook, in any language, in the hub or by email, 24/7.',
    url: 'https://carestreamai.com/hr-policies',
  },
}

// ── Staff Handbook Dashboard Mockup ───────────────────────────────────────────

function HandbookMockup() {
  const topics = [
    { label: 'Annual Leave',       queries: 48, pct: 100 },
    { label: 'Sick Pay',           queries: 34, pct: 71  },
    { label: 'Disciplinary',       queries: 27, pct: 56  },
    { label: 'Working Hours',      queries: 21, pct: 44  },
    { label: 'Expenses',           queries: 14, pct: 29  },
  ]
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-white/20">
      <div className="bg-teal px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Staff Handbook</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">9</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">languages</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Questions this month', value: '312' },
          { label: 'Staff asking',         value: '24'  },
          { label: 'Avg response',         value: '18s' },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 text-center">
            <p className="text-base font-extrabold text-neutral-dark">{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Top topics this month</p>
        <div className="space-y-3">
          {topics.map(({ label, queries, pct }) => (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-dark">{label}</p>
                <p className="text-[10px] text-neutral-mid">{queries} queries</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-teal" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-teal/10 bg-teal/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <Globe size={13} className="flex-shrink-0 text-teal" />
          <p className="text-[11px] font-medium text-teal">Questions asked in Polish, Romanian, Tagalog and 6 more languages this month.</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HRPoliciesPage() {
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
              <SectionLabel light>HR Policies and Staff Handbook</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Every staff member deserves to know their rights. In their own language. Right now.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                Care home workforces are multilingual, work across multiple shifts, and rarely have
                access to HR during the moments when they need it most. CareStream gives every
                member of your team instant, accurate answers to employment questions from your
                actual staff handbook, in the hub or by email, in any language, at any hour.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-amber rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
                <Link href="/demo"     className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <HandbookMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Problem With HR Accessibility</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Staff have employment questions every week. HR is not available every week.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  A care worker on a Saturday night shift who wants to know how much notice they
                  need to book annual leave cannot reach HR until Monday morning. A staff member
                  whose first language is Romanian who does not fully understand their contract
                  has no practical way to get clarification. A new starter who wants to know the
                  expenses process has to find the right person to ask and hope they know the answer.
                </p>
                <p>
                  These questions go unanswered, are answered inconsistently by colleagues, or
                  create unnecessary pressure on managers during busy shifts. CareStream makes
                  the full staff handbook accessible to everyone, instantly, around the clock.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                {
                  icon: '📁',
                  label: 'Without CareStream',
                  text: 'Staff either wait for HR office hours, ask a manager who may not know the answer, or go without the information they are entitled to. Language barriers make this worse for a large proportion of the workforce.',
                  dim: true,
                },
                {
                  icon: '💬',
                  label: 'With CareStream',
                  text: 'Any staff member can ask any question from the staff handbook in the hub or by email at any time of day. The answer comes from your actual document, in the language they asked in, within 30 seconds.',
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
          <SectionLabel>How CareStream HR Policies Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Upload your handbook once. Your whole team can ask anything from it immediately.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            Your staff handbook joins your clinical policies in the same knowledge base. Staff
            do not need to know where to look or who to ask. They simply ask their question
            in the hub and receive an answer drawn from your actual document.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: BookOpen,
                title: 'Upload your staff handbook',
                body: 'Add your staff handbook, employment contracts, HR policies, and any other employment documents to the CareStream knowledge base. Large handbooks are indexed chapter by chapter, so answers come from the right part of a long document. Everything is processed automatically within minutes.',
              },
              {
                step: '02',
                Icon: MessageSquare,
                title: 'Staff ask in the hub, typing or speaking',
                body: 'Any staff member can ask any employment question in the CareStream hub on their phone, by typing or by speaking, or by email. Questions can be asked in any language. The hub detects the language and answers in the same one.',
              },
              {
                step: '03',
                Icon: BarChart2,
                title: 'Managers see what staff are asking',
                body: 'The analytics dashboard shows which handbook topics are being asked about most. Topics with high query volumes and unclear answers are surfaced as gaps, helping HR and managers see where the handbook needs to be clearer or where staff need more support.',
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
            An employment question answered in seconds. In any language.
          </h2>

          {/* Hub */}
          <div className="mb-16 grid items-start gap-10 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-light">
                  <Smartphone size={18} className="text-teal" />
                </div>
                <span className="text-xl font-bold text-neutral-dark">The hub</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                A staff member asks about annual leave in Polish, by typing or speaking, and gets the answer in Polish.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                CareStream detects the language of the question automatically. Your handbook stays
                in English. The answer is translated at the point of response, so every member of
                staff receives the same accurate information regardless of what language they speak.
              </p>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Staff who are not confident typing can speak their question in the hub and listen to
                the answer read back. No language selection and no separate version of the handbook.
                The same document answers questions in over 60 languages.
              </p>
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">Languages used by care home workforces across the UK.</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { flag: '🇵🇱', name: 'Polski' },
                    { flag: '🇷🇴', name: 'Română' },
                    { flag: '🇵🇭', name: 'Filipino' },
                    { flag: '🇳🇬', name: 'Yorùbá' },
                    { flag: '🇮🇳', name: 'हिन्दी' },
                  ].map(({ flag, name }) => (
                    <span key={name} className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-dark ring-1 ring-gray-200">
                      <span>{flag}</span><span>{name}</span>
                    </span>
                  ))}
                  <span className="flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-mid ring-1 ring-gray-200">+ 55 more</span>
                </div>
              </div>
            </div>

            {/* Hub phone mockup */}
            <div className="flex justify-center">
              <div className="w-full max-w-[380px] rounded-[2.5rem] bg-gray-900 p-2.5 shadow-2xl ring-1 ring-white/10">
                <div className="overflow-hidden rounded-[2rem] bg-gray-50">
                  <div className="flex items-center gap-3 bg-teal px-4 py-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-extrabold text-white">CS</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white">CareStream</p>
                      <p className="text-[10px] text-white/60">Staff Handbook</p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white">
                      <Globe size={9} /> Polski
                    </span>
                  </div>
                  <div className="space-y-2 px-3 py-3">
                    {/* Staff question in Polish (voice) */}
                    <div className="ml-auto w-fit max-w-[82%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
                      <p className="text-[11px] leading-snug text-white">Ile dni wcześniej muszę zgłosić urlop wypoczynkowy?</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[9px] text-white/60"><Mic size={9} /> wykryto: polski</p>
                    </div>
                    {/* AI response in Polish */}
                    <div className="max-w-[92%] overflow-hidden rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-gray-100 bg-white shadow-sm">
                      <div className="p-3">
                        <p className="mb-0.5 text-[10px] font-semibold text-teal">Z Twojego Regulaminu Pracowniczego</p>
                        <p className="text-[11px] leading-relaxed text-neutral-dark">
                          Zgodnie z regulaminem, wnioski urlopowe należy składać z minimum 2 tygodniowym wyprzedzeniem w przypadku urlopu do 3 dni oraz z 4 tygodniowym wyprzedzeniem w przypadku dłuższego urlopu.
                        </p>
                        <p className="mt-1.5 text-[10px] leading-snug text-neutral-mid">
                          Wnioski składa się bezpośrednio do kierownika zmiany.
                        </p>
                      </div>
                      <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
                        <p className="text-[9px] text-neutral-mid">Źródło: Regulamin Pracowniczy, Sekcja 6</p>
                        <span className="flex items-center gap-1 rounded-full bg-teal/10 px-2 py-0.5 text-[9px] font-semibold text-teal">
                          <Volume2 size={9} /> Odsłuchaj
                        </span>
                      </div>
                    </div>
                    {/* Follow-up */}
                    <div className="ml-auto w-fit max-w-[82%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
                      <p className="text-[11px] text-white">Dziękuję, a ile mam dni urlopu rocznie?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
                    <div className="flex-1 rounded-full bg-gray-100 px-3 py-1.5 text-[10px] text-gray-400">Napisz wiadomość</div>
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal"><Mic size={13} /></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Email channel */}
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xl">
                <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-2.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-[11px] text-gray-400">hr@crossways.carestreamai.co.uk</div>
                </div>
                <div className="border-b border-gray-100 bg-white px-5 py-4">
                  <div className="mb-0.5 text-[11px] text-gray-400">From: <span className="text-gray-600">Anya Kowalski &lt;a.kowalski@crosswayscare.co.uk&gt;</span></div>
                  <div className="mb-0.5 text-[11px] text-gray-400">To: <span className="text-gray-600">hr@crossways.carestreamai.co.uk</span></div>
                  <div className="text-[11px] text-gray-400">Subject: <span className="font-semibold text-gray-800">Sick pay question</span></div>
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="mb-3 text-xs text-gray-600">What is the sick pay policy if I am off for more than a week? I have not been here long and am not sure what I am entitled to.</p>
                  <div className="rounded-lg border-l-4 border-teal bg-teal/5 p-4">
                    <p className="mb-1 text-xs font-bold text-teal">From your Staff Handbook: Sick Pay</p>
                    <div className="space-y-2 text-[11px] leading-relaxed text-gray-700">
                      <p>During your probationary period (first 6 months), the service pays Statutory Sick Pay (SSP) from day 4 of absence.</p>
                      <p>After completing 6 months, you are entitled to contractual sick pay: full pay for the first 2 weeks, then SSP for a further 4 weeks, subject to a return-to-work meeting.</p>
                      <p>All absences over 7 days require a fit note from your GP.</p>
                    </div>
                    <p className="mt-2 text-[10px] italic text-gray-400">Source: Staff Handbook, Section 8.3, Sick Pay and Absence</p>
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
                An employment question answered from the exact section of the handbook.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Staff who prefer email can ask the same questions and get the same answers. Every
                response cites the section of the handbook it came from, so staff can read the
                original wording themselves and know exactly what applies to them.
              </p>
              <p className="text-lg leading-relaxed text-neutral-mid">
                The staff member can reply to the same email thread to ask a follow-up question.
                The conversation is kept with full context, so they do not have to repeat their
                situation with each new message.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Handbook topics ───────────────────────────────────────────────── */}
      <section className="bg-teal-gradient py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel light>Everything in Your Handbook. Accessible.</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            Every topic your staff have questions about. Available on demand.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-white/80">
            CareStream does not limit which parts of the handbook staff can ask about.
            The entire document is indexed and every topic is answerable.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: Clock,
                title: 'Annual leave and holiday pay',
                body: 'How much leave staff are entitled to, how to book it, the notice required, what happens to unused leave, and how bank holidays are treated. Questions that come up every single week in every care home.',
              },
              {
                Icon: ShieldCheck,
                title: 'Sick pay and absence',
                body: 'Statutory sick pay entitlements, contractual sick pay periods, the fit note requirement, return-to-work processes, and the difference between short-term and long-term absence procedures.',
              },
              {
                Icon: Users,
                title: 'Disciplinary and grievance',
                body: 'What triggers a disciplinary process, what the stages are, what rights the staff member has during the process, and how to raise a formal grievance. Sensitive questions staff often do not want to ask a manager directly.',
              },
              {
                Icon: Zap,
                title: 'Pay, expenses and benefits',
                body: 'Pay dates, overtime rates, expense claim procedures, uniform allowances, mileage rates, and any other financial entitlements set out in the contract or handbook.',
              },
              {
                Icon: BookOpen,
                title: 'Working hours and shifts',
                body: 'Contracted hours, shift patterns, rest break entitlements, the right to refuse additional shifts, and the process for requesting a change to contracted hours.',
              },
              {
                Icon: Bell,
                title: 'Probation and onboarding',
                body: 'The length of the probationary period, what happens at the end of it, what is assessed during probation, and what support new starters are entitled to during their first weeks.',
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

      {/* ── Equality and confidence ───────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Equality of Access</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            A staff member who speaks Romanian has the same access to their rights as one who speaks English.
          </h2>
          <div className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            <p>
              Language should not determine whether a staff member understands their employment
              rights. CareStream removes that barrier entirely. The same handbook, the same
              answers, available in any language your team uses.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>What CareStream provides</span>
              <span>What this means for your team</span>
            </div>
            {[
              ['Handbook answers in any language', 'A staff member whose first language is Tagalog, Polish, or Romanian receives the same accurate answer from the same section of the handbook as an English-speaking colleague.'],
              ['No language configuration required', 'Staff do not select a language or use a special command. CareStream detects the language of each message and answers in the same one.'],
              ['Source document always in English', 'Your handbook stays in one language. There is no version control problem and no risk of a translated copy going out of date.'],
              ['Speak the question, hear the answer', 'Staff who are not confident typing in English can speak their question in the hub in their own language and listen to the answer read back to them.'],
              ['Sensitive questions asked privately', 'Questions about disciplinary procedures, grievances, or pay can be asked in the hub or by email without going through a manager, so staff can understand their position before escalating.'],
              ['Consistent answers at all hours', 'A night shift worker who needs to know their sick pay entitlement gets the same accurate answer as a manager asking the same question during the working day.'],
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
            The complete HR handbook access toolkit.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen,      label: 'Full handbook indexing',      desc: 'Upload your complete staff handbook and all employment documents. Every section is indexed and answerable immediately.',                          iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
              { icon: Layers,        label: 'Chapter-aware retrieval',     desc: 'Large handbooks are indexed chapter by chapter, so answers are drawn from the right part of a long document.',                                 iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
              { icon: Smartphone,    label: 'Hub and email access',        desc: 'Staff ask in the hub on their phone or by email. No new system to learn, and the hub installs like an app.',                                   iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
              { icon: Languages,     label: '60-plus language support',    desc: 'Questions detected and answered in any language. One handbook, every language your team speaks.',                                              iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
              { icon: Mic,           label: 'Voice input and read-aloud',  desc: 'Staff can speak a question in their own language and listen to the answer read back, with no typing required.',                                iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
              { icon: CheckCircle2,  label: 'Source-cited answers',        desc: 'Every response cites the section of the handbook it came from, so staff can read the original wording for themselves.',                          iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
              { icon: BarChart2,     label: 'Topic analytics for HR teams', desc: 'See which topics staff ask about most. High-volume topics with unclear answers are evidence that the handbook needs updating in that area.',     iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
              { icon: Lock,          label: 'Private and confidential',    desc: 'Sensitive questions about grievances, disciplinary procedures, or pay can be asked without going through a manager first.',                       iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
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
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">60+</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                languages supported for staff handbook questions, with no configuration required.
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                The language of the question is detected automatically. Your handbook stays in
                English and answers are delivered in the language each staff member used.
              </p>
            </div>
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">24/7</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                access to the full staff handbook, on every shift and at any hour.
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                The question that previously meant an email to HR and a wait until the next working
                day is answered in the hub in seconds, day or night.
              </p>
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Give every member of your team equal access to the information they are entitled to."
        sub="See how CareStream HR policies work for your service."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
