// Policy type classification — maps a tenant's uploaded policy to a canonical
// policy TYPE (e.g. "Annual Leave Policy"), regardless of the filename they used
// ("Holiday Policy", "Staff Leave"). Powers the platform-internal cross-setting
// gap analysis: which policies a care setting is missing compared to its peers.
//
// Classification uses Haiku, guided by (a) a seed vocabulary of common UK care
// policy types and (b) the types already seen for that care setting, so names
// converge instead of every home inventing its own wording.

import { prisma } from '../db/client'
import { downloadExtractedText } from '../services/storage/s3'
import { callClaude } from '../services/ai/claude'

// Common UK adult-social-care policy types — seeds the vocabulary so the model
// reuses consistent names. Not exhaustive; the model may add others.
export const SEED_POLICY_TYPES = [
  'Safeguarding Adults Policy', 'Safeguarding Children Policy', 'Whistleblowing Policy',
  'Medication (Administration) Policy', 'Infection Prevention and Control Policy',
  'Health and Safety Policy', 'Fire Safety Policy', 'Moving and Handling Policy',
  'Falls Prevention Policy', 'Nutrition and Hydration Policy', 'End of Life Care Policy',
  'Mental Capacity and DoLS Policy', 'Consent Policy', 'Dignity and Respect Policy',
  'Person-Centred Care Policy', 'Care Planning Policy', 'Record Keeping Policy',
  'Confidentiality and Data Protection Policy', 'Complaints Policy', 'Duty of Candour Policy',
  'Equality and Diversity Policy', 'Dementia Care Policy', 'Continence Care Policy',
  'Pressure Ulcer Prevention Policy', 'Accident and Incident Reporting Policy',
  'Business Continuity Policy', 'Visitors Policy', 'Recruitment and Selection Policy',
  'Disciplinary Policy', 'Grievance Policy', 'Annual Leave Policy', 'Sickness Absence Policy',
  'Staff Supervision and Appraisal Policy', 'Training and Development Policy',
  'Lone Working Policy', 'Bullying and Harassment Policy', 'Social Media Policy',
  'Gifts and Gratuities Policy', 'Restraint and Positive Behaviour Support Policy',
  'Missing Person Policy',
]

// Classify a single policy into a canonical type. `knownTypes` are the types
// already seen for this setting (so the model reuses them where they fit).
export async function classifyPolicyText(
  name: string,
  text: string,
  knownTypes: string[],
): Promise<{ type: string; confidence: number } | null> {
  const excerpt = (text || '').slice(0, 2500)
  const vocab = [...new Set([...SEED_POLICY_TYPES, ...knownTypes])].join('\n- ')
  const system = 'You classify UK adult social care policy documents into a single canonical policy TYPE. Reply ONLY with JSON.'
  const user = [
    `Classify this policy into ONE canonical policy type. Prefer an EXISTING type from the list below if it fits (match by meaning, not wording — e.g. "Holiday Policy" = "Annual Leave Policy"). Only invent a new concise, standard name (Title Case, ending in "Policy") if none fit.`,
    ``,
    `Known types:\n- ${vocab}`,
    ``,
    `Policy name: ${name || '(untitled)'}`,
    `Policy text (excerpt): ${excerpt || '(no text extracted)'}`,
    ``,
    `Output JSON: {"type":"<canonical type>","confidence":<0..1>}`,
  ].join('\n')
  try {
    const raw = await callClaude(system, user, { model: 'claude-haiku-4-5-20251001', maxTokens: 120, temperature: 0, feature: 'policy_classify' })
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    const type = typeof parsed?.type === 'string' ? parsed.type.trim().slice(0, 120) : ''
    if (!type) return null
    const confidence = typeof parsed?.confidence === 'number' ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7
    return { type, confidence }
  } catch {
    return null
  }
}

// All canonical types already recorded across the platform — feeds the vocabulary
// so classification converges on shared names rather than each home inventing its own.
export async function knownPolicyTypes(): Promise<string[]> {
  const rows = await (prisma as any).policy.findMany({
    where: { policy_type: { not: null }, status: 'active' }, select: { policy_type: true }, distinct: ['policy_type'], take: 500,
  }).catch(() => [])
  return (rows as any[]).map(r => r.policy_type).filter(Boolean)
}

// Classify a tenant's active, not-yet-classified policies (bounded). Returns how
// many were classified. Runs with light concurrency.
export async function classifyTenantPolicies(tenantId: string, knownTypes: string[], cap = 60): Promise<{ classified: number; remaining: number }> {
  const pending = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: 'active', policy_type: null },
    select: { id: true, name: true, filename: true },
    take:   cap + 1,
  }) as Array<{ id: string; name: string; filename: string }>

  const batch = pending.slice(0, cap)
  let classified = 0
  const seen = [...knownTypes]

  await mapPool(batch, 5, async (p) => {
    const text = (await downloadExtractedText(tenantId, p.id).catch(() => '')) ?? ''
    const res = await classifyPolicyText(p.name || p.filename, text, seen)
    if (!res) return
    seen.push(res.type)
    classified++
    await (prisma as any).policy.update({
      where: { id: p.id },
      data:  { policy_type: res.type, policy_type_confidence: res.confidence, policy_type_at: new Date() },
    }).catch(() => {})
  })

  return { classified, remaining: Math.max(0, pending.length - batch.length) }
}

async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]) }
  }))
}
