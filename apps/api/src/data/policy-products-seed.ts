// The standalone policy shop's catalogue seed — the FULL range.
//
// Sourced from expected_policy_titles (137 raw titles across 75 regulations), deduped
// hard: variants of the same document (GDPR/Data Protection, Asbestos/Asbestos
// Management, Whistleblowing/Freedom to Speak Up) become ONE product, because every
// product must pass the verification gate as a distinct document. No filler.
//
// Prices agreed with Len, 11 Sept 2026: flagships £79, substantial £69, standard £59,
// lighter £49, one deliberate £39 taster. Bundles: Statutory Starter £495 (cap £149/yr),
// domain packs £249 to £349, Complete Library £1,495 (cap £349/yr). Singles renew at
// £12/year from year 2.
//
// Every product also belongs to the Complete Library; the seed route appends that key
// automatically so this file never needs to repeat it.

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

const STARTER    = 'statutory-starter'
const HS         = 'health-safety-pack'
const CLINICAL   = 'clinical-care-pack'
const GOVERNANCE = 'governance-data-pack'
const HR         = 'hr-workforce-pack'
export const COMPLETE_LIBRARY_KEY = 'complete-library'

export const POLICY_BUNDLES_SEED = [
  {
    key: STARTER,
    title: 'Statutory Starter Pack',
    description: 'The twenty policies every CQC-registered service is expected to hold, personalised to your organisation, human-reviewed, and kept updated when the law changes.',
    price_pence: 49500,
    renewal_cap_pence: 14900,
  },
  {
    key: HS,
    title: 'Health & Safety Pack',
    description: 'The premises and safety family: fire, gas, electrical, asbestos, COSHH, legionella, equipment and evacuation, written for your building and your named leads.',
    price_pence: 29500,
    renewal_cap_pence: 9900,
  },
  {
    key: CLINICAL,
    title: 'Clinical Care Pack',
    description: 'The clinical backbone: medicines and controlled drugs, care planning, consent and capacity, behaviour support, end of life and outbreak management.',
    price_pence: 34900,
    renewal_cap_pence: 11900,
  },
  {
    key: GOVERNANCE,
    title: 'Governance & Data Pack',
    description: 'Running the service and protecting its information: governance, quality assurance, records, Caldicott, CQC notifications and regulatory compliance.',
    price_pence: 29500,
    renewal_cap_pence: 9900,
  },
  {
    key: HR,
    title: 'HR & Workforce Pack',
    description: 'The employment family: recruitment, supervision, training, staffing, discipline and working time, aligned to Regulation 18 and 19.',
    price_pence: 24900,
    renewal_cap_pence: 8900,
  },
  {
    key: COMPLETE_LIBRARY_KEY,
    title: 'Complete Policy Library',
    description: 'Every policy in the catalogue, personalised, human-reviewed and kept updated. The full library a new registration or a spring-clean needs, at a fraction of the subscription platforms.',
    price_pence: 149500,
    renewal_cap_pence: 34900,
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
  { slug: 'medicines-management', title: 'Medicines Management Policy', price_pence: 7900, bundles: [STARTER, CLINICAL],
    description: 'Ordering, storage, administration, recording and disposal of medicines, including errors and self-administration.',
    fields: [
      { key: 'medicines_lead', label: 'Medicines lead' },
      { key: 'supplying_pharmacy', label: 'Supplying pharmacy' },
    ] },
  { slug: 'mental-capacity-dols', title: 'Mental Capacity and DoLS Policy', price_pence: 7900, bundles: [STARTER, CLINICAL],
    description: 'Capacity assessment, best-interests decisions and deprivation of liberty safeguards under the MCA 2005.',
    fields: [{ key: 'mca_lead', label: 'Mental capacity and DoLS lead' }] },
  { slug: 'health-and-safety', title: 'Health and Safety Policy', price_pence: 7900, bundles: [STARTER, HS],
    description: 'Your general statement, organisation and arrangements under the Health and Safety at Work etc. Act 1974.',
    fields: [
      { key: 'health_safety_lead', label: 'Health and safety lead' },
      { key: 'competent_person', label: 'Competent person (H&S assistance)', help: 'Internal or external adviser' },
    ] },

  // ── Standard, £69 ───────────────────────────────────────────────────────────
  { slug: 'infection-prevention-control', title: 'Infection Prevention and Control Policy', price_pence: 6900, bundles: [STARTER, CLINICAL],
    description: 'IPC arrangements aligned to the Code of Practice, including audit and cleaning schedules.',
    fields: [{ key: 'ipc_lead', label: 'Infection prevention and control lead' }] },
  { slug: 'data-protection-gdpr', title: 'Data Protection and GDPR Policy', price_pence: 6900, bundles: [STARTER, GOVERNANCE],
    description: 'Lawful handling of personal and special category data under UK GDPR and the Data Protection Act 2018.',
    fields: [
      { key: 'ico_registration', label: 'ICO registration number' },
      { key: 'dpo_name', label: 'Data protection officer (if appointed)' },
    ] },
  { slug: 'fire-safety', title: 'Fire Safety Policy', price_pence: 6900, bundles: [STARTER, HS],
    description: 'Prevention, detection, evacuation (including PEEPs) and staff responsibilities under the Fire Safety Order 2005.',
    fields: [
      { key: 'fire_safety_officer', label: 'Fire safety officer' },
      { key: 'fire_risk_assessment_date', label: 'Date of last fire risk assessment' },
    ] },
  { slug: 'complaints', title: 'Complaints Policy', price_pence: 6900, bundles: [STARTER],
    description: 'Receiving, investigating and learning from complaints under Regulation 16, including LGSCO signposting.',
    fields: [{ key: 'complaints_lead', label: 'Complaints lead' }] },
  { slug: 'duty-of-candour', title: 'Duty of Candour Policy', price_pence: 6900, bundles: [STARTER, GOVERNANCE],
    description: 'Being open and honest when things go wrong, under Regulation 20.' },
  { slug: 'consent-to-care', title: 'Consent to Care and Treatment Policy', price_pence: 6900, bundles: [STARTER, CLINICAL],
    description: 'Seeking, recording and reviewing consent, including where capacity fluctuates.' },
  { slug: 'safer-recruitment-dbs', title: 'Safer Recruitment and DBS Policy', price_pence: 6900, bundles: [STARTER, HR],
    description: 'Fit and proper persons, DBS checks, references and ongoing suitability under Regulation 19.',
    fields: [{ key: 'hr_contact', label: 'HR / recruitment contact' }] },
  { slug: 'whistleblowing', title: 'Whistleblowing and Freedom to Speak Up Policy', price_pence: 6900, bundles: [STARTER, HR],
    description: 'Raising concerns safely, PIDA protections, and your speak-up arrangements.',
    fields: [{ key: 'speak_up_guardian', label: 'Freedom to Speak Up Guardian' }] },
  { slug: 'moving-and-handling', title: 'Moving and Handling Policy', price_pence: 6900, bundles: [STARTER, HS],
    description: 'Safe moving and handling of people and loads, training and equipment under LOLER and MHOR.',
    fields: [{ key: 'moving_handling_lead', label: 'Moving and handling lead' }] },
  { slug: 'incident-reporting', title: 'Incident and Accident Reporting Policy', price_pence: 6900, bundles: [STARTER, HS],
    description: 'Recording, investigating and learning from incidents, RIDDOR and CQC notifications.' },
  { slug: 'controlled-drugs', title: 'Controlled Drugs Policy', price_pence: 6900, bundles: [CLINICAL],
    description: 'Receipt, storage, administration, recording and destruction of controlled drugs.',
    fields: [{ key: 'medicines_lead', label: 'Medicines lead' }] },
  { slug: 'care-planning', title: 'Care Planning Policy', price_pence: 6900, bundles: [CLINICAL],
    description: 'Person-centred assessment, planning, review and involvement under Regulations 9 and 12.' },
  { slug: 'end-of-life-care', title: 'End of Life and Palliative Care Policy', price_pence: 6900, bundles: [CLINICAL],
    description: 'Advance care planning, symptom management, dignity in dying and support for families.',
    fields: [{ key: 'eol_lead', label: 'End of life care lead' }] },
  { slug: 'positive-behaviour-support', title: 'Positive Behaviour Support Policy', price_pence: 6900, bundles: [CLINICAL],
    description: 'Understanding behaviour as communication, proactive support and reducing restrictive practice.' },
  { slug: 'restraint-least-restrictive', title: 'Restraint and Least Restrictive Practice Policy', price_pence: 6900, bundles: [CLINICAL],
    description: 'When restriction is lawful, proportionate and recorded, and how it is reduced.' },
  { slug: 'mental-health-act', title: 'Mental Health Act Policy', price_pence: 6900, bundles: [CLINICAL],
    description: 'Duties for people subject to the MHA 1983, including section 117 aftercare, guardianship and detention interfaces.' },
  { slug: 'outbreak-management', title: 'Outbreak Management Policy', price_pence: 6900, bundles: [CLINICAL],
    description: 'Recognising, containing and reporting infectious outbreaks with your escalation contacts.',
    fields: [{ key: 'ipc_lead', label: 'Infection prevention and control lead' }] },
  { slug: 'safe-care-treatment', title: 'Safe Care and Treatment Policy', price_pence: 6900, bundles: [CLINICAL],
    description: 'The Regulation 12 umbrella: risk assessment, safe premises, medicines and infection prevention brought together.' },
  { slug: 'clinical-governance', title: 'Clinical Governance Policy', price_pence: 6900, bundles: [CLINICAL, GOVERNANCE],
    description: 'How clinical quality is led, measured, audited and improved.' },
  { slug: 'disciplinary-grievance', title: 'Disciplinary and Grievance Policy', price_pence: 6900, bundles: [HR],
    description: 'Fair, ACAS-aligned disciplinary and grievance procedures.',
    fields: [{ key: 'hr_contact', label: 'HR / recruitment contact' }] },
  { slug: 'statement-of-purpose', title: 'Statement of Purpose', price_pence: 6900, bundles: [GOVERNANCE],
    description: 'Your registered Statement of Purpose under the 2009 Registration Regulations, ready to file with CQC.',
    fields: [{ key: 'services_provided', label: 'Regulated activities and services provided' }] },

  // ── Standard, £59 ───────────────────────────────────────────────────────────
  { slug: 'dignity-and-respect', title: 'Dignity and Respect Policy', price_pence: 5900, bundles: [STARTER],
    description: 'Treating people with dignity, respect and privacy under Regulation 10.' },
  { slug: 'equality-and-diversity', title: 'Equality, Diversity and Human Rights Policy', price_pence: 5900, bundles: [STARTER, HR],
    description: 'Meeting the Equality Act 2010 and human rights obligations in care delivery and employment.' },
  { slug: 'nutrition-and-hydration', title: 'Nutrition and Hydration Policy', price_pence: 5900, bundles: [STARTER, CLINICAL],
    description: 'Meeting nutrition and hydration needs under Regulation 14, including screening and fortified diets.',
    fields: [{ key: 'nutrition_lead', label: 'Nutrition and hydration lead' }] },
  { slug: 'food-safety-allergens', title: 'Food Safety and Allergen Policy', price_pence: 5900, bundles: [STARTER],
    description: 'Food hygiene, allergen management and Natasha’s Law compliance.',
    fields: [{ key: 'food_safety_lead', label: 'Food safety and allergen lead' }] },
  { slug: 'confidentiality', title: 'Confidentiality Policy', price_pence: 5900, bundles: [STARTER, GOVERNANCE],
    description: 'Keeping personal information confidential, and when sharing is right.' },
  { slug: 'business-continuity', title: 'Business Continuity Policy', price_pence: 5900, bundles: [STARTER, GOVERNANCE],
    description: 'Keeping people safe through outages, staffing crises and emergencies, with your escalation contacts.',
    fields: [{ key: 'emergency_contact', label: 'Out-of-hours emergency contact' }] },
  { slug: 'assessment-of-needs', title: 'Assessment of Needs Policy', price_pence: 5900, bundles: [CLINICAL],
    description: 'Pre-admission and ongoing needs assessment feeding directly into care plans.' },
  { slug: 'person-centred-care', title: 'Person-Centred Care Policy', price_pence: 5900, bundles: [CLINICAL],
    description: 'Care built around each person’s preferences, strengths and goals under Regulation 9.' },
  { slug: 'caldicott', title: 'Caldicott and Information Sharing Policy', price_pence: 5900, bundles: [GOVERNANCE],
    description: 'The Caldicott principles applied to your service, and who decides when data is shared.',
    fields: [{ key: 'caldicott_guardian', label: 'Caldicott Guardian' }] },
  { slug: 'records-management', title: 'Records Management Policy', price_pence: 5900, bundles: [GOVERNANCE],
    description: 'Creating, storing, retaining and destroying records, aligned to the Records Management Code.' },
  { slug: 'information-governance', title: 'Information Governance Policy', price_pence: 5900, bundles: [GOVERNANCE],
    description: 'The framework over your data policies: accountability, training, breaches and DSPT alignment.' },
  { slug: 'cqc-notifications', title: 'CQC Notifications Policy', price_pence: 5900, bundles: [GOVERNANCE],
    description: 'Which events must be notified to CQC, by whom, and how fast.' },
  { slug: 'quality-assurance-audit', title: 'Quality Assurance and Audit Policy', price_pence: 5900, bundles: [GOVERNANCE],
    description: 'Your audit calendar, how findings become actions, and how improvement is evidenced under Regulation 17.' },
  { slug: 'risk-management', title: 'Risk Management Policy', price_pence: 5900, bundles: [GOVERNANCE],
    description: 'Identifying, assessing, recording and reviewing risk across care and operations.' },
  { slug: 'governance', title: 'Governance Policy', price_pence: 5900, bundles: [GOVERNANCE],
    description: 'How the service is directed and held to account: leadership, oversight and reporting lines.' },
  { slug: 'fit-and-proper-persons', title: 'Fit and Proper Persons Policy', price_pence: 5900, bundles: [GOVERNANCE, HR],
    description: 'Directors and managers meeting Regulation 5, at appointment and continuously.' },
  { slug: 'supervision-appraisal', title: 'Supervision and Appraisal Policy', price_pence: 5900, bundles: [HR],
    description: 'Regular supervision and annual appraisal under Regulation 18, with frequencies and records.' },
  { slug: 'training-development', title: 'Training and Development Policy', price_pence: 5900, bundles: [HR],
    description: 'Induction, mandatory training and refreshers, mapped to the Care Certificate.',
    fields: [{ key: 'training_lead', label: 'Training lead' }] },
  { slug: 'staffing-rota', title: 'Staffing and Rota Policy', price_pence: 5900, bundles: [HR],
    description: 'Safe staffing levels, skill mix, dependency review and rota management.' },
  { slug: 'gas-safety', title: 'Gas Safety Policy', price_pence: 5900, bundles: [HS],
    description: 'Annual gas safety checks, maintenance and emergency procedures.',
    fields: [
      { key: 'maintenance_lead', label: 'Maintenance lead' },
      { key: 'gas_engineer', label: 'Gas Safe registered engineer / contractor' },
    ] },
  { slug: 'electrical-safety', title: 'Electrical Safety Policy', price_pence: 5900, bundles: [HS],
    description: 'Fixed installation testing, PAT and safe use of electrical equipment.',
    fields: [
      { key: 'maintenance_lead', label: 'Maintenance lead' },
      { key: 'eicr_date', label: 'Date of last electrical installation report (EICR)' },
    ] },
  { slug: 'asbestos-management', title: 'Asbestos Management Policy', price_pence: 5900, bundles: [HS],
    description: 'The duty to manage asbestos: register, survey, and safe systems of work.',
    fields: [
      { key: 'maintenance_lead', label: 'Maintenance lead' },
      { key: 'asbestos_survey_date', label: 'Date of asbestos survey / register review' },
    ] },
  { slug: 'equipment-loler', title: 'Equipment and Lifting (LOLER) Policy', price_pence: 5900, bundles: [HS],
    description: 'Selection, maintenance and statutory examination of equipment, including hoists and slings.',
    fields: [{ key: 'equipment_contractor', label: 'Equipment service contractor' }] },
  { slug: 'premises-maintenance', title: 'Premises and Maintenance Policy', price_pence: 5900, bundles: [HS],
    description: 'Keeping the premises safe, suitable and maintained under Regulation 15.',
    fields: [{ key: 'maintenance_lead', label: 'Maintenance lead' }] },
  { slug: 'water-safety-legionella', title: 'Water Safety and Legionella Policy', price_pence: 5900, bundles: [HS],
    description: 'Legionella risk management under HSG274 and L8.',
    fields: [
      { key: 'water_safety_lead', label: 'Water safety lead' },
      { key: 'legionella_assessment_date', label: 'Date of last legionella risk assessment' },
    ] },
  { slug: 'learning-disability-autism', title: 'Learning Disability and Autism Policy', price_pence: 5900, bundles: [CLINICAL],
    description: 'Right support, right care, right culture, and the Oliver McGowan training duty.' },

  // ── Lighter, £49 ────────────────────────────────────────────────────────────
  { slug: 'coshh', title: 'COSHH Policy', price_pence: 4900, bundles: [HS],
    description: 'Control of substances hazardous to health: assessment, storage and safe use.' },
  { slug: 'first-aid', title: 'First Aid Policy', price_pence: 4900, bundles: [HS],
    description: 'First aid arrangements, appointed persons and kit under the First-Aid Regulations 1981.',
    fields: [{ key: 'first_aid_person', label: 'First aid appointed person' }] },
  { slug: 'evacuation', title: 'Evacuation Policy', price_pence: 4900, bundles: [HS],
    description: 'Whole-building and progressive-horizontal evacuation, PEEPs and assembly.' },
  { slug: 'working-time', title: 'Working Time Policy', price_pence: 4900, bundles: [HR],
    description: 'Hours, rest breaks, night work and opt-outs under the Working Time Regulations.' },
  { slug: 'professional-standards', title: 'Professional Standards and Conduct Policy', price_pence: 4900, bundles: [HR],
    description: 'The conduct expected of every member of staff, on shift and online.' },
  { slug: 'oliver-mcgowan-training', title: 'Oliver McGowan Training Policy', price_pence: 4900, bundles: [HR],
    description: 'Meeting the statutory learning disability and autism training duty at the right tier per role.' },
  { slug: 'modern-slavery', title: 'Modern Slavery and Human Trafficking Policy', price_pence: 4900,
    description: 'Recognising exploitation risk in your workforce and supply chain, and how concerns are raised.' },
  { slug: 'anti-bribery-gifts', title: 'Anti-Bribery, Gifts and Hospitality Policy', price_pence: 4900,
    description: 'The Bribery Act 2010 applied to care: gifts, wills, loans and financial boundaries with residents.' },
  { slug: 'prevent', title: 'Prevent and Counter-Terrorism Policy', price_pence: 4900,
    description: 'The Prevent duty: recognising radicalisation risk and how referrals are made.' },
  { slug: 'communication', title: 'Communication Policy', price_pence: 4900,
    description: 'How the service communicates with people, families and professionals, including interpreters.' },
  { slug: 'rehabilitation', title: 'Rehabilitation and Reablement Policy', price_pence: 4900, bundles: [CLINICAL],
    description: 'Promoting independence through goal-based reablement and therapy involvement.' },
  { slug: 'cqc-compliance', title: 'CQC Compliance Policy', price_pence: 4900, bundles: [GOVERNANCE],
    description: 'How the service tracks the fundamental standards and prepares for inspection.' },
  { slug: 'reasonable-adjustments', title: 'Reasonable Adjustments Policy', price_pence: 4900,
    description: 'Anticipating and making adjustments for disabled people under the Equality Act 2010.' },

  // ── The taster, £39 ─────────────────────────────────────────────────────────
  { slug: 'accessible-information', title: 'Accessible Information Standard Policy', price_pence: 3900, taster: true,
    description: 'Identifying, recording and meeting communication needs under the Accessible Information Standard. Our trial policy: same personalisation, same human review, same updates.' },
]
