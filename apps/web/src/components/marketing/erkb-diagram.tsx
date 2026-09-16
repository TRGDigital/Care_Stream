import { Fragment } from 'react'
import { ERKB_DIAGRAMS, type ErkbSection } from '@/lib/erkb-diagrams'

// The diagrams on /features/external-regulatory-knowledge-base.
//
// That page is the one feature page the theme illustrates with diagrams instead of
// screenshots, so they render exactly where the screenshots would: one in the hero, and one
// after each of the three "how it works" steps. Every other feature page is untouched.
//
// Their classes are in feature-page-v2.css, which is ported from this theme page among others.

const SLUG = 'external-regulatory-knowledge-base'

/** The hero comparison, or null for every other feature page. */
export function ErkbHero({ slug }: { slug: string }) {
  if (slug !== SLUG) return null
  return (
    <div className="erkb-frame">
      <div className="erkb erkb-hero">
        {ERKB_DIAGRAMS.hero.map(col => (
          <div className={`erkb-col ${col.tone}`} key={col.tone}>
            <span className="erkb-tag">{col.tag}</span>
            <span className={`erkb-box${col.fuzzy ? ' fuzzy' : ''}`}>
              {col.box}<em>{col.boxNote}</em>
            </span>
            <span className="erkb-arrow">&darr;</span>
            <span className={`erkb-out ${col.outTone}`}>{col.out}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Section({ s }: { s: ErkbSection }) {
  if (s.kind === 'rail') {
    return (
      <div className="erkb erkb-rail">
        {s.sources.map(x => <span className="erkb-src" key={x}>{x}</span>)}
        <span className="erkb-arrow">&darr;</span>
        <span className="erkb-base">{s.base}</span>
      </div>
    )
  }
  if (s.kind === 'time') {
    return (
      <div className="erkb erkb-time">
        {s.items.map(x => (
          <span className={`erkb-t${x.live ? ' live' : ''}`} key={x.title}>
            <b>{x.title}</b><em>{x.note}</em>
          </span>
        ))}
      </div>
    )
  }
  return (
    // Arrows are SIBLINGS of the steps in the theme, not wrappers around them: the row is a
    // flex line and an extra element between them would break the spacing.
    <div className="erkb erkb-flow">
      {s.steps.map((x, i) => (
        <Fragment key={x.title}>
          {i > 0 && <span className="erkb-arrow">&darr;</span>}
          <span className={`erkb-step${x.tone ? ` ${x.tone}` : ''}`}>
            <b>{x.title}</b><em>{x.note}</em>
          </span>
        </Fragment>
      ))}
    </div>
  )
}

/** The diagram beside "how it works" step `index`, or null if this page has none. */
export function ErkbStep({ slug, index }: { slug: string; index: number }) {
  if (slug !== SLUG) return null
  const s = ERKB_DIAGRAMS.sections[index]
  if (!s) return null
  return <div className="erkb-frame"><Section s={s} /></div>
}
