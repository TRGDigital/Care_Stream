// What we must ask a buyer before their policy can stop guessing.
//
// The first properly grounded policy was checked for what it assumed, and it assumed a
// great deal: an electronic care management system with pop-up alerts, a data protection
// officer, an NHSmail account, a secure fax, a stock of easy read templates, interpreter
// arrangements, capital planning and procurement processes. None of it was asked about.
// Five facts had ever been supplied -- address, trading name, CQC ids, registered manager,
// nominated individual -- and intake_data was an empty object.
//
// That is worse than an omission. A policy stating "we assess our environment annually"
// when the home never has is a written admission of non-compliance, signed by the
// registered manager and handed to an inspector by the home itself.
//
// The writer's existing rule ("never invent a fact about this home", no [name], no TBC)
// did not catch any of it, and obeyed the letter of its instructions throughout: none of
// those are placeholders, they are ordinary sentences in the first person plural, which is
// exactly the voice the prompt asks for. The rule blocks invented NOUNS. It does not block
// invented PRACTICE.
//
// ── Why the questions hang off regulations, not products ──────────────────────────────
//
// The assumption comes from the required element, and the element belongs to the
// regulation. A product's questions are therefore the union of its regulations' questions,
// deduplicated by key. That falls out well: "do you use an electronic care system" is
// asked by data protection, GDPR, Caldicott, good governance and accessible information,
// and a buyer answers it ONCE. Without that, someone buying the twenty-policy bundle would
// face the same question twenty times, and a form nobody finishes is a form that teaches
// the writer nothing.
//
// Each question records the assumption it prevents, so a reviewer reading the list in
// /platform/paid-policies can see why it is being asked rather than taking it on trust.

export type IntakeAnswerType = 'text' | 'yesno' | 'longtext'

export interface IntakeQuestion {
  key: string
  label: string
  type: IntakeAnswerType
  help?: string
  /** The assumption the policy would otherwise make. Shown to reviewers, not to buyers. */
  prevents: string
}

/** Every question we know how to ask, keyed. One definition, one wording, many regulations. */
export const INTAKE_QUESTIONS: Record<string, IntakeQuestion> = {
  // ── Records and systems ────────────────────────────────────────────────────────────
  record_system: {
    key: 'record_system', type: 'yesno',
    label: 'Do you use an electronic care planning system?',
    help: 'If not, your policies will describe paper records instead.',
    prevents: 'Assumes an electronic care management system exists, with banners or pop-up alerts on opening a record.',
  },
  record_system_name: {
    key: 'record_system_name', type: 'text',
    label: 'What is your electronic care system called?',
    help: 'Leave blank if you work on paper.',
    prevents: 'Refers to "our electronic care management system" without ever naming it.',
  },
  record_system_coding: {
    key: 'record_system_coding', type: 'yesno',
    label: 'Does your electronic system support clinical coding (SNOMED CT, Read v2 or CTV3)?',
    prevents: 'Claims coded data items are used, when most care-home systems hold free text only.',
  },
  messaging_apps: {
    key: 'messaging_apps', type: 'yesno',
    label: 'Do staff use WhatsApp or similar messaging apps for anything about residents?',
    help: 'An honest yes matters: those messages are health records in law.',
    prevents: 'Silently assumes no messaging app is in use, so the policy never addresses it.',
  },
  secure_email: {
    key: 'secure_email', type: 'text',
    label: 'How do you send confidential information securely?',
    help: 'For example NHSmail, encrypted email, or sealed hand delivery.',
    prevents: 'Asserts an NHSmail account and a secure fax the service may not have.',
  },
  monitoring_equipment: {
    key: 'monitoring_equipment', type: 'longtext',
    label: 'What monitoring equipment is in use?',
    help: 'CCTV in communal areas, acoustic monitoring, bedroom sensors, door sensors, body-worn cameras, or none.',
    prevents: 'Writes a DPIA requirement for equipment that does not exist, or omits equipment that does.',
  },

  // ── Named roles ────────────────────────────────────────────────────────────────────
  data_protection_lead: {
    key: 'data_protection_lead', type: 'text',
    label: 'Who is your data protection lead or DPO?',
    help: 'A name, or "none appointed". Not every care service needs a formal DPO.',
    prevents: 'States "the data protection officer ensures..." when no such person exists.',
  },
  caldicott_guardian: {
    key: 'caldicott_guardian', type: 'text',
    label: 'Who is your Caldicott Guardian?',
    help: 'A name, or "none appointed".',
    prevents: 'Assigns duties to a Caldicott Guardian the service has never appointed.',
  },
  ico_registration: {
    key: 'ico_registration', type: 'text',
    label: 'What is your ICO registration number?',
    prevents: 'Claims ICO registration without the reference that proves it.',
  },
  health_safety_lead: {
    key: 'health_safety_lead', type: 'text',
    label: 'Who leads on health and safety?',
    prevents: 'Assigns health and safety duties to a role nobody holds.',
  },
  accessible_info_lead: {
    key: 'accessible_info_lead', type: 'text',
    label: 'Who is the senior lead for accessible information?',
    help: 'The standard requires a named senior lead.',
    prevents: 'States a senior named lead is in place when none has been appointed.',
  },

  // ── Practice the policy will otherwise invent ──────────────────────────────────────
  audit_schedule: {
    key: 'audit_schedule', type: 'longtext',
    label: 'Which audits do you actually run, and how often?',
    help: 'Medicines, care plans, infection control, falls, safeguarding. Say what is real today, not what you intend.',
    prevents: 'Commits the service to an audit schedule it has never operated.',
  },
  audit_independence: {
    key: 'audit_independence', type: 'yesno',
    label: 'Are audits carried out by someone who did not deliver the care being audited?',
    prevents: 'Claims independent auditing that does not happen in a small staff team.',
  },
  risk_register: {
    key: 'risk_register', type: 'yesno',
    label: 'Do you keep a risk register, and is it reviewed on a set cycle?',
    prevents: 'Describes a risk register the service does not maintain.',
  },
  governance_meeting: {
    key: 'governance_meeting', type: 'text',
    label: 'What management or governance meeting reviews quality data, and how often?',
    help: 'For example a monthly managers meeting, or a quarterly board.',
    prevents: 'Refers to board minutes and senior management meetings that may not exist.',
  },
  training_delivery: {
    key: 'training_delivery', type: 'text',
    label: 'How is staff training delivered and recorded?',
    help: 'For example an e-learning provider, in-house sessions, or a training matrix.',
    prevents: 'Describes induction checklists and training records in a form the service does not use.',
  },
  interpreter_arrangements: {
    key: 'interpreter_arrangements', type: 'text',
    label: 'How do you arrange interpreters or British Sign Language support?',
    help: 'A named agency, a local authority service, or "no arrangement yet".',
    prevents: 'States that qualified interpreters are arranged when there is no route to one.',
  },
  accessible_formats: {
    key: 'accessible_formats', type: 'longtext',
    label: 'Which accessible formats can you actually produce?',
    help: 'Large print, easy read, braille, audio, or none held in stock.',
    prevents: 'Claims a stock of easy read and large print templates the service does not hold.',
  },
  restraint_in_use: {
    key: 'restraint_in_use', type: 'longtext',
    label: 'Which of these are used in your service?',
    help: 'Keypad door locks, bedrails, sensor mats, lap belts, covert medication, or none.',
    prevents: 'Writes restraint safeguards for measures not used, or omits ones that are.',
  },
  imca_service: {
    key: 'imca_service', type: 'text',
    label: 'Which IMCA (advocacy) service do you refer to?',
    prevents: 'Says an advocate is instructed without naming who to call.',
  },
  local_authority: {
    key: 'local_authority', type: 'text',
    label: 'Which local authority area are you in?',
    help: 'Their safeguarding and escalation procedures differ.',
    prevents: 'Refers to "local authority procedures" without saying whose.',
  },
  records_retention: {
    key: 'records_retention', type: 'text',
    label: 'How long do you keep care records after a resident leaves or dies?',
    prevents: 'Invents a retention schedule the service has never set.',
  },
  // ── Medicines ──────────────────────────────────────────────────────────────────────
  pharmacy_supplier: {
    key: 'pharmacy_supplier', type: 'text',
    label: 'Which pharmacy supplies your medicines?',
    prevents: 'Describes ordering and reconciliation with a supplying pharmacy it cannot name.',
  },
  controlled_drugs: {
    key: 'controlled_drugs', type: 'yesno',
    label: 'Do you store controlled drugs on the premises?',
    help: 'If yes, the policy will cover the CD cabinet, register and running balance checks.',
    prevents: 'Writes controlled drugs procedures for a service that holds none, or omits them where they are held.',
  },
  mar_charts: {
    key: 'mar_charts', type: 'text',
    label: 'Are your MAR charts paper or electronic?',
    help: 'Name the eMAR system if you use one.',
    prevents: 'Assumes a particular way of recording administration, including prompts a paper chart cannot give.',
  },
  homely_remedies: {
    key: 'homely_remedies', type: 'yesno',
    label: 'Do you keep homely remedies such as paracetamol?',
    prevents: 'Sets out a homely remedies protocol for a service that keeps none.',
  },
  self_administration: {
    key: 'self_administration', type: 'yesno',
    label: 'Do any residents look after their own medicines?',
    prevents: 'Describes self-administration assessments that have never been carried out.',
  },
  medicines_competency: {
    key: 'medicines_competency', type: 'text',
    label: 'Who assesses staff competence to administer medicines?',
    prevents: 'Requires observed competency assessments without saying who performs them.',
  },

  // ── Fire and evacuation ────────────────────────────────────────────────────────────
  fire_responsible_person: {
    key: 'fire_responsible_person', type: 'text',
    label: 'Who is the named responsible person for fire safety?',
    prevents: 'The Fire Safety Order requires a named responsible person; the policy will invent the role otherwise.',
  },
  fire_risk_assessment: {
    key: 'fire_risk_assessment', type: 'text',
    label: 'When was your fire risk assessment last reviewed, and by whom?',
    prevents: 'States a fire risk assessment is current without knowing whether one exists.',
  },
  evacuation_strategy: {
    key: 'evacuation_strategy', type: 'text',
    label: 'What is your evacuation strategy?',
    help: 'For example progressive horizontal evacuation, simultaneous evacuation, or stay put.',
    prevents: 'Assumes progressive horizontal evacuation, which needs compartment lines the building may not have.',
  },
  evacuation_aids: {
    key: 'evacuation_aids', type: 'longtext',
    label: 'Which evacuation aids do you hold?',
    help: 'Ski sheets, evac chairs, evacuation mattresses, or none.',
    prevents: 'Describes maintaining evacuation equipment the service does not own.',
  },
  night_staffing: {
    key: 'night_staffing', type: 'text',
    label: 'How many staff are on duty overnight?',
    help: 'The fire risk assessment has to be achievable with this number.',
    prevents: 'Assumes night staffing sufficient for the evacuation strategy it describes.',
  },

  // ── Premises, equipment and utilities ──────────────────────────────────────────────
  lifting_equipment: {
    key: 'lifting_equipment', type: 'longtext',
    label: 'Which lifting equipment do you have?',
    help: 'Ceiling hoists, mobile hoists, slings, stairlifts, bath hoists, or none.',
    prevents: 'Writes LOLER examination routines for equipment the service does not have.',
  },
  loler_contractor: {
    key: 'loler_contractor', type: 'text',
    label: 'Who carries out your six-monthly LOLER thorough examinations?',
    prevents: 'Requires thorough examinations by a competent person without naming who that is.',
  },
  asset_register: {
    key: 'asset_register', type: 'yesno',
    label: 'Do you keep an equipment asset register and planned maintenance schedule?',
    prevents: 'Describes an asset register and maintenance log the service does not keep.',
  },
  gas_contractor: {
    key: 'gas_contractor', type: 'text',
    label: 'Who is your Gas Safe registered engineer?',
    prevents: 'Asserts annual gas safety checks without a contractor behind them.',
  },
  electrical_testing: {
    key: 'electrical_testing', type: 'text',
    label: 'When was your fixed wiring (EICR) last tested, and by whom?',
    prevents: 'States electrical installations are tested on a cycle the service may not run.',
  },
  legionella_scheme: {
    key: 'legionella_scheme', type: 'yesno',
    label: 'Do you have a written legionella control scheme with temperature monitoring?',
    prevents: 'Describes a written scheme and monthly outlet temperatures that may not be recorded.',
  },
  asbestos_register: {
    key: 'asbestos_register', type: 'yesno',
    label: 'Do you hold an asbestos survey or register for the building?',
    help: 'Buildings constructed after 2000 will not need one.',
    prevents: 'Requires an asbestos register the service has never commissioned.',
  },
  coshh_register: {
    key: 'coshh_register', type: 'text',
    label: 'Where is your COSHH file kept, and who maintains it?',
    prevents: 'Refers to COSHH assessments and safety data sheets without saying where they live.',
  },

  // ── Infection prevention ───────────────────────────────────────────────────────────
  ipc_lead: {
    key: 'ipc_lead', type: 'text',
    label: 'Who is your infection prevention and control lead?',
    prevents: 'The code requires a named IPC lead; the policy will assign the role to nobody otherwise.',
  },
  health_protection_team: {
    key: 'health_protection_team', type: 'text',
    label: 'Which health protection team do you notify about outbreaks?',
    prevents: 'Says outbreaks are notified without a route to notify them through.',
  },

  // ── Catering ───────────────────────────────────────────────────────────────────────
  catering_arrangement: {
    key: 'catering_arrangement', type: 'text',
    label: 'Is catering in-house or contracted out?',
    help: 'Name the contractor if it is contracted.',
    prevents: 'Assigns kitchen duties to staff the service may not employ.',
  },
  allergen_matrix: {
    key: 'allergen_matrix', type: 'yesno',
    label: 'Do you keep an allergen matrix mapping dishes to the fourteen allergens?',
    prevents: 'Describes an allergen matrix and recipe specifications the kitchen does not maintain.',
  },
  ppds_food: {
    key: 'ppds_food', type: 'yesno',
    label: 'Do you sell prepacked food, for example in a café, shop or fundraising stall?',
    help: 'This decides whether Natasha\u2019s Law labelling applies to you.',
    prevents: 'Applies PPDS labelling rules to a service that sells no packaged food, or omits them where it does.',
  },

  // ── Workforce ──────────────────────────────────────────────────────────────────────
  agency_staff: {
    key: 'agency_staff', type: 'yesno',
    label: 'Do you use agency or bank staff?',
    prevents: 'Writes induction and competency routes for agency staff without knowing any are used.',
  },
  registered_nurses: {
    key: 'registered_nurses', type: 'yesno',
    label: 'Do you employ registered nurses?',
    prevents: 'Applies the NMC Code to a service that employs none.',
  },
  dbs_update_service: {
    key: 'dbs_update_service', type: 'yesno',
    label: 'Do you use the DBS Update Service?',
    prevents: 'Describes annual status checks that only exist if the service subscribes.',
  },
  speak_up_routes: {
    key: 'speak_up_routes', type: 'longtext',
    label: 'Besides their line manager, who can staff raise a concern with?',
    help: 'A named director, an external number, a Freedom to Speak Up guardian.',
    prevents: 'Promises reporting routes that bypass the person complained about, without saying what they are.',
  },
  complaints_handler: {
    key: 'complaints_handler', type: 'text',
    label: 'Who handles complaints, and what is your response timescale?',
    prevents: 'Commits to acknowledgement and response times nobody has agreed.',
  },

  // ── Clinical and external services ────────────────────────────────────────────────
  gp_practice: {
    key: 'gp_practice', type: 'text',
    label: 'Which GP practice or practices cover your residents?',
    prevents: 'Describes medication reviews and escalation with a GP it cannot name.',
  },
  end_of_life_framework: {
    key: 'end_of_life_framework', type: 'text',
    label: 'Do you follow an end of life framework?',
    help: 'Gold Standards Framework, Six Steps, a local hospice programme, or none.',
    prevents: 'States the service works to a named framework it has never adopted.',
  },
}

/** Which questions each regulation's required elements make necessary. */
export const REGULATION_QUESTION_KEYS: Record<string, string[]> = {
  'accessible-information-standard': [
    'record_system', 'record_system_name', 'record_system_coding',
    'accessible_info_lead', 'interpreter_arrangements', 'accessible_formats', 'secure_email',
  ],
  'equality-act-2010': [
    'training_delivery', 'accessible_formats', 'governance_meeting', 'local_authority',
  ],
  'data-protection-act': [
    'data_protection_lead', 'ico_registration', 'record_system', 'record_system_name',
    'monitoring_equipment', 'records_retention', 'training_delivery',
  ],
  'gdpr': [
    'data_protection_lead', 'ico_registration', 'record_system', 'messaging_apps',
    'monitoring_equipment', 'records_retention',
  ],
  'caldicott-principles': [
    'caldicott_guardian', 'data_protection_lead', 'record_system', 'training_delivery',
  ],
  'common-law-duty-of-confidentiality': ['caldicott_guardian', 'record_system'],
  'records-management-code-of-practice-for-health-and-social-care-2021': [
    'records_retention', 'record_system', 'record_system_name',
  ],
  'information-governance': ['data_protection_lead', 'record_system', 'records_retention'],
  'regulation-17': [
    'audit_schedule', 'audit_independence', 'risk_register', 'governance_meeting', 'record_system',
  ],
  'health-and-safety-at-work-act': [
    'health_safety_lead', 'risk_register', 'audit_schedule', 'training_delivery',
  ],
  'mental-capacity-act-2005': [
    'restraint_in_use', 'imca_service', 'record_system', 'training_delivery',
  ],
  'deprivation-of-liberty-safeguards-dols': ['restraint_in_use', 'local_authority', 'imca_service'],
  'liberty-protection-safeguards-lps': ['restraint_in_use', 'local_authority'],
  'least-restrictive-practice-principles': ['restraint_in_use', 'training_delivery'],
  'care-act-2014': ['local_authority', 'imca_service', 'record_system'],
  'safeguarding-adults': ['local_authority', 'training_delivery'],
  'regulation-13': ['local_authority', 'training_delivery'],
  'regulation-18': ['training_delivery', 'governance_meeting'],
  'regulation-19': ['training_delivery'],
  'regulation-9': ['record_system', 'accessible_formats'],
  'regulation-12': ['risk_register', 'audit_schedule'],
  'human-rights-act-1998': ['restraint_in_use', 'local_authority'],
  'oliver-mcgowan-mandatory-training': ['training_delivery'],
  'cqc': ['governance_meeting', 'local_authority'],
  'cqc-statutory-notifications': ['local_authority', 'governance_meeting'],
  // ── Medicines ──────────────────────────────────────────────────────────────────────
  'nice-sc1-managing-medicines-care-homes': ['pharmacy_supplier', 'controlled_drugs', 'mar_charts', 'homely_remedies', 'self_administration', 'medicines_competency', 'gp_practice', 'agency_staff'],
  'medicines-act-1968': ['pharmacy_supplier', 'mar_charts', 'medicines_competency'],
  'misuse-of-drugs-act-1971': ['controlled_drugs', 'pharmacy_supplier', 'medicines_competency'],
  'rps-professional-guidance-on-the-safe-and-secure-handling-of-medicines': ['controlled_drugs', 'pharmacy_supplier', 'mar_charts', 'medicines_competency'],

  // ── Fire, premises, equipment and utilities ───────────────────────────────────────
  'regulatory-reform-fire-safety-order-2005': ['fire_responsible_person', 'fire_risk_assessment', 'evacuation_strategy', 'evacuation_aids', 'night_staffing', 'training_delivery'],
  'regulation-15': ['asset_register', 'lifting_equipment', 'loler_contractor', 'gas_contractor', 'electrical_testing', 'legionella_scheme', 'asbestos_register', 'restraint_in_use', 'governance_meeting'],
  'lifting-operations-and-lifting-equipment-regulations-1998-loler': ['lifting_equipment', 'loler_contractor', 'asset_register'],
  'provision-and-use-of-work-equipment-regulations-1998-puwer': ['lifting_equipment', 'asset_register', 'training_delivery'],
  'manual-handling-regulations': ['lifting_equipment', 'training_delivery', 'risk_register'],
  'workplace-health-safety-and-welfare-regulations-1992': ['asset_register', 'health_safety_lead'],
  'gas-safety-regulations-1998': ['gas_contractor', 'asset_register'],
  'electricity-at-work-regulations-1989': ['electrical_testing', 'asset_register'],
  'legionella-acop-l8': ['legionella_scheme', 'asset_register'],
  'control-of-asbestos-regulations-2012': ['asbestos_register', 'health_safety_lead'],
  'coshh': ['coshh_register', 'health_safety_lead', 'training_delivery'],
  'first-aid-regulations': ['training_delivery', 'night_staffing'],
  'riddor': ['health_safety_lead', 'governance_meeting'],

  // ── Infection prevention ───────────────────────────────────────────────────────────
  'health-and-social-care-act-infection-control-code': ['ipc_lead', 'health_protection_team', 'training_delivery', 'audit_schedule', 'agency_staff', 'coshh_register'],
  'infection-control': ['ipc_lead', 'health_protection_team', 'training_delivery', 'audit_schedule'],
  'nice-cg139': ['ipc_lead', 'training_delivery'],
  'uk-health-security-agency-ukhsa': ['health_protection_team', 'ipc_lead'],

  // ── Catering and nutrition ─────────────────────────────────────────────────────────
  'food-allergen-natashas-law': ['catering_arrangement', 'allergen_matrix', 'ppds_food', 'training_delivery', 'record_system'],
  'food-safety-act-1990': ['catering_arrangement', 'allergen_matrix', 'training_delivery'],
  'food-hygiene-legislation-including-regulation-ec-no-8522004-and-food-hygiene-england-regulations-2013': ['catering_arrangement', 'training_delivery', 'audit_schedule'],
  'regulation-14': ['catering_arrangement', 'allergen_matrix', 'record_system'],

  // ── Workforce, conduct and speaking up ────────────────────────────────────────────
  'employment-rights-act': ['speak_up_routes', 'agency_staff', 'training_delivery'],
  'public-interest-disclosure-act': ['speak_up_routes', 'agency_staff'],
  'freedom-to-speak-up': ['speak_up_routes', 'training_delivery'],
  'whistleblowing': ['speak_up_routes', 'agency_staff'],
  'disclosure-and-barring-service-dbs': ['dbs_update_service', 'agency_staff', 'records_retention'],
  'safeguarding-vulnerable-groups-act-2006': ['dbs_update_service', 'local_authority', 'training_delivery'],
  'working-time-regulations-1998': ['night_staffing', 'agency_staff'],
  'the-code:-professional-standards-of-practice-and-behaviour-for-nurses-midwives-and-nursing-associates': ['registered_nurses', 'training_delivery'],
  'modern-slavery-act-2015': ['agency_staff', 'training_delivery'],
  'bribery-act-2010': ['governance_meeting', 'training_delivery'],
  'workshops-to-raise-awareness-of-prevent': ['training_delivery', 'local_authority'],

  // ── Care, clinical and complaints ─────────────────────────────────────────────────
  'regulation-10': ['training_delivery', 'record_system'],
  'regulation-11': ['restraint_in_use', 'imca_service', 'record_system'],
  'common-law-principles-of-capacity-and-consent': ['restraint_in_use', 'imca_service', 'record_system'],
  'regulation-16': ['complaints_handler', 'governance_meeting'],
  'local-government-and-social-care-ombudsman-lgsco': ['complaints_handler'],
  'regulation-20': ['complaints_handler', 'governance_meeting', 'training_delivery'],
  'mental-health-act-1983': ['local_authority', 'imca_service', 'gp_practice'],
  'nice_ng11_-_challenging_behaviour_and_learning_disabilities': ['restraint_in_use', 'training_delivery', 'gp_practice'],
  'nice_ng31_-_care_of_dying_adults': ['end_of_life_framework', 'gp_practice', 'record_system'],
  'gold-standards-framework-gsf': ['end_of_life_framework', 'gp_practice'],
  'cg83_-_rehabilitation_after_critical_illness': ['gp_practice', 'record_system'],
  'nice-guidelines': ['gp_practice', 'audit_schedule'],

  // ── Registration and governance ───────────────────────────────────────────────────
  'regulated-activities-regulations-2014': ['governance_meeting', 'audit_schedule', 'local_authority'],
  'health-and-social-care-act-2008': ['governance_meeting', 'local_authority'],
  'health-and-care-act-2022': ['governance_meeting', 'local_authority'],
}

/** The questions a product needs: the union of its regulations', asked once each. */
export function questionsForReferenceKeys(referenceKeys: string[]): IntakeQuestion[] {
  const seen = new Set<string>()
  const out: IntakeQuestion[] = []
  for (const key of referenceKeys) {
    for (const q of REGULATION_QUESTION_KEYS[key] ?? []) {
      if (seen.has(q)) continue
      const question = INTAKE_QUESTIONS[q]
      if (!question) continue          // a mapping typo must not become an invisible gap
      seen.add(q)
      out.push(question)
    }
  }
  return out
}

/** Regulations we have not derived questions for yet, so the UI can say so rather than
 *  presenting an incomplete list as though it were the whole answer. */
export function regulationsWithoutQuestions(referenceKeys: string[]): string[] {
  return referenceKeys.filter(k => !(REGULATION_QUESTION_KEYS[k] ?? []).length)
}
