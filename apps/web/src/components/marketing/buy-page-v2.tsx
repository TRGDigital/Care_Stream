import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { careSetting } from '@/lib/care-setting'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema } from '@/lib/schema'
import { BuyForm } from './buy-form'
import './buy-page-v2.css'

// The rebuilt /buy/<slug> template. Renders the SAME module record the current page renders.
//
// Measured before building, the way /care-policies was: 19 of the 25 long paragraphs on a buy
// page are identical across modules once the title is substituted, and ALL of the remaining six
// come from the training API. So the prose is template copy, the rest is data, and this family
// needs no content extraction, no seed and no re-import.
//
// That template copy made the 98 buy pages about 80% identical to each other, and Search
// Console began folding some together ("Duplicate without user-selected canonical"). So the
// page now also renders what is genuinely different per module, all from the same record:
// outcomes, every lesson, key points, the real assessment length, renewal, the practical
// requirement, and FAQs answered from those facts.
//
// Standards are deliberately NOT shown: only 10 modules carry them, and the stored labels are a
// snapshot of the catalogue at mapping time (the pre-March 2025 fifteen Care Certificate
// standards on four modules, with em dashes). Re-map them before surfacing them publicly.

export interface BuyModule {
  slug: string
  title: string
  summary?: string | null
  group_label?: string | null
  duration_minutes?: number | null
  cpd_accredited?: boolean | null
  illustration_url?: string | null
  sections?: Array<{ heading: string; body?: string | null; image_url?: string | null }>
  outcomes?: string[]
  key_points?: string[]
  standards?: string[]
  frequency?: string | null
  requires_practical?: boolean | null
  question_count?: number | null
  pass_mark?: number | null
}

export interface BuyRelated { slug: string; title: string; group_label?: string | null }

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

const Back = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
)

const Plus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)

const POINTS: [string, string][] = [
  ['Teach, then assess',
   'A full lesson with a real care scenario, followed by an assessment that checks they can apply it.'],
  ['Over 60 languages',
   'Staff read the lesson and answer in their first language. Your records stay in English.'],
  ['Wrong answers get followed up',
   'A short micro-lesson goes back to the staff member on the exact point they missed, then they retry.'],
  ['Evidence you can hand over',
   'A dated completion record and a certificate per person, ready for your CQC file.'],
]

const STEPS: [string, string][] = [
  ['Pay by card',
   'Checkout takes a minute. Your licences and a receipt arrive by email straight away.'],
  ['Add your staff',
   'Enter their names and emails, or paste a list. They get an invite to the hub on any device.'],
  ['They complete it in their own time',
   'You see who has finished, their score, and their certificate as each one comes in.'],
]

const TRUST: [string, string][] = [
  ['A certificate per person',
   'Dated, named, and downloadable as a PDF for your training file.'],
  ['Their first language',
   'Over 60 languages, chosen per staff member. Your reporting stays in English.'],
  ['No subscription',
   'Buy one module for one person if that is all you need. Nothing recurring.'],
  ['Twelve months to use it',
   'Licences do not expire the moment you buy. Staff have a year to complete.'],
]

// The theme's six, in its order. The first answer has two paragraphs, split on the blank line.
const FAQS: [string, string][] = [
  ['Do I need a CareStream subscription to buy this?',
   'No. This page exists precisely so you do not. You buy the licences you need, your staff '
   + 'complete the module in the CareStream hub, and that is the end of it. There is no trial '
   + 'to start, no card kept on file, and no subscription that begins quietly afterwards.'
   + '\n\nIf you later decide you want the full platform, anything your staff have already '
   + 'completed carries across into your account.'],
  ['What does one licence actually cover?',
   'One licence covers one named member of staff for this one module, including the lesson, the '
   + 'assessment, any follow-up questions triggered by a wrong answer, and their certificate. '
   + 'Licences are not shared between people, because the completion record has to belong to an '
   + 'individual to be worth anything at inspection.'],
  ['How quickly can staff start?',
   'Immediately. The licences are on your account as soon as the payment clears, and staff get '
   + 'their invite the moment you add them. There is no onboarding call and no setup period.'],
  ['Can staff complete it in another language?',
   'Yes. Each staff member has a first language on their profile, and the lesson, the questions '
   + 'and the feedback all arrive in it. They answer in that language too. What you see as a '
   + 'manager stays in English, so the record reads the same whoever completed it.'],
  ['What if someone fails the assessment?',
   'Nothing is lost. A wrong answer triggers a short follow-up lesson on that specific point, and '
   + 'they retry it. The record shows the improvement from the first attempt to the latest, which '
   + 'is stronger evidence than a single pass mark, because it shows the gap was found and closed.'],
  ['Can I buy for more than one service?',
   'Yes. Buy the total number of licences you need and allocate them across your services when '
   + 'you add staff. If you are licensing for a group and want an invoice rather than a card '
   + 'payment, get in touch and we will raise one.'],
]

function firstSentence(text: string) {
  return (text || '').match(/[^.!?]+[.!?]+/)?.[0].trim() ?? text
}

/** The first two sentences, which is what the theme's generator uses for the intro. */
function twoSentences(text: string) {
  const parts = (text || '').match(/[^.!?]+[.!?]+/g)
  return parts ? parts.slice(0, 2).join(' ').trim() : (text || '').trim()
}

const RENEWAL: Record<string, [string, string]> = {
  annual:    ['Every year',        'renews every year'],
  biennial:  ['Every two years',   'renews every two years'],
  triennial: ['Every three years', 'renews every three years'],
  once:      ['Once',              'is completed once rather than renewed on a cycle'],
}

/** "A, B and C" */
function listOf(items: string[]) {
  return items.length < 2 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/** Questions answered from this module's own facts, ahead of the six about licensing. */
function moduleFaqs(m: BuyModule, lessons: string[]): [string, string][] {
  const out: [string, string][] = []
  const q = m.question_count, pass = m.pass_mark ?? 80, mins = m.duration_minutes
  if (mins) {
    out.push([`How long does ${m.title} training take?`,
      `About ${mins} minutes, across ${lessons.length} short lessons`
      + (q ? `, followed by a ${q} question assessment with a pass mark of ${pass}%.` : '.')
      + ' Staff can stop and pick up where they left off.'])
  }
  if (lessons.length) {
    out.push([`What does the ${m.title} module cover?`,
      `${lessons.length} lessons: ${listOf(lessons)}. Each one pairs the teaching with a care scenario and a quick check.`])
  }
  const renew = m.frequency ? RENEWAL[m.frequency] : undefined
  if (renew) {
    out.push([`How often do staff need to refresh ${m.title}?`,
      m.frequency === 'once'
        ? `This module ${renew[1]}. Refresh it when your policy changes or a staff member moves into a role where it matters more.`
        : `CareStream sets this module so it ${renew[1]}. Staff and managers are reminded before a certificate lapses, so the refresher is booked before the gap appears.`])
  }
  out.push(m.requires_practical
    ? [`Does ${m.title} need a practical assessment?`,
       'Yes. The online module is the knowledge part. Staff also need an observed assessment in the workplace, carried out by their employer, and CareStream provides the observation checklist to record it.']
    : [`Is ${m.title} completed fully online?`,
       'Yes. It is knowledge based, so staff complete the lessons and the assessment online and receive their certificate at the end. There is no practical sign-off.'])
  return out
}

export function BuyPageV2({ module: m, unitPence, related, apiUrl }: {
  module: BuyModule
  unitPence: number
  related: BuyRelated[]
  apiUrl: string
}) {
  const minutes = m.duration_minutes ?? 0
  // Exactly the theme's line, including the fixed assessment length, which its generator
  // hard-codes rather than reading from the record.
  const qCount = m.question_count ?? null
  const meta = [m.group_label, minutes ? `${minutes} minutes` : '', qCount ? `${qCount} question assessment` : '',
                m.cpd_accredited ? 'CPD approved' : '']
    .filter(Boolean).join(' · ')
  const img = (u?: string | null) => (u ? `${apiUrl}${u}` : null)
  const hero = img(m.illustration_url)
  const wide = img(m.sections?.[0]?.image_url)
  // Every lesson, not the first five: the lesson list is the most module-specific thing here.
  const curriculum = m.sections ?? []
  const lessons = curriculum.map(s => careSetting(s.heading)).filter(Boolean)
  const outcomes = (m.outcomes ?? []).map(careSetting).filter(Boolean)
  const keyPoints = (m.key_points ?? []).map(careSetting).filter(Boolean)
  const renew = m.frequency ? RENEWAL[m.frequency] : undefined
  const facts: [string, string][] = [
    ...(minutes ? [['Time to complete', `About ${minutes} minutes, ${lessons.length} lessons`] as [string, string]] : []),
    ...(qCount ? [['Assessment', `${qCount} questions, pass mark ${m.pass_mark ?? 80}%`] as [string, string]] : []),
    ...(renew ? [['Refresher', renew[0]] as [string, string]] : []),
    ['Practical assessment', m.requires_practical ? 'Yes, observed by the employer, checklist provided' : 'None, completed fully online'],
  ]
  const faqs: [string, string][] = [...moduleFaqs(m, lessons), ...FAQS]

  return (
    <div className="bypage-v2">
      {/* The FAQs are visible on the page, so they can be described to search as FAQPage. */}
      <JsonLd data={faqPageSchema(faqs.map(([question, answer]) => ({ question, answer: answer.replace(/\n\n/g, ' ') })))} />
      <section className="byhero">
        <div className="bywrap">
          <Link className="byback" href={`/staff-training/${m.slug}`}>
            <Back /> Back to {m.title}
          </Link>
          <div className="byhero-in">
            <div>
              <div className="bymod">
                {hero && (
                  <div className="bythumbshot">
                    <SiteImage src={hero} alt={m.title} priority />
                  </div>
                )}
                <div>
                  <span className="byeyebrow">Buy training · no subscription</span>
                  <p className="bymod-meta">{meta}</p>
                </div>
              </div>
              <h1>{m.title} training for your team</h1>
              <p className="lede">
                Licence this one module for the staff who need it. No CareStream subscription, no
                minimum order, no annual contract. One licence covers one member of staff for the
                complete <strong>{m.title}</strong> module, in the language they think in.
              </p>
              <ul className="bypoints">
                {POINTS.map(([title, body]) => (
                  <li key={title}>
                    <span className="ic"><Tick /></span>
                    <span><b>{title}</b><span>{body}</span></span>
                  </li>
                ))}
              </ul>
            </div>

            {/* The real checkout, in the theme's panel. One form component, two skins, so the
                payment path cannot drift from the one the current page uses. */}
            <BuyForm slug={m.slug} moduleName={m.title} unitPence={unitPence} variant="theme" />
          </div>
        </div>
      </section>

      <section className="bysec">
        <div className="bywrap">
          <span className="bylabel-sec">What is in this module</span>
          <h2>{m.title}, start to finish.</h2>
          <p className="intro">
            {careSetting(twoSentences(m.summary ?? ''))} This is the same module CareStream subscribers get,
            written for care settings rather than adapted from a generic course.
            {minutes ? ` It runs about ${minutes} minutes${qCount ? ` and ends with a ${qCount} question assessment` : ''}.` : ''}
          </p>
          <div className="bysplit">
            <ul className="bycurric">
              {curriculum.map((s, i) => (
                <li key={i}>
                  <span className="n" />
                  {/* The theme lists each lesson with its first sentence, not the whole body. */}
                  <span><b>{careSetting(s.heading)}</b>{s.body && <p>{careSetting(firstSentence(s.body))}</p>}</span>
                </li>
              ))}
            </ul>
            {wide && (
              <div className="byshot wide">
                <SiteImage src={wide} alt={careSetting(curriculum[0]?.heading) || m.title} />
              </div>
            )}
          </div>
        </div>
      </section>

      {outcomes.length > 0 && (
        <section className="bysec tint">
          <div className="bywrap">
            <span className="bylabel-sec">Learning outcomes</span>
            <h2>What your team will be able to do.</h2>
            <ul className="bypoints bylist">
              {outcomes.map(o => (
                <li key={o}><span className="ic"><Tick /></span><span>{o}</span></li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="bysec">
        <div className="bywrap">
          <span className="bylabel-sec">At a glance</span>
          <h2>{m.title} in facts.</h2>
          <div className="bytrust">
            {facts.map(([title, body]) => (
              <div key={title}><b>{title}</b><p>{body}</p></div>
            ))}
          </div>
          {keyPoints.length > 0 && (
            <>
              <h3 className="bykp-h">What staff come away with</h3>
              <ul className="bycurric">
                {keyPoints.map((k, i) => (
                  <li key={i}><span className="n" /><span><p>{k}</p></span></li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section className="bysec tint">
        <div className="bywrap">
          <span className="bylabel-sec">After you buy</span>
          <h2>Three steps, and nothing to set up.</h2>
          <div className="bysteps">
            {STEPS.map(([title, body], i) => (
              <div className="bystepcard" key={title}>
                <span className="n">{String(i + 1).padStart(2, '0')}</span>
                <b>{title}</b><p>{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bysec">
        <div className="bywrap">
          <span className="bylabel-sec">What you get</span>
          <h2>Everything a licence includes.</h2>
          <div className="bytrust">
            {TRUST.map(([title, body]) => (
              <div key={title}><b>{title}</b><p>{body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="bysec tint">
        <div className="bywrap">
          <span className="bylabel-sec">Questions</span>
          <h2>Before you buy.</h2>
          <div className="byfaq">
            {faqs.map(([q, a]) => (
              <details key={q}>
                <summary>{q}<Plus /></summary>
                <div className="ans">{a.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bysec">
          <div className="bywrap">
            <span className="bylabel-sec">Other modules</span>
            <h2>Licence any of these the same way.</h2>
            <p className="intro">Same price, same terms, no subscription needed.</p>
            <div className="byother">
              {related.map(r => (
                <Link href={`/buy/${r.slug}`} key={r.slug}>
                  <span>
                    {r.group_label && <span className="grp">{r.group_label}</span>}
                    <b>{r.title}</b>
                  </span>
                  <Arrow />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
