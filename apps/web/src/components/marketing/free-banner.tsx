import Link from 'next/link'
import './free-banner.css'

// The "it's free" band shown under the hero on the home page, /care-audits and
// /policy-gap-detection. It is plain server rendered HTML (no client JavaScript) and is only
// rendered by the callers when the Free plan is live (lib/free-rollout.ts: FREE_LIVE, or
// ?free=1 for review), so it can never point at a signup that is still closed.
// House style: no dashes in copy.

export type FreeBannerVariant = 'home' | 'audits' | 'gaps'

const COPY: Record<FreeBannerVariant, { badge: string; title: string; text: string; cta: string }> = {
  home: {
    badge: 'Free to start',
    title: 'Audits are free. Your first 5 policies are free.',
    text:
      'Create a free CareStream account and run every audit template with your team. Upload your first 5 policies and screen them for regulation coverage, out of date content, consistency and CQC wording. No card needed.',
    cta: 'Start free',
  },
  audits: {
    badge: 'Free to use',
    title: 'Care audits are free to use.',
    text:
      'Sign up free and run every audit template with your team. Score each section and record your findings and actions at no cost. The AI recommendations that follow an audit are part of a paid plan.',
    cta: 'Start free audits',
  },
  gaps: {
    badge: 'First 5 policies free',
    title: 'Your first 5 policies are free to screen.',
    text:
      'Upload up to 5 policies and check them for regulation coverage, out of date content, consistency between policies and CQC wording at no cost. Upgrade when you need more policies.',
    cta: 'Screen 5 policies free',
  },
}

export function FreeBanner({ variant }: { variant: FreeBannerVariant }) {
  const c = COPY[variant]
  return (
    <section className={`freeband freeband-${variant}`} aria-label="Free to use">
      <div className="freeband-in">
        <div className="freeband-copy">
          <span className="freeband-badge">{c.badge}</span>
          <h2 className="freeband-title">{c.title}</h2>
          <p className="freeband-text">{c.text}</p>
        </div>
        <div className="freeband-actions">
          <Link className="freeband-btn freeband-btn-solid" href="/register?tier=free">{c.cta}</Link>
          <Link className="freeband-btn freeband-btn-ghost" href="/pricing">See pricing</Link>
        </div>
      </div>
    </section>
  )
}
