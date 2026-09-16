import { SiteImage } from '@/components/site-image'
import { DemoForm } from './demo-form'
import './demo-page-v2.css'

// The rebuilt /demo page.
//
// No new slot set: the theme's copy and the live page's DEMO_SLOTS defaults are the same words,
// so this reads the slots that already exist. The one difference was an em dash in the trial
// paragraph, which the theme's wording drops and the default now matches.
//
// The form is the SAME DemoForm as the current page, in `variant="theme"`. It keeps the real
// lead POST and the WebMCP agent tool; only the markup differs. A second form component would
// have been a second place for the lead payload to drift out of step with the API.

export interface Copy { (key: string): string }

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

export function DemoPageV2({ s }: { s: Copy }) {
  return (
    <div className="dmpage-v2">
      <section className="dmhero">
        <div className="dmwrap dmhero-in">
          <div className="dmherocopy">
            <span className="dmeyebrow">{s('hero.label')}</span>
            <h1>{s('hero.title')}</h1>
            <p>{s('hero.subtitle')}</p>
          </div>
          {/* priority: the hero image is the largest thing above the fold, and SiteImage is
              lazy by default, which delays the one image the reader is waiting for. */}
          <div className="dmshot">
            <SiteImage src="/images/demo/1.webp" alt="Book a demo" priority />
          </div>
        </div>
      </section>

      <section className="dmmain">
        <div className="dmwrap dmgrid">
          <div>
            <h2>{s('expect.h2')}</h2>
            <div className="dmsteps">
              {[1, 2, 3, 4].map(n => (
                <div className="dmstep" key={n}>
                  <span className="n">{String(n).padStart(2, '0')}</span>
                  <div>
                    <b>{s(`expect.step${n}.title`)}</b>
                    <p>{s(`expect.step${n}.body`)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="dmtrial">
              <b>{s('trial.title')}</b>
              <p>{s('trial.body')}</p>
              <div className="dmchips">
                {[1, 2, 3].map(n => s(`trial.chip${n}`)).filter(Boolean).map(c => (
                  <span key={c}><Tick />{c}</span>
                ))}
              </div>
            </div>
          </div>

          <DemoForm variant="theme" formHeading={s('form.h3')} note={s('form.note')} />
        </div>
      </section>
    </div>
  )
}
