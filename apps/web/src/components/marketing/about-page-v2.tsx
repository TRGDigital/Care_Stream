import Link from 'next/link'
import { ABOUT_CARDS } from '@/lib/about-cards'
import { Shapes } from './setting-page-v2'
import './about-page-v2.css'

// The rebuilt /about page. Its copy is new, so it carries the approved wording across into its
// own slot set (ABOUT_V2_SLOTS), generated from the theme rather than retyped: most of it is
// repeated shapes, and hand-copying six cards and six principles is how a body ends up under
// the wrong title.
//
// The six platform cards are LINKS with coloured icons (ABOUT_CARDS). The first version of
// this template rendered them as plain divs, which lost six internal links, six icons and the
// "Learn more" affordance on each. The rendered class diff against the theme is what found it.

export interface Copy { (key: string): string }

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/** A slot that may not be set renders nothing rather than an empty element. */
function P({ s, k, className }: { s: Copy; k: string; className?: string }) {
  const v = s(k)
  return v ? <p className={className}>{v}</p> : null
}

export function AboutPageV2({ s }: { s: Copy }) {
  const cards = [1, 2, 3, 4, 5, 6]
    .map(n => ({ title: s(`platform.c${n}.title`), body: s(`platform.c${n}.body`) }))
    .filter(c => c.title)
  const principles = [1, 2, 3, 4, 5, 6]
    .map(n => ({ title: s(`principles.p${n}.title`), body: s(`principles.p${n}.body`) }))
    .filter(p => p.title)
  const ukPoints = [1, 2, 3].map(n => s(`uk.point${n}`)).filter(Boolean)
  const more = s('platform.more') || 'Learn more'

  return (
    <div className="apage-v2">
      <section className="ahero">
        <div className="awrap ahero-in">
          <span className="uc-eyebrow">{s('hero.label')}</span>
          <h1>{s('hero.h1')}</h1>
          <P s={s} k="hero.lede" />
          <div className="achips">
            {[1, 2, 3].map(n => s(`hero.chip${n}`)).filter(Boolean).map(c => (
              <span className="achip" key={c}>{c}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="asec">
        <div className="awrap asec-in asplit">
          <div>
            <span className="alabel">{s('start.label')}</span>
            <h2>{s('start.h2')}</h2>
            {[1, 2, 3, 4].map(n => <P s={s} k={`start.p${n}`} key={n} />)}
          </div>
          <div className="astat">
            <span className="fig">{s('start.stat.fig')}</span>
            <span className="lab">{s('start.stat.lab')}</span>
            <P s={s} k="start.stat.sub" className="sub" />
          </div>
        </div>
      </section>

      <section className="asec tint">
        <div className="awrap asec-in">
          <span className="alabel">{s('platform.label')}</span>
          <h2>{s('platform.h2')}</h2>
          <P s={s} k="platform.lede" />
          <div className="acards">
            {cards.map((c, i) => {
              const card = ABOUT_CARDS[i]
              return (
                <Link className="acard" href={card.href} key={c.title}>
                  {/* The tints are per card and have no class in the stylesheet, so they are
                      values rather than a modifier. */}
                  <span className="ic" style={{ background: card.bg, color: card.fg }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <Shapes shapes={card.shapes} />
                    </svg>
                  </span>
                  <b>{c.title}</b>
                  <p>{c.body}</p>
                  <span className="more">{more} <Arrow /></span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="aprin-sec">
        <div className="awrap aprin-in">
          <div className="aprin-lead">
            <span className="alabel">{s('principles.label')}</span>
            <h2>{s('principles.h2')}</h2>
            <P s={s} k="principles.lede" />
          </div>
          <div className="aprin-list">
            {principles.map((p, i) => (
              <div className="aprin" key={p.title}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <div><b>{p.title}</b><p>{p.body}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="asec tint">
        <div className="awrap asec-in">
          <div className="auk">
            <div>
              <span className="alabel">{s('uk.label')}</span>
              <h2>{s('uk.h2')}</h2>
              <P s={s} k="uk.lede" />
            </div>
            <ul className="aticks">
              {ukPoints.map(p => <li key={p}><Tick />{p}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="ateam">
        <div className="awrap ateam-in">
          <span className="alabel">{s('team.label')}</span>
          <h2>{s('team.h2')}</h2>
          {[1, 2, 3].map(n => <P s={s} k={`team.p${n}`} key={n} />)}
        </div>
      </section>

      <section className="aend">
        <div className="awrap aend-in">
          <h2>{s('end.h2')}</h2>
          {[1, 2].map(n => <P s={s} k={`end.p${n}`} key={n} />)}
          <div className="row">
            <Link className="abtn solid" href="/demo">Book a free demo</Link>
            <Link className="abtn ghost" href="/contact">Contact us</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
