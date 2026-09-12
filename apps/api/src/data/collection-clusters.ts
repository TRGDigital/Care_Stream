// Themed groups of six products, for collection pages.
//
// A collection page answers a search phrase, and the six products that answer it rarely
// line up with a bundle: "care home fire safety" wants the fire policy, the evacuation
// policy and the premises policy, which sit across three different packs. So a cluster is
// curated by subject rather than derived from the catalogue.
//
// Six, fixed. It fills two rows of three cleanly at every breakpoint, and a page selling
// four products next to a page selling nine looks like a mistake rather than a choice.
//
// A cluster is reusable across any number of collections: two pages targeting different
// phrases can legitimately sell the same six things, because what differs between them is
// the copy and the search intent, not the products.
//
// Policies and training never mix. The card, the price, the basket and the call to action
// all differ, and a page selling both answers neither search cleanly.

export interface ProductCluster {
  key: string
  label: string
  /** What this cluster is for, shown when choosing one. */
  note: string
  kind: 'policies' | 'training'
  /** Exactly six, in the order they should appear. */
  items: [string, string, string, string, string, string]
}

export const POLICY_CLUSTERS: ProductCluster[] = [
  { key: 'fire-and-evacuation', label: 'Fire and evacuation', kind: 'policies',
    note: 'Fire safety, getting people out, and the premises duties behind both.',
    items: ['fire-safety', 'evacuation', 'premises-maintenance', 'health-and-safety',
            'risk-management', 'business-continuity'] },
  { key: 'medicines', label: 'Medicines', kind: 'policies',
    note: 'Ordering to disposal, including controlled drugs and consent to treatment.',
    items: ['medicines-management', 'controlled-drugs', 'consent-to-care',
            'clinical-governance', 'safe-care-treatment', 'care-planning'] },
  { key: 'moving-and-equipment', label: 'Moving, handling and equipment', kind: 'policies',
    note: 'Hoists, slings and the inspection regime that keeps them lawful.',
    items: ['moving-and-handling', 'equipment-loler', 'premises-maintenance',
            'risk-management', 'health-and-safety', 'first-aid'] },
  { key: 'infection-prevention', label: 'Infection prevention', kind: 'policies',
    note: 'Day to day IPC, outbreaks, and the kitchen and chemical duties beside them.',
    items: ['infection-prevention-control', 'outbreak-management', 'coshh',
            'food-safety-allergens', 'premises-maintenance', 'health-and-safety'] },
  { key: 'safeguarding', label: 'Safeguarding', kind: 'policies',
    note: 'Recognising and reporting abuse, and the routes staff use to raise it.',
    items: ['safeguarding-adults', 'whistleblowing', 'incident-reporting',
            'prevent', 'safer-recruitment-dbs', 'duty-of-candour'] },
  { key: 'capacity-and-restraint', label: 'Mental capacity and restraint', kind: 'policies',
    note: 'Capacity, DoLS, least restrictive practice and behaviour support.',
    items: ['mental-capacity-dols', 'restraint-least-restrictive', 'consent-to-care',
            'positive-behaviour-support', 'mental-health-act', 'dignity-and-respect'] },
  { key: 'data-protection', label: 'Data protection and records', kind: 'policies',
    note: 'UK GDPR, confidentiality, Caldicott and how records are kept.',
    items: ['data-protection-gdpr', 'confidentiality', 'caldicott',
            'records-management', 'information-governance', 'cqc-notifications'] },
  { key: 'hr-and-recruitment', label: 'HR and recruitment', kind: 'policies',
    note: 'Hiring safely, supervising, and the employment duties around both.',
    items: ['safer-recruitment-dbs', 'disciplinary-grievance', 'supervision-appraisal',
            'training-development', 'working-time', 'professional-standards'] },
  { key: 'governance-and-cqc', label: 'Governance and CQC', kind: 'policies',
    note: 'Regulation 17, notifications, audit and the statement of purpose.',
    items: ['governance', 'cqc-compliance', 'cqc-notifications',
            'quality-assurance-audit', 'statement-of-purpose', 'duty-of-candour'] },
  { key: 'person-centred-care', label: 'Person-centred care', kind: 'policies',
    note: 'Assessment, care planning, dignity and communicating accessibly.',
    items: ['person-centred-care', 'care-planning', 'assessment-of-needs',
            'dignity-and-respect', 'communication', 'accessible-information'] },
  { key: 'end-of-life', label: 'End of life care', kind: 'policies',
    note: 'Planning ahead, consent, capacity and comfort at the end of life.',
    items: ['end-of-life-care', 'care-planning', 'consent-to-care',
            'mental-capacity-dols', 'dignity-and-respect', 'nutrition-and-hydration'] },
  { key: 'premises-and-utilities', label: 'Premises and utilities', kind: 'policies',
    note: 'Gas, electrical, water, asbestos and the equipment regime.',
    items: ['gas-safety', 'electrical-safety', 'water-safety-legionella',
            'asbestos-management', 'premises-maintenance', 'equipment-loler'] },
  { key: 'dementia-and-complex', label: 'Dementia and complex needs', kind: 'policies',
    note: 'Supporting people with dementia, learning disability and autism.',
    items: ['positive-behaviour-support', 'learning-disability-autism', 'oliver-mcgowan-training',
            'person-centred-care', 'restraint-least-restrictive', 'communication'] },
  { key: 'equality-and-rights', label: 'Equality and rights', kind: 'policies',
    note: 'The Equality Act in care delivery and employment, and the duties beside it.',
    items: ['equality-and-diversity', 'accessible-information', 'reasonable-adjustments',
            'dignity-and-respect', 'modern-slavery', 'anti-bribery-gifts'] },
]

export const TRAINING_CLUSTERS: ProductCluster[] = [
  { key: 'core-mandatory', label: 'Core mandatory training', kind: 'training',
    note: 'What every care worker is expected to hold before they start.',
    items: ['std-safeguarding-adults-and-children', 'std-moving-and-handling-of-people',
            'std-infection-prevention-and-control', 'std-fire-safety',
            'std-first-aid-basic-life-support', 'std-food-hygiene'] },
  { key: 'medication-training', label: 'Medication', kind: 'training',
    note: 'Administration, competency and the safety checks around prescribing.',
    items: ['std-medication-administration-and-competency', 'std-repeat-prescribing-and-medicines-safety',
            'std-epilepsy-and-buccal-midazolam-administration', 'std-subcutaneous-intramuscular-and-insulin-injections',
            'std-syringe-drivers-and-subcutaneous-medication', 'std-consent-for-procedures'] },
  { key: 'dementia-training', label: 'Dementia and behaviour', kind: 'training',
    note: 'Understanding dementia, distress, and responding without restraint.',
    items: ['std-dementia-awareness', 'std-dementia-care', 'std-challenging-behaviour-management',
            'std-positive-behaviour-support-de-escalation', 'std-cultural-diversity-in-dementia-care',
            'std-mental-capacity-act-and-dols'] },
  { key: 'clinical-skills', label: 'Clinical skills', kind: 'training',
    note: 'The practical nursing tasks a care service carries out day to day.',
    items: ['std-catheter-care', 'std-wound-care-and-dressings', 'std-peg-feeding-care',
            'std-venepuncture-and-cannulation', 'std-tracheostomy-care', 'std-enteral-feeding-and-stoma-care'] },
  { key: 'deterioration-and-emergency', label: 'Deterioration and emergencies', kind: 'training',
    note: 'Spotting a resident going downhill, and what to do when they do.',
    items: ['std-recognising-the-deteriorating-resident', 'std-sepsis-awareness',
            'std-first-aid-basic-life-support', 'std-falls-prevention',
            'std-diabetes-awareness', 'std-verification-of-expected-death'] },
  { key: 'end-of-life-training', label: 'End of life care', kind: 'training',
    note: 'Palliative care, symptom control and supporting families.',
    items: ['std-end-of-life-palliative-care', 'std-symptom-management-in-palliative-care',
            'std-syringe-drivers-and-anticipatory-end-of-life-medicines', 'std-bereavement-and-family-support',
            'std-verification-of-expected-death', 'std-duty-of-candour'] },
  { key: 'tissue-viability', label: 'Skin and tissue viability', kind: 'training',
    note: 'Pressure damage, continence and the daily care that prevents both.',
    items: ['std-pressure-ulcer-tissue-viability-prevention', 'std-pressure-ulcer-categorisation-and-tissue-viability-managemen',
            'std-continence-care', 'std-wound-care-and-dressings', 'std-nutrition-and-hydration',
            'std-oral-health'] },
  { key: 'health-and-safety-training', label: 'Health and safety', kind: 'training',
    note: 'The statutory safety training an inspector expects to see recorded.',
    items: ['std-general-health-safety-awareness', 'std-coshh-control-of-substances-hazardous-to-health',
            'std-riddor-accident-and-incident-reporting', 'std-slips-trips-and-falls',
            'std-display-screen-equipment-dse', 'std-legionella-water-safety-awareness'] },
  { key: 'governance-training', label: 'Conduct and governance', kind: 'training',
    note: 'Records, boundaries, candour and speaking up.',
    items: ['std-documentation-and-record-keeping', 'std-communication-professional-behaviour',
            'std-whistleblowing', 'std-duty-of-candour', 'std-complaints-handling',
            'std-clinical-governance'] },
  { key: 'data-training', label: 'Data and cyber', kind: 'training',
    note: 'UK GDPR, the national data opt-out and staying safe online.',
    items: ['std-gdpr-data-protection', 'std-cyber-security', 'std-national-data-opt-out',
            'std-ico-training', 'std-documentation-and-record-keeping', 'std-test-results-handling-and-failsafe'] },
  { key: 'domiciliary-training', label: 'Working in people’s homes', kind: 'training',
    note: 'For domiciliary and live-in services rather than a care home.',
    items: ['std-working-safely-in-people-s-homes', 'std-lone-working-awareness',
            'std-missed-visits-and-welfare-checks', 'std-keys-entry-and-home-security',
            'std-medication-support-in-the-community', 'std-travelling-and-driving-for-work'] },
  { key: 'equality-training', label: 'Equality and person-centred care', kind: 'training',
    note: 'Dignity, culture, independence and treating people as individuals.',
    items: ['std-equality-diversity-and-inclusion', 'std-privacy-dignity-and-respect-in-a-care-home',
            'std-person-centred-care-planning', 'std-cultural-diversity-in-care',
            'std-promoting-ordinary-living-and-independence', 'std-care-certificate'] },
]

export const ALL_CLUSTERS: ProductCluster[] = [...POLICY_CLUSTERS, ...TRAINING_CLUSTERS]

export function clustersFor(kind: 'policies' | 'training'): ProductCluster[] {
  return ALL_CLUSTERS.filter(c => c.kind === kind)
}

export function clusterByKey(key: string): ProductCluster | undefined {
  return ALL_CLUSTERS.find(c => c.key === key)
}
