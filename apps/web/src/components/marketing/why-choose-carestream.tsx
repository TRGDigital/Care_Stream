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
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-teal">Why CareStream</span>
          <h2 className="mt-2 text-3xl font-extrabold text-neutral-dark sm:text-4xl">Why choose CareStream?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-neutral-mid">Training built for the care sector, delivered the way busy teams actually learn.</p>
          {durationLabel && (
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-teal-light px-4 py-1.5 text-sm font-semibold text-teal">
              <Clock size={15} /> Time to complete: {durationLabel}
            </p>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {points.map((p) => (
            <div key={p} className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-card">
              <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-light text-teal">
                {p.toLowerCase().includes('accredited') ? <ShieldCheck size={14} /> : <Check size={14} />}
              </span>
              <span className="font-semibold text-neutral-dark">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
