import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { claimSafe } from '@/lib/training-commerce'
import { TrainingDemo, type TrainingDemoData } from './training-demo'
import { TrainingLibraryTabs, type LibraryTopic } from './training-library-tabs'
import './staff-training-index-v2.css'

// The rebuilt /staff-training INDEX. The last page in the port.
//
// Not the module pages under it, which were ported with their family: this is the index, which
// the earlier route scan missed because its [slug] child was wired and the parent was not.
//
// Scoped `stpage-v2`. The theme's staff-training and trust pages both use thero, tsec and
// twrap, for different things, so a shared scope would have had /trust's styling land here.
//
// Copy is STAFF_TRAINING_V2_SLOTS, 166 slots generated with every shape counted against the
// theme. The 98-module library and the hero lesson are data, from the training API through the
// same TrainingLibraryTabs and TrainingDemo the current page uses, in their theme skins: the
// real cart, the real pricing and the real accreditation guard.

export interface Copy { (key: string): string }

export interface Catalogue {
  groups: Record<string, string>
  settings: Array<{ key: string; label: string }>
  topics: LibraryTopic[]
}


const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const Play = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 5.5v13l10-6.5z" />
  </svg>
)

const Dot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5l3 1.8" />
  </svg>
)

const Globe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" />
  </svg>
)

/** Reads `<base><n><suffix>` until one comes back empty. */
// A runaway guard, not a limit on content: see the same helper on /care-policies, where a cap
// of 14 dropped two of sixteen points.
function series(s: Copy, base: string, suffix = '', max = 60): number[] {
  const out: number[] = []
  for (let n = 1; n <= max; n++) {
    if (!s(`${base}${n}${suffix}`)) break
    out.push(n)
  }
  return out
}

function Head({ s, k }: { s: Copy; k: string }) {
  return (<><span className="tlabel">{s(`${k}.label`)}</span><h2>{s(`${k}.h2`)}</h2></>)
}

function Paras({ s, k }: { s: Copy; k: string }) {
  return <>{series(s, `${k}.p`).map(i => <p key={i}>{s(`${k}.p${i}`)}</p>)}</>
}

function Feats({ s, k }: { s: Copy; k: string }) {
  return (
    <div className="tfeat">
      {series(s, `${k}.f`, '.title').map(i => (
        <div key={i}>
          <span className="ic"><Dot /></span>
          <b>{s(`${k}.f${i}.title`)}</b><p>{s(`${k}.f${i}.body`)}</p>
        </div>
      ))}
    </div>
  )
}

/** A screenshot with its caption. `img` is the file number from port_staff_training_index_images.py. */
function Figure({ s, k, n, img }: { s: Copy; k: string; n: number; img: number }) {
  return (
    <figure className="tshot">
      <SiteImage src={`/images/staff-training-index/${img}.jpg`}
                 alt={claimSafe(s(`${k}.fig${n}.alt`))} />
      <figcaption>{claimSafe(s(`${k}.fig${n}.caption`))}</figcaption>
    </figure>
  )
}

function ShotCards({ s, k, from }: { s: Copy; k: string; from: number }) {
  return (
    <div className="tshotcards">
      {series(s, `${k}.sc`, '.title').map((i, idx) => (
        <div className="tshotcard" key={i}>
          <span className="frame">
            <SiteImage src={`/images/staff-training-index/${from + idx}.jpg`}
                       alt={claimSafe(s(`${k}.sc${i}.alt`))} />
          </span>
          <div className="cap"><b>{s(`${k}.sc${i}.title`)}</b><p>{s(`${k}.sc${i}.body`)}</p></div>
        </div>
      ))}
    </div>
  )
}

export function StaffTrainingIndexV2({ s, catalogue, demo }: {
  s: Copy
  catalogue: Catalogue
  demo: TrainingDemoData | null
}) {
  return (
    <div className="stpage-v2">
      <section className="thero">
        <div className="twrap thero-in">
          <div>
            <span className="uc-eyebrow">{s('hero.label')}</span>
            <h1>{s('hero.h1')}</h1>
            <ul className="tbullets">
              {series(s, 'hero.b').map(i => <li key={i}><Tick />{s(`hero.b${i}`)}</li>)}
            </ul>
            <div className="tactions">
              <a className="tbtn solid" href="#courses">Browse the courses</a>
              <Link className="tbtn ghost" href="/demo"><Play /> Book a demo</Link>
            </div>
          </div>
          {demo && <TrainingDemo demo={demo} buyHref="/buy/care-certificate" variant="theme" />}
        </div>
      </section>

      <section className="tsec">
        <div className="twrap tsec-in tnarrow">
          <Head s={s} k="s1" /><Paras s={s} k="s1" />
          <div className="tcompare">
            {[1, 2].map(i => (
              <div className={`tcol${i === 2 ? ' good' : ''}`} key={i}>
                {/* The two tints are per column and have no class in the stylesheet. */}
                <span className="ic" style={i === 1
                  ? { background: '#FBEAE7', color: '#A94331' }
                  : { background: '#E7F5EE', color: '#15764F' }}><Dot /></span>
                <b>{s(`s1.col${i}.title`)}</b><p>{s(`s1.col${i}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tsec tint">
        <div className="twrap tsec-in">
          <Head s={s} k="s2" /><Paras s={s} k="s2" />
          <div className="tsteps">
            {series(s, 's2.st', '.title').map(i => (
              <div className="tstep" key={i}>
                <span className="n">{i}</span>
                <b>{s(`s2.st${i}.title`)}</b><p>{s(`s2.st${i}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tcat" id="courses">
        <div className="twrap tcat-in">
          <Head s={s} k="s3" />
          <p>{s('s3.p1')}</p>
          <TrainingLibraryTabs variant="theme" groups={catalogue.groups}
            settings={catalogue.settings} topics={catalogue.topics}
            copy={{ search: s('s3.search'), all: s('s3.all'), note: s('s3.note'),
                    bulk: s('s3.bulk') }} />
        </div>
      </section>

      <section className="tsec tint">
        <div className="twrap tsec-in">
          <div className="tsplit">
            <div className="tsplit-copy"><Head s={s} k="s4" /><Paras s={s} k="s4" /></div>
            <Figure s={s} k="s4" n={1} img={2} />
          </div>
          <Feats s={s} k="s4" />
          <ShotCards s={s} k="s4" from={3} />
        </div>
      </section>

      <section className="tsec">
        <div className="twrap tsec-in">
          <div className="tsplit flip">
            <div className="tsplit-copy"><Head s={s} k="s5" /><Paras s={s} k="s5" /></div>
            <Figure s={s} k="s5" n={1} img={6} />
          </div>
          <Feats s={s} k="s5" />
        </div>
      </section>

      <section className="tsec tint">
        <div className="twrap tsec-in">
          <Head s={s} k="s6" /><Paras s={s} k="s6" />
          <ShotCards s={s} k="s6" from={7} />
        </div>
      </section>

      <section className="tsec">
        <div className="twrap tsec-in">
          <div className="tsplit">
            <div className="tsplit-copy">
              <Head s={s} k="s7" /><Paras s={s} k="s7" />
              <p className="tlabel" style={{ marginTop: 22 }}>{s('s7.sublabel')}</p>
              <ul className="tmatrix-list">
                {series(s, 's7.li').map(i => <li key={i}><Tick />{s(`s7.li${i}`)}</li>)}
              </ul>
            </div>
            <div className="tmatrix-shots">
              <Figure s={s} k="s7" n={1} img={10} />
              <Figure s={s} k="s7" n={2} img={11} />
            </div>
          </div>
        </div>
      </section>

      <section className="tsec tint">
        <div className="twrap tsec-in">
          <Head s={s} k="s8" />
          <div className="tdemo2">
            {[1, 2].map(c => (
              <div key={c}>
                <span className="ic"><Dot /></span>
                <h3>{s(`s8.c${c}.h3`)}</h3>
                {series(s, `s8.c${c}.p`).map(i => <p key={i}>{s(`s8.c${c}.p${i}`)}</p>)}
                <span className="lang"><Globe /> {s(`s8.c${c}.lang`)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tsec">
        <div className="twrap tsec-in tnarrow">
          <Head s={s} k="s9" />
          {series(s, 's9.p').map(i => (
            // The theme sets its first paragraph as a lead line.
            <p key={i} style={i === 1 ? { fontWeight: 600, color: 'var(--ink)' } : undefined}>
              {s(`s9.p${i}`)}
            </p>
          ))}
          <Feats s={s} k="s9" />
        </div>
      </section>

      <section className="tsec tint">
        <div className="twrap tsec-in">
          <Head s={s} k="s10" /><Paras s={s} k="s10" />
          <div className="tcards6">
            {series(s, 's10.card', '.title').map(i => (
              <div key={i}>
                <span className="n">{String(i).padStart(2, '0')}</span>
                <b>{s(`s10.card${i}.title`)}</b><p>{s(`s10.card${i}.body`)}</p>
              </div>
            ))}
          </div>
          <div className="tstats">
            {series(s, 's10.stat', '.fig').map(i => (
              <div className="tstat" key={i}>
                <span className="fig">{s(`s10.stat${i}.fig`)}</span>
                <b>{s(`s10.stat${i}.label`)}</b><p>{s(`s10.stat${i}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tsec">
        <div className="twrap tsec-in">
          <Head s={s} k="s11" /><Paras s={s} k="s11" />
          <div className="tevid">
            <table className="tev">
              <thead><tr><th>{s('s11.th1')}</th><th>{s('s11.th2')}</th></tr></thead>
              <tbody>
                {series(s, 's11.row', '.what').map(i => (
                  <tr key={i}><td>{s(`s11.row${i}.what`)}</td><td>{s(`s11.row${i}.shows`)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="tsec tint">
        <div className="twrap tsec-in">
          <Head s={s} k="s12" />
          <div className="tcards6">
            {series(s, 's12.card', '.title').map(i => (
              <div key={i}>
                <span className="n">{String(i).padStart(2, '0')}</span>
                <b>{s(`s12.card${i}.title`)}</b><p>{s(`s12.card${i}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tend">
        <div className="twrap tend-in">
          <h2>{s('end.h2')}</h2>
          <p>{s('end.p1')}</p>
          <div className="row">
            <Link className="tbtn solid" href="/register">Start free trial</Link>
            <Link className="tbtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
