import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import type { FeatureV2Content, FeatureV2Faq } from './feature-page-v2'
import './feature-page-v2.css'

// /features/web-chat-interface, which the theme hand-built with its own wc* design rather than
// the shared feature layout.
//
// It reads the SAME feature_pages.content every other feature page reads. The bespoke part is
// the design, not the content model: its sections map onto whatItIs / outcomes / howItWorks /
// keyPoints / sidebar / whyItWorks exactly, so the copy lives where all the other feature copy
// lives and stays editable in the console.
//
// Its stylesheet is feature-page-v2.css, which already carries every wc* rule: the file is
// ported from three theme pages and this is one of them. Checked before writing this, 0 of its
// 31 classes were unstyled.

export interface WebChatPage {
  title: string
  content: FeatureV2Content & { stepImages?: string[] }
  faqs?: FeatureV2Faq[]
}

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
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

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const Dot = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 8v4.5l3 1.8" />
  </svg>
)

export function WebChatPageV2({ page }: { page: WebChatPage }) {
  const c = page.content
  const steps = c.howItWorks?.sections ?? []
  const shots = c.stepImages ?? []
  const faqs = (page.faqs ?? []).filter(f => f.question && f.answer)

  return (
    <div className="fpage-v2">
      <section className="wchero">
        <div className="wcwrap wchero-in">
          <div>
            {c.eyebrow && <span className="wceyebrow">{c.eyebrow}</span>}
            <h1>{page.title}</h1>
            {c.intro && <p className="lede">{c.intro}</p>}
            {!!c.chips?.length && (
              <div className="wcchips">
                {c.chips.map(x => <span className="wcchip" key={x}><Tick />{x}</span>)}
              </div>
            )}
            <div className="wcactions">
              <Link className="wcbtn solid" href="/register">Start free trial <Arrow /></Link>
              <Link className="wcbtn ghost" href="/demo">Book a demo</Link>
            </div>
          </div>
          {/* priority: the hero image is the largest thing above the fold, and SiteImage is
              lazy by default, which delays the one image the reader is waiting for. */}
          <div className="wcshot">
            <SiteImage src="/images/features/web-chat-interface/1.webp" alt={page.title}
                       priority />
          </div>
        </div>
      </section>

      {c.whatItIs?.heading && (
        <section className="wcsec">
          <div className="wcwrap wcwhat">
            <div>
              <span className="wclabel">What it is</span>
              <h2>{c.whatItIs.heading}</h2>
              {c.whatItIs.body && <p className="intro">{c.whatItIs.body}</p>}
            </div>
            {!!c.outcomes?.length && (
              <div>
                <span className="wclabel">What it means for your service</span>
                <ul className="wcout">
                  {c.outcomes.map(x => <li key={x}><Tick />{x}</li>)}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {steps.length > 0 && (
        <section className="wcsec tint">
          <div className="wcwrap">
            <span className="wclabel">A closer look</span>
            <h2>{c.howItWorks?.heading}</h2>
            {c.howItWorks?.intro && <p className="intro">{c.howItWorks.intro}</p>}
            {steps.map((st, i) => (
              // The theme alternates which side the screenshot sits on.
              <div className={`wcstep${i % 2 ? ' flip' : ''}`} key={st.heading}>
                <div>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{st.heading}</h3>
                  <p>{st.body}</p>
                </div>
                {shots[i] && (
                  <div className="wcshot"><SiteImage src={shots[i]} alt={st.heading} /></div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!!c.keyPoints?.length && (
        <section className="wcsec">
          <div className="wcwrap">
            <span className="wclabel">The essentials</span>
            <h2>The essentials, in one place.</h2>
            <ul className="wckeys">
              {c.keyPoints.map(x => <li key={x}><Tick />{x}</li>)}
            </ul>
            {!!c.sidebar?.length && (
              <div className="wcaside">
                {c.sidebar.map(t => (
                  <div key={t.title}>
                    <span className="ic"><Dot /></span>
                    <b>{t.title}</b><p>{t.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {!!c.whyItWorks?.tiles?.length && (
        <section className="wcsec tint">
          <div className="wcwrap">
            <span className="wclabel">Why it works</span>
            <h2>{c.whyItWorks.heading}</h2>
            {c.whyItWorks.intro && <p className="intro">{c.whyItWorks.intro}</p>}
            <div className="wctiles">
              {c.whyItWorks.tiles.map(t => (
                <div className="wctile" key={t.title}>
                  <span className="ic"><Dot /></span>
                  <b>{t.title}</b><p>{t.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="wcsec">
          <div className="wcwrap">
            <span className="wclabel">Questions</span>
            <h2>Frequently asked questions.</h2>
            <div className="wcfaq">
              {faqs.map(f => (
                <details key={f.question}>
                  <summary>{f.question}<Chevron /></summary>
                  <div className="ans"><p>{f.answer}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="wccta">
        <div className="wcwrap wccta-in">
          <div>
            <h2>{c.cta?.heading}</h2>
            {c.cta?.sub && <p>{c.cta.sub}</p>}
          </div>
          <div className="btns">
            <Link className="wcbtn solid" href="/register">Start free trial <Arrow /></Link>
            <Link className="wcbtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
