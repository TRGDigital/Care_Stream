// Platform-level knowledge seeds — generic Q&A pairs applicable across all UK
// care settings. Seeded into each tenant's KnowledgeEntry table on sign-up
// (source_type='platform', source_id='seed_<slug>').
//
// Answers are grounded in UK legislation and CQC standards as of 2024.

export interface SeedEntry {
  slug:        string   // stable unique ID — never change once deployed
  question:    string
  answer:      string
  source_name: string   // displayed in the UI as the source label
  category:    string   // grouping label for the accordion UI
}

export const PLATFORM_KNOWLEDGE_SEEDS: SeedEntry[] = [

  // ── CQC & Inspection ──────────────────────────────────────────────────────

  {
    slug:        'cqc_kloe',
    category:    'CQC & Inspection',
    question:    'What are the CQC Key Lines of Enquiry?',
    answer:      'The CQC assesses services against five Key Lines of Enquiry (KLOEs): Safe (are people protected from abuse and avoidable harm?), Effective (does care achieve good outcomes?), Caring (are staff kind and compassionate?), Responsive (are services organised to meet people\'s needs?), and Well-led (is leadership driving improvement?). Each KLOE has sub-questions inspectors use during visits, document reviews, and staff and resident interviews.',
    source_name: 'CQC — Key Lines of Enquiry',
  },
  {
    slug:        'cqc_ratings',
    category:    'CQC & Inspection',
    question:    'What do CQC inspection ratings mean?',
    answer:      'CQC rates services as Outstanding (exceptionally high quality), Good (meeting all standards effectively), Requires Improvement (not meeting all standards — must improve), or Inadequate (serious risk to people\'s safety or wellbeing — may lead to enforcement action including cancellation of registration). Each of the five KLOEs receives its own rating; the overall rating is usually determined by the lowest individual rating.',
    source_name: 'CQC — Inspection Ratings',
  },
  {
    slug:        'cqc_fppr',
    category:    'CQC & Inspection',
    question:    'What is the Fit and Proper Persons Requirement (FPPR)?',
    answer:      'The FPPR (Regulation 5 of the Health and Social Care Act 2008 Regulated Activities Regulations 2014) requires that directors and equivalent senior leaders of care providers are fit and proper persons. They must be of good character, have the qualifications, competence, skills and experience required, be able to perform their role, and not be prohibited from holding the position. Providers must have a process to assess and record FPPR compliance for all relevant persons.',
    source_name: 'CQC — Fit and Proper Persons Requirement',
  },
  {
    slug:        'cqc_registration',
    category:    'CQC & Inspection',
    question:    'What activities must be registered with the CQC?',
    answer:      'Any provider carrying out regulated activities in England must register with the CQC. In care settings this typically includes: personal care, accommodation for persons who require nursing or personal care, treatment of disease/disorder/injury, and nursing care. A Registered Manager must be nominated for most regulated activities. Carrying out regulated activities without registration is a criminal offence.',
    source_name: 'CQC — Registration Requirements',
  },

  // ── Incidents & Reporting ─────────────────────────────────────────────────

  {
    slug:        'riddor_reporting',
    category:    'Incidents & Reporting',
    question:    'What must be reported under RIDDOR 2013?',
    answer:      'RIDDOR (Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013) requires employers to report to the HSE: deaths of workers or members of the public arising from work activities; specified injuries to workers (fractures, amputations, loss of sight, crush injuries, burns, scalping); injuries to non-workers requiring hospital treatment; over-7-day incapacitation injuries to workers (reported within 15 days); occupational diseases; and dangerous occurrences. Most reports must be made within 10 days; fatalities and specified injuries within 3 days.',
    source_name: 'HSE — RIDDOR 2013',
  },
  {
    slug:        'safeguarding_principles',
    category:    'Incidents & Reporting',
    question:    'What are the six safeguarding principles for adults?',
    answer:      'The Care Act 2014 sets out six safeguarding principles: Empowerment (people supported to make their own decisions), Prevention (acting before harm occurs), Proportionality (the least intrusive response appropriate), Protection (support for those in greatest need), Partnership (working with communities), and Accountability (transparency in safeguarding practice). Any concern about abuse or neglect must be reported to the local authority safeguarding team without delay.',
    source_name: 'Care Act 2014 — Safeguarding Principles',
  },
  {
    slug:        'duty_of_candour',
    category:    'Incidents & Reporting',
    question:    'What is the Duty of Candour and when does it apply?',
    answer:      'Regulation 20 of the Health and Social Care Act 2008 Regulations 2014 requires providers to be open and honest when something goes wrong that causes, or could cause, moderate or severe harm, prolonged psychological harm, or death. When triggered, the provider must: notify the person (or their representative) in person as soon as reasonably possible; apologise; provide a truthful written account; and offer support. The notification must be documented. Failure to comply is a CQC offence.',
    source_name: 'CQC — Duty of Candour (Regulation 20)',
  },
  {
    slug:        'cqc_serious_incident',
    category:    'Incidents & Reporting',
    question:    'When must a serious incident be reported to the CQC?',
    answer:      'Providers must notify the CQC without delay of: deaths of service users; serious injuries; abuse or allegation of abuse; any incident which is reported to, or investigated by, the police; events preventing the provider from carrying on the regulated activity safely; and unexpected or unexplained absence of a service user. Notifications are submitted via the CQC provider portal. The CQC also expects notification of anything that might affect public confidence in the service.',
    source_name: 'CQC — Notification Requirements',
  },
  {
    slug:        'dols',
    category:    'Incidents & Reporting',
    question:    'What is a Deprivation of Liberty Safeguard (DoLS) and when does it apply?',
    answer:      'DoLS (under the Mental Capacity Act 2005, Schedule A1) authorises the deprivation of liberty of a person who lacks mental capacity and is in a care home or hospital, where it is necessary and in their best interests. A Standard Authorisation must be applied for from the supervisory body (local authority) before or shortly after a deprivation begins. An Urgent Authorisation (lasting up to 7 days, extendable to 21) can be used in emergencies. From 2022 onwards, DoLS will be replaced by the Liberty Protection Safeguards (LPS), though implementation has been delayed.',
    source_name: 'Mental Capacity Act 2005 — DoLS',
  },

  // ── Health & Safety ───────────────────────────────────────────────────────

  {
    slug:        'manual_handling',
    category:    'Health & Safety',
    question:    'What are the legal requirements for manual handling in a care setting?',
    answer:      'The Manual Handling Operations Regulations 1992 require employers to avoid hazardous manual handling where reasonably practicable, assess the risk of any hazardous handling that cannot be avoided, and reduce that risk to the lowest level reasonably practicable. In care settings this means individual moving and handling risk assessments for each person receiving care, a written care plan detailing the method, equipment required (hoists, slide sheets, etc.), and a minimum number of staff. All staff must receive manual handling training before moving people.',
    source_name: 'HSE — Manual Handling Operations Regulations 1992',
  },
  {
    slug:        'coshh',
    category:    'Health & Safety',
    question:    'What does COSHH cover and what must a COSHH assessment include?',
    answer:      'The Control of Substances Hazardous to Health Regulations 2002 (COSHH) require employers to assess and control the risks from hazardous substances, including cleaning chemicals, body fluids, and clinical waste. A COSHH assessment must identify the substance and its hazards, describe who might be harmed and how, evaluate the risk, state control measures (substitution, ventilation, PPE), detail emergency procedures, and be reviewed regularly. Assessments must be documented and staff informed of the findings.',
    source_name: 'HSE — COSHH Regulations 2002',
  },
  {
    slug:        'fire_safety',
    category:    'Health & Safety',
    question:    'What are the fire safety responsibilities of the Responsible Person in a care setting?',
    answer:      'Under the Regulatory Reform (Fire Safety) Order 2005, the Responsible Person (usually the owner or manager) must carry out a fire risk assessment and review it regularly; implement and maintain fire precautions; ensure staff receive fire safety training on induction and annually thereafter; conduct fire drills at least twice a year; maintain a fire logbook; ensure escape routes are clear; test fire alarms weekly; and service fire equipment annually. Care settings with sleeping occupants (including residents) have additional requirements including appropriate detection systems and evacuation procedures.',
    source_name: 'Regulatory Reform (Fire Safety) Order 2005',
  },
  {
    slug:        'lone_working',
    category:    'Health & Safety',
    question:    'What are the legal requirements for lone working in a care setting?',
    answer:      'The Health and Safety at Work etc. Act 1974 and the Management of Health and Safety at Work Regulations 1999 require employers to assess and manage risks from lone working. In care settings this means: conducting lone working risk assessments for all roles that involve working alone; having a check-in system (e.g. regular contact by phone or radio); providing lone workers with personal alarm devices where appropriate; ensuring staff know what to do in an emergency; and never leaving a lone worker responsible for a person whose needs cannot safely be met by one person.',
    source_name: 'HSE — Lone Working Guidance',
  },
  {
    slug:        'loler_puwer',
    category:    'Health & Safety',
    question:    'When do LOLER and PUWER apply in a care setting?',
    answer:      'LOLER (Lifting Operations and Lifting Equipment Regulations 1998) applies to all lifting equipment, including hoists, slings, and bath lifts. Such equipment must be thoroughly examined by a competent person every 6 months (12 months for non-person-lifting equipment). PUWER (Provision and Use of Work Equipment Regulations 1998) applies to all work equipment including beds, shower chairs, and pressure care mattresses. Equipment must be suitable, maintained, inspected, and staff trained in its use. Records of inspection and maintenance must be kept.',
    source_name: 'HSE — LOLER 1998 / PUWER 1998',
  },

  // ── Medication ────────────────────────────────────────────────────────────

  {
    slug:        'medication_six_rs',
    category:    'Medication',
    question:    'What are the six Rs of safe medication administration?',
    answer:      'The six Rs are: Right person (verify the identity of the person receiving medication), Right medication (check the name matches the MAR chart), Right route (oral, topical, inhaled, etc. as prescribed), Right dose (confirm the dose and units), Right time (administer at the prescribed time — normally within 30–60 minutes either side), and Right documentation (record immediately after administration, never in advance). Some frameworks add a seventh R: Right to refuse — always respect a person\'s decision to decline medication.',
    source_name: 'NICE / NMC — Medication Administration Guidance',
  },
  {
    slug:        'controlled_drugs',
    category:    'Medication',
    question:    'What are the legal requirements for storing and recording controlled drugs?',
    answer:      'Under the Misuse of Drugs (Safe Custody) Regulations 1973, controlled drugs (Schedule 2 and some Schedule 3) must be stored in a locked, fixed metal cabinet. Two members of staff (one of whom must be a registered nurse or trained and competent in controlled drug administration, depending on setting) must witness and sign for each administration. A controlled drug register must record every receipt, administration, and disposal. The register must be kept for 2 years. Discrepancies must be investigated immediately and reported to the accountable officer.',
    source_name: 'Misuse of Drugs Regulations 2001',
  },
  {
    slug:        'prn_protocol',
    category:    'Medication',
    question:    'What must a PRN protocol include before a PRN medication can be administered?',
    answer:      'A PRN (as required) protocol must be in place before any PRN medication is given. The protocol must specify: the name and dose of the medication; the exact indication (when to give it — specific symptoms, not vague terms like "if needed"); the maximum dose in 24 hours; the minimum interval between doses; what to do if the medication is not effective; and who to contact if concerned. For people who lack capacity, there should be a best interests record supporting use of the PRN. The protocol must be signed by the prescriber.',
    source_name: 'NICE / UKCPA — PRN Medication Guidance',
  },
  {
    slug:        'medication_error',
    category:    'Medication',
    question:    'What should staff do if a medication error occurs?',
    answer:      'In the event of a medication error: ensure the safety of the person first (seek immediate medical attention if required); report to the senior on duty immediately; contact the prescriber or GP for advice; document the error fully in the person\'s care records and on an incident report; complete a medication error form; notify the person and/or their representative and apologise (Duty of Candour if harm results); and review to prevent recurrence. Significant medication errors must be reported to the CQC. All medication errors should be reviewed at governance meetings.',
    source_name: 'CQC / NICE — Medication Error Reporting',
  },

  // ── Infection Prevention ──────────────────────────────────────────────────

  {
    slug:        'hand_hygiene',
    category:    'Infection Prevention',
    question:    'What are the WHO five moments of hand hygiene?',
    answer:      'The WHO five moments are: 1. Before touching a person; 2. Before a clean or aseptic procedure; 3. After body fluid exposure risk; 4. After touching a person; 5. After touching a person\'s surroundings. Hands must be decontaminated using either soap and water (preferred when hands are visibly dirty or after contact with C. difficile) or alcohol-based hand rub (effective against most organisms). Hand washing must last a minimum of 20 seconds using the full six-step WHO technique.',
    source_name: 'WHO — Five Moments for Hand Hygiene',
  },
  {
    slug:        'ppe_requirements',
    category:    'Infection Prevention',
    question:    'When must PPE be worn in a care setting?',
    answer:      'PPE must be worn when there is a risk of exposure to blood, body fluids, or infectious agents. Gloves (non-sterile nitrile) must be worn for all personal care, wound care, and handling of body fluids. Aprons must be worn for all direct care activities. Fluid-resistant surgical masks must be worn when within 1 metre of a person with a respiratory infection. Eye protection is required when there is a risk of splashing. PPE must be changed between residents and disposed of as clinical waste. Staff should perform hand hygiene before donning and after removing PPE.',
    source_name: 'UKHSA — IPC in Health and Social Care Settings',
  },
  {
    slug:        'standard_precautions',
    category:    'Infection Prevention',
    question:    'What are standard infection control precautions and when do they apply?',
    answer:      'Standard infection control precautions (SICPs) apply to all care interactions with all people, regardless of their infection status. They include: hand hygiene; appropriate use of PPE; safe management of care equipment; safe management of the environment; safe management of linen; safe disposal of waste; respiratory and cough hygiene; appropriate handling of sharps; and safe management of blood and body fluid spills. SICPs are the foundation of infection prevention — they must always be in place before any additional transmission-based precautions.',
    source_name: 'UKHSA — Standard Infection Control Precautions',
  },
  {
    slug:        'outbreak_management',
    category:    'Infection Prevention',
    question:    'What must be done when an outbreak of infection occurs?',
    answer:      'An outbreak is two or more linked cases of the same illness. Actions: inform the Registered Manager and infection prevention lead immediately; contact the local UK Health Security Agency (UKHSA) Health Protection Team for guidance; implement isolation or cohort nursing; increase frequency of cleaning and disinfection; restrict admissions and visits; document all cases; provide daily updates to the Health Protection Team; and only lift restrictions after 48 hours with no new cases (72 hours for norovirus). A post-outbreak debrief and report must be completed.',
    source_name: 'UKHSA — Outbreak Management in Care Settings',
  },

  // ── Employment & HR ───────────────────────────────────────────────────────

  {
    slug:        'whistleblowing',
    category:    'Employment & HR',
    question:    'What rights do staff have under whistleblowing legislation?',
    answer:      'The Public Interest Disclosure Act 1998 (PIDA) protects workers who make a protected disclosure — reporting wrongdoing they reasonably believe is in the public interest. In care settings this includes concerns about unsafe care, financial fraud, or cover-up of incidents. Protected disclosures can be made internally, to a prescribed regulator (such as the CQC), or in some circumstances to the wider public. Workers who are dismissed or suffer detriment for making a protected disclosure can bring a claim to an Employment Tribunal — there is no qualifying period of employment required.',
    source_name: 'Public Interest Disclosure Act 1998',
  },
  {
    slug:        'dbs_checks',
    category:    'Employment & HR',
    question:    'What level of DBS check is required for care roles?',
    answer:      'Staff who provide regulated activity (personal care, healthcare, or social care) with adults or children must have an Enhanced DBS check with the relevant barred list check (Adults\' Barred List for adult care). This is a legal requirement under the Safeguarding Vulnerable Groups Act 2006. An Enhanced DBS without a barred list check is required for roles with regular, unsupervised contact that doesn\'t meet the definition of regulated activity. DBS certificates should be obtained before a person starts work, or a risk-assessed decision made to allow supervised work while the check is awaited. CQC expects evidence that checks are in place and reviewed.',
    source_name: 'DBS / Safeguarding Vulnerable Groups Act 2006',
  },
  {
    slug:        'annual_leave',
    category:    'Employment & HR',
    question:    'What is the statutory annual leave entitlement for care staff?',
    answer:      'Under the Working Time Regulations 1998, all workers are entitled to a minimum of 5.6 weeks\' paid annual leave per year (28 days for a full-time worker working 5 days a week), including bank holidays. Part-time workers receive the same entitlement on a pro-rata basis. This is a statutory minimum — individual contracts or policies may offer more. Leave must be taken in the leave year it is accrued; rollover is only permitted if prevented by statutory leave (e.g. maternity leave) or if contractually agreed.',
    source_name: 'Working Time Regulations 1998',
  },
  {
    slug:        'statutory_sick_pay',
    category:    'Employment & HR',
    question:    'What is Statutory Sick Pay (SSP) and who is eligible?',
    answer:      'SSP is paid by employers to eligible employees who are off sick for 4 or more consecutive days (including non-working days). As of 2024/25, SSP is £116.75 per week and is payable for up to 28 weeks. To qualify, an employee must earn at least the Lower Earnings Limit (£123 per week in 2024/25). SSP is not payable for the first 3 qualifying days ("waiting days"). Agency workers and zero-hours workers may also qualify if they meet the earnings threshold. Employers may have their own enhanced sick pay schemes above the statutory minimum.',
    source_name: 'HMRC — Statutory Sick Pay',
  },

  // ── Data & Privacy ────────────────────────────────────────────────────────

  {
    slug:        'gdpr_special_category',
    category:    'Data & Privacy',
    question:    'What counts as special category data under UK GDPR in a care setting?',
    answer:      'Special category data requires a higher level of protection. In care settings this includes: health and medical information; racial or ethnic origin; religious or philosophical beliefs; biometric data used for identification; genetic data; data about sex life or sexual orientation; trade union membership; and political opinions. Processing special category data requires both a lawful basis (usually legitimate interests or public task) and a separate condition from Schedule 1 of the Data Protection Act 2018 — most commonly explicit consent or substantial public interest. Records of processing must be maintained.',
    source_name: 'UK GDPR / Data Protection Act 2018',
  },
  {
    slug:        'data_retention',
    category:    'Data & Privacy',
    question:    'How long must care records be retained?',
    answer:      'NHS and social care records retention is governed by the Records Management Code of Practice (2021). Adult social care records should generally be retained for 8 years after the last entry, or until the person\'s 26th birthday if they were a child at the time of care. Accident and incident records: 10 years. Financial records: 7 years. Staff records: 6 years after employment ends. Records relating to serious incidents or litigation should be retained for as long as the matter is live. Records should be securely destroyed at the end of the retention period and destruction documented.',
    source_name: 'NHS / DHSC — Records Management Code of Practice 2021',
  },
  {
    slug:        'subject_access_request',
    category:    'Data & Privacy',
    question:    'What is the timescale for responding to a Subject Access Request?',
    answer:      'Under UK GDPR, a Subject Access Request (SAR) must be responded to within one calendar month of receipt. If the request is complex or there are multiple requests from the same individual, this can be extended by a further two months — but the person must be informed of the extension within the first month. The response must provide a copy of all personal data held about the individual (with information about third parties redacted if necessary), the purposes of processing, and their rights. SARs cannot be refused without legal grounds and must be provided free of charge in most cases.',
    source_name: 'UK GDPR — Subject Access Requests',
  },
  {
    slug:        'data_breach',
    category:    'Data & Privacy',
    question:    'When must a data breach be reported to the ICO?',
    answer:      'A personal data breach that is likely to result in a risk to the rights and freedoms of individuals must be reported to the Information Commissioner\'s Office (ICO) within 72 hours of becoming aware of it. If the breach is unlikely to result in risk, reporting is not required but the breach must still be documented internally. If the breach is likely to result in a high risk to individuals, those individuals must also be notified directly without undue delay. Common reportable breaches in care include: sending care records to the wrong person, losing an unencrypted device, and ransomware attacks affecting personal data.',
    source_name: 'ICO — Data Breach Reporting',
  },

  // ── Mental Capacity & Rights ──────────────────────────────────────────────

  {
    slug:        'mca_five_principles',
    category:    'Mental Capacity & Rights',
    question:    'What are the five principles of the Mental Capacity Act 2005?',
    answer:      'The five statutory principles are: 1. A person must be assumed to have capacity unless it is established that they lack it; 2. A person is not to be treated as unable to make a decision unless all practicable steps to help them do so have been taken without success; 3. A person is not to be treated as unable to make a decision merely because they make an unwise decision; 4. An act done or decision made under the MCA must be done or made in the person\'s best interests; 5. Before the act is done or the decision made, regard must be had to whether the purpose can be achieved in a way that is less restrictive of the person\'s rights and freedom of action.',
    source_name: 'Mental Capacity Act 2005',
  },
  {
    slug:        'mca_two_stage_test',
    category:    'Mental Capacity & Rights',
    question:    'What is the two-stage test for assessing mental capacity?',
    answer:      'Under the Mental Capacity Act 2005, capacity is decision-specific and time-specific. The two-stage test is: Stage 1 — Does the person have an impairment or disturbance in the functioning of their mind or brain (e.g. dementia, brain injury, severe mental illness)? Stage 2 — Does that impairment mean the person is unable to: understand the information relevant to the decision; retain that information long enough to make the decision; use or weigh that information as part of the process of making the decision; or communicate their decision? If the answer to both stages is yes, the person lacks capacity for that decision at that time. Capacity assessments must be documented.',
    source_name: 'Mental Capacity Act 2005 — Capacity Assessment',
  },
  {
    slug:        'lasting_power_of_attorney',
    category:    'Mental Capacity & Rights',
    question:    'What is a Lasting Power of Attorney and what types exist?',
    answer:      'A Lasting Power of Attorney (LPA) is a legal document allowing a person (the donor) to appoint one or more people (attorneys) to make decisions on their behalf if they lose capacity. There are two types: Health and Welfare LPA (covers decisions about medical treatment, care, and where the person lives — only activates when the person lacks capacity) and Property and Financial Affairs LPA (covers bank accounts, property, bills — can be used while the person still has capacity if they choose). An LPA must be registered with the Office of the Public Guardian before it can be used. Care providers must ask to see the registered LPA document and keep a copy on file.',
    source_name: 'Mental Capacity Act 2005 — Lasting Power of Attorney',
  },
  {
    slug:        'imca',
    category:    'Mental Capacity & Rights',
    question:    'When is a person entitled to an Independent Mental Capacity Advocate (IMCA)?',
    answer:      'An IMCA must be instructed (not just offered) when a person who lacks capacity and has no appropriate family or friends to consult faces a decision about: serious medical treatment (including stopping treatment); a move to hospital for more than 28 days; a move to a care home for more than 8 weeks; and (in some local authorities) adult safeguarding enquiries or care reviews. The IMCA\'s role is to support and represent the person, not to make the decision. The IMCA\'s report must be taken into account in the best interests decision. Providers must have a policy for instructing IMCAs and document when and why one was or was not instructed.',
    source_name: 'Mental Capacity Act 2005 — IMCA Duty',
  },

  // ── Food Safety & Nutrition ───────────────────────────────────────────────

  {
    slug:        'food_safety_management',
    category:    'Food Safety & Nutrition',
    question:    'What food safety management system is required in a care home?',
    answer:      'Under Regulation (EC) 852/2004 on the hygiene of foodstuffs (retained in UK law), all food businesses including care homes must implement a food safety management system based on Hazard Analysis and Critical Control Points (HACCP) principles. In practice, most care homes use the Food Standards Agency\'s Safer Food Better Business (SFBB) pack, which provides a ready-made system covering: safe methods for cooking, chilling, cleaning, and cross-contamination prevention; a diary for recording daily and weekly checks; and guidance on management procedures. The system must be kept up to date and records retained for at least 3 months. CQC inspectors will ask to see evidence that a food safety management system is in place and being followed.',
    source_name: 'FSA — Safer Food Better Business',
  },
  {
    slug:        'food_temperature_control',
    category:    'Food Safety & Nutrition',
    question:    'What are the legal temperature requirements for food in a care setting?',
    answer:      'UK food hygiene regulations set the following temperature requirements: hot food must be held at 63°C or above; cold food must be kept at 8°C or below (best practice is 5°C or below); when cooking, food must reach a core temperature of at least 75°C throughout; reheated food must reach 75°C and must only be reheated once; frozen food should be stored at -18°C or below. Temperatures must be checked using a calibrated probe thermometer and recorded in the food safety diary at each mealtime. The probe must be cleaned and disinfected between uses to prevent cross-contamination.',
    source_name: 'Food Hygiene Regulations 2006 — Temperature Control',
  },
  {
    slug:        'food_allergens',
    category:    'Food Safety & Nutrition',
    question:    'What are the 14 major allergens that must be declared for food served in a care home?',
    answer:      'Under the Food Information for Consumers Regulation (retained in UK law), the 14 major allergens that must be declared are: celery; cereals containing gluten (wheat, rye, barley, oats); crustaceans; eggs; fish; lupin; milk; molluscs; mustard; tree nuts (almonds, hazelnuts, walnuts, cashews, pecans, Brazil nuts, pistachios, macadamias); peanuts; sesame seeds; soybeans; and sulphur dioxide or sulphites at concentrations above 10mg/kg. Care homes must know what allergens are in every dish and communicate this to residents, families, and staff. Known allergies or intolerances must be documented in the resident\'s care plan, and kitchen staff must be briefed before preparing meals for that resident.',
    source_name: 'FSA — Food Allergen Regulations',
  },
  {
    slug:        'texture_modified_diets',
    category:    'Food Safety & Nutrition',
    question:    'What is the IDDSI framework and when should texture-modified diets be used?',
    answer:      'The International Dysphagia Diet Standardisation Initiative (IDDSI) framework provides eight levels (0–7) for food textures and drink consistencies for people with dysphagia (swallowing difficulties). Levels range from 0 (thin liquids) to 7 (regular easy chew). A Speech and Language Therapist (SaLT) must assess the resident and prescribe the appropriate IDDSI level — care staff must never decide this independently. The resident\'s care plan must specify their IDDSI level and any thickener requirements for drinks. All staff involved in food preparation and serving must be trained in IDDSI levels. Serving the wrong texture can cause aspiration pneumonia, which can be life-threatening.',
    source_name: 'IDDSI — Texture Modified Diets Framework',
  },
  {
    slug:        'malnutrition_screening',
    category:    'Food Safety & Nutrition',
    question:    'What is the MUST tool and how often should it be completed in a care home?',
    answer:      'The Malnutrition Universal Screening Tool (MUST) is a validated five-step tool developed by BAPEN to identify adults at risk of malnutrition. It scores based on BMI, unplanned weight loss, and the effect of acute illness. In care homes, MUST should be completed: on admission; monthly for residents scored at medium or high risk; and at least every 3–6 months for low-risk residents. Any resident scoring medium or high risk must have a written nutrition support plan. Food and fluid intake charts should be maintained for at-risk residents. CQC inspectors routinely check for evidence of nutrition screening, care planning, and monitoring as part of the Effective KLOE.',
    source_name: 'BAPEN — Malnutrition Universal Screening Tool',
  },
  {
    slug:        'food_handler_training',
    category:    'Food Safety & Nutrition',
    question:    'What food hygiene training is required for care home staff who prepare or serve food?',
    answer:      'Under the Food Hygiene Regulations 2006, all food handlers must be supervised and trained in food hygiene matters commensurate with their work. There is no legal requirement for a specific qualification, but the FSA recommends that food handlers complete a Level 2 Award in Food Safety before handling food, or within three months of starting. Training should be refreshed every three years. Records of all food hygiene training must be kept. All food-handling staff must understand: personal hygiene and illness exclusion rules; prevention of cross-contamination; temperature control; cleaning and disinfection procedures; allergen awareness; and how to use and complete the food safety diary.',
    source_name: 'Food Hygiene Regulations 2006 — Food Handler Training',
  },

]
