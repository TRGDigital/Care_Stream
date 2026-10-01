import { TrainingCertificate } from '@/components/training-certificate'
import { careSetting } from '@/lib/care-setting'
import { durationText } from '@/lib/training-commerce'
import './product-extras.css'

// Under the guarantee box in a product page's buy column: questions about what the buyer is
// getting, answered from this product's own record, then a picture of what they get (the
// certificate for a course, the document for a policy).

type Faq = [string, string]

/** "A, B and C" */
const listOf = (items: string[]) =>
  items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`

/** "a, b, c and 4 more" */
function someOf(items: string[], n: number) {
  if (items.length <= n) return listOf(items)
  return `${items.slice(0, n).join(', ')} and ${items.length - n} more`
}

const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s)

// A policy's own intake labels, as they read inside a sentence. Proper names keep their capitals.
const KEEP_CAPS = /^(Gas Safe|Caldicott|Freedom to Speak Up|ICO|CQC)/
const inSentence = (label: string) => (KEEP_CAPS.test(label) ? label : lowerFirst(label))
const isFact = (label: string) => /^(date|ico registration|regulated activities)/i.test(label)
/** "your fire safety officer" */
const personPhrase = (label: string) => `your ${inSentence(label)}`
/** "the date of your last fire risk assessment", "your ICO registration number" */
function factPhrase(label: string): string {
  const m = label.match(/^date of (last )?(.*)$/i)
  if (m) return `the date of your ${m[1] ? 'last ' : ''}${inSentence(m[2])}`
  if (/^regulated activities/i.test(label)) return 'the regulated activities and services you provide'
  return `your ${inSentence(label)}`
}

export function ProductFaqs({ title, faqs }: { title: string; faqs: Faq[] }) {
  return (
    <div className="pxfaq">
      <h3>{title}</h3>
      {faqs.map(([q, a], i) => (
        <details key={q} open={i === 0}>
          <summary>{q}</summary>
          {a.split('\n\n').map((p, j) => <p key={j}>{p}</p>)}
        </details>
      ))}
    </div>
  )
}

// ── Training ────────────────────────────────────────────────────────────────────────────────

export interface FaqModule {
  title: string
  duration_minutes?: number | null
  estMinutes: number
  sections?: { heading: string }[]
  question_count?: number | null
  pass_mark?: number | null
  frequency?: string | null
  requires_practical?: boolean
  cpd_accredited?: boolean
}

const RENEW: Record<string, string> = {
  annual: 'every year', biennial: 'every two years', triennial: 'every three years',
}

export function trainingFaqs(m: FaqModule): Faq[] {
  const lessons = (m.sections ?? []).map(s => careSetting(s.heading)).filter(Boolean)
  const q = m.question_count ?? null
  const pass = m.pass_mark ?? 80
  const time = durationText(m.estMinutes)
  const out: Faq[] = []
  out.push([`What do I get when I buy ${m.title} training?`,
    `One licence per member of staff, to use within 12 months. Each licence covers the complete ${m.title} course`
    + `${lessons.length ? ` (${lessons.length} lessons)` : ''}, the ${q ? `${q} question ` : ''}assessment, a follow-up lesson on anything they get wrong, `
    + `and a certificate with their name, score and completion date.${m.cpd_accredited ? ' The course is CPD Certified, so the certificate carries the CPD Certified mark.' : ''}`])
  if (lessons.length) {
    out.push([`What does the course cover?`,
      `${lessons.length} lessons: ${someOf(lessons, 6)}. Each lesson pairs the teaching with a care scenario and a quick check.`])
  }
  out.push([`How long does it take?`,
    `About ${time}${q ? `, finishing with a ${q} question assessment (pass mark ${pass}%)` : ''}. Staff can stop and pick up where they left off, on a phone, tablet or computer.`])
  out.push([`What does the certificate show?`,
    `The staff member's name, the course, their score, the date they completed it and when it is due for renewal`
    + `${m.cpd_accredited ? ', with the CPD Certified mark and the CPD hours' : ''}. You can download it as a PDF, and it sits on their training record ready for your CQC evidence. There is a sample below.`])
  if (m.requires_practical) {
    out.push([`Is the online course enough on its own?`,
      `It covers the knowledge. ${m.title} also needs an observed assessment in the workplace, carried out by the employer, and we include the observation checklist to record it.`])
  }
  const renew = m.frequency ? RENEW[m.frequency] : undefined
  out.push([`How do staff get access?`,
    `Straight after payment. Add your staff and each one gets an invite to the CareStream hub, where they complete the course in their own language (over 60 are available).`
    + `${renew ? ` We remind you and them before it is due again, ${renew}.` : ''}`])
  out.push([`What if I buy too many?`,
    'Any licence that has not been started can be refunded in full within fourteen days. Just tell us.'])
  return out
}

export function SampleCertificate({ m }: { m: FaqModule }) {
  const done = new Date()
  const renews = new Date(done); renews.setFullYear(done.getFullYear() + 1)
  const hours = m.duration_minutes ? Math.round((m.duration_minutes / 60) * 10) / 10 : null
  return (
    <figure className="pxcert">
      <figcaption><b>What your staff receive</b><span>Sample certificate</span></figcaption>
      <div className="pxcert-frame">
        <TrainingCertificate
          staffName="Sam Taylor"
          moduleName={m.title}
          orgName="Oakhaven Care Home"
          score={92}
          completedAt={done.toISOString()}
          expiresAt={m.frequency === 'once' ? null : renews.toISOString()}
          requiresPractical={m.requires_practical}
          cpdAccredited={!!m.cpd_accredited}
          cpdHours={m.cpd_accredited ? hours : null}
          tier="cpd"
        />
      </div>
    </figure>
  )
}

// ── Policies ────────────────────────────────────────────────────────────────────────────────

export interface FaqPolicy {
  title: string
  intake_fields: Array<{ key: string; label: string; shared: boolean }>
}
export interface FaqRegulation { reference_key: string; official_name: string; required_elements_count: number; key_facts: string[] }

/** The fields only this policy asks for (its leads and dates), not the company details every
 *  policy shares. */
const ownFields = (p: FaqPolicy) => (p.intake_fields ?? []).filter(f => !f.shared)

export function policyProductFaqs(p: FaqPolicy, regs: FaqRegulation[], elements: number): Faq[] {
  const own = ownFields(p)
  const people = own.filter(f => !isFact(f.label)).map(f => personPhrase(f.label))
  const facts = own.filter(f => isFact(f.label)).map(f => factPhrase(f.label))
  const laws = regs.map(r => r.official_name)
  const out: Faq[] = []
  out.push([`What do I get when I buy the ${p.title}?`,
    `A complete ${p.title} written for your organisation: in your dashboard and as a print-ready PDF on your own letterhead, with a sign-off and version block. `
    + 'It comes with a companion document setting out the law it was written against, and the first year of updates is included.'])
  if (laws.length) {
    out.push([`Which laws and regulations does it cover?`,
      `It is written against ${laws.length === 1 ? 'one piece of legislation' : `${laws.length} pieces of legislation and regulation`}: ${laws.join('; ')}. `
      + `Before a person signs it off, it is checked against all ${elements} required elements.`])
  }
  out.push([`What will you ask me?`,
    `Your company and service details (name, address, CQC provider and location IDs), your registered manager and your nominated individual`
    + `${people.length || facts.length ? `, plus ${listOf([...people, ...facts])}` : ''}. It takes about three minutes, and the company details are reused for every other policy you buy.`])
  out.push([`Who is named in it?`,
    `${listOf(['Your registered manager', 'your nominated individual', ...people])}.`
    + `${facts.length ? ` It also records ${listOf(facts)}.` : ''} When someone changes, tell us once and every policy that names them is updated.`])
  out.push([`How quickly will I get it?`,
    'Within 2 working days of your answers, or within 24 hours if you add priority delivery for £15 in your basket.'])
  out.push([`What happens after the first year?`,
    'It stays current for £12 a year: when the law changes, we update your policy and tell you what changed and why. You can stop at any time.'])
  out.push([`What if it is not right for my service?`,
    'Tell us within fourteen days and we refund it in full. Every policy is read by a person before it carries your name.'])
  return out
}

/** A page of the finished document for THIS policy: its leads, the law it is built from, and
 *  what it must contain. The wording itself is written per buyer, so it is not shown. */
export function PolicyDocMock({ p, regs, elements }: { p: FaqPolicy; regs: FaqRegulation[]; elements: number }) {
  const own = ownFields(p)
  const people = [
    { label: 'Registered manager', value: 'Your registered manager' },
    ...own.filter(f => !isFact(f.label)).map(f => ({ label: f.label, value: `Your ${inSentence(f.label)}` })),
    { label: 'Nominated individual', value: 'Your nominated individual' },
  ].slice(0, 4)
  const dates = own.filter(f => isFact(f.label))
  const covers = regs.flatMap(r => r.key_facts.slice(0, 2)).slice(0, 4)
  return (
    <figure className="pxdoc" aria-label={`Sample page from the ${p.title}, partly redacted`}>
      <figcaption><b>What your policy looks like</b><span>Sample page</span></figcaption>
      <div className="pxdoc-page">
        <div className="pxdoc-letter">
          <span className="logo">Your logo</span>
          <span className="meta"><b>Your service name</b>Your service address · CQC location ID</span>
        </div>
        <h4>{p.title}</h4>
        <div className="pxdoc-ver">
          <span>Version 1.0</span><span>Approved by <i className="merge">your registered manager</i></span><span>Review due in 12 months</span>
        </div>

        <p className="pxdoc-h">1. Who is responsible</p>
        <table className="pxdoc-people"><tbody>
          {people.map(x => <tr key={x.label}><th>{x.label}</th><td><i className="merge">{x.value}</i></td></tr>)}
          {dates.map(d => <tr key={d.key}><th>{d.label}</th><td><i className="merge">{/^date/i.test(d.label) ? 'Your date' : 'Your answer'}</i></td></tr>)}
        </tbody></table>

        {regs.length > 0 && <>
          <p className="pxdoc-h">2. The law this policy follows</p>
          <ul className="pxdoc-law">{regs.map(r => <li key={r.reference_key}>{r.official_name}</li>)}</ul>
        </>}

        {covers.length > 0 && <>
          <p className="pxdoc-h">3. What this policy sets out</p>
          <ul className="pxdoc-covers">{covers.map((c, i) => <li key={i}>{c}</li>)}</ul>
        </>}

        <div className="pxdoc-bars"><i /><i /><i /><i /></div>
        <p className="pxdoc-redact">
          {elements ? `${elements} required elements are checked in the full policy. ` : ''}The wording is written for your service, so it is not shown here.
        </p>
      </div>
    </figure>
  )
}
