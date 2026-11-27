import Link from 'next/link'
import { PRODUCTS, STATEMENTS, HUB_PATH, hubHref } from '@/lib/well-led'
import './well-led-home.css'

// Four small line icons, one per statement (drawn here so the home page needs no icon library).
const ICON: Record<string, JSX.Element> = {
  gov:   <><path d="M12 3l8 4v5c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V7l8-4z" /><path d="M9 12l2 2 4-4" /></>,
  learn: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 15l3-4 3 2 4-6" /></>,
  edi:   <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" /><path d="M16 14c2.8 0 5 1.6 5 4.5" /></>,
  cult:  <><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z" /></>,
}
const Svg = ({ k }: { k: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[k]}</svg>
)

/** Under the hero's trial line: a wide Well-led panel with the four statements. */
export function WellLedHeroPanel() {
  return (
    <div className="wlh-panel">
      <div className="wlh-head">
        <span className="wlh-tag"><i />CQC Well-led</span>
        <b>Show CQC inspectors you are well led</b>
      </div>
      <p className="wlh-sub">CQC inspectors look for evidence of leadership, culture and learning. CareStream builds it as your team works.</p>
      <div className="wlh-tiles">
        {STATEMENTS.map(st => (
          <Link key={st.topic} href={hubHref(st.topic, 'hero')} className="wlh-tile">
            <span className="wlh-ic"><Svg k={st.topic} /></span>
            <b>{st.short}</b>
            <small>{st.heroSub}</small>
          </Link>
        ))}
      </div>
      <Link href={`${HUB_PATH}?from=hero`} className="pill pill-solid wlh-btn">See how CareStream helps</Link>
    </div>
  )
}

/** The home page section: one card per statement, each listing the CareStream products that build that evidence. */
export function WellLedSection() {
  return (
    <section className="wlh-sec" id="well-led" aria-labelledby="wlh-h">
      <div className="wrap">
        <p className="eyebrow">CQC Well-led</p>
        <h2 id="wlh-h">Show CQC inspectors you are well led</h2>
        <p className="lede">Inspectors look for evidence of leadership, culture and learning. CareStream builds it as your team works.</p>
        <div className="wlh-cards">
          {STATEMENTS.map(st => (
            <Link key={st.topic} href={hubHref(st.topic, 'home')} className="wlh-card">
              <span className="wlh-ic"><Svg k={st.topic} /></span>
              <h3>{st.short}</h3>
              <p>{st.cardLine}</p>
              <ul>
                {st.cardProducts.map(id => <li key={id}>{PRODUCTS[id].name}</li>)}
              </ul>
              <span className="wlh-more">See the evidence →</span>
            </Link>
          ))}
        </div>
        <div className="btnrow" style={{ marginTop: 28, alignItems: 'center', gap: 16 }}>
          <Link className="pill pill-solid" href={HUB_PATH}>Read the Well-led guide</Link>
          <span className="wlh-note">CareStream helps you show the evidence. The judgement is always the inspector&apos;s.</span>
        </div>
      </div>
    </section>
  )
}
