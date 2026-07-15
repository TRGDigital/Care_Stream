// Canonical care/nursing-home roles used to seed platform onboarding flow templates.
// Primary = a person's job role; secondary = a specialism staff can be assigned in
// addition to their role.

export const PRIMARY_ROLES: string[] = [
  'Care Assistant',
  'Senior Care Assistant',
  'Nurse',
  'Senior Nurse',
  'Care Manager',
  'Activities Coordinator',
  'Administrator',
  'HR',
  'Marketing',
  'Company Director',
  'Chef',
  'Kitchen Porter',
  'Laundry',
  'Cleaner / Housekeeping',
]

// Statutory / named leads. These map 1:1 to the policy role-holders on
// Settings → Organisation details, so they are ALWAYS offered in the Specialist
// role dropdown — even when a tenant has customised its own specialist list —
// and assigning one to a staff member populates the matching role-holder there.
export const STATUTORY_LEAD_ROLES: string[] = [
  'Safeguarding lead',
  'Infection prevention & control lead',
  'Dignity champion',
  'Caldicott Guardian',
  'Fire safety officer',
]

export const SECONDARY_ROLES: string[] = [
  ...STATUTORY_LEAD_ROLES,
  'Hydration',
  'Room Checking',
  'Room & Water',
  'Nurse in Charge',
  'Night Staff',
]

// A tenant's effective lists — their configured list, or the canonical defaults.
// PRIMARY_ROLES doubles as the staff Position list; SECONDARY_ROLES as Specialist roles.
export const effectiveStaffRoles = (tenant?: string[] | null): string[] => tenant && tenant.length > 0 ? tenant : PRIMARY_ROLES

// Specialist roles: the tenant's own list (or defaults), but always with the
// statutory leads guaranteed present (deduped, case-insensitive), listed first so
// they are easy to find. This keeps the org role-holders on Settings in sync no
// matter how a tenant has customised its list.
export const effectiveSpecialistRoles = (tenant?: string[] | null): string[] => {
  const base = tenant && tenant.length > 0 ? tenant : SECONDARY_ROLES
  const seen = new Set(base.map(r => r.trim().toLowerCase()))
  const missingLeads = STATUTORY_LEAD_ROLES.filter(r => !seen.has(r.toLowerCase()))
  return [...missingLeads, ...base]
}
