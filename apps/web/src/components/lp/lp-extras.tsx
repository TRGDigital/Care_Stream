import { CheckCircle2 } from 'lucide-react'
import type { LpContent } from '@/lib/lp/types'
import { LpCta } from './lp-form-overlay'

/* eslint-disable @next/next/no-img-element */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs font-bold uppercase tracking-widest text-teal">{children}</p>
}

// Minimal header (logo + single CTA), rendered inside the gradient hero. No nav.
export function LpHeader({ ctaLabel }: { ctaLabel: string }) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <img src="/logo-white.png" alt="CareStreamAI" className="h-14 w-auto" />
      <LpCta className="hidden rounded-full border border-white/30 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:inline-block">
        {ctaLabel}
      </LpCta>
    </div>
  )
}

export function LpStats({ data }: { data: NonNullable<LpContent['stats']> }) {
  if (!data.items?.length) return null
  return (
    <section className="bg-neutral-dark py-12">
      <div className="mx-auto max-w-content px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          {data.items.map(s => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-extrabold text-white md:text-5xl">{s.value}</p>
              <p className="mx-auto mt-2 max-w-[14rem] text-sm leading-relaxed text-white/70">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function LpWhyUs({ data }: { data: NonNullable<LpContent['whyUs']> }) {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <Eyebrow>{data.eyebrow ?? 'Why CareStreamAI'}</Eyebrow>
            <h2 className="mb-5 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">{data.headline}</h2>
            {data.intro && <p className="mb-8 text-lg leading-relaxed text-neutral-mid">{data.intro}</p>}
            <div className="space-y-6">
              {data.points.map(p => (
                <div key={p.title} className="flex gap-4">
                  <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-teal" />
                  <div>
                    <h3 className="mb-1 font-bold text-neutral-dark">{p.title}</h3>
                    <p className="text-sm leading-relaxed text-neutral-mid">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {data.image && (
            <div className="overflow-hidden rounded-2xl shadow-elevated ring-1 ring-gray-100">
              <img src={data.image.src} alt={data.image.alt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function LpServices({ data }: { data: NonNullable<LpContent['services']> }) {
  if (!data.items?.length) return null
  return (
    <section className="bg-neutral-light py-20">
      <div className="mx-auto max-w-content px-6">
        <h2 className="mb-4 text-3xl font-extrabold leading-tight text-neutral-dark md:text-4xl">{data.headline}</h2>
        {data.intro && <p className="mb-12 max-w-3xl text-lg leading-relaxed text-neutral-mid">{data.intro}</p>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map(item => (
            <div key={item.title} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
              <h3 className="mb-2 font-bold text-neutral-dark">{item.title}</h3>
              <p className="text-sm leading-relaxed text-neutral-mid">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Decorative bits shared by the two yellow bands (matches the home page treatment).
function BandDecorations() {
  return (
    <>
      <svg className="absolute -right-1 top-7 h-7 w-7 text-neutral-dark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6L12 2z" />
      </svg>
      <svg className="absolute right-7 top-1 h-4 w-4 text-neutral-dark" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 4l1 4 4 1-4 1-1 4-1-4-4-1 4-1 1-4z" />
      </svg>
      <svg className="absolute -bottom-1 left-3 h-5 w-24 text-neutral-dark" viewBox="0 0 100 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
        <path d="M3 12 Q 14 2 25 12 T 47 12 T 69 12 T 91 12" />
      </svg>
    </>
  )
}

// Yellow "200+ policies" band, CTA to the form.
export function LpPolicyBand() {
  return (
    <section className="bg-[#fce4a3]">
      <div className="mx-auto grid max-w-content items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-20">
        <div className="flex justify-center">
          <div className="relative h-72 w-72">
            <div className="absolute inset-0 rotate-45 rounded-[2.25rem] bg-[#f4bf43]" />
            <div className="absolute inset-2 overflow-hidden rounded-full ring-8 ring-[#fce4a3]">
              <img src="/images/care-manager.jpg" alt="A care manager using CareStream on a tablet" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -left-3 top-2 z-20 h-16 w-16">
              <span className="absolute inset-0 rounded-[22%] bg-white shadow-md" />
              <span className="absolute inset-0 rotate-45 rounded-[22%] bg-white shadow-md" />
              <span className="absolute inset-0 flex items-center justify-center text-sm font-extrabold text-neutral-dark">200+</span>
            </div>
            <BandDecorations />
          </div>
        </div>
        <div>
          <p className="mb-4 text-lg font-medium text-neutral-dark/80">Hundreds of policies to manage</p>
          <h2 className="text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            The average care setting must keep{' '}
            <span className="box-decoration-clone rounded-md bg-[#5eead4] px-2 py-0.5">over 200 policies</span>
            {' '}current. Your team can find any of them in seconds.
          </h2>
          <div className="mt-8 flex flex-col items-start gap-3">
            <LpCta className="inline-flex items-center gap-2 rounded-full bg-neutral-dark px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]">
              Book my demo <span aria-hidden="true">→</span>
            </LpCta>
            <p className="text-sm text-neutral-dark/70">In any language, on any device, grounded in your own documents.</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// Yellow "free for 14 days" band, CTA to the form.
export function LpTrialBand() {
  return (
    <section className="bg-[#fce4a3]">
      <div className="mx-auto grid max-w-content items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-20">
        <div className="flex justify-center">
          <div className="relative h-72 w-72">
            <div className="absolute inset-0 rotate-45 rounded-[2.25rem] bg-[#f4bf43]" />
            <div className="absolute inset-2 overflow-hidden rounded-full ring-8 ring-[#fce4a3]">
              <img src="/images/free-trial.jpg" alt="A care worker chatting warmly with a resident over a cup of tea" loading="lazy" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -left-3 top-2 z-20 h-16 w-16">
              <span className="absolute inset-0 rounded-[22%] bg-white shadow-md" />
              <span className="absolute inset-0 rotate-45 rounded-[22%] bg-white shadow-md" />
              <span className="absolute inset-0 flex items-center justify-center text-base font-extrabold text-neutral-dark">FREE</span>
            </div>
            <BandDecorations />
          </div>
        </div>
        <div>
          <p className="mb-4 text-lg font-medium text-neutral-dark/80">A risk free way to get started</p>
          <h2 className="text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
            CareStream is{' '}
            <span className="box-decoration-clone rounded-md bg-[#5eead4] px-2 py-0.5">free for 14 days</span>
            <br />
            for your whole team.
          </h2>
          <div className="mt-8 flex flex-col items-start gap-3">
            <LpCta className="inline-flex items-center gap-2 rounded-full bg-neutral-dark px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]">
              Book my demo <span aria-hidden="true">→</span>
            </LpCta>
            <p className="text-sm text-neutral-dark/70">No card needed. Full access for 14 days.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
