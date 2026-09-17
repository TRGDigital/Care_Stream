import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { TRAINING_PLATFORM_ICONS } from '@/lib/training-platform-icons'
import { Shapes } from './setting-page-v2'
import './training-platform-v2.css'

// The rebuilt /training-platform page.
//
// Four split sections of three items, a three-step block and a closing CTA. All the copy is in
// TRAINING_PLATFORM_V2_SLOTS so it stays editable in the console; the twelve list icons are
// not copy and live in lib/training-platform-icons.ts as shapes.
//
// The sections alternate tint and flip in the theme. That order is structural, so it is here
// rather than in the slot set: a section is not moved by editing its words.

export interface Copy { (key: string): string }

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

/** key, image, alt, and whether the section is tinted and its split flipped. */
const SECTIONS: { key: string; img: string; tint: boolean; flip: boolean }[] = [
  { key: 'adhoc', img: '2', tint: false, flip: false },
  { key: 'f2f', img: '3', tint: true, flip: true },
  { key: 'reporting', img: '4', tint: false, flip: false },
  { key: 'matrix', img: '5', tint: false, flip: true },
]

// Sections have three items; a section may add up to three more in its copy.
function Items({ s, k, from }: { s: Copy; k: string; from: number }) {
  return (
    <ul className="tpitems">
      {[1, 2, 3, 4, 5, 6].map(n => {
        const title = s(`${k}.i${n}.title`)
        if (!title) return null
        return (
          <li key={n}>
            <span className="ic">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <Shapes shapes={(n <= 3 ? TRAINING_PLATFORM_ICONS[from + n - 1] : TRAINING_PLATFORM_ICONS[from + ((n - 1) % 3)]) ?? []} />
              </svg>
            </span>
            <span><b>{title}</b><p>{s(`${k}.i${n}.body`)}</p></span>
          </li>
        )
      })}
    </ul>
  )
}

export function TrainingPlatformV2({ s }: { s: Copy }) {
  return (
    <div className="tppage-v2">
      <section className="tphero">
        <div className="tpwrap tphero-in">
          <div>
            <span className="tpeyebrow">{s('hero.label')}</span>
            <h1>{s('hero.h1')}</h1>
            <p className="lede">{s('hero.lede')}</p>
            <div className="tpactions">
              <Link className="tpbtn solid" href="/staff-training">
                Browse the courses <Arrow />
              </Link>
              <Link className="tpbtn ghost" href="/demo">Book a demo</Link>
            </div>
          </div>
          {/* priority: the hero image is the largest thing above the fold, and SiteImage is
              lazy by default, which delays the one image the reader is waiting for. */}
          <div className="tpshot">
            <SiteImage src="/images/training-platform/1.webp" alt="Training platform" priority />
          </div>
        </div>
      </section>

      {SECTIONS.slice(0, 3).map((sec, i) => (
        <section className={`tpsec${sec.tint ? ' tint' : ''}`} key={sec.key}>
          <div className="tpwrap">
            <div className={`tpsplit${sec.flip ? ' flip' : ''}`}>
              <div>
                <span className="tplabel">{s(`${sec.key}.label`)}</span>
                <h2>{s(`${sec.key}.h2`)}</h2>
                <p className="intro">{s(`${sec.key}.intro`)}</p>
                <Items s={s} k={sec.key} from={i * 3} />
              </div>
              <div className="tpshot">
                <SiteImage src={`/images/training-platform/${sec.img}.webp`}
                           alt={s(`${sec.key}.label`)} />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="tpsec tint">
        <div className="tpwrap">
          <span className="tplabel">{s('steps.label')}</span>
          <h2>{s('steps.h2')}</h2>
          <p className="intro">{s('steps.intro')}</p>
          <div className="tpsteps">
            {[1, 2, 3].map(n => (
              <div className="tpstep" key={n}>
                <span className="n">{s(`steps.s${n}.n`)}</span>
                <b>{s(`steps.s${n}.title`)}</b>
                <p>{s(`steps.s${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {SECTIONS.slice(3).map(sec => (
        <section className={`tpsec${sec.tint ? ' tint' : ''}`} key={sec.key}>
          <div className="tpwrap">
            <div className={`tpsplit${sec.flip ? ' flip' : ''}`}>
              <div>
                <span className="tplabel">{s(`${sec.key}.label`)}</span>
                <h2>{s(`${sec.key}.h2`)}</h2>
                <p className="intro">{s(`${sec.key}.intro`)}</p>
                <Items s={s} k={sec.key} from={9} />
              </div>
              <div className="tpshot">
                <SiteImage src={`/images/training-platform/${sec.img}.webp`}
                           alt={s(`${sec.key}.label`)} />
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="tpcta">
        <div className="tpwrap tpcta-in">
          <div>
            <h2>{s('cta.h2')}</h2>
            <p>{s('cta.lede')}</p>
          </div>
          <div className="btns">
            <Link className="solid" href="/register">Start free trial <Arrow /></Link>
            <Link className="ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
