import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { HomeShowcase, type Slide } from './home-showcase'
import { HomeVideo } from './home-video'
import './home-page-v2.css'

// The rebuilt home page.
//
// Its copy is entirely new: 0 of the 29 paragraphs on the theme's home page appear in the
// slots the current page reads, so this carries the approved copy across rather than reusing
// what is stored. The words live in HOME_V2_SLOTS and are edited under Main site pages -> /,
// so changing a sentence stays a save rather than a deploy.

export interface HomeCopy { (key: string): string }

// The thirteen product screens in "The platform", in the order the design lists them.
const SHOWCASE: Slide[] = [
  ['Staff Hub · 60+ Languages', '#2F6FD0', '/staff-hub', 5,
   'A carer asks a question in their own language and gets your policy back in it, at 3am, with the source cited.'],
  ['Policy Gaps', '#7B3FBF', '/policy-gap-detection', 6,
   'Every regulation that applies to your service, checked against the words in your own policies rather than their titles.'],
  ['Policy Inconsistencies', '#8B45C9', '/uses/policy-inconsistencies', 7,
   'Finds where two of your policies give different answers to the same question, which is the thing inspectors notice.'],
  ['Policy CQC Wording Alignment', '#9B55D6', '/uses/cqc-wording-alignment', 8,
   'Checks how your policies read against the language the Single Assessment Framework expects, policy by policy.'],
  ['Policies Out-of-date', '#6C34AA', '/uses/out-of-date-policies', 9,
   'Superseded law, retired regulators and stale placeholders, found across every document you hold.'],
  ['Staff Compliance', '#2A5CAE', '/uses/staff-compliance', 10,
   'DBS, right to work, professional registration and references, tracked in one place with what expires when.'],
  ['Annual Training', '#1F8A5B', '/uses/annual-training', 11,
   'Every mandatory subject, allocated in a click and completed in the hub in any language.'],
  ['Adhoc Training', '#22A06B', '/uses/adhoc-training', 12,
   'Generate a short module from any policy when something happens and the team needs it now.'],
  ['Face-to-face Training', '#177A50', '/uses/face-to-face-training', 13,
   'Book sessions, record attendance, and get a payroll-ready record of who was there.'],
  ['Training Matrix', '#149B63', '/uses/training-matrix', 14,
   'Annual, adhoc and face-to-face across one grid, so you can see the gaps at a glance.'],
  ['Training Calendar', '#1F8A5B', '/uses/training-calendar', 15,
   'What is due, when, and for whom, laid out across the year.'],
  ['CQC Prep Questions', '#D08A15', '/uses/cqc-prep-questions', 16,
   'Role-matched questions an inspector might actually ask, answered by your staff in their own words.'],
  ['Staff Onboarding', '#3B82C4', '/uses/staff-onboarding', 17,
   'Step-by-step induction flows that take a new starter from offer to competent.'],
].map(([title, colour, href, n, body]) => ({
  title: title as string,
  colour: colour as string,
  href: href as string,
  body: body as string,
  image: `/images/index/${n}.webp`,
}))

// The labels around the hub diagram, in the design's order and colours.
const HUB_LEFT: [string, string][] = [
  ['Policy Gaps', '#7B3FBF'],
  ['Policy Inconsistencies', '#8B45C9'],
  ['Policy CQC Wording Alignment', '#9B55D6'],
  ['Policies Out-of-date', '#6C34AA'],
  ['Staff Hub · 60+ Languages', '#2F6FD0'],
  ['Staff Compliance', '#2A5CAE'],
]
const HUB_RIGHT: [string, string][] = [
  ['Staff Onboarding', '#3B82C4'],
  ['Annual Training', '#1F8A5B'],
  ['Adhoc Training', '#22A06B'],
  ['Face-to-face Training', '#177A50'],
  ['Training Matrix', '#149B63'],
  ['Training Calendar', '#1F8A5B'],
  ['CQC Prep Questions', '#D08A15'],
]

// The six faces on the proof strip. Decorative, so no alt text: naming them would invent
// identities for stock portraits.
const FACES = [
  'image-d49a5d40.jpg', 'image-54ac841c.jpg', 'image-09d923b6.jpg',
  'image-a49d1734.jpg', 'image-eefd79f8.jpg', 'image-b759a092.jpg',
]

const LOGOS: [string, string, boolean][] = [
  ['/images/_shared/logo-crossways.png', 'Crossways Residential Care Home', false],
  ['/images/_shared/logo-ferndale.png', 'Ferndale Nursing Home', true],
  ['/images/home/laureate-court-care-home-4ef68227.png', 'Laureate Court Care Home', false],
  ['/images/home/gateway-care-home-4a337d7d.png', 'Gateway Care Home', false],
  ['/images/home/oakhall-nursing-home-0e95465f.png', 'Oakhall Nursing Home', false],
  ['/images/home/queen-elizabeth-care-centre-9320c418.png', 'Queen Elizabeth Care Centre', false],
]

export function HomePageV2({ s }: { s: HomeCopy }) {
  const accordion = [1, 2, 3, 4, 5].map(n => ({
    title: s(`pi.a${n}.title`), body: s(`pi.a${n}.body`),
  }))

  return (
    <div className="hpage-v2">
      <main>
        {/* The hero's floating cards. The theme also draws connector lines between them with
            measured pixel paths; those are decorative and come in a follow-up, so the cards
            and the copy stand on their own here. */}
        <div className="hero">
          <div className="wrap-inner">
            <h1>
              {s('hero.h1.lead')}<br />{s('hero.h1.mid')}{' '}
              <span className="grad">{s('hero.h1.grad1')}</span><br />
              <span className="grad">{s('hero.h1.grad2')}</span>
            </h1>
            <p className="lede">{s('hero.lede')}</p>
            {/* A real form, not a button dressed as one. It is a plain GET to /register, which
                reads ?email= and fills the field in, so the address is not typed twice. The
                same correction Len made on the /uses hero. */}
            <form className="signup" action="/register" method="get">
              <input className="field" type="email" name="email" required
                     placeholder={s('hero.email.placeholder')} aria-label="Work email" />
              <button className="pill pill-solid" type="submit">{s('hero.cta')}</button>
            </form>
            <p className="microcopy">{s('hero.microcopy')}</p>
          </div>
        </div>

        <div className="wrap proof">
          <div className="proof-in">
            <div>
              <p className="proof-stat">{s('proof.stat')}</p>
              <div className="avatars">
                {FACES.map(f => (
                  <span className="face" key={f}>
                    <SiteImage src={`/images/home/${f}`} alt="" />
                  </span>
                ))}
                <span className="cap">{s('proof.caption')}</span>
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
                <h2>{s('watch.h2')}</h2>
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

        <section className="hubsec">
          <div className="wrap" style={{ textAlign: 'center' }}>
            <p className="eyebrow">{s('hub.eyebrow')}</p>
            <h2>{s('hub.h2')}</h2>
            <p className="lede">{s('hub.lede')}</p>
            <div className="hub">
              <div className="hub-col">
                {HUB_LEFT.map(([label, colour]) => (
                  <div className="hc" key={label}>
                    <span className="i" style={{ background: colour }} />{label}
                  </div>
                ))}
              </div>
              <div className="hub-core">
                <span className="lbl">{s('hub.core')}</span>
                <div className="hub-shot">
                  <SiteImage src="/images/home/policy-library.svg"
                    alt="The CareStream policy library: internal policies listed with their section, status and version" />
                </div>
              </div>
              <div className="hub-col">
                {HUB_RIGHT.map(([label, colour]) => (
                  <div className="hc" key={label}>
                    <span className="i" style={{ background: colour }} />{label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <p className="eyebrow">{s('pi.eyebrow')}</p>
            <h2>{s('pi.h2')}</h2>
            <div className="split">
              <div className="plate-wrap">
                <div className="plate shotplate">
                  <SiteImage
                    src="/images/home/a-regulation-coverage-detail-in-carestream-showing-what-to-add-and-where-9e5e40ea.jpg"
                    alt="A regulation coverage detail in CareStream, showing what to add and where" />
                </div>
              </div>
              <div>
                {/* <details> rather than a JS accordion: it opens with no JavaScript, and the
                    first one is open exactly as the design has it. */}
                <div className="acc">
                  {accordion.map((a, i) => (
                    <details className="acc-item" open={i === 0} key={a.title}>
                      <summary className="acc-head">{a.title}</summary>
                      <div className="acc-body">{a.body}</div>
                    </details>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="band">
          <div className="wrap">
            <div className="split rev">
              <div>
                <p className="eyebrow">{s('hubband.eyebrow')}</p>
                <h2>{s('hubband.h2')}</h2>
                <p className="lede">{s('hubband.lede')}</p>
                <div className="btnrow">
                  <Link className="pill pill-solid" href="/staff-hub">{s('hubband.cta1')}</Link>
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
          <div className="wrap">
            <p className="eyebrow">{s('showcase.eyebrow')}</p>
            <h2>{s('showcase.h2')}</h2>
          </div>
          <HomeShowcase slides={SHOWCASE} />
        </section>

        <section className="band">
          <div className="wrap split">
            <div>
              <p className="eyebrow">{s('story.eyebrow')}</p>
              <p className="quote">{s('story.quote')}</p>
              <p className="cite">{s('story.cite')}</p>
            </div>
            <div className="plate-wrap">
              <div className="plate tall">
                <SiteImage src="/images/index/19.webp"
                           alt="A registered manager at their desk, using CareStream" />
              </div>
            </div>
          </div>
        </section>

        <div className="wrap cta">
          <h2>{s('cta.h2')}</h2>
          <p className="lede">{s('cta.lede')}</p>
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
