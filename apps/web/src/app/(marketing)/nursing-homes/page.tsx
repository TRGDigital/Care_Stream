import Link from 'next/link'
import {
  CheckCircle2, Stethoscope, Globe, ShieldCheck, GraduationCap, ClipboardCheck,
  HelpCircle, MessageSquare, BookOpen, FileText, ShieldAlert, Clock, Users, BarChart2,
  Mic, Send, Volume2,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { HomeFaq } from '@/components/marketing/home-faq'

export const metadata = {
  title: 'CareStream for Nursing Homes',
  description: 'CareStream gives nursing and care teams instant access to your clinical and care policies, training, audits and CQC tools, in any language, on every shift, with every query logged for inspection.',
  openGraph: {
    title: 'CareStream for Nursing Homes',
    description: 'Instant access to clinical procedures, training and CQC tools for your whole nursing team, in any language, on every shift.',
    url: 'https://carestreamai.com/nursing-homes',
  },
}

const FAQS = [
  {
    question: 'Can it answer clinical procedure questions, not just admin policies?',
    answer: 'Yes. CareStream answers from the documents you upload, including your clinical and care procedures. A nurse can ask about wound care, a syringe driver, catheter care or your sepsis pathway and get an answer drawn from your own policy, with the source and version shown so they can check it.',
  },
  {
    question: 'Does it replace clinical judgement or training?',
    answer: 'No. CareStream points staff to your own approved procedures and guidance. It supports professional judgement and your training, it does not replace them, and every answer cites the policy it came from.',
  },
  {
    question: 'Our team speaks many languages. Does it help?',
    answer: 'Yes. Staff can ask in over 60 languages and get the answer back in the same language, while your policies stay in English. This is a real help for the international nursing and care workforce in most homes.',
  },
  {
    question: 'How does it help with mandatory training and renewals?',
    answer: 'CareStream can build training modules from your own policies, deliver them in the hub, and send automatic renewal reminders at 90, 30 and 7 days, with a live compliance dashboard so you can see exactly who is current and who is due.',
  },
  {
    question: 'Is resident and clinical information kept private and secure?',
    answer: 'Yes. Your library is stored in an isolated environment for your home alone, is never used to train AI models, and is never shared with other organisations. Data is encrypted at rest and in transit, and every query is logged for your audit trail.',
  },
  {
    question: 'How quickly can a nursing home get started?',
    answer: 'Most homes are up and running the same day. You upload your policies, invite your team with a one-tap sign-in link, and staff can begin asking questions straight away.',
  },
]

const SERVICES = [
  { Icon: FileText,       title: 'Care Policies',       href: '/care-policies',       desc: 'Clinical and care procedures answerable at the bedside, in any language, with the source policy and version cited.' },
  { Icon: BookOpen,       title: 'HR Policies',         href: '/hr-policies',         desc: 'Your staff handbook on demand for your nursing and care team. Leave, pay and employment questions answered 24/7.' },
  { Icon: GraduationCap,  title: 'Staff Training',      href: '/staff-training',      desc: 'Modules built from your own clinical policies, delivered in the hub, with renewal reminders for mandatory training.' },
  { Icon: ClipboardCheck, title: 'Care Audits',         href: '/care-audits',         desc: 'Guided audits for medicines, infection control, falls and pressure care, scored as you go and inspection-ready.' },
  { Icon: ShieldCheck,    title: 'CQC & Compliance',    href: '/cqc-compliance',      desc: 'Evidence that builds itself, plus regulation coverage showing where your policies leave a gap.' },
  { Icon: HelpCircle,     title: 'CQC Staff Questions', href: '/cqc-staff-questions', desc: 'Prepare your registered nurses and carers for the conversations inspectors have on the floor.' },
  { Icon: MessageSquare,  title: 'CQC Report Chat',     href: '/cqc-report-chat',     desc: 'Upload your inspection report and chat with it, cross-referenced against your own policies.' },
  { Icon: ShieldAlert,    title: 'Business Continuity', href: '/business-continuity', desc: 'Make your continuity information instantly reachable by every member of staff, on any shift.' },
]

const SCENARIOS = [
  { tag: 'On a night shift', body: 'A care assistant notices a resident becoming drowsy and harder to rouse. Rather than wait for the nurse in charge to be free, they ask CareStream and get your exact deterioration and escalation steps, drawn from your own policy, in seconds. They act with confidence and the resident is reviewed sooner.' },
  { tag: 'A new nurse settling in', body: 'A newly registered nurse is not yet sure of your local processes. Instead of interrupting colleagues or guessing, they ask the hub and receive your approved procedure every time, so their practice matches the rest of the team from their very first shift.' },
  { tag: 'During the medicines round', body: 'A senior carer is unsure whether a PRN protocol applies, or how a covert medication should be handled. They check the medicines policy in the hub at the trolley, see the answer with the source, and record it correctly.' },
  { tag: 'When a relative asks a question', body: 'A family member asks about visiting during an outbreak, or about your approach to end-of-life care. Any member of staff can check the relevant policy and answer clearly and consistently, rather than promising to find out and get back to them.' },
  { tag: 'In a language they are confident in', body: 'A carer whose first language is Romanian asks a moving-and-handling question by voice, in Romanian, and listens to the answer read back. The guidance is exactly the same as an English-speaking colleague would receive.' },
  { tag: 'Getting ready for inspection', body: 'Before an inspection, the registered manager sends CQC practice questions to the team, reviews who has answered, and checks the regulation coverage report to see where a policy needs strengthening, all before the inspector arrives.' },
]

// ── Hero hub mockup ───────────────────────────────────────────────────────────

function HubMockup() {
  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-white/20">
      {/* Header */}
      <div className="flex items-center justify-between bg-teal px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-[10px] font-extrabold text-white">CS</div>
          <div>
            <p className="text-sm font-bold text-white">CareStream Hub</p>
            <p className="text-[10px] text-white/70">Crossways Nursing Home</p>
          </div>
        </div>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold text-white">Night shift</span>
      </div>
      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-hidden border-b border-gray-100 bg-white px-3 py-2">
        {['Policies', 'Handbook', 'Training', 'CQC'].map((c, i) => (
          <span key={c} className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${i === 0 ? 'bg-teal text-white' : 'bg-gray-100 text-neutral-mid'}`}>{c}</span>
        ))}
      </div>
      {/* Chat */}
      <div className="space-y-2.5 bg-gray-50 p-3.5">
        <div className="flex justify-end">
          <div className="max-w-[82%] rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl bg-teal px-3 py-2">
            <p className="text-xs leading-snug text-white">What are the early warning signs of sepsis I should escalate?</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-white">CS</div>
          <div className="max-w-[88%] rounded-tl-sm rounded-tr-2xl rounded-br-2xl rounded-bl-2xl border border-gray-100 bg-white p-3 shadow-sm">
            <p className="text-[11px] leading-relaxed text-neutral-dark">
              Escalate immediately for a new high NEWS2 score, raised respiratory rate, low blood pressure, new confusion or mottled skin. Inform the nurse in charge and follow the escalation pathway.
            </p>
            <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-teal/15 bg-teal/5 px-2 py-1">
              <FileText size={11} className="flex-shrink-0 text-teal" />
              <span className="text-[10px] font-medium text-teal">Sepsis Policy v2.4 · Section 3</span>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-mid"><Volume2 size={11} /> Listen</span>
              <span className="flex items-center gap-1 text-[10px] font-medium text-neutral-mid"><Globe size={11} /> 60+ languages</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 pl-8">
          {['What is the NEWS2 threshold?', 'Who do I call overnight?'].map((s) => (
            <span key={s} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] text-neutral-mid">{s}</span>
          ))}
        </div>
      </div>
      {/* Input bar */}
      <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2.5">
        <div className="flex-1 rounded-full border border-gray-200 px-3 py-1.5 text-[11px] text-gray-300">Ask a question…</div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal/10 text-teal"><Mic size={13} /></div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal text-white"><Send size={12} /></div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function NursingHomesPage() {
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
              <SectionLabel light>CareStream for Nursing Homes</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Clinical answers at the bedside, on every shift, in every language your team speaks.
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                Nursing homes carry clinical risk around the clock, with a mixed team of registered
                nurses and care assistants and a workforce that often speaks many languages. CareStream
                gives every member of your team instant access to your clinical and care policies,
                training and CQC tools, grounded in your own documents.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/demo" className="btn-amber rounded-btn px-8 py-4 text-sm">Book a Demo</Link>
                <Link href="/register" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">Start Free Trial</Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <HubMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ── The challenge ─────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>The Challenge in Nursing Homes</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Clinical complexity, a mixed team, and a regulator that looks closely.
              </h2>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-mid">
                <p>
                  A care assistant on a night shift needs a clear answer about a deteriorating resident,
                  but the nurse in charge is busy and the policy folder is in the office. A new registered
                  nurse is unsure of your exact escalation pathway. A staff member whose first language is
                  not English struggles to follow a written procedure under pressure.
                </p>
                <p>
                  Nursing homes face the most clinical scrutiny at inspection, particularly under the Safe
                  and Effective key questions. CareStream closes the gap between the procedure on paper and
                  the practice on the floor, for every member of the team, at any hour.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              {[
                { Icon: Clock,    title: 'Around-the-clock clinical risk', body: 'Questions about medicines, deterioration and end-of-life care come up at 3am, not only during the day.' },
                { Icon: Users,    title: 'A mixed nursing and care team',  body: 'Registered nurses and care assistants need consistent answers from the same approved procedures.' },
                { Icon: Globe,    title: 'A multilingual workforce',       body: 'A large part of the nursing and care workforce speaks English as a second language.' },
                { Icon: ShieldCheck, title: 'Close CQC scrutiny',          body: 'Inspectors look hard at clinical safety, medicines and how staff apply your policies in practice.' },
              ].map(({ Icon, title, body }) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-light">
                    <Icon size={18} className="text-teal" />
                  </div>
                  <div>
                    <p className="mb-0.5 font-semibold text-neutral-dark">{title}</p>
                    <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Services applied ──────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Everything CareStream Does, For Your Nursing Home</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            One platform for clinical answers, training, audits and CQC.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            CareStream is far more than policy access. Every service runs on the same engine, grounded
            in your own documents, and all in one hub your team signs into once.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map(({ Icon, title, href, desc }) => (
              <Link
                key={title}
                href={href}
                className="card-lift group flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition-colors hover:border-teal/30"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon size={20} className="text-teal" />
                </div>
                <h3 className="mb-2 font-bold text-neutral-dark">{title}</h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-neutral-mid">{desc}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-teal">Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Scenarios ─────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>In Practice</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            How your nursing home uses CareStream, day to day.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            CareStream is not another system your team has to remember to use. It fits the moments that
            already happen on every shift, and gives the right answer at the moment it matters.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            {SCENARIOS.map(({ tag, body }) => (
              <div key={tag} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <span className="mb-3 inline-block rounded-full bg-teal/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">{tag}</span>
                <p className="leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Clinical deep-dive ────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <SectionLabel>At the Point of Care</SectionLabel>
              <h2 className="mb-5 text-4xl font-extrabold leading-tight text-neutral-dark">
                Your clinical procedures, answered the moment they are needed.
              </h2>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Staff ask a question in plain language and get the answer from your own clinical policy,
                with the source and version shown. No hunting through a folder, no waiting until morning,
                and no guessing.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Because every answer is grounded in your documents and cites them, your registered nurses
                and care assistants act on the same approved guidance, every time.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'Medicines and MAR charts', 'Sepsis and NEWS2 escalation', 'Wound and pressure care',
                  'Syringe drivers', 'Catheter care', 'Falls management',
                  'PEG feeding', 'End-of-life and anticipatory medicines',
                ].map((t) => (
                  <span key={t} className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-dark">{t}</span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-teal-gradient p-8 shadow-teal-glow">
              <Globe size={28} className="mb-4 text-white" />
              <h3 className="mb-3 text-2xl font-extrabold leading-tight text-white">
                In the language your team thinks in.
              </h3>
              <p className="mb-6 leading-relaxed text-white/85">
                Your policies stay in English. A nurse or carer can ask in Polish, Tagalog, Romanian or
                any of over 60 languages, by typing or speaking, and hear the answer read back in the
                same language. Nobody is held back by a written procedure they find hard to follow at speed.
              </p>
              <div className="space-y-2.5">
                {[
                  'Over 60 languages, detected automatically',
                  'Speak the question and listen to the answer',
                  'The same accurate guidance for every member of the team',
                ].map((p) => (
                  <div key={p} className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-white" />
                    <span className="text-sm text-white/90">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What it does for you ──────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>What CareStream Does For You</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold leading-tight text-neutral-dark">
            Safer practice, a confident team, and inspection evidence that builds itself.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { Icon: Stethoscope,   title: 'Clinical answers on every shift', body: 'Staff get approved guidance at the point of care, day or night, without waiting for the nurse in charge.' },
              { Icon: Users,         title: 'Consistent practice across the team', body: 'Registered nurses and care assistants act on the same procedures, so practice is consistent regardless of who is on shift.' },
              { Icon: Globe,         title: 'A workforce supported in its own language', body: 'Every member of the team understands your procedures, whatever language they are most confident in.' },
              { Icon: GraduationCap, title: 'Mandatory training kept current', body: 'Training built from your own policies, with automatic renewal reminders and a live compliance dashboard.' },
              { Icon: BarChart2,     title: 'Inspection evidence on tap', body: 'Every query is logged, and your CQC readiness builds itself from real, day-to-day policy use.' },
              { Icon: Clock,         title: 'New and agency nurses up to speed fast', body: 'A new starter can ask your exact procedures from day one, instead of relying on whoever is nearby.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-teal-light">
                  <Icon size={18} className="text-teal" />
                </div>
                <p className="mb-1.5 font-semibold text-neutral-dark">{title}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Getting started ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Getting Started</SectionLabel>
          <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
            Up and running in your nursing home, usually the same day.
          </h2>
          <p className="mb-14 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            There is no new hardware, no integration project, and no training day. You bring your own
            policies, and CareStream does the rest.
          </p>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: '01', title: 'Upload your policies', body: 'Add your clinical and care policies, your staff handbook and any local procedures. CareStream reads and indexes them automatically within minutes, and keeps your version history.' },
              { step: '02', title: 'Invite your team', body: 'Staff get a one-tap sign-in link and install the hub on their phone like an app. No passwords to remember, no classroom session, and nothing for them to learn.' },
              { step: '03', title: 'Start asking', body: 'From day one, your nurses and carers ask questions and get answers from your own documents, and your CQC evidence begins to build itself with every query.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">{step}</span>
                <h3 className="mb-2 text-lg font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CQC for nursing homes ─────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>CQC for Nursing Homes</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            Built around the areas inspectors look at most.
          </h2>
          <div className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
            <p>
              Nursing homes are assessed closely on clinical safety and effectiveness. CareStream gives
              you evidence that your policies are live and in use, prepares your team for inspector
              conversations, and shows you where your policies leave a gap before an inspection finds it.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { Icon: BarChart2,  title: 'Evidence of policy use', body: 'Every policy query is logged by role, language and date, building a CQC Readiness Report you can download as a PDF.' },
              { Icon: HelpCircle, title: 'Staff ready to be asked', body: 'Inspector-style questions across the five key questions, answered by staff in their own words and scored by AI, with review and retry.' },
              { Icon: ShieldCheck,title: 'Regulation coverage', body: 'CareStream reads the content of your policies and shows which regulations are covered, partly covered, or a gap.' },
            ].map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light">
                  <Icon size={20} className="text-teal" />
                </div>
                <h3 className="mb-2 font-bold text-neutral-dark">{title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <HomeFaq faqs={FAQS} />

      <PageCta
        heading="Give your whole nursing team the right answer, on every shift."
        sub="See how CareStream works for your nursing home."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
