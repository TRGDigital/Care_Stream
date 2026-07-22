import Link from 'next/link'
import {
  CheckCircle2, BarChart2,
  ShieldCheck, Users, Brain, RefreshCw, PenLine, Gauge, Sparkles,
  ClipboardList, Target, Languages,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'

export const metadata = {
  title:       'CQC Staff Preparation Questions | CareStreamAI',
  description: 'Prepare your care staff to answer CQC inspector questions with confidence. CareStream sends open-ended, inspector-style questions in the hub, scores each free-text answer with AI feedback, and lets staff review the model answer and try again.',
  openGraph: {
    title: 'CQC Staff Preparation Questions | CareStreamAI',
    description: 'Open-ended, inspector-style practice questions across the five key questions, AI-scored with feedback, completed in the CareStream hub.',
    url: 'https://www.carestreamai.com/cqc-staff-questions',
  },
}

// ── CQC Prep Dashboard Card ───────────────────────────────────────────────────

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
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">CQC Staff Prep</p>
            <p className="text-sm font-bold text-white">Crossways Care Home</p>
          </div>
          <div className="rounded-xl bg-white/20 px-3 py-2 text-center">
            <p className="text-lg font-extrabold leading-none text-white">82</p>
            <p className="mt-0.5 text-[9px] font-medium text-white/70">avg score</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
        {[
          { label: 'Staff',    value: '26',  color: 'text-neutral-dark' },
          { label: 'Answered', value: '248', color: 'text-neutral-dark' },
          { label: 'Retried',  value: '34',  color: 'text-teal'         },
        ].map(({ label, value, color }) => (
          <div key={label} className="py-3 text-center">
            <p className={`text-base font-extrabold ${color}`}>{value}</p>
            <p className="text-[9px] text-neutral-mid">{label}</p>
          </div>
        ))}
      </div>
      <div className="px-5 py-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid">Average score by key question</p>
        <div className="space-y-3">
          {categories.map(({ name, score, color }) => (
            <div key={name}>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-neutral-dark">{name}</p>
                <p className="text-[10px] font-semibold text-neutral-mid">{score}</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-teal/10 bg-teal/5 px-5 py-3">
        <div className="flex items-center gap-2">
          <RefreshCw size={13} className="flex-shrink-0 text-teal" />
          <p className="text-[11px] font-medium text-teal">Scores rise 17 points on average after staff review the model answer and retry.</p>
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
                never practised those conversations give hesitant, inconsistent answers. CareStream
                lets every member of your team practise in their own words and shows you exactly where
                they stand before the inspector arrives.
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
                  The staff conversations are left to chance. CareStream closes that gap by giving
                  every member of your team regular practice with the exact types of questions
                  inspectors ask, marked with instant feedback.
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
                  label: 'With CareStream',
                  text: 'Staff have practised answering inspector-style questions across all five key questions in the hub, with an AI score and feedback on every answer. Their answers are confident, consistent, and accurate.',
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
          <SectionLabel>How CareStream Staff Prep Works</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Inspector-style questions, answered in their own words, scored instantly.
          </h2>
          <p className="mb-14 text-lg leading-relaxed text-neutral-mid">
            No training day and no classroom. Questions aligned to the five CQC key questions
            are sent to each staff member in the hub. They answer in their own words, the AI scores
            the answer and gives feedback, and their readiness is tracked in real time.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                Icon: ClipboardList,
                title: 'Questions mapped to every key question',
                body: 'CareStream ships with a bank of open-ended, inspector-style questions covering all five CQC key questions: Safe, Effective, Caring, Responsive, and Well-led. Each one comes with a best-practice model answer, and you can generate more questions with AI whenever you need them.',
              },
              {
                step: '02',
                Icon: PenLine,
                title: 'Answered in their own words, in the hub',
                body: 'Staff are notified in the hub and answer in their own time, writing a real answer rather than picking from options. Each question is reworded slightly on delivery, so staff build genuine understanding instead of memorising a fixed reply.',
              },
              {
                step: '03',
                Icon: Gauge,
                title: 'Scored instantly with feedback',
                body: 'The AI scores each answer out of 100 against the model answer and explains what was strong and what to improve. The model answer is then revealed, and staff can review it and try again. Every score feeds the readiness dashboard.',
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
            A practice question that mirrors exactly what an inspector asks.
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                Open-ended, scenario-based questions across all five key questions.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                CareStream does not send multiple-choice quizzes. It sends open-ended, scenario-based
                questions that reflect how inspectors actually test understanding. Staff are asked what
                they would do in a given situation and answer in their own words, just as they would
                with an inspector.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Questions are spread across all five key questions, so every member of the team
                builds familiarity with the full range of topics an inspector might raise.
              </p>
              <div className="space-y-3">
                {[
                  { domain: 'Safe',       q: 'A resident shows you an unexplained bruise and seems distressed. You are alone with them. What is your immediate responsibility?' },
                  { domain: 'Caring',     q: 'A resident tells you they feel their preferences about personal care are not being respected. How do you respond?' },
                  { domain: 'Responsive', q: 'A family member tells you their relative has been waiting three weeks to see a GP. What steps do you take?' },
                ].map(({ domain, q }) => (
                  <div key={domain} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <span className="mb-1.5 inline-block rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-teal">{domain}</span>
                    <p className="text-sm font-medium leading-snug text-neutral-dark">{q}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Scored answer mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-center justify-between bg-teal px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">CQC Practice</p>
                    <p className="text-[11px] text-white/70">Key question: Safe</p>
                  </div>
                  <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-bold text-white">Answered</span>
                </div>
                <div className="space-y-3 p-4">
                  {/* Question */}
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal">Question</p>
                    <p className="text-xs font-medium leading-snug text-neutral-dark">
                      A resident shows you an unexplained bruise and seems distressed. You are alone with them. What is your immediate responsibility?
                    </p>
                  </div>
                  {/* Staff free-text answer */}
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-mid">Your answer</p>
                    <p className="text-xs leading-snug text-neutral-dark">
                      I would make sure the resident is safe and reassured, then report it to the safeguarding lead straight away. I would write down exactly what I saw and not confront anyone myself.
                    </p>
                  </div>
                  {/* AI score + feedback */}
                  <div className="rounded-xl border border-teal/20 bg-teal/5 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-teal">
                        <Sparkles size={11} /> AI feedback
                      </p>
                      <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-bold text-white">82 / 100</span>
                    </div>
                    <p className="text-[11px] leading-snug text-neutral-dark">
                      Strong. You escalated immediately and documented what you saw. To improve, mention preserving any evidence and avoiding leading questions with the resident.
                    </p>
                  </div>
                  {/* Retry affordance */}
                  <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[11px] font-semibold text-neutral-mid">
                    <RefreshCw size={11} /> Review the model answer and try again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── First language ────────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>In Every Language Your Team Speaks</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            Staff practise in their own language. Your reporting stays in English.
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                A multilingual workforce, prepared in the language each person thinks in.
              </h3>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Care is delivered by people from all over the world. A member of staff who is most
                confident in Polish, Romanian, or Tagalog should not be held back by having to
                practise inspector questions in English.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                CareStream shows the question, the model answer, and the feedback to each staff member
                in their own language, the same way the rest of the platform works across chat,
                training, and induction. They answer in their own words, in their own language, and
                the AI scores the answer just the same.
              </p>
              <div className="space-y-3">
                {[
                  { label: 'Set once, applied everywhere',     text: 'The language on each staff profile is used automatically, so staff do not have to choose it every time.' },
                  { label: 'Answer naturally',                 text: 'Staff reply in the language they think in, and still receive a score out of 100 with clear feedback.' },
                  { label: 'Consistent reporting in English',  text: 'The manager dashboard keeps every score and record in English, so the whole team can be compared at a glance whatever language each person practised in.' },
                ].map(({ label, text }) => (
                  <div key={label} className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4">
                    <Languages size={16} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{label}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Translated answer mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-center justify-between bg-teal px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-white">Ćwiczenie CQC</p>
                    <p className="text-[11px] text-white/70">Obszar: Bezpieczeństwo</p>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                    <Languages size={10} /> Polski
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  {/* Question */}
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal">Pytanie</p>
                    <p className="text-xs font-medium leading-snug text-neutral-dark">
                      Mieszkaniec pokazuje Ci niewyjaśniony siniak i wydaje się przygnębiony. Jesteś z nim sam. Jaki jest Twój natychmiastowy obowiązek?
                    </p>
                  </div>
                  {/* Staff free-text answer */}
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-neutral-mid">Twoja odpowiedź</p>
                    <p className="text-xs leading-snug text-neutral-dark">
                      Najpierw upewniłabym się, że mieszkaniec jest bezpieczny i spokojny, a potem od razu zgłosiłabym to osobie odpowiedzialnej za ochronę. Zapisałabym dokładnie to, co zobaczyłam, i nie konfrontowałabym się z nikim sama.
                    </p>
                  </div>
                  {/* AI score + feedback */}
                  <div className="rounded-xl border border-teal/20 bg-teal/5 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-teal">
                        <Sparkles size={11} /> Informacja zwrotna AI
                      </p>
                      <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-bold text-white">82 / 100</span>
                    </div>
                    <p className="text-[11px] leading-snug text-neutral-dark">
                      Bardzo dobrze. Od razu zgłosiłaś sprawę i udokumentowałaś, co zobaczyłaś. Aby poprawić odpowiedź, wspomnij o zabezpieczeniu śladów i unikaniu pytań sugerujących.
                    </p>
                  </div>
                  {/* Retry affordance */}
                  <button className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 text-[11px] font-semibold text-neutral-mid">
                    <RefreshCw size={11} /> Zobacz wzorcową odpowiedź i spróbuj ponownie
                  </button>
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
          <p className="mb-14 text-lg leading-relaxed text-white/80">
            CQC inspections are rarely announced with much notice. CareStream keeps your team in a
            state of continuous readiness, with a live picture of how everyone is performing across
            all five key questions.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: BarChart2,
                title: 'Live readiness dashboard',
                body: 'See the team average and the average score for each key question at any time, so you know which areas are strong and which need attention before the next inspection.',
              },
              {
                Icon: Users,
                title: 'Individual staff scores',
                body: 'Every staff member has their own score in each key question. A new starter or recently returned member of staff is clearly visible and can be prioritised for catch-up practice.',
              },
              {
                Icon: RefreshCw,
                title: 'Review and retry',
                body: 'After answering, staff see the model answer and the feedback, then try the question again. The improvement from their first attempt to their latest is tracked, so you can show real learning.',
              },
              {
                Icon: Target,
                title: 'Send practice to weaker areas',
                body: 'When the dashboard shows a key question is weak across the team, push a focused batch of practice questions to the staff who need it most, ahead of an inspection.',
              },
              {
                Icon: Brain,
                title: 'Reworded so staff cannot memorise',
                body: 'Each question is reworded slightly when it is sent, so it tests the same knowledge without letting staff fall back on a memorised reply. They build genuine understanding instead.',
              },
              {
                Icon: ShieldCheck,
                title: 'Consistent answers across the team',
                body: 'When all staff have practised the same scenarios, inspectors hear consistent, confident answers regardless of which staff member they approach. Consistency is one of the strongest signals of a well-run service.',
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
          <div className="mb-12 text-lg leading-relaxed text-neutral-mid">
            <p>
              When an inspector asks how you ensure staff are competent to carry out their roles,
              a supervision record from six months ago is a limited answer. CareStream gives you
              something more current and specific.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>What CareStream records</span>
              <span>What this shows an inspector</span>
            </div>
            {[
              ['Average score per key question, per staff member', 'Each staff member has a tracked score against every key question, showing how their knowledge compares across all five inspection categories.'],
              ['Every question, answer, score and feedback', 'The exact question asked, the answer the staff member wrote, the AI score out of 100, and the feedback given. Evidence that staff knowledge is actively tested, not only supervised.'],
              ['Improvement from first attempt to latest', 'Where a staff member reviewed the model answer and tried again, the record shows their score improving, demonstrating learning rather than a one-off result.'],
              ['A live readiness dashboard', 'Team-wide and per-staff readiness across all five key questions, available at any point, showing inspection preparation is a structured, ongoing process.'],
              ['Targeted practice to weaker areas', 'When a category is weak, the record shows the manager sent focused practice to the staff who needed it, which is exactly the type of active oversight inspectors look for.'],
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
            The complete CQC staff preparation toolkit.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ClipboardList, label: 'Question bank mapped to the key questions',     desc: 'Open-ended, inspector-style questions across all five key questions, each with a model answer. Generate more with AI whenever you need them.',  iconBg: 'bg-blue-100',   iconColor: 'text-blue-600'   },
              { icon: PenLine,       label: 'Answers in their own words',     desc: 'Staff write a real answer rather than picking from options, exactly as they would in conversation with an inspector.',                              iconBg: 'bg-green-100',  iconColor: 'text-green-600'  },
              { icon: Gauge,         label: 'AI scoring with feedback',       desc: 'Every answer is scored out of 100 against the model answer, with clear feedback on what was strong and what to improve.',                          iconBg: 'bg-teal-light', iconColor: 'text-teal'       },
              { icon: RefreshCw,     label: 'Review and retry',               desc: 'Staff see the model answer after answering, then try again. The improvement from first attempt to latest is tracked.',                          iconBg: 'bg-purple-100', iconColor: 'text-purple-600' },
              { icon: BarChart2,     label: 'Readiness scores per key question',      desc: 'Track each staff member and the whole team across Safe, Effective, Caring, Responsive, and Well-led. See gaps at a glance.',                    iconBg: 'bg-amber-100',  iconColor: 'text-amber-600'  },
              { icon: Target,        label: 'Targeted practice delivery',     desc: 'Send a focused batch of questions to any key question that is weak across the team, to the staff who need it most.',                          iconBg: 'bg-orange-100', iconColor: 'text-orange-600' },
              { icon: Languages,     label: 'In their first language',         desc: 'Staff see the question, the model answer, and the feedback in their own language, and answer in their own words, just like the rest of CareStream.', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600' },
              { icon: Sparkles,      label: 'Notified in the hub',            desc: 'Staff are nudged with a notification when a new question is waiting, and answer in the hub on any device whenever it suits them.',           iconBg: 'bg-cyan-100',   iconColor: 'text-cyan-600'   },
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
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">5</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                CQC key questions that inspectors use to assess every care service.
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                CareStream maps every practice question to a specific key question, so you always know
                where your team is strong and where they need more work.
              </p>
            </div>
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">0 to 100</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                every answer scored, with feedback and a model answer to learn from.
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                Staff answer in their own words in the hub, see exactly how they did, and try again
                to improve. One question, one answer, readiness score updated.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EditableContentBlock path="/cqc-staff-questions" />

      <PageCta
        heading="Give every member of your team the confidence to speak to an inspector."
        sub="See how CareStream CQC preparation works for your service."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
