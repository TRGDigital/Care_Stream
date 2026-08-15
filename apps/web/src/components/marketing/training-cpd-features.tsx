import { BookOpen, BookA, TrendingUp, PenLine, FileText, ClipboardCheck, Image as ImageIcon } from 'lucide-react'

// "Inside every course" — the six learning features that come as standard on
// every CareStream training course. Shown on /staff-training, each course page
// and the /go PPC landings. The image slot below the grid is a placeholder
// until the final artwork is supplied (swap the placeholder block for a
// next/image once /public/cpd-course-features.jpg exists).

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
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-teal">Inside every course</span>
          <h2 className="mt-2 text-3xl font-extrabold text-neutral-dark sm:text-4xl">Built for real learning, not box ticking</h2>
          <p className="mt-3 text-neutral-mid">
            Every CareStream course goes further than a lesson and a quiz. These features come as standard on
            every course, giving your staff a richer way to learn and giving you the evidence to prove it.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light text-teal">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-bold text-neutral-dark">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-mid">{body}</p>
            </div>
          ))}
        </div>

        {/* Image slot — placeholder until the final artwork is supplied */}
        <div className="mt-10 flex aspect-[21/9] w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-teal/30 bg-teal-light/20 text-center">
          <ImageIcon size={32} className="text-teal/50" />
          <p className="text-sm font-semibold text-teal/70">Image placeholder</p>
          <p className="max-w-md px-6 text-xs text-neutral-mid">
            Final artwork to follow. Suggested: the learning gain result, reflection card and printable
            checklist shown side by side around a course certificate.
          </p>
        </div>
      </div>
    </section>
  )
}
