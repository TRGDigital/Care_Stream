import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  Sparkles, BadgeCheck, Globe, CalendarDays, Bell, Banknote,
  BarChart2, Clock, Users, FileCheck2, LayoutGrid, CheckCircle2,
  type LucideIcon,
} from 'lucide-react'
import { PageCta, SectionLabel } from '@/components/marketing/ui'
import { TrainingFollowUpLoop } from '@/components/marketing/training-follow-up-loop'
import { TrainingDemo, type TrainingDemoData } from '@/components/marketing/training-demo'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The same live one-lesson taster as the CPD page hero. It shows the language
// toggle, which matters as much for policy-generated training as for courses.
async function getHeroDemo(): Promise<TrainingDemoData | null> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules/care-certificate/demo?v=2`, { next: { revalidate: 300 } })
    if (res.ok) return (await res.json())?.data?.demo ?? null
  } catch { /* fall through */ }
  return null
}

// The platform training product: adhoc modules generated from a service's own
// policies, face to face training management, reporting and the training matrix.
// The ready made purchasable CPD courses live separately at /staff-training.

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('/training-platform', {
    title: 'Training Built From Your Own Policies | CareStreamAI',
    description: 'Generate training modules from your service’s own policies, manage face to face sessions, and see every staff member against every module in one training matrix.',
  })
}

// Product screenshot with the shared card styling.
function Shot({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className="h-auto w-full rounded-2xl border border-gray-100 bg-white shadow-card"
    />
  )
}

function FeatureItem({ Icon, title, body }: { Icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <Icon size={18} className="mt-0.5 flex-shrink-0 text-teal" />
      <div>
        <p className="mb-0.5 text-sm font-semibold text-neutral-dark">{title}</p>
        <p className="text-sm leading-relaxed text-neutral-mid">{body}</p>
      </div>
    </div>
  )
}

export default async function TrainingPlatformPage() {
  const heroDemo = await getHeroDemo()
  return (
    <>
      {/* ── Hero — copy left, interactive demo focal card right ──────────── */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div
          className="absolute bottom-0 left-0 right-0 h-16"
          style={{ background: 'linear-gradient(to bottom right, transparent 49.5%, #fff 50%)' }}
        />
        <div className="relative mx-auto max-w-content px-6 pb-24 pt-20 md:pt-24">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
            <div className="lg:sticky lg:top-24">
              <SectionLabel light>Training</SectionLabel>
              <h1 className="mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl">
                Training built from your own policies
              </h1>
              <p className="mb-8 max-w-2xl text-lg leading-relaxed text-white/75">
                CareStream turns your service&apos;s own policies into training modules, so your staff
                learn your agreed ways of working, not generic content. Add face to face session
                management, reporting and a single training matrix, and every part of training in
                your service is planned, delivered and evidenced in one place.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/demo" className="btn-amber rounded-btn px-8 py-4 text-sm">
                  Book a demo
                </Link>
                <Link href="/staff-training" className="btn-ghost-white rounded-btn px-8 py-4 text-sm">
                  See CPD Annual Training
                </Link>
              </div>
              {heroDemo && (
                <div className="mt-6 hidden items-center gap-3 lg:flex">
                  <span className="text-lg font-extrabold text-white">Try it: a real lesson, in any language</span>
                  <svg width="88" height="30" viewBox="0 0 88 30" fill="none" className="flex-shrink-0 text-white" aria-hidden>
                    <path d="M3 16 C 30 17, 56 19, 80 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    <path d="M70 4 L 83 11 L 69 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            {heroDemo && <TrainingDemo demo={heroDemo} buyHref="/staff-training" variant="card" />}
          </div>
        </div>
      </section>

      {/* ── Adhoc training from your policies ────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-start gap-14 lg:grid-cols-2">
            <div className="lg:sticky lg:top-24">
              <SectionLabel>Built from your documents</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Adhoc training from your policies
              </h2>
              <p className="mb-4 text-lg leading-relaxed text-neutral-mid">
                Pick any policy or topic and CareStream generates a lesson and question set grounded
                in your service&apos;s own policy documents. When a policy changes, an incident throws up
                a gap, or an inspection is coming, you can have relevant training in front of your
                team the same day.
              </p>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Nothing reaches your staff unchecked. Your admin reviews and approves every generated
                module before staff ever see it, so the training your team receives always reflects
                your agreed ways of working.
              </p>
              <div className="space-y-3">
                <FeatureItem
                  Icon={Sparkles}
                  title="Generated from your own policies"
                  body="Choose a policy or topic and get a lesson and question set drawn from your service's own documents, not a generic library."
                />
                <FeatureItem
                  Icon={BadgeCheck}
                  title="Approved before staff see it"
                  body="Every module sits with your admin for review and approval first, so you stay in control of what your team is taught."
                />
                <FeatureItem
                  Icon={Globe}
                  title="Delivered in each learner's first language"
                  body="Modules are delivered in the staff hub in each learner's first language, so understanding is never lost to a language barrier."
                />
              </div>
            </div>
            <div className="space-y-5">
              <Shot src="/platform-adhoc-modules.jpg" alt="The adhoc training library in the admin console, with statutory modules and generated question sets" width={1600} height={939} />
              <Shot src="/platform-policy-preview.jpg" alt="A policy preview in the admin console, the source document a training module is generated from" width={1600} height={930} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Face to face training ────────────────────────────────────────── */}
      <section className="bg-neutral-light py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-start gap-14 lg:grid-cols-2">
            <div className="order-2 lg:order-1">
              <div className="space-y-5">
                <Shot src="/platform-f2f-new-session.jpg" alt="Creating a new face to face session: topic, date, length, capacity, renewal period and allocated staff" width={1400} height={1084} />
                <Shot src="/platform-f2f-session-detail.jpg" alt="A face to face session with attendance, competency, sign in sheet evidence and the option to send the digital module to those who missed" width={1100} height={1224} />
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:sticky lg:top-24">
              <SectionLabel>Practical sessions</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Face to face training, organised
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Some training has to happen in person. CareStream keeps it organised: schedule face
                to face sessions, invite the right staff, and track attendance and completion without
                a spreadsheet in sight.
              </p>
              <div className="space-y-3">
                <FeatureItem
                  Icon={CalendarDays}
                  title="Schedule and invite"
                  body="Set up a session, invite the staff who need it, and see at a glance who is booked on."
                />
                <FeatureItem
                  Icon={Bell}
                  title="Automatic reminders"
                  body="Staff are reminded automatically before their session, so fewer places go to waste and chasing stops being your job."
                />
                <FeatureItem
                  Icon={Banknote}
                  title="A payroll ready report"
                  body="Attendance and completion are recorded against each session, with a payroll ready report of hours owed for sessions attended off shift."
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Reporting ────────────────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-start gap-14 lg:grid-cols-2">
            <div className="lg:sticky lg:top-24">
              <SectionLabel>Evidence without the admin</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                Reporting that runs itself
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                Every lesson, answer and session feeds your reporting automatically. You see
                completion and scores across the whole team, and the record you would want to show
                an inspector builds itself as your staff learn.
              </p>
              <div className="space-y-3">
                <FeatureItem
                  Icon={BarChart2}
                  title="Completion and scores across the team"
                  body="See who has completed what and how they scored, across your whole service, without collating anything."
                />
                <FeatureItem
                  Icon={Clock}
                  title="Learning time and engagement"
                  body="Evidence of the time your staff spend learning and how engaged they are, gathered as it happens."
                />
                <FeatureItem
                  Icon={FileCheck2}
                  title="Per staff member records, inspection ready"
                  body="Each staff member has a complete training record ready to show at inspection, with nothing to assemble on the day."
                />
              </div>
            </div>
            <div className="space-y-5">
              <Shot src="/reporting-staff-record.jpg" alt="A staff member's training record: completion, comparison to the team, statutory record and annual training with scores and certificates" width={1600} height={1213} />
              <Shot src="/reporting-completion-email.jpg" alt="The completion email sent to admins the moment a staff member passes, with score, CPD time and learning gain" width={1100} height={1025} />
            </div>
          </div>
        </div>
      </section>

      {/* ── The follow up loop ───────────────────────────────────────────── */}
      <TrainingFollowUpLoop className="bg-neutral-light" />

      {/* ── The training matrix ──────────────────────────────────────────── */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-content px-6">
          <div className="grid items-start gap-14 lg:grid-cols-2">
            <div className="lg:sticky lg:top-24">
              <SectionLabel>The full picture</SectionLabel>
              <h2 className="mb-6 text-4xl font-extrabold leading-tight text-neutral-dark">
                One training matrix for everything
              </h2>
              <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
                A single matrix shows every staff member against every module, covering annual
                training, adhoc policy training and face to face sessions in one view. Statuses are
                visible at a glance, so you always know where your service stands and what needs
                attention next.
              </p>
              <div className="space-y-3">
                <FeatureItem
                  Icon={Users}
                  title="Every staff member, every module"
                  body="One grid covers your whole team against everything they need to complete, with no separate lists to reconcile."
                />
                <FeatureItem
                  Icon={LayoutGrid}
                  title="Annual, adhoc and face to face together"
                  body="Annual training, adhoc policy modules and face to face sessions all appear in the same matrix, not three different systems."
                />
                <FeatureItem
                  Icon={CheckCircle2}
                  title="Statuses at a glance"
                  body="See what is complete, in progress or outstanding the moment you open it."
                />
              </div>
            </div>
            <div className="space-y-5">
              <Shot src="/reporting-training-matrix.jpg" alt="The whole team training matrix covering adhoc, statutory, specialist and annual training with status per staff member" width={1600} height={866} />
              <Shot src="/matrix-training-calendar.jpg" alt="The training calendar showing face to face sessions, adhoc and annual training allocations and completions across the month" width={1600} height={745} />
            </div>
          </div>
        </div>
      </section>

      <PageCta
        heading="Training your staff will actually recognise as yours."
        sub="See adhoc policy training, face to face management and the training matrix working together in a live demo."
        primary={{ label: 'Book a demo', href: '/demo' }}
        secondary={{ label: 'See CPD Annual Training', href: '/staff-training' }}
      />
    </>
  )
}
