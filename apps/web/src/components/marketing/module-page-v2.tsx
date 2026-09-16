import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { TrainingDemo, type TrainingDemoData } from './training-demo'
import { careSetting } from '@/lib/care-setting'
import { claimSafe, estimatedMinutes, refreshWord } from '@/lib/training-commerce'
import { LanguageCheck } from './language-check'
import { ThemeModuleCard, type LibraryTopic } from './training-library-tabs'
import { TrainingAddButton, TrainingCartLink, TrainingSaveButton } from './training-cart-buttons'
import './module-page-v2.css'

// The rebuilt /staff-training/<slug> template. Renders the SAME module record and the same demo
// payload the current page renders.
//
// Measured before building: 40 of the 49 long paragraphs on a training page are identical across
// modules once the title is substituted, and all nine of the rest come from the training API
// (the module record and its demo endpoint). No content extraction, no seed, no re-import.
//
// THE COPY IS THE THEME'S. The first version took several blocks from elsewhere ("Assigned, not
// scheduled", "Key points to remember", "A trainer in the room", "training that actually lands")
// that appear on no theme page; the rendered section-by-section diff against all 98 found them.
// Everything fixed below is the theme's wording. Three places differ on purpose, each noted
// where it happens: the refresh frequency, the standards and guidance links, and the image alts.
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
  authority_links?: { label: string; url: string }[]
  group_key?: string | null
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
  ['Teach, then assess',
   'Short teaching sections and a real care scenario, then an assessment that checks understanding.'],
  ['In any language',
   'Staff complete it in over 60 languages, while your records stay in English.'],
  ['Learn and retry',
   'A wrong answer triggers a short follow-up lesson and a fresh question, so the gap is closed.'],
  ['Renewals handled',
   'Automatic reminders at 90, 30 and 7 days, with a live compliance dashboard.'],
]

// The technology marks under the hero. Plain text rather than the app's logo components: the
// theme sets these as labelled chips, and a mark here is a name, not a brand lockup.
const TECH = ['Google Cloud', 'OpenAI', 'Claude', 'Supabase', 'Pinecone', 'Google Ads', 'AWS']

const LANGUAGE_POINTS = [
  'One tap flips any lesson or question into their language, instantly.',
  'Over 60 languages, with no setup and no separate versions to manage.',
  'Completions and certificates stay in English for your CQC evidence.',
]

const INSIDE: [string, string][] = [
  ['References and further reading',
   'Every course is built on recognised UK guidance and cites its sources, from NICE and '
   + 'Skills for Care to the NHS and the legislation itself.'],
  ['Key terms explained',
   'A plain English glossary of the technical terms in each course. A simple way to support every '
   + 'learner, including staff with English as a second language.'],
  ['Measured learning gain',
   'A quick knowledge check before the lesson is compared with the final assessment, so every '
   + 'certificate comes with evidence of how much the course actually taught.'],
]

// The three screenshots in "Inside every course". Shared images, same on every module page.
const SHOTS: [string, string, string, string][] = [
  ['/images/_shared/mod3.jpeg',
   'The end of module screen with the reflective practice prompt, mapped standards and the '
   + 'printable course summary and competency checklist all available in CareStream',
   'Reflective practice',
   'After passing, staff record what they will do differently in their day to day work. Their '
   + 'reflection is saved to their training record and shown with their certificate.'],
  ['/images/_shared/mod4.jpeg',
   'The printable one page course summary with learning outcomes, key points, key terms and '
   + 'references all available for CPD approved CareStream training modules',
   'A course summary to keep',
   'A printable one page takeaway of the outcomes, key points and key terms. Perfect for staff '
   + 'files, supervision conversations and the staff room wall.'],
  ['/images/_shared/mod5.jpeg',
   'The printable observed competency checklist with tick boxes and a manager sign off section '
   + 'all available for CPD approved CareStream training modules',
   'Observed competency checklist',
   'A printable checklist for managers to confirm skills in practice, with a sign off section. It '
   + 'completes the picture beyond the knowledge assessment.'],
]

const LOOP: [string, string][] = [
  ['Instant lesson and feedback',
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
  ['Try a real lesson and a real question before you buy', 'yes', 'no', 'no'],
  ['Learning outcomes and time to complete stated up front', 'yes', 'part', 'no'],
  ['Written lesson sections, each with its own illustration', 'yes', 'part', 'no'],
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
  related: LibraryTopic[]
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
  // The theme states a time for every module; where the record has none it uses the same
  // estimate the library cards do.
  const est = estimatedMinutes(m.group_key, m.duration_minutes)
  const addLabel = { slug: m.slug, title: m.title, unitPence }

  return (
    <div className="mpage-v2">
      {/* The bar that follows the reader down the page. Its action is the theme's own: straight
          to this module's purchase page. */}
      <div className="mbar">
        <div className="mbar-in">
          {hero && <span className="thumb"><SiteImage src={hero} alt={m.title} /></span>}
          <span className="who">
            <b>{m.title}</b>
            <span className="meta">
              <Clock /> ~{est} min to complete<i>·</i>{price} per staff member
            </span>
          </span>
          <TrainingSaveButton slug={m.slug} title={m.title} />
          <Link className="add" href={buyHref}>Start course now</Link>
        </div>
      </div>

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
              {/* The theme's basket. The first version sent this to /buy/<slug> because there
                  was no multi-module basket; there is one now (the training cart, checked out
                  at /basket), and the /staff-training library already adds to it. */}
              <div className="mrow">
                <TrainingAddButton {...addLabel} />
                <TrainingSaveButton slug={m.slug} title={m.title} />
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

            <div className="mtech">
              <p className="cap">Specialists in the technology behind it all</p>
              <div className="marks">
                {TECH.map(t => <span className="techmark" key={t}>{t}</span>)}
              </div>
              <p className="note">
                The same AI and technology behind the world&apos;s best products powers
                CareStream, so your team&apos;s {lower} training stays accurate, always up to date
                with the latest guidance, and is delivered in over 60 languages.
              </p>
            </div>
          </div>

          {demo && <TrainingDemo demo={demo} buyHref={buyHref} variant="theme" place="module" />}
        </div>
      </section>

      {/* The strip under the hero. The theme's language box is a client-side "is my language
          supported" check; the answer is always yes, so this states it rather than pretending
          to look it up. */}
      <div className="mstats">
        <div className="mstats-in">
          <div className="mstat">
            <p className="cap"><Clock /> Avg. Duration</p>
            <p className="val">About {est} minutes</p>
          </div>
          <div className="mstat">
            <p className="cap"><Tick /> Certificate</p>
            <p className="val">For every staff member</p>
          </div>
          <div className="mstat lang">
            <p className="cap"><Tick /> Available Languages (60+)</p>
            <LanguageCheck />
          </div>
          <div className="mstat pub">
            <p className="cap">Course Published by</p>
            <SiteImage src="/images/_shared/mod1.png" alt="CareStream" />
          </div>
        </div>
      </div>

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
            {/* The theme's two notes. It wrote "refreshed every year" and the no-standards
                sentence for every module; the frequency is the module's own, and the ten
                modules that list standards name them, as the current page does. Those ten
                also carry links to national guidance, which the theme has nowhere: dropping
                them would lose them, so they follow as a third note. */}
            <div className="mnotes">
              <div className="mnote">
                <Tick />
                <span>
                  {m.title} is {m.frequency === 'once' ? 'completed' : 'refreshed'}{' '}
                  {refreshWord(m.frequency)}, for the staff in your care setting whose roles require it.
                  {m.requires_practical ? ' It includes a practical sign-off.' : ''}
                </span>
              </div>
              <div className="mnote">
                <Tick />
                <span>
                  {m.standards?.length
                    ? `Supports your evidence against ${m.standards.slice(0, 3).join(', ')}${m.standards.length > 3 ? ' and more' : ''}.`
                    : 'Supports the training evidence CQC expects to see for a well-run, safe care setting.'}
                </span>
              </div>
              {!!m.authority_links?.length && (
                <div className="mnote">
                  <Tick />
                  <span>
                    Aligned to national guidance:{' '}
                    {m.authority_links.map((a, i) => (
                      <span key={a.url}>
                        {i > 0 && '; '}
                        <a href={a.url} target="_blank" rel="noopener noreferrer">{a.label}</a>
                      </span>
                    ))}
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="msec tint">
        <div className="mwrap msec-in">
          <span className="mlabel">How CareStream delivers it</span>
          <h2>Not a slideshow once a year. Training that sticks.</h2>
          <p>
            CareStream delivers {lower} training in the hub your team already uses, grounded in
            best practice and your own policies, so it fits your care setting and not a generic
            template.
          </p>
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
                {/* The theme's alt calls this the hub showing assigned courses; it is the
                    module's illustration, so the alt says that. */}
                <SiteImage src={hero} alt={`${m.title} training illustration`} />
              </figure>
            )}
          </div>
          <div className="mgrid4" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {INSIDE.map(([t, b]) => <div key={t}><Mark /><b>{t}</b><p>{b}</p></div>)}
          </div>
          <div className="tshotcards">
            {SHOTS.map(([src, alt, title, body]) => (
              <div className="tshotcard" key={src}>
                <span className="frame"><SiteImage src={src} alt={claimSafe(alt)} /></span>
                <div className="cap"><b>{title}</b><p>{body}</p></div>
              </div>
            ))}
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
                Most e learning marks an answer wrong and moves on. CareStream does not. Every
                wrong answer triggers an automatic follow up loop that teaches the point again and
                rechecks it, so no knowledge gap is left behind.
              </p>
            </div>
            {/* The theme places the module's first lesson illustration here. Its alt describes
                a hub screen the image is not, so the alt names the lesson instead. */}
            {img(sections[0]?.image_url) && (
              <figure className="tshot">
                <SiteImage src={img(sections[0]?.image_url)!} alt={sections[0].heading} />
              </figure>
            )}
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
                <li><Tick />Time to complete: ~{est} min</li>
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
              Most services refresh {m.title} training {refreshWord(m.frequency)}. CareStream tracks each
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
              hub, in any language. Add any of these to your basket.
            </p>
            {/* The library's own theme card, so a related module reads, prices and adds to the
                basket exactly as it does on /staff-training. Built from the API: the theme's
                cards ship an unsubstituted image token and repeat one module on every card,
                which is a bug in its generator rather than a design to copy. */}
            <div className="tgrid" style={{ marginTop: 24 }}>
              {related.map(r => (
                <ThemeModuleCard key={r.slug} t={r} bulk="Bulk discounts from 10+ licences" />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="tend">
        <div className="mwrap tend-in">
          <h2>Give your team {lower} training that actually sticks.</h2>
          <p>Add it to your basket, allocate it in seconds, and let the evidence build itself.</p>
          <div className="row">
            <TrainingAddButton {...addLabel} className="tbtn solid" label={`Add to basket · ${price}`} />
            <Link className="tbtn ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>

      <section className="cvcompare">
        <div className="wrap">
          <div className="cvhead">
            <p className="eyebrow">Compared</p>
            <h2>Three ways to train a care team.</h2>
            <p>
              These modules are written and kept current by us, so your managers do not have to
              write or maintain them. We have compared what each approach does rather than naming
              providers, because products change and this should still be true next year.
            </p>
          </div>
          <div className="cvtablewrap">
            <table className="cvtable">
              <thead>
                <tr>
                  <th />
                  <th className="us">CareStream</th>
                  <th>A generic e-learning library</th>
                  <th>A trainer you book</th>
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
            <div className="xart">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 3h8l4.5 4.5V21H6z" />
                <path d="M14 3v5h4.5" />
                <path d="M9 13h6M9 17h4" />
              </svg>
            </div>
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

      <TrainingCartLink />
    </div>
  )
}
