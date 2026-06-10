import { Check } from 'lucide-react'
import type { LpPage } from '@/lib/lp/types'
import { LpForm } from './lp-form'
import { LpTracking } from './lp-tracking'
import { LpStickyCta } from './lp-sticky-cta'
import { LpProblem, LpHowItWorks, LpFeatures, LpSocialProof, LpFaq, LpFinalCta, LpFooter } from './sections'
import { LpHeader, LpStats, LpWhyUs, LpServices, LpPolicyBand, LpTrialBand } from './lp-extras'

export function LandingPage({ page }: { page: LpPage }) {
  const c = page.content
  const anchor = c.hero.primaryCta.anchor ?? '#form'
  return (
    <>
      <LpTracking pageId={page.id} />

      {/* ── Hero with logo, ticks and the form above the fold ───────────────── */}
      <section className="relative overflow-hidden bg-hero-gradient">
        <div className="absolute inset-0 dot-mesh" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/5" />
        <div className="absolute -bottom-24 -left-16 h-[280px] w-[280px] rounded-full bg-teal/30" />
        <div className="relative mx-auto max-w-content px-6 pb-16 pt-6 md:pb-20 md:pt-8">
          <LpHeader ctaLabel={c.hero.primaryCta.label} anchor={anchor} />
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              {c.hero.eyebrow && <p className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">{c.hero.eyebrow}</p>}
              <h1 className="mb-5 max-w-xl text-4xl font-extrabold leading-[1.1] text-white md:text-5xl">{c.hero.headline}</h1>
              <p className="mb-6 max-w-xl text-lg leading-relaxed text-white/75">{c.hero.subheadline}</p>
              <a href={anchor} className="btn-amber inline-block rounded-btn px-8 py-4 text-sm lg:hidden">{c.hero.primaryCta.label}</a>
              {(c.hero.ticks?.length ?? 0) > 0 && (
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/60">
                  {c.hero.ticks!.map(t => (
                    <span key={t} className="flex items-center gap-1.5"><Check size={14} className="text-white/50" /> {t}</span>
                  ))}
                </div>
              )}
              {c.hero.trustRibbon?.stat && (
                <p className="mt-4 flex items-center gap-2 text-sm text-white/55">
                  <Check size={15} className="text-white/50" /> {c.hero.trustRibbon.stat}
                </p>
              )}
            </div>
            <div className="lg:pl-4">
              <LpForm page={page} />
            </div>
          </div>
        </div>
      </section>

      {c.stats && <LpStats data={c.stats} />}
      <LpProblem data={c.problem} />
      {c.whyUs && <LpWhyUs data={c.whyUs} />}
      <LpHowItWorks data={c.howItWorks} />
      <LpFeatures data={c.features} />
      <LpPolicyBand anchor={anchor} />
      {c.services && <LpServices data={c.services} />}
      <LpTrialBand anchor={anchor} />
      {c.socialProof && <LpSocialProof data={c.socialProof} />}
      {c.faq && <LpFaq data={c.faq} />}
      <LpFinalCta data={c.finalCta} />
      <LpFooter privacyLinkUrl={c.form.privacyLinkUrl} />

      <LpStickyCta pageId={page.id} label={c.hero.primaryCta.label} anchor={anchor} />
    </>
  )
}
