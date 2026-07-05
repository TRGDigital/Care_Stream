// Human-verified translation overrides.
// When a care setting's staff correct a machine translation and an admin approves
// it, the approved text replaces the machine output everywhere that exact source
// string is shown in that language. This module is the read path used by the
// translation layer; writes/approvals live in the routes.

import { createHash } from 'crypto'
import { prisma } from '../db/client'

// Stable key for a source string: sha256 of its trimmed text. The SAME hash is
// used when a suggestion is stored, so lookups line up regardless of language.
export function overrideHash(text: string): string {
  return createHash('sha256').update((text ?? '').trim()).digest('hex')
}

// Per (tenant, language) map of approved overrides: source_hash → suggested_text.
// Cached in-memory with a short TTL so a translated page load doesn't hit the DB
// per string; an approval shows up within the TTL.
const _cache = new Map<string, { at: number; map: Map<string, string> }>()
const TTL_MS = 60_000
const EMPTY = new Map<string, string>()

export async function approvedOverrideMap(tenantId?: string | null, langCode?: string | null): Promise<Map<string, string>> {
  if (!tenantId || !langCode || langCode === 'eng') return EMPTY
  const key = `${tenantId}::${langCode}`
  const hit = _cache.get(key)
  const now = Date.now()
  if (hit && now - hit.at < TTL_MS) return hit.map
  try {
    const rows: any[] = await (prisma as any).translationOverride.findMany({
      where:  { tenant_id: tenantId, lang_code: langCode, status: 'approved' },
      select: { source_hash: true, suggested_text: true },
    })
    const map = new Map<string, string>(rows.map(r => [r.source_hash, r.suggested_text]))
    _cache.set(key, { at: now, map })
    return map
  } catch {
    return hit?.map ?? EMPTY   // table missing / DB blip → last-known or none
  }
}

// Overlay approved overrides onto machine translations. `pairs` are the ENGLISH
// source strings aligned to their machine translations; returns the final strings.
export async function applyOverrides(
  tenantId: string | null | undefined,
  langCode: string | null | undefined,
  sources: string[],
  machine: string[],
): Promise<string[]> {
  if (!tenantId || !langCode || langCode === 'eng') return machine
  const map = await approvedOverrideMap(tenantId, langCode)
  if (!map.size) return machine
  return machine.map((m, i) => {
    const src = sources[i]
    if (!src) return m
    const hit = map.get(overrideHash(src))
    return hit ?? m
  })
}
