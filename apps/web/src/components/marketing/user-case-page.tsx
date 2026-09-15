import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import './user-case-page.css'

// The /uses/<slug> template. One component for all fourteen pages; the words come from
// user_case_pages and are edited in the console, so changing a sentence does not need a deploy.
//
// Images go through <SiteImage>, not a bare <img>: that is what resolves alt text from the
// central map, so an alt saved in the console actually reaches the page. A plain <img> would
// render fine and silently ignore the console forever.

export interface UserCaseSection {
  heading: string
  bullets: string[]
  links: { label: string; href: string }[]
  image: string | null
  image_alt: string
}

export interface UserCaseHead { eyebrow: string; heading: string; sub: string }
export interface UserCasePanel {
  title: string
  pill: string
  rows: { label: string; note: string; done: boolean }[]
}

export interface UserCaseContent {
  eyebrow: string
  lede: string
  sections: UserCaseSection[]
  cards: { title: string; body: string }[]
  note: string
  /** Section headers above each block. */
  heads?: UserCaseHead[]
  /** The hero mock-up, built from markup rather than a screenshot. */
  panel?: UserCasePanel | null
  /** The three closing cards. */
  cta?: { title: string; body: string; action: string }[]
}

export interface UserCaseFaqGroup {
  label: string
  items: { question: string; answer: string }[]
}

export interface UserCasePage {
  slug: string
  title: string
  hero_image_url: string | null
  content: UserCaseContent
  faqs: UserCaseFaqGroup[]
}

export interface ReadNextPost {
  slug: string
  title: string
  excerpt: string | null
  category: string | null
  read_time_minutes: number | null
  feature_image_url: string | null
}

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

// The headline carries an <em> that the design colours, so it is the one field rendered as
// markup. Only <em> is allowed through — the editor writes prose, not HTML.
function Headline({ html }: { html: string }) {
  const safe = html.replace(/<(?!\/?em\b)[^>]*>/g, '')
  return <h1 dangerouslySetInnerHTML={{ __html: safe }} />
}

function Head({ head }: { head?: UserCaseHead }) {
  if (!head || !head.heading) return null
  return (
    <div className="uc-head">
      {head.eyebrow && <span className="uc-eyebrow">{head.eyebrow}</span>}
      <h2>{head.heading}</h2>
      {head.sub && <p className="sub">{head.sub}</p>}
    </div>
  )
}

function trim(s: string, n = 150) {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '...'
}

export function UserCasePageView({ page, readNext }: { page: UserCasePage; readNext: ReadNextPost[] }) {
  const c = page.content ?? ({} as UserCaseContent)
  return (
    <div className="ucpage">
      <section className="uc-hero">
        <div className="uc-wrap uc-hero-in">
          <div>
            {c.eyebrow && <span className="uc-eyebrow">{c.eyebrow}</span>}
            <Headline html={page.title} />
            {c.lede && <p className="uc-lede">{c.lede}</p>}
            <div className="uc-actions">
              <Link className="uc-demo" href="/demo">Book a demo</Link>
              <Link className="uc-demo" href="/register">Start free trial</Link>
            </div>
          </div>
          {/* The hero shows the product mock-up where the page has one: it is markup rather
              than a screenshot, so it stays readable to a crawler and scales without going
              soft. Only the hand-built resident knowledge page falls back to its image. */}
          {c.panel ? (
            <div className="uc-panel">
              <div className="uc-panel-hd">
                <b>{c.panel.title}</b><span className="uc-pill">{c.panel.pill}</span>
              </div>
              {c.panel.rows.map((r, i) => (
                <div className="uc-row" key={i}>
                  <span className={`uc-tick${r.done ? '' : ' pending'}`} />
                  <span>{r.label}</span><small>{r.note}</small>
                </div>
              ))}
              <div className="uc-meter"><i /></div>
            </div>
          ) : page.hero_image_url && (
            <div className="uc-shot">
              {/* priority: the hero is the largest above-the-fold image, and SiteImage is lazy
                  by default, which delays the one image the reader is waiting for. */}
              <SiteImage src={page.hero_image_url} alt={page.title.replace(/<[^>]*>/g, '')} priority />
            </div>
          )}
        </div>
      </section>

      {(c.sections ?? []).map((s, i) => (
        <section className="uc-sec" key={i}>
          <div className="uc-wrap">
            <div className="uc-alt">
              <div className="uc-alt-copy">
                <h3>{s.heading}</h3>
                {s.bullets?.length > 0 && (
                  <ul className="uc-bullets">
                    {s.bullets.map((b, j) => <li key={j}><Tick />{b}</li>)}
                  </ul>
                )}
                {s.links?.length > 0 && (
                  <div className="uc-tags">
                    {s.links.map((l, j) => (
                      <Link className="uc-tag" href={l.href} key={j}>{l.label}</Link>
                    ))}
                  </div>
                )}
              </div>
              {s.image && (
                <div className="uc-shot">
                  <SiteImage src={s.image} alt={s.image_alt || s.heading} />
                </div>
              )}
            </div>
          </div>
        </section>
      ))}

      {(c.cards ?? []).length > 0 && (
        <section className="uc-sec">
          <div className="uc-wrap">
            <Head head={c.heads?.[0]} />
            <div className="uc-cards">
              {c.cards.map((card, i) => (
                <div className="uc-card" key={i}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {(page.faqs ?? []).length > 0 && (
        <section className="uc-sec">
          <div className="uc-wrap">
            <Head head={c.heads?.find(h => /question/i.test(h.eyebrow))} />
            {page.faqs.map((g, i) => (
              <div className="uc-faqgroup" key={i}>
                <h3>{g.label}</h3>
                {g.items.map((f, j) => (
                  <details className="uc-q" key={j}>
                    <summary>{f.question}</summary>
                    <div className="ans"><p>{f.answer}</p></div>
                  </details>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {!!c.cta?.length && (
        <section className="uc-sec">
          <div className="uc-wrap">
            <div className="uc-cta">
              {c.cta.map((x, i) => (
                <Link className="uc-ctacard" key={i}
                      href={i === 0 ? '/register' : i === 1 ? '/demo' : '/demo'}>
                  <h3>{x.title}</h3><p>{x.body}</p>
                  <span className="uc-more">{x.action}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.note && (
        <section className="uc-sec">
          <div className="uc-wrap">
            <div className="uc-note"><p>{c.note}</p></div>
          </div>
        </section>
      )}

      {/* The posts allocated to this case in the console. Hidden entirely when none are
          allocated: an empty "Read next" heading is worse than no heading. */}
      {readNext.length > 0 && (
        <section className="ucread">
          <div className="ucread-in">
            <p className="uc-eyebrow">Read next</p>
            <h2>Written on this</h2>
            <div className="ucread-grid">
              {readNext.map(p => (
                <Link className="ucread-card" href={`/blog/${p.slug}`} key={p.slug}>
                  {p.feature_image_url && (
                    <span className="ucread-art">
                      <SiteImage src={p.feature_image_url} alt={p.title} />
                    </span>
                  )}
                  <span className="ucread-body">
                    <span className="ucread-meta">
                      {[p.category, p.read_time_minutes ? `${p.read_time_minutes} min read` : '']
                        .filter(Boolean).join(' · ')}
                    </span>
                    <b>{p.title}</b>
                    <span className="ucread-ex">{trim(p.excerpt ?? '')}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
