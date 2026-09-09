// Which named roles do this client's own policies actually mention?
//
// The settings screen now offers twenty four roles. Most homes need a handful, and asking
// anyone to work out which by reading a form of twenty four boxes is the wrong way round.
// Their policies already say. "The Falls Lead reviews every fall at the monthly meeting" is
// a request for a name, written by the home itself.
//
// So this reads their library and reports, per role, how many policies mention it and one
// example. The settings screen then leads with the roles their documents ask for, and can
// say plainly that a policy refers to a Falls Lead and nobody is named.
//
// Costs no AI credit: it is a regex sweep over text we already hold. It is not free of I/O
// though. Only twelve of Ferndale's three hundred and twenty two policies have their text in
// Postgres, so the rest come from object storage one at a time, which is why this is an
// explicit action with a stored result rather than something a page load triggers.

import { prisma } from '../../db/client'
import { downloadExtractedText } from '../storage/s3'
import { mapLimit } from '../../lib/translate'
import { ROLE_PHRASES } from '../../lib/role-phrases'

export type RoleMention = {
  key: string
  label: string
  /** How many of the client's policies mention this role. */
  policies: number
  /** One policy that mentions it, so the finding can be checked rather than trusted. */
  example: string | null
}

export type RoleMentionScan = {
  scanned_at: string
  policies_scanned: number
  policies_unreadable: number
  mentions: RoleMention[]
}

const READ_CONCURRENCY = 8
// Enough to reach the roles and responsibilities section of any policy we have seen, without
// pulling whole appendices into memory for a sweep that only needs to know "is it mentioned".
const TEXT_CAP = 120_000

export async function scanRoleMentions(tenantId: string): Promise<RoleMentionScan> {
  const policies: { id: string; name: string }[] = await (prisma as any).policy.findMany({
    where: { tenant_id: tenantId, status: 'active' },
    select: { id: true, name: true },
  })

  const counts = new Map<string, { policies: number; example: string | null }>(
    ROLE_PHRASES.map(p => [p.key, { policies: 0, example: null }]))
  let unreadable = 0

  await mapLimit(policies, READ_CONCURRENCY, async (p) => {
    const text = await downloadExtractedText(tenantId, p.id).catch(() => null)
    if (!text) { unreadable++; return }
    const body = text.slice(0, TEXT_CAP)
    for (const phrase of ROLE_PHRASES) {
      if (!phrase.re.test(body)) continue
      const c = counts.get(phrase.key)!
      c.policies++
      if (!c.example) c.example = p.name
    }
  })

  return {
    scanned_at: new Date().toISOString(),
    policies_scanned: policies.length - unreadable,
    policies_unreadable: unreadable,
    // Most mentioned first: that is the role most worth naming.
    mentions: ROLE_PHRASES
      .map(p => ({ key: p.key, label: p.label, ...counts.get(p.key)! }))
      .sort((a, b) => b.policies - a.policies || a.label.localeCompare(b.label)),
  }
}

/** Store a scan against the tenant so the settings screen reads it instantly. */
export async function saveRoleMentionScan(tenantId: string, scan: RoleMentionScan): Promise<void> {
  await (prisma as any).roleMentionScan.upsert({
    where:  { tenant_id: tenantId },
    update: { scanned_at: new Date(scan.scanned_at), result: scan },
    create: { tenant_id: tenantId, scanned_at: new Date(scan.scanned_at), result: scan },
  })
}

export async function getRoleMentionScan(tenantId: string): Promise<RoleMentionScan | null> {
  const row = await (prisma as any).roleMentionScan.findUnique({ where: { tenant_id: tenantId } })
  return (row?.result as RoleMentionScan) ?? null
}
