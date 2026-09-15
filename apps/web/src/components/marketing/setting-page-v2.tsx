import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import type { SettingPageConfig } from './setting-page'
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

// sbtn, not fbtn. The class names differ per family in the theme, and borrowing the features
// one left these rendering as bare text with an oversized icon between them: the rule simply
// did not exist in this family's stylesheet, so nothing errored and nothing was styled.
function Actions() {
  return (
    <div className="sactions">
      <Link className="sbtn solid" href="/register">Start free trial</Link>
      <Link className="sbtn ghost" href="/demo"><Play /> Book a demo</Link>
    </div>
  )
}

function img(slug: string, n: number) {
  return `/images/${slug}/${n}.webp`
}

// The eight service descriptions, in the order the design lists them, with the page they link
// to. Kept here rather than in each config because the mapping is the same for every setting;
// only the wording differs, and that is what the config holds.
const SERVICES: { key: keyof SettingPageConfig['serviceDescriptions']; title: string; href: string }[] = [
  { key: 'policies',    title: 'Care Policies',          href: '/care-policies' },
  { key: 'hr',          title: 'HR Policies',            href: '/hr-policies' },
  { key: 'training',    title: 'Training',               href: '/training-platform' },
  { key: 'audits',      title: 'Care Audits',            href: '/care-audits' },
  { key: 'cqc',         title: 'CQC and Compliance',     href: '/cqc-compliance' },
  { key: 'staffq',      title: 'CQC Staff Questions',    href: '/cqc-staff-questions' },
  { key: 'reportchat',  title: 'CQC Report Chat',        href: '/cqc-report-chat' },
  { key: 'continuity',  title: 'Business Continuity',    href: '/business-continuity' },
]

export function SettingPageV2({ config }: { config: SettingPageConfig }) {
  const c = config
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
              <b>{c.mockup.orgName}</b><span className="tag">{c.mockup.badge}</span>
            </div>
            <div className="smock-tabs">
              {c.mockup.tabs.map(t => <span key={t}>{t}</span>)}
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
              <div className="scard" key={i}><b>{it.title}</b><p>{it.body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="ssec tint">
        <div className="swrap ssec-in">
          <h2>{c.servicesH2}</h2>
          <div className="sservices">
            {SERVICES.map(s => (
              <Link href={s.href} key={s.key}>
                <b>{s.title}</b><p>{c.serviceDescriptions[s.key]}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ssec">
        <div className="swrap ssec-in">
          <h2>{c.scenarios.h2}</h2>
          <p>{c.scenarios.sub}</p>
          {c.scenarios.items.map((s, i) => (
            <div className="sscen-row" key={i}>
              <div className="sscen">
                <div>
                  <span className="dot">{String(i + 1).padStart(2, '0')}</span>
                  <div><span className="tag">{s.tag}</span><p>{s.body}</p></div>
                </div>
              </div>
              <div className="sscen-shot">
                <SiteImage src={img(c.slug, Math.min(i + 2, 2))} alt={s.tag} />
              </div>
            </div>
          ))}
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
                {c.deepDive.chips.map((ch, i) => <span key={i}>{ch}</span>)}
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
          <h2>{c.outcomes.h2}</h2>
          <div className="sout">
            {c.outcomes.items.map((o, i) => (
              <div key={i}><b>{o.title}</b><p>{o.body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="scqc">
        <div className="swrap scqc-in">
          <h2>{c.cqc.h2}</h2>
          <p>{c.cqc.intro}</p>
          <div className="scqc-cards">
            {c.cqc.cards.map((card, i) => (
              <div key={i}><b>{card.title}</b><p>{card.body}</p></div>
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
                <summary>{f.question}</summary>
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
          <div className="row"><Actions /></div>
        </div>
      </section>
    </div>
  )
}
