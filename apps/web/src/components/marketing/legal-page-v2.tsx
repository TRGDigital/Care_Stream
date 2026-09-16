import Link from 'next/link'
import './legal-page-v2.css'

// The rebuilt template for the four legal pages. Renders the SAME site_pages body the current
// pages render, so no wording changes: measured at 93% already matching the theme (28 of 30
// paragraphs on /privacy, 75 of 77 on /dpa).
//
// The theme's hero carries a "Last updated" pill. The stored record has no date field at all,
// and a date on a privacy policy or a DPA is a claim about the document, so it is dropped
// rather than invented or derived from when a row was last touched. Len's call.

export interface LegalDoc {
  slug: string
  title: string
  lede: string
  /** The extra pill beside the two standing ones, where the document has one. */
  pill?: string
}

// The five documents, their one-line framing and their cross-links. Page furniture rather than
// body copy, taken from the theme.
export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    slug: 'privacy', title: 'Privacy Policy',
    lede: 'How CareStream collects, uses and protects personal data, and the rights you have over it.',
  },
  terms: {
    slug: 'terms', title: 'Terms of Service',
    lede: 'The terms you agree to when you use CareStream, and what we commit to in return.',
  },
  cookies: {
    slug: 'cookies', title: 'Cookie Policy',
    lede: 'What cookies CareStream sets, what each one is for, and how to change your choices.',
  },
  dpa: {
    slug: 'dpa', title: 'Data Processing Agreement',
    lede: 'The agreement governing how CareStream processes personal data on your behalf as your processor.',
    pill: 'Made under Article 28 of the UK GDPR',
  },
  // Served by the [...slug] catch-all rather than a route of its own, being a CMS page, but it
  // carries the same design as the other four in the theme: an identical class set, checked.
  'client-services-agreement': {
    slug: 'client-services-agreement', title: 'Client Services Agreement',
    lede: 'The subscription terms for the CareStream platform, between TRG Digital Ltd and the Customer. Version 1.0.',
  },
}

const Mark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.5 20 7v5.5c0 4.4-3.4 7.4-8 8.6-4.6-1.2-8-4.2-8-8.6V7z" />
  </svg>
)

const slugify = (s: string) =>
  s.replace(/^\d+\.\s*/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** The numbered section headings, and the body with an id on each of them.
 *
 *  The stored HTML has 24 h2 elements but only twelve are headings: the rest are paragraphs
 *  that were saved as h2. The numbered ones are the real sections, which is also exactly what
 *  the theme's own contents list shows, so that is the signal used. */
function withAnchors(html: string) {
  const items: { id: string; label: string }[] = []
  const body = html.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (whole, attrs, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim()
    if (!/^\d+\.\s/.test(text)) return whole
    const id = slugify(text)
    items.push({ id, label: text.replace(/^\d+\.\s*/, '') })
    return `<h2 id="${id}"${attrs}>${inner}</h2>`
  })
  return { body, items }
}

export function LegalPageV2({ doc, content }: { doc: LegalDoc; content: string }) {
  // The hero renders the single h1, so any h1 in the stored body becomes an h2, exactly as the
  // current page does it. Then the anchors, off the result.
  const demoted = (content || '').replace(/<(\/?)h1(\s|>)/gi, '<$1h2$2')
  const { body, items } = withAnchors(demoted)
  const others = Object.values(LEGAL_DOCS).filter(d => d.slug !== doc.slug)

  return (
    <div className="lgpage-v2">
      <section className="lghero">
        <div className="lgwrap lghero-in">
          <span className="uc-eyebrow" style={{ display: 'inline-block' }}>Trust and legal</span>
          <h1>{doc.title}</h1>
          <p>{doc.lede}</p>
          <div className="lgmeta">
            {doc.pill && <span className="lgpill"><Mark /> {doc.pill}</span>}
            <span className="lgpill"><Mark /> UK law and jurisdiction</span>
            <span className="lgpill"><Mark /> Data held in the UK and EEA</span>
          </div>
        </div>
      </section>

      <section className="lgbody">
        <div className="lgwrap lgbody-in">
          {items.length > 0 && (
            <nav className="lgtoc" aria-label="Contents">
              <p className="lgtoc-title">Contents · {items.length}</p>
              <ol>
                {items.map(i => <li key={i.id}><a href={`#${i.id}`}>{i.label}</a></li>)}
              </ol>
            </nav>
          )}
          {/* Same stored HTML the current page renders, through the same mechanism. */}
          <article className="lgdoc" dangerouslySetInnerHTML={{ __html: body }} />
        </div>
      </section>

      <section className="lgrelated">
        <div className="lgwrap lgrelated-in">
          <span className="uc-eyebrow" style={{ display: 'inline-block' }}>
            Also in trust and legal
          </span>
          <div className="lgrel-grid">
            {others.map(d => (
              <Link className="lgrel" href={`/${d.slug}`} key={d.slug}>
                <b>{d.title}</b><span>{d.lede}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="lgend">
        <div className="lgwrap lgend-in">
          <h2>A question about any of this?</h2>
          <p>
            Our team can walk you through how CareStream handles your data, and provide anything
            your own governance process needs.
          </p>
          <div className="row">
            <Link className="lgbtn solid" href="/contact">Contact us</Link>
            <Link className="lgbtn ghost" href="/trust">Trust and security</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
