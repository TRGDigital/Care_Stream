// The standalone policy shop's catalogue seed.
//
// Prices agreed with Len, 11 Sept 2026: flagship policies £79, standard £69, lighter
// £59/£49, one deliberate £39 taster; the Statutory Starter bundle (20 policies) £495
// with the annual keep-updated renewal capped at £149. Singles renew at £12/year
// (renewal machinery lands in a later phase; the catalogue carries the numbers now).
//
// Every policy shares the identity fields (asked ONCE per buyer, stored on their
// organisation details, reused for every later purchase); `fields` below are the
// per-policy extras the writer needs before drafting can start.

export type IntakeField = { key: string; label: string; help?: string; shared?: boolean }

export const SHARED_INTAKE_FIELDS: IntakeField[] = [
  { key: 'company_legal_name', label: 'Registered company name', shared: true },
  { key: 'trading_name',       label: 'Trading name (if different)', shared: true },
  { key: 'address',            label: 'Service address', shared: true },
  { key: 'cqc_provider_id',    label: 'CQC provider ID', help: 'e.g. 1-101234567', shared: true },
  { key: 'cqc_location_id',    label: 'CQC location ID', shared: true },
  { key: 'registered_manager', label: 'Registered manager', shared: true },
  { key: 'nominated_individual', label: 'Nominated individual', shared: true },
]

type SeedProduct = {
  slug: string; title: string; description: string; price_pence: number
  taster?: boolean; bundles?: string[]; fields?: IntakeField[]
}

const STARTER = 'statutory-starter'

export const POLICY_BUNDLES_SEED = [
  {
    key: STARTER,
    title: 'Statutory Starter Pack',
    description: 'The twenty policies every CQC-registered service is expected to hold, personalised to your organisation, human-reviewed, and kept updated when the law changes.',
    price_pence: 49500,
    renewal_cap_pence: 14900,
  },
]

export const POLICY_PRODUCTS_SEED: SeedProduct[] = [
  // ── Flagships, £79 ──────────────────────────────────────────────────────────
  { slug: 'safeguarding-adults', title: 'Safeguarding Adults Policy', price_pence: 7900, bundles: [STARTER],
    description: 'Recognising, responding to and reporting abuse and neglect, aligned to the Care Act 2014 and your local authority procedures.',
    fields: [
      { key: 'safeguarding_lead', label: 'Safeguarding lead' },
      { key: 'la_safeguarding_contact', label: 'Local authority safeguarding team contact' },
    ] },
  { slug: 'medicines-management', title: 'Medicines Management Policy', price_pence: 7900, bundles: [STARTER],
    description: 'Ordering, storage, administration, recording and disposal of medicines, including controlled drugs and errors.',
    fields: [
      { key: 'medicines_lead', label: 'Medicines lead' },
      { key: 'supplying_pharmacy', label: 'Supplying pharmacy' },
    ] },
  { slug: 'mental-capacity-dols', title: 'Mental Capacity and DoLS Policy', price_pence: 7900, bundles: [STARTER],
    description: 'Capacity assessment, best-interests decisions and deprivation of liberty safeguards under the MCA 2005.',
    fields: [
      { key: 'mca_lead', label: 'Mental capacity and DoLS lead' },
    ] },
  { slug: 'health-and-safety', title: 'Health and Safety Policy', price_pence: 7900, bundles: [STARTER],
    description: 'Your general statement, organisation and arrangements under the Health and Safety at Work etc. Act 1974.',
    fields: [
      { key: 'health_safety_lead', label: 'Health and safety lead' },
      { key: 'competent_person', label: 'Competent person (H&S assistance)', help: 'Internal or external adviser' },
    ] },

  // ── Standard, £69 ───────────────────────────────────────────────────────────
  { slug: 'infection-prevention-control', title: 'Infection Prevention and Control Policy', price_pence: 6900, bundles: [STARTER],
    description: 'IPC arrangements aligned to the Code of Practice, including outbreak management and audit.',
    fields: [{ key: 'ipc_lead', label: 'Infection prevention and control lead' }] },
  { slug: 'data-protection-gdpr', title: 'Data Protection and GDPR Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Lawful handling of personal and special category data under UK GDPR and the Data Protection Act 2018.',
    fields: [
      { key: 'ico_registration', label: 'ICO registration number' },
      { key: 'dpo_name', label: 'Data protection officer (if appointed)' },
    ] },
  { slug: 'fire-safety', title: 'Fire Safety Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Prevention, detection, evacuation (including PEEPs) and staff responsibilities under the Fire Safety Order 2005.',
    fields: [
      { key: 'fire_safety_officer', label: 'Fire safety officer' },
      { key: 'fire_risk_assessment_date', label: 'Date of last fire risk assessment' },
    ] },
  { slug: 'complaints', title: 'Complaints Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Receiving, investigating and learning from complaints under Regulation 16, including LGSCO signposting.',
    fields: [{ key: 'complaints_lead', label: 'Complaints lead' }] },
  { slug: 'duty-of-candour', title: 'Duty of Candour Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Being open and honest when things go wrong, under Regulation 20.' },
  { slug: 'consent-to-care', title: 'Consent to Care and Treatment Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Seeking, recording and reviewing consent, including where capacity fluctuates.' },
  { slug: 'safer-recruitment-dbs', title: 'Safer Recruitment and DBS Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Fit and proper persons, DBS checks, references and ongoing suitability under Regulation 19.',
    fields: [{ key: 'hr_contact', label: 'HR / recruitment contact' }] },
  { slug: 'whistleblowing', title: 'Whistleblowing and Freedom to Speak Up Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Raising concerns safely, PIDA protections, and your speak-up arrangements.',
    fields: [{ key: 'speak_up_guardian', label: 'Freedom to Speak Up Guardian' }] },
  { slug: 'moving-and-handling', title: 'Moving and Handling Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Safe moving and handling of people and loads, training and equipment under LOLER and MHOR.',
    fields: [{ key: 'moving_handling_lead', label: 'Moving and handling lead' }] },
  { slug: 'incident-reporting', title: 'Incident and Accident Reporting Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Recording, investigating and learning from incidents, RIDDOR and CQC notifications.' },

  // ── Lighter, £59 ────────────────────────────────────────────────────────────
  { slug: 'dignity-and-respect', title: 'Dignity and Respect Policy', price_pence: 5900, bundles: [STARTER],
    description: 'Treating people with dignity and respect under Regulation 10.' },
  { slug: 'equality-and-diversity', title: 'Equality, Diversity and Human Rights Policy', price_pence: 5900, bundles: [STARTER],
    description: 'Meeting the Equality Act 2010 and human rights obligations in care delivery and employment.' },
  { slug: 'nutrition-and-hydration', title: 'Nutrition and Hydration Policy', price_pence: 5900, bundles: [STARTER],
    description: 'Meeting nutrition and hydration needs under Regulation 14, aligned to NICE guidance.',
    fields: [{ key: 'nutrition_lead', label: 'Nutrition and hydration lead' }] },
  { slug: 'food-safety-allergens', title: 'Food Safety and Allergen Policy', price_pence: 5900, bundles: [STARTER],
    description: 'Food hygiene, allergen management and Natasha’s Law compliance.',
    fields: [{ key: 'food_safety_lead', label: 'Food safety and allergen lead' }] },
  { slug: 'confidentiality', title: 'Confidentiality Policy', price_pence: 5900, bundles: [STARTER],
    description: 'Keeping personal information confidential, Caldicott principles and information sharing.' },
  { slug: 'business-continuity', title: 'Business Continuity Policy', price_pence: 5900, bundles: [STARTER],
    description: 'Keeping people safe through outages, staffing crises, and emergencies, with your escalation contacts.',
    fields: [{ key: 'emergency_contact', label: 'Out-of-hours emergency contact' }] },

  // ── £49 ─────────────────────────────────────────────────────────────────────
  { slug: 'water-safety-legionella', title: 'Water Safety and Legionella Policy', price_pence: 4900,
    description: 'Legionella risk management under HSG274 and L8.',
    fields: [
      { key: 'water_safety_lead', label: 'Water safety lead' },
      { key: 'legionella_assessment_date', label: 'Date of last legionella risk assessment' },
    ] },
  { slug: 'coshh', title: 'COSHH Policy', price_pence: 4900,
    description: 'Control of substances hazardous to health: assessment, storage and safe use.' },
  { slug: 'first-aid', title: 'First Aid Policy', price_pence: 4900,
    description: 'First aid arrangements, appointed persons and kit under the First-Aid Regulations 1981.',
    fields: [{ key: 'first_aid_person', label: 'First aid appointed person' }] },

  // ── The taster, £39 ─────────────────────────────────────────────────────────
  { slug: 'accessible-information', title: 'Accessible Information Standard Policy', price_pence: 3900, taster: true,
    description: 'Identifying, recording and meeting communication needs under the Accessible Information Standard. Our trial policy: same personalisation, same human review, same updates.' },
]
