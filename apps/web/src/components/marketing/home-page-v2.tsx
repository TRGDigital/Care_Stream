import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { TRAINING_ACCREDITED } from '@/lib/training-commerce'
import { HomeShowcase, type Slide } from './home-showcase'
import { HomeVideo } from './home-video'
import { HomeAccordion } from './home-accordion'
import { HomeLines } from './home-lines'
import { REVIEWS } from '@/lib/reviews'
import './home-page-v2.css'

// The rebuilt home page.
//
// Its copy is entirely new: 0 of the 29 paragraphs on the theme's home page appear in the
// slots the current page reads, so this carries the approved copy across rather than reusing
// what is stored. The words live in HOME_V2_SLOTS and are edited under Main site pages -> /,
// so changing a sentence stays a save rather than a deploy.
//
// BUILT FROM THE THEME'S MARKUP, BLOCK BY BLOCK. The first version was written by hand and the
// block-by-block diff against the theme found what that cost: the hero's constellation (cards,
// labels and the connector lines), the hub diagram's lines and icons, the accordions' chevrons,
// the showcase's icons, arrows and scroll hint and its descriptions, and two whole sections
// ("Training built from your own policies" and "From sign-up to evidence in an afternoon")
// were missing or reworded. The theme's links are all "#", so the destinations here are the
// live pages they stand for.

export interface HomeCopy { (key: string): string }

/** A heading the design breaks onto two lines: the break is a new line in the slot. */
const Lines = ({ text }: { text: string }) => (
  <>{text.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}</>
)

type Css = React.CSSProperties & Record<`--${string}`, string>

const I20 = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">{children}</svg>
)
const I24 = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">{children}</svg>
)
const st = { stroke: 'currentColor', strokeLinejoin: 'round' as const }
const sc = { stroke: 'currentColor', strokeLinecap: 'round' as const }
const scj = { stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

// The thirteen product screens in "The platform", in the order the design lists them, with the
// design's descriptions and icons.
const SHOWCASE: Slide[] = ([
  ['Staff Hub · 60+ Languages', '#2F6FD0', '/features/staff-hub', 5,
   'A carer asks a question in their own language and gets your policy back in it, at 3am, with the source cited.',
   <I24 key="i"><path d="M4 6h16v11H9l-5 4z" {...st} strokeWidth="1.7" /></I24>],
  ['Policy Gaps', '#7B3FBF', '/policy-gap-detection', 6,
   'Every regulation that applies to your service, checked against the words in your own policies rather than their titles.',
   <I24 key="i"><path d="M12 3 20 6v6c0 4.8-3.6 7.7-8 9-4.4-1.3-8-4.2-8-9V6z" {...st} strokeWidth="1.7" /></I24>],
  ['Policy Inconsistencies', '#8B45C9', '/uses/policy-inconsistencies', 7,
   'Finds where two of your policies give different answers to the same question, which is the thing inspectors notice.',
   <I24 key="i"><path d="M12 4v16M5 8h14" {...sc} strokeWidth="1.7" /></I24>],
  ['Policy CQC Wording Alignment', '#9B55D6', '/uses/cqc-wording-alignment', 8,
   'Checks how your policies read against the language the Single Assessment Framework expects, policy by policy.',
   <I24 key="i"><path d="M5 6h14v10H10l-5 4z" {...st} strokeWidth="1.7" /><path d="M9 11h6" {...sc} strokeWidth="1.7" /></I24>],
  ['Policies Out-of-date', '#6C34AA', '/uses/out-of-date-policies', 9,
   'Superseded law, retired regulators and stale placeholders, found across every document you hold and replaced in one pass.',
   <I24 key="i"><circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.7" /><path d="M12 7v5l3 2.4" {...sc} strokeWidth="1.7" /></I24>],
  ['Staff Compliance', '#2A5CAE', '/uses/staff-compliance', 10,
   'DBS, right to work, professional registration and references in one register, with expiry chased before it bites.',
   <I24 key="i"><path d="M12 3 20 6v6c0 4.8-3.6 7.7-8 9-4.4-1.3-8-4.2-8-9V6z" {...st} strokeWidth="1.7" /><path d="m9 11.8 2.2 2.2 4-4" {...scj} strokeWidth="1.7" /></I24>],
  ['Annual Training', '#1F8A5B', '/uses/annual-training', 11,
   'Every mandatory subject, allocated in a click and completed in the hub, with certificates filed as they are earned.',
   <I24 key="i"><path d="M12 4 3 8.5 12 13l9-4.5z" {...st} strokeWidth="1.7" /><path d="M6.5 11v5.5c0 1.2 2.5 2.4 5.5 2.4s5.5-1.2 5.5-2.4V11" stroke="currentColor" strokeWidth="1.7" /></I24>],
  ['Adhoc Training', '#22A06B', '/uses/adhoc-training', 12,
   'Generate a short module from any policy when something happens, and send it to the people who need it that day.',
   <I24 key="i"><path d="M13 3 6 13h5l-1.2 8L18 11h-5z" {...st} strokeWidth="1.7" /></I24>],
  ['Face-to-face Training', '#177A50', '/uses/face-to-face-training', 13,
   'Book sessions, record attendance, and get a payroll-ready report without anyone chasing a paper register.',
   <I24 key="i"><path d="M4 19.5V18a4 4 0 0 1 4-4h4.5a4 4 0 0 1 4 4v1.5" {...sc} strokeWidth="1.7" /><circle cx="10.2" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.7" /></I24>],
  ['Training Matrix', '#149B63', '/uses/training-matrix', 14,
   'Annual, adhoc and face-to-face across one grid, so you can see at a glance who is behind and on what.',
   <I24 key="i"><path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" stroke="currentColor" strokeWidth="1.7" /></I24>],
  ['Training Calendar', '#1F8A5B', '/uses/training-calendar', 15,
   'What is due, when, and for whom, laid out across the year rather than discovered the week before.',
   <I24 key="i"><path d="M5 6h14v14H5z" stroke="currentColor" strokeWidth="1.7" /><path d="M5 10h14M9 3.5v3M15 3.5v3" {...sc} strokeWidth="1.7" /></I24>],
  ['CQC Prep Questions', '#D08A15', '/uses/cqc-prep-questions', 16,
   'Role-matched questions an inspector might actually ask, sent to the staff they apply to, with answers recorded.',
   <I24 key="i"><circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.7" /><path d="M12 15.8v-.5c0-1.3 2.5-1.8 2.5-3.8A2.5 2.5 0 0 0 9.7 10.4" {...sc} strokeWidth="1.7" /><circle cx="12" cy="18.3" r="1" fill="currentColor" /></I24>],
  ['Staff Onboarding', '#3B82C4', '/uses/staff-onboarding', 17,
   'Step-by-step induction flows that take a new starter from day one to signed off, with the reading acknowledged.',
   <I24 key="i"><circle cx="9" cy="9" r="3.1" stroke="currentColor" strokeWidth="1.7" /><circle cx="16.2" cy="10.2" r="2.5" stroke="currentColor" strokeWidth="1.7" /><path d="M3.6 19.2c.7-2.9 2.8-4.3 5.4-4.3s4.7 1.4 5.4 4.3" {...sc} strokeWidth="1.7" /></I24>],
] as [string, string, string, number, string, React.ReactNode][]).map(([title, colour, href, n, body, icon]) => ({
  title, colour, href, body, icon, image: `/images/index/${n}.webp`,
}))

// The cards around the hub diagram, in the design's order, colours and icons.
const HUB_LEFT: [string, string, React.ReactNode][] = [
  ['Policy Gaps', '#7B3FBF', <I20 key="i"><path d="M10 2.5 16.5 5v5c0 4-3 6.4-6.5 7.5C6.5 16.4 3.5 14 3.5 10V5z" {...st} strokeWidth="1.8" /></I20>],
  ['Policy Inconsistencies', '#8B45C9', <I20 key="i"><path d="M10 3v14M4 6h12" {...sc} strokeWidth="1.8" /></I20>],
  ['Policy CQC Wording Alignment', '#9B55D6', <I20 key="i"><path d="M4 5h12v8H8l-4 3z" {...st} strokeWidth="1.8" /><path d="M7 9h6" {...sc} strokeWidth="1.8" /></I20>],
  ['Policies Out-of-date', '#6C34AA', <I20 key="i"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="M10 6v4l2.5 2" {...sc} strokeWidth="1.8" /></I20>],
  ['Staff Hub · 60+ Languages', '#2F6FD0', <I20 key="i"><path d="M3 5h14v9H7l-4 3z" {...st} strokeWidth="1.8" /></I20>],
  ['Staff Compliance', '#2A5CAE', <I20 key="i"><path d="M10 2.5 16.5 5v5c0 4-3 6.4-6.5 7.5C6.5 16.4 3.5 14 3.5 10V5z" {...st} strokeWidth="1.8" /><path d="m7.5 9.8 1.8 1.8 3.4-3.4" {...scj} strokeWidth="1.8" /></I20>],
]
const HUB_RIGHT: [string, string, React.ReactNode][] = [
  ['Staff Onboarding', '#3B82C4', <I20 key="i"><circle cx="7.5" cy="7.5" r="2.6" stroke="currentColor" strokeWidth="1.8" /><circle cx="13.5" cy="8.5" r="2.1" stroke="currentColor" strokeWidth="1.8" /><path d="M3 16c.6-2.4 2.3-3.6 4.5-3.6S11.4 13.6 12 16" {...sc} strokeWidth="1.8" /></I20>],
  ['Annual Training', '#1F8A5B', <I20 key="i"><path d="M10 3 2.5 7 10 11l7.5-4z" {...st} strokeWidth="1.8" /><path d="M5.5 9v4.5c0 1 2 2 4.5 2s4.5-1 4.5-2V9" stroke="currentColor" strokeWidth="1.8" /></I20>],
  ['Adhoc Training', '#22A06B', <I20 key="i"><path d="M11 2.5 5 11h4l-1 6.5L15 9h-4z" {...st} strokeWidth="1.8" /></I20>],
  ['Face-to-face Training', '#177A50', <I20 key="i"><path d="M3 16v-1.5A3.5 3.5 0 0 1 6.5 11h4a3.5 3.5 0 0 1 3.5 3.5V16" {...sc} strokeWidth="1.8" /><circle cx="8.5" cy="6.5" r="2.8" stroke="currentColor" strokeWidth="1.8" /></I20>],
  ['Training Matrix', '#149B63', <I20 key="i"><path d="M4 4h5v5H4zM11 4h5v5h-5zM4 11h5v5H4zM11 11h5v5h-5z" stroke="currentColor" strokeWidth="1.8" /></I20>],
  ['Training Calendar', '#1F8A5B', <I20 key="i"><path d="M4 5h12v12H4z" stroke="currentColor" strokeWidth="1.8" /><path d="M4 8h12M7.5 3v3M12.5 3v3" {...sc} strokeWidth="1.8" /></I20>],
  ['CQC Prep Questions', '#D08A15', <I20 key="i"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.8" /><path d="M10 13.2v-.4c0-1.1 2.1-1.5 2.1-3.2A2.1 2.1 0 0 0 8.1 8.6" {...sc} strokeWidth="1.8" /><circle cx="10" cy="15.3" r=".85" fill="currentColor" /></I20>],
]

// The six faces on the proof strip. Decorative, so no alt text: naming them would invent
// identities for stock portraits.
const FACES = [
  'image-eefd79f8.jpg', 'image-b759a092.jpg', 'image-af2233d0.jpg',
  'image-739373e5.jpg', 'image-4e24d91b.jpg', 'image-44a263b0.jpg',
]

const LOGOS: [string, string, boolean][] = [
  ['/images/_shared/logo-crossways.png', 'Crossways Residential Care Home', false],
  ['/images/_shared/logo-ferndale.png', 'Ferndale Nursing Home', true],
  ['/images/home/laureate-court-care-home-4ef68227.png', 'Laureate Court Care Home', false],
  ['/images/home/gateway-care-home-4a337d7d.png', 'Gateway Care Home', false],
  ['/images/home/oakhall-nursing-home-0e95465f.png', 'Oakhall Nursing Home', false],
  ['/images/home/queen-elizabeth-care-centre-9320c418.png', 'Queen Elizabeth Care Centre', false],
]

// "From sign-up to evidence in an afternoon": the five steps, with their icons and colours.
const STEPS: [string, boolean, React.ReactNode][] = [
  ['#2F6FD0', true, <I24 key="i"><path d="M4 20v-1.5A5.5 5.5 0 0 1 9.5 13h3a5.5 5.5 0 0 1 5.5 5.5V20" {...sc} strokeWidth="1.8" /><circle cx="11" cy="7.5" r="3.6" stroke="currentColor" strokeWidth="1.8" /><path d="M18.5 5v5M21 7.5h-5" {...sc} strokeWidth="1.8" /></I24>],
  ['#7B3FBF', true, <I24 key="i"><path d="M5 4h9l5 5v11H5z" {...st} strokeWidth="1.8" /><path d="M14 4v5h5" {...st} strokeWidth="1.8" /><path d="M12 17v-5M9.5 14.5 12 12l2.5 2.5" {...scj} strokeWidth="1.8" /></I24>],
  ['#8B45C9', false, <I24 key="i"><path d="M12 3 20 6v6c0 4.8-3.6 7.7-8 9-4.4-1.3-8-4.2-8-9V6z" {...st} strokeWidth="1.8" /><path d="m9 11.8 2.2 2.2 4-4" {...scj} strokeWidth="1.8" /></I24>],
  ['#1F8A5B', false, <I24 key="i"><path d="M12 4 3 8.5 12 13l9-4.5z" {...st} strokeWidth="1.8" /><path d="M6.5 11v5.5c0 1.2 2.5 2.4 5.5 2.4s5.5-1.2 5.5-2.4V11" stroke="currentColor" strokeWidth="1.8" /></I24>],
  ['#3B82C4', false, <I24 key="i"><path d="M4 6h16v11H9l-5 4z" {...st} strokeWidth="1.8" /></I24>],
]

export function HomePageV2({ s }: { s: HomeCopy }) {
  const accordion = [1, 2, 3, 4, 5].map(n => ({ title: s(`pi.a${n}.title`), body: s(`pi.a${n}.body`) }))
  const training = [1, 2, 3, 4, 5].map(n => ({ title: s(`training.a${n}.title`), body: s(`training.a${n}.body`) }))

  return (
    <div className="hpage-v2">
      <main>
        <div className="hero">
          {/* The constellation. Nodes are placed in percentages; the connectors between them are
              measured and drawn in pixels by <HomeLines>, so the elbows stay square. */}
          <svg className="hero-lines" id="heroLines" aria-hidden="true" />
          <div className="nd c-purple" id="n-policies" style={{ '--d': '0s', left: 'max(9%,130px)', top: '17%', '--rot': '-2deg', '--w': '240px' } as Css}>
            <div className="top">
              <span className="ic"><I20><path d="M4 3h8l4 4v10H4z" {...st} strokeWidth="1.7" /><path d="M12 3v4h4" {...st} strokeWidth="1.7" /></I20></span>
              <span className="big">{s('hero.n.policies.big')}</span>
            </div>
            <b>{s('hero.n.policies.title')}</b>
            <span>{s('hero.n.policies.sub')}</span>
            <span className="tag">{s('hero.n.policies.tag')}</span>
          </div>
          <span className="np" id="n-library" style={{ '--d': '.5s', left: 'max(6.5%,92px)', top: '47%', '--rot': '1.5deg' } as Css}>
            <span className="dot" style={{ background: '#7B3FBF' }}><I20><path d="M3 4.5h6a2 2 0 0 1 2 2V16a2 2 0 0 0-2-2H3z" {...st} strokeWidth="1.8" /><path d="M17 4.5h-6a2 2 0 0 0-2 2V16a2 2 0 0 1 2-2h6z" {...st} strokeWidth="1.8" /></I20></span>
            {s('hero.n.library')}
          </span>
          <span className="np" id="n-hub" style={{ '--d': '1s', left: 'max(8.5%,122px)', top: '73%', '--rot': '-1.5deg' } as Css}>
            <span className="dot" style={{ background: '#2F6FD0' }}><I20><path d="M3 5h14v9H7l-4 3z" {...st} strokeWidth="1.8" /></I20></span>
            {s('hero.n.hub')}
          </span>
          <div className="navs" id="n-people" style={{ '--d': '1.5s', left: '34%', top: '16px' } as Css}>
            {['image-d49a5d40.jpg', 'image-54ac841c.jpg', 'image-09d923b6.jpg'].map(f => (
              <span className="av" key={f}><SiteImage src={`/images/home/${f}`} alt="" /></span>
            ))}
          </div>
          <div className="nd c-green" id="n-training" style={{ '--d': '2s', left: 'min(91%,calc(100% - 136px))', top: '17%', '--rot': '2deg', '--w': '252px' } as Css}>
            <div className="top">
              <span className="ic"><I20><path d="M10 3 2.5 7 10 11l7.5-4z" {...st} strokeWidth="1.7" /><path d="M5.5 9v4.5c0 1 2 2 4.5 2s4.5-1 4.5-2V9" stroke="currentColor" strokeWidth="1.7" /></I20></span>
              <span className="big">{s('hero.n.training.big')}</span>
            </div>
            <b>{s('hero.n.training.title')}</b>
            <span>{s('hero.n.training.sub')}</span>
            <span className="tag">{s('hero.n.training.tag')}</span>
          </div>
          <div className="nd c-amber" id="n-gaps" style={{ '--d': '2.5s', left: 'min(93.5%,calc(100% - 134px))', top: '50%', '--rot': '-1.5deg', '--w': '248px' } as Css}>
            <div className="top">
              <span className="ic"><I20><path d="M10 2.5 16.5 5v5c0 4-3 6.4-6.5 7.5C6.5 16.4 3.5 14 3.5 10V5z" {...st} strokeWidth="1.7" /></I20></span>
              <span className="big">{s('hero.n.gaps.big')}</span>
            </div>
            <b>{s('hero.n.gaps.title')}</b>
            <span>{s('hero.n.gaps.sub')}</span>
            <span className="tag">{s('hero.n.gaps.tag')}</span>
          </div>
          <span className="np" id="n-evidence" style={{ '--d': '3s', left: 'min(93.5%,calc(100% - 92px))', top: '76%', '--rot': '1.5deg' } as Css}>
            <span className="dot" style={{ background: '#C2503E' }}><I20><path d="M5 3h10v14H5z" stroke="currentColor" strokeWidth="1.8" /><path d="M8 8h4M8 11h4" {...sc} strokeWidth="1.8" /></I20></span>
            {s('hero.n.evidence')}
          </span>
          <span className="np" id="n-audit" style={{ '--d': '4.2s', left: 'max(9%,130px)', top: '88%', '--rot': '-1deg' } as Css}>
            <span className="dot" style={{ background: '#1F8A5B' }}><I20><path d="M3 15l5-5 3 3 6-6" {...scj} strokeWidth="1.9" /></I20></span>
            {s('hero.n.audit')}
          </span>
          <div className="nd chain c-blue" id="n-manager" style={{ '--d': '3.4s', left: '36%', '--w': '296px', '--rot': '1deg' } as Css}>
            <div className="top" style={{ alignItems: 'flex-start', gap: 12, marginBottom: 0 }}>
              <span className="face"><SiteImage src="/images/home/image-a49d1734.jpg" alt="" /></span>
              <span style={{ minWidth: 0 }}>
                <b style={{ fontSize: '.95rem' }}>{s('hero.n.manager.title')}</b>
                <span>{s('hero.n.manager.sub')}</span>
                <span className="tag" style={{ marginTop: 7 }}>{s('hero.n.manager.tag')}</span>
              </span>
            </div>
          </div>
          <span className="np chain" id="n-edits" style={{ '--d': '3.8s', left: '64%', '--rot': '-1deg' } as Css}>
            <span className="dot" style={{ background: '#7B3FBF' }}><I20><path d="M12.5 4.5 15.5 7.5 7 16H4v-3z" {...st} strokeWidth="1.8" /></I20></span>
            {s('hero.n.edits')}
          </span>
          <span className="np" id="n-cqc" style={{ '--d': '4.6s', left: 'min(93.5%,calc(100% - 96px))', top: '88%', '--rot': '1deg' } as Css}>
            <span className="dot" style={{ background: '#D08A15' }}><I20><circle cx="10" cy="10" r="7.2" stroke="currentColor" strokeWidth="1.8" /><path d="M10 13.2v-.4c0-1.1 2.1-1.5 2.1-3.2A2.1 2.1 0 0 0 8.1 8.6" {...sc} strokeWidth="1.8" /></I20></span>
            {s('hero.n.cqc')}
          </span>

          <div className="wrap-inner">
            <h1>
              {s('hero.h1.lead')}<br />{s('hero.h1.mid')}{' '}
              <span className="grad">{s('hero.h1.grad1')}</span><br />
              <span className="grad">{s('hero.h1.grad2')}</span>
            </h1>
            <p className="lede">{s('hero.lede')}</p>
            {/* A real form, not a button dressed as one. It is a plain GET to /register, which
                reads ?email= and fills the field in, so the address is not typed twice. */}
            <form className="signup" action="/register" method="get">
              <input className="field" type="email" name="email" required
                     placeholder={s('hero.email.placeholder')} aria-label="Work email" />
              <button className="pill pill-solid" type="submit">{s('hero.cta')}</button>
            </form>
            <p className="microcopy">{s('hero.microcopy')}</p>
          </div>
        </div>
        <HomeLines />

        <div className="wrap proof">
          <div className="proof-in">
            <div>
              <p className="proof-stat" style={{ marginBottom: 14 }}>{s('proof.stat')}</p>
              <div className="avatars">
                {FACES.map(f => (
                  <span className="face" key={f}><SiteImage src={`/images/home/${f}`} alt="" /></span>
                ))}
                {/* Two lines in the design; on one line it pushed a logo onto a second row. */}
                <span className="cap">
                  {s('proof.caption').split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)}
                </span>
              </div>
            </div>
            <div className="logos">
              {LOGOS.map(([src, alt, tall]) => (
                <SiteImage className={`logo${tall ? ' logo-tall' : ''}`} src={src} alt={alt} key={src} />
              ))}
            </div>
          </div>
        </div>

        <section className="watch">
          <div className="wrap">
            <div className="split watch-split">
              <div className="plate-wrap">
                <HomeVideo src="/video/home-walkthrough.mp4"
                           poster="/video/home-walkthrough-poster.jpg"
                           duration={s('watch.duration')} />
              </div>
              <div>
                <p className="eyebrow">{s('watch.eyebrow')}</p>
                <h2><Lines text={s('watch.h2')} /></h2>
                <p className="lede">{s('watch.lede')}</p>
                <ul className="watch-list">
                  {[1, 2, 3].map(n => (
                    <li key={n}><span className="n">{n}</span><span>{s(`watch.step${n}`)}</span></li>
                  ))}
                </ul>
                <div className="btnrow">
                  <Link className="pill pill-solid" href="/demo">{s('watch.cta1')}</Link>
                  <Link className="pill pill-ghost" href="/demo">{s('watch.cta2')}</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="hubsec" style={{ paddingBottom: 72 }}>
          <div className="wrap" style={{ textAlign: 'center' }}>
            <p className="eyebrow">{s('hub.eyebrow')}</p>
            <h2><Lines text={s('hub.h2')} /></h2>
            <p className="lede" style={{ margin: '22px auto 0', textAlign: 'center' }}>{s('hub.lede')}</p>
            <div className="hub" id="hub">
              <svg className="hub-lines" id="hubLines" aria-hidden="true" />
              <div className="hub-col">
                {HUB_LEFT.map(([label, colour, icon]) => (
                  <div className="hc" key={label}>
                    <span className="i" style={{ background: colour }}>{icon}</span>{label}
                  </div>
                ))}
              </div>
              <div className="hub-core" id="hubCore">
                <span className="lbl">{s('hub.core')}</span>
                <div className="hub-shot">
                  <SiteImage src="/images/home/policy-library.svg"
                    alt="The CareStream policy library: internal policies listed with their section, status and version" />
                </div>
              </div>
              <div className="hub-col">
                {HUB_RIGHT.map(([label, colour, icon]) => (
                  <div className="hc" key={label}>
                    <span className="i" style={{ background: colour }}>{icon}</span>{label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <p className="eyebrow">{s('pi.eyebrow')}</p>
            <h2><Lines text={s('pi.h2')} /></h2>
            <div className="split" style={{ marginTop: 56 }}>
              <div className="plate-wrap">
                <div className="plate shotplate">
                  <SiteImage
                    src="/images/home/a-regulation-coverage-detail-in-carestream-showing-what-to-add-and-where-9e5e40ea.jpg"
                    alt="A regulation coverage detail in CareStream, showing what to add and where" />
                </div>
              </div>
              <div>
                <HomeAccordion items={accordion} />
              </div>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <div className="split rev">
              <div>
                <p className="eyebrow">{s('hubband.eyebrow')}</p>
                <h2><Lines text={s('hubband.h2')} /></h2>
                <p className="lede">{s('hubband.lede')}</p>
                <div className="btnrow">
                  <Link className="pill pill-solid" href="/features/staff-hub">{s('hubband.cta1')}</Link>
                  <Link className="pill pill-ghost" href="/languages">{s('hubband.cta2')}</Link>
                </div>
              </div>
              <div className="plate-wrap">
                <div className="plate shotplate">
                  <SiteImage
                    src="/images/home/the-carestream-staff-hub-answering-a-policy-question-with-a-summary-and-key-points-a66b389f.jpg"
                    alt="The CareStream staff hub, answering a policy question with a summary and key points" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="showcase">
          <HomeShowcase slides={SHOWCASE} hint={s('showcase.hint')} head={<>
            <p className="eyebrow">{s('showcase.eyebrow')}</p>
            <h2><Lines text={s('showcase.h2')} /></h2>
          </>} />
        </section>

        <section>
          <div className="wrap">
            <div className="split rev">
              <div>
                <p className="eyebrow">{s('training.eyebrow')}</p>
                <h2><Lines text={s('training.h2')} /></h2>
                <p className="lede" style={{ marginTop: 22 }}>{s('training.lede')}</p>
                <HomeAccordion items={training} style={{ marginTop: 26 }} />
              </div>
              <div className="plate-wrap">
                <div className="plate">
                  <SiteImage src="/images/index/18.webp"
                             alt="Annual, ad-hoc and face-to-face training across one grid, with completion states" />
                </div>
              </div>
            </div>
            <div className="cards">
              <div className="card">
                <span className="mico"><I20><path d="M3 15l5-5 3 3 6-6" {...scj} strokeWidth="1.5" /></I20></span>
                <h3>{s('training.c1.title')}</h3>
                <p>{s('training.c1.body')}</p>
              </div>
              <div className="card">
                <span className="mico"><I20><path d="M10 2.5 16.5 5v5c0 4-3 6.4-6.5 7.5C6.5 16.4 3.5 14 3.5 10V5z" {...st} strokeWidth="1.5" /></I20></span>
                {/* The theme's title claims CPD accreditation, which is not held; it is shown
                    only once TRAINING_ACCREDITED is set. */}
                <h3>{TRAINING_ACCREDITED ? 'CPD-accredited courses' : s('training.c2.title')}</h3>
                <p>{s('training.c2.body')}</p>
              </div>
              <div className="card">
                <span className="mico"><I20><path d="M5 3h10v14H5z" stroke="currentColor" strokeWidth="1.5" /><path d="M8 8h4M8 11h4" {...sc} strokeWidth="1.5" /></I20></span>
                <h3>{s('training.c3.title')}</h3>
                <p>{s('training.c3.body')}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <p className="eyebrow">{s('start.eyebrow')}</p>
            <h2 style={{ maxWidth: '22ch' }}>{s('start.h2')}</h2>
            <p className="lede" style={{ marginTop: 18, maxWidth: '54ch' }}>{s('start.lede')}</p>
            <div className="bp">
              <div className="bpline">
                {STEPS.map(([colour, done, icon], i) => (
                  <div className={`bstep${done ? ' b-done' : ''}`} key={i}>
                    <span className="bicon" style={{ background: colour }}>{icon}<span className="bnum">{i + 1}</span></span>
                    <div className="txt">
                      <span className="btime">{s(`start.s${i + 1}.time`)}</span>
                      <h4>{s(`start.s${i + 1}.title`)}</h4>
                      <p>{s(`start.s${i + 1}.body`)}</p>
                    </div>
                  </div>
                ))}
                <div className="bend">
                  <span className="ring"><I24><path d="m6 12.5 4 4 8-8.5" {...scj} strokeWidth="2.4" /></I24></span>
                  <b>{s('start.end.title')}</b>
                  <span>{s('start.end.body')}</span>
                </div>
              </div>
            </div>
            <div className="btnrow" style={{ justifyContent: 'flex-start', marginTop: 38, alignItems: 'center' }}>
              <Link className="pill pill-solid" href="/register">{s('start.cta1')}</Link>
              <Link className="pill pill-ghost" href="/demo">{s('start.cta2')}</Link>
              <span className="microcopy" style={{ margin: 0 }}>{s('start.microcopy')}</span>
            </div>
          </div>
        </section>

        {/* Real customer reviews, word for word (lib/reviews). This replaced a single quote that
            came with the theme and was not from a customer. */}
        <section className="band">
          <div className="wrap">
            <p className="eyebrow">{s('story.eyebrow')}</p>
            <h2 style={{ maxWidth: '22ch' }}>{s('story.h2')}</h2>
            <div className="reviews">
              {REVIEWS.map(r => (
                <figure className="review" key={r.name}>
                  <blockquote>&ldquo;{r.quote}&rdquo;</blockquote>
                  <figcaption><b>{r.name}</b><span>{r.setting}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <div className="wrap cta">
          <h2>{s('cta.h2')}</h2>
          <p className="lede" style={{ margin: '22px auto 0', textAlign: 'center' }}>{s('cta.lede')}</p>
          <div className="btnrow">
            <Link className="pill pill-solid" href="/register">{s('cta.primary')}</Link>
            <Link className="pill pill-ghost" href="/demo">{s('cta.secondary')}</Link>
          </div>
          <p className="microcopy">{s('cta.microcopy')}</p>
        </div>
      </main>
    </div>
  )
}
