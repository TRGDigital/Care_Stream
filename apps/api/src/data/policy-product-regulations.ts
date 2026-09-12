// Which regulations each sold policy must satisfy.
//
// This mapping is the grounding for the whole paid-policy pipeline, and its absence was a
// real defect rather than a missing nicety. policy_products.reference_keys was never
// written by the catalogue seed, so every product carried an empty array. Downstream:
//
//   writePolicy   — sent an empty "THIS POLICY MUST SATISFY:" block and the fallback
//                   "(none curated; cover the regulation thoroughly in your own structure)",
//                   so every policy was written from its title alone.
//   verifyPolicy  — filtered the regulations to judge, got none, skipped the coverage block
//                   entirely, and left `passed` at its initial true. A vacuous pass: the
//                   document was reported verified having been checked against nothing.
//
// Keys are reference_key values in external_regulations. Every key is checked against that
// table when the catalogue is seeded, so a typo fails loudly instead of quietly grounding a
// policy in nothing -- which is the failure mode this whole file exists to end.
//
// Curated, not inferred. Matching product titles against expected_policy_titles covers only
// 45 of 65 and under-maps the ones it does hit: safeguarding-adults came back with
// regulation-13 alone, missing the Care Act 2014 that the policy is actually built on.
// Where a policy genuinely sits across several instruments, all of them are listed.

export const PRODUCT_REGULATIONS: Record<string, string[]> = {
  'accessible-information':      ['accessible-information-standard', 'equality-act-2010'],
  'anti-bribery-gifts':          ['bribery-act-2010'],
  'asbestos-management':         ['control-of-asbestos-regulations-2012', 'health-and-safety-at-work-act'],
  'assessment-of-needs':         ['regulation-9', 'care-act-2014'],
  'business-continuity':         ['regulation-17', 'health-and-social-care-act-2008'],
  'caldicott':                   ['caldicott-principles', 'common-law-duty-of-confidentiality', 'data-protection-act', 'gdpr'],
  'care-planning':               ['regulation-9', 'care-act-2014'],
  'clinical-governance':         ['regulation-17', 'nice-guidelines', 'the-code:-professional-standards-of-practice-and-behaviour-for-nurses-midwives-and-nursing-associates'],
  'communication':               ['accessible-information-standard', 'equality-act-2010'],
  'complaints':                  ['regulation-16', 'local-government-and-social-care-ombudsman-lgsco'],
  'confidentiality':             ['common-law-duty-of-confidentiality', 'caldicott-principles', 'gdpr', 'data-protection-act'],
  'consent-to-care':             ['regulation-11', 'mental-capacity-act-2005', 'common-law-principles-of-capacity-and-consent'],
  'controlled-drugs':            ['misuse-of-drugs-act-1971', 'nice-sc1-managing-medicines-care-homes', 'rps-professional-guidance-on-the-safe-and-secure-handling-of-medicines'],
  'coshh':                       ['coshh', 'health-and-safety-at-work-act'],
  'cqc-compliance':              ['cqc', 'health-and-care-act-2022', 'regulated-activities-regulations-2014'],
  'cqc-notifications':           ['cqc-statutory-notifications', 'regulated-activities-regulations-2014'],
  'data-protection-gdpr':        ['gdpr', 'data-protection-act', 'caldicott-principles'],
  'dignity-and-respect':         ['regulation-10', 'human-rights-act-1998'],
  'disciplinary-grievance':      ['employment-rights-act'],
  'duty-of-candour':             ['regulation-20'],
  'electrical-safety':           ['electricity-at-work-regulations-1989', 'health-and-safety-at-work-act'],
  'end-of-life-care':            ['nice_ng31_-_care_of_dying_adults', 'gold-standards-framework-gsf', 'mental-capacity-act-2005'],
  'equality-and-diversity':      ['equality-act-2010', 'human-rights-act-1998'],
  'equipment-loler':             ['lifting-operations-and-lifting-equipment-regulations-1998-loler', 'provision-and-use-of-work-equipment-regulations-1998-puwer', 'regulation-15'],
  'evacuation':                  ['regulatory-reform-fire-safety-order-2005'],
  'fire-safety':                 ['regulatory-reform-fire-safety-order-2005', 'regulation-15'],
  'first-aid':                   ['first-aid-regulations'],
  'fit-and-proper-persons':      ['regulation-19', 'disclosure-and-barring-service-dbs'],
  'food-safety-allergens':       ['food-safety-act-1990', 'food-allergen-natashas-law', 'food-hygiene-legislation-including-regulation-ec-no-8522004-and-food-hygiene-england-regulations-2013', 'regulation-14'],
  'gas-safety':                  ['gas-safety-regulations-1998'],
  'governance':                  ['regulation-17'],
  'health-and-safety':           ['health-and-safety-at-work-act', 'workplace-health-safety-and-welfare-regulations-1992', 'first-aid-regulations'],
  'incident-reporting':          ['riddor', 'regulation-12', 'regulation-20'],
  'infection-prevention-control':['health-and-social-care-act-infection-control-code', 'infection-control', 'nice-cg139', 'uk-health-security-agency-ukhsa'],
  'information-governance':      ['information-governance', 'caldicott-principles', 'gdpr', 'data-protection-act', 'records-management-code-of-practice-for-health-and-social-care-2021'],
  'learning-disability-autism':  ['oliver-mcgowan-mandatory-training', 'nice_ng11_-_challenging_behaviour_and_learning_disabilities', 'equality-act-2010'],
  'medicines-management':        ['medicines-act-1968', 'misuse-of-drugs-act-1971', 'nice-sc1-managing-medicines-care-homes', 'rps-professional-guidance-on-the-safe-and-secure-handling-of-medicines'],
  'mental-capacity-dols':        ['mental-capacity-act-2005', 'deprivation-of-liberty-safeguards-dols', 'liberty-protection-safeguards-lps', 'common-law-principles-of-capacity-and-consent'],
  'mental-health-act':           ['mental-health-act-1983', 'mental-capacity-act-2005'],
  'modern-slavery':              ['modern-slavery-act-2015'],
  'moving-and-handling':         ['manual-handling-regulations', 'lifting-operations-and-lifting-equipment-regulations-1998-loler', 'provision-and-use-of-work-equipment-regulations-1998-puwer'],
  'nutrition-and-hydration':     ['regulation-14'],
  'oliver-mcgowan-training':     ['oliver-mcgowan-mandatory-training'],
  'outbreak-management':         ['uk-health-security-agency-ukhsa', 'health-and-social-care-act-infection-control-code', 'infection-control'],
  'person-centred-care':         ['regulation-9', 'care-act-2014'],
  'positive-behaviour-support':  ['least-restrictive-practice-principles', 'nice_ng11_-_challenging_behaviour_and_learning_disabilities', 'mental-capacity-act-2005'],
  'premises-maintenance':        ['regulation-15', 'workplace-health-safety-and-welfare-regulations-1992'],
  'prevent':                     ['workshops-to-raise-awareness-of-prevent'],
  'professional-standards':      ['the-code:-professional-standards-of-practice-and-behaviour-for-nurses-midwives-and-nursing-associates', 'regulation-19'],
  'quality-assurance-audit':     ['regulation-17'],
  'reasonable-adjustments':      ['equality-act-2010', 'accessible-information-standard', 'oliver-mcgowan-mandatory-training'],
  'records-management':          ['records-management-code-of-practice-for-health-and-social-care-2021', 'gdpr', 'data-protection-act'],
  'rehabilitation':              ['cg83_-_rehabilitation_after_critical_illness', 'regulation-9'],
  'restraint-least-restrictive': ['least-restrictive-practice-principles', 'mental-capacity-act-2005', 'deprivation-of-liberty-safeguards-dols', 'human-rights-act-1998'],
  'risk-management':             ['regulation-12', 'health-and-safety-at-work-act'],
  'safe-care-treatment':         ['regulation-12'],
  'safeguarding-adults':         ['regulation-13', 'care-act-2014', 'safeguarding-adults', 'safeguarding-vulnerable-groups-act-2006'],
  'safer-recruitment-dbs':       ['regulation-19', 'disclosure-and-barring-service-dbs', 'safeguarding-vulnerable-groups-act-2006'],
  'staffing-rota':               ['regulation-18', 'working-time-regulations-1998'],
  'statement-of-purpose':        ['health-and-social-care-act-2008', 'regulated-activities-regulations-2014'],
  'supervision-appraisal':       ['regulation-18'],
  'training-development':        ['regulation-18'],
  'water-safety-legionella':     ['legionella-acop-l8', 'health-and-safety-at-work-act'],
  'whistleblowing':              ['public-interest-disclosure-act', 'employment-rights-act', 'freedom-to-speak-up', 'whistleblowing'],
  'working-time':                ['working-time-regulations-1998'],
}
