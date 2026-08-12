import Image from 'next/image'
import { Check, ShieldCheck, Clock } from 'lucide-react'
import { TRAINING_ACCREDITED } from '@/lib/training-commerce'

// Accurate CareStream differentiators. The "CPD certified" line is gated behind
// TRAINING_ACCREDITED and only shows once the courses are approved.
const POINTS = [
  '90+ care-specific training courses',
  'Bitesize, engaging lessons your staff actually finish',
  'Mapped to the Care Certificate & CQC standards',
  'Available in 60+ languages',
  'Instant certificate on completion',
  'Flexible learning, anytime, on any device',
  'Content kept up to date with UK care regulations',
]

export function WhyChooseCareStream({ className = '', durationLabel }: { className?: string; durationLabel?: string }) {
  const points = TRAINING_ACCREDITED ? ['CPD certified, accredited courses', ...POINTS] : POINTS
  return (
    <section className={`px-6 py-16 sm:py-20 ${className}`}>
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left: heading + bullet blocks */}
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-teal">Why CareStream</span>
            <h2 className="mt-2 text-3xl font-extrabold text-neutral-dark sm:text-4xl">Why choose CareStream?</h2>
            <p className="mt-3 max-w-xl text-neutral-mid">Training built for the care sector, delivered the way busy teams actually learn.</p>
            {durationLabel && (
              <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-teal-light px-4 py-1.5 text-sm font-semibold text-teal">
                <Clock size={15} /> Time to complete: {durationLabel}
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {points.map((p) => (
                <div key={p} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
                  <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-light text-teal">
                    {p.toLowerCase().includes('accredited') ? <ShieldCheck size={14} /> : <Check size={14} />}
                  </span>
                  <span className="text-sm font-semibold text-neutral-dark">{p}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: app screenshot */}
          <div className="lg:pl-4">
            <Image
              src="/why-carestream-training.jpg"
              alt="A care worker viewing their mandatory training on the CareStream app"
              width={1200}
              height={915}
              className="h-auto w-full rounded-3xl shadow-card"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
