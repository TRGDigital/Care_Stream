// Curated catalogue of recognised UK care-sector standards that a training module
// can be mapped to. Used for CPD governance: showing each standard module aligns to
// an external authority (not just AI). Grouped by framework.

export type StandardItem = { code: string; label: string }
export type StandardFramework = { framework: string; label: string; items: StandardItem[] }

export const STANDARDS_CATALOGUE: StandardFramework[] = [
  {
    framework: 'care_certificate',
    label: 'The Care Certificate (15 standards)',
    items: [
      { code: 'CC1',  label: '1. Understand your role' },
      { code: 'CC2',  label: '2. Your personal development' },
      { code: 'CC3',  label: '3. Duty of care' },
      { code: 'CC4',  label: '4. Equality and diversity' },
      { code: 'CC5',  label: '5. Work in a person-centred way' },
      { code: 'CC6',  label: '6. Communication' },
      { code: 'CC7',  label: '7. Privacy and dignity' },
      { code: 'CC8',  label: '8. Fluids and nutrition' },
      { code: 'CC9',  label: '9. Awareness of mental health, dementia and learning disability' },
      { code: 'CC10', label: '10. Safeguarding adults' },
      { code: 'CC11', label: '11. Safeguarding children' },
      { code: 'CC12', label: '12. Basic life support' },
      { code: 'CC13', label: '13. Health and safety' },
      { code: 'CC14', label: '14. Handling information' },
      { code: 'CC15', label: '15. Infection prevention and control' },
    ],
  },
  {
    framework: 'cqc',
    label: 'CQC key questions',
    items: [
      { code: 'SAFE',      label: 'Safe' },
      { code: 'EFFECTIVE', label: 'Effective' },
      { code: 'CARING',    label: 'Caring' },
      { code: 'RESPONSIVE',label: 'Responsive' },
      { code: 'WELLLED',   label: 'Well-led' },
    ],
  },
  {
    framework: 'regulation',
    label: 'Health & Social Care Act 2008 (Regulated Activities) Regulations 2014',
    items: [
      { code: 'REG9',  label: 'Reg 9 — Person-centred care' },
      { code: 'REG10', label: 'Reg 10 — Dignity and respect' },
      { code: 'REG11', label: 'Reg 11 — Need for consent' },
      { code: 'REG12', label: 'Reg 12 — Safe care and treatment' },
      { code: 'REG13', label: 'Reg 13 — Safeguarding from abuse' },
      { code: 'REG14', label: 'Reg 14 — Meeting nutritional and hydration needs' },
      { code: 'REG15', label: 'Reg 15 — Premises and equipment' },
      { code: 'REG16', label: 'Reg 16 — Receiving and acting on complaints' },
      { code: 'REG17', label: 'Reg 17 — Good governance' },
      { code: 'REG18', label: 'Reg 18 — Staffing' },
      { code: 'REG19', label: 'Reg 19 — Fit and proper persons employed' },
    ],
  },
  {
    framework: 'legislation',
    label: 'Key legislation',
    items: [
      { code: 'MCA2005',  label: 'Mental Capacity Act 2005' },
      { code: 'HASAWA',   label: 'Health and Safety at Work etc. Act 1974' },
      { code: 'COSHH',    label: 'COSHH Regulations 2002' },
      { code: 'RIDDOR',   label: 'RIDDOR 2013' },
      { code: 'EQ2010',   label: 'Equality Act 2010' },
      { code: 'DPA2018',  label: 'Data Protection Act 2018 / UK GDPR' },
      { code: 'RRO2005',  label: 'Regulatory Reform (Fire Safety) Order 2005' },
      { code: 'HCA2022',  label: 'Health and Care Act 2022' },
    ],
  },
]

// Flat lookup of valid "framework:code" combinations, for validating saved selections.
const VALID = new Set(
  STANDARDS_CATALOGUE.flatMap(f => f.items.map(i => `${f.framework}:${i.code}`)),
)
const LABELS = new Map(
  STANDARDS_CATALOGUE.flatMap(f => f.items.map(i => [`${f.framework}:${i.code}`, { framework: f.framework, code: i.code, label: i.label }])),
)

// Validate + normalise a saved standards selection (array of {framework, code}).
export function normaliseStandards(input: any): Array<{ framework: string; code: string; label: string }> {
  if (!Array.isArray(input)) return []
  const out: Array<{ framework: string; code: string; label: string }> = []
  const seen = new Set<string>()
  for (const s of input) {
    const key = `${s?.framework}:${s?.code}`
    if (VALID.has(key) && !seen.has(key)) { seen.add(key); out.push(LABELS.get(key)!) }
  }
  return out
}
