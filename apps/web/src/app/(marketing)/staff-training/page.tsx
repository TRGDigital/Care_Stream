import Link from 'next/link'
import {
  CheckCircle2, Mail, Globe, BarChart2,
  Bell, RefreshCw, Brain, ShieldCheck, Zap, Users,
  MessageSquare, Mic, Smartphone, Sparkles, GraduationCap, BadgeCheck, CalendarDays,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { EditableContentBlock } from '@/components/marketing/editable-content-block'
import { TrainingLibraryTabs } from '@/components/marketing/training-library-tabs'
import { TrainingCpdFeatures } from '@/components/marketing/training-cpd-features'
import { TrainingFollowUpLoop } from '@/components/marketing/training-follow-up-loop'
import { TrainingDemo, type TrainingDemoData } from '@/components/marketing/training-demo'
import { getContentSlots, makeSlot } from '@/lib/page-slots'
import { STAFF_TRAINING_SLOTS } from '@/lib/page-slots/staff-training'

const RICH_LINK = '[&_a]:font-semibold [&_a]:text-teal [&_a]:underline [&_a]:underline-offset-2'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type CatalogueTopic = {
  slug: string
  title: string
  group_key: string
  care_setting: string | null
  frequency: string
  requires_practical: boolean
  built: boolean
  description: string | null
  duration_minutes: number | null
  pass_mark: number | null
  illustration_url: string | null
}

type Catalogue = { groups: Record<string, string>; settings: Array<{ key: string; label: string }>; topics: CatalogueTopic[] }

async function getCatalogue(): Promise<Catalogue> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { next: { revalidate: 60 } })
    if (res.ok) {
      const d = (await res.json())?.data
      if (Array.isArray(d?.topics)) return { groups: d.groups ?? {}, settings: d.settings ?? [], topics: d.topics as CatalogueTopic[] }
    }
  } catch {
    // fall through to an empty catalogue
  }
  return { groups: {}, settings: [], topics: [] }
}

// Live one-lesson taster for the hero — a real lesson from the Care Certificate
// course, the same interactive demo card the /go landing pages lead with.
async function getHeroDemo(): Promise<TrainingDemoData | null> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules/care-certificate/demo?v=2`, { next: { revalidate: 300 } })
    if (res.ok) return (await res.json())?.data?.demo ?? null
  } catch { /* fall through */ }
  return null
}

export const metadata = {
  alternates: { canonical: 'https://www.carestreamai.com/staff-training' },
  title:       'Staff Training and Compliance | CareStreamAI',
  description: 'Move beyond annual tick-box training. CareStream generates training modules from your own policies, keeps your team engaged in the hub all year, and tracks compliance with automatic renewal reminders.',
  openGraph: {
    type: 'website',
    images: ['/og-image.png'],
    title: 'Staff Training and Compliance | CareStreamAI',
    description: 'Training modules built from your own policies, delivered in the hub all year, with a full compliance dashboard.',
    url: 'https://www.carestreamai.com/staff-training',
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
  const [catalogue, heroDemo] = await Promise.all([getCatalogue(), getHeroDemo()])
  const s = makeSlot(STAFF_TRAINING_SLOTS, await getContentSlots('/staff-training'))

  const PROBLEM_CARDS = [
    { icon: '📅', key: 'problem.card1', dim: true },
    { icon: '💬', key: 'problem.card2', dim: false },
  ]
  const HOW_STEPS = [
    { step: '01', Icon: CheckCircle2,   key: 'how.step1' },
    { step: '02', Icon: MessageSquare,  key: 'how.step2' },
    { step: '03', Icon: BarChart2,      key: 'how.step3' },
  ]
  const POLICY_FEATURES = [
    { Icon: Sparkles,      key: 'policies.item1' },
    { Icon: GraduationCap, key: 'policies.item2' },
    { Icon: BadgeCheck,    key: 'policies.item3' },
  ]
  const LOOP_FEATURES = [
    { Icon: BadgeCheck,   key: 'loop.item1' },
    { Icon: RefreshCw,    key: 'loop.item2' },
    { Icon: CheckCircle2, key: 'loop.item3' },
  ]
  const BEYOND_CARDS = [
    { Icon: Brain,          key: 'beyond.card1' },
    { Icon: MessageSquare,  key: 'beyond.card2' },
    { Icon: GraduationCap,  key: 'beyond.card3' },
    { Icon: RefreshCw,      key: 'beyond.card4' },
    { Icon: Zap,            key: 'beyond.card5' },
    { Icon: Users,          key: 'beyond.card6' },
  ]
  const F2F_STEPS = [
    { step: '01', Icon: CalendarDays,  key: 'f2f.step1' },
    { step: '02', Icon: CheckCircle2,  key: 'f2f.step2' },
    { step: '03', Icon: GraduationCap, key: 'f2f.step3' },
  ]
  const CQC_ROWS = ['cqc.row1', 'cqc.row2', 'cqc.row3', 'cqc.row4', 'cqc.row5', 'cqc.row6']
  const EVERYTHING_CARDS = [
    { icon: ShieldCheck,   key: 'everything.card1', iconBg: 'bg-blue-100',    iconColor: 'text-blue-600' },
    { icon: Sparkles,      key: 'everything.card2', iconBg: 'bg-purple-100',  iconColor: 'text-purple-600' },
    { icon: Brain,         key: 'everything.card3', iconBg: 'bg-green-100',   iconColor: 'text-green-600' },
    { icon: GraduationCap, key: 'everything.card4', iconBg: 'bg-orange-100',  iconColor: 'text-orange-600' },
    { icon: BadgeCheck,    key: 'everything.card5', iconBg: 'bg-teal-light',  iconColor: 'text-teal' },
    { icon: Bell,          key: 'everything.card6', iconBg: 'bg-amber-100',   iconColor: 'text-amber-600' },
    { icon: BarChart2,     key: 'everything.card7', iconBg: 'bg-indigo-100',  iconColor: 'text-indigo-600' },
    { icon: Users,         key: 'everything.card8', iconBg: 'bg-cyan-100',    iconColor: 'text-cyan-600' },
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
              <SectionLabel light>CPD Annual Training</SectionLabel>
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Annual training your team completes, not just ticks off
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/75">
                Ready made courses for every mandatory subject, built for real learning. Buy a licence per
                staff member, allocate in one click, and your team completes the course in their own hub,
                in their own language, with certificates and CQC ready evidence handled for you.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a href="#course-library" className="btn-amber rounded-btn px-8 py-4 text-sm">
                  Browse the courses
                </a>
                <Link href="/demo" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">
                  Book a Demo
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              {heroDemo
                ? <div className="w-full max-w-[440px]"><TrainingDemo demo={heroDemo} buyHref="/buy/care-certificate" variant="card" /></div>
                : <TrainingDashboardMockup />}
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
                  className={`card-lift rounded-2xl p-6 ${
                    dim
                      ? 'border border-gray-100 bg-white shadow-card'
                      : 'bg-teal-gradient shadow-teal-glow'
                  }`}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <p className={`text-xs font-bold uppercase tracking-widest ${dim ? 'text-neutral-mid' : 'text-white/60'}`}>
                      {s(`${key}.label`)}
                    </p>
                  </div>
                  <p className={`leading-relaxed ${dim ? 'text-neutral-mid' : 'text-white'}`}>{s(`${key}.text`)}</p>
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
          <p className="mb-14 text-lg leading-relaxed text-neutral-mid">
            {s('how.intro')}
          </p>

          <div className="grid gap-6 md:grid-cols-3">
            {HOW_STEPS.map(({ step, Icon, key }) => (
              <div key={step} className="card-lift rounded-2xl border border-gray-100 bg-white p-7 shadow-card">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal text-sm font-extrabold text-white shadow-teal-glow">
                    {step}
                  </span>
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

      {/* ── Annual mandatory training library ─────────────────────────────── */}
      {catalogue.topics.length > 0 && (
        <section id="course-library" className="scroll-mt-20 bg-neutral-light py-24">
          <div className="mx-auto max-w-content px-6">
            <SectionLabel>{s('library.label')}</SectionLabel>
            <h2 className="mb-4 text-4xl font-extrabold leading-tight text-neutral-dark">
              {s('library.h2')}
            </h2>
            <p className="mb-14 text-lg leading-relaxed text-neutral-mid">
              {s('library.intro')}
            </p>
            <TrainingLibraryTabs groups={catalogue.groups} settings={catalogue.settings} topics={catalogue.topics} />
            <p className="mt-12 text-sm text-neutral-mid">
              {s('library.footnote')}
            </p>
          </div>
        </section>
      )}

      {/* ── Inside every course: the six learning features ────────────────── */}
      <TrainingCpdFeatures className="bg-white" />

      {/* ── The follow up loop: wrong answers become lessons ──────────────── */}
      <TrainingFollowUpLoop className="bg-neutral-light" />

      {/* ── Reporting that runs itself ─────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>Reporting</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            Reporting that runs itself
          </h2>
          <p className="mb-12 max-w-3xl text-lg leading-relaxed text-neutral-mid">
            Every completion updates the record automatically: scores, learning gain, learning time,
            certificates and learner feedback, all in one place. You are emailed the moment a staff
            member passes, and every record is ready for inspection without any admin.
          </p>
          <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-teal/30 bg-teal-light/20 text-center">
            <p className="text-sm font-semibold text-teal/70">Image placeholder</p>
            <p className="max-w-md px-6 text-xs text-neutral-mid">Screenshot: the training analytics dashboard showing completion, scores and learner feedback</p>
          </div>
        </div>
      </section>

      {/* ── Channel mockups ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('action.label')}</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('action.h2')}
          </h2>

          {/* ── The hub ── */}
          <div className="mb-12 grid items-start gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-light">
                  <Smartphone size={18} className="text-teal" />
                </div>
                <span className="text-xl font-bold text-neutral-dark">{s('action.hub.label')}</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('action.hub.h3')}
              </h3>
              <div
                className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
                dangerouslySetInnerHTML={{ __html: s('action.hub.p1') }}
              />
              <div
                className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
                dangerouslySetInnerHTML={{ __html: s('action.hub.p2') }}
              />
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">{s('action.hub.lang')}</p>
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
                <span className="text-xl font-bold text-neutral-dark">{s('action.email.label')}</span>
              </div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('action.email.h3')}
              </h3>
              <div
                className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
                dangerouslySetInnerHTML={{ __html: s('action.email.p1') }}
              />
              <div
                className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
                dangerouslySetInnerHTML={{ __html: s('action.email.p2') }}
              />
              <div className="rounded-xl border border-teal/20 bg-teal/5 px-4 py-3">
                <div className="mb-2.5 flex items-center gap-2">
                  <Globe size={15} className="flex-shrink-0 text-teal" />
                  <p className="text-sm font-medium text-neutral-dark">{s('action.email.lang')}</p>
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

      {/* ── Close the loop (learn and retry) ──────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('loop.label')}</SectionLabel>
          <h2 className="mb-10 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('loop.h2')}
          </h2>
          <div className="grid items-start gap-12 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 text-2xl font-extrabold leading-tight text-neutral-dark">
                {s('loop.h3')}
              </h3>
              <div
                className={`mb-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
                dangerouslySetInnerHTML={{ __html: s('loop.p1') }}
              />
              <div
                className={`mb-6 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
                dangerouslySetInnerHTML={{ __html: s('loop.p2') }}
              />
              <div className="space-y-3">
                {LOOP_FEATURES.map(({ Icon, key }) => (
                  <div key={key} className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <Icon size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                    <div>
                      <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{s(`${key}.label`)}</p>
                      <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.text`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Learn-and-retry mockup */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
                <div className="bg-teal px-4 py-3">
                  <p className="text-sm font-bold text-white">Let us revisit this</p>
                  <p className="text-[11px] text-white/70">Medication Management</p>
                </div>
                <div className="space-y-3 bg-gray-50 p-4">
                  <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                    <RefreshCw size={13} className="flex-shrink-0 text-amber-600" />
                    <p className="text-[11px] font-semibold text-amber-700">Not quite. Let us go over it together.</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-teal">Why it matters</p>
                    <p className="text-[11px] leading-relaxed text-neutral-dark">
                      A medication error must be reported straight away, not left until handover, so the resident can be checked and the right action taken without delay.
                    </p>
                    <p className="mb-1 mt-2.5 text-[10px] font-bold uppercase tracking-wide text-teal">Remember</p>
                    <ul className="space-y-0.5 text-[11px] text-neutral-mid">
                      <li>• Tell the nurse in charge immediately</li>
                      <li>• Record exactly what happened</li>
                      <li>• Monitor the resident for any effects</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-teal/20 bg-teal/5 p-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-teal">A new question</p>
                    <p className="mb-2 text-[11px] font-medium leading-snug text-neutral-dark">
                      You realise a colleague gave a double dose an hour ago. What do you do first?
                    </p>
                    <div className="space-y-1 text-[11px]">
                      <p className="rounded-md bg-white px-2 py-1 text-neutral-mid">Note it for the next handover</p>
                      <p className="rounded-md bg-teal px-2 py-1 font-semibold text-white">Tell the nurse in charge now ✓</p>
                      <p className="rounded-md bg-white px-2 py-1 text-neutral-mid">Wait and see if anything happens</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
                    <CheckCircle2 size={13} className="flex-shrink-0" /> Got it. Gap closed and logged.
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
          <SectionLabel light>{s('beyond.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-white">
            {s('beyond.h2')}
          </h2>
          <p className="mb-14 text-lg leading-relaxed text-white/80">
            {s('beyond.intro')}
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BEYOND_CARDS.map(({ Icon, key }) => (
              <div key={key} className="card-lift rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/20">
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

      {/* ── Training matrix ───────────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <SectionLabel>{s('matrix.label')}</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                {s('matrix.h2')}
              </h2>
              <div className={`space-y-4 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}>
                <div dangerouslySetInnerHTML={{ __html: s('matrix.p1') }} />
                <div dangerouslySetInnerHTML={{ __html: s('matrix.p2') }} />
              </div>
            </div>
            <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-teal/30 bg-white text-center">
              <p className="text-sm font-semibold text-teal/70">Image placeholder</p>
              <p className="max-w-md px-6 text-xs text-neutral-mid">Screenshot: the training matrix showing every staff member against every course with status at a glance</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CQC evidence angle ────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <SectionLabel>{s('cqc.label')}</SectionLabel>
          <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
            {s('cqc.h2')}
          </h2>
          <div
            className={`mb-12 text-lg leading-relaxed text-neutral-mid ${RICH_LINK}`}
            dangerouslySetInnerHTML={{ __html: s('cqc.intro') }}
          />

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card">
            <div className="grid grid-cols-[1fr_2fr] border-b border-gray-100 bg-neutral-light px-6 py-4 text-xs font-bold uppercase tracking-widest text-neutral-mid">
              <span>{s('cqc.col1')}</span>
              <span>{s('cqc.col2')}</span>
            </div>
            {CQC_ROWS.map((key, i) => (
              <div key={key} className={`grid grid-cols-[1fr_2fr] px-6 py-5 ${i < 5 ? 'border-b border-gray-100' : ''}`}>
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
          <SectionLabel>{s('everything.label')}</SectionLabel>
          <h2 className="mb-12 text-4xl font-extrabold text-neutral-dark">
            {s('everything.h2')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {EVERYTHING_CARDS.map(({ icon: Icon, key, iconBg, iconColor }) => (
              <div key={key} className="card-lift rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
                <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
                  <Icon size={16} className={iconColor} />
                </div>
                <p className="mb-1.5 font-semibold text-neutral-dark">{s(`${key}.label`)}</p>
                <p className="text-sm leading-relaxed text-neutral-mid">{s(`${key}.desc`)}</p>
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
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">{s('stats.col1.figure')}</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                {s('stats.col1.title')}
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                {s('stats.col1.body')}
              </p>
            </div>
            <div className="md:px-12">
              <p className="mb-6 text-5xl font-extrabold leading-none text-teal">{s('stats.col2.figure')}</p>
              <p className="mb-5 text-xl font-bold leading-snug text-neutral-dark">
                {s('stats.col2.title')}
              </p>
              <p className="text-base leading-loose text-neutral-mid">
                {s('stats.col2.body')}
              </p>
            </div>
          </div>
        </div>
      </section>

      <EditableContentBlock path="/staff-training" />

      <PageCta
        heading="Turn compliance training into a year-round conversation."
        sub="See how CareStream training works for your team."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See pricing', href: '/pricing' }}
      />
    </>
  )
}
