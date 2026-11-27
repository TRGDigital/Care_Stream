import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLd } from '@/components/json-ld'
import { PageBreadcrumbJsonLd } from '@/components/page-breadcrumb-json-ld'
import { faqPageSchema, SITE_URL } from '@/lib/schema'
import { CQC_WELL_LED_URL, STATEMENTS, PRODUCTS, HUB_PATH } from '@/lib/well-led'
import '@/components/marketing/user-case-page.css'
import '@/components/marketing/scenario-page.css'

// The Well-led overview. Same template as the scenario and statement pages. Wording rule: evidence FOR Well-led. Never "CQC compliant", never a promise about a rating. No dashes in the copy.

const TITLE = 'CQC Well-led: What Inspectors Look For | CareStreamAI'
const DESC  = 'CQC Well-led explained: the quality statements, what inspectors look for, and the evidence a care provider can show. See how CareStream helps.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: `${SITE_URL}/cqc-well-led` },
  openGraph: { type: 'website', title: TITLE, description: DESC, url: `${SITE_URL}/cqc-well-led`, images: ['/og-image.png'] },
}

const FAQS = [
  { q: 'What is Well-led in a CQC inspection?', a: 'Well-led is one of CQC\'s five key questions, alongside safe, effective, caring and responsive. It looks at leadership, culture and how a service learns and improves. CQC describes it as an inclusive and positive culture of continuous learning and improvement, shared by leaders and staff.' },
  { q: 'What are the Well-led quality statements?', a: 'Under CQC\'s single assessment framework, Well-led is assessed through quality statements. This guide covers four where CareStream helps most: Shared direction and culture, Workforce equality, diversity and inclusion, Governance, management and sustainability, and Learning, improvement and innovation. CQC publishes the full set on its website.' },
  { q: 'What evidence do inspectors look for?', a: 'Inspectors look for evidence that leaders know what is happening in the service and act on it: records, dates, named people and outcomes. Policies with owners, training records, audit results and the actions that followed are typical examples.' },
  { q: 'Can software give us a CQC rating?', a: 'No. Only CQC rates a service, and the judgement is always the inspector\'s. CareStream helps you keep and show the evidence. It does not predict or promise a rating.' },
  { q: 'How do we show learning from audits?', a: 'Keep the audit result, the action, who owned it, the follow up and the re-check, so you can show what changed and whether it worked. A trail over several months is stronger than a single audit.' },
  { q: 'What happened to the key lines of enquiry (KLOEs)?', a: 'The older key lines of enquiry have been replaced by quality statements under CQC\'s single assessment framework. If you worked to KLOEs before, the Well-led evidence you already keep is still useful. It is now organised under the quality statements.' },
]

const RELATED = [
  { href: '/scenarios/cqc-inspection-evidence-report-what-it-contains', label: 'What the CQC inspection evidence report contains' },
  { href: '/scenarios/audit-finding-to-action-to-recheck', label: 'From audit finding to action to re-check' },
  { href: '/scenarios/policy-wording-does-not-match-cqc-language', label: 'When policy wording does not match CQC language' },
  { href: '/scenarios/staff-whose-first-language-is-not-english', label: 'Staff whose first language is not English' },
]

const Play = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>)
const Plus = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>)
const Arrow = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13M12 5.5 18.5 12 12 18.5" /></svg>)
const Tick = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>)
const TickMark = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>)

export default function CqcWellLedPage() {
  return (
    <>
      <PageBreadcrumbJsonLd trail={[{ name: 'CQC Well-led', path: '/cqc-well-led' }]} />
      <JsonLd data={faqPageSchema(FAQS.map(f => ({ question: f.q, answer: f.a })))} />
      <div className="ucpage scn">
        <section className="uc-hero">
          <div className="uc-wrap uc-hero-in">
            <div>
              <span className="uc-eyebrow">CQC Well-led</span>
              <h1>CQC Well-led: what inspectors look for and the <em>evidence you need</em></h1>
              <p className="uc-lede">
                Well-led is the CQC key question about leadership, culture and how a service learns and improves. CQC describes it as an inclusive and positive culture of continuous
                learning and improvement, shared by leaders and staff. This guide sets out what that asks of a provider, and how CareStream helps you show the evidence.
                Read <a href={CQC_WELL_LED_URL} target="_blank" rel="noopener noreferrer">CQC&apos;s Well-led guidance</a>.
              </p>
              <div className="uc-actions">
                <form className="uc-field" action="/register" method="get">
                  <input type="email" name="email" required placeholder="name@yourcarehome.co.uk" aria-label="Work email" />
                  <button type="submit">Start free trial</button>
                </form>
                <Link className="uc-demo" href="/demo"><Play /> Book a demo</Link>
              </div>
              <p className="uc-fine">14 day free trial · Set up in a day · UK data residency</p>
            </div>
            <div className="uc-panel" role="img" aria-label="Illustration of Well-led evidence">
              <div className="uc-panel-hd"><b>Well-led evidence</b><span className="uc-pill">Illustration</span></div>
              {STATEMENTS.map((s, i) => (
                <div className="uc-row" key={s.anchor}>
                  <span className={`uc-tick${i < 3 ? '' : ' pending'}`}><TickMark /></span>
                  <span>{s.short}</span><small>{s.heroSub}</small>
                </div>
              ))}
              <div className="uc-meter"><i style={{ width: '75%' }} /></div>
            </div>
          </div>
        </section>

        <section className="uc-sec">
          <div className="uc-wrap uc-narrow">
            <div className="uc-head"><span className="uc-eyebrow">What it means</span><h2>What CQC means by Well-led</h2></div>
            <p className="uc-intro">
              Safe, effective, caring and responsive are mostly judged on the care people receive. Well-led is judged on how the service is run: whether leaders know what is happening,
              whether staff understand their roles, and whether the service learns and improves. It is where a provider&apos;s own systems are tested.
            </p>
            <p className="uc-intro">
              Inspectors look for evidence, not intentions. Under CQC&apos;s single assessment framework, Well-led is assessed through quality statements. Below are four where CareStream helps most.
              Each has its own page with what inspectors look for, the evidence you can show, and the CareStream products that build it.
            </p>
          </div>
        </section>

        <section className="uc-sec tint">
          <div className="uc-wrap">
            <div className="uc-head"><span className="uc-eyebrow">The four statements</span><h2>Where CareStream helps with Well-led</h2><p className="sub">Choose a statement to see the evidence.</p></div>
            <div className="uc-cards">
              {STATEMENTS.map(s => (
                <Link className="uc-card" href={`${HUB_PATH}/${s.anchor}`} key={s.anchor} style={{ textDecoration: 'none' }}>
                  <h3>{s.cqcName}</h3>
                  <p>{s.cardLine}</p>
                  <ul className="uc-bullets" style={{ marginBottom: 14 }}>
                    {s.cardProducts.map(id => <li key={id}><Tick /><span>{PRODUCTS[id].name}</span></li>)}
                  </ul>
                  <span className="uc-more">See the evidence <Arrow /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="uc-sec">
          <div className="uc-wrap uc-narrow">
            <div className="uc-head"><span className="uc-eyebrow">Evidence, not a rating</span><h2>What CareStream does and does not do</h2></div>
            <p className="uc-intro">
              CareStream helps you keep and show the evidence inspectors ask for. It does not give a CQC rating, it is not endorsed by CQC, and the judgement is always the inspector&apos;s.
              Some products, such as the policy approval trail, the inspection evidence report and training in other languages, are on paid plans. See <Link href="/pricing">pricing</Link> for what each plan includes.
            </p>
          </div>
        </section>

        <section className="uc-sec tint">
          <div className="uc-wrap uc-narrow">
            <div className="uc-head"><span className="uc-eyebrow">Questions</span><h2>CQC Well-led questions</h2></div>
            <div className="uc-faqgroup">
              {FAQS.map((f, j) => (
                <details className="uc-q" key={f.q} open={j === 0}>
                  <summary>{f.q}<Plus /></summary>
                  <div className="ans"><p>{f.a}</p></div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="uc-sec">
          <div className="uc-wrap">
            <div className="uc-head"><span className="uc-eyebrow">See it in practice</span><h2>Scenarios that show Well-led evidence</h2></div>
            <div className="uc-cta">
              {RELATED.map(r => (
                <Link className="uc-ctacard" href={r.href} key={r.href}><h3>{r.label}</h3><span className="uc-more">Read the scenario <Arrow /></span></Link>
              ))}
            </div>
          </div>
        </section>

        <section className="uc-sec">
          <div className="uc-wrap">
            <div className="uc-cta">
              <Link className="uc-ctacard" href="/register?tier=free&source=well-led-hub"><h3>Start your free trial</h3><p>Upload your policies and see what CareStream finds.</p><span className="uc-more">Start free trial <Arrow /></span></Link>
              <Link className="uc-ctacard" href="/demo"><h3>Book a demo</h3><p>See the evidence CareStream builds for CQC Well-led, using your own policies.</p><span className="uc-more">Book a demo <Arrow /></span></Link>
              <Link className="uc-ctacard" href="/cqc-compliance"><h3>CQC and compliance</h3><p>The readiness report, regulation coverage and inspection evidence.</p><span className="uc-more">See CQC tools <Arrow /></span></Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
