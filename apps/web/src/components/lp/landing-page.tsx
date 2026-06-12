/* eslint-disable @next/next/no-img-element */
import { Check } from 'lucide-react'
import type { LpPage } from '@/lib/lp/types'
import { fraunces } from './fonts'
import { withAccents } from './accents'
import { LpForm } from './lp-form'
import { LpTracking } from './lp-tracking'
import { LpFormOverlayProvider, LpCta } from './lp-form-overlay'
import { LpHowItWorks } from './sections'
import { LpFooter, LpLegalProvider } from './lp-legal'
import { LpStats } from './lp-extras'
import { LpAbout, LpPlatform, LpStatementBand, LpTestimonial, LpFaqEditorial, LpFinalCtaEditorial } from './editorial-sections'

export function LandingPage({ page }: { page: LpPage }) {
  const c = page.content
  const testimonial = c.socialProof?.testimonials?.[0]
  return (
    <LpLegalProvider>
    <LpFormOverlayProvider page={page}>
      <div className={`${fraunces.variable} lp-editorial bg-cream`}>
        <LpTracking pageId={page.id} />

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="bg-neutral-dark text-cream">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2 px-6 py-2.5 text-sm">
            <span className="text-cream/75">Built for UK care providers · GDPR compliant · UK &amp; EEA hosted</span>
            <LpCta className="font-semibold text-cream hover:underline">Book a demo →</LpCta>
          </div>
        </div>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="border-b border-cream-line bg-cream">
          <div className="mx-auto flex max-w-content items-center justify-between px-6 py-4">
            <img src="/logo-color.svg" alt="CareStreamAI" className="h-16 w-auto md:h-20" />
            <div className="hidden items-center gap-2 text-[13px] text-neutral-mid sm:flex">
              <span className="rounded bg-teal px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">GDPR</span>
              <span>Data hosted in the UK &amp; EEA</span>
            </div>
          </div>
        </header>

        {/* ── Hero + form (the conversion zone) ───────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at top right, rgba(155,82,181,0.10), transparent 60%), radial-gradient(ellipse at bottom left, rgba(232,133,10,0.06), transparent 55%)' }}
          />
          <div className="relative mx-auto grid max-w-content gap-16 px-6 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr]">
            {/* Left: pitch */}
            <div>
              {c.hero.eyebrow && <p className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-amber-brand">{c.hero.eyebrow}</p>}
              <h1 className="mb-6 text-4xl font-normal leading-[1.1] text-neutral-dark md:text-[52px]">{withAccents(c.hero.headline)}</h1>
              <p className="mb-8 max-w-xl text-lg leading-relaxed text-neutral-mid">{c.hero.subheadline}</p>

              {(c.hero.bullets?.length ?? 0) > 0 && (
                <ul className="mb-8 max-w-xl">
                  {c.hero.bullets!.map(b => (
                    <li key={b} className="flex items-start gap-3 border-b border-cream-line py-3 text-[15px] text-neutral-dark last:border-b-0">
                      <span className="mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-teal"><Check size={11} className="text-white" /></span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}

              {(c.hero.ticks?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-mid">
                  {c.hero.ticks!.map(t => (
                    <span key={t} className="flex items-center gap-1.5"><span className="text-amber-brand">★</span> {t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Right: enquiry form */}
            <aside id="enquire" className="self-start rounded-lg border border-cream-line bg-white p-7 shadow-card lg:sticky lg:top-6">
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.12em] text-teal">Book a demo</p>
              <LpForm page={page} bare />
              <p className="mt-5 border-t border-cream-line pt-4 text-center text-sm text-neutral-mid">
                Prefer to talk?{' '}
                <a href="mailto:hello@carestreamai.com" className="font-display text-lg font-semibold text-teal hover:underline">hello@carestreamai.com</a>
              </p>
            </aside>
          </div>
        </section>

        {/* ── Flowing full-width sections ─────────────────────────────────── */}
        {c.stats && <LpStats data={c.stats} />}
        <LpHowItWorks data={c.howItWorks} />

        <LpStatementBand
          tone="cream"
          label="Hundreds of policies to manage"
          statement="The average care setting keeps *over 200 policies* current. Your team can find any of them in seconds."
          sub="In any language, on any device, grounded in your own documents."
          badge="200+"
          image="/images/care-manager.jpg"
          imageAlt="A care manager using CareStream on a tablet"
          imageSide="left"
        />

        {c.services && <LpPlatform data={c.services} />}

        {c.whyUs && (
          <LpAbout
            eyebrow={c.whyUs.eyebrow ?? 'Why CareStreamAI'}
            headline={c.whyUs.headline}
            intro={c.whyUs.intro}
            items={c.whyUs.points.map(p => ({ title: p.title, description: p.body }))}
          />
        )}

        <LpStatementBand
          tone="warm"
          label="A risk-free way to get started"
          statement="CareStream is *free for 14 days*, for your whole team."
          sub="No card needed. Full access for fourteen days."
          badge="FREE"
          image="/images/free-trial.jpg"
          imageAlt="A care worker chatting warmly with a resident over a cup of tea"
          imageSide="right"
        />

        {testimonial && <LpTestimonial quote={testimonial.quote} attribution={[testimonial.name, testimonial.role, testimonial.company].filter(Boolean).join(', ')} />}
        {c.faq && <LpFaqEditorial data={c.faq} />}
        <LpFinalCtaEditorial data={c.finalCta} />

        <LpFooter />
      </div>
    </LpFormOverlayProvider>
    </LpLegalProvider>
  )
}
