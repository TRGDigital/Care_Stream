import Image from 'next/image'
import { Zap, MessageSquareText, Award } from 'lucide-react'

// "The follow up loop" — how CareStream turns wrong answers into targeted
// lessons instead of moving on. Diagram supplied as final artwork.

const STEPS = [
  {
    Icon: Zap,
    title: 'Instant lesson and feedback',
    body: 'A wrong answer immediately opens a short lesson explaining the point, so the gap is closed there and then.',
  },
  {
    Icon: MessageSquareText,
    title: 'Targeted follow up question',
    body: 'A fresh question on the same point checks the lesson has landed. The loop repeats until it has.',
  },
  {
    Icon: Award,
    title: 'Progress only when understood',
    body: 'Staff move on to the next module and their certificate once they genuinely know the answer, not just after one lucky guess.',
  },
]

export function TrainingFollowUpLoop({ className = '' }: { className?: string }) {
  return (
    <section className={`px-6 py-16 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-teal">The follow up loop</span>
          <h2 className="mt-2 text-3xl font-extrabold text-neutral-dark sm:text-4xl">Wrong answers become lessons, not failures</h2>
          <p className="mt-3 text-neutral-mid">
            Most e learning marks an answer wrong and moves on. CareStream does not. Every wrong answer
            triggers an automatic follow up loop that teaches the point again and rechecks it, so no
            knowledge gap is left behind.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-light text-teal">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-base font-bold text-neutral-dark">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-mid">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Image
            src="/training-follow-up-loop.jpg"
            alt="The CareStream automatic follow up loop: a wrong answer triggers an instant lesson and a targeted follow up question, a correct answer progresses to the next module and the certificate"
            width={1600}
            height={878}
            className="h-auto w-full rounded-3xl border border-gray-100 shadow-card"
          />
        </div>
      </div>
    </section>
  )
}
