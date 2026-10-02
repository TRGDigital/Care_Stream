import PDFDocument from 'pdfkit'

// The free checklist sent from the email capture overlay: "what to check before you buy" for one
// course or one policy. Built from the product's own record (a course's lessons, assessment and
// refresher; a policy's legal required elements and the people it names), so every one of the
// 164 is specific to its product and stays current as the record changes.
//
// The checks are written to be useful whoever the buyer buys from. CareStream appears once, in a
// panel at the end. CPD is only mentioned for a course that is CPD Certified.

export type TrainingChecklist = {
  funnel: 'training'; slug: string; title: string
  lessons: string[]; minutes: number | null; questions: number | null; passMark: number
  frequency: string | null; practical: boolean; cpd: boolean
}
export type PolicyChecklist = {
  funnel: 'policies'; slug: string; title: string
  regulations: { name: string; elements: string[] }[]
  /** The policy's own intake labels (its leads and dates), not the shared company details. */
  ownFields: string[]
}
export type ChecklistData = TrainingChecklist | PolicyChecklist

const ORANGE = '#F28C38', INK = '#1A1530', BODY = '#3A3245', MUTED = '#6B6577', LINE = '#E4DEEC'
const SITE = 'https://www.carestreamai.com'
const RENEW: Record<string, string> = { annual: 'every year', biennial: 'every two years', triennial: 'every three years' }

let logoCache: Buffer | null | undefined
async function logo(): Promise<Buffer | null> {
  if (logoCache !== undefined) return logoCache
  try {
    const r = await fetch(`${SITE}/logo-color.png`, { signal: AbortSignal.timeout(5000) })
    logoCache = r.ok ? Buffer.from(await r.arrayBuffer()) : null
  } catch { logoCache = null }
  return logoCache
}

const KEEP_CAPS = /^(Gas Safe|Caldicott|Freedom to Speak Up|ICO|CQC)/
const inSentence = (s: string) => (KEEP_CAPS.test(s) || !/^[A-Z][a-z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1))
const isFact = (s: string) => /^(date|ico registration|regulated activities)/i.test(s)
function factCheck(label: string): string {
  const m = label.match(/^date of (last )?(.*)$/i)
  if (m) return `States the date of your ${m[1] ? 'last ' : ''}${inSentence(m[2])}`
  if (/^regulated activities/i.test(label)) return 'Describes the regulated activities and services you actually provide'
  return `States your ${inSentence(label)}`
}
const durationText = (m: number) => (m < 60 ? `about ${m} minutes` : `about ${Math.round((m / 60) * 10) / 10} hours`)

type Section = { title: string; intro?: string; items: string[] }

function trainingSections(d: TrainingChecklist): { heading: string; intro: string; sections: Section[]; panel: string[] } {
  const cc = d.slug === 'care-certificate'
  const evidence = [
    'A certificate for each member of staff showing their name, the course, the date they completed it and their score',
    'A scored final assessment with a stated pass mark, not just a completion tick',
    'A training record you can show an inspector on the day, for every member of staff, without chasing paperwork',
    d.frequency && RENEW[d.frequency]
      ? `A clear refresher date, with reminders before a certificate lapses (we set ${d.title} to renew ${RENEW[d.frequency]})`
      : 'Clarity on whether and when it needs refreshing, and who will remind you',
  ]
  if (d.practical) {
    evidence.push('An observed competency assessment in the workplace, with a checklist for the manager to sign. Online learning covers the knowledge only.')
  }
  const ask = [
    cc
      ? 'Is it built on the Care Certificate standards as updated in March 2025, including the new standard on awareness of learning disability and autism?'
      : 'Is the content current with today\'s guidance, and when was it last reviewed?',
    'If it is described as CPD certified, can you find the course on The CPD Certification Service\'s register?',
    'Can staff complete it in their first language, while your records stay in English?',
    'What happens when someone gets an answer wrong: a follow-up on that point, or just another attempt?',
    'Can staff do it on a phone, and pick up where they left off?',
    'How long does a licence last, and is an unused licence refundable?',
    'Can you buy for one person, without a subscription or a minimum order?',
  ]
  const sections: Section[] = []
  if (d.lessons.length) {
    sections.push({
      title: cc ? 'Does it cover all 16 standards?' : 'Does it cover everything it should?',
      intro: cc
        ? 'A complete Care Certificate course covers every one of the 16 standards. Tick each one off against the provider\'s syllabus.'
        : `The topics a complete ${d.title} course covers. Tick each one off against the provider's syllabus.`,
      items: d.lessons,
    })
  }
  sections.push({
    title: 'Will it give you the evidence CQC asks for?',
    intro: 'Regulation 18 requires staff to receive the training they need for their role, and an inspector will ask you to show it.',
    items: evidence,
  })
  sections.push({ title: 'Questions to ask the provider', items: ask })
  const panel = [
    `${d.lessons.length} lessons${d.minutes ? `, ${durationText(d.minutes)}` : ''}, each with a care scenario and a quick check`,
    d.questions ? `A ${d.questions} question final assessment, pass mark ${d.passMark}%` : `A scored final assessment, pass mark ${d.passMark}%`,
    'A certificate for every member of staff, on their training record for your CQC evidence',
    'A follow-up lesson on anything they get wrong, and over 60 languages',
    ...(d.practical ? ['The observed competency checklist included, for the manager to sign'] : []),
    ...(d.cpd ? ['CPD Certified by The CPD Certification Service'] : []),
    'No subscription, and any licence not yet started is refunded in full within 14 days',
  ]
  return {
    heading: `Buying ${d.title} training?`,
    intro: `Use this before you buy ${d.title} training from any provider. Tick each one off. If a course cannot show you these, it will be hard to evidence when CQC asks.`,
    sections, panel,
  }
}

function policySections(d: PolicyChecklist): { heading: string; intro: string; sections: Section[]; panel: string[] } {
  const total = d.regulations.reduce((n, r) => n + r.elements.length, 0)
  const people = d.ownFields.filter(f => !isFact(f)).map(f => `Names your ${inSentence(f)}`)
  const facts = d.ownFields.filter(isFact).map(factCheck)
  const sections: Section[] = d.regulations.filter(r => r.elements.length).map(r => ({
    title: r.name,
    intro: 'What your policy must cover under this law or regulation.',
    items: r.elements,
  }))
  sections.push({
    title: 'Is it really written for your service?',
    intro: 'A template with a find and replace on the home name is the most common thing inspectors spot.',
    items: [
      'Names your service, your registered address, and your CQC provider and location IDs',
      'Names your registered manager and your nominated individual',
      ...people, ...facts,
      'Describes what your service actually does, not what a template assumes you do',
      'Has a version number, an approval signature and a review date',
      'Has no other provider\'s name or details left in it',
    ],
  })
  sections.push({
    title: 'Questions to ask before you buy',
    items: [
      'Who wrote it, and has a person read it for your service before it carries your name?',
      'Has it been checked against every required element of the law above?',
      'Is it updated when the law changes, and will you be told what changed and why?',
      'Can your staff read and understand it, in their own language if they need to?',
      'What happens if it is not right for your service?',
    ],
  })
  return {
    heading: `Buying a ${d.title}?`,
    intro: `Use this whether you buy a ${d.title}, write your own or have one written for you. ${total ? `There are ${total} required elements across the law it follows.` : ''} Tick each one off.`,
    sections,
    panel: [
      'Written for your organisation from your answers, never a template',
      total ? `Checked against all ${total} required elements before a person signs it off` : 'Checked against the law before a person signs it off',
      'Read and approved by a person, on your own letterhead with a sign-off and version block',
      'Updated when the law changes, and you are told what changed and why',
      'Delivered within 2 working days of your answers',
      'Not right for your service? Refunded in full within 14 days',
    ],
  }
}

export async function checklistPdf(d: ChecklistData): Promise<Buffer> {
  const c = d.funnel === 'training' ? trainingSections(d) : policySections(d)
  const url = `${SITE}/${d.funnel === 'training' ? 'staff-training' : 'care-policies'}/${d.slug}?utm_source=carestream&utm_medium=email&utm_campaign=capture_checklist`
  const logoPng = await logo()

  const doc = new PDFDocument({ size: 'A4', bufferPages: true, margins: { top: 50, bottom: 56, left: 50, right: 50 }, info: { Title: `${c.heading} Checklist`, Author: 'CareStream' } })
  const chunks: Buffer[] = []
  doc.on('data', (b: Buffer) => chunks.push(b))
  const done = new Promise<Buffer>(res => doc.on('end', () => res(Buffer.concat(chunks))))
  const W = doc.page.width - 100
  const bottom = () => doc.page.height - 70

  // Header: the colour logo on white, as on the site, with an orange rule beneath.
  if (logoPng) { try { doc.image(logoPng, 50, 34, { height: 36 }) } catch { /* no logo */ } }
  doc.fillColor('#B4581A').font('Helvetica-Bold').fontSize(9).text('FREE CHECKLIST', 50, 48, { width: W, align: 'right', characterSpacing: 1.5 })
  doc.rect(50, 86, W, 2).fill(ORANGE)
  doc.y = 110

  doc.fillColor(INK).font('Helvetica-Bold').fontSize(22).text(c.heading, 50, doc.y, { width: W })
  doc.moveDown(0.15)
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(13).text('What to check before you buy', { width: W })
  doc.moveDown(0.5)
  doc.fillColor(BODY).font('Helvetica').fontSize(10.5).text(c.intro, { width: W, lineGap: 2 })
  doc.moveDown(0.8)

  const box = (x: number, y: number) => doc.lineWidth(1).roundedRect(x, y + 1.5, 9, 9, 1.5).strokeColor(INK).stroke()

  for (const s of c.sections) {
    if (doc.y > bottom() - 60) doc.addPage()
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(13).text(s.title, 50, doc.y, { width: W })
    doc.moveTo(50, doc.y + 3).lineTo(50 + W, doc.y + 3).lineWidth(1).strokeColor(LINE).stroke()
    doc.moveDown(0.5)
    if (s.intro) { doc.fillColor(MUTED).font('Helvetica').fontSize(9.5).text(s.intro, 50, doc.y, { width: W, lineGap: 1.5 }); doc.moveDown(0.4) }
    for (const item of s.items) {
      const h = doc.font('Helvetica').fontSize(10.5).heightOfString(item, { width: W - 20, lineGap: 1.5 })
      if (doc.y + h > bottom()) doc.addPage()
      const y = doc.y
      box(50, y)
      doc.fillColor(BODY).font('Helvetica').fontSize(10.5).text(item, 70, y, { width: W - 20, lineGap: 1.5 })
      doc.moveDown(0.35)
    }
    doc.moveDown(0.6)
  }

  // CareStream panel
  const panelH = 46 + c.panel.length * 16 + 34
  if (doc.y + panelH > bottom()) doc.addPage()
  const py = doc.y
  doc.roundedRect(50, py, W, panelH, 10).fill('#FFF6EE')
  doc.fillColor(INK).font('Helvetica-Bold').fontSize(12.5).text(`How CareStream's ${d.title}${d.funnel === 'training' ? ' course' : ''} measures up`, 66, py + 14, { width: W - 32 })
  let y = py + 38
  for (const p of c.panel) {
    doc.lineWidth(1.6).strokeColor('#1F8A5B').moveTo(66, y + 6).lineTo(69.5, y + 9.5).lineTo(75, y + 2.5).stroke()
    doc.fillColor(BODY).font('Helvetica').fontSize(10).text(p, 82, y, { width: W - 48 })
    y += 16
  }
  doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(10.5).text('See it on carestreamai.com', 66, y + 8, { link: url, underline: true })

  // Footer on every page
  const pages = doc.bufferedPageRange()
  for (let i = pages.start; i < pages.start + pages.count; i++) {
    doc.switchToPage(i)
    doc.page.margins.bottom = 0   // writing below the bottom margin would otherwise add a page
    doc.fillColor(MUTED).font('Helvetica').fontSize(8)
      .text(`CareStream · carestreamai.com · Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 36, { width: W, align: 'center', lineBreak: false })
  }
  doc.end()
  return done
}
