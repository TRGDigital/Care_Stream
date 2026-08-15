import Image from 'next/image'
import { BookOpen, BookA, TrendingUp, PenLine, FileText, ClipboardCheck } from 'lucide-react'

// "Inside every course" — the six learning features that come as standard on
// every CareStream training course. Shown on /staff-training, each course page
// and the /go PPC landings.

const FEATURES = [
  {
    Icon: BookOpen,
    title: 'References and further reading',
    body: 'Every course is built on recognised UK guidance and cites its sources, from NICE and Skills for Care to the NHS and the legislation itself.',
  },
  {
    Icon: BookA,
    title: 'Key terms explained',
    body: 'A plain English glossary of the technical terms in each course. A simple way to support every learner, including staff with English as a second language.',
  },
  {
    Icon: TrendingUp,
    title: 'Measured learning gain',
    body: 'A quick knowledge check before the lesson is compared with the final assessment, so every certificate comes with evidence of how much the course actually taught.',
  },
  {
    Icon: PenLine,
    title: 'Reflective practice',
    body: 'After passing, staff record what they will do differently in their day to day work. Their reflection is saved to their training record and shown with their certificate.',
  },
  {
    Icon: FileText,
    title: 'A course summary to keep',
    body: 'A printable one page takeaway of the outcomes, key points and key terms. Perfect for staff files, supervision conversations and the staff room wall.',
  },
  {
    Icon: ClipboardCheck,
    title: 'Observed competency checklist',
    body: 'A printable checklist for managers to confirm skills in practice, with a sign off section. It completes the picture beyond the knowledge assessment.',
  },
]

export function TrainingCpdFeatures({ className = '' }: { className?: string }) {
  return (
    <section className={`px-6 py-16 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Sticky text: heading + the six features stay in view while the screenshots scroll */}
          <div className="lg:sticky lg:top-24">
            <span className="text-xs font-bold uppercase tracking-widest text-teal">Inside every course</span>
            <h2 className="mt-2 text-3xl font-extrabold text-neutral-dark sm:text-4xl">Built for real learning, not box ticking</h2>
            <p className="mt-3 text-neutral-mid">
              Every CareStream course goes further than a lesson and a quiz. These features come as standard on
              every course, giving your staff a richer way to learn and giving you the evidence to prove it.
            </p>
            <div className="mt-6 space-y-3">
              {FEATURES.map(({ Icon, title, body }) => (
                <div key={title} className="flex gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-teal-light text-teal">
                    <Icon size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-dark">{title}</h3>
                    <p className="mt-0.5 text-sm leading-relaxed text-neutral-mid">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* The learner journey, screenshot by screenshot */}
          <div className="space-y-5">
            <Image
              src="/cpd-training-hub.jpg"
              alt="The staff training hub showing assigned courses, progress and follow up questions"
              width={1600}
              height={848}
              className="h-auto w-full rounded-2xl border border-gray-100 bg-white shadow-card"
            />
            <Image
              src="/cpd-module-complete.jpg"
              alt="The end of module screen with the reflective practice prompt, mapped standards and the printable course summary and competency checklist"
              width={1400}
              height={1110}
              className="h-auto w-full rounded-2xl border border-gray-100 bg-white shadow-card"
            />
            <Image
              src="/cpd-course-summary.jpg"
              alt="The printable one page course summary with learning outcomes, key points, key terms and references"
              width={754}
              height={1189}
              className="h-auto w-full rounded-2xl border border-gray-100 bg-white shadow-card"
            />
            <Image
              src="/cpd-observation-checklist.jpg"
              alt="The printable observed competency checklist with tick boxes and a manager sign off section"
              width={1123}
              height={1276}
              className="h-auto w-full rounded-2xl border border-gray-100 bg-white shadow-card"
            />
            <Image
              src="/follow-up-hub.jpg"
              alt="The Follow-up section of the staff hub listing the questions a staff member got wrong, each with Learn and retry options"
              width={1400}
              height={902}
              className="h-auto w-full rounded-2xl border border-gray-100 bg-white shadow-card"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
