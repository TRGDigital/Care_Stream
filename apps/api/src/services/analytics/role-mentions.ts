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
import { roleNameRegex } from './policy-adoption'

export type RoleMention = {
  key: string
  label: string
  /** How many of the client's policies mention this role. */
  policies: number
  /** One policy that mentions it, so the finding can be checked rather than trusted. */
  example: string | null
  /** Every policy that mentions it (the role, which shows the current name by itself), so an admin can see where it is used. */
  policy_list?: Array<{ policy_id: string; policy_name: string }>
}

/** A named person and the policies that have their NAME written into the text (which a change of name in Settings does not reach on its own). */
export type NameUsage = {
  name: string
  roles: string[]
  policies: Array<{ policy_id: string; policy_name: string; occurrences: number; /** has a working copy, so the name can be replaced here; false = adopt the policy first */ writable: boolean }>
  total_occurrences: number
}

export type RoleMentionScan = {
  scanned_at: string
  policies_scanned: number
  policies_unreadable: number
  mentions: RoleMention[]
  /** The people named in Organisation details when this was checked, and where their name is written into policies. */
  name_usage?: NameUsage[]
}

const READ_CONCURRENCY = 8
// Enough to reach the roles and responsibilities section of any policy we have seen, without
// pulling whole appendices into memory for a sweep that only needs to know "is it mentioned".
const TEXT_CAP = 120_000

export async function scanRoleMentions(tenantId: string, opts: { names?: Array<{ name: string; roles: string[] }> } = {}): Promise<RoleMentionScan> {
  const policies: { id: string; name: string }[] = await (prisma as any).policy.findMany({
    where: { tenant_id: tenantId, status: 'active' },
    select: { id: true, name: true },
  })

  const counts = new Map<string, { policies: number; example: string | null; list: Array<{ policy_id: string; policy_name: string }> }>(
    ROLE_PHRASES.map(p => [p.key, { policies: 0, example: null, list: [] }]))
  let unreadable = 0

  // A policy with a working copy is read from it (that is the text a name change would rewrite); every other policy from storage. The same rule the name change itself uses.
  const docs = await (prisma as any).policyDocument.findMany({ where: { tenant_id: tenantId }, select: { policy_id: true, published_content: true, original_content: true } }).catch(() => [])
  const docText = new Map<string, string>((docs as any[]).map(d => [d.policy_id, String(d.published_content || d.original_content || '')]))
  const names = (opts.names ?? []).filter(n => n.name && n.name.trim().length >= 2)
  const usage: NameUsage[] = names.map(n => ({ name: n.name.trim(), roles: n.roles, policies: [], total_occurrences: 0 }))

  await mapLimit(policies, READ_CONCURRENCY, async (p) => {
    const stored = await downloadExtractedText(tenantId, p.id).catch(() => null)
    const own = docText.get(p.id) ?? ''
    if (!stored && !own) { unreadable++; return }
    const body = (stored ?? own).slice(0, TEXT_CAP)
    for (const phrase of ROLE_PHRASES) {
      if (!phrase.re.test(body)) continue
      const c = counts.get(phrase.key)!
      c.policies++
      if (!c.example) c.example = p.name
      if (c.list.length < 400) c.list.push({ policy_id: p.id, policy_name: p.name })
    }
    const nameText = own || body
    for (const u of usage) {
      const n = (nameText.match(roleNameRegex(u.name)) ?? []).length
      if (!n) continue
      u.policies.push({ policy_id: p.id, policy_name: p.name, occurrences: n, writable: !!own })
      u.total_occurrences += n
    }
  })
  for (const u of usage) u.policies.sort((a, b) => a.policy_name.localeCompare(b.policy_name))

  return {
    scanned_at: new Date().toISOString(),
    policies_scanned: policies.length - unreadable,
    policies_unreadable: unreadable,
    // Most mentioned first: that is the role most worth naming.
    mentions: ROLE_PHRASES
      .map(p => { const c = counts.get(p.key)!; return { key: p.key, label: p.label, policies: c.policies, example: c.example, policy_list: c.list.sort((a, b) => a.policy_name.localeCompare(b.policy_name)) } })
      .sort((a, b) => b.policies - a.policies || a.label.localeCompare(b.label)),
    name_usage: usage,
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
