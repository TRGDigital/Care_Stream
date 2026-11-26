// Which named people are worth offering when wording is being adopted into a policy. Only the ones that matter to THIS wording or THIS policy, so an admin is not shown everyone.
// A role is relevant when: the wording being added (or the suggestion it answers) names the role, the policy's own text names it, or the policy's title is about the role's subject.
// Pure text matching, no AI. The admin can always reveal everyone.
import { ROLE_PHRASES } from './policy-names'

// People that are not role holders but are named on policies.
const EXTRA_PHRASES: Array<{ re: RegExp; key: string }> = [
  { re: /\bnominated individual\b/i, key: 'nominated_individual' },
  { re: /\b(?:approved by|approver|signed off by|sign off)\b/i, key: 'default_approver' },
]

// The subject of a policy title → the role that looks after it.
const TITLE_HINTS: Array<{ re: RegExp; key: string }> = [
  { re: /safeguard|abuse|protect/i, key: 'safeguarding_lead' },
  { re: /infection|ipc|hygiene|cleanl|outbreak/i, key: 'ipc_lead' },
  { re: /dignity|privacy|respect/i, key: 'dignity_champion' },
  { re: /confidential|caldicott|record|information governance/i, key: 'caldicott_guardian' },
  { re: /\bfire\b|evacuat/i, key: 'fire_safety_officer' },
  { re: /maintenance|premises|\bgas\b|electric|asbestos|\blift|equipment|legionella|water/i, key: 'maintenance_lead' },
  { re: /health (?:and|&) safety|coshh|risk assessment|riddor|accident|incident|display screen/i, key: 'health_safety_lead' },
  { re: /medic|prescrib|controlled drug|\bmar\b/i, key: 'medicines_lead' },
  { re: /data protection|gdpr|subject access|privacy notice/i, key: 'data_protection_officer' },
  { re: /moving (?:and|&) handling|manual handling|hoist/i, key: 'moving_handling_lead' },
  { re: /mental capacity|dols|deprivation of liberty|best interest/i, key: 'mental_capacity_lead' },
  { re: /end of life|palliative|advance care|dying|bereave/i, key: 'end_of_life_lead' },
  { re: /legionella|water safety/i, key: 'water_safety_lead' },
  { re: /training|induction|supervision|competenc/i, key: 'training_lead' },
  { re: /whistle|speak up/i, key: 'freedom_to_speak_up_guardian' },
  { re: /complain/i, key: 'complaints_lead' },
  { re: /first aid|resuscitat/i, key: 'first_aid_lead' },
  { re: /food|allerg|kitchen|catering/i, key: 'food_safety_lead' },
  { re: /nutrition|hydration|dysphagia|malnutrition/i, key: 'nutrition_hydration_lead' },
  { re: /\bfalls?\b/i, key: 'falls_lead' },
  { re: /pressure|tissue viability|wound/i, key: 'tissue_viability_lead' },
  { re: /business continuity|contingency|emergency plan/i, key: 'business_continuity_lead' },
]

const mentioned = (text: string): string[] => {
  const t = String(text ?? '')
  return [...ROLE_PHRASES, ...EXTRA_PHRASES].filter(p => p.re.test(t)).map(p => p.key)
}

/** The role keys worth offering for this wording and policy. `why` says which test let each one in (for a tooltip). */
export function relevantRoleKeys(input: { wording: string; policyName: string; policyText?: string }): Map<string, 'wording' | 'policy' | 'title'> {
  const out = new Map<string, 'wording' | 'policy' | 'title'>()
  for (const k of mentioned(input.wording)) out.set(k, 'wording')
  for (const k of mentioned(input.policyText ?? '')) if (!out.has(k)) out.set(k, 'policy')
  for (const h of TITLE_HINTS) if (h.re.test(input.policyName ?? '') && !out.has(h.key)) out.set(h.key, 'title')
  return out
}
