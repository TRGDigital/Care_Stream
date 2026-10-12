// FAQ v2 (October 2026): one set of questions per course page, straight under the price.
//
// ONE switch. While FAQ_V2_LIVE is false production renders exactly what it did before; the
// preview build of the `faq-v2-demo` branch turns it on by itself (next.config.mjs sets
// NEXT_PUBLIC_FAQ_V2_PREVIEW only for that branch's Vercel preview). Going live is flipping the
// constant below to true. Nothing else needs to change.
//
// What it does when on:
//   - the course page shows ONE question set, directly under the buy box (both Test 1 variants,
//     phone and desktop). The first three answers are open, the rest are an accordion. The old
//     "About this course" set and the bottom "Frequently asked questions" block are not rendered.
//   - every answer leads with the answer, stays short, and ends with ONE next step: "Try a real
//     lesson" (opens the lesson preview) or "See your team price" (scrolls to the team prices).
//   - the first answer matches the search that brought the visitor: ?intent= (the ad group or
//     sitelink), else utm_term. Worked out on the server, so nothing jumps after load.
//   - the facts Len confirmed on 12 Oct 2026 are applied across the course template:
//       1. the Care Certificate course is an annual refresher that can be used as part of an
//          induction (it does not replace induction);
//       2. all staff complete it once a year, so the renewal date and reminders are right;
//       3. on a course with a practical sign-off (requires_practical) the certificate is issued
//          once the manager has signed off the observation, so never "instant" on those;
//       4. the certificate is in the staff member's name, so they keep it and can show it to
//          future employers (each employer decides what it accepts);
//       5. prices are + VAT.
//
// Funnel Insights: the questions stay <details>/<summary> inside .pxfaq, so the tracker still
// records faq-q:side:<question slug> when one is opened. The next step links carry
// data-fi="faq-cta:try-lesson:<question slug>" or "faq-cta:team-price:<question slug>".
//
// Site copy rules: no em or en dashes; never "CQC approved"; no Skills for Care endorsement;
// no urgency beyond a live offer's real end date.

import { DISCOUNT_TIERS, durationText, refreshWord } from './training-commerce'

export const FAQ_V2_LIVE = false

export const FAQ_V2 = FAQ_V2_LIVE || process.env.NEXT_PUBLIC_FAQ_V2_PREVIEW === '1'

/** How often a course is repeated, with Len's confirmation for the Care Certificate (12 Oct 2026:
 *  an annual refresher, once a year for all staff). The module record still says 'once'. */
export function effectiveFrequency(slug: string, f: string | null | undefined): string | null | undefined {
  return FAQ_V2 && slug === 'care-certificate' ? 'annual' : f
}

/** The certificate line for a course: never "instant" where a manager signs off an observation. */
export function certificateWhen(practical: boolean | undefined): string {
  return practical ? 'once you sign off the observation' : 'as soon as they pass'
}

export type FaqCta = 'try' | 'price'
export const CTA_LABEL: Record<FaqCta, string> = { try: 'Try a real lesson', price: 'See your team price' }
export const CTA_KEY: Record<FaqCta, string> = { try: 'try-lesson', price: 'team-price' }

export type FaqId =
  | 'pay' | 'cqc' | 'time' | 'price' | 'languages' | 'try' | 'phone' | 'induction'
  | 'renew' | 'cert' | 'invoice' | 'refund'

export interface FaqV2Item {
  id: FaqId
  q: string
  /** The answer in one to five words: "Yes.", "About 1 hour." Shown in bold. */
  lead: string
  /** One to three short sentences after the lead. */
  body: string
  cta: FaqCta
  /** Show the live offer (if one is running) under this answer. */
  offer?: boolean
}

export interface FaqV2Module {
  slug: string
  title: string
  estMinutes: number
  duration_minutes?: number | null
  lessons: number
  question_count?: number | null
  pass_mark?: number | null
  frequency?: string | null
  requires_practical?: boolean
  cpd_accredited?: boolean
}

const money = (p: number) => `£${(p / 100).toFixed(2)}`

/** The same slug the Funnel Insights tracker makes of a question's text. */
export function faqSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64)
}

/** The question set for one course page, in the default order: the three objections that stop a
 *  care manager buying first (what am I paying for, will CQC accept it, why this long), then the
 *  rest. Built from the module record only, so every course gets answers true for it. */
export function faqV2Items(m: FaqV2Module, opts: { unitPence: number; hasDemo: boolean; hasActivity?: boolean }): FaqV2Item[] {
  const cc = m.slug === 'care-certificate'
  const practical = !!m.requires_practical
  const cpd = !!m.cpd_accredited
  const q = m.question_count ?? null
  const pass = m.pass_mark ?? 80
  const time = durationText(m.estMinutes)
  const freq = effectiveFrequency(m.slug, m.frequency)
  const renews = freq === 'annual' || freq === 'biennial' || freq === 'triennial'
  const lessonWord = cc ? `all ${m.lessons || 16} lessons, one for each standard` : m.lessons ? `all ${m.lessons} lessons` : 'the full course'
  const test = q ? `the ${q} question assessment` : 'the final assessment'
  // Without a lesson preview on the page, "Try a real lesson" has nothing to open.
  const tryOr = (c: FaqCta): FaqCta => (c === 'try' && !opts.hasDemo ? 'price' : c)
  const cpdHours = cpd ? Math.round(((m.duration_minutes || m.estMinutes) / 60) * 10) / 10 : null

  const out: FaqV2Item[] = []

  // (a) What am I paying for?
  out.push(practical ? {
    id: 'pay', q: 'What exactly am I paying for?', cta: tryOr('try'),
    lead: 'The knowledge and the test, online.',
    body: `Each licence gives one member of staff ${lessonWord}, ${test} and a follow-up lesson on anything they get wrong. `
      + `Your manager or assessor then watches them ${cc ? 'at work' : 'in practice'}, using the observation checklist we provide. `
      + `The certificate is issued once you sign off the observation.`,
  } : {
    id: 'pay', q: 'What exactly am I paying for?', cta: tryOr('try'),
    lead: 'The full course and a certificate.',
    body: `Each licence gives one member of staff ${lessonWord}, ${test} and a follow-up lesson on anything they get wrong. `
      + `They get a named, dated certificate${cpd ? ' with the CPD Certified mark' : ''} as soon as they pass. `
      + 'Licences last 12 months, with no subscription.',
  })

  // (b) Will CQC accept it?
  out.push({
    id: 'cqc', q: 'Will CQC accept this?', cta: 'price',
    lead: 'CQC does not approve any training, so no one can promise that.',
    body: `What inspectors look for is evidence. You get a named, dated certificate for each person, with their score`
      + `${cpd ? ' and the CPD Certified mark' : ''}, and a training record in your dashboard showing who has finished.`
      + `${practical ? ' Your signed observation checklist completes the picture.' : ''}`,
  })

  // (c) Why this long? Only the Care Certificate is compared with longer courses; the refreshers
  // answer the plain time question.
  out.push(cc ? {
    id: 'time', q: `Why only ${time}, when others take longer?`, cta: tryOr('try'),
    lead: 'Because it is an annual refresher, built in short lessons.',
    body: `There is one bitesize lesson for each of the ${m.lessons || 16} standards, each with a care scenario and a quick check, then ${test}.`
      + `${cpdHours ? ` It is CPD Certified at ${cpdHours} CPD hours.` : ''} Skills are then checked at work, through your observation.`,
  } : {
    id: 'time', q: 'How long does it take?', cta: tryOr('try'),
    lead: `About ${time}.`,
    body: `${m.lessons ? `It is ${m.lessons} short lessons, each with a care scenario and a quick check, then ` : 'The course finishes with '}`
      + `${test} with a pass mark of ${pass}%. Staff can stop and pick up where they left off, on a phone, tablet or computer, so it fits around shifts.`,
  })

  // Team price, with the live offer under it (rendered from the offer engine, never hard coded).
  const tiers = [...DISCOUNT_TIERS].reverse()
  const tierText = tiers.map((t, i) => (i === 0 ? `${t.pct}% off from ${t.min} licences` : `${t.pct}% from ${t.min}`))
  out.push({
    id: 'price', q: 'How much is it for my team?', cta: 'price', offer: true,
    lead: `${money(opts.unitPence)} + VAT per person, less for a team.`,
    body: `Prices drop automatically in your basket: ${tierText.slice(0, -1).join(', ')} and ${tierText[tierText.length - 1]}. `
      + 'If an offer is running, you get whichever saving is bigger, plus any free licences it gives.',
  })

  out.push({
    id: 'languages', q: 'Can my staff do it in their own language?', cta: tryOr('try'),
    lead: 'Yes, in over 60 languages.',
    body: `One tap turns any lesson or question into their language, so they understand each ${cc ? 'standard' : 'lesson'}, not just pass it. `
      + 'Your records and certificates stay in English, ready for your evidence. Try the language buttons in the real lesson.',
  })

  if (opts.hasDemo) {
    out.push({
      id: 'try', q: 'Can I try it before I buy?', cta: 'try',
      lead: 'Yes, right here on this page.',
      body: `Open a real lesson, question${opts.hasActivity ? ' and activity' : ''} from this course, exactly as your staff will see it. `
        + `It takes about ${opts.hasActivity ? 3 : 2} minutes. Get a question wrong and you will see the follow-up lesson your staff get.`,
    })
  }

  out.push({
    id: 'phone', q: 'How do staff do it on their phone?', cta: tryOr('try'),
    lead: 'On any phone, tablet or computer.',
    body: 'Straight after payment, add your staff and each one gets an invite to the CareStream hub. '
      + 'They can stop and pick up where they left off. You see who has started, who has finished and every score from your dashboard.',
  })

  if (cc) {
    out.push({
      id: 'induction', q: 'Can I use it for new starters’ induction?', cta: 'price',
      lead: 'Yes, as part of it.',
      body: `It is an annual refresher of all ${m.lessons || 16} Care Certificate standards, and you can use it within your induction. `
        + 'It does not replace your induction: new starters still need your own induction and your observation at work. '
        + 'After that, all staff complete it once a year.',
    })
  }

  if (renews) {
    const every = refreshWord(freq)
    out.push(cc ? {
      id: 'renew', q: 'Do staff need to do it every year?', cta: 'price',
      lead: 'Yes, once a year.',
      body: 'All staff in care homes, nursing homes and home care should complete it every year. '
        + 'Each licence lasts 12 months, the certificate shows when it renews, and we remind you and them 90, 30 and 7 days before it is due.',
    } : {
      id: 'renew', q: 'How often do staff need to redo it?', cta: 'price',
      lead: `${every.charAt(0).toUpperCase()}${every.slice(1)}.`,
      body: `Most services refresh ${m.title} training ${every}. Each licence lasts 12 months, the certificate shows when it renews, `
        + 'and we remind you and them 90, 30 and 7 days before it is due. Your dashboard shows who is up to date.',
    })
  }

  out.push({
    id: 'cert', q: 'Can staff take the certificate to another job?', cta: 'price',
    lead: 'Yes, it is in their name.',
    body: 'So they keep it and can show it to future employers, though each employer decides what it accepts. '
      + `It shows their name, the course, their score, the date${renews ? ' and when it renews' : ''}`
      + `${cpd ? ', with the CPD Certified mark and CPD hours' : ''}. You can download it as a PDF.`,
  })

  out.push({
    id: 'invoice', q: 'Can we pay by invoice or purchase order?', cta: 'price',
    lead: 'Yes.',
    body: 'Ask for an invoice at checkout, or get a quote and pay by bank transfer. '
      + 'There is no subscription: you pay once for each licence, and nothing renews automatically. '
      + 'Training several homes? Ask for one quote for all of them.',
  })

  out.push({
    id: 'refund', q: 'What if I buy too many licences?', cta: 'price',
    lead: 'You get your money back.',
    body: 'Any licence that has not been started can be refunded in full within 14 days. '
      + 'Email us from the address you ordered with; you do not need to give a reason. The refund goes back to the card you paid with.',
  })

  return out
}

// ── Which answer opens first ────────────────────────────────────────────────────────────────

/** Ad group and sitelink keys (?intent=), most specific first. Each rule lists the answers to try,
 *  in order; the first one this course has wins (a refresher has no induction answer, so a new
 *  starter search on it falls through to the next). Keys come from course-cro.ts,
 *  course-cro-sitelinks.ts and course-cro-cpd.ts. */
const INTENT_RULES: [RegExp, FaqId[]][] = [
  [/(^|-)(languages?|lang|polish|hindi|urdu|romanian|overseas|sponsored|spons|esl|intl|international)(-|$)/, ['languages']],
  [/(^|-)(price|prices|pricing|cost|discount|licences|quote|no-subscription|buy-online)(-|$)/, ['price']],
  [/(^|-)(invoice)(-|$)/, ['invoice', 'price']],
  [/(^|-)(new-starters|new-staff|new-workers|induction|ind|onboarding|twelve-weeks|first-week|first-weeks|existing-staff)(-|$)/, ['induction', 'pay']],
  // "Get the Care Certificate online": what the online part is, and what the employer still does.
  [/(online|elearning|onl).*(cert|certificate)|(cert|certificate).*online/, ['pay']],
  [/(^|-)(compare|provider|reviews|best|equivalent|observation|competencies|assessor-guide|responsibilities)(-|$)/, ['pay']],
  [/(^|-)(refresher|reminders|renew|annual)(-|$)/, ['renew', 'time']],
  [/(^|-)(cqc|evidence|compliance|reg18|mandatory|mand|inspection|recognised|accredited|acc|cpd|certificate|sample-certificate|records?|cert)(-|$)/, ['cqc']],
  [/(^|-)(shifts|between-visits|mod-time|accelerated)(-|$)/, ['time']],
  [/(^|-)(online|elearning|el|onl|phone|dashboard|course|courses|modules|training)(-|$)/, ['phone']],
  [/(^|-)(try)(-|$)/, ['try']],
]

/** The same, for the search term itself (utm_term), in the words people type. */
const TERM_RULES: [RegExp, FaqId[]][] = [
  [/\b(language|languages|polish|hindi|urdu|romanian|tagalog|malayalam|nepali|translated|overseas|international|esl)\b/, ['languages']],
  [/\b(price|prices|cost|costs|cheap|cheapest|discount|how much|£|bulk)\b/, ['price']],
  [/\b(invoice|purchase order)\b/, ['invoice', 'price']],
  [/\b(induction|new starters?|new staff|new carers?)\b/, ['induction', 'pay']],
  [/\b(vs|versus|compare|comparison|best|review|reviews)\b/, ['pay']],
  [/\b(refresher|renew|renewal|annual|yearly|every year|expire|expires)\b/, ['renew', 'time']],
  [/\b(cqc|mandatory|evidence|requirement|required|inspection|inspector|accredited|cpd|certified|recognised)\b/, ['cqc']],
  [/\b(how long|hours|minutes|quick|fast)\b/, ['time']],
  [/\b(online|e-?learning)\b.*\bcertificate\b|\bcertificate\b.*\b(online|e-?learning)\b/, ['pay']],
  [/\b(online|e-?learning|phone|mobile|app)\b/, ['phone']],
  [/\b(free|trial|demo|sample)\b/, ['try']],
]

function pick(rules: [RegExp, FaqId[]][], text: string, have: Set<FaqId>): FaqId | null {
  for (const [re, ids] of rules) {
    if (!re.test(text)) continue
    const id = ids.find(i => have.has(i))
    if (id) return id
  }
  return null
}

/** The answer to open first for this visit, or null for the default order. */
export function firstFaqFor(items: FaqV2Item[], intent?: string, utmTerm?: string): FaqId | null {
  const have = new Set(items.map(i => i.id))
  const k = (intent ?? '').toLowerCase().trim()
  if (k) {
    const hit = pick(INTENT_RULES, k, have)
    if (hit) return hit
  }
  const t = (utmTerm ?? '').toLowerCase().replace(/\+/g, ' ').trim()
  if (t) return pick(TERM_RULES, t, have)
  return null
}

/** The items with the matched answer first; the rest keep the default order. */
export function orderFaqs(items: FaqV2Item[], first: FaqId | null): FaqV2Item[] {
  if (!first) return items
  const hit = items.find(i => i.id === first)
  return hit ? [hit, ...items.filter(i => i !== hit)] : items
}

/** Plain text of an answer, for the FAQPage structured data. */
export const faqPlain = (i: FaqV2Item) => `${i.lead} ${i.body}`
