// AI-sharpened outreach drafts for prospects. Builds a personalised email from
// the structured CQC signals we hold for the provider (the same signals shown in
// the Prospects UI), so the message is always consistent with the lead's segment.
//
// NB: we deliberately do NOT scrape the CQC location page. That page is mostly
// boilerplate plus a *current* rating summary which can be newer than our
// snapshot — feeding it in makes the model contradict the segment the user sees.
// Citing the actual report narrative (the genuinely useful enrichment) needs the
// deeper assessment-report/PDF + a freshness reconciliation; tracked as follow-up.
import { callClaude } from '../ai/claude'
import { ratingLabel, type Segment } from './scoring'

export interface DraftLead {
  name: string
  setting: string | null
  town: string | null
  county: string | null
  segment: Segment
  cqc_rating: string | null
  failing_domains: string[]
  lead_angle_label: string | null
  cqc_report_url: string | null
}

export interface AiDraft {
  subject: string
  body: string
  sources: 'cqc-report' | 'signals'
}

const SYSTEM = `You are an SDR for CareStream, an AI compliance assistant for UK care providers (CQC-regulated). CareStream gives providers: a live, always-current policy library (incl. safeguarding and medicines); evidenced staff training and competency records; continuous audits and a CQC-ready evidence base; and an AI assistant any staff member can ask a question of in their own language. Pricing is £49 to £129 per location per month.

Write a concise, warm, professional cold outreach email to a care provider. Rules:
- 110 to 160 words. Plain text. No markdown, no bullet points.
- Treat the CQC rating and flagged areas given below as current and authoritative; build the opening around them accurately.
- Connect their situation to the single most relevant CareStream capability. Do not list every feature.
- Do NOT invent statistics, percentages, time savings, client names, testimonials, or specific inspection findings beyond what is given. No fabricated numbers.
- End with a soft ask for a 15-minute call this week.
- British English. Do NOT use em or en dashes (— or –); use commas, full stops or the word "to".
- Output STRICT JSON: {"subject": "...", "body": "..."} and nothing else.`

export async function generateAiDraft(lead: DraftLead): Promise<AiDraft> {
  const location = [lead.town, lead.county].filter(Boolean).join(', ') || 'the UK'
  const failing = lead.failing_domains.length ? lead.failing_domains.join(', ') : 'none individually flagged'

  const userMessage = [
    `Provider: ${lead.name}`,
    `Setting: ${lead.setting ?? 'care provider'}`,
    `Location: ${location}`,
    `CQC overall rating: ${ratingLabel(lead.cqc_rating)}`,
    `CQC areas rated below Good: ${failing}`,
    `Lead segment: ${lead.segment} (rescue = Inadequate/Requires Improvement; protect = Good but an area slipping; maintain = solid Good; defend = Outstanding; unrated = not yet rated)`,
    `Most relevant CareStream capability to lead with: ${lead.lead_angle_label ?? 'compliance and evidence'}`,
  ].join('\n')

  const raw = await callClaude(SYSTEM, userMessage, { temperature: 0.4, maxTokens: 700 })

  let subject = ''
  let body = ''
  try {
    const jsonStr = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1)
    const parsed = JSON.parse(jsonStr)
    subject = String(parsed.subject ?? '').trim()
    body = String(parsed.body ?? '').trim()
  } catch {
    body = raw.trim()
    subject = `${lead.name} and your CQC compliance`
  }
  if (!subject) subject = `${lead.name} and your CQC compliance`
  if (!body) body = raw.trim()

  return { subject, body, sources: 'signals' }
}
