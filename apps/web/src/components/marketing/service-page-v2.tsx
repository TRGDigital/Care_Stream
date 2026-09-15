import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import './service-page-v2.css'

// The rebuilt template for the seven /our-services pages, at their LIVE flat URLs
// (/care-audits, /cqc-compliance and the rest). No URL changes in this switchover.
//
// This family is the odd one out. /care-policies, /buy and /staff-training share 73-94% of
// their prose between pages, so their copy lives in the template. These share NOTHING: 0%
// measured, 15 to 53 paragraphs each. So the copy is stored in service_pages and edited in
// the console, and the template renders whatever blocks it is given.
//
// Blocks, not a fixed shape: the pages run from 4 to 13 sections. A fixed template would pad
// the short ones and truncate the long ones.

export interface ServiceItem {
  marker: string
  tag: string
  tone: string
  title: string
  paras: string[]
  bullets: string[]
}

export interface ServiceBlock {
  kind: string
  tint: boolean
  label: string
  heading: string
  intro: string[]
  image: string | null
  items: ServiceItem[]
  bullets: string[]
  head?: string[]
  rows?: string[][]
  /** The grid's layout classes, read off the theme rather than inferred: `c2`, `c3`, `c4`,
   *  `stack3`, `inplace`, `hoisted`. Guessing the column count from the number of items got
   *  it wrong on most pages. */
  variant?: string
  narrow?: boolean
  flip?: boolean
}

export interface ServicePage {
  slug: string
  title: string
  hero_image_url: string | null
  content: { lede: string[]; blocks: ServiceBlock[] }
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

/** The headline may carry an <em> the design colours, so it is inserted as markup. It comes
 *  from the extractor's `rich()`, which keeps only em/strong/b/i and drops everything else. */
function Headline({ html }: { html: string }) {
  return <h1 dangerouslySetInnerHTML={{ __html: html }} />
}

function Head({ block }: { block: ServiceBlock }) {
  if (!block.label && !block.heading) return null
  return (
    <>
      {block.label && <span className="svlabel">{block.label}</span>}
      {block.heading && <h2 dangerouslySetInnerHTML={{ __html: block.heading }} />}
    </>
  )
}

function Paras({ lines }: { lines: string[] }) {
  return <>{(lines ?? []).map((p, i) => <p key={i}>{p}</p>)}</>
}

function Bullets({ lines }: { lines: string[] }) {
  if (!lines?.length) return null
  return (
    <ul className="svticks">
      {lines.map((b, i) => <li key={i}><Tick />{b}</li>)}
    </ul>
  )
}

/** One block's body. The kind chooses the layout; the copy is the same shape either way, which
 *  is what lets seven differently-built pages share a template. */
function Body({ block }: { block: ServiceBlock }) {
  const { kind, items } = block

  if (kind === 'cards') {
    return (
      <div className={`svcards ${block.variant ?? 'c3'}`.trim()}>
        {items.map((it, i) => (
          <div className="svcard" key={i}>
            {it.title && <b>{it.title}</b>}
            <Paras lines={it.paras} />
            <Bullets lines={it.bullets} />
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'steps') {
    return (
      <div className={`svsteps ${block.variant ?? ''}`.trim()}>
        {items.map((it, i) => (
          <div className="svstep" key={i}>
            <span className="n">{it.marker || String(i + 1).padStart(2, '0')}</span>
            {it.title && <b>{it.title}</b>}
            <Paras lines={it.paras} />
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'timeline') {
    return (
      <div className="svtimeline">
        {items.map((it, i) => (
          <div key={i}>
            <span className="dot">{it.marker || String(i + 1).padStart(2, '0')}</span>
            <div>
              {it.tag && <span className="tag">{it.tag}</span>}
              {it.title && <b>{it.title}</b>}
              <Paras lines={it.paras} />
              <Bullets lines={it.bullets} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'stats') {
    return (
      <div className="svstats">
        {items.map((it, i) => (
          <div className="svstat" key={i}>
            {it.marker && <span className="fig">{it.marker}</span>}
            {it.title && <b>{it.title}</b>}
            <Paras lines={it.paras} />
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'compare') {
    return (
      <div className="svcompare">
        {items.map((it, i) => (
          <div className={`svcmp${it.tone ? ` ${it.tone}` : ''}`} key={i}>
            {it.tag && <span className="lb">{it.tag}</span>}
            <Paras lines={it.paras} />
          </div>
        ))}
      </div>
    )
  }

  if (kind === 'table' && block.rows?.length) {
    return (
      <div className={`svtable ${block.variant ?? ''}`.trim()}>
        <table className="svt">
          {!!block.head?.length && (
            <thead><tr>{block.head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
          )}
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (kind === 'prompts') {
    return (
      <ul className="svprompts">
        {block.bullets.map((b, i) => <li key={i}><span className="pic" /><span>{b}</span></li>)}
      </ul>
    )
  }

  if (kind === 'asks') {
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
  }

  if (kind === 'faq') {
    return (
      <>
        {items.map((it, i) => (
          <details className="svq" key={i}>
            <summary>{it.title}</summary>
            <div className="ans"><Paras lines={it.paras} /></div>
          </details>
        ))}
      </>
    )
  }

  if (kind === 'note') {
    return (
      <div className="svnote">
        {items[0]?.title && <b>{items[0].title}</b>}
        <Paras lines={items[0]?.paras ?? block.intro} />
      </div>
    )
  }

  // ticks, split, prose: the copy with whatever list and image the block carries.
  return <Bullets lines={block.bullets} />
}

export function ServicePageV2({ page }: { page: ServicePage }) {
  const c = page.content ?? { lede: [], blocks: [] }
  const blocks = c.blocks ?? []

  return (
    <div className="svpage-v2">
      <section className="svhero">
        <div className="svwrap svhero-in">
          <div>
            <Headline html={page.title} />
            <Paras lines={c.lede} />
            <div className="svactions">
              <Link className="svbtn solid" href="/register">Start free trial</Link>
              <Link className="svbtn ghost" href="/demo"><Play /> Book a demo</Link>
            </div>
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

      {blocks.map((b, i) => {
        if (b.kind === 'end') {
          return (
            <section className="svend" key={i}>
              <div className="svwrap svend-in">
                {b.heading && <h2 dangerouslySetInnerHTML={{ __html: b.heading }} />}
                <Paras lines={b.intro} />
                <div className="row">
                  <Link className="svbtn solid" href="/register">Start free trial</Link>
                  <Link className="svbtn ghost" href="/demo">Book a demo</Link>
                </div>
              </div>
            </section>
          )
        }

        // A split block puts the copy beside an image; everything else runs full width.
        const split = b.kind === 'split' && b.image
        const wrap = `svwrap svsec-in${b.narrow ? ' svnarrow' : ''}`
        return (
          <section className={`svsec${b.tint ? ' tint' : ''}`} key={i}>
            <div className={wrap}>
              {split ? (
                <div className={`svsplit${b.flip ? ' flip' : ''}`}>
                  <div>
                    <Head block={b} />
                    <Paras lines={b.intro} />
                    <Body block={b} />
                  </div>
                  <div className="svshotwrap">
                    <div className="svshot app">
                      <SiteImage src={b.image!} alt={b.heading.replace(/<[^>]*>/g, '')} />
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Head block={b} />
                  <Paras lines={b.intro} />
                  <Body block={b} />
                  {b.image && b.kind !== 'cards' && (
                    <div className="svshotwrap">
                      <div className="svshot app">
                        <SiteImage src={b.image} alt={b.heading.replace(/<[^>]*>/g, '')} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
