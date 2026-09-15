import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { THEME_IMAGES } from '@/lib/theme-images'
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
  /** Six sibling features, to keep the internal linking the current page has. */
  related?: { slug: string; title: string }[]
}

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
)

const Play = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
)

function Buttons() {
  return (
    <>
      <Link className="fbtn solid" href="/register">Start free trial</Link>
      <Link className="fbtn ghost" href="/demo"><Play /> Book a demo</Link>
    </>
  )
}

// The hero groups the buttons in `.factions`; the closing band lays them out with `.row` and
// no inner wrapper. Two different rules, so the wrapper belongs to the caller, not here.
function Actions() {
  return <div className="factions"><Buttons /></div>
}

// whatItIs.body is stored as prose with blank-line breaks rather than markup, so it is split
// here instead of being injected as HTML. Nothing in the record is trusted as markup.
function Prose({ text }: { text?: string }) {
  const paras = (text ?? '').split(/\n\s*\n|(?<=\.)\s{2,}/).map(s => s.trim()).filter(Boolean)
  return <>{paras.map((p, i) => <p key={i}>{p}</p>)}</>
}

/** The standfirst under a section heading. The theme wraps it in `.lead` and marks each
 *  paragraph `.lead` too, which is what makes it read larger and lighter than body copy.
 *  Rendering it as a plain <p> kept the words and lost the distinction. */
function Lead({ text }: { text?: string }) {
  const paras = (text ?? '').split(/\n\s*\n|(?<=\.)\s{2,}/).map(s => s.trim()).filter(Boolean)
  if (!paras.length) return null
  return (
    <div className="lead">
      {paras.map((p, i) => <p className="lead" key={i}>{p}</p>)}
    </div>
  )
}

function img(slug: string, n: number) {
  return `/images/features/${slug}/${n}.webp`
}

// The wide crop beside the "In short" list. Half the capabilities have their own fifth image
// and half do not, so the theme falls back to the shared one rather than leaving a hole. The
// set is read off the generated manifest, so this can never point at a file that isn't there.
const WIDE_SHOTS = new Set(
  THEME_IMAGES.map(i => i.src).filter(s => /^\/images\/features\/[^/]+\/5\.webp$/.test(s)),
)
const SHARED_WIDE = '/images/_shared/1.webp'

function wideShot(slug: string) {
  const own = img(slug, 5)
  return WIDE_SHOTS.has(own) ? own : SHARED_WIDE
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
            <Lead text={c.howItWorks?.intro} />
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
              <div className="shot wide">
                <SiteImage src={wideShot(page.slug)} alt={page.title} />
              </div>
            </div>
          </div>
        </section>
      )}

      {!!c.whyItWorks?.tiles?.length && (
        <section className="fsec">
          <div className="fwrap fsec-in">
            {c.whyItWorks.heading && <h2>{c.whyItWorks.heading}</h2>}
            <Lead text={c.whyItWorks.intro} />
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

const Plus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)

/** The stylesheet hides the native disclosure marker and rotates this plus into a cross when
 *  the answer opens. Without it the questions looked like plain headings with no affordance at
 *  all, which is the sort of thing a content check has no way to notice. */
function Faq({ faq }: { faq: FeatureV2Faq }) {
  return (
    <details className="fq">
      <summary>{faq.question}<Plus /></summary>
      <div className="ans"><p>{faq.answer}</p></div>
    </details>
  )
}

/** One capability as a cluster page states it: a numbered summary beside a single screenshot,
 *  with the step-by-step detail folded into a disclosure.
 *
 *  A cluster used to render each child through <Capability>, which is the whole of a standalone
 *  page. Ten children produced ten full pages stacked end to end: every word was present, and
 *  the page was nothing like the design, which makes a cluster an index you can scan. */
function ClusterFeature({ page, parentSlug, index }: {
  page: FeatureV2Page; parentSlug: string; index: number
}) {
  const c = page.content ?? {}
  const steps = c.howItWorks?.sections ?? []
  const n = String(index + 1).padStart(2, '0')

  return (
    <section className={`cfeat${index % 2 ? ' cfeat-flip' : ''}`} id={page.slug}>
      <div className="cfeat-copy">
        <span className="cnum">{n}</span>
        <h3>{page.title}</h3>
        <Prose text={c.whatItIs?.body} />
        {!!c.chips?.length && (
          <div className="fchips">
            {c.chips.map((x, i) => <span className="fchip" key={i}>{x}</span>)}
          </div>
        )}
        {!!c.outcomes?.length && (
          <ul className="cout">
            {c.outcomes.map((o, i) => <li key={i}><Tick />{o}</li>)}
          </ul>
        )}
        {(steps.length > 0 || !!c.keyPoints?.length) && (
          <details className="cmore">
            <summary>How it works, step by step<Plus /></summary>
            <div className="cmore-in">
              {steps.length > 0 && (
                <div className="csteps">
                  {steps.map((s, i) => (
                    <div className="cstep" key={i}>
                      <span className="n">{i + 1}</span>
                      <div><b>{s.heading}</b><p>{s.body}</p></div>
                    </div>
                  ))}
                </div>
              )}
              {!!c.keyPoints?.length && (
                <ul className="ckeys">
                  {c.keyPoints.map((k, i) => <li key={i}><Tick />{k}</li>)}
                </ul>
              )}
            </div>
          </details>
        )}
      </div>
      {/* The aside image belongs to the CLUSTER, numbered by position: a cluster of ten ships
          eleven images, one for the hero and one per capability. */}
      <div className="cfeat-aside">
        <div className="shot app">
          <SiteImage src={img(parentSlug, index + 2)} alt={page.title} />
        </div>
      </div>
    </section>
  )
}

export function FeaturePageV2({ page }: { page: FeatureV2Page }) {
  const kids = page.capabilities ?? []
  const isCluster = kids.length > 0
  const faqs = page.faqs ?? []
  const groupedFaqCount = kids.reduce((n, k) => n + (k.faqs?.length ?? 0), 0)

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

      {isCluster ? (
        <section className="fsec">
          <div className="fwrap fsec-in cfeats">
            {kids.map((k, i) => (
              <ClusterFeature page={k} parentSlug={page.slug} index={i} key={k.slug} />
            ))}
          </div>
        </section>
      ) : <Capability page={page} />}

      {(faqs.length > 0 || groupedFaqCount > 0) && (
        <section className="fsec tint">
          <div className="fwrap fsec-in fnarrow">
            <span className="flabel">
              Questions{isCluster && groupedFaqCount > 0 ? ` · ${groupedFaqCount}` : ''}
            </span>
            <h2>Frequently asked</h2>
            {/* A cluster groups its questions under the capability they belong to, each group
                headed by a link back up to that capability. Rendering them as one flat list
                lost both the grouping and those links. */}
            {isCluster
              ? kids.map((k, i) => !!k.faqs?.length && (
                  <div className="fqgroup" key={k.slug}>
                    <h3 className="fqgh">
                      <a href={`#${k.slug}`}>
                        <span>{String(i + 1).padStart(2, '0')}</span>{k.title}
                      </a>
                    </h3>
                    {k.faqs.map((f, j) => <Faq faq={f} key={j} />)}
                  </div>
                ))
              : faqs.map((f, i) => <Faq faq={f} key={i} />)}
          </div>
        </section>
      )}

      {/* The current page carries six links to sibling features, and an audit comparing the
          two templates showed this was the one thing the rebuild dropped. Six internal links
          on each of 52 pages is most of how this section is crawled, so it comes across. */}
      {!!page.related?.length && (
        <section className="fsec">
          <div className="fwrap fsec-in">
            <span className="flabel">More features</span>
            <h2>Explore more features</h2>
            <Lead text="More of what the CareStream compliance platform does for UK care providers." />
            {/* `cnav` is the theme's own component for linking to feature pages, which is what
                this block does. It was built from `ftile`, a four-across tile that expects a
                title AND a body, so six title-only boxes left a ragged row of near-empty
                cards. cnav is three across, so six links fill two clean rows. */}
            <nav className="cnav">
              {page.related.map(r => (
                <Link href={`/features/${r.slug}`} key={r.slug}>
                  <span>&#8594;</span>{r.title}
                </Link>
              ))}
            </nav>
          </div>
        </section>
      )}

      <section className="fend">
        <div className="fwrap fend-in">
          <h2>{page.content?.cta?.heading ?? 'See it on your own policies.'}</h2>
          {page.content?.cta?.sub && <p>{page.content.cta.sub}</p>}
          <div className="row"><Buttons /></div>
        </div>
      </section>
    </div>
  )
}
