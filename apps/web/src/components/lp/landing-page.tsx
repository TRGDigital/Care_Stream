/* eslint-disable @next/next/no-img-element */
import { Check } from 'lucide-react'
import type { LpPage } from '@/lib/lp/types'
import { fraunces } from './fonts'
import { withAccents } from './accents'
import { LpForm } from './lp-form'
import { LpTracking } from './lp-tracking'
import { LpFormOverlayProvider, LpCta, LpMobileCta } from './lp-form-overlay'
import { LpProblem, LpHowItWorks, LpFeatures, LpSocialProof, LpFaq, LpFinalCta, LpFooter } from './sections'
import { LpStats, LpWhyUs, LpServices, LpPolicyBand, LpTrialBand } from './lp-extras'

export function LandingPage({ page }: { page: LpPage }) {
  const c = page.content
  return (
    <LpFormOverlayProvider page={page}>
      <div className={`${fraunces.variable} lp-editorial bg-cream`}>
        <LpTracking pageId={page.id} />

        {/* Top bar — always-visible reassurance + CTA */}
        <div className="bg-neutral-dark text-cream">
          <div className="mx-auto flex max-w-content flex-wrap items-center justify-between gap-2 px-6 py-2.5 text-sm">
            <span className="text-cream/75">Built for UK care providers · GDPR compliant · UK/EEA hosted</span>
            <LpCta className="font-semibold text-cream hover:underline">Book a demo →</LpCta>
          </div>
        </div>

        {/* One unified card: content (left) + sticky bare form rail (right). */}
        <div className="lg:py-8">
          <div className="mx-auto max-w-[1240px] overflow-hidden border-cream-line bg-cream lg:rounded-2xl lg:border lg:shadow-card lg:grid lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              {/* ── Editorial hero ─────────────────────────────────────────── */}
              <section className="relative overflow-hidden">
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{ background: 'radial-gradient(ellipse at top right, rgba(155,82,181,0.10), transparent 60%), radial-gradient(ellipse at bottom left, rgba(232,133,10,0.06), transparent 55%)' }}
                />
                <div className="relative px-6 pb-14 pt-8 md:px-10 md:pb-16 md:pt-10">
                  <div className="mb-9 flex items-center justify-between">
                    <img src="/logo-color.png" alt="CareStreamAI" className="h-12 w-auto" />
                    <span className="hidden items-center gap-2 text-xs font-semibold text-neutral-mid sm:flex">
                      <span className="rounded bg-teal px-2 py-1 text-[10px] uppercase tracking-wider text-white">Trusted</span>
                      by UK care teams
                    </span>
                  </div>
                  <div className="max-w-2xl">
                    {c.hero.eyebrow && <p className="mb-5 text-xs font-bold uppercase tracking-[0.14em] text-amber-brand">{c.hero.eyebrow}</p>}
                    <h1 className="mb-6 text-4xl leading-[1.1] text-neutral-dark md:text-[52px]">{withAccents(c.hero.headline)}</h1>
                    <p className="mb-7 max-w-xl text-lg leading-relaxed text-neutral-mid">{c.hero.subheadline}</p>

                    {(c.hero.bullets?.length ?? 0) > 0 && (
                      <ul className="mb-7 max-w-xl">
                        {c.hero.bullets!.map(b => (
                          <li key={b} className="flex items-start gap-3 border-b border-cream-line py-3 text-[15px] text-neutral-dark last:border-b-0">
                            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-teal"><Check size={12} className="text-white" /></span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}

                    <LpCta className="btn-amber inline-block rounded-btn px-8 py-4 text-sm lg:hidden">{c.hero.primaryCta.label}</LpCta>

                    {(c.hero.ticks?.length ?? 0) > 0 && (
                      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-mid">
                        {c.hero.ticks!.map(t => (
                          <span key={t} className="flex items-center gap-1.5"><span className="text-amber-brand">★</span> {t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <LpMobileCta />
              {c.stats && <LpStats data={c.stats} />}
              <LpProblem data={c.problem} />
              <LpMobileCta />
              {c.whyUs && <LpWhyUs data={c.whyUs} />}
              <LpHowItWorks data={c.howItWorks} />
              <LpFeatures data={c.features} />
              <LpMobileCta />
              <LpPolicyBand />
              {c.services && <LpServices data={c.services} />}
              <LpMobileCta />
              <LpTrialBand />
              {c.socialProof && <LpSocialProof data={c.socialProof} />}
              {c.faq && <LpFaq data={c.faq} />}
              <LpFinalCta data={c.finalCta} />
            </div>

            {/* Sticky booking rail (desktop) */}
            <aside className="hidden lg:block lg:border-l lg:border-cream-line lg:bg-cream-warm">
              <div className="sticky top-6 p-6 lg:p-7">
                <LpForm page={page} withAnchor bare />
              </div>
            </aside>
          </div>
        </div>

        <LpFooter privacyLinkUrl={c.form.privacyLinkUrl} />
      </div>
    </LpFormOverlayProvider>
  )
}
