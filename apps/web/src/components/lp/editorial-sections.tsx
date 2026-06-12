import type { LpContent } from '@/lib/lp/types'
import { withAccents } from './accents'
import { LpCta } from './lp-form-overlay'
import { HubDashboardMockup } from './hub-dashboard-mockup'

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-amber-brand">{children}</p>
}

// Why CareStreamAI — the hub mockup beside a serif value-prop list.
export function LpAbout({ eyebrow, headline, intro, items }: {
  eyebrow?: string
  headline: string
  intro?: string
  items: { title: string; description: string }[]
}) {
  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-content px-6">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <div className="order-2 flex justify-center lg:order-1">
            <HubDashboardMockup />
          </div>
          <div className="order-1 lg:order-2">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h2 className="mb-4 text-3xl font-normal leading-tight text-neutral-dark md:text-4xl">{withAccents(headline)}</h2>
            {intro && <p className="mb-8 text-lg leading-relaxed text-neutral-mid">{intro}</p>}
            <ul>
              {items.map(it => (
                <li key={it.title} className="grid grid-cols-[40px_1fr] items-start gap-4 border-b border-cream-line py-5 last:border-b-0">
                  <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-cream-line bg-white font-display text-lg text-teal">✦</span>
                  <div>
                    <p className="font-display text-lg font-medium text-neutral-dark">{it.title}</p>
                    <p className="mt-1 text-[15px] leading-relaxed text-neutral-mid">{it.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* eslint-disable @next/next/no-img-element */

// "One platform" — the full module range as quiet editorial cards (no links).
export function LpPlatform({ data }: { data: NonNullable<LpContent['services']> }) {
  if (!data.items?.length) return null
  return (
    <section className="bg-cream-warm py-20">
      <div className="mx-auto max-w-content px-6">
        <Eyebrow>What's included</Eyebrow>
        <h2 className="mb-4 text-3xl font-normal leading-tight text-neutral-dark md:text-4xl">{withAccents(data.headline)}</h2>
        {data.intro && <p className="mb-12 max-w-3xl text-lg leading-relaxed text-neutral-mid">{data.intro}</p>}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.items.map(it => (
            <div key={it.title} className="rounded-lg border border-cream-line bg-white p-6 shadow-card">
              <h3 className="font-display text-lg font-medium leading-snug text-neutral-dark">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-mid">{it.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// Editorial statement band (the home-page yellow blocks, reskinned): photo +
// a serif statement with an accent badge and a CTA.
export function LpStatementBand({ tone = 'warm', label, statement, sub, badge, image, imageAlt, imageSide = 'left' }: {
  tone?: 'cream' | 'warm'
  label?: string
  statement: string
  sub?: string
  badge?: string
  image: string
  imageAlt: string
  imageSide?: 'left' | 'right'
}) {
  return (
    <section className={tone === 'warm' ? 'bg-cream-warm py-16 md:py-20' : 'bg-cream py-16 md:py-20'}>
      <div className="mx-auto grid max-w-content items-center gap-12 px-6 md:grid-cols-2">
        <div className={imageSide === 'right' ? 'md:order-2' : ''}>
          <div className="relative mx-auto max-w-sm">
            <div className="overflow-hidden rounded-lg border border-cream-line shadow-card">
              <img src={image} alt={imageAlt} loading="lazy" className="aspect-[4/3] w-full object-cover" />
            </div>
            {badge && (
              <span className="absolute -left-3 -top-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal font-display text-base font-semibold text-white shadow-teal-glow">{badge}</span>
            )}
          </div>
        </div>
        <div className={imageSide === 'right' ? 'md:order-1' : ''}>
          {label && <Eyebrow>{label}</Eyebrow>}
          <h2 className="text-3xl font-normal leading-tight text-neutral-dark md:text-4xl">{withAccents(statement)}</h2>
          {sub && <p className="mt-4 text-lg leading-relaxed text-neutral-mid">{sub}</p>}
          <LpCta className="mt-7 inline-block rounded-btn bg-teal px-8 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02]">Book a demo</LpCta>
        </div>
      </div>
    </section>
  )
}

// Dark testimonial with an oversized quote mark.
export function LpTestimonial({ quote, attribution }: { quote: string; attribution: string }) {
  return (
    <section className="relative overflow-hidden bg-neutral-dark py-20 text-cream">
      <span aria-hidden className="pointer-events-none absolute -top-16 left-[5%] select-none font-display text-[300px] italic leading-none text-teal/20">&ldquo;</span>
      <div className="relative mx-auto max-w-3xl px-6">
        <blockquote className="font-display text-2xl italic leading-relaxed md:text-[32px]">{quote}</blockquote>
        <cite className="mt-8 block text-sm not-italic tracking-wide text-amber-brand">— {attribution}</cite>
      </div>
    </section>
  )
}

// FAQ — native <details> accordion (styling in globals.css under .lp-editorial .lp-faq).
export function LpFaqEditorial({ data }: { data: NonNullable<LpContent['faq']> }) {
  if (!data.items?.length) return null
  return (
    <section className="bg-cream py-20">
      <div className="mx-auto max-w-3xl px-6">
        <Eyebrow>Common questions</Eyebrow>
        <h2 className="mb-10 text-3xl font-normal leading-tight text-neutral-dark md:text-4xl">{withAccents(data.headline ?? 'The things *most teams* want to know.')}</h2>
        <div>
          {data.items.map((f, i) => (
            <details key={i} className="lp-faq border-b border-cream-line py-5" {...(i === 0 ? { open: true } : {})}>
              <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-lg font-medium text-neutral-dark">
                {f.question}
              </summary>
              <div className="mt-3 max-w-2xl text-[15px] leading-relaxed text-neutral-mid">{f.answer}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// Final CTA — accent band with a primary (book a demo) + ghost (email) action.
export function LpFinalCtaEditorial({ data }: { data: LpContent['finalCta'] }) {
  return (
    <section className="bg-teal py-20 text-center text-cream">
      <div className="mx-auto max-w-content px-6">
        <h2 className="mx-auto max-w-2xl text-3xl font-normal leading-tight text-cream md:text-4xl">{data.headline}</h2>
        {data.subheadline && <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-cream/85">{data.subheadline}</p>}
        <div className="mt-8 flex justify-center">
          <LpCta className="rounded-btn bg-cream px-8 py-4 text-sm font-semibold text-teal transition-colors hover:bg-white">{data.ctaLabel}</LpCta>
        </div>
      </div>
    </section>
  )
}
