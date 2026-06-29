// Daily Gmail-drafts engine. Picks the hottest leads that have a contact email
// and haven't been drafted yet, generates the outreach email with the editable
// AI prompt, and creates it as a native Gmail draft in len@'s mailbox. Len
// reviews + sends in Gmail — this never sends anything itself.
import { prisma } from '../../db/client'
import { generateAiDraft } from './ai-draft'
import { createGmailDraft, gmailConfigured } from '../google/gmail'

export interface DraftEmailsResult {
  created: number
  errors: number
  remaining: number
}

export async function draftEmails({ limit = 10, segment }: { limit?: number; segment?: string }): Promise<DraftEmailsResult> {
  if (!gmailConfigured()) {
    throw new Error('Google not configured — set GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_IMPERSONATE_USER')
  }

  const where: Record<string, unknown> = { enriched_email: { not: null }, drafted_at: null }
  if (segment) where.segment = segment

  const leads = await (prisma as any).providerLead.findMany({
    where,
    orderBy: [{ score: 'desc' }],
    take: limit,
  })

  let created = 0
  let errors = 0
  for (const lead of leads) {
    try {
      const draft = await generateAiDraft({
        name: lead.name,
        setting: lead.setting,
        town: lead.town,
        county: lead.county,
        segment: lead.segment,
        cqc_rating: lead.cqc_rating,
        failing_domains: lead.failing_domains ?? [],
        lead_angle_label: lead.lead_angle_label,
        cqc_report_url: lead.cqc_report_url,
        contact_name: lead.contact_name,
      })
      const gmailId = await createGmailDraft({ to: lead.enriched_email, subject: draft.subject, body: draft.body })
      await (prisma as any).providerLead.update({
        where: { id: lead.id },
        data: {
          gmail_draft_id: gmailId,
          drafted_at: new Date(),
          draft_subject: draft.subject,
          draft_body: draft.body,
          email_status: 'drafted',
        },
      })
      created++
    } catch {
      // Leave drafted_at null so it's retried next run (e.g. transient Gmail/AI error).
      errors++
    }
  }

  const remaining = await (prisma as any).providerLead.count({ where })
  return { created, errors, remaining }
}
