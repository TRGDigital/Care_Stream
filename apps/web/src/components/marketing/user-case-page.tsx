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

/** The coloured icon on a card, stored as the primitives it is drawn from rather than as
 *  markup, so the record is never injected as HTML. */
export interface UserCaseIconShape {
  tag: 'path' | 'circle' | 'rect'
  d?: string
  cx?: string; cy?: string; r?: string
  x?: string; y?: string; width?: string; height?: string; rx?: string
}

export interface UserCaseIcon {
  bg: string | null
  fg: string | null
  shapes: UserCaseIconShape[]
}

export interface UserCaseContent {
  eyebrow: string
  lede: string
  sections: UserCaseSection[]
  cards: { title: string; body: string; icon?: UserCaseIcon | null }[]
  note: string
  /** Section headers above each block. */
  heads?: UserCaseHead[]
  /** The hero mock-up, built from markup rather than a screenshot. */
  panel?: UserCasePanel | null
  /** The three closing cards. */
  cta?: { title: string; body: string; action: string; icon?: UserCaseIcon | null }[]
  /** Heading for the "Read next" block above the FAQs. */
  read_next_head?: { eyebrow: string; heading: string }
  /** The pastel band at the top of each Read next card, in order. */
  read_next_bands?: string[]
  /** The line under the hero call to action. */
  fine?: string
  /** The long-form guide that closes the page. */
  guide?: {
    eyebrow: string
    title: string
    lede: string
    blocks: { heading: string; paras: string[]; bullets: string[] }[]
  } | null
}

export interface UserCaseFaqGroup {
  label: string
  items: { question: string; answer: string }[]
}

export interface UserCasePage {
  slug: string
  title: string
  meta_title?: string
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

// The panel's status marks. The theme puts a tick inside a filled circle for done and a
// clock for pending; rendering the circle with nothing in it read as a coloured dot.
const TickMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const ClockMark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" />
  </svg>
)

const Play = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
)

// The stylesheet hides the native disclosure marker and rotates this plus into a cross when the
// answer opens. Without it a question looks like a heading with nothing to click.
const Plus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h13M12 5.5 18.5 12 12 18.5" />
  </svg>
)

/** The card icon, built as real elements from the stored primitives. Each card in the theme
 *  carries its own drawing and its own colour pair; rendering the card without it left every
 *  block starting with a bare heading. */
function CardIcon({ icon }: { icon?: UserCaseIcon | null }) {
  if (!icon?.shapes?.length) return null
  return (
    <span className="uc-cardico"
          style={{ background: icon.bg ?? undefined, color: icon.fg ?? undefined }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon.shapes.map((s, i) => {
          if (s.tag === 'circle') return <circle cx={s.cx} cy={s.cy} r={s.r} key={i} />
          if (s.tag === 'rect') {
            return <rect x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} key={i} />
          }
          return <path d={s.d} key={i} />
        })}
      </svg>
    </span>
  )
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

/** Finds a section header by what its eyebrow says. Positional lookup breaks on the one page
 *  that has three headers rather than four. */
function headFor(heads: UserCaseHead[] | undefined, pattern: RegExp): UserCaseHead | undefined {
  return (heads ?? []).find(h => pattern.test(h.eyebrow || ''))
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
  // The short name for this case, as the theme's closing block uses it ("Written on Staff Hub
  // in 60+ languages"). meta_title is that name plus the site suffix.
  const label = (page.meta_title ?? '').replace(/\s*\|\s*CareStreamAI\s*$/i, '').trim()
    || page.title.replace(/<[^>]*>/g, '')
  return (
    <div className="ucpage">
      <section className="uc-hero">
        <div className="uc-wrap uc-hero-in">
          <div>
            {c.eyebrow && <span className="uc-eyebrow">{c.eyebrow}</span>}
            <Headline html={page.title} />
            {c.lede && <p className="uc-lede">{c.lede}</p>}
            {/* A plain GET form to /register, which reads ?email= and fills the field in, so
                the address typed here is not typed twice. No JavaScript needed, and it
                degrades to landing on the signup page. */}
            <div className="uc-actions">
              <form className="uc-field" action="/register" method="get">
                <input type="email" name="email" required
                       placeholder="name@yourcarehome.co.uk" aria-label="Work email" />
                <button type="submit">Start free trial</button>
              </form>
              <Link className="uc-demo" href="/demo"><Play /> Book a demo</Link>
            </div>
            {c.fine && <p className="uc-fine">{c.fine}</p>}
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
                  <span className={`uc-tick${r.done ? '' : ' pending'}`}>
                    {r.done ? <TickMark /> : <ClockMark />}
                  </span>
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

      {/* "Why it matters" sits above the alternating sections in the design: it frames the
          argument the sections then make. Rendering the sections first put the framing after
          the thing it frames. */}
      {(c.cards ?? []).length > 0 && (
        <section className="uc-sec">
          <div className="uc-wrap">
            <Head head={headFor(c.heads, /matter|why/i) ?? c.heads?.[0]} />
            <div className="uc-cards">
              {c.cards.map((card, i) => (
                <div className="uc-card" key={i}>
                  <CardIcon icon={card.icon} />
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* One tinted band holding the heading and all three rows, which is how the theme builds
          it. Emitting a section per row dropped the tint and split the band into three, so the
          page lost the alternating light/dark rhythm that separates its parts. */}
      {(c.sections ?? []).length > 0 && (
        <section className="uc-sec tint">
          <div className="uc-wrap">
            <Head head={headFor(c.heads, /how it works/i)} />
            {c.sections.map((s, i) => (
              <div className="uc-alt" key={i}>
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
            ))}
          </div>
        </section>
      )}

      {/* "Read next / Guides on this subject": three compact cards, above the questions. The
          theme's own entries are working titles linking to /blog, because the posts had not
          been written when it was designed. These are the posts allocated to this case in the
          console, so the block ships with real links. */}
      {readNext.length > 0 && (
        <section className="uc-sec">
          <div className="uc-wrap">
            <Head head={{
              eyebrow: c.read_next_head?.eyebrow || 'Read next',
              heading: c.read_next_head?.heading || 'Guides on this subject',
              sub: '',
            }} />
            <div className="uc-cards">
              {readNext.map((p, i) => (
                <Link className="uc-res" href={`/blog/${p.slug}`} key={p.slug}>
                  {/* The post's own feature image; the theme's colour band stays behind it, and
                      shows on its own only for a post that has no image. */}
                  <span className="uc-band"
                        style={{ background: c.read_next_bands?.[i] ?? undefined }}>
                    {p.feature_image_url && <SiteImage src={p.feature_image_url} alt="" />}
                  </span>
                  <span className="body">
                    <h3>{p.title}</h3>
                    <p>{trim(p.excerpt ?? '')}</p>
                    <span className="uc-more">Read article <Arrow /></span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {(page.faqs ?? []).length > 0 && (
        <section className="uc-sec tint">
          <div className="uc-wrap uc-narrow">
            <Head head={headFor(c.heads, /question/i)} />
            {page.faqs.map((g, i) => (
              <div className="uc-faqgroup" key={i}>
                <h3>{g.label}</h3>
                {g.items.map((f, j) => (
                  <details className="uc-q" key={j}>
                    <summary>{f.question}<Plus /></summary>
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
                  <CardIcon icon={x.icon} />
                  <h3>{x.title}</h3><p>{x.body}</p>
                  <span className="uc-more">{x.action} <Arrow /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.guide && (
        <section className="uc-guide">
          <div className="uc-wrap uc-narrow">
            {c.guide.eyebrow && <span className="uc-eyebrow">{c.guide.eyebrow}</span>}
            <h2>{c.guide.title}</h2>
            {c.guide.lede && <p className="uc-guide-lede">{c.guide.lede}</p>}
            {c.guide.blocks.map((b, i) => (
              <div key={i}>
                {b.heading && <h2>{b.heading}</h2>}
                {b.paras.map((x, j) => <p key={j}>{x}</p>)}
                {b.bullets.length > 0 && (
                  <ul className="uc-checklist">
                    {b.bullets.map((x, j) => <li key={j}><Tick />{x}</li>)}
                  </ul>
                )}
              </div>
            ))}
            {/* The note closes the guide in the theme, inside the same narrow column. Giving it
                its own full-width section detached it from the text it qualifies. */}
            {c.note && <div className="uc-note"><p>{c.note}</p></div>}
          </div>
        </section>
      )}

      {c.note && !c.guide && (
        <section className="uc-sec">
          <div className="uc-wrap uc-narrow">
            <div className="uc-note"><p>{c.note}</p></div>
          </div>
        </section>
      )}

      {/* The posts allocated to this case in the console. Hidden entirely when none are
          allocated: an empty "Read next" heading is worse than no heading. */}
      {readNext.length > 0 && (
        <section className="ucread">
          <div className="ucread-in">
            {/* "Written on <case>", which is this block's own heading in the theme. It had
                been given "Guides on this subject", the heading belonging to the compact
                block above, so the two were indistinguishable. */}
            <p className="eyebrow">Read next</p>
            <h2>Written on {label}</h2>
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
