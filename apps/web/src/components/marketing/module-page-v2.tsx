import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { TrainingDemo, type TrainingDemoData } from './training-demo'
import { careSetting } from '@/lib/care-setting'
import './module-page-v2.css'

// The rebuilt /staff-training/<slug> template. Renders the SAME module record and the same demo
// payload the current page renders.
//
// Measured before building: 40 of the 49 long paragraphs on a training page are identical across
// modules once the title is substituted, and all nine of the rest come from the training API
// (the module record and its demo endpoint). No content extraction, no seed, no re-import.
//
// careSetting() is applied to every generated string, exactly as the current page does it. The
// module content is written in a care-home voice and the public pages say "care setting"; the
// theme's own generator leaks one "our home" through, so the app's version is the one to keep.

export interface ModuleSectionData {
  heading: string
  body?: string | null
  image_url?: string | null
}

export interface TrainingModule {
  slug: string
  title: string
  group_label?: string | null
  frequency?: string | null
  requires_practical?: boolean
  duration_minutes?: number | null
  cpd_accredited?: boolean
  summary?: string | null
  outcomes?: string[]
  key_points?: string[]
  sections?: ModuleSectionData[]
  standards?: string[]
  illustration_url?: string | null
}

export interface RelatedModule {
  slug: string
  title: string
  summary?: string | null
  description?: string | null
  frequency?: string | null
  duration_minutes?: number | null
  requires_practical?: boolean
  illustration_url?: string | null
}

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const Star = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 3.6 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z" />
  </svg>
)

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const Plus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)

const Clock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.5l3.5 2" />
  </svg>
)

const Mark = () => <span className="ic"><Tick /></span>

const money = (p: number) => `£${(p / 100).toFixed(2)}`

const DELIVERY: [string, string][] = [
  ['Assigned, not scheduled',
   'Allocate a module to a person or a role. No room to book and no date to find.'],
  ['Completed on any device',
   'Staff work through it in the hub on a phone between tasks, or on a desktop in the office.'],
  ['Gaps closed automatically',
   'A wrong answer triggers a short follow-up lesson and a fresh question, so the gap is closed.'],
  ['Renewals handled',
   'Automatic reminders at 90, 30 and 7 days, with a live compliance dashboard.'],
]

const LANGUAGE_POINTS = [
  'One tap flips any lesson or question into their language, instantly.',
  'Over 60 languages, with no setup and no separate versions to manage.',
  'Completions and certificates stay in English for your CQC evidence.',
]

const INSIDE: [string, string][] = [
  ['References and further reading',
   'Every course is built on recognised UK guidance and cites its sources, from NICE and '
   + 'Skills for Care to the NHS and the legislation itself.'],
  ['Key points to remember',
   'Each module closes with the points that matter most, so the important things are the ones '
   + 'that stick.'],
  ['A certificate that is evidence',
   'Dated and named per person, filed against your training matrix and ready for inspection.'],
]

const LOOP: [string, string][] = [
  ['An immediate lesson, not a red cross',
   'A wrong answer immediately opens a short lesson explaining the point, so the gap is closed '
   + 'there and then.'],
  ['Targeted follow up question',
   'A fresh question on the same point checks the lesson has landed. The loop repeats until it '
   + 'has.'],
  ['Progress only when understood',
   'Staff move on to the next module and their certificate once they genuinely know the answer, '
   + 'not just after one lucky guess.'],
]

type Mark3 = 'yes' | 'no' | 'part'
const COMPARE: [string, Mark3, Mark3, Mark3][] = [
  ['Written for a CQC-registered service rather than a national standard', 'yes', 'part', 'no'],
  ['Interactive exercises after the lesson that teaches them, in every module', 'yes', 'part', 'yes'],
  ['Assessment in every module, with the key points to revisit', 'yes', 'yes', 'part'],
  ['Taken in any of sixty plus languages', 'yes', 'part', 'no'],
  ['A wrong answer triggers a follow-up lesson, not just a re-sit', 'yes', 'no', 'no'],
  ['Practical sign-off by a manager where the subject needs it', 'yes', 'no', 'yes'],
  ['Completion files itself into your training matrix and evidence pack', 'yes', 'part', 'no'],
  ['Bought one module at a time, with no annual contract', 'yes', 'no', 'part'],
]

function CompareMark({ mark }: { mark: Mark3 }) {
  if (mark === 'yes') {
    return <span className="cvyes"><Tick /></span>
  }
  if (mark === 'part') {
    return (
      <span className="cvpart">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
             strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
      </span>
    )
  }
  return (
    <span className="cvno">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
           strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </span>
  )
}

export function ModulePageV2({ module: m, demo, related, unitPence, apiUrl }: {
  module: TrainingModule
  demo: TrainingDemoData | null
  related: RelatedModule[]
  unitPence: number
  apiUrl: string
}) {
  const cs = careSetting
  const minutes = m.duration_minutes ?? 0
  const price = money(unitPence)
  const buyHref = `/buy/${m.slug}`
  const img = (u?: string | null) => (u ? `${apiUrl}${u}` : null)
  const hero = img(m.illustration_url)
  const lower = m.title.toLowerCase()
  const sections = m.sections ?? []

  return (
    <div className="mpage-v2">
      <section className="mhero">
        <div className="mwrap mhero-in">
          <div>
            <div className="mcrumb">
              <Link href="/staff-training">Staff training</Link>
              <span>/</span><span>{m.group_label}</span>
              <span className="tag">CQC aligned</span>
            </div>
            <h1>{m.title} training that gets your team CQC-ready</h1>
            <ul className="mbullets">
              <li><Tick />CQC-aligned, mapped to the Care Certificate framework</li>
              <li><Tick />Completed in the hub in over 60 languages</li>
              <li><Tick />A certificate for every staff member, for your CQC evidence</li>
              <li><Tick />A wrong answer triggers a follow-up lesson, so gaps are closed</li>
            </ul>

            <div className="mbuy">
              <div className="price"><b>{price}</b><span>per staff member, one off</span></div>
              <p className="sub">No subscription needed. Bulk discounts from 10+ licences.</p>
              {/* The theme has a basket here. There is no multi-module basket in the app, and
                  /buy/<slug> IS the purchase page (quantity, details, Stripe), so the action
                  goes there rather than into a collector with nowhere to check out. */}
              <div className="mrow">
                <Link className="add" href={buyHref}>Start course now</Link>
              </div>
            </div>

            <p className="mprice-line">
              From <b>{price} per staff member</b>, one-off. No subscription needed.
            </p>
            <div className="mcue"><span>Try it: a real lesson &amp; question</span><Arrow /></div>
            <p className="mstars">
              <span className="row"><Star /><Star /><Star /><Star /><Star /></span>
              {' '}Trusted by UK care providers
            </p>
          </div>

          {demo && <TrainingDemo demo={demo} buyHref={buyHref} variant="theme" />}
        </div>
      </section>

      <section className="msec">
        <div className="mwrap msec-in mnarrow">
          <span className="mlabel">What this training covers</span>
          <h2>A clear, practical grounding in {lower}.</h2>
          {m.summary && <p>{cs(m.summary)}</p>}
          {!!m.outcomes?.length && (
            <>
              <h2 style={{ fontSize: '1.2rem', marginTop: 30 }}>By the end, your staff will be able to:</h2>
              <ul className="mout">
                {m.outcomes.map((o, i) => <li key={i}><Tick />{cs(o)}</li>)}
              </ul>
            </>
          )}
        </div>
      </section>

      {sections.length > 0 && (
        <section className="msec tint">
          <div className="mwrap msec-in">
            <span className="mlabel">What your team will learn</span>
            <h2>A closer look at the {lower} module.</h2>
            <p>
              The module is built in short, practical sections. Each one teaches a part of the
              topic, then applies it to a real care scenario and checks understanding before
              moving on.
            </p>
            <div className="mparts">
              {sections.map((s, i) => (
                <div className="mpart" key={i}>
                  <div className="mpart-copy">
                    <span className="n">{String(i + 1).padStart(2, '0')}</span>
                    <h3>{s.heading}</h3>
                    {s.body && <p>{cs(s.body)}</p>}
                  </div>
                  {img(s.image_url) && (
                    <figure><SiteImage src={img(s.image_url)!} alt={s.heading} /></figure>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!!m.key_points?.length && (
        <section className="msec">
          <div className="mwrap msec-in mnarrow">
            <span className="mlabel">Key points</span>
            <h2>The things your team must remember.</h2>
            <ul className="mkeys">
              {m.key_points.map((k, i) => <li key={i}><Tick />{cs(k)}</li>)}
            </ul>
            {!!m.standards?.length && (
              <div className="mnotes">
                {m.standards.map((s, i) => <p className="mnote" key={i}>{s}</p>)}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="msec tint">
        <div className="mwrap msec-in">
          <span className="mlabel">How CareStream delivers it</span>
          <h2>Not a slideshow once a year. Training that sticks.</h2>
          <div className="mgrid4">
            {DELIVERY.map(([t, b]) => (
              <div key={t}><Mark /><b>{t}</b><p>{b}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="msec">
        <div className="mwrap msec-in">
          <span className="mlabel">How your team gets trained</span>
          <h2>From your dashboard to your team, in the CareStream hub.</h2>
          <p>
            Training is delivered in the hub each staff member logs into. You allocate the
            modules, they complete them in their own language, and you get the completion records
            and certificates for your CQC evidence, with any gaps closed by automatic follow up
            training.
          </p>
          <div className="mgrid4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <div>
              <Mark /><b>Buy and allocate</b>
              <p>Assign {m.title} to each staff member in seconds. No course builder and no setup for each person.</p>
            </div>
            <div>
              <Mark /><b>They complete it in the hub</b>
              <p>Staff work through the module on any device, in over 60 languages, teaching then checking understanding. A wrong answer sends a short follow up lesson.</p>
            </div>
            <div>
              <Mark /><b>You track it</b>
              <p>See live completion status and a certificate for every person, ready as evidence for CQC.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="msec tint">
        <div className="mwrap msec-in mnarrow">
          <span className="mlabel">In their language</span>
          <h2>Any step, in their language, in one tap.</h2>
          <p>
            Care teams are diverse and training should not leave anyone behind. On any lesson or
            question, a staff member taps the language button and the whole step flips into the
            language they think in. They understand it properly, and your records stay in English.
          </p>
          <ul className="mout" style={{ gridTemplateColumns: '1fr' }}>
            {LANGUAGE_POINTS.map(p => <li key={p}><Tick />{p}</li>)}
          </ul>
          <p style={{ marginTop: 18, fontSize: '.9rem', color: 'var(--muted)' }}>
            Try the language buttons in the preview above.
          </p>
        </div>
      </section>

      <section className="msec">
        <div className="mwrap msec-in">
          <div className="tsplit">
            <div className="tsplit-copy">
              <span className="mlabel">Inside every course</span>
              <h2>Built for real learning, not box ticking</h2>
              <p>
                Every CareStream course goes further than a lesson and a quiz. These features come
                as standard on every course, giving your staff a richer way to learn and giving
                you the evidence to prove it.
              </p>
            </div>
            {hero && (
              <figure className="tshot">
                <SiteImage src={hero} alt={`The CareStream staff training hub showing ${lower}`} />
              </figure>
            )}
          </div>
          <div className="mgrid4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {INSIDE.map(([t, b]) => <div key={t}><Mark /><b>{t}</b><p>{b}</p></div>)}
          </div>
        </div>
      </section>

      <section className="msec tint">
        <div className="mwrap msec-in">
          <div className="tsplit flip">
            <div className="tsplit-copy">
              <span className="mlabel">The follow up loop</span>
              <h2>Wrong answers become lessons, not failures</h2>
              <p>
                A staff member who gets something wrong is the one who most needs teaching. In
                CareStream that is what happens, automatically, and every attempt is recorded.
              </p>
            </div>
          </div>
          <div className="mgrid4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {LOOP.map(([t, b]) => <div key={t}><Mark /><b>{t}</b><p>{b}</p></div>)}
          </div>
        </div>
      </section>

      <section className="msec">
        <div className="mwrap msec-in">
          <div className="mwhy-split">
            <div className="mwhy-copy">
              <span className="mlabel">Why CareStream</span>
              <h2>Why choose CareStream?</h2>
              <p>Training built for the care sector, delivered the way busy teams actually learn.</p>
              <ul className="mwhy">
                <li><Tick />90+ care-specific training courses</li>
                <li><Tick />Bitesize, engaging lessons your staff actually finish</li>
                <li><Tick />Mapped to the Care Certificate &amp; CQC standards</li>
                <li><Tick />Available in 60+ languages</li>
                <li><Tick />Instant certificate on completion</li>
                <li><Tick />Flexible learning, anytime, on any device</li>
                <li><Tick />Content kept up to date with UK care regulations</li>
                {minutes > 0 && <li><Tick />Time to complete: ~{minutes} min</li>}
              </ul>
            </div>
            <figure className="mwhy-photo">
              <SiteImage src="/images/_shared/why-training.jpg"
                         alt="A care worker viewing their mandatory training on the CareStream app" />
            </figure>
          </div>
        </div>
      </section>

      <section className="msec tint">
        <div className="mwrap msec-in mnarrow mfaq">
          <span className="mlabel">Questions</span>
          <h2>Frequently asked questions.</h2>
          <details>
            <summary>Is {m.title} training mandatory in care settings?<Plus /></summary>
            <div className="ans">
              {m.title} is part of the training that CQC-regulated care settings are expected to
              provide. CareStream includes it in the standard library so you can assign it to your
              whole team.
            </div>
          </details>
          <details>
            <summary>How often should staff complete {m.title} training?<Plus /></summary>
            <div className="ans">
              Most services refresh {m.title} training every year. CareStream tracks each
              person&apos;s renewal date and sends automatic reminders at 90, 30 and 7 days.
            </div>
          </details>
          <details>
            <summary>Can CareStream deliver {m.title} training in other languages?<Plus /></summary>
            <div className="ans">
              Yes. Staff can complete it in over 60 languages, reading and answering in the
              language they are most confident in, while your records stay in English.
            </div>
          </details>
          <details>
            <summary>Does the training include an assessment?<Plus /></summary>
            <div className="ans">
              Yes. Each module teaches the topic, applies it to a real care scenario, and finishes
              with an assessment. If a question is answered incorrectly, CareStream gives a short
              follow-up lesson and a fresh question to close the gap.
            </div>
          </details>
        </div>
      </section>

      {related.length > 0 && (
        <section className="msec mlast">
          <div className="mwrap msec-in">
            <span className="mlabel">Related training modules</span>
            <h2>More training your team may need</h2>
            <p>
              More mandatory and role-specific training CareStream delivers to your team, in the
              hub, in any language.
            </p>
            {/* Built from the API. The theme's own cards ship an unsubstituted image token and
                repeat one module's title and description on every card, which is a bug in its
                generator rather than a design to copy. */}
            <div className="tgrid" style={{ marginTop: 24 }}>
              {related.map(r => (
                <div className="tcard" key={r.slug}>
                  <span className="pic">
                    {img(r.illustration_url) && (
                      <SiteImage src={img(r.illustration_url)!} alt={r.title} />
                    )}
                    {r.frequency && <span className="freq">{r.frequency}</span>}
                    <span className="stack"><span className="cert"><Tick /> Certificate</span></span>
                  </span>
                  <div className="in">
                    {r.requires_practical && (
                      <div className="badges">
                        <span className="tbadge prac">Practical assessment</span>
                      </div>
                    )}
                    <h4>{r.title}</h4>
                    <p className="desc">{cs(r.summary || r.description || '')}</p>
                    <div className="tmeta">
                      <span className="tprice">{price}</span>
                      {!!r.duration_minutes && (
                        <span className="tdur"><Clock /> ~{r.duration_minutes} min</span>
                      )}
                      <Link className="tdetails" href={`/staff-training/${r.slug}`}>
                        Details <Arrow />
                      </Link>
                    </div>
                    <div className="tbuy">
                      <Link className="add" href={`/buy/${r.slug}`}>Start course now</Link>
                    </div>
                    <p className="tbulk">Bulk discounts from 10+ licences</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="tend">
        <div className="mwrap tend-in">
          <h2>Give your team {lower} training that actually lands.</h2>
          <div className="row">
            <Link className="tbtn solid" href={buyHref}>Start course now</Link>
            <Link className="tbtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>

      <section className="cvcompare">
        <div className="wrap">
          <div className="cvhead">
            <p className="eyebrow">Compared</p>
            <h2>Three ways to train a care team.</h2>
          </div>
          <div className="cvtablewrap">
            <table className="cvtable">
              <thead>
                <tr>
                  <th />
                  <th className="us">CareStream</th>
                  <th>A generic e-learning library</th>
                  <th>A trainer in the room</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([label, a, b, c]) => (
                  <tr key={label}>
                    <td className="f">{label}</td>
                    <td className="us"><CompareMark mark={a} /></td>
                    <td><CompareMark mark={b} /></td>
                    <td><CompareMark mark={c} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="cvfoot">
            Generic libraries are often cheaper per learner. They teach a national standard rather
            than being built, updated and evidenced around the way a CQC-registered service is
            actually inspected.
          </p>
        </div>
      </section>

      <section className="xsell">
        <div className="wrap">
          <div className="xcard">
            <div>
              <p className="xeyebrow">Care policies</p>
              <h3>Every module is written from a policy</h3>
              <p>
                If the policy behind it is out of date, the training inherits that. Sixty six
                policies written for your service, checked against current law and read by a
                person before they carry your name, from £39.
              </p>
            </div>
            <Link className="xcta" href="/care-policies">Browse the policies <Arrow /></Link>
          </div>
        </div>
      </section>
    </div>
  )
}
