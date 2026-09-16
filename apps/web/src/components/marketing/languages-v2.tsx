import Link from 'next/link'
import { COURSE_LANGUAGES } from '@/lib/languages'
import './languages-v2.css'

// The rebuilt /languages page.
//
// The sixty-nine languages are read from COURSE_LANGUAGES, the app's own list, NOT copied out
// of the theme. Checked first: the theme's list is that array in the same order, which is what
// it was built from. It is also the source for the training pages' Course schema, so a second
// copy here would drift from the schema the first time either was edited.
//
// Scoped `lngpage-v2`, not `lgpage-v2`: the legal pages already own that scope, and the two
// themes both use `lghero`, `lghero-in` and `lgwrap` to mean different things.

export interface Copy { (key: string): string }

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
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

/** The three card icons: a speech bubble, a globe and a document. */
const CARD_ICONS = [
  ['M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z'],
  ['M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18'],
  ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z', 'M14 3v5h5M9 13h6M9 17h4'],
]

function CardIcon({ n }: { n: number }) {
  return (
    <span className="ic">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {n === 1 && <circle cx="12" cy="12" r="9" />}
        {CARD_ICONS[n].map(d => <path d={d} key={d} />)}
      </svg>
    </span>
  )
}

export function LanguagesV2({ s }: { s: Copy }) {
  const count = COURSE_LANGUAGES.length

  return (
    <div className="lngpage-v2">
      <section className="lghero">
        <div className="lgwrap lghero-in">
          <span className="lgeyebrow">{s('hero.label')}</span>
          <h1>{s('hero.h1')}</h1>
          <p>{s('hero.lede')}</p>
        </div>
      </section>

      <section className="lgsec">
        <div className="lgwrap">
          <div className="lgmid">
            <span className="lglabel">{s('how.label')}</span>
            <h2>{s('how.h2')}</h2>
          </div>
          <div className="lgcards">
            {[1, 2, 3].map(n => (
              <div className="lgcard" key={n}>
                <CardIcon n={n - 1} />
                <h3>{s(`how.c${n}.title`)}</h3>
                <p>{s(`how.c${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lgsec tint">
        <div className="lgwrap">
          <span className="lglabel">{s('list.label')}</span>
          <h2>{s('list.h2').replace('{count}', String(count))}</h2>
          <p className="intro">{s('list.intro')}</p>
          <ul className="lglist">
            {COURSE_LANGUAGES.map(l => <li key={l.code}><Tick />{l.name}</li>)}
          </ul>
          <p className="lgnote">
            {s('list.note.before')}{' '}
            <Link href="/contact">{s('list.note.link')}</Link>{' '}
            {s('list.note.after')}
          </p>
        </div>
      </section>

      <section className="lgcta">
        <div className="lgwrap lgcta-in">
          <div>
            <h2>{s('cta.h2')}</h2>
            <p>{s('cta.lede')}</p>
          </div>
          <div className="btns">
            <Link className="solid" href="/staff-training">Browse training <Arrow /></Link>
            <Link className="ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
