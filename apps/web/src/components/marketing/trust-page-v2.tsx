import Link from 'next/link'
import { TRUST_ICONS } from '@/lib/trust-icons'
import { Shapes } from './setting-page-v2'
import './trust-page-v2.css'

// The rebuilt /trust page.
//
// All the copy is in TRUST_V2_SLOTS, generated from the theme with a completeness assertion
// (0 uncaptured). A page that makes seven promises about data handling is the last place to
// quietly drop one, so the generator proves nothing was dropped rather than asserting it.
//
// The nine section icons are shapes in lib/trust-icons.ts: an icon is not copy.

export interface Copy { (key: string): string }

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const Doc = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
)

function Ic({ n }: { n: number }) {
  return (
    <span className="ic">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <Shapes shapes={TRUST_ICONS[n] ?? []} />
      </svg>
    </span>
  )
}

// The theme points these at /trust/privacy, /trust/dpa and so on. The live site has served
// them at /privacy, /dpa, /terms and /cookies for as long as they have existed, and swapping a
// template does not change a URL, so the hrefs are mapped here rather than adopted.
const DOC_HREFS = ['/privacy', '/dpa', '/terms', '/cookies', '/rag',
                   '/client-services-agreement']

export function TrustPageV2({ s }: { s: Copy }) {
  return (
    <div className="trpage-v2">
      <section className="thero">
        <div className="twrap thero-in">
          <span className="teyebrow">{s('hero.label')}</span>
          <h1>{s('hero.h1')}</h1>
          <p>{s('hero.lede')}</p>
        </div>
      </section>

      <section className="tsec">
        <div className="twrap">
          <p className="tlabel">{s('cite.label')}</p>
          <h2>{s('cite.h2')}</h2>
          <p className="lede">{s('cite.lede')}</p>

          <div className="tcite">
            <div className="tpoints">
              {[1, 2, 3, 4].map(n => (
                <div className="tpoint" key={n}>
                  <span className="tick"><Tick /></span>
                  <div>
                    <b>{s(`cite.p${n}.title`)}</b>
                    <p>{s(`cite.p${n}.body`)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* A worked example rather than a screenshot, so its words are copy like any
                other and come from the slot set. */}
            <div className="tphone">
              <div className="tphead">
                <span className="av">CS</span>
                <span><b>{s('phone.home')}</b><em>{s('phone.tenant')}</em></span>
                <span className="on"><i />{s('phone.status')}</span>
              </div>
              <div className="tpbody">
                <div className="tmsg out">{s('phone.question')}</div>
                <div className="tmsg in">
                  {s('phone.answer')}
                  <ol>
                    {[1, 2, 3].map(n => s(`phone.step${n}`)).filter(Boolean)
                      .map(x => <li key={x}>{x}</li>)}
                  </ol>
                  <span className="tsrc"><Doc />{s('phone.source')}</span>
                </div>
              </div>
              <div className="tpfoot">
                <span className="ask">{s('phone.ask')}</span>
                <span className="pill">{s('phone.pill')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The theme tints this one with an inline background rather than a modifier. */}
      <section className="tsec" style={{ background: 'var(--ground-2)' }}>
        <div className="twrap">
          <p className="tlabel">{s('aud.label')}</p>
          <h2>{s('aud.h2')}</h2>
          <p className="lede">{s('aud.lede')}</p>
          <div className="taud">
            {[1, 2, 3].map(n => (
              <div className="taudc" key={n}>
                <Ic n={n - 1} />
                <h3>{s(`aud.c${n}.title`)}</h3>
                <p>{s(`aud.c${n}.body`)}</p>
              </div>
            ))}
          </div>
          <div className="tbtns" style={{ justifyContent: 'flex-start', marginTop: 28 }}>
            <Link className="tbtn s" href="/rag">{s('aud.link')}</Link>
          </div>
        </div>
      </section>

      <section className="tsec">
        <div className="twrap">
          <p className="tlabel">{s('prom.label')}</p>
          <h2>{s('prom.h2')}</h2>
          <p className="lede">{s('prom.lede')}</p>
          <div className="tprom">
            {[1, 2, 3, 4, 5, 6, 7].map(n => (
              <div className="tpromc" key={n}>
                <span className="n">{s(`prom.p${n}.n`)}</span>
                <b>{s(`prom.p${n}.title`)}</b>
                <p>{s(`prom.p${n}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tsec" style={{ background: 'var(--ground-2)' }}>
        <div className="twrap">
          <p className="tlabel">{s('faq.label')}</p>
          <h2>{s('faq.h2')}</h2>
          <div className="tfaq">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <details key={n} open={n === 1}>
                <summary>{s(`faq.q${n}.q`)}</summary>
                <p className="ans">{s(`faq.q${n}.a`)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="tsec">
        <div className="twrap">
          <p className="tlabel">{s('docs.label')}</p>
          <h2>{s('docs.h2')}</h2>
          <p className="lede">{s('docs.lede')}</p>
          <div className="tdocs">
            {DOC_HREFS.map((href, i) => (
              <Link className="tdoc" href={href} key={href}>
                <Ic n={i + 3} />
                <b>{s(`docs.d${i + 1}.title`)}</b>
                <p>{s(`docs.d${i + 1}.body`)}</p>
                <span className="go">{s(`docs.d${i + 1}.go`)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="tcta">
        <div className="twrap">
          <h2>{s('cta.h2')}</h2>
          <p>{s('cta.lede')}</p>
          <div className="tbtns">
            <Link className="tbtn p" href="/contact">Talk to our team</Link>
            <Link className="tbtn s" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
