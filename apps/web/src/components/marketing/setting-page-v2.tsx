import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import type { SettingPageConfig } from './setting-page'
import { SETTING_PAGE_ICONS } from '@/lib/settings/icons'
import './setting-page-v2.css'

// The rebuilt template for the 11 care-setting pages. Renders the SAME config the current
// pages render, so the switchover is a design change and nothing is rewritten: all 405
// paragraphs across the family were checked against the theme and already match.
//
// Images go through <SiteImage> so alt text saved in the console reaches the page.

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
)

const Play = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>
)

// The stylesheet hides the native disclosure marker and rotates this plus into a cross when the
// answer opens. Without it a question looks like a heading with nothing to click.
const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
  </svg>
)

const Plus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)

// sbtn, not fbtn. The class names differ per family in the theme, and borrowing the features
// one left these rendering as bare text with an oversized icon between them: the rule simply
// did not exist in this family's stylesheet, so nothing errored and nothing was styled.
function Buttons() {
  return (
    <>
      <Link className="sbtn solid" href="/register">Start free trial</Link>
      <Link className="sbtn ghost" href="/demo"><Play /> Book a demo</Link>
    </>
  )
}

// The hero groups the buttons in `.sactions`; the closing band lays them out with `.row` and
// no inner wrapper. The wrapper belongs to the caller, not here.
function Actions() {
  return <div className="sactions"><Buttons /></div>
}

function img(slug: string, n: number) {
  return `/images/${slug}/${n}.webp`
}

// The eight service cards, in the order the design lists them: link, title, colour pair and
// icon. Kept here rather than in each config because they are byte-identical on all eleven
// pages; only the wording differs, and that is what the config holds.
//
// Titles, hrefs, colours and icon paths all taken from the theme. The icons were absent
// entirely, which is eight of the twenty-one missing from each page.
interface Service {
  key: keyof SettingPageConfig['serviceDescriptions']
  title: string
  href: string
  bg: string
  fg: string
  d: string[]
  circle?: { cx: string; cy: string; r: string }
}

const SERVICES: Service[] = [
  { key: 'policies', title: 'Care Policies', href: '/care-policies',
    bg: '#F1E9FA', fg: '#6F35B0', d: ['M6 3.5h9l4 4v13H6z', 'M9 12h7M9 16h5'] },
  { key: 'hr', title: 'HR Policies', href: '/hr-policies',
    bg: '#E5EEFC', fg: '#2760BC', circle: { cx: '12', cy: '8', r: '3.4' },
    d: ['M5.5 20c.8-3.6 3.4-5.4 6.5-5.4s5.7 1.8 6.5 5.4'] },
  { key: 'training', title: 'Staff Training', href: '/staff-training',
    bg: '#E6F4EC', fg: '#15764F',
    d: ['M12 5 21 9.5 12 14 3 9.5z',
        'M6.8 11.8V16c0 1.6 2.3 2.9 5.2 2.9s5.2-1.3 5.2-2.9v-4.2'] },
  { key: 'audits', title: 'Care Audits', href: '/care-audits',
    bg: '#DDF2EF', fg: '#0A736C',
    d: ['M9 4.5h6v2H9z', 'M7 5.5H5.5v15h13v-15H17', 'M9 12l2 2 4-4'] },
  { key: 'cqc', title: 'CQC and Compliance', href: '/cqc-compliance',
    bg: '#FCF0DC', fg: '#9E6709',
    d: ['M12 3.5 20 7v5.5c0 4.4-3.4 7.4-8 8.6-4.6-1.2-8-4.2-8-8.6V7z',
        'M8.8 12.2 11 14.5l4.2-4.6'] },
  { key: 'staffq', title: 'CQC Staff Questions', href: '/cqc-staff-questions',
    bg: '#FCF0DC', fg: '#9E6709', circle: { cx: '12', cy: '12', r: '8.5' },
    d: ['M9.8 9.4a2.3 2.3 0 1 1 2.5 3.4v1.1', 'M12.2 17h.01'] },
  { key: 'reportchat', title: 'CQC Report Chat', href: '/cqc-report-chat',
    bg: '#DDF2EF', fg: '#0A736C',
    d: ['M4.5 5.5h15v11h-9L6 20v-3.5H4.5z', 'M8.5 10h7M8.5 13h4'] },
  { key: 'continuity', title: 'Business Continuity', href: '/business-continuity',
    bg: '#FAE7E3', fg: '#A94331',
    d: ['M20 12a8 8 0 1 1-2.6-5.9', 'M20 4v4.5h-4.5', 'M12 8v4.5l3 1.8'] },
]

/** An icon with no colour of its own: the card's stylesheet colours it. Used by the three CQC
 *  cards, whose icons are the same on every setting page. */
export interface IconShape {
  tag: 'path' | 'circle' | 'rect'
  d?: string
  cx?: string; cy?: string; r?: string
  x?: string; y?: string; width?: string; height?: string; rx?: string
}

/** The stored shapes as real elements. Never inject a stored icon as HTML: this keeps the set
 *  of things a generated icon can become closed to three primitives. Shared with /about and
 *  /training-platform, which carry their own generated icon sets. */
export function Shapes({ shapes }: { shapes: IconShape[] }) {
  return (
    <>
      {shapes.map((s, i) => {
        if (s.tag === 'circle') return <circle cx={s.cx} cy={s.cy} r={s.r} key={i} />
        if (s.tag === 'rect') {
          return <rect x={s.x} y={s.y} width={s.width} height={s.height} rx={s.rx} key={i} />
        }
        return <path d={s.d} key={i} />
      })}
    </>
  )
}

function PlainIcon({ shapes }: { shapes: IconShape[] }) {
  if (!shapes.length) return null
  return (
    <span className="ic">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <Shapes shapes={shapes} />
      </svg>
    </span>
  )
}

// The three CQC cards carry the same icons on all eleven pages, so they live here.
const CQC_ICONS: IconShape[][] = [
  [{ tag: 'path', d: 'M4 20V4' }, { tag: 'path', d: 'M4 20h16' },
   { tag: 'path', d: 'M8 16v-5M12.5 16V8M17 16v-3' }],
  [{ tag: 'circle', cx: '12', cy: '12', r: '8.5' },
   { tag: 'path', d: 'M9.8 9.4a2.3 2.3 0 1 1 2.5 3.4v1.1' }, { tag: 'path', d: 'M12.2 17h.01' }],
  [{ tag: 'path', d: 'M12 3.5 20 7v5.5c0 4.4-3.4 7.4-8 8.6-4.6-1.2-8-4.2-8-8.6V7z' },
   { tag: 'path', d: 'M8.8 12.2 11 14.5l4.2-4.6' }],
]

function ServiceIcon({ s }: { s: Service }) {
  return (
    <span className="ic" style={{ background: s.bg, color: s.fg }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {s.circle && <circle cx={s.circle.cx} cy={s.circle.cy} r={s.circle.r} />}
        {s.d.map((d, i) => <path d={d} key={i} />)}
      </svg>
    </span>
  )
}

export function SettingPageV2({ config }: { config: SettingPageConfig }) {
  const c = config
  // Icons are keyed by slug, not carried in the config: nobody edits an icon in the console,
  // so routing them through the seed and a re-import would be churn for no gain.
  const icons = SETTING_PAGE_ICONS[c.slug] ?? { challenge: [], outcomes: [] }
  return (
    <div className="spage-v2">
      <section className="shero">
        <div className="swrap shero-in">
          <div>
            <span className="uc-eyebrow">{c.label}</span>
            <h1>{c.hero.h1}</h1>
            <p>{c.hero.subtitle}</p>
            <Actions />
          </div>
          {/* The hero mock-up is markup in the theme rather than a screenshot, so it is built
              from the config the same way, and stays readable to a crawler. */}
          <div className="smock">
            <div className="smock-top">
              {/* smock-badge, not tag: `tag` is the scenario label further down the page and
                  carries different styling, so the badge was rendering as the wrong thing. */}
              <b>{c.mockup.orgName}</b><span className="smock-badge">{c.mockup.badge}</span>
            </div>
            <div className="smock-tabs">
              {c.mockup.tabs.map((t, i) => (
                <span className={`smock-tab${i ? '' : ' on'}`} key={t}>{t}</span>
              ))}
            </div>
            <div className="smock-body">
              <p className="sask">{c.mockup.question}</p>
              <div className="sans">
                <span className="from">{c.mockup.policyName}</span>
                {c.mockup.answer}
                <span className="cite">{c.mockup.citation}</span>
              </div>
              <div className="sfollow">
                {c.mockup.followups.map((f, i) => <span key={i}>{f}</span>)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ssec">
        <div className="swrap ssec-in">
          <div className="schallenge">
            <div>
              <span className="slabel">The challenge</span>
              <h2>{c.challenge.h2}</h2>
              <p>{c.challenge.para1}</p>
              <p>{c.challenge.para2}</p>
            </div>
            <div className="shotwrap">
              <div className="sshot hero">
                <SiteImage src={img(c.slug, 1)} alt={`CareStream for ${c.label.toLowerCase()}`} priority />
              </div>
            </div>
          </div>
          <div className="sgrid4">
            {c.challenge.items.map((it, i) => (
              <div className="scard" key={i}>
                <PlainIcon shapes={icons.challenge[i] ?? []} />
                <b>{it.title}</b><p>{it.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ssec tint">
        <div className="swrap ssec-in">
          <span className="slabel">What you get</span>
          <h2>{c.servicesH2}</h2>
          <div className="sservices">
            {SERVICES.map(s => (
              <Link className="sservice" href={s.href} key={s.key}>
                <ServiceIcon s={s} />
                <b>{s.title}</b><p>{c.serviceDescriptions[s.key]}</p>
                <span className="more">Learn more <Arrow /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ssec">
        <div className="swrap ssec-in">
          <span className="slabel">Day to day</span>
          <h2>{c.scenarios.h2}</h2>
          <p>{c.scenarios.sub}</p>
          {/* ONE two-column row: the six scenarios stacked in the left column against a single
              tall image. Emitting a row per scenario gave six rows and repeated the same
              image six times, which is a different page from the one the theme describes. */}
          <div className="sscen-row">
            <div className="sscen">
              {c.scenarios.items.map((s, i) => (
                <div key={i}>
                  <span className="dot">{String(i + 1).padStart(2, '0')}</span>
                  <div><span className="tag">{s.tag}</span><p>{s.body}</p></div>
                </div>
              ))}
            </div>
            <div className="sscen-shot">
              <SiteImage src={img(c.slug, 2)} alt={c.scenarios.h2} />
            </div>
          </div>
        </div>
      </section>

      <section className="ssec tint">
        <div className="swrap ssec-in">
          <div className="sdeep">
            <div>
              <span className="slabel">{c.deepDive.label}</span>
              <h2>{c.deepDive.h2}</h2>
              <p>{c.deepDive.para1}</p>
              <p>{c.deepDive.para2}</p>
              <div className="schips">
                {c.deepDive.chips.map((ch, i) => <span className="schip" key={i}>{ch}</span>)}
              </div>
            </div>
            <div className="spanel">
              <h3>{c.deepDive.panelH3}</h3>
              <p>{c.deepDive.panelBody}</p>
              <ul>
                {c.deepDive.points.map((p, i) => <li key={i}><Tick />{p}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="ssec">
        <div className="swrap ssec-in">
          <span className="slabel">The outcome</span>
          <h2>{c.outcomes.h2}</h2>
          <div className="sout">
            {c.outcomes.items.map((o, i) => (
              <div key={i}>
                <PlainIcon shapes={icons.outcomes[i] ?? []} />
                <b>{o.title}</b><p>{o.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="scqc">
        <div className="swrap scqc-in">
          <span className="slabel">CQC</span>
          <h2>{c.cqc.h2}</h2>
          <p>{c.cqc.intro}</p>
          <div className="scqc-cards">
            {c.cqc.cards.map((card, i) => (
              <div key={i}>
                <PlainIcon shapes={CQC_ICONS[i] ?? []} />
                <b>{card.title}</b><p>{card.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!!c.faqs?.length && (
        <section className="ssec tint">
          <div className="swrap ssec-in snarrow sfaq">
            <span className="slabel">Questions</span>
            <h2>Frequently asked</h2>
            {c.faqs.map((f, i) => (
              <details key={i}>
                <summary>{f.question}<Plus /></summary>
                <div className="ans"><p>{f.answer}</p></div>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="send">
        <div className="swrap send-in">
          <h2>{c.cta.heading}</h2>
          <p>{c.cta.sub}</p>
          <div className="row"><Buttons /></div>
        </div>
      </section>
    </div>
  )
}
