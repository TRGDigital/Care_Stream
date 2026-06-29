// Batch website enrichment for prospects. Picks the next N leads that have a
// website but haven't been enriched yet (hottest first, by score), scrapes each
// for a contact email + manager name, and stores the result. Used by both the
// on-demand bulk endpoint and the background cron.
//
// enriched_at is stamped even when nothing is found, so a lead is never
// re-scraped on the next pass — the backlog strictly shrinks.
import { prisma } from '../../db/client'
import { enrichLead } from './enrich'

export interface BatchOpts {
  limit?: number
  segment?: string
  concurrency?: number
  useFinder?: boolean // allow the paid Hunter fallback (manual bulk only, never the cron)
}

export interface BatchResult {
  processed: number
  withEmail: number
  withContact: number
  remaining: number
}

export async function enrichBatch({ limit = 60, segment, concurrency = 6, useFinder = false }: BatchOpts): Promise<BatchResult> {
  const where: Record<string, unknown> = { website: { not: null }, enriched_at: null }
  if (segment) where.segment = segment

  const batch = await (prisma as any).providerLead.findMany({
    where,
    orderBy: [{ score: 'desc' }],
    take: limit,
    select: { id: true, name: true, website: true },
  })

  let withEmail = 0
  let withContact = 0
  let idx = 0

  async function worker() {
    while (idx < batch.length) {
      const lead = batch[idx++]
      try {
        const r = await enrichLead({ name: lead.name, website: lead.website }, { useFinder })
        await (prisma as any).providerLead.update({
          where: { id: lead.id },
          data: {
            contact_name: r.contactName,
            contact_role: r.contactRole,
            enriched_email: r.email,
            alt_email: r.altEmail,
            enrichment_source: r.source,
            company_number: r.companyNumber,
            enriched_at: new Date(),
          },
        })
        if (r.email) withEmail++
        if (r.contactName || r.email) withContact++
      } catch {
        // Mark as enriched (source none) so a perpetually-failing site isn't retried forever.
        await (prisma as any).providerLead
          .update({ where: { id: lead.id }, data: { enriched_at: new Date(), enrichment_source: 'none' } })
          .catch(() => {})
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) || 1 }, worker))

  const remaining = await (prisma as any).providerLead.count({ where })
  return { processed: batch.length, withEmail, withContact, remaining }
}
