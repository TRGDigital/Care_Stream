import Link from 'next/link'
import './faq-page-v2.css'

// The rebuilt /faq template. Renders the SAME thirty questions the current page renders, from
// the same editable slots, so nothing about the words changes.
//
// The stored structure already matches the theme exactly: six categories with 5, 5, 6, 4, 5 and
// 5 questions, which is the theme's thirty. No content work, only a skin.

export interface FaqGroup {
  title: string
  items: { q: string; a: string }[]
}

const Plus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)

const slugify = (s: string) =>
  s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function FaqPageV2({ groups, label, title, subtitle }: {
  groups: FaqGroup[]
  label: string
  title: string
  subtitle: string
}) {
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="cfpage-v2">
      <section className="cfhero">
        <div className="cfwrap cfhero-in">
          <span className="uc-eyebrow" style={{ display: 'inline-block' }}>{label}</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </section>

      <section className="cfsec">
        <div className="cfwrap cfbody-in">
          <nav className="cfnav" aria-label="Categories">
            <p>Categories · {total} questions</p>
            <ol>
              {groups.map(g => (
                <li key={g.title}>
                  <a href={`#faq-${slugify(g.title)}`}>{g.title}<span>{g.items.length}</span></a>
                </li>
              ))}
            </ol>
          </nav>
          <div>
            {groups.map(g => (
              <div className="cfgroup" id={`faq-${slugify(g.title)}`} key={g.title}>
                <h2>{g.title}</h2>
                {g.items.map((it, i) => (
                  <details className="cfq" key={i}>
                    <summary>{it.q}<Plus /></summary>
                    <div className="ans">{it.a}</div>
                  </details>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cfend">
        <div className="cfwrap cfend-in">
          <h2>Still not answered?</h2>
          <p>Send us the question and we will come back to you within one business day.</p>
          <div className="row">
            <Link className="cfbtn solid" href="/contact">Contact us</Link>
            <Link className="cfbtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
