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
