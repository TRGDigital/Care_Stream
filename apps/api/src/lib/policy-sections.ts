// Default internal-policy sections. A tenant's policy_sections starts empty and
// the API falls back to this set, so every tenant gets the standard list and can
// add/remove their own in Settings.
export const DEFAULT_POLICY_SECTIONS: string[] = [
  'Activities',
  'Admission management',
  'Business procedures',
  'Care and health of residents',
  'Complaints and compliments',
  'Emergency planning',
  'Fees and funding',
  'GDPR',
  'Governance',
  'Health and Safety',
  'Home Premises',
  'Infection control',
  'Quality Assurance',
  'Safeguarding',
  'Staff',
  'Training',
]

// A tenant's effective section list (their custom list, or the defaults if unset).
export function effectiveSections(tenantSections?: string[] | null): string[] {
  return tenantSections && tenantSections.length > 0 ? tenantSections : DEFAULT_POLICY_SECTIONS
}
