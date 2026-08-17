// Ready-made programme (diploma / pathway) templates. A template names its units by
// TITLE, not by id, so /admin/standard-programmes/from-template can assemble it
// against whatever is actually published in the standard library — and report the
// units it could not find rather than failing.
//
// IMPORTANT — "published" is not "CPD accredited". A module only needs
// approved = true (published to tenants) to be used as a unit. cpd_accredited is a
// separate, paid accreditation. So every diploma below can be built and piloted from
// today's library, and each one's certificate gains CPD branding later, as its units
// become accredited, with no rebuild: tick the programme's CPD flag once its units
// are all accredited (the publish QA warns you if you tick it too early).
//
// Naming discipline: these are CareStream programmes, NOT Ofqual-regulated
// qualifications. Never add an RQF level to a name ("Level 3 Diploma…"), and keep
// the certificate disclaimer intact.

export type ProgrammeTemplateUnit = {
  title:        string          // the standard-library module title to look for
  aliases?:     string[]        // alternative titles to match on
  is_optional?: boolean
}

export type ProgrammeTemplate = {
  slug:                string
  name:                string
  description:         string
  kind:                'diploma' | 'pathway' | 'award'
  group_key?:          string
  care_setting?:       string          // NULL/absent = every setting
  outcomes:            string[]
  standards?:          Array<{ framework: string; code: string }>
  units:               ProgrammeTemplateUnit[]
  sequential?:         boolean
  require_practical?:  boolean
  require_reflection?: boolean
  synoptic_pass_mark?: number
  renewal_months?:     number | null
  price_pence?:        number | null
}

// ── Unit title shorthands ────────────────────────────────────────────────────
// Referencing the library by constant keeps the templates below free of typos.
const U: Record<string, ProgrammeTemplateUnit> = {
  // Core mandatory
  careCert:      { title: 'Care Certificate', aliases: ['care certificate standards'] },
  safeguarding:  { title: 'Safeguarding Adults and Children', aliases: ['safeguarding'] },
  movingHandling:{ title: 'Moving and Handling of People', aliases: ['manual handling'] },
  fire:          { title: 'Fire Safety', aliases: ['fire awareness'] },
  firstAid:      { title: 'First Aid / Basic Life Support', aliases: ['BLS', 'first aid'] },
  ipc:           { title: 'Infection Prevention and Control', aliases: ['IPC', 'infection control'] },
  medication:    { title: 'Medication Administration and Competency', aliases: ['medicines management'] },
  mca:           { title: 'Mental Capacity Act and DoLS', aliases: ['MCA', 'DoLS'] },
  edi:           { title: 'Equality, Diversity and Inclusion', aliases: ['EDI', 'equality'] },
  foodHygiene:   { title: 'Food Hygiene', aliases: ['food safety'] },
  // Health & safety
  healthSafety:  { title: 'General Health & Safety Awareness', aliases: ['health and safety'] },
  coshh:         { title: 'COSHH (Control of Substances Hazardous to Health)', aliases: ['coshh'] },
  riddor:        { title: 'RIDDOR (Accident and Incident Reporting)', aliases: ['riddor', 'accident reporting'] },
  loneWorking:   { title: 'Lone Working Awareness', aliases: ['lone worker'] },
  dse:           { title: 'Display Screen Equipment (DSE)', aliases: ['dse'] },
  legionella:    { title: 'Legionella / Water Safety Awareness', aliases: ['legionella', 'water safety'] },
  electrical:    { title: 'Electrical Safety', aliases: ['electrical'] },
  kitchenLaundry:{ title: 'Kitchen and Laundry Safety', aliases: ['kitchen safety', 'laundry safety'] },
  slipsTrips:    { title: 'Slips, Trips and Falls', aliases: ['slips trips falls'] },
  // Care & clinical
  dementia:      { title: 'Dementia Awareness', aliases: ['dementia'] },
  mentalHealth:  { title: 'Mental Health Awareness', aliases: ['mental health'] },
  cultural:      { title: 'Cultural Diversity in Care', aliases: ['cultural diversity', 'cultural competence'] },
  endOfLife:     { title: 'End of Life / Palliative Care', aliases: ['palliative', 'end of life'] },
  nutrition:     { title: 'Nutrition and Hydration', aliases: ['nutrition', 'hydration'] },
  pressureUlcer: { title: 'Pressure Ulcer (Tissue Viability) Prevention', aliases: ['pressure ulcer', 'tissue viability'] },
  falls:         { title: 'Falls Prevention', aliases: ['falls'] },
  continence:    { title: 'Continence Care', aliases: ['continence'] },
  oralHealth:    { title: 'Oral Health', aliases: ['oral care', 'mouth care'] },
  deteriorating: { title: 'Recognising the Deteriorating Resident', aliases: ['deteriorating resident', 'soft signs', 'NEWS2'] },
  sepsis:        { title: 'Sepsis Awareness', aliases: ['sepsis'] },
  // Conduct & governance
  candour:       { title: 'Duty of Candour', aliases: ['duty of candour'] },
  whistleblowing:{ title: 'Whistleblowing', aliases: ['speaking up'] },
  complaints:    { title: 'Complaints Handling', aliases: ['complaints'] },
  prevent:       { title: 'Prevent Duty (Counter-Terrorism Awareness)', aliases: ['prevent', 'radicalisation'] },
  communication: { title: 'Communication / Professional Behaviour', aliases: ['professional behaviour', 'communication'] },
  // Data & technology
  cyber:         { title: 'Cyber Security', aliases: ['cyber security', 'phishing'] },
  gdpr:          { title: 'GDPR / Data Protection', aliases: ['data protection', 'GDPR'] },
  dataOptOut:    { title: 'National Data Opt-out', aliases: ['national data opt-out'] },
  recordKeeping: { title: 'Documentation and Record Keeping', aliases: ['record keeping', 'documentation'] },
  ico:           { title: 'ICO Training', aliases: ['ICO', 'information commissioner'] },
  // Role specific
  pbs:           { title: 'Positive Behaviour Support / De-escalation', aliases: ['PBS', 'de-escalation'] },
  epilepsy:      { title: 'Epilepsy and Buccal Midazolam Administration', aliases: ['epilepsy', 'buccal midazolam'] },
  diabetes:      { title: 'Diabetes Awareness', aliases: ['diabetes'] },
  catheter:      { title: 'Catheter Care', aliases: ['catheter'] },
  peg:           { title: 'PEG Feeding Care', aliases: ['PEG', 'enteral feeding'] },
  challenging:   { title: 'Challenging Behaviour Management', aliases: ['challenging behaviour'] },
}

const CQC_SAFE      = { framework: 'cqc', code: 'SAFE' }
const CQC_EFFECTIVE = { framework: 'cqc', code: 'EFFECTIVE' }
const CQC_CARING    = { framework: 'cqc', code: 'CARING' }
const CQC_WELLLED   = { framework: 'cqc', code: 'WELLLED' }
const CQC_RESPONSIVE= { framework: 'cqc', code: 'RESPONSIVE' }

// ═══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL DIPLOMAS — sellable to every client, in any setting
// ═══════════════════════════════════════════════════════════════════════════════

const HEALTH_AND_SOCIAL_CARE: ProgrammeTemplate = {
  slug: 'diploma-health-and-social-care',
  name: 'Diploma in Health and Social Care',
  kind: 'diploma',
  group_key: 'core_mandatory',
  description:
    'A broad grounding in UK adult health and social care: the role and its boundaries, the law on consent and capacity, ' +
    'safeguarding, communication, equality and inclusion, mental health and dementia, and the everyday practice that ' +
    'prevents avoidable harm. Twelve taught units, a cross-unit final assessment, an observed competency sign-off and a ' +
    'reflective account. Around eight to ten hours of learning, delivered in the learner\'s own language.',
  outcomes: [
    'Describe the roles, responsibilities and boundaries of a worker in a UK adult social care team, and explain the duty of care each worker holds.',
    'Apply person-centred communication techniques, including with people living with dementia, a sensory impairment, or who speak English as an additional language.',
    'Explain the legal and ethical basis of consent, mental capacity and best-interests decisions under the Mental Capacity Act 2005, and work within it.',
    'Recognise the signs of abuse and neglect, and take the correct safeguarding, whistleblowing and duty-of-candour action.',
    'Promote equality, diversity and inclusion in daily practice, and challenge discriminatory practice when it occurs.',
    'Explain how mental ill health and dementia affect wellbeing, and describe ethical practice when supporting someone who may lack capacity.',
    'Apply infection prevention, nutrition and hydration measures that prevent avoidable harm and actively promote health.',
    'Record and report care accurately, and explain why the written record is the evidence that safe care was given.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC1' }, { framework: 'care_certificate', code: 'CC3' },
    { framework: 'care_certificate', code: 'CC4' }, { framework: 'care_certificate', code: 'CC5' },
    { framework: 'care_certificate', code: 'CC6' }, { framework: 'care_certificate', code: 'CC7' },
    { framework: 'care_certificate', code: 'CC8' }, { framework: 'care_certificate', code: 'CC9' },
    { framework: 'care_certificate', code: 'CC10' }, { framework: 'care_certificate', code: 'CC14' },
    { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG10' },
    { framework: 'regulation', code: 'REG11' }, { framework: 'regulation', code: 'REG13' },
    { framework: 'regulation', code: 'REG14' },
    { framework: 'legislation', code: 'MCA2005' }, { framework: 'legislation', code: 'EQ2010' },
    CQC_SAFE, CQC_CARING, CQC_EFFECTIVE,
  ],
  units: [
    U.careCert, U.communication, U.edi, U.mca, U.safeguarding, U.candour,
    U.mentalHealth, U.dementia, U.ipc, U.nutrition, U.recordKeeping,
    { ...U.endOfLife, is_optional: true }, { ...U.cultural, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: null,
  price_pence: 19999,
}

const DEMENTIA_AND_MENTAL_HEALTH: ProgrammeTemplate = {
  slug: 'diploma-dementia-and-mental-health-care',
  name: 'Diploma in Dementia and Mental Health Care',
  kind: 'diploma',
  group_key: 'care_clinical',
  description:
    'For staff supporting people living with dementia or mental ill health. Covers what dementia and common mental ' +
    'health conditions do to a person, how to communicate when words are failing, how to respond to distress without ' +
    'restrictive practice, and the daily care — eating, drinking, mouth care, continence — that prevents avoidable decline.',
  outcomes: [
    'Describe the common types of dementia and how each typically affects memory, communication, mood and daily living.',
    'Recognise common mental health conditions and describe their effect on a person\'s wellbeing, capacity and engagement with care.',
    'Adapt communication to the person in front of you, and identify when distress is being expressed through behaviour rather than words.',
    'Apply de-escalation and positive behaviour support in place of restrictive practice, and explain why restraint is a last resort.',
    'Apply the Mental Capacity Act 2005 to day-to-day decisions, including best-interests decisions and DoLS.',
    'Explain how nutrition, hydration, oral health and continence needs change for someone living with dementia, and adapt care accordingly.',
    'Deliver culturally sensitive care that reflects the person\'s history, faith and identity.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC5' }, { framework: 'care_certificate', code: 'CC6' },
    { framework: 'care_certificate', code: 'CC7' }, { framework: 'care_certificate', code: 'CC9' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG10' },
    { framework: 'regulation', code: 'REG11' },
    { framework: 'legislation', code: 'MCA2005' },
    CQC_CARING, CQC_EFFECTIVE, CQC_RESPONSIVE,
  ],
  units: [
    U.dementia, U.mentalHealth, U.communication, U.mca, U.pbs, U.challenging,
    U.nutrition, U.oralHealth, U.continence, U.cultural,
    { ...U.endOfLife, is_optional: true }, { ...U.falls, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 24,
  price_pence: 17999,
}

const SAFEGUARDING_AND_PRACTICE: ProgrammeTemplate = {
  slug: 'diploma-safeguarding-and-professional-practice',
  name: 'Diploma in Safeguarding and Professional Practice',
  kind: 'diploma',
  group_key: 'conduct_governance',
  description:
    'The governance and accountability side of care work: spotting and reporting abuse, working within the Mental ' +
    'Capacity Act, speaking up safely, being open when something goes wrong, handling complaints properly, and keeping ' +
    'records and personal data the way the law requires. Built for senior carers, team leaders and aspiring managers.',
  outcomes: [
    'Recognise the categories and indicators of abuse and neglect, and follow local safeguarding procedures to report them.',
    'Apply the Mental Capacity Act 2005, including assessing capacity and making and recording best-interests decisions.',
    'Explain the statutory duty of candour and describe what must be said, to whom, and how it is recorded.',
    'Use whistleblowing routes correctly, and explain the protections available to someone who raises a concern.',
    'Handle a complaint through to resolution, and explain how complaints evidence service improvement.',
    'Meet the Prevent duty, recognising and escalating signs of radicalisation.',
    'Promote equality and inclusion, and challenge discriminatory practice when it occurs.',
    'Keep records and handle personal data lawfully under the Data Protection Act 2018 and UK GDPR.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC3' }, { framework: 'care_certificate', code: 'CC4' },
    { framework: 'care_certificate', code: 'CC10' }, { framework: 'care_certificate', code: 'CC11' },
    { framework: 'care_certificate', code: 'CC14' },
    { framework: 'regulation', code: 'REG11' }, { framework: 'regulation', code: 'REG13' },
    { framework: 'regulation', code: 'REG16' }, { framework: 'regulation', code: 'REG17' },
    { framework: 'legislation', code: 'MCA2005' }, { framework: 'legislation', code: 'EQ2010' },
    { framework: 'legislation', code: 'DPA2018' },
    CQC_SAFE, CQC_WELLLED,
  ],
  units: [
    U.safeguarding, U.mca, U.candour, U.whistleblowing, U.complaints, U.prevent,
    U.edi, U.communication, U.recordKeeping, U.gdpr,
    { ...U.ico, is_optional: true },
  ],
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 24,
  price_pence: 17999,
}

const HEALTH_SAFETY_COMPLIANCE: ProgrammeTemplate = {
  slug: 'diploma-health-safety-and-environmental-compliance',
  name: 'Diploma in Health, Safety and Environmental Compliance',
  kind: 'diploma',
  group_key: 'health_safety',
  description:
    'The whole statutory health and safety picture for a care setting in one programme: general duties under the Health ' +
    'and Safety at Work Act, hazardous substances, accident reporting, fire, moving and handling, water and electrical ' +
    'safety, kitchen and laundry risk, infection prevention and food hygiene. Aimed at maintenance leads, health and ' +
    'safety representatives and registered managers.',
  outcomes: [
    'Explain the duties employers and employees hold under the Health and Safety at Work etc. Act 1974 and describe how they apply in a care setting.',
    'Identify hazardous substances, read a safety data sheet, and apply COSHH controls in daily work.',
    'Decide what is reportable under RIDDOR, and report and record accidents and incidents correctly.',
    'Carry out fire prevention duties, and describe your role in evacuation, including for residents who cannot self-evacuate.',
    'Apply safe moving and handling technique, and explain how a person\'s handling risk assessment governs practice.',
    'Describe the controls that manage legionella, electrical, kitchen and laundry risk, and recognise when to escalate a defect.',
    'Apply infection prevention and food hygiene practice that protects residents, staff and visitors.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC13' }, { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG12' }, { framework: 'regulation', code: 'REG15' },
    { framework: 'legislation', code: 'HASAWA' }, { framework: 'legislation', code: 'COSHH' },
    { framework: 'legislation', code: 'RIDDOR' }, { framework: 'legislation', code: 'RRO2005' },
    CQC_SAFE, CQC_WELLLED,
  ],
  units: [
    U.healthSafety, U.coshh, U.riddor, U.fire, U.movingHandling, U.slipsTrips,
    U.legionella, U.electrical, U.kitchenLaundry, U.ipc, U.foodHygiene,
    { ...U.loneWorking, is_optional: true }, { ...U.dse, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 17999,
}

const CLINICAL_CARE_SKILLS: ProgrammeTemplate = {
  slug: 'diploma-clinical-care-skills',
  name: 'Diploma in Clinical Care Skills',
  kind: 'diploma',
  group_key: 'care_clinical',
  description:
    'The clinical judgement and practical care that keeps people safe day to day: spotting deterioration and sepsis ' +
    'early, preventing pressure damage and falls, managing continence, catheter and PEG care, supporting people with ' +
    'diabetes, and administering medicines safely. Several units carry an observed competency sign-off.',
  outcomes: [
    'Recognise the soft signs of deterioration, use an escalation tool, and escalate promptly to the right person.',
    'Identify the red flags of sepsis and initiate the correct escalation without delay.',
    'Assess and reduce pressure damage risk, and describe repositioning, skin inspection and equipment use.',
    'Assess falls risk and apply multifactorial falls-prevention measures.',
    'Deliver dignified continence and catheter care, recognising signs of infection and blockage.',
    'Support enteral (PEG) feeding safely and recognise complications requiring escalation.',
    'Describe how diabetes is managed and recognise and respond to hypo- and hyperglycaemia.',
    'Administer and record medicines within your competence, and explain the "six rights" and what to do after an error.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC8' }, { framework: 'care_certificate', code: 'CC13' },
    { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG12' },
    { framework: 'regulation', code: 'REG14' },
    CQC_SAFE, CQC_EFFECTIVE,
  ],
  units: [
    U.deteriorating, U.sepsis, U.pressureUlcer, U.falls, U.continence, U.catheter,
    U.peg, U.diabetes, U.medication, U.nutrition, U.oralHealth,
    { ...U.epilepsy, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 19999,
}

const END_OF_LIFE: ProgrammeTemplate = {
  slug: 'diploma-end-of-life-and-palliative-care',
  name: 'Diploma in End of Life and Palliative Care',
  kind: 'diploma',
  group_key: 'care_clinical',
  description:
    'Caring well for someone in the last months, weeks and days of life: recognising that a person is dying, advance ' +
    'care planning and best-interests decisions, comfort care and symptom recognition, communicating honestly with ' +
    'families, and the dignity work that matters most at the end.',
  outcomes: [
    'Recognise when a person may be approaching the end of life and describe how care priorities change.',
    'Explain advance care planning, including how wishes, preferred place of care and DNACPR decisions are recorded and respected.',
    'Apply the Mental Capacity Act 2005 to best-interests decisions for someone who can no longer express their wishes.',
    'Deliver comfort-focused mouth care, skin care, positioning and continence care in the last days of life.',
    'Recognise pain and other distressing symptoms in someone who cannot tell you, and escalate appropriately.',
    'Communicate honestly and compassionately with families, and describe how the duty of candour applies.',
    'Adapt end of life care to the person\'s faith, culture and identity, including care after death.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC5' }, { framework: 'care_certificate', code: 'CC6' },
    { framework: 'care_certificate', code: 'CC7' }, { framework: 'care_certificate', code: 'CC8' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG10' },
    { framework: 'regulation', code: 'REG11' },
    { framework: 'legislation', code: 'MCA2005' },
    CQC_CARING, CQC_RESPONSIVE,
  ],
  units: [
    U.endOfLife, U.mca, U.communication, U.nutrition, U.oralHealth, U.pressureUlcer,
    U.continence, U.deteriorating, U.candour, U.cultural,
    { ...U.dementia, is_optional: true },
  ],
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 24,
  price_pence: 17999,
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTING-SPECIFIC DIPLOMAS — the ones a generic provider cannot produce
// ═══════════════════════════════════════════════════════════════════════════════

const COMPLEX_CARE: ProgrammeTemplate = {
  slug: 'diploma-complex-and-continuing-care',
  name: 'Diploma in Complex and Continuing Care',
  kind: 'diploma',
  group_key: 'care_clinical',
  care_setting: 'complex-care',
  description:
    'For staff delivering clinical interventions to people with long-term complex needs: tracheostomy and airway care, ' +
    'ventilation and respiratory support, suctioning, cough assist, and enteral feeding and stoma care. Every clinical ' +
    'unit carries an observed competency sign-off — the knowledge component alone is not competence.',
  outcomes: [
    'Describe tracheostomy anatomy and care, including humidification, tube changes, and recognising and responding to a blocked or displaced tube.',
    'Explain the principles of ventilation and non-invasive respiratory support, and recognise the signs of respiratory deterioration.',
    'Carry out airway suctioning safely within your competence, describing indications, technique and complications.',
    'Use cough assist safely and explain when it is indicated and when it must be stopped.',
    'Deliver enteral feeding and stoma care safely, recognising and escalating complications.',
    'Recognise deterioration and sepsis in a person with complex needs and escalate without delay.',
    'Explain how your competence is assessed, maintained and re-assessed, and the limits of your scope of practice.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC13' }, { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG12' },
    { framework: 'regulation', code: 'REG18' },
    CQC_SAFE, CQC_EFFECTIVE,
  ],
  units: [
    { title: 'Tracheostomy Care', aliases: ['tracheostomy', 'trache'] },
    { title: 'Ventilation and Respiratory Support', aliases: ['ventilation', 'respiratory support', 'NIV'] },
    { title: 'Airway Suctioning', aliases: ['suctioning', 'airway suction'] },
    { title: 'Cough Assist', aliases: ['cough assist', 'insufflation'] },
    { title: 'Enteral Feeding and Stoma Care', aliases: ['enteral feeding', 'stoma care'] },
    U.deteriorating, U.sepsis, U.medication,
    { ...U.epilepsy, is_optional: true },
  ],
  sequential: true,
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 29999,
}

const NURSING_HOME_CLINICAL: ProgrammeTemplate = {
  slug: 'diploma-nursing-home-clinical-practice',
  name: 'Diploma in Nursing Home Clinical Practice',
  kind: 'diploma',
  group_key: 'care_clinical',
  care_setting: 'nursing-homes',
  description:
    'The registered-nurse and senior-carer skill set in a nursing home: wound care and dressings, categorising pressure ' +
    'damage, subcutaneous, intramuscular and insulin injections, syringe drivers and anticipatory medicines, ' +
    'venepuncture and cannulation, plus dementia care done properly. Heavily practical — most units need an observed sign-off.',
  outcomes: [
    'Assess a wound, select an appropriate dressing, and describe the stages of wound healing and the signs of infection.',
    'Categorise pressure damage accurately and describe the management and escalation each category requires.',
    'Administer subcutaneous, intramuscular and insulin injections safely within your competence.',
    'Set up and monitor a syringe driver, and explain the role of anticipatory medicines at the end of life.',
    'Perform venepuncture and cannulation safely, describing site selection, technique and complications.',
    'Deliver person-centred dementia care, adapting communication and daily care to the individual.',
    'Provide culturally sensitive dementia care that reflects the person\'s history, faith and identity.',
    'Recognise deterioration and sepsis early and escalate to the right clinician without delay.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC9' }, { framework: 'care_certificate', code: 'CC13' },
    { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG12' },
    { framework: 'regulation', code: 'REG18' },
    CQC_SAFE, CQC_EFFECTIVE,
  ],
  units: [
    { title: 'Wound Care and Dressings', aliases: ['wound care', 'dressings'] },
    { title: 'Pressure Ulcer Categorisation and Tissue Viability Management', aliases: ['pressure ulcer categorisation', 'tissue viability management'] },
    { title: 'Subcutaneous, Intramuscular and Insulin Injections', aliases: ['injections', 'insulin injections'] },
    { title: 'Syringe Drivers and Anticipatory (End of Life) Medicines', aliases: ['syringe drivers', 'anticipatory medicines'] },
    { title: 'Venepuncture and Cannulation', aliases: ['venepuncture', 'cannulation', 'phlebotomy'] },
    { title: 'Dementia Care', aliases: ['dementia care'] },
    U.deteriorating, U.sepsis,
    { title: 'Cultural Diversity in Dementia Care', aliases: ['cultural diversity in dementia'], is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 29999,
}

const HOSPICE_PALLIATIVE: ProgrammeTemplate = {
  slug: 'diploma-hospice-and-palliative-care',
  name: 'Diploma in Hospice and Palliative Care',
  kind: 'diploma',
  group_key: 'care_clinical',
  care_setting: 'hospices',
  description:
    'Specialist palliative practice for hospice staff: symptom management, syringe drivers and subcutaneous medication, ' +
    'verification of expected death, bereavement and family support, and children\'s palliative care.',
  outcomes: [
    'Assess and manage pain and other distressing symptoms in palliative care, including for people who cannot self-report.',
    'Set up and monitor a syringe driver and administer subcutaneous medication safely within your competence.',
    'Carry out verification of expected death correctly, and describe the records and notifications that follow.',
    'Support bereaved families with skill and boundaries, and describe local bereavement pathways.',
    'Describe how palliative care differs for children and young people, and the family-centred approach it requires.',
    'Apply the Mental Capacity Act 2005 to best-interests decisions at the end of life.',
    'Communicate honestly about dying with patients and families, and recognise the limits of your own role.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC6' }, { framework: 'care_certificate', code: 'CC7' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG10' },
    { framework: 'regulation', code: 'REG11' },
    { framework: 'legislation', code: 'MCA2005' },
    CQC_CARING, CQC_RESPONSIVE, CQC_EFFECTIVE,
  ],
  units: [
    { title: 'Symptom Management in Palliative Care', aliases: ['symptom management'] },
    { title: 'Syringe Drivers and Subcutaneous Medication', aliases: ['syringe drivers', 'subcutaneous medication'] },
    { title: 'Verification of Expected Death', aliases: ['verification of death'] },
    { title: 'Bereavement and Family Support', aliases: ['bereavement'] },
    U.endOfLife, U.mca, U.communication,
    { title: 'Children’s Palliative Care', aliases: ['childrens palliative care'], is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 24999,
}

const DOMICILIARY: ProgrammeTemplate = {
  slug: 'diploma-domiciliary-care-practice',
  name: 'Diploma in Domiciliary Care Practice',
  kind: 'diploma',
  group_key: 'conduct_governance',
  care_setting: 'domiciliary-care',
  description:
    'Home care done safely and professionally: supporting medication in someone\'s own home, assessing risk in an ' +
    'environment you do not control, lone working, missed visits and welfare checks, keys and home security, and ' +
    'driving for work.',
  outcomes: [
    'Support and record medication in a person\'s own home within your competence and the care plan.',
    'Assess and manage risk in a home you do not control, and escalate hazards you cannot resolve.',
    'Work safely alone, using check-in procedures and knowing what to do when you feel unsafe.',
    'Follow missed-visit and welfare-check procedures correctly, and explain why the timing matters.',
    'Handle keys, key safes and entry to a person\'s home securely and accountably.',
    'Travel and drive for work safely and lawfully, managing fatigue and schedule pressure.',
    'Recognise and report safeguarding concerns seen in someone\'s home, including neglect and financial abuse.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC3' }, { framework: 'care_certificate', code: 'CC10' },
    { framework: 'care_certificate', code: 'CC13' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG12' },
    { framework: 'regulation', code: 'REG13' },
    { framework: 'legislation', code: 'HASAWA' }, { framework: 'legislation', code: 'MCA2005' },
    CQC_SAFE, CQC_RESPONSIVE,
  ],
  units: [
    { title: 'Medication Support in the Community', aliases: ['medication at home', 'MAR domiciliary'] },
    { title: 'Working Safely in People’s Homes', aliases: ['home environment risk', 'working safely in peoples homes'] },
    { title: 'Missed Visits and Welfare Checks', aliases: ['missed call', 'no reply protocol'] },
    { title: 'Keys, Entry and Home Security', aliases: ['key safe', 'entry to home'] },
    { title: 'Travelling and Driving for Work', aliases: ['driving at work', 'travel safety'] },
    U.loneWorking, U.safeguarding, U.mca,
    { ...U.recordKeeping, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 17999,
}

const RESIDENTIAL_CARE: ProgrammeTemplate = {
  slug: 'diploma-residential-care-practice',
  name: 'Diploma in Residential Care Practice',
  kind: 'diploma',
  group_key: 'care_clinical',
  care_setting: 'residential-care',
  description:
    'The craft of running a good care home day to day: person-centred care planning, meaningful activity and wellbeing, ' +
    'privacy and dignity, supporting residents\' money safely, and getting admissions and transitions right.',
  outcomes: [
    'Write and review a person-centred care plan that reflects the individual\'s history, preferences and goals.',
    'Plan and deliver meaningful activity and occupation, including for residents with high dependency or dementia.',
    'Protect privacy, dignity and respect in everyday practice, including during personal care.',
    'Support residents\' finances and personal allowances safely and accountably, recognising financial abuse.',
    'Manage admissions, settling in and transitions so that a move is planned, informed and as gentle as possible.',
    'Adapt care to the person\'s culture, faith and identity.',
    'Recognise and report safeguarding concerns, and apply the Mental Capacity Act to daily decisions.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC5' }, { framework: 'care_certificate', code: 'CC7' },
    { framework: 'care_certificate', code: 'CC10' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG10' },
    { framework: 'regulation', code: 'REG13' },
    { framework: 'legislation', code: 'MCA2005' },
    CQC_CARING, CQC_RESPONSIVE, CQC_EFFECTIVE,
  ],
  units: [
    { title: 'Person-Centred Care Planning', aliases: ['care planning', 'person centred care planning'] },
    { title: 'Activities, Wellbeing and Meaningful Occupation', aliases: ['activities', 'meaningful occupation'] },
    { title: 'Privacy, Dignity and Respect in a Care Home', aliases: ['privacy and dignity'] },
    { title: 'Supporting Residents’ Finances and Personal Allowances', aliases: ['residents finances', 'personal allowances'] },
    { title: 'Admissions, Settling In and Transitions', aliases: ['admissions', 'transitions'] },
    U.dementia, U.nutrition, U.safeguarding, U.mca,
    { ...U.cultural, is_optional: true },
  ],
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 24,
  price_pence: 17999,
}

const SUBSTANCE_MISUSE: ProgrammeTemplate = {
  slug: 'diploma-substance-misuse-recovery-practice',
  name: 'Diploma in Substance Misuse Recovery Practice',
  kind: 'diploma',
  group_key: 'care_clinical',
  care_setting: 'substance-misuse',
  description:
    'Practice in detox and recovery services: managing withdrawal safely, responding to overdose with naloxone, harm ' +
    'reduction, dual diagnosis, and blood-borne virus awareness.',
  outcomes: [
    'Describe the physiology and risks of withdrawal from alcohol and common drugs, and recognise a medical emergency.',
    'Recognise an opioid overdose and administer naloxone correctly, then escalate and record.',
    'Apply harm-reduction principles without judgement, and explain why they reduce deaths.',
    'Recognise dual diagnosis and describe how co-occurring mental ill health changes the support a person needs.',
    'Describe blood-borne virus transmission and the precautions and testing pathways that reduce risk.',
    'Recognise and report safeguarding concerns in a substance misuse setting.',
    'Apply the Mental Capacity Act 2005 where intoxication or withdrawal affects a person\'s capacity to decide.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC10' }, { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG12' },
    { framework: 'regulation', code: 'REG13' },
    { framework: 'legislation', code: 'MCA2005' },
    CQC_SAFE, CQC_EFFECTIVE,
  ],
  units: [
    { title: 'Substance Withdrawal and Detoxification', aliases: ['withdrawal', 'detoxification', 'detox'] },
    { title: 'Overdose Response and Naloxone', aliases: ['overdose', 'naloxone'] },
    { title: 'Harm Reduction', aliases: ['harm reduction'] },
    { title: 'Dual Diagnosis Awareness', aliases: ['dual diagnosis'] },
    { title: 'Blood-Borne Viruses Awareness', aliases: ['blood borne viruses', 'BBV'] },
    U.mentalHealth, U.safeguarding, U.mca,
    { ...U.ipc, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 19999,
}

const DENTAL_COMPLIANCE: ProgrammeTemplate = {
  slug: 'diploma-dental-practice-compliance',
  name: 'Diploma in Dental Practice Compliance',
  kind: 'diploma',
  group_key: 'conduct_governance',
  care_setting: 'dental-practices',
  description:
    'The compliance core of a UK dental practice: decontamination to HTM 01-05, radiography under IR(ME)R, medical ' +
    'emergencies, and GDC standards and scope of practice — the areas that carry a professional obligation to keep ' +
    'current, not just an employer one.',
  outcomes: [
    'Carry out instrument decontamination to HTM 01-05, describing each stage and the records that evidence it.',
    'Apply IR(ME)R and IRR17 duties to dental radiography, including justification, optimisation and the roles involved.',
    'Recognise and manage the medical emergencies a dental practice must be prepared for, including anaphylaxis and collapse.',
    'Explain the GDC Standards for the Dental Team and work within your registered scope of practice.',
    'Apply infection prevention and control across the clinical environment.',
    'Handle patient data lawfully under the Data Protection Act 2018 and UK GDPR.',
    'Recognise and report safeguarding concerns presenting in a dental setting.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC10' }, { framework: 'care_certificate', code: 'CC13' },
    { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG12' }, { framework: 'regulation', code: 'REG17' },
    { framework: 'legislation', code: 'HASAWA' }, { framework: 'legislation', code: 'DPA2018' },
    CQC_SAFE, CQC_WELLLED,
  ],
  units: [
    { title: 'Dental Decontamination and HTM 01-05', aliases: ['decontamination', 'HTM 01-05'] },
    { title: 'Dental Radiography and IR(ME)R', aliases: ['radiography', 'IRMER', 'IR(ME)R'] },
    { title: 'Medical Emergencies in the Dental Practice', aliases: ['medical emergencies', 'anaphylaxis'] },
    { title: 'GDC Standards and Scope of Practice', aliases: ['GDC standards', 'scope of practice'] },
    U.ipc, U.healthSafety, U.gdpr, U.safeguarding,
    { ...U.firstAid, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 19999,
}

const GP_PRACTICE: ProgrammeTemplate = {
  slug: 'diploma-gp-practice-support',
  name: 'Diploma in GP Practice Support',
  kind: 'diploma',
  group_key: 'conduct_governance',
  care_setting: 'gp-practices',
  description:
    'For the non-clinical and support workforce in general practice: vaccine storage and cold chain, repeat prescribing ' +
    'and medicines safety, telephone triage and care navigation, chaperoning, and test-results failsafe.',
  outcomes: [
    'Maintain the vaccine cold chain, monitor and record fridge temperatures, and manage a cold-chain excursion.',
    'Process repeat prescriptions safely, recognising the medicines-safety risks in the process.',
    'Carry out telephone triage and care navigation within protocol, and recognise when to escalate immediately.',
    'Act as a chaperone correctly, explaining the role, the boundaries and the records required.',
    'Operate a test-results failsafe so that no abnormal result goes unactioned.',
    'Apply infection prevention and control in a primary care environment.',
    'Handle patient data lawfully, including the National Data Opt-out and UK GDPR.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC6' }, { framework: 'care_certificate', code: 'CC14' },
    { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG12' }, { framework: 'regulation', code: 'REG17' },
    { framework: 'legislation', code: 'DPA2018' },
    CQC_SAFE, CQC_RESPONSIVE, CQC_WELLLED,
  ],
  units: [
    { title: 'Vaccine Storage and Cold Chain', aliases: ['vaccine storage', 'cold chain'] },
    { title: 'Repeat Prescribing and Medicines Safety', aliases: ['repeat prescribing', 'medicines safety'] },
    { title: 'Telephone Triage and Care Navigation', aliases: ['telephone triage', 'care navigation'] },
    { title: 'Chaperoning', aliases: ['chaperone'] },
    { title: 'Test Results Handling and Failsafe', aliases: ['test results', 'failsafe'] },
    U.ipc, U.gdpr, U.safeguarding,
    { ...U.dataOptOut, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 17999,
}

const INDEPENDENT_HOSPITAL: ProgrammeTemplate = {
  slug: 'diploma-independent-hospital-theatre-and-governance',
  name: 'Diploma in Independent Hospital Theatre and Governance',
  kind: 'diploma',
  group_key: 'conduct_governance',
  care_setting: 'independent-hospitals',
  description:
    'Perioperative safety and clinical governance in the independent sector: the WHO surgical safety checklist, consent ' +
    'for procedures, sterile services and instrument decontamination, VTE prevention, and the governance framework that ' +
    'holds it together.',
  outcomes: [
    'Run the WHO Surgical Safety Checklist correctly and explain the purpose of each phase.',
    'Describe valid consent for a procedure, including capacity, information given, and how it is recorded.',
    'Apply sterile services and instrument decontamination standards, and describe the tracking that evidences them.',
    'Assess venous thromboembolism risk and apply the appropriate prophylaxis and monitoring.',
    'Explain the clinical governance framework — audit, incident reporting, mortality and morbidity review — and your part in it.',
    'Apply the statutory duty of candour when a patient is harmed.',
    'Apply infection prevention and control across the perioperative pathway.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC13' }, { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG11' }, { framework: 'regulation', code: 'REG12' },
    { framework: 'regulation', code: 'REG17' },
    CQC_SAFE, CQC_EFFECTIVE, CQC_WELLLED,
  ],
  units: [
    { title: 'Surgical Safety and the WHO Checklist', aliases: ['WHO checklist', 'surgical safety'] },
    { title: 'Consent for Procedures', aliases: ['consent for procedures'] },
    { title: 'Sterile Services and Instrument Decontamination', aliases: ['sterile services', 'instrument decontamination'] },
    { title: 'Venous Thromboembolism (VTE) Prevention', aliases: ['VTE', 'venous thromboembolism'] },
    { title: 'Clinical Governance', aliases: ['clinical governance'] },
    U.ipc, U.candour, U.mca,
    { ...U.recordKeeping, is_optional: true },
  ],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 24999,
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATHWAYS — focused routes, shorter than the diploma bar
// ═══════════════════════════════════════════════════════════════════════════════

const DEMENTIA_CARE_PATHWAY: ProgrammeTemplate = {
  slug: 'pathway-dementia-care',
  name: 'Dementia Care Pathway',
  kind: 'pathway',
  group_key: 'care_clinical',
  description:
    'A focused pathway for staff supporting people living with dementia: what dementia does, how to communicate, ' +
    'how to respond to distress without restraint, and the everyday care that prevents avoidable decline.',
  outcomes: [
    'Describe the common types of dementia and how each typically affects memory, communication and daily living.',
    'Adapt communication to the person in front of you, and recognise when distress is being communicated through behaviour.',
    'Apply de-escalation and positive behaviour support instead of restrictive practice.',
    'Explain how nutrition, hydration, oral health and continence needs change for someone living with dementia.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC5' }, { framework: 'care_certificate', code: 'CC6' },
    { framework: 'care_certificate', code: 'CC9' },
    { framework: 'regulation', code: 'REG9' },
    { framework: 'legislation', code: 'MCA2005' },
    CQC_CARING,
  ],
  units: [
    U.dementia, U.communication, U.mca, U.pbs, U.nutrition,
    { ...U.oralHealth, is_optional: true }, { ...U.continence, is_optional: true },
  ],
  sequential: true,
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 24,
  price_pence: 9999,
}

const MEDICATION_PATHWAY: ProgrammeTemplate = {
  slug: 'pathway-medication-competency',
  name: 'Medication Competency Pathway',
  kind: 'pathway',
  group_key: 'core_mandatory',
  description:
    'Medicines handled safely across the situations a care worker actually meets: routine administration and recording, ' +
    'rescue medication for seizures, insulin and diabetes, and medicines given through a PEG or a catheter route. Every ' +
    'unit carries an observed competency sign-off.',
  outcomes: [
    'Administer and record medicines within your competence, applying the "six rights" every time.',
    'Recognise, report and learn from a medication error, and explain the duty of candour where a person is harmed.',
    'Administer buccal midazolam for a seizure safely, and describe when to call an ambulance.',
    'Recognise and respond to hypo- and hyperglycaemia, and describe safe insulin practice.',
    'Give medication safely via a PEG, and recognise the complications that require escalation.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC3' }, { framework: 'care_certificate', code: 'CC13' },
    { framework: 'regulation', code: 'REG12' },
    CQC_SAFE, CQC_EFFECTIVE,
  ],
  units: [U.medication, U.epilepsy, U.diabetes, U.peg, { ...U.catheter, is_optional: true }],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 9999,
}

const INFECTION_PATHWAY: ProgrammeTemplate = {
  slug: 'pathway-infection-prevention',
  name: 'Infection Prevention Pathway',
  kind: 'pathway',
  group_key: 'health_safety',
  description:
    'Everything that stops an outbreak in a care setting: standard precautions and PPE, hazardous cleaning substances, ' +
    'food safety, water systems, and kitchen and laundry practice.',
  outcomes: [
    'Apply standard infection-control precautions, including hand hygiene and correct PPE use and disposal.',
    'Describe how infection spreads in a care setting and the controls that interrupt each route.',
    'Apply COSHH controls to cleaning and disinfection products.',
    'Apply food hygiene practice that prevents foodborne illness, including temperature control and allergen handling.',
    'Describe the controls that manage legionella risk, and safe kitchen and laundry practice.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC13' }, { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG12' }, { framework: 'regulation', code: 'REG15' },
    { framework: 'legislation', code: 'COSHH' },
    CQC_SAFE,
  ],
  units: [U.ipc, U.coshh, U.foodHygiene, U.legionella, { ...U.kitchenLaundry, is_optional: true }],
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 7999,
}

const FALLS_FRAILTY_PATHWAY: ProgrammeTemplate = {
  slug: 'pathway-falls-and-frailty',
  name: 'Falls and Frailty Pathway',
  kind: 'pathway',
  group_key: 'care_clinical',
  description:
    'Reducing the harm that frailty causes: falls prevention, safe moving and handling, spotting deterioration early, ' +
    'and protecting skin.',
  outcomes: [
    'Assess falls risk and apply multifactorial falls-prevention measures for an individual.',
    'Apply safe moving and handling technique in line with a person\'s handling risk assessment.',
    'Recognise the soft signs of deterioration in a frail person and escalate promptly.',
    'Assess and reduce pressure damage risk, describing repositioning and skin inspection.',
    'Respond correctly after a fall, including what must be checked, reported and recorded.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC13' },
    { framework: 'regulation', code: 'REG9' }, { framework: 'regulation', code: 'REG12' },
    { framework: 'legislation', code: 'HASAWA' },
    CQC_SAFE, CQC_EFFECTIVE,
  ],
  units: [U.falls, U.movingHandling, U.deteriorating, U.pressureUlcer, { ...U.continence, is_optional: true }],
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 7999,
}

const INFO_GOVERNANCE_PATHWAY: ProgrammeTemplate = {
  slug: 'pathway-information-governance',
  name: 'Information Governance Pathway',
  kind: 'pathway',
  group_key: 'data_technology',
  description:
    'Handling information lawfully and safely: data protection, cyber security, the National Data Opt-out, record ' +
    'keeping, and what the ICO expects when something goes wrong.',
  outcomes: [
    'Apply the UK GDPR and Data Protection Act 2018 principles to the personal data you handle at work.',
    'Recognise phishing, ransomware and poor password practice, and describe the behaviours that prevent a breach.',
    'Explain the National Data Opt-out and when it applies.',
    'Keep records that are accurate, contemporaneous, attributable and complete.',
    'Describe what constitutes a reportable data breach and the timescales for reporting it to the ICO.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC14' },
    { framework: 'regulation', code: 'REG17' },
    { framework: 'legislation', code: 'DPA2018' },
    CQC_WELLLED,
  ],
  units: [U.gdpr, U.cyber, U.dataOptOut, U.recordKeeping, { ...U.ico, is_optional: true }],
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 12,
  price_pence: 7999,
}

const NEW_MANAGER_PATHWAY: ProgrammeTemplate = {
  slug: 'pathway-new-manager-governance',
  name: 'New Manager Governance Pathway',
  kind: 'pathway',
  group_key: 'conduct_governance',
  description:
    'For a newly promoted team leader or deputy manager: being open when things go wrong, handling concerns and ' +
    'complaints properly, and keeping the records that evidence a well-led service.',
  outcomes: [
    'Apply the statutory duty of candour, describing what must be said, to whom, and how it is recorded.',
    'Handle a whistleblowing concern correctly and explain the protections the person raising it has.',
    'Manage a complaint through to resolution and use it as evidence for service improvement.',
    'Keep and audit records that evidence safe care and a well-led service.',
    'Explain how equality and inclusion duties apply to you as a supervisor of others.',
  ],
  standards: [
    { framework: 'care_certificate', code: 'CC3' }, { framework: 'care_certificate', code: 'CC4' },
    { framework: 'regulation', code: 'REG16' }, { framework: 'regulation', code: 'REG17' },
    { framework: 'legislation', code: 'EQ2010' },
    CQC_WELLLED,
  ],
  units: [U.candour, U.whistleblowing, U.complaints, U.recordKeeping, { ...U.edi, is_optional: true }],
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 24,
  price_pence: 7999,
}

export const DIPLOMA_TEMPLATES: ProgrammeTemplate[] = [
  // Universal diplomas
  HEALTH_AND_SOCIAL_CARE,
  DEMENTIA_AND_MENTAL_HEALTH,
  SAFEGUARDING_AND_PRACTICE,
  HEALTH_SAFETY_COMPLIANCE,
  CLINICAL_CARE_SKILLS,
  END_OF_LIFE,
  // Setting-specific diplomas
  COMPLEX_CARE,
  NURSING_HOME_CLINICAL,
  HOSPICE_PALLIATIVE,
  DOMICILIARY,
  RESIDENTIAL_CARE,
  SUBSTANCE_MISUSE,
  DENTAL_COMPLIANCE,
  GP_PRACTICE,
  INDEPENDENT_HOSPITAL,
  // Pathways
  DEMENTIA_CARE_PATHWAY,
  MEDICATION_PATHWAY,
  INFECTION_PATHWAY,
  FALLS_FRAILTY_PATHWAY,
  INFO_GOVERNANCE_PATHWAY,
  NEW_MANAGER_PATHWAY,
]
