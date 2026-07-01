// Document categories for the policy library.
//
// The built-in categories are fixed: they drive behaviour elsewhere
// (staff_handbook has its own plan limit, internal_policy carries a Section).
// Tenants can add their own simple categories on top, stored on
// tenant.policy_categories and surfaced in Settings + the upload dropdown.

export const BUILTIN_CATEGORIES = [
  { key: 'internal_policy',     label: 'Internal policy' },
  { key: 'staff_handbook',      label: 'Staff handbook' },
  { key: 'cqc_report',          label: 'CQC Report' },
  { key: 'business_continuity', label: 'Business continuity' },
] as const

export const BUILTIN_CATEGORY_KEYS: string[] = BUILTIN_CATEGORIES.map(c => c.key)
const BUILTIN_RESERVED: string[] = BUILTIN_CATEGORIES.flatMap(c => [c.key.toLowerCase(), c.label.toLowerCase()])

// Whether a document_category submitted on upload is allowed for this tenant:
// either one of the built-in keys, or one of the tenant's own custom categories.
export function isValidCategory(value: string, tenantCategories: string[]): boolean {
  if (BUILTIN_CATEGORY_KEYS.includes(value)) return true
  return tenantCategories.includes(value)
}

// Clean a custom-category list submitted from Settings: trim, drop blanks,
// dedupe case-insensitively, cap length, and reject anything that collides with
// a built-in (so the built-ins can never be shadowed or duplicated).
export function normaliseCategories(raw: unknown[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const value = item.trim().slice(0, 60)
    if (!value) continue
    const low = value.toLowerCase()
    if (BUILTIN_RESERVED.includes(low) || seen.has(low)) continue
    seen.add(low)
    out.push(value)
  }
  return out
}
