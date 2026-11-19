import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import type { Scenario } from '@/lib/scenarios'
import { ScenarioMockView } from './scenario-mocks'
import './user-case-page.css'
import './scenario-page.css'

// A scenario page, built on the /uses/ page template (user-case-page.css) so it reads as part
// of the same site. Content comes from src/data/scenarios/<slug>.json.

export interface ScenarioReadNext {
  slug: string; title: string; excerpt: string | null; feature_image_url: string | null
}

// The copy is written by us and stored in the repository, but it is still passed through a small
// allow list: only links, emphasis and bold survive.
const clean = (h: string) => (h || '').replace(/<(?!\/?(a|em|b|strong)\b)[^>]*>/gi, '')
const H = ({ html, as: T = 'span', ...rest }: { html: string; as?: any } & Record<string, any>) =>
  <T {...rest} dangerouslySetInnerHTML={{ __html: clean(html) }} />

const Tick = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>)
const TickMark = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>)
const ClockMark = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></svg>)
const Play = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>)
const Plus = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>)
const Arrow = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13M12 5.5 18.5 12 12 18.5" /></svg>)

const WHY_ICON: Record<string, { bg: string; fg: string; d: React.ReactNode }> = {
  chat:  { bg: '#F3EDFA', fg: '#7B3FBF', d: <path d="M4 5h16v11H9l-5 4z" /> },
  tick:  { bg: '#E7F5EE', fg: '#1F8A5B', d: <path d="M4 12.5 9.5 18 20 6.5" /> },
  alert: { bg: '#FFF4EA', fg: '#BF5700', d: <><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5M12 16h.01" /></> },
}

const trim = (s: string, n = 150) => {
  const t = (s || '').replace(/\s+/g, ' ').trim()
  return t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '...'
}

export function ScenarioPageView({ s, readNext }: { s: Scenario; readNext: ScenarioReadNext[] }) {
  return (
    <div className="ucpage scn">
      <section className="uc-hero">
        <div className="uc-wrap uc-hero-in">
          <div>
            <span className="uc-eyebrow">{s.eyebrow}</span>
            <H as="h1" html={s.title} />
            <H as="p" className="uc-lede" html={s.lede} />
            <div className="uc-actions">
              <form className="uc-field" action="/register" method="get">
                <input type="email" name="email" required placeholder="name@yourcarehome.co.uk" aria-label="Work email" />
                <button type="submit">Start free trial</button>
              </form>
              <Link className="uc-demo" href="/demo"><Play /> Book a demo</Link>
            </div>
            <p className="uc-fine">{s.fine ?? '14 day free trial · Set up in a day · UK data residency'}</p>
          </div>
          <div className="uc-panel" role="img" aria-label="Illustration of the gap after the session">
            <div className="uc-panel-hd"><b>{s.panel.title}</b><span className="uc-pill">{s.panel.pill}</span></div>
            {s.panel.rows.map((r, i) => (
              <div className="uc-row" key={i}>
                <span className={`uc-tick${r.done ? '' : ' pending'}`}>{r.done ? <TickMark /> : <ClockMark />}</span>
                <span>{r.label}</span><small>{r.note}</small>
              </div>
            ))}
            <div className="uc-meter"><i style={{ width: `${s.panel.meter}%` }} /></div>
          </div>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">The scenario</span><h2>{s.intro.heading}</h2><p className="sub">{s.intro.sub}</p></div>
          <div className="scn-intro">
            <H as="p" className="uc-intro" html={s.intro.paragraph} />
            <figure className="scn-fig"><SiteImage src={s.image} alt={s.image_alt} /></figure>
          </div>
          <div className="trail" role="list">
            <span className="line" aria-hidden="true" />
            {s.trail.map((t, i) => (
              <div className={`step ${t.kind} ${i % 2 === 0 ? 'top' : 'bot'}${i === 0 ? ' first' : ''}${i === s.trail.length - 1 ? ' last' : ''}`} style={{ ['--i' as any]: i + 1 }} key={i} role="listitem">
                <span className="node">{t.kind === 'end' ? '?' : ''}</span><span className="stem" />
                <div className="txt"><span className="when">{t.when}</span><p>{t.text}</p></div>
              </div>
            ))}
          </div>
          <H as="p" className="trail-close" html={s.trail_close} />
          <p className="uc-ex">An example scenario, not a named service.</p>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">Why it matters</span><h2>{s.why.heading}</h2><p className="sub">{s.why.sub}</p></div>
          <div className="uc-cards">
            {s.why.cards.map((c, i) => {
              const ic = WHY_ICON[c.icon] ?? WHY_ICON.chat
              return (
                <div className="uc-card" key={i}>
                  <span className="uc-cardico" style={{ background: ic.bg, color: ic.fg }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ic.d}</svg>
                  </span>
                  <h3>{c.title}</h3><p>{c.body}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="uc-sec tint">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">How it works</span><h2>{s.how.heading}</h2><H as="p" className="sub" html={s.how.sub} /></div>
          {s.how.blocks.map((b, i) => (
            <div className="uc-alt" key={i}>
              <div className="uc-alt-copy">
                <h3>{b.heading}</h3>
                <ul className="uc-bullets">{b.bullets.map((x, j) => <li key={j}><Tick /><H html={x} /></li>)}</ul>
                <div className="uc-tags">{b.tags.map((t, j) => <Link className="uc-tag" href={t.href} key={j}>{t.label}</Link>)}</div>
              </div>
              <ScenarioMockView m={b.mock} />
            </div>
          ))}
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap uc-narrow">
          <div className="uc-head"><span className="uc-eyebrow">Talk it through</span><h2>{s.talk.heading}</h2><p className="sub">{s.talk.sub}</p></div>
          <div className="talk">
            {s.talk.items.map((t, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div className="tq"><span className="who">Manager</span><p>{t.q}</p></div>
                <div className="ta"><span className="who">CareStream</span><H as="p" html={t.a} /></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">What it does not do</span><h2>{s.limits.heading}</h2></div>
          <div className="uc-cards">{s.limits.cards.map((c, i) => <div className="uc-card" key={i}><h3>{c.title}</h3><p>{c.body}</p></div>)}</div>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-head"><span className="uc-eyebrow">The feature behind this scenario</span><h2>{s.feature_links[0]?.title}</h2><p className="sub">Everything on this page is part of the product. Here is where to read more.</p></div>
          <div className="uc-cta">
            {s.feature_links.map((f, i) => (
              <Link className="uc-ctacard" href={f.href} key={i}><h3>{f.title}</h3><p>{f.body}</p><span className="uc-more">{f.action} <Arrow /></span></Link>
            ))}
          </div>
        </div>
      </section>

      {readNext.length > 0 && (
        <section className="uc-sec tint">
          <div className="uc-wrap">
            <div className="uc-head"><span className="uc-eyebrow">Read next</span><h2>Guides on this subject</h2></div>
            <div className="uc-cards">
              {readNext.map(p => (
                <Link className="uc-res" href={`/blog/${p.slug}`} key={p.slug}>
                  <span className="uc-band" style={{ background: '#F3EDFA' }}>{p.feature_image_url && <SiteImage src={p.feature_image_url} alt="" />}</span>
                  <span className="body"><h3>{p.title}</h3><p>{trim(p.excerpt ?? '')}</p><span className="uc-more">Read article <Arrow /></span></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="uc-sec tint">
        <div className="uc-wrap uc-narrow">
          <div className="uc-head"><span className="uc-eyebrow">Questions</span><h2>{s.faqs.heading}</h2></div>
          {s.faqs.groups.map((g, i) => (
            <div className="uc-faqgroup" key={i}>
              <h3>{g.group}</h3>
              {g.items.map((f, j) => (
                <details className="uc-q" key={j} open={i === 0 && j === 0}>
                  <summary>{f.q}<Plus /></summary>
                  <div className="ans"><H as="p" html={f.a} /></div>
                </details>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="uc-guide">
        <div className="uc-wrap uc-narrow">
          <span className="uc-eyebrow">Guide</span>
          <h2>{s.guide.heading}</h2>
          <H as="p" className="uc-guide-lede" html={s.guide.lede} />
          {s.guide.sections.map((g, i) => (
            <div key={i}>
              <h3>{g.h3}</h3>
              {g.paragraphs?.map((p, j) => <H as="p" html={p} key={j} />)}
              {g.checklist && <ul className="uc-checklist">{g.checklist.map((c, j) => <li key={j}><Tick /><H html={c} /></li>)}</ul>}
            </div>
          ))}
          <div className="uc-note"><H as="p" html={s.guide.note} /></div>
        </div>
      </section>

      <section className="uc-sec">
        <div className="uc-wrap">
          <div className="uc-cta">
            <Link className="uc-ctacard" href="/register"><h3>Start your free trial</h3><p>Upload your policies and see the training CareStream builds from them.</p><span className="uc-more">Start free trial <Arrow /></span></Link>
            <Link className="uc-ctacard" href="/demo"><h3>Book a demo</h3><p>See how a wrong answer becomes a short lesson, using your own policy.</p><span className="uc-more">Book a demo <Arrow /></span></Link>
            <Link className="uc-ctacard" href="/scenarios"><h3>More scenarios</h3><p>Real situations in care homes, and how CareStream is used in each.</p><span className="uc-more">Browse scenarios <Arrow /></span></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
