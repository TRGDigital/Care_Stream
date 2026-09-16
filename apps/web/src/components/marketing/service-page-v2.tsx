import { Fragment } from 'react'
import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import './service-page-v2.css'

// The rebuilt template for the seven /our-services pages and /how-it-works, at their LIVE
// URLs (/care-audits, /cqc-compliance and the rest). No URL changes in this switchover.
//
// This family shares NOTHING between pages (0% common prose, measured), so the copy is stored
// in service_pages and edited in the console, and the template renders whatever it is given.
//
// A page is sections, and a SECTION IS BUILT FROM PARTS. The first version gave each section
// one kind, and the site-wide rendered check against the deployment showed the cost: a table
// and a list inside an image split came out as a list with the table's rows flattened, every
// card icon was missing (125 across the eight pages), image-beside-copy layouts rendered
// stacked, and the hero eyebrow and section buttons were gone. Parts carry where they sit
// relative to the image, so the split, and anything hoisted below it, renders as the theme has.
//
// Records imported before this change have no parts. They still render, as one part per
// section, until they are re-imported.

export interface ServiceIconShape {
  tag: 'path' | 'circle' | 'rect'
  d?: string
  cx?: string; cy?: string; r?: string
  x?: string; y?: string; width?: string; height?: string; rx?: string
}

export interface ServiceItem {
  icon?: ServiceIconShape[]
  flag?: string
  marker: string
  tag: string
  tone: string
  title: string
  paras: string[]
  bullets: string[]
}

export interface ServicePart {
  kind: string
  where: '' | 'in' | 'after'
  sub?: string
  variant?: string
  items: ServiceItem[]
  bullets: string[]
  header?: string
  footer?: string
  head?: string[]
  rows?: string[][]
  title?: string
  paras?: string[]
}

export interface ServiceAction { label: string; href: string; style: 'solid' | 'ghost'; play: boolean }

export interface ServiceBlock {
  kind: string
  id?: string
  tint: boolean
  label: string
  heading: string
  intro: string[]
  image: string | null
  split?: boolean
  flip?: boolean
  narrow?: boolean
  parts?: ServicePart[]
  actions?: ServiceAction[]
  // The pre-parts shape, still accepted.
  items?: ServiceItem[]
  bullets?: string[]
  head?: string[]
  rows?: string[][]
  variant?: string
}

export interface ServicePage {
  slug: string
  title: string
  hero_image_url: string | null
  content: {
    eyebrow?: string
    lede: string[]
    actions?: ServiceAction[]
    toc?: { href: string; label: string }[]
    blocks: ServiceBlock[]
  }
}

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const Play = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 5.5v13l10-6.5z" />
  </svg>
)

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const Chat = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
  </svg>
)

/** An item's icon, rebuilt from stored shapes as real elements. Never injected as markup. */
function Icon({ shapes }: { shapes?: ServiceIconShape[] }) {
  if (!shapes?.length) return null
  return (
    <span className="ic">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {shapes.map((s, i) => {
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

/** The headline may carry an <em> the design colours, so it is inserted as markup. It comes
 *  from the extractor's `rich()`, which keeps only em/strong/b/i and drops everything else. */
function Headline({ html }: { html: string }) {
  return <h1 dangerouslySetInnerHTML={{ __html: html }} />
}

function Paras({ lines }: { lines?: string[] }) {
  return <>{(lines ?? []).map((p, i) => <p key={i}>{p}</p>)}</>
}

function Ticks({ lines, plain }: { lines?: string[]; plain?: boolean }) {
  if (!lines?.length) return null
  // Card, timeline and channel lists are plain lists in the theme; only a section's own list
  // is .svticks. Rendering every list as .svticks restyled the ones inside items.
  return (
    <ul className={plain ? undefined : 'svticks'}>
      {lines.map((b, i) => <li key={i}><Tick />{b}</li>)}
    </ul>
  )
}

function Buttons({ actions, fallback, className }: {
  actions?: ServiceAction[]; fallback: ServiceAction[]; className: string
}) {
  const list = actions?.length ? actions : fallback
  return (
    <div className={className}>
      {list.map(a => (
        <Link className={`svbtn ${a.style}`} href={a.href} key={`${a.href}-${a.label}`}>
          {a.play && <Play />}{a.play && ' '}{a.label}
        </Link>
      ))}
    </div>
  )
}

const HERO_DEFAULT: ServiceAction[] = [
  { label: 'Start free trial', href: '/register', style: 'solid', play: false },
  { label: 'Book a demo', href: '/demo', style: 'ghost', play: true },
]
const END_DEFAULT: ServiceAction[] = [
  { label: 'Start free trial', href: '/register', style: 'solid', play: false },
  { label: 'Book a demo', href: '/demo', style: 'ghost', play: false },
]

/** One part. The kind chooses the markup, matched element for element to the theme's. */
function Part({ part }: { part: ServicePart }) {
  const { kind, items = [] } = part
  const v = (base: string) => `${base}${part.variant ? ` ${part.variant}` : ''}`

  const body = (() => {
    switch (kind) {
      case 'cards':
        return (
          <div className={v('svcards')}>
            {items.map((it, i) => (
              <div className="svcard" key={i}>
                <Icon shapes={it.icon} />
                {it.title && <b>{it.title}</b>}
                <Paras lines={it.paras} />
                <Ticks lines={it.bullets} plain />
              </div>
            ))}
          </div>
        )
      case 'steps':
        return (
          <div className={v('svsteps')}>
            {items.map((it, i) => (
              <div className="svstep" key={i}>
                <span className="n">{it.marker || String(i + 1).padStart(2, '0')}</span>
                {it.title && <b>{it.title}</b>}
                <Paras lines={it.paras} />
                {it.tag && <span className="det">{it.tag}</span>}
              </div>
            ))}
          </div>
        )
      case 'stats':
        return (
          <div className={v('svstats')}>
            {items.map((it, i) => (
              <div className="svstat" key={i}>
                {it.marker && <span className="fig">{it.marker}</span>}
                {it.title && <b>{it.title}</b>}
                <Paras lines={it.paras} />
              </div>
            ))}
          </div>
        )
      case 'compare':
        return (
          <div className={v('svcompare')}>
            {items.map((it, i) => (
              <div className={`svcmp${it.tone ? ` ${it.tone}` : ''}`} key={i}>
                {it.tag && <span className="lb">{it.tag}</span>}
                <Paras lines={it.paras} />
              </div>
            ))}
          </div>
        )
      case 'table':
        if (!part.rows?.length) return null
        return (
          <div className={v('svtable')}>
            <table className="svt">
              {!!part.head?.length && (
                <thead><tr>{part.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
              )}
              <tbody>
                {part.rows.map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      case 'ticks':
        return <Ticks lines={part.bullets} />
      case 'timeline':
        return (
          <div className="svtimeline">
            {items.map((it, i) => (
              <div key={i}>
                <span className="dot">{it.marker || String(i + 1).padStart(2, '0')}</span>
                <div>
                  {it.tag && <span className="tag">{it.tag}</span>}
                  {it.title && <b>{it.title}</b>}
                  <Paras lines={it.paras} />
                  <Ticks lines={it.bullets} plain />
                </div>
              </div>
            ))}
          </div>
        )
      case 'note':
        return (
          <div className="svnote">
            {(part.title || items[0]?.title) && <b>{part.title || items[0]?.title}</b>}
            <Paras lines={part.paras ?? items[0]?.paras} />
          </div>
        )
      case 'prompts':
        return (
          <ul className="svprompts">
            {part.bullets.map((b, i) => (
              <li key={i}><span className="pic"><Chat /></span><span>{b}</span></li>
            ))}
          </ul>
        )
      case 'asks':
        return (
          <div className="svasks">
            {items.map((it, i) => (
              <div className="svask" key={i}>
                {it.tag && <span className="dom">{it.tag}</span>}
                <Paras lines={it.paras} />
              </div>
            ))}
          </div>
        )
      case 'channels':
        return (
          <div className="hchans">
            {items.map((it, i) => (
              <div className="hchan" key={i}>
                <div className="hchan-h">
                  <Icon shapes={it.icon} />
                  <div><b>{it.title}</b><span>{it.tag}</span></div>
                </div>
                <Paras lines={it.paras} />
                <Ticks lines={it.bullets} plain />
              </div>
            ))}
          </div>
        )
      case 'langdemo':
        return (
          <div className="hdemo">
            {part.header && <p className="hdemo-h">{part.header}</p>}
            <ul>
              {items.map((it, i) => (
                <li key={i}>
                  {it.flag && <span className="fl">{it.flag}</span>}
                  <div><b>{it.title}</b><Paras lines={it.paras} /></div>
                  {it.tag && <span className="det">{it.tag}</span>}
                </li>
              ))}
            </ul>
            {part.footer && <p className="hdemo-f"><Tick />{part.footer}</p>}
          </div>
        )
      case 'frameworks':
        return (
          <div className="hfw">
            {part.header && <p className="hfw-h">{part.header}</p>}
            <ul>
              {items.map((it, i) => <li key={i}><b>{it.title}</b><span>{it.tag}</span></li>)}
            </ul>
            {part.footer && <p className="hfw-m">{part.footer}</p>}
          </div>
        )
      case 'faq':
        return (
          <>
            {items.map((it, i) => (
              <details className="svq" key={i}>
                <summary>{it.title}<Chevron /></summary>
                <div className="ans"><Paras lines={it.paras} /></div>
              </details>
            ))}
          </>
        )
      default:
        return <Ticks lines={part.bullets} />
    }
  })()

  return (
    <>
      {part.sub && <span className="svsub">{part.sub}</span>}
      {body}
    </>
  )
}

/** A record imported before sections carried parts: treat its one kind as its one part. */
function partsOf(b: ServiceBlock): ServicePart[] {
  if (b.parts) return b.parts
  return [{
    kind: b.kind, where: '', variant: b.variant, items: b.items ?? [], bullets: b.bullets ?? [],
    head: b.head, rows: b.rows,
  }]
}

/** Questions edited in the console (Blog → Pages) rather than imported with the theme. They sit
 *  just before the closing call to action, in the theme's own question styling. */
function ConsoleFaqs({ faqs }: { faqs: { question: string; answer: string }[] }) {
  return (
    <section className="svsec">
      <div className="svwrap svsec-in svnarrow">
        <span className="svlabel">FAQ</span>
        <h2>Frequently asked questions.</h2>
        {faqs.map((f, i) => (
          <details className="svq" key={i}>
            <summary>{f.question}<Chevron /></summary>
            <div className="ans"><p>{f.answer}</p></div>
          </details>
        ))}
      </div>
    </section>
  )
}

export function ServicePageV2({ page, faqs = [] }: {
  page: ServicePage
  faqs?: { question: string; answer: string }[]
}) {
  const c = page.content ?? { lede: [], blocks: [] }
  const blocks = c.blocks ?? []
  const endAt = blocks.findIndex(b => b.kind === 'end')

  return (
    <div className="svpage-v2">
      <section className="svhero">
        <div className="svwrap svhero-in">
          <div>
            {c.eyebrow && <span className="uc-eyebrow">{c.eyebrow}</span>}
            <Headline html={page.title} />
            <Paras lines={c.lede} />
            <Buttons actions={c.actions} fallback={HERO_DEFAULT} className="svactions" />
          </div>
          {page.hero_image_url && (
            <div className="svshotwrap">
              <div className="svshot app">
                {/* priority: the hero is the largest above-the-fold image, and SiteImage is
                    lazy by default, which delays the one image the reader is waiting for. */}
                <SiteImage src={page.hero_image_url} alt={page.title.replace(/<[^>]*>/g, '')}
                           priority />
              </div>
            </div>
          )}
        </div>
      </section>

      {!!c.toc?.length && (
        <nav className="htoc" aria-label="On this page">
          <div className="svwrap htoc-in">
            {c.toc.map(x => <a href={x.href} key={x.href}>{x.label}</a>)}
          </div>
        </nav>
      )}

      {blocks.map((b, i) => {
        if (b.kind === 'end') {
          return (
            <Fragment key={i}>
              {i === endAt && faqs.length > 0 && <ConsoleFaqs faqs={faqs} />}
              <section className="svend">
                <div className="svwrap svend-in">
                  {b.heading && <h2 dangerouslySetInnerHTML={{ __html: b.heading }} />}
                  <Paras lines={b.intro} />
                  <Buttons actions={b.actions} fallback={END_DEFAULT} className="row" />
                </div>
              </section>
            </Fragment>
          )
        }

        const parts = partsOf(b)
        // A section puts its copy beside its image when the theme gives it a split. Older
        // records only knew the split as a kind of its own.
        const split = !!b.image && (b.split ?? b.kind === 'split')
        const head = (
          <>
            {b.label && <span className="svlabel">{b.label}</span>}
            {b.heading && <h2 dangerouslySetInnerHTML={{ __html: b.heading }} />}
            <Paras lines={b.intro} />
          </>
        )
        const actions = !!b.actions?.length && (
          <Buttons actions={b.actions} fallback={[]} className="svactions" />
        )
        const alt = b.heading.replace(/<[^>]*>/g, '')

        return (
          <section id={b.id || undefined} className={`svsec${b.tint ? ' tint' : ''}`} key={i}>
            <div className={`svwrap svsec-in${b.narrow ? ' svnarrow' : ''}`}>
              {split ? (
                <>
                  <div className={`svsplit${b.flip ? ' flip' : ''}`}>
                    <div>
                      {head}
                      {parts.filter(x => x.where !== 'after').map((x, j) => <Part part={x} key={j} />)}
                      {actions}
                    </div>
                    <div className="svshotwrap">
                      <div className="svshot app">
                        <SiteImage src={b.image!} alt={alt} />
                      </div>
                    </div>
                  </div>
                  {parts.filter(x => x.where === 'after').map((x, j) => <Part part={x} key={j} />)}
                </>
              ) : (
                <>
                  {head}
                  {parts.map((x, j) => <Part part={x} key={j} />)}
                  {actions}
                  {/* A section with an image but no split shows it below its copy. */}
                  {b.image && (
                    <div className="svshotwrap">
                      <div className="svshot app"><SiteImage src={b.image} alt={alt} /></div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )
      })}
      {endAt < 0 && faqs.length > 0 && <ConsoleFaqs faqs={faqs} />}
    </div>
  )
}
