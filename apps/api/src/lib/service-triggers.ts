// Service profile triggers — the operational facts about a specific service that
// switch trigger-scoped regulations in or out of Policy Gaps. Setting type alone
// can't answer these ("does this home cook on site?"), and neither can CQC
// registration — the only authoritative source is the provider, so they're
// self-declared per tenant. We pre-fill sensible per-setting defaults and let the
// tenant confirm/edit in Settings; a missing key falls back to its setting default.

import type { CareSetting } from './care-setting'
import { CARE_SETTINGS, isCareSetting } from './care-setting'

export const SERVICE_TRIGGERS = [
  { key: 'prepares_food',                 label: 'Prepares food on site',                    desc: 'Meals cooked or prepared on the premises (not brought in by a contractor).' },
  { key: 'manages_medicines',             label: 'Manages or administers medicines',         desc: 'Staff order, store, administer or support residents with medicines.' },
  { key: 'handles_controlled_drugs',      label: 'Handles controlled drugs',                 desc: 'Schedule 2–3 controlled drugs are held and administered on site.' },
  { key: 'employs_nurses',                label: 'Employs nurses / provides nursing care',   desc: 'Registered nurses are employed and deliver nursing care.' },
  { key: 'uses_moving_handling_equipment',label: 'Uses hoists / moving & handling equipment',desc: 'Hoists, slings or other lifting equipment are used to move people.' },
  { key: 'supports_mha',                  label: 'Supports people under the Mental Health Act',desc: 'The service supports people who may be, or are, subject to the Mental Health Act 1983.' },
  { key: 'operates_premises',             label: 'Operates its own care premises',           desc: 'The service runs its own building (vs delivering care in a person’s own home).' },
] as const

export type ServiceTrigger = (typeof SERVICE_TRIGGERS)[number]['key']
export const TRIGGER_KEYS: ServiceTrigger[] = SERVICE_TRIGGERS.map(t => t.key)

// Settings where each trigger DEFAULTS to true. Anything not listed defaults to
// false. The tenant can override either way in Settings.
const DEFAULT_TRUE: Record<ServiceTrigger, CareSetting[]> = {
  prepares_food:                  ['residential-care', 'nursing-homes', 'complex-care', 'hospices', 'substance-misuse', 'independent-hospitals'],
  manages_medicines:              ['residential-care', 'nursing-homes', 'domiciliary-care', 'live-in-care', 'complex-care', 'hospices', 'substance-misuse', 'independent-hospitals', 'gp-practices'],
  handles_controlled_drugs:       ['nursing-homes', 'complex-care', 'hospices', 'substance-misuse', 'independent-hospitals', 'residential-care'],
  employs_nurses:                 ['nursing-homes', 'complex-care', 'hospices', 'independent-hospitals', 'gp-practices'],
  uses_moving_handling_equipment: ['residential-care', 'nursing-homes', 'complex-care', 'hospices', 'independent-hospitals', 'live-in-care', 'domiciliary-care'],
  supports_mha:                   [],  // default off everywhere — opt in, since it's the classic false-positive
  operates_premises:              ['residential-care', 'nursing-homes', 'complex-care', 'hospices', 'substance-misuse', 'independent-hospitals', 'shared-lives', 'gp-practices', 'dental-practices'],
}

export function defaultTriggerValue(setting: CareSetting, key: ServiceTrigger): boolean {
  return (DEFAULT_TRUE[key] ?? []).includes(setting)
}

// The tenant's effective profile: stored overrides on top of setting defaults.
export function resolveServiceProfile(setting: CareSetting, stored: Record<string, unknown> | null | undefined): Record<ServiceTrigger, boolean> {
  const out = {} as Record<ServiceTrigger, boolean>
  for (const key of TRIGGER_KEYS) {
    const v = stored?.[key]
    out[key] = typeof v === 'boolean' ? v : defaultTriggerValue(setting, key)
  }
  return out
}

// Keep only known boolean trigger keys when persisting a profile from the client.
export function sanitiseServiceProfile(input: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {}
  if (input && typeof input === 'object') {
    for (const key of TRIGGER_KEYS) {
      const v = (input as any)[key]
      if (typeof v === 'boolean') out[key] = v
    }
  }
  return out
}

// Does a regulation apply to a tenant? In scope when the tenant's setting is
// allowed (empty applies_to_settings = universal) AND every required trigger is
// true in the resolved profile (empty required_triggers = no trigger gating).
export function regulationAppliesToTenant(
  reg: { applies_to_settings?: string[] | null; required_triggers?: string[] | null },
  setting: CareSetting,
  profile: Record<ServiceTrigger, boolean>,
): boolean {
  const settings = reg.applies_to_settings ?? []
  if (settings.length > 0 && !settings.includes(setting)) return false
  const triggers = (reg.required_triggers ?? []) as ServiceTrigger[]
  for (const t of triggers) {
    if (!profile[t]) return false
  }
  return true
}

export { CARE_SETTINGS, isCareSetting }
