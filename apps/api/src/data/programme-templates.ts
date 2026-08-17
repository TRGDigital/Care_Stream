// Ready-made programme (diploma / pathway) templates. A template names its units by
// TITLE, not by id, so /admin/standard-programmes/from-template can assemble it
// against whatever is actually published in the standard library — and report the
// units it could not find rather than failing.
//
// Naming discipline: these are CareStream programmes, NOT Ofqual-regulated
// qualifications. Never add an RQF level to a name ("Level 3 Diploma…"), and keep
// the certificate disclaimer intact. "Diploma" as a product tier is lawful and is
// what the market (e.g. Alison) uses; a level number implies regulated status.

export type ProgrammeTemplateUnit = {
  title:       string          // the standard-library module title to look for
  aliases?:    string[]        // alternative titles to match on
  is_optional?: boolean
}

export type ProgrammeTemplate = {
  slug:                string
  name:                string
  description:         string
  kind:                'diploma' | 'pathway' | 'award'
  group_key?:          string
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

// ── Diploma in Health and Social Care ────────────────────────────────────────
// Deliberately covers the same ground as the widely-sold online "Diploma in Health
// and Social Care" (roles and responsibilities, ethics, communication, mental
// health, disease prevention and health promotion, consent and autonomy) but built
// from UK-specific units and assessed with a learning-gain baseline, an observed
// competency sign-off and a reflective account rather than MCQ alone.
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
    { framework: 'care_certificate', code: 'CC1' },
    { framework: 'care_certificate', code: 'CC3' },
    { framework: 'care_certificate', code: 'CC4' },
    { framework: 'care_certificate', code: 'CC5' },
    { framework: 'care_certificate', code: 'CC6' },
    { framework: 'care_certificate', code: 'CC7' },
    { framework: 'care_certificate', code: 'CC8' },
    { framework: 'care_certificate', code: 'CC9' },
    { framework: 'care_certificate', code: 'CC10' },
    { framework: 'care_certificate', code: 'CC14' },
    { framework: 'care_certificate', code: 'CC15' },
    { framework: 'regulation', code: 'REG9' },
    { framework: 'regulation', code: 'REG10' },
    { framework: 'regulation', code: 'REG11' },
    { framework: 'regulation', code: 'REG13' },
    { framework: 'regulation', code: 'REG14' },
    { framework: 'legislation', code: 'MCA2005' },
    { framework: 'legislation', code: 'EQ2010' },
    { framework: 'cqc', code: 'SAFE' },
    { framework: 'cqc', code: 'CARING' },
    { framework: 'cqc', code: 'EFFECTIVE' },
  ],
  units: [
    // Roles, responsibilities and the duty of care.
    { title: 'Care Certificate', aliases: ['care certificate standards'] },
    { title: 'Communication / Professional Behaviour', aliases: ['Communication and Professional Behaviour', 'professional behaviour', 'communication'] },
    // Rights, ethics and the law.
    { title: 'Equality, Diversity and Inclusion', aliases: ['EDI', 'equality'] },
    { title: 'Mental Capacity Act and DoLS', aliases: ['MCA', 'DoLS', 'mental capacity'] },
    { title: 'Safeguarding Adults and Children', aliases: ['safeguarding'] },
    { title: 'Duty of Candour', aliases: ['duty of candour'] },
    // Mental health, dementia and wellbeing.
    { title: 'Mental Health Awareness', aliases: ['mental health'] },
    { title: 'Dementia Awareness', aliases: ['dementia'] },
    // Preventing harm, promoting health.
    { title: 'Infection Prevention and Control', aliases: ['IPC', 'infection control'] },
    { title: 'Nutrition and Hydration', aliases: ['nutrition', 'hydration'] },
    // Recording and accountability.
    { title: 'Documentation and Record Keeping', aliases: ['record keeping', 'documentation'] },
    // Optional breadth — the learner or manager picks these up if relevant to the role.
    { title: 'End of Life / Palliative Care', aliases: ['palliative', 'end of life'], is_optional: true },
    { title: 'Cultural Diversity in Care', aliases: ['cultural diversity', 'cultural competence'], is_optional: true },
  ],
  sequential: false,
  require_practical: true,   // Care Certificate carries an observed component
  require_reflection: true,
  synoptic_pass_mark: 80,    // matches the per-module pass mark
  renewal_months: null,      // a diploma is earned once; its mandatory units renew on their own cycles
  price_pence: 19999,        // pathway price, well under 12 × £25.99 bought separately
}

// ── Dementia Care pathway ────────────────────────────────────────────────────
// Shorter, role-focused sibling — proves the container works for a 'pathway' too.
const DEMENTIA_CARE: ProgrammeTemplate = {
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
    { framework: 'care_certificate', code: 'CC5' },
    { framework: 'care_certificate', code: 'CC6' },
    { framework: 'care_certificate', code: 'CC9' },
    { framework: 'regulation', code: 'REG9' },
    { framework: 'legislation', code: 'MCA2005' },
    { framework: 'cqc', code: 'CARING' },
  ],
  units: [
    { title: 'Dementia Awareness', aliases: ['dementia'] },
    { title: 'Communication / Professional Behaviour', aliases: ['Communication and Professional Behaviour'] },
    { title: 'Mental Capacity Act and DoLS', aliases: ['MCA', 'DoLS'] },
    { title: 'Positive Behaviour Support / De-escalation', aliases: ['PBS', 'de-escalation', 'challenging behaviour'] },
    { title: 'Nutrition and Hydration', aliases: ['nutrition'] },
    { title: 'Oral Health', aliases: ['oral care', 'mouth care'], is_optional: true },
    { title: 'Continence Care', aliases: ['continence'], is_optional: true },
  ],
  sequential: true,
  require_practical: true,
  require_reflection: true,
  synoptic_pass_mark: 80,
  renewal_months: 24,
  price_pence: 9999,
}

export const DIPLOMA_TEMPLATES: ProgrammeTemplate[] = [HEALTH_AND_SOCIAL_CARE, DEMENTIA_CARE]
