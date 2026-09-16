import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { WHO_ITS_FOR } from '@/lib/who-its-for-data'
import { WhoItsForPills } from './who-its-for-pills'
import { TrainingDemo, type TrainingDemoData } from './training-demo'
import './who-its-for-v2.css'

// The rebuilt /who-its-for page.
//
// Its twenty-two setting panels run to a hundred and forty paragraphs, so they are NOT slots
// and NOT retyped: they are generated from the theme into src/lib/who-its-for-data.ts by
// gen_who_its_for.py, which asserts that every paragraph on the theme page ends up somewhere
// in the object. Only the page's own prose is editable, through WHO_ITS_FOR_V2_SLOTS.
//
// Note the twenty-two. This page covers the fuller list of registered settings; SETTINGS_LIST
// holds the eleven that have pages of their own. The two are deliberately different.
//
// Every panel is in the document. The pills jump and track position, they do not filter, so a
// crawler sees all twenty-two.

export interface Copy { (key: string): string }

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
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

/** The source list uses a document mark rather than a tick: these are where the answer came
 *  from, not things the answer confirms. */
const Doc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2.5H6.5A1.5 1.5 0 0 0 5 4v16a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 20V7.5z" />
    <path d="M14 2.5V7.5H19" />
    <path d="M8.5 12.5h7M8.5 16.5h4.5" />
  </svg>
)

const Node = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v5M12 15v5M4 12h5M15 12h5" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
)

export interface TrainingBlock {
  demo: TrainingDemoData | null
  moduleCount: number
  categories: { label: string; count: number }[]
  modules: string[]
  demoSlug: string
}

export function WhoItsForV2({ s, training }: { s: Copy; training: TrainingBlock }) {
  const { panels, cards, roles, note } = WHO_ITS_FOR

  return (
    <div className="wfpage-v2">
      <section className="wfhero">
        <div className="svwrap wfhero-in">
          <div>
            <span className="uc-eyebrow">{s('hero.label')}</span>
            <h1>{s('hero.h1')}</h1>
            <p>{s('hero.lede')}</p>
            <div className="svactions">
              <Link className="svbtn solid" href="/register">Start free trial</Link>
              <Link className="svbtn ghost" href="/demo"><Play /> Book a demo</Link>
            </div>
          </div>
          {/* priority: the hero image is the largest thing above the fold, and SiteImage is
              lazy by default, which delays the one image the reader is waiting for. */}
          <div className="wfheroshot">
            <SiteImage src="/images/who-its-for/1.webp" alt="Sits alongside the headline"
                       priority />
          </div>
        </div>
      </section>

      <section className="wfsec" id="settings">
        <div className="svwrap svsec-in">
          <span className="svlabel">{s('settings.label')}</span>
          <h2>{s('settings.h2')}</h2>
          <p>{s('settings.lede')}</p>

          <WhoItsForPills panels={panels} />

          <div className="wfpanels">
            {panels.map(p => (
              <article className="wfpanel" id={p.id} data-setting={p.id} key={p.id}>
                <header className="wfhead">
                  <span className="wfnum">{p.num}</span>
                  <h3>{p.title}</h3>
                  <p className="wftag">{p.tag}</p>
                </header>

                <div className="wfsplit">
                  <div>
                    <p className="wfdesc">{p.desc}</p>
                    <ul className="wfpoints">
                      {p.points.map(x => <li key={x}><Tick /><span>{x}</span></li>)}
                    </ul>

                    <p className="wfsub">{p.topicsLabel}</p>
                    <ul className="wftopics">
                      {p.topics.map(x => <li key={x}>{x}</li>)}
                    </ul>
                  </div>

                  <div className="wfex">
                    <div className="wfex-h">
                      <span className="wfch">{p.exBadge}</span>
                      <span>{p.exLabel}</span>
                    </div>
                    <p className="wfq">{p.question}</p>
                    <div className="wfex-b">
                      <p className="wfex-l">{p.sourcesLabel}</p>
                      <ul className="wfsrc">
                        {p.sources.map(x => <li key={x}><Doc />{x}</li>)}
                      </ul>
                      <p className="wfex-l">{p.coversLabel}</p>
                      <ul className="wfans">
                        {p.covers.map(x => <li key={x}><Tick />{x}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="wfstd">
                  <p className="wfsub">{p.mapsLabel}</p>
                  <ul>
                    {p.maps.map(m => (
                      <li key={m.ref}><b>{m.ref}</b><p>{m.body}</p></li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wfsec tint">
        <div className="svwrap svsec-in">
          <span className="svlabel">{s('shared.label')}</span>
          <h2>{s('shared.h2')}</h2>
          <div className="wfcards">
            {cards.map(c => (
              <div className="wfcard" key={c.title}>
                <span className="ic"><Node /></span><b>{c.title}</b><p>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="wfsec" id="roles">
        <div className="svwrap svsec-in">
          <span className="svlabel">{s('roles.label')}</span>
          <h2>{s('roles.h2')}</h2>
          <div className="wfsplit wide">
            <div className="wfroles">
              {roles.map(r => (
                <div className="wfrole" key={r.role}>
                  <span className="wfbadge">{r.role}</span>
                  <b>{r.body}</b>
                  <ul>
                    {r.points.map(x => <li key={x}><Tick /><span>{x}</span></li>)}
                  </ul>
                </div>
              ))}
            </div>
            <div className="wfshot">
              <SiteImage src="/images/who-its-for/2.webp" alt="By role" />
            </div>
          </div>
        </div>
      </section>

      {/* Kept from the current page, restyled: the theme has no block for it, but a live
          lesson and the real module library are worth more here than a screenshot would be. */}
      <section className="wfsec tint" id="training-managers">
        <div className="svwrap svsec-in">
          <span className="svlabel">{s('training.label')}</span>
          <h2>{s('training.h2')}</h2>
          <p>{s('training.lede')}</p>
          {training.demo && (
            <>
              <TrainingDemo demo={training.demo} buyHref={`/buy/${training.demoSlug}`}
                            variant="theme" />
              <p className="wftag">{s('training.try')}</p>
            </>
          )}
          <div className="wfstd">
            <p className="wfsub">
              The training library: {training.moduleCount} ready-built modules
            </p>
            <ul className="wftopics">
              {training.categories.map(c => (
                <li key={c.label}>{c.label}{c.count ? ` · ${c.count}` : ''}</li>
              ))}
            </ul>
            <ul className="wfpoints">
              {training.modules.map(m => <li key={m}><Tick /><span>{m}</span></li>)}
            </ul>
          </div>
          <div className="svactions">
            <Link className="svbtn ghost" href="/staff-training">See the full training library</Link>
          </div>
        </div>
      </section>

      <section className="wfsec tint">
        <div className="svwrap svsec-in svnarrow">
          <div className="svnote">
            <b>{note.title}</b>
            {note.paras.map(x => <p key={x}>{x}</p>)}
          </div>
        </div>
      </section>

      <section className="svend">
        <div className="svwrap svend-in">
          <h2>{s('end.h2')}</h2>
          <p>{s('end.lede')}</p>
          <div className="row">
            <Link className="svbtn solid" href="/register">Start free trial</Link>
            <Link className="svbtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
