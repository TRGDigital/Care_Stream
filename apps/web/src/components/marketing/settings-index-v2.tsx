import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { SETTINGS_LIST } from '@/lib/settings/list'
import './settings-index-v2.css'

// The rebuilt /who-we-serve page: the index of the eleven care settings.
//
// The eleven cards are read from SETTINGS_LIST, the app's own registry, NOT copied out of the
// theme. Checked first: the theme's card titles and descriptions are byte-identical to the
// `label` and `navDescription` already in each setting config. Copying them would have created
// a second list that drifts from the pages it links to the first time one is edited.

export interface Copy { (key: string): string }

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const STATS: [string, string][] = [
  ['11', 'Regulated settings'],
  ['60+', 'Languages, same answer'],
  ['24/7', 'Access on every shift'],
]

const SAME: [string, string][] = [
  ['Your policies, not ours',
   'Every answer is drawn from the documents you have approved, and cites the policy and '
   + 'section it came from.'],
  ['Any language, on any phone',
   'Staff ask in their first language and read the answer in it. Your records stay in English.'],
  ['Evidence that builds itself',
   'Training records, audits and query logs accumulate as your team works, rather than the '
   + 'week before an inspection.'],
  ['One library behind all of it',
   'Change a policy once and the training, the answers and the evidence all move with it.'],
]

export function SettingsIndexV2({ s }: { s: Copy }) {
  return (
    <div className="wwpage-v2">
      <section className="wwhero">
        <div className="wwrap wwhero-in">
          <div>
            <span className="wweyebrow">{s('hero.label')}</span>
            <h1>{s('hero.h1')}</h1>
            <p>{s('hero.lede')}</p>
            <div className="wwstats">
              {STATS.map(([fig, label]) => (
                <span className="wwstat" key={label}><b>{fig}</b><span>{label}</span></span>
              ))}
            </div>
          </div>
          <div className="wwshot">
            <SiteImage src="/images/who-we-serve/1.webp" alt="Who we serve" priority />
          </div>
        </div>
      </section>

      <section className="wwsec">
        <div className="wwrap">
          <p className="wwlabel">{s('list.label')}</p>
          <h2>{s('list.h2')}</h2>
          <p className="lede">{s('list.lede')}</p>
          <div className="wwgrid">
            {SETTINGS_LIST.map(x => (
              <Link className="wwcard" href={`/${x.slug}`} key={x.slug}>
                <span className="ic" />
                <h3>{x.label}</h3>
                <p>{x.description}</p>
                <span className="go">Learn more</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="wwsame">
        <div className="wwrap">
          <p className="wwlabel">{s('same.label')}</p>
          <h2>{s('same.h2')}</h2>
          <p className="lede">{s('same.lede')}</p>
          <div className="wwrow">
            {SAME.map(([title, body]) => (
              <div className="wwitem" key={title}>
                <span className="tick"><Tick /></span>
                <div><b>{title}</b><p>{body}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wwcta">
        <div className="wwrap">
          <h2>{s('cta.h2')}</h2>
          <p>{s('cta.lede')}</p>
          <div className="wwbtns">
            <Link className="wwbtn p" href="/demo">Book a demo</Link>
            <Link className="wwbtn s" href="/pricing">See pricing</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
