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

export const SECONDARY_ROLES: string[] = [
  'Safeguarding lead',
  'Infection prevention & control lead',
  'Dignity champion',
  'Caldicott Guardian',
  'Fire safety officer',
  'Hydration',
  'Room Checking',
  'Room & Water',
  'Nurse in Charge',
  'Night Staff',
]

// A tenant's effective lists — their configured list, or the canonical defaults.
// PRIMARY_ROLES doubles as the staff Position list; SECONDARY_ROLES as Specialist roles.
export const effectiveStaffRoles      = (tenant?: string[] | null): string[] => tenant && tenant.length > 0 ? tenant : PRIMARY_ROLES
export const effectiveSpecialistRoles = (tenant?: string[] | null): string[] => tenant && tenant.length > 0 ? tenant : SECONDARY_ROLES
