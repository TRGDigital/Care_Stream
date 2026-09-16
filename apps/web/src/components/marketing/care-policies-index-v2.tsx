import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import './service-page-v2.css'

// The rebuilt /care-policies INDEX.
//
// Not the policy pages under it, which were ported with the rest of their family. This is the
// index, which the earlier route scan missed: its [slug] child was wired and the parent was
// not, and the rendered class-by-class diff is what surfaced it.
//
// It is built on the services design, so it shares service-page-v2.css, which is ported from
// this page among others. Two blocks are its own: the personalisation steps and the catalogue.
//
// The 66 policies and 6 packs come from the policy-shop catalogue at REQUEST TIME, never from
// the page. A price written into the page goes stale the first time one changes, and a page
// quoting a figure the checkout disagrees with costs the sale it exists to make.

export interface Copy { (key: string): string }

export interface PolicyProduct { slug: string; title: string; price_pence: number }
export interface PolicyBundle {
  key: string; title: string; description: string; price_pence: number
}

const money = (p: number) => `£${Math.round(p / 100)}`

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

const Dot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5l3 1.8" />
  </svg>
)

/** Reads `<base><n>` until one comes back empty, so a list's length is a property of the copy
 *  rather than of the template. */
function series(s: Copy, base: string, max = 14): number[] {
  const out: number[] = []
  for (let n = 1; n <= max; n++) {
    if (!s(`${base}${n}`)) break
    out.push(n)
  }
  return out
}

// What each of the eight bands is made of, read from the theme rather than guessed: the design
// sets the card-grid width per band, and which bands carry an image, a stat row or steps.
const BANDS: {
  n: number; tint: boolean; cards: '' | 'c2' | 'c3' | 'c4'; img?: number
  stats?: boolean; steps?: boolean; hl?: boolean
}[] = [
  { n: 1, tint: true, cards: 'c2', img: 2 },
  { n: 2, tint: false, cards: '', img: 3, stats: true },
  { n: 3, tint: true, cards: 'c3' },
  { n: 4, tint: false, cards: 'c4', steps: true },
  { n: 5, tint: true, cards: 'c4', hl: true },
  { n: 6, tint: false, cards: 'c4' },
  { n: 7, tint: true, cards: 'c3', img: 4 },
  { n: 8, tint: false, cards: 'c4' },
]

function Band({ s, b }: { s: Copy; b: (typeof BANDS)[number] }) {
  const k = `b${b.n}`
  const paras = series(s, `${k}.p`)
  const ticks = series(s, `${k}.li`)
  const cards = series(s, `${k}.c`, 14).filter(i => s(`${k}.c${i}.title`))
  const stats = b.stats ? series(s, `${k}.stat`) : []
  const steps = b.steps ? series(s, `${k}.step`) : []

  const copy = (
    <div>
      <span className="svlabel">{s(`${k}.label`)}</span>
      <h2>{s(`${k}.h2`)}</h2>
      {paras.map(i => <p key={i}>{s(`${k}.p${i}`)}</p>)}
      {stats.length > 0 && (
        <div className="svstats">
          {stats.map(i => (
            <div className="svstat" key={i}>
              <span className="fig">{s(`${k}.stat${i}.fig`)}</span>
              <b>{s(`${k}.stat${i}.label`)}</b>
            </div>
          ))}
        </div>
      )}
      {steps.length > 0 && (
        <div className="svsteps">
          {steps.map(i => (
            <div className="svstep" key={i}>
              <span className="n">{s(`${k}.step${i}.n`)}</span>
              <b>{s(`${k}.step${i}.title`)}</b>
              <p>{s(`${k}.step${i}.body`)}</p>
            </div>
          ))}
        </div>
      )}
      {ticks.length > 0 && (
        <ul className="svticks">
          {ticks.map(i => <li key={i}><Tick />{s(`${k}.li${i}`)}</li>)}
        </ul>
      )}
    </div>
  )

  return (
    <section className={`svsec${b.tint ? ' tint' : ''}`}>
      <div className="svwrap svsec-in">
        {b.img ? (
          <div className="svsplit">
            {copy}
            <div className="svshotwrap">
              <div className="svshot app">
                <SiteImage src={`/images/care-policies/${b.img}.webp`} alt={s(`${k}.h2`)} />
              </div>
            </div>
          </div>
        ) : copy}

        {cards.length > 0 && (
          <div className={`svcards${b.cards ? ` ${b.cards}` : ''}`}>
            {cards.map(i => (
              <div className={`svcard${b.hl && i === 1 ? ' hl' : ''}`} key={i}>
                <span className="ic"><Dot /></span>
                <b>{s(`${k}.c${i}.title`)}</b>
                <p>{s(`${k}.c${i}.body`)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function CarePoliciesIndexV2({ s, products, bundles }: {
  s: Copy
  products: PolicyProduct[]
  bundles: PolicyBundle[]
}) {
  return (
    <div className="svpage-v2">
      <section className="svhero">
        <div className="svwrap svhero-in">
          <div>
            <span className="uc-eyebrow">{s('hero.label')}</span>
            <h1>{s('hero.h1')}</h1>
            {series(s, 'hero.p').map(i => <p key={i}>{s(`hero.p${i}`)}</p>)}
            <div className="svactions">
              <Link className="svbtn solid" href="/register">Start free trial</Link>
              <Link className="svbtn ghost" href="/demo"><Play /> Book a demo</Link>
            </div>
          </div>
          <div className="svshotwrap">
            <div className="svshot app">
              {/* priority: the hero is the largest above-the-fold image, and SiteImage is lazy
                  by default, which delays the one image the reader is waiting for. */}
              <SiteImage src="/images/care-policies/1.webp" alt={s('hero.h1')} priority />
            </div>
          </div>
        </div>
      </section>

      {BANDS.map(b => <Band s={s} b={b} key={b.n} />)}

      <section className="svend">
        <div className="svwrap svend-in">
          <h2>{s('end.h2')}</h2>
          {series(s, 'end.p').map(i => <p key={i}>{s(`end.p${i}`)}</p>)}
          <div className="row">
            <Link className="svbtn solid" href="/register">Start free trial</Link>
            <Link className="svbtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>

      <section className="pcpers">
        <div className="pcpers-in">
          <p className="eb">{s('pers.label')}</p>
          <h2>{s('pers.h2')}</h2>
          <p className="lede3">{s('pers.lede')}</p>
          <div className="pcpsteps">
            {series(s, 'pers.s').map((i, idx) => (
              <div className="pcpstep" key={i}>
                <span className="n">{String(idx + 1).padStart(2, '0')}</span>
                <b>{s(`pers.s${i}.title`)}</b>
                <p>{s(`pers.s${i}.body`)}</p>
              </div>
            ))}
          </div>
          <div className="pccompare">
            {[1, 2].map(i => (
              <div className={`pccmp ${i === 1 ? 'bad' : 'good'}`} key={i}>
                <span>{s(`pers.cmp${i}.label`)}</span>
                <q>{s(`pers.cmp${i}.quote`)}</q>
                <em>{s(`pers.cmp${i}.note`)}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pccat">
        <div className="pccat-in">
          <p className="eb">{s('cat.label')}</p>
          {/* The count comes from the catalogue, not from the copy, so the heading cannot say
              66 while the grid beneath it lists 64. */}
          <h2>{s('cat.h2').replace(/\ball \d+\b/i, m => `${m.split(' ')[0]} ${products.length}`)}</h2>
          <p className="lede3">{s('cat.lede')}</p>
          {bundles.length > 0 && (
            <div className="pcpacks">
              {bundles.map(p => (
                <Link className="pcpack" href={`/care-policies/bundles/${p.key}`} key={p.key}>
                  <b>{p.title}</b><em>{money(p.price_pence)}</em><span>{p.description}</span>
                </Link>
              ))}
            </div>
          )}
          <div className="pcgrid">
            {products.map(p => (
              <Link className="pcrow" href={`/care-policies/${p.slug}`} key={p.slug}>
                <b>{p.title}</b><i>{money(p.price_pence)}</i>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
