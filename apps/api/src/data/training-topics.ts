// Platform catalogue of training topics. Admins pick topics to generate
// AI modules from (grounded in their own policies). Frequencies and the
// requires_practical flag are sensible UK-care defaults the admin can override.

export type TrainingTopicSeed = {
  title: string
  group_key: 'core_mandatory' | 'health_safety' | 'care_clinical' | 'conduct_governance' | 'role_specific' | 'data_technology'
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
  // GDPR / Data Protection moved to the Data & technology group below.
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
  // Documentation and Record Keeping moved to the Data & technology group below.
  { title: 'Prevent Duty (Counter-Terrorism Awareness)', group_key: 'conduct_governance', default_frequency: 'annual', aliases: ['prevent', 'radicalisation'] },
  { title: 'Communication / Professional Behaviour', group_key: 'conduct_governance', default_frequency: 'annual', aliases: ['professional behaviour', 'communication'] },

  // ── Role- or resident-specific ──
  { title: 'Positive Behaviour Support / De-escalation', group_key: 'role_specific', default_frequency: 'annual', requires_practical: true, aliases: ['PBS', 'PMVA', 'MAPA', 'de-escalation'] },
  { title: 'Epilepsy and Buccal Midazolam Administration', group_key: 'role_specific', default_frequency: 'annual', requires_practical: true, aliases: ['epilepsy', 'buccal midazolam'] },
  { title: 'Diabetes Awareness', group_key: 'role_specific', default_frequency: 'annual', aliases: ['diabetes'] },
  { title: 'Catheter Care', group_key: 'role_specific', default_frequency: 'annual', requires_practical: true, aliases: ['catheter'] },
  { title: 'PEG Feeding Care', group_key: 'role_specific', default_frequency: 'annual', requires_practical: true, aliases: ['PEG', 'enteral feeding'] },
  { title: 'Challenging Behaviour Management', group_key: 'role_specific', default_frequency: 'annual', aliases: ['challenging behaviour'] },

  // ── Data & technology (universal) ──
  { title: 'Cyber Security', group_key: 'data_technology', default_frequency: 'annual', aliases: ['cyber security', 'cyber awareness', 'phishing', 'ransomware', 'passwords'] },
  { title: 'GDPR / Data Protection', group_key: 'data_technology', default_frequency: 'annual', aliases: ['data protection', 'information governance', 'GDPR'] },
  { title: 'National Data Opt-out', group_key: 'data_technology', default_frequency: 'annual', aliases: ['national data opt-out', 'national opt-out', 'type 1 opt-out', 'data opt out'] },
  { title: 'Documentation and Record Keeping', group_key: 'data_technology', default_frequency: 'annual', aliases: ['record keeping', 'documentation'] },
  { title: 'ICO Training', group_key: 'data_technology', default_frequency: 'annual', aliases: ['ICO', 'information commissioner', 'data breach reporting', 'reporting a breach'] },

  // ── Dental practices (setting-specific overlay) ──
  { title: 'Dental Decontamination and HTM 01-05', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'dental-practices', aliases: ['decontamination', 'HTM 01-05', 'instrument reprocessing', 'LDU'] },
  { title: 'Dental Radiography and IR(ME)R', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'dental-practices', aliases: ['radiography', 'IRMER', 'IR(ME)R', 'IRR17', 'x-ray', 'radiation protection'] },
  { title: 'Medical Emergencies in the Dental Practice', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'dental-practices', aliases: ['medical emergencies', 'resuscitation', 'anaphylaxis', 'collapse'] },
  { title: 'GDC Standards and Scope of Practice', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'dental-practices', aliases: ['GDC standards', 'scope of practice', 'professionalism'] },

  // ── Domiciliary care (setting-specific overlay) ──
  { title: 'Medication Support in the Community', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'domiciliary-care', aliases: ['medication at home', 'MAR domiciliary'] },
  { title: 'Working Safely in People’s Homes', group_key: 'health_safety', default_frequency: 'annual', care_setting: 'domiciliary-care', aliases: ['home environment risk', 'lone working in homes'] },
  { title: 'Missed Visits and Welfare Checks', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'domiciliary-care', aliases: ['missed call', 'no reply protocol'] },
  { title: 'Keys, Entry and Home Security', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'domiciliary-care', aliases: ['key safe', 'entry to home'] },
  { title: 'Travelling and Driving for Work', group_key: 'health_safety', default_frequency: 'annual', care_setting: 'domiciliary-care', aliases: ['driving at work', 'travel safety'] },

  // ── Live-in care (setting-specific overlay) ──
  { title: 'Living and Working in a Client’s Home', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'live-in-care', aliases: ['boundaries live-in', 'sharing a home'] },
  { title: 'Professional Boundaries in Live-in Care', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'live-in-care', aliases: ['boundaries', 'over-familiarity'] },
  { title: 'Rest, Breaks and Working Time (Live-in)', group_key: 'health_safety', default_frequency: 'annual', care_setting: 'live-in-care', aliases: ['working time', 'rest breaks'] },

  // ── Complex care (setting-specific overlay) ──
  { title: 'Tracheostomy Care', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'complex-care', aliases: ['tracheostomy', 'trache'] },
  { title: 'Ventilation and Respiratory Support', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'complex-care', aliases: ['ventilator', 'respiratory support', 'NIV'] },
  { title: 'Airway Suctioning', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'complex-care', aliases: ['suctioning', 'airway'] },
  { title: 'Enteral Feeding and Stoma Care', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'complex-care', aliases: ['PEG', 'enteral feeding', 'stoma'] },
  { title: 'Cough Assist', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'complex-care', aliases: ['cough assist', 'mechanical insufflation'] },

  // ── Shared lives (setting-specific overlay) ──
  { title: 'Shared Lives Arrangements and Matching', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'shared-lives', aliases: ['matching', 'shared lives agreement'] },
  { title: 'Boundaries in a Family-Home Setting', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'shared-lives', aliases: ['family home boundaries'] },
  { title: 'Promoting Ordinary Living and Independence', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'shared-lives', aliases: ['ordinary living', 'independence'] },

  // ── Substance misuse & rehabilitation (setting-specific overlay) ──
  { title: 'Substance Withdrawal and Detoxification', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'substance-misuse', aliases: ['detox', 'withdrawal', 'alcohol withdrawal'] },
  { title: 'Overdose Response and Naloxone', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'substance-misuse', aliases: ['naloxone', 'overdose', 'narcan'] },
  { title: 'Blood-Borne Viruses Awareness', group_key: 'health_safety', default_frequency: 'annual', care_setting: 'substance-misuse', aliases: ['BBV', 'hepatitis', 'HIV'] },
  { title: 'Harm Reduction', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'substance-misuse', aliases: ['harm reduction', 'needle exchange'] },
  { title: 'Dual Diagnosis Awareness', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'substance-misuse', aliases: ['dual diagnosis', 'co-occurring'] },

  // ── Hospices (setting-specific overlay) ──
  { title: 'Verification of Expected Death', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'hospices', aliases: ['verification of death', 'expected death'] },
  { title: 'Syringe Drivers and Subcutaneous Medication', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'hospices', aliases: ['syringe driver', 'subcutaneous', 'T34'] },
  { title: 'Symptom Management in Palliative Care', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'hospices', aliases: ['symptom control', 'palliative symptoms'] },
  { title: 'Bereavement and Family Support', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'hospices', aliases: ['bereavement', 'family support'] },
  { title: 'Children’s Palliative Care', group_key: 'role_specific', default_frequency: 'annual', care_setting: 'hospices', aliases: ['children palliative', 'paediatric palliative'] },

  // ── Independent hospitals & clinics (setting-specific overlay) ──
  { title: 'Surgical Safety and the WHO Checklist', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'independent-hospitals', aliases: ['WHO checklist', 'surgical safety', 'never events'] },
  { title: 'Consent for Procedures', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'independent-hospitals', aliases: ['consent', 'informed consent'] },
  { title: 'Venous Thromboembolism (VTE) Prevention', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'independent-hospitals', aliases: ['VTE', 'DVT', 'thromboprophylaxis'] },
  { title: 'Sterile Services and Instrument Decontamination', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'independent-hospitals', aliases: ['sterile services', 'CSSD', 'decontamination'] },
  { title: 'Clinical Governance', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'independent-hospitals', aliases: ['clinical governance', 'quality assurance'] },

  // ── GP practices & primary care (setting-specific overlay) ──
  { title: 'Vaccine Storage and Cold Chain', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'gp-practices', aliases: ['cold chain', 'vaccine fridge', 'immunisation storage'] },
  { title: 'Chaperoning', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'gp-practices', aliases: ['chaperone', 'intimate examination'] },
  { title: 'Repeat Prescribing and Medicines Safety', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'gp-practices', aliases: ['repeat prescribing', 'prescribing safety'] },
  { title: 'Test Results Handling and Failsafe', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'gp-practices', aliases: ['results handling', 'failsafe', 'pathology'] },
  { title: 'Telephone Triage and Care Navigation', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'gp-practices', aliases: ['triage', 'care navigation', 'signposting'] },

  // ── Residential care homes (setting-specific overlay) ──
  { title: 'Person-Centred Care Planning', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'residential-care', aliases: ['care planning', 'person centred care', 'care plans'] },
  { title: 'Activities, Wellbeing and Meaningful Occupation', group_key: 'care_clinical', default_frequency: 'annual', care_setting: 'residential-care', aliases: ['activities', 'wellbeing', 'meaningful occupation', 'social engagement'] },
  { title: 'Privacy, Dignity and Respect in a Care Home', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'residential-care', aliases: ['privacy', 'dignity', 'respect'] },
  { title: 'Supporting Residents’ Finances and Personal Allowances', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'residential-care', aliases: ['resident finances', 'personal allowance', 'appointeeship', 'financial abuse'] },
  { title: 'Admissions, Settling In and Transitions', group_key: 'conduct_governance', default_frequency: 'annual', care_setting: 'residential-care', aliases: ['admissions', 'settling in', 'transitions', 'moving in'] },

  // ── Nursing homes (setting-specific overlay) ── registered-nurse clinical skills (knowledge + observed competency)
  { title: 'Wound Care and Dressings', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'nursing-homes', aliases: ['wound care', 'dressings', 'wound management'] },
  { title: 'Pressure Ulcer Categorisation and Tissue Viability Management', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'nursing-homes', aliases: ['pressure ulcer categorisation', 'tissue viability', 'wound grading'] },
  { title: 'Subcutaneous, Intramuscular and Insulin Injections', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'nursing-homes', aliases: ['injections', 'subcutaneous', 'intramuscular', 'insulin administration'] },
  { title: 'Syringe Drivers and Anticipatory (End of Life) Medicines', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'nursing-homes', aliases: ['syringe driver', 'anticipatory medicines', 'just in case', 'T34'] },
  { title: 'Venepuncture and Cannulation', group_key: 'care_clinical', default_frequency: 'annual', requires_practical: true, care_setting: 'nursing-homes', aliases: ['venepuncture', 'cannulation', 'phlebotomy', 'bloods'] },
]

export function renewalMonthsFor(frequency: string): number | null {
  return frequency === 'annual' ? 12 : frequency === 'biennial' ? 24 : frequency === 'triennial' ? 36 : null
}

export const TOPIC_GROUP_LABELS: Record<string, string> = {
  core_mandatory:      'Core mandatory',
  health_safety:       'Health & safety / statutory',
  care_clinical:       'Care & clinical',
  conduct_governance:  'Conduct & governance',
  data_technology:     'Data & technology',
  role_specific:       'Role- or resident-specific',
}
