import { Check } from 'lucide-react'
import type { LpPage } from '@/lib/lp/types'
import { LpForm } from './lp-form'
import { LpTracking } from './lp-tracking'
import { LpFormOverlayProvider, LpCta, LpMobileCta } from './lp-form-overlay'
import { LpProblem, LpHowItWorks, LpFeatures, LpSocialProof, LpFaq, LpFinalCta, LpFooter } from './sections'
import { LpHeader, LpStats, LpWhyUs, LpServices, LpPolicyBand, LpTrialBand } from './lp-extras'

export function LandingPage({ page }: { page: LpPage }) {
  const c = page.content
  return (
    <LpFormOverlayProvider page={page}>
      <LpTracking pageId={page.id} />
      <div className="bg-neutral-light">
        {/* Desktop: content column (left) + sticky form rail (right). Mobile: single
            column, no inline form — CTAs open the form as an overlay. */}
        <div className="mx-auto max-w-[1240px] lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-6 lg:px-6 lg:py-8">
          <div className="overflow-hidden bg-white lg:rounded-2xl lg:shadow-card">
            {/* Hero (content only — the form lives in the rail / overlay) */}
            <section className="relative overflow-hidden bg-hero-gradient">
              <div className="absolute inset-0 dot-mesh" />
              <div className="absolute -right-24 -top-24 h-[360px] w-[360px] rounded-full bg-white/5" />
              <div className="absolute -bottom-24 -left-16 h-[260px] w-[260px] rounded-full bg-teal/30" />
              <div className="relative px-6 pb-14 pt-6 md:px-10 md:pb-16">
                <LpHeader ctaLabel={c.hero.primaryCta.label} />
                <div className="max-w-2xl">
                  {c.hero.eyebrow && <p className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{c.hero.eyebrow}</p>}
                  <h1 className="mb-5 text-4xl font-extrabold leading-[1.1] text-white md:text-5xl">{c.hero.headline}</h1>
                  <p className="mb-6 text-lg leading-relaxed text-white/75">{c.hero.subheadline}</p>
                  <LpCta className="btn-amber inline-block rounded-btn px-8 py-4 text-sm lg:hidden">{c.hero.primaryCta.label}</LpCta>
                  {(c.hero.ticks?.length ?? 0) > 0 && (
                    <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
                      {c.hero.ticks!.map(t => <span key={t} className="flex items-center gap-1.5"><Check size={14} className="text-white/50" /> {t}</span>)}
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

          {/* Sticky booking rail (desktop only) */}
          <aside className="hidden lg:block">
            <div className="sticky top-8">
              <LpForm page={page} withAnchor />
            </div>
          </aside>
        </div>
      </div>

      <LpFooter privacyLinkUrl={c.form.privacyLinkUrl} />
    </LpFormOverlayProvider>
  )
}
