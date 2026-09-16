import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { PolicyIntakeGame } from './policy-intake-game'
import { AddToBasket, BasketPill, SavePolicy, StickyBuyBar } from './policy-basket'
import './policy-page-v2.css'

// The rebuilt /care-policies/<slug> template. Renders the SAME shop API record the current page
// renders, so the switchover is a design change and no copy is rewritten.
//
// Checked before building: 31 of the 33 long paragraphs on a theme policy page are identical
// across policies once the title is substituted, so the prose is TEMPLATE copy and lives here.
// The two that vary are the product description and the question count, and both come from the
// API. That is why this family needs no content import and no re-import.

export interface PolicyProduct {
  slug: string
  title: string
  description: string
  price_pence: number
  taster: boolean
  image_url?: string | null
  intake_fields: Array<{ key: string; label: string; help: string | null; shared: boolean }>
  personalisation_questions?: Array<{ key: string; label: string; help: string | null }>
}

export interface PolicyRegulation {
  reference_key: string
  official_name: string
  summary: string
  required_elements_count: number
  key_facts: string[]
}

export interface PolicyRelated {
  slug: string; title: string; description: string; price_pence: number; taster: boolean
}

export interface PolicyBundle { key: string; title: string; price_pence: number }

const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`

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

const Cross = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
)

const Dash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
       strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
)

const Shield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.5 20 7v5.5c0 4.4-3.4 7.4-8 8.6-4.6-1.2-8-4.2-8-8.6V7z" />
    <path d="M8.8 12.2 11 14.5l4.2-4.6" />
  </svg>
)

const Ask = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.8 9.4a2.3 2.3 0 1 1 2.5 3.4v1.1" /><path d="M12.2 17h.01" />
  </svg>
)

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h13M12 5.5 18.5 12 12 18.5" />
  </svg>
)

// The four steps and the comparison rows are the same on every policy, so they are here rather
// than repeated per page.
const STEPS = [
  ['You give us the details',
   'The short questions above: who you are, your CQC registration, and the people this policy names.'],
  ['We write it from the law',
   'One section per required element of the legislation, in your name, with your people.'],
  ['It is verified, then read',
   'Automated checks against every required element, then a person reads it before it ships.'],
  ['It stays current',
   'When legislation changes, your policy is updated and you are told what changed and why.'],
]

const CONTENTS: [string, string?][] = [
  ['Purpose and scope', 'who it covers'],
  ['Legal and regulatory framework', 'cited in full'],
  ['Definitions used in this policy'],
  ['Roles and responsibilities', 'your people, named'],
  ['Procedure, step by step'],
  ['Recording, reporting and escalation'],
  ['Training and competency'],
  ['Monitoring, audit and review'],
  ['Related policies and documents'],
  ['Version control and approval', 'signed and dated'],
]

type Mark = 'yes' | 'no' | 'part'
const COMPARE: [string, Mark, Mark, Mark, Mark][] = [
  ['Questions asked at the point of purchase, so it is personalised rather than blank',
   'yes', 'no', 'yes', 'no'],
  ['Written for your service, naming your manager and your leads', 'yes', 'no', 'yes', 'no'],
  ['Structured from the regulations, every required element checked before it is sent',
   'yes', 'no', 'part', 'no'],
  ['A branded companion document setting out the law it was written against',
   'yes', 'no', 'no', 'no'],
  ['Read and approved by a person before it carries your name', 'yes', 'no', 'yes', 'no'],
  ['Prints on your own letterhead with a sign-off and version block', 'yes', 'part', 'part', 'no'],
  ['Named role holders update everywhere when the person changes', 'yes', 'no', 'no', 'no'],
  ['Kept current when the law changes, and you are told what changed', 'yes', 'part', 'no', 'no'],
  ['Turnaround stated before you buy', 'yes', 'yes', 'no', 'yes'],
  ['Your staff can ask it questions in their own language', 'yes', 'no', 'no', 'no'],
]
const COMPARE_COST = ['£39 to £79 per policy, one-off', '£250 to £995 for the pack',
  'A day rate, typically £400 upwards', 'Nothing']

/** The six questions the theme asks, and the current page asks, in the order both show them.
 *  One list, so the page and its FAQPage structured data cannot say different things. */
export function policyFaqs(p: { title: string }, elements: number, starter: PolicyBundle | undefined,
                           catalogueCount: number) {
  return [
    { question: 'What exactly do I receive?',
      answer: `A complete ${p.title} written for your organisation, in your dashboard and as a print-ready PDF on your own letterhead. It names your service, your registration details and your leads, because you gave us them.` },
    { question: 'Is this a template?',
      answer: `No. Each policy is written for the organisation buying it, structured from the legislation itself, verified against ${elements || 'every'} required regulatory elements, and read by a person before it carries your name.` },
    { question: 'How quickly will I get it?',
      answer: 'Within 2 working days of you completing the short questions above. Most arrive sooner.' },
    { question: 'What happens when the law changes?',
      answer: 'We monitor UK care legislation continuously. When something affecting this policy changes, your copy is updated and you are told what changed and why. The first year of updates is included, then £12 a year per policy.' },
    { question: 'Can I edit the policy myself?',
      answer: 'No, and deliberately so: we stand behind every word we approve. If something needs changing, tell us and we amend and re-verify it, so it always remains a document we can both defend to an inspector.' },
    { question: 'What if I need more than one policy?',
      answer: `Most services do. The Statutory Starter Pack covers the twenty policies every CQC-registered service is expected to hold${starter ? ` for ${money(starter.price_pence)}` : ''}, and the Complete Policy Library covers all ${catalogueCount}.` },
  ]
}

const WHY = [
  'CATALOGUE care policies, one platform',
  'Written for your service, never a template',
  'Verified against every required element of the law',
  'Read by a person before it carries your name',
  'Kept up to date with UK care regulations',
  'Branded, print-ready PDF on your letterhead',
  'Delivered within 2 working days of your details',
  'Part of the full CareStream platform when you are ready',
]

const ASSURANCES = [
  ['Fourteen day refund',
   'If it is not right for your service, tell us within fourteen days and we refund it in full.'],
  ['£12 a year after the first',
   'Year one of updates is included. After that it is £12 a year to keep the policy current, '
   + 'and you can stop at any time.'],
  ['A person reads it',
   'Every policy is read and approved by a human before it carries your name. No exceptions.'],
]

function CompareMark({ mark }: { mark: Mark }) {
  if (mark === 'yes') return <span className="cvyes"><Tick /></span>
  if (mark === 'part') return <span className="cvpart"><Dash /></span>
  return <span className="cvno"><Cross /></span>
}

export function PolicyPageV2({ product, regulations, related, bundles, catalogueCount }: {
  product: PolicyProduct
  regulations: PolicyRegulation[]
  related: PolicyRelated[]
  bundles: PolicyBundle[]
  /** How many policies the shop sells. The theme and the current page say 65; the catalogue
   *  has 66, and will change again, so the number comes from the catalogue. */
  catalogueCount: number
}) {
  const price = money(product.price_pence)
  const questions = product.intake_fields?.length ?? 0
  const elements = regulations.reduce((n, r) => n + (r.required_elements_count || 0), 0)
  const hero = `/images/care-policies/${product.slug}/1.webp`
  const item = { slug: product.slug, title: product.title, price_pence: product.price_pence }
  // The theme mentions a pack only on the twenty policies in the Statutory Starter Pack. Taking
  // the first bundle named the Governance & Data Pack on /caldicott, which the theme does not.
  const pack = bundles.find(b => b.key === 'statutory-starter')
  const faqs = policyFaqs(product, elements, pack, catalogueCount)

  return (
    <div className="pcpage-v2">
      <StickyBuyBar item={item} image={hero} />

      <section className="pchero">
        <div className="pcwrap pchero-in">
          <div>
            <div className="pccrumb">
              <Link href="/care-policies">Care Policies</Link><span>/</span><b>{product.title}</b>
            </div>
            <span className="pcpill"><Shield />Personalised · Human-reviewed · Kept updated</span>
            <h1>A {product.title} written for your service</h1>
            <ul className="pcticks">
              <li><Tick /><span>Written for your organisation, not a template with your logo on it</span></li>
              <li><Tick /><span>Read and approved by a person before it carries your name</span></li>
              <li><Tick /><span>Verified against all {elements} required elements of the legislation below</span></li>
              <li><Tick /><span>Kept updated when the law changes, so it never quietly goes stale</span></li>
            </ul>

            <div className="pcbuycard">
              <div className="price"><b>{price}</b><span>one-off, for your policy</span></div>
              <p className="sub">
                No subscription needed. First year of updates included, £12 a year after that.
              </p>
              <div className="pcbuyrow">
                <AddToBasket item={item} />
                <SavePolicy slug={product.slug} title={product.title} />
              </div>
            </div>

            <p className="pcnote">
              One-off, first year of updates included. Delivered within <b>2 working days</b> of
              your details.{pack && <> Also in the <b>{pack.title}</b>, 20 policies for {money(pack.price_pence)}.</>}
            </p>

            <div className="pccue">
              <span>Build it now: {questions} questions, three minutes</span>
              <svg width="88" height="30" viewBox="0 0 88 30" fill="none" className="across" aria-hidden="true">
                <path d="M3 16 C 30 17, 56 19, 80 11" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M70 4 L 83 11 L 69 19" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg width="26" height="34" viewBox="0 0 26 34" fill="none" className="down" aria-hidden="true">
                <path d="M13 2 C 13 16, 11 22, 13 28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                <path d="M6 22 L 13 30 L 20 22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            <p className="pctrust">
              <span className="pcstars"><Star /><Star /><Star /><Star /><Star /></span>
              Trusted by UK care providers
            </p>
          </div>

          {/* The intake game IS the buying journey, and it already exists as a component: the
              theme rebuilt it in plain JavaScript from this very file, so the port reuses the
              original rather than reimplementing the copy. */}
          <PolicyIntakeGame
            slug={product.slug}
            title={product.title}
            pricePence={product.price_pence}
            fields={product.intake_fields}
            buyHref={`/contact?about=${encodeURIComponent(product.title)}`}
            variant="theme"
            heroImage={hero}
          />
        </div>
      </section>

      {regulations.length > 0 && (
        <section className="pcsec" style={{ background: 'var(--ground-2)' }}>
          <div className="pcwrap">
            <p className="pceyebrow">Built from the law, checked against the law</p>
            <h2>The legislation, CQC standards and guidance we analyse to write it.</h2>
            <p className="lede2">
              Your {product.title} is structured from these regulations, then verified against
              every required element of each one before a person signs it off. If the law
              changes, your policy is updated and you are told what changed and why.
            </p>
            {regulations.map((r, i) => (
              <div className={`pclaw${i % 2 ? ' flip' : ''}`} key={r.reference_key}>
                <div>
                  <span className="n">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{r.official_name}</h3>
                  <ul>
                    {r.key_facts.map((f, j) => <li key={j}><Tick /><span>{f}</span></li>)}
                  </ul>
                  {r.required_elements_count > 0 && (
                    <span className="pcverified">
                      <Tick />{r.required_elements_count} required elements verified in your policy
                    </span>
                  )}
                </div>
                {/* `filled` is what strips the placeholder padding and background from a frame
                    that holds a real image. Without it every picture sits inside a lilac
                    plate, which is the fault Len reported on /uses, in this family's own
                    class names. */}
                <div className="pclaw-shot filled">
                  <SiteImage src={`/images/policy-law/${r.reference_key}.webp`}
                             alt={r.official_name} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="pcsec">
        <div className="pcwrap">
          <p className="pceyebrow">Written for your service</p>
          <h2>What we ask you, so none of it is assumed.</h2>
          <p className="lede2">
            Most policy packs are one document sold to everyone with a find and replace on the
            home name. Your {product.title} is written from the legislation above and from your
            answers to the questions below. Where you have told us something, it says so. Where
            you have not, it sets out what must happen rather than claiming you already do it.
          </p>
          <div className="pcwhen">
            <div>
              <em>Before you pay</em><b>{questions} quick questions</b>
              <p>
                Your registered name, address, CQC numbers and who holds the key roles. About
                three minutes. Nothing else is asked before you buy.
              </p>
            </div>
            <div>
              <em>After you buy</em>
              <b>{product.personalisation_questions?.length ?? 0} about your service</b>
              <p>
                Asked once in your own account and used across every policy you own, so a second
                policy never asks you the same thing twice.
              </p>
            </div>
          </div>
          {!!product.personalisation_questions?.length && (
            <div className="pcqs">
              {product.personalisation_questions.map(q => (
                <div className="pcq" key={q.key}>
                  <Ask />
                  <div><b>{q.label}</b>{q.help && <span>{q.help}</span>}</div>
                </div>
              ))}
            </div>
          )}
          <p className="lede2" style={{ marginBottom: 0 }}>
            <b>Why it matters.</b> A policy that claims you assess your premises annually, when
            you never have, is not a harmless overstatement. It is a signed statement handed to
            your inspector. We would rather write what you must do than guess what you already do.
          </p>
        </div>
      </section>

      <section className="pcsec">
        <div className="pcwrap">
          <p className="pceyebrow">How it is made</p>
          <h2>From your details to a policy you can stand behind.</h2>
          <div className="pcsteps">
            {STEPS.map(([title, body], i) => (
              <div className="pcstep" key={i}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <b>{title}</b><p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pcsec" style={{ background: 'var(--ground-2)' }}>
        <div className="pcwrap">
          <p className="pceyebrow">Common questions</p>
          <h2>What you are actually buying.</h2>
          <div className="pcfaq">
            {faqs.map((f, i) => (
              <details open={i === 0} key={f.question}>
                <summary>{f.question}</summary>
                <p className="a">{f.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* "Why CareStream". This was missing entirely and its heading had been borrowed for the
          sample section below, so two sections had collapsed into one wrong one. */}
      <section className="pcsec">
        <div className="pcwrap">
          <p className="pceyebrow">Why CareStream</p>
          <h2>Policies written the way an inspector expects to read them.</h2>
          <div className="pcwhy">
            {WHY.map(t => <div key={t}><Tick /><span>{t.replace('CATALOGUE', String(catalogueCount))}</span></div>)}
          </div>
        </div>
      </section>

      <section className="cvsample">
        <div className="wrap">
          <div className="cvhead">
            <p className="eyebrow">Before you buy</p>
            <h2>What the document actually looks like.</h2>
            <p>
              Every section it contains, and a page of the real thing. We show the structure and
              the personalisation rather than the wording, because the wording is what you are
              paying us to write for your service.
            </p>
          </div>
          <div className="cvsplit">
            <div className="cvcontents">
              <h3>Contents of your {product.title}</h3>
              <ol>
                {CONTENTS.map(([label, note], i) => (
                  <li key={i}><span>{label}</span>{note && <em>{note}</em>}</li>
                ))}
              </ol>
            </div>
            <div className="cvpage" aria-label="Sample page from the policy, partly redacted">
              <div className="cvletter">
                <b>Your service name here</b><span>Approved · Version 1.0</span>
              </div>
              <p className="cvsec">Section 4 · Roles and responsibilities</p>
              <h4>Who is accountable, by name</h4>
              <p>
                Overall accountability for this policy rests with{' '}
                <span className="merge">your registered manager</span>, supported by{' '}
                <span className="merge">your nominated individual</span>. Day to day
                responsibility sits with <span className="merge">your named lead</span>, who is
                the first point of contact for staff at{' '}
                <span className="merge">your service address</span>.
              </p>
              <div className="cvbars"><i /><i /><i /><i /><i /><i /></div>
              <p className="cvredact">
                <Shield /> The remaining wording is written for the organisation buying it, so it
                is not shown here.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="cvassure">
        <div className="wrap">
          <div className="row">
            {ASSURANCES.map(([title, body]) => (
              <div className="a" key={title}><b>{title}</b><span>{body}</span></div>
            ))}
          </div>
          <div className="cvquote">
            <p>
              &ldquo;The inspector asked for evidence and I had it on screen before she finished
              the sentence.&rdquo;
            </p>
            <span>Registered Manager · 48-bed nursing home, West Sussex</span>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="pcsec" style={{ borderBottom: 0 }}>
          <div className="pcwrap">
            <p className="pceyebrow">Related policies</p>
            <h2>More policies your service may need.</h2>
            <p className="lede2">
              More statutory and operational policies CareStream writes for your service,
              personalised, human-reviewed and kept updated, exactly like this one.
            </p>
            <div className="pcrel">
              {related.map(rp => (
                <div className="pcrelc" key={rp.slug}>
                  <div className="pcrel-art filled">
                    <SiteImage src={`/images/care-policies/${rp.slug}/1.webp`} alt={rp.title} />
                  </div>
                  <div className="pcrelb">
                    <h3><Link href={`/care-policies/${rp.slug}`}>{rp.title}</Link></h3>
                    <p>{rp.description}</p>
                    <div className="pcrelf">
                      <b>{money(rp.price_pence)}</b>
                      <AddToBasket className="pcrelbuy" item={{
                        slug: rp.slug, title: rp.title, price_pence: rp.price_pence,
                      }} />
                    </div>
                    <Link className="pcrelmore" href={`/care-policies/${rp.slug}`}>
                      See this policy in full →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="cvcompare">
        <div className="wrap">
          <div className="cvhead">
            <p className="eyebrow">Compared</p>
            <h2>The four ways care services get a policy.</h2>
            <p>
              We have compared what each approach does rather than naming competitors, because
              products change and the comparison should still be true next year.
            </p>
          </div>
          <div className="cvtablewrap">
            <table className="cvtable">
              <thead>
                <tr>
                  <th />
                  <th className="us">CareStream</th>
                  <th>A policy pack</th>
                  <th>A consultant</th>
                  <th>A free template</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([label, a, b, c, d]) => (
                  <tr key={label}>
                    <td className="f">{label}</td>
                    <td className="us"><CompareMark mark={a} /></td>
                    <td><CompareMark mark={b} /></td>
                    <td><CompareMark mark={c} /></td>
                    <td><CompareMark mark={d} /></td>
                  </tr>
                ))}
                <tr>
                  <td className="f">What it costs</td>
                  <td className="us">{COMPARE_COST[0]}</td>
                  {COMPARE_COST.slice(1).map(c => <td key={c}>{c}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="cvfoot">
            Prices are the published rates of the common alternatives as at September 2026, for
            comparison only.
          </p>
        </div>
      </section>

      {/* The cross-sell to training, which closes every policy page in the theme. Its opposite
          number closes every training page. */}
      <section className="xsell">
        <div className="wrap">
          <div className="xcard">
            <div className="xart">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" />
                <path d="M6 10.5v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" />
                <path d="M21.5 8.5v6" />
              </svg>
            </div>
            <div>
              <p className="xeyebrow">Training</p>
              <h3>Owning the policy is half of it</h3>
              <p>
                An inspector asks whether your staff understood it, not whether you hold it.
                Ninety eight modules written and kept current by us, to the same regulations,
                from £25.99 per staff member with no subscription.
              </p>
            </div>
            <Link className="xcta" href="/staff-training">Browse the training <Arrow /></Link>
          </div>
        </div>
      </section>

      <BasketPill />
    </div>
  )
}
