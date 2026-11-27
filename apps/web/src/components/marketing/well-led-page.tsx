import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { PRODUCTS, STATEMENTS, HUB_PATH } from '@/lib/well-led'
import type { WLPage } from '@/lib/well-led-pages'
import './user-case-page.css'
import './scenario-page.css'

// A CQC Well-led statement page. Same template as a scenario page (hero with an illustration panel, an intro with a picture, cards, FAQs, guide, calls to action),
// so the two read as one site. Content comes from lib/well-led-pages.ts.

const clean = (h: string) => (h || '').replace(/<(?!\/?(a|em|b|strong)\b)[^>]*>/gi, '')
const H = ({ html, as: T = 'span', ...rest }: { html: string; as?: any } & Record<string, any>) =>
  <T {...rest} dangerouslySetInnerHTML={{ __html: clean(html) }} />

const Tick = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>)
const TickMark = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>)
const ClockMark = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>)
const Play = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>)
const Plus = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>)
const Arrow = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13M12 5.5 18.5 12 12 18.5" /></svg>)

const ICON_BG = ['#F3EDFA', '#E7F5EE', '#FFF4EA', '#EAF1FB']
const ICON_FG = ['#7B3FBF', '#1F8A5B', '#BF5700', '#2F6FBF']

export function WellLedPageView({ p }: { p: WLPage }) {
  const others = STATEMENTS.filter(s => s.anchor !== p.slug)
  return (
    <div className="ucpage scn">
      <section className="uc-hero">
        <div className="uc-wrap uc-hero-in">
          <div>
            <span className="uc-eyebrow">CQC Well-led · {p.cqcName}</span>
            <H as="h1" html={p.title} />
            <H as="p" className="uc-lede" html={p.lede} />
            <div className="uc-actions">
              <form className="uc-field" action="/register" method="get">
                <input type="email" name="email" required placeholder="name@yourcarehome.co.uk" aria-label="Work email" />
                <button type="submit">Start free trial</button>
              </form>
              <Link className="uc-demo" href="/demo"><Play /> Book a demo</Link>
            </div>
            <p className="uc-fine">14 day free trial · Set up in a day · UK data residency</p>
          </div>
          <div className="uc-panel" role="img" aria-label={`Illustration of ${p.panel.title.toLowerCase()}`}>
            <div className="uc-panel-hd"><b>{p.panel.title}</b><span className="uc-pill">Illustration</span></div>
            {p.panel.rows.map((r, i) => (
              <div className="uc-row" key={i}>
                <span className={`uc-tick${r.done ? '' : ' pending'}`}>{r.done ? <TickMark /> : <ClockMark />}</span>
                <span>{r.label}</span><small>{r.note}</small>
              </div>
            ))}
            <div className="uc-meter"><i style={{ width: `${p.panel.meter}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="scn-intro">
            <div className="scn-intro-copy">
              <div className="uc-head"><span className="uc-eyebrow">What CQC asks</span><h2>{p.intro.heading}</h2><p className="sub">{p.intro.sub}</p></div>
              <p className="uc-intro">{p.intro.paragraph}</p>
            </div>
            <figure className="scn-fig"><SiteImage src={p.image} alt={p.image_alt} /></figure>
          </div>
        </div>
      </section>

      <section className="uc-sec tint">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">What inspectors look for</span><h2>Four things CQC looks for under {p.cqcName.toLowerCase()}</h2><p className="sub">Summarised from CQC&apos;s own quality statement. <a href={p.cqcUrl} target="_blank" rel="noopener noreferrer">Read CQC&apos;s wording</a>.</p></div>
          <div className="uc-cards">
            {p.looksFor.map((c, i) => (
              <div className="uc-card" key={i}>
                <span className="uc-cardico" style={{ background: ICON_BG[i % 4], color: ICON_FG[i % 4] }}><Tick /></span>
                <h3>{c.title}</h3><p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">How CareStream helps</span><h2>The CareStream products that build this evidence</h2><p className="sub">Each one links to the page that explains it.</p></div>
          <div className="uc-cards">
            {p.helps.map((h, i) => (
              <Link className="uc-card" href={PRODUCTS[h.id].href} key={h.id + i} style={{ textDecoration: 'none' }}>
                <span className="uc-cardico" style={{ background: ICON_BG[i % 4], color: ICON_FG[i % 4] }}><Tick /></span>
                <h3>{PRODUCTS[h.id].name}</h3><p>{h.text}</p>
                <span className="uc-more">Read more <Arrow /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="uc-sec tint">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">What it does not do</span><h2>What to be clear about</h2></div>
          <div className="uc-cards">{p.limits.map((c, i) => <div className="uc-card" key={i}><h3>{c.title}</h3><p>{c.body}</p></div>)}</div>
        </div>
      </section>

      <section className="uc-guide">
        <div className="uc-wrap uc-narrow">
          <span className="uc-eyebrow">Evidence checklist</span>
          <h2>The evidence you can show</h2>
          <p className="uc-guide-lede">A provider can keep these records whichever system they use. CareStream helps you keep them in one place.</p>
          <ul className="uc-checklist">{p.evidence.map((e, i) => <li key={i}><Tick /><span>{e}</span></li>)}</ul>
          <div className="uc-note"><p>CareStream helps you keep and show the evidence. It does not give a CQC rating, it is not endorsed by CQC, and the judgement is always the inspector&apos;s.</p></div>
        </div>
      </section>

      <section className="uc-sec tint">
        <div className="uc-wrap uc-narrow">
          <div className="uc-head"><span className="uc-eyebrow">Questions</span><h2>{p.cqcName}: common questions</h2></div>
          <div className="uc-faqgroup">
            {p.faqs.map((f, j) => (
              <details className="uc-q" key={j} open={j === 0}>
                <summary>{f.q}<Plus /></summary>
                <div className="ans"><H as="p" html={f.a} /></div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">The rest of Well-led</span><h2>Other parts of CQC Well-led</h2><p className="sub">Each one has its own evidence and its own CareStream products.</p></div>
          <div className="uc-cta">
            {others.map(o => (
              <Link className="uc-ctacard" href={`${HUB_PATH}/${o.anchor}`} key={o.anchor}><h3>{o.cqcName}</h3><p>{o.cardLine}</p><span className="uc-more">See the evidence <Arrow /></span></Link>
            ))}
          </div>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-cta">
            <Link className="uc-ctacard" href="/register?tier=free&source=well-led"><h3>Start your free trial</h3><p>Upload your policies and see what CareStream finds.</p><span className="uc-more">Start free trial <Arrow /></span></Link>
            <Link className="uc-ctacard" href="/demo"><h3>Book a demo</h3><p>See the evidence CareStream builds for CQC Well-led, using your own policies.</p><span className="uc-more">Book a demo <Arrow /></span></Link>
            <Link className="uc-ctacard" href={HUB_PATH}><h3>CQC Well-led guide</h3><p>All four statements, what inspectors look for, and how CareStream helps.</p><span className="uc-more">Read the guide <Arrow /></span></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
