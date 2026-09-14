import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import './feature-page-v2.css'

// The rebuilt /features template. Renders the SAME feature_pages.content that the current
// pages render, so the switchover is a design change and not a content change: Len's approved
// wording carries over untouched. Measured before building this — 97.8% of the paragraphs on
// the theme's feature pages are already stored in that record.
//
// Two variants. A simple page argues one capability. A cluster page is an assembly of several,
// and keeps its own hero while the sections below come from the child records.
//
// Images go through <SiteImage>, never a bare <img>, because that is what resolves alt text
// from the console. A plain <img> renders identically and ignores the console for good.

export interface FeatureV2Section { heading: string; body: string }
export interface FeatureV2Tile { title: string; body: string }
export interface FeatureV2Faq { question: string; answer: string }

export interface FeatureV2Content {
  eyebrow?: string
  intro?: string
  chips?: string[]
  whatItIs?: { heading?: string; body?: string }
  outcomes?: string[]
  howItWorks?: { heading?: string; intro?: string; sections?: FeatureV2Section[] }
  keyPoints?: string[]
  sidebar?: FeatureV2Tile[]
  whyItWorks?: { heading?: string; intro?: string; tiles?: FeatureV2Tile[] }
  cta?: { heading?: string; sub?: string }
}

export interface FeatureV2Page {
  slug: string
  title: string
  content: FeatureV2Content
  faqs?: FeatureV2Faq[]
  /** Cluster pages only: the capabilities this page is assembled from, in order. */
  capabilities?: FeatureV2Page[]
}

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
)

const Play = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
)

function Actions() {
  return (
    <div className="factions">
      <Link className="fbtn solid" href="/register">Start free trial</Link>
      <Link className="fbtn ghost" href="/demo"><Play /> Book a demo</Link>
    </div>
  )
}

// whatItIs.body is stored as prose with blank-line breaks rather than markup, so it is split
// here instead of being injected as HTML. Nothing in the record is trusted as markup.
function Prose({ text }: { text?: string }) {
  const paras = (text ?? '').split(/\n\s*\n|(?<=\.)\s{2,}/).map(s => s.trim()).filter(Boolean)
  return <>{paras.map((p, i) => <p key={i}>{p}</p>)}</>
}

function img(slug: string, n: number) {
  return `/images/features/${slug}/${n}.webp`
}

function Hero({ page }: { page: FeatureV2Page }) {
  const c = page.content ?? {}
  return (
    <section className="fhero">
      <div className="fwrap fhero-in">
        <div>
          {c.eyebrow && <span className="uc-eyebrow">{c.eyebrow}</span>}
          <h1>{page.title}</h1>
          {c.intro && <p>{c.intro}</p>}
          {!!c.chips?.length && (
            <div className="fchips">
              {c.chips.map((ch, i) => <span className="fchip" key={i}>{ch}</span>)}
            </div>
          )}
          <Actions />
        </div>
        <div>
          <div className="shot hub">
            {/* priority: this is the page's largest above-the-fold image. Without it
                SiteImage renders loading="lazy", which delays the one image the reader is
                waiting for and hurts the LCP measurement on every feature page. */}
            <SiteImage src={img(page.slug, 1)} alt={page.title} priority />
          </div>
        </div>
      </div>
    </section>
  )
}

/** One capability: everything a simple page shows below its hero. */
function Capability({ page, anchor }: { page: FeatureV2Page; anchor?: string }) {
  const c = page.content ?? {}
  const steps = c.howItWorks?.sections ?? []
  // The first three steps get a screenshot each; the rest are the compact grid beneath, which
  // is what the design does rather than repeating a large plate six times.
  const big = steps.slice(0, 3)
  const rest = steps.slice(3)

  return (
    <div id={anchor}>
      {(c.whatItIs?.heading || c.whatItIs?.body) && (
        <section className="fsec">
          <div className="fwrap fsec-in fsplit">
            <div>
              <span className="flabel">What it is</span>
              {c.whatItIs?.heading && <h2>{c.whatItIs.heading}</h2>}
              <Prose text={c.whatItIs?.body} />
            </div>
            {!!c.sidebar?.length && (
              <div className="fside">
                {c.sidebar.map((s, i) => (
                  <div className="fcard" key={i}><b>{s.title}</b><p>{s.body}</p></div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {!!c.outcomes?.length && (
        <section className="fsec tint">
          <div className="fwrap fsec-in">
            <span className="flabel">What changes for you</span>
            <h2>The difference it makes day to day</h2>
            <ul className="fout">
              {c.outcomes.map((o, i) => <li key={i}><span className="ic"><Tick /></span>{o}</li>)}
            </ul>
          </div>
        </section>
      )}

      {!!steps.length && (
        <section className="fsec">
          <div className="fwrap fsec-in">
            {c.howItWorks?.heading && <h2>{c.howItWorks.heading}</h2>}
            {c.howItWorks?.intro && <p>{c.howItWorks.intro}</p>}
            {big.map((s, i) => (
              <div className={`fsteprow${i % 2 ? ' fsteprow-flip' : ''}`} key={i}>
                <div className="fstep-copy">
                  <span className="n">{i + 1}</span>
                  <h3>{s.heading}</h3>
                  <p>{s.body}</p>
                </div>
                <div>
                  <div className="shot app">
                    <SiteImage src={img(page.slug, i + 2)} alt={s.heading} />
                  </div>
                </div>
              </div>
            ))}
            {!!rest.length && (
              <div className="fstepgrid">
                {rest.map((s, i) => (
                  <div className="fstepmini" key={i}>
                    <span className="n">{big.length + i + 1}</span>
                    <b>{s.heading}</b><p>{s.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {!!c.keyPoints?.length && (
        <section className="fsec tint">
          <div className="fwrap fsec-in">
            <div className="fkeyrow">
              <div>
                <span className="flabel">In short</span>
                <ul className="fkeys">
                  {c.keyPoints.map((k, i) => <li key={i}><span className="ic"><Tick /></span>{k}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {!!c.whyItWorks?.tiles?.length && (
        <section className="fsec">
          <div className="fwrap fsec-in">
            {c.whyItWorks.heading && <h2>{c.whyItWorks.heading}</h2>}
            {c.whyItWorks.intro && <p>{c.whyItWorks.intro}</p>}
            <div className="ftiles">
              {c.whyItWorks.tiles.map((t, i) => (
                <div className="ftile" key={i}><b>{t.title}</b><p>{t.body}</p></div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

export function FeaturePageV2({ page }: { page: FeatureV2Page }) {
  const kids = page.capabilities ?? []
  const isCluster = kids.length > 0
  const faqs = page.faqs ?? []

  return (
    <div className="fpage-v2">
      <Hero page={page} />

      {isCluster && (
        <section className="fsec tint">
          <div className="fwrap fsec-in">
            <span className="flabel">
              What is included · {kids.length} {kids.length === 1 ? 'capability' : 'capabilities'}
            </span>
            <nav className="cnav">
              {kids.map((k, i) => (
                <a href={`#${k.slug}`} key={k.slug}>
                  <span>{String(i + 1).padStart(2, '0')}</span>{k.title}
                </a>
              ))}
            </nav>
          </div>
        </section>
      )}

      {isCluster
        ? kids.map(k => <Capability page={k} anchor={k.slug} key={k.slug} />)
        : <Capability page={page} />}

      {!!faqs.length && (
        <section className="fsec tint">
          <div className="fwrap fsec-in fnarrow">
            <span className="flabel">Questions</span>
            <h2>Frequently asked</h2>
            {faqs.map((f, i) => (
              <details className="fq" key={i}>
                <summary>{f.question}</summary>
                <div className="ans"><p>{f.answer}</p></div>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="fend">
        <div className="fwrap fend-in">
          <h2>{page.content?.cta?.heading ?? 'See it on your own policies.'}</h2>
          {page.content?.cta?.sub && <p>{page.content.cta.sub}</p>}
          <div className="row"><Actions /></div>
        </div>
      </section>
    </div>
  )
}
