import Link from 'next/link'
import { SiteImage } from '@/components/site-image'
import { careSetting } from '@/lib/care-setting'
import { BuyForm } from './buy-form'
import './buy-page-v2.css'

// The rebuilt /buy/<slug> template. Renders the SAME module record the current page renders.
//
// Measured before building, the way /care-policies was: 19 of the 25 long paragraphs on a buy
// page are identical across modules once the title is substituted, and ALL of the remaining six
// come from the training API. So the prose is template copy, the rest is data, and this family
// needs no content extraction, no seed and no re-import.

export interface BuyModule {
  slug: string
  title: string
  summary?: string | null
  group_label?: string | null
  duration_minutes?: number | null
  cpd_accredited?: boolean | null
  illustration_url?: string | null
  sections?: Array<{ heading: string; body?: string | null; image_url?: string | null }>
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

export function BuyPageV2({ module: m, unitPence, related, apiUrl }: {
  module: BuyModule
  unitPence: number
  related: BuyRelated[]
  apiUrl: string
}) {
  const minutes = m.duration_minutes ?? 0
  // Exactly the theme's line, including the fixed assessment length, which its generator
  // hard-codes rather than reading from the record.
  const meta = [m.group_label, minutes ? `${minutes} minutes` : '', '20 question assessment',
                m.cpd_accredited ? 'CPD approved' : '']
    .filter(Boolean).join(' · ')
  const img = (u?: string | null) => (u ? `${apiUrl}${u}` : null)
  const hero = img(m.illustration_url)
  const wide = img(m.sections?.[0]?.image_url)
  const curriculum = (m.sections ?? []).slice(0, 5)

  return (
    <div className="bypage-v2">
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
            {minutes ? ` It runs about ${minutes} minutes and ends with a 20 question assessment.` : ''}
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
            {FAQS.map(([q, a]) => (
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
