// Platform catalogue of training topics. Admins pick topics to generate
// AI modules from (grounded in their own policies). Frequencies and the
// requires_practical flag are sensible UK-care defaults the admin can override.

export type TrainingTopicSeed = {
  title: string
  group_key: 'core_mandatory' | 'health_safety' | 'care_clinical' | 'conduct_governance' | 'role_specific'
  default_frequency: 'annual' | 'biennial' | 'triennial' | 'once' | 'adhoc'
  requires_practical?: boolean
  aliases?: string[]
  /** /who-we-serve slug. Omit (undefined → NULL) for universal cross-over topics
   *  shown under every setting; set it for setting-specific topics (e.g. dental). */
  care_setting?: string
}

// requires_practical = the knowledge module is only part of the requirement;
// an observed/practical assessment (or accredited course) is also needed.
export const TRAINING_TOPICS: TrainingTopicSeed[] = [
  // ── Core mandatory ──
  { title: 'Care Certificate', group_key: 'core_mandatory', default_frequency: 'once', requires_practical: true, aliases: ['care certificate standards', 'new care worker'] },
  { title: 'Safeguarding Adults and Children', group_key: 'core_mandatory', default_frequency: 'annual', aliases: ['safeguarding', 'protection'] },
  { title: 'Moving and Handling of People', group_key: 'core_mandatory', default_frequency: 'annual', requires_practical: true, aliases: ['manual handling', 'moving and handling'] },
  { title: 'Fire Safety', group_key: 'core_mandatory', default_frequency: 'annual', aliases: ['fire awareness', 'evacuation'] },
  { title: 'First Aid / Basic Life Support', group_key: 'core_mandatory', default_frequency: 'annual', requires_practical: true, aliases: ['BLS', 'CPR', 'first aid'] },
  { title: 'Infection Prevention and Control', group_key: 'core_mandatory', default_frequency: 'annual', aliases: ['IPC', 'infection control'] },
  { title: 'Medication Administration and Competency', group_key: 'core_mandatory', default_frequency: 'annual', requires_practical: true, aliases: ['medicines management', 'MAR'] },
  { title: 'Mental Capacity Act and DoLS', group_key: 'core_mandatory', default_frequency: 'biennial', aliases: ['MCA', 'DoLS', 'deprivation of liberty'] },
  { title: 'Equality, Diversity and Inclusion', group_key: 'core_mandatory', default_frequency: 'triennial', aliases: ['EDI', 'equality'] },
  { title: 'Food Hygiene', group_key: 'core_mandatory', default_frequency: 'triennial', aliases: ['food safety', 'level 2 food hygiene'] },
  { title: 'GDPR / Data Protection', group_key: 'core_mandatory', default_frequency: 'annual', aliases: ['data protection', 'information governance'] },
  // Oliver McGowan Mandatory Training is intentionally NOT offered here — it is
  // tightly regulated (accredited Tier 1/2 delivery with lived-experience trainers)
  // and not appropriate to AI-generate or self-certify.

  // ── Health & safety / statutory ──
  { title: 'General Health & Safety Awareness', group_key: 'health_safety', default_frequency: 'annual', aliases: ['health and safety'] },
  { title: 'COSHH (Control of Substances Hazardous to Health)', group_key: 'health_safety', default_frequency: 'annual', aliases: ['coshh', 'hazardous substances'] },
  { title: 'RIDDOR (Accident and Incident Reporting)', group_key: 'health_safety', default_frequency: 'annual', aliases: ['riddor', 'accident reporting'] },
  { title: 'Lone Working Awareness', group_key: 'health_safety', default_frequency: 'annual', aliases: ['lone worker'] },
  { title: 'Display Screen Equipment (DSE)', group_key: 'health_safety', default_frequency: 'annual', aliases: ['dse', 'workstation'] },
  { title: 'Legionella / Water Safety Awareness', group_key: 'health_safety', default_frequency: 'annual', aliases: ['legionella', 'water safety'] },
  { title: 'Electrical Safety', group_key: 'health_safety', default_frequency: 'annual', aliases: ['electrical', 'PAT testing'] },
  { title: 'Kitchen and Laundry Safety', group_key: 'health_safety', default_frequency: 'annual', aliases: ['kitchen safety', 'laundry safety'] },
  { title: 'Slips, Trips and Falls', group_key: 'health_safety', default_frequency: 'annual', aliases: ['slips trips falls'] },

  // ── Care & clinical ──
  { title: 'Dementia Awareness', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['dementia'] },
  { title: 'Mental Health Awareness', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['mental health'] },
  { title: 'End of Life / Palliative Care', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['palliative', 'end of life'] },
  { title: 'Nutrition and Hydration', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['nutrition', 'hydration'] },
  { title: 'Pressure Ulcer (Tissue Viability) Prevention', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['pressure ulcer', 'tissue viability', 'pressure sore'] },
  { title: 'Falls Prevention', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['falls'] },
  { title: 'Continence Care', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['continence'] },
  { title: 'Oral Health', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['oral care', 'mouth care'] },
  { title: 'Recognising the Deteriorating Resident', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['deteriorating resident', 'soft signs', 'NEWS2'] },
  { title: 'Sepsis Awareness', group_key: 'care_clinical', default_frequency: 'annual', aliases: ['sepsis'] },

  // ── Conduct & governance ──
  { title: 'Duty of Candour', group_key: 'conduct_governance', default_frequency: 'annual', aliases: ['duty of candour'] },
  { title: 'Whistleblowing', group_key: 'conduct_governance', default_frequency: 'annual', aliases: ['whistleblowing', 'speaking up'] },
  { title: 'Complaints Handling', group_key: 'conduct_governance', default_frequency: 'annual', aliases: ['complaints'] },
  { title: 'Documentation and Record Keeping', group_key: 'conduct_governance', default_frequency: 'annual', aliases: ['record keeping', 'documentation'] },
  { title: 'Prevent Duty (Counter-Terrorism Awareness)', group_key: 'conduct_governance', default_frequency: 'annual', aliases: ['prevent', 'radicalisation'] },
  { title: 'Communication / Professional Behaviour', group_key: 'conduct_governance', default_frequency: 'annual', aliases: ['professional behaviour', 'communication'] },

  // ── Role- or resident-specific ──
  { title: 'Positive Behaviour Support / De-escalation', group_key: 'role_specific', default_frequency: 'annual', requires_practical: true, aliases: ['PBS', 'PMVA', 'MAPA', 'de-escalation'] },
  { title: 'Epilepsy and Buccal Midazolam Administration', group_key: 'role_specific', default_frequency: 'annual', requires_practical: true, aliases: ['epilepsy', 'buccal midazolam'] },
  { title: 'Diabetes Awareness', group_key: 'role_specific', default_frequency: 'annual', aliases: ['diabetes'] },
  { title: 'Catheter Care', group_key: 'role_specific', default_frequency: 'annual', requires_practical: true, aliases: ['catheter'] },
  { title: 'PEG Feeding Care', group_key: 'role_specific', default_frequency: 'annual', requires_practical: true, aliases: ['PEG', 'enteral feeding'] },
  { title: 'Challenging Behaviour Management', group_key: 'role_specific', default_frequency: 'annual', aliases: ['challenging behaviour'] },

  // ── Dental practices (setting-specific overlay) ──
  { title: 'Dental Decontamination and HTM 01-05', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'dental-practices', aliases: ['decontamination', 'HTM 01-05', 'instrument reprocessing', 'LDU'] },
  { title: 'Dental Radiography and IR(ME)R', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'dental-practices', aliases: ['radiography', 'IRMER', 'IR(ME)R', 'IRR17', 'x-ray', 'radiation protection'] },
  { title: 'Medical Emergencies in the Dental Practice', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'dental-practices', aliases: ['medical emergencies', 'resuscitation', 'anaphylaxis', 'collapse'] },
  { title: 'GDC Standards and Scope of Practice', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'dental-practices', aliases: ['GDC standards', 'scope of practice', 'professionalism'] },
]

export function renewalMonthsFor(frequency: string): number | null {
  return frequency === 'annual' ? 12 : frequency === 'biennial' ? 24 : frequency === 'triennial' ? 36 : null
}

export const TOPIC_GROUP_LABELS: Record<string, string> = {
  core_mandatory:      'Core mandatory',
  health_safety:       'Health & safety / statutory',
  care_clinical:       'Care & clinical',
  conduct_governance:  'Conduct & governance',
  role_specific:       'Role- or resident-specific',
}
