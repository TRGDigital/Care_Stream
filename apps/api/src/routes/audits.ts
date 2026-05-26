import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { requireAdmin } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { callClaude } from '../services/ai/claude'

export const auditsRouter = Router()

// ─── Seed types & data ───────────────────────────────────────────────────────

type QSeed = string | { text: string; type?: string }
interface SSeed { title: string; defaultType?: string; questions: QSeed[] }
interface TSeed { name: string; description: string; frequency: string; sections: SSeed[] }

const PLATFORM_TEMPLATES: TSeed[] = [

  // 1 — Health & Safety Monthly
  {
    name: 'Health & Safety',
    description: 'Monthly health and safety audit covering building safety, fire safety, medical & care safety, infection control, kitchen & food safety, equipment maintenance, security & safeguarding, staff health & safety, and resident wellbeing.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: Building Safety & Management',
        questions: [
          'All internal and external walkways free from hazards and clutter.',
          'Flooring secure, non-slip, and free from damage.',
          'Corridors well-lit; bulbs replaced promptly.',
          'Handrails secure and continuous along corridors.',
          'All windows fitted with appropriate restrictors.',
          'Doors to hazardous areas locked (kitchens, laundry, maintenance).',
          'Signage is dementia-friendly (clear orientation cues, contrasting colours).',
        ],
      },
      {
        title: 'Section 2: Fire Safety',
        questions: [
          'Fire exits unobstructed and clearly signed.',
          'Fire alarm tested weekly and documented.',
          'Monthly test of emergency lighting completed.',
          'Fire extinguishers in place, serviced, and in date.',
          'Staff aware of PEEPs for residents with mobility or cognitive needs.',
          'Fire drills conducted as per schedule and recorded.',
        ],
      },
      {
        title: 'Section 3: Medical & Care-Related Safety',
        questions: [
          'Clinical waste stored safely and collected as scheduled.',
          'Sharps containers in use, labelled, and not overfilled.',
          'First aid kits complete, checked, and in date.',
          'Pressure-relieving equipment functioning and maintained.',
          'Bedrails risk-assessed and used safely.',
          'Dementia-specific risks reviewed (wandering, exit-seeking, night-time risks).',
        ],
      },
      {
        title: 'Section 4: Infection Prevention & Control',
        questions: [
          'PPE stocks available and stored appropriately.',
          'Handwashing facilities clean and accessible.',
          'Staff observed following hand hygiene practice.',
          'Cleaning schedules completed and signed.',
          'Clinical rooms clean and hygienic.',
          'Laundry handled and stored safely (dirty vs clean separation).',
        ],
      },
      {
        title: 'Section 5: Kitchen & Food Safety',
        questions: [
          'Kitchen clean and free from pests and contamination risks.',
          'Fridge/freezer temperatures recorded daily and within range.',
          'Correct food labelling and date rotation in place.',
          'Allergen management system in place and followed.',
          'Pureed/modified diets prepared safely and correctly.',
        ],
      },
      {
        title: 'Section 6: Equipment Maintenance',
        questions: [
          'Hoists and slings inspected and have valid LOLER certificates.',
          'Wheelchairs, walking aids, and mobility aids in safe condition.',
          'Nurse call system functioning and tested.',
          'Water temperatures monitored and within safe legionella ranges.',
          'Maintenance issues logged and actioned.',
        ],
      },
      {
        title: 'Section 7: Security & Safeguarding',
        questions: [
          'Front door security system functioning.',
          'Visitor book used; ID checked where required.',
          'CCTV (if used) functioning and compliant with GDPR.',
          'Residents protected from unsafe access to chemicals and equipment.',
          'Safeguarding concerns monitored and reported appropriately.',
        ],
      },
      {
        title: 'Section 8: Staff Health & Safety',
        questions: [
          'Staff manual-handling training up to date.',
          'Staff understand dementia-related risks (challenging behaviour, confusion, wandering).',
          'Accident/incident logs up to date and reviewed.',
          'Staff know how to report H&S concerns.',
        ],
      },
      {
        title: 'Section 9: Resident Wellbeing & Dignity (Dementia-Focused Safety)',
        questions: [
          'Environment is calm, predictable, and reduces distress triggers.',
          'Clear visual cues in place (toilets, dining areas, bedroom labels).',
          'Outdoor area safe and dementia-friendly.',
          "Staff aware of residents' risk profiles (falls, wandering, choking).",
          'Falls prevention strategies in place and reviewed monthly.',
        ],
      },
    ],
  },

  // 2 — Resident Bedrooms Daily Checklist
  {
    name: 'Resident Bedrooms',
    description: 'Daily room-by-room checklist covering safety, environment, personal care, clinical items, personal belongings, and resident wellbeing.',
    frequency: 'daily',
    sections: [
      {
        title: 'Section 1: Safety',
        defaultType: 'yes_no_na',
        questions: [
          'Call bell within reach and working.',
          'Any trip hazards present (cables, clutter, rugs).',
          'Bed set to safe height.',
          'Bed rails (if in use) safe and correctly positioned.',
          'Mobility aids accessible and in good condition.',
          'Window/door safe and secure.',
        ],
      },
      {
        title: 'Section 2: Environment',
        defaultType: 'yes_no_na',
        questions: [
          'Room clean and tidy.',
          'Bins emptied.',
          'Floors clean, dry, and hazard free.',
          'Ventilation/temperature comfortable.',
          'Lighting adequate (including night light if used).',
          'Mattress pressure correct for resident weight.',
        ],
      },
      {
        title: 'Section 3: Personal Care & Comfort',
        defaultType: 'yes_no_na',
        questions: [
          'Resident clean, comfortable, and appropriately dressed.',
          'Incontinence products clean/dry or changed as needed.',
          'Oral-care items available and clean.',
          'Water jug refilled and drinks accessible.',
        ],
      },
      {
        title: 'Section 4: Clinical & Care Items',
        defaultType: 'yes_no_na',
        questions: [
          'Daily care-plan tasks completed.',
          'No expired or incorrectly stored creams or medications.',
        ],
      },
      {
        title: 'Section 5: Personal Belongings',
        defaultType: 'yes_no_na',
        questions: [
          'Clothing stored neatly.',
          'Glasses/hearing aids within reach and clean.',
          'Personal items present, intact, and appropriate.',
        ],
      },
      {
        title: 'Section 6: Wellbeing & Engagement',
        defaultType: 'yes_no_na',
        questions: [
          'Resident offered or engaged in meaningful activity.',
          'Communication/memory aids in place and correct.',
        ],
      },
    ],
  },

  // 3 — Resident Bedroom Audit Monthly (Analysis)
  {
    name: 'Resident Bedroom Audit',
    description: 'Monthly analysis of the daily bedroom checklists, summarising compliance by area, identifying themes, and recording actions taken.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: General Compliance Review',
        defaultType: 'findings',
        questions: [
          'Safety',
          'Environment',
          'Personal Care & Comfort',
          'Clinical & Equipment',
          'Personal Belongings',
          'Overall Compliance',
        ],
      },
      {
        title: 'Section 2: Key Themes Identified',
        defaultType: 'free_text',
        questions: [
          'Common strengths (what went well this month?).',
          'Common issues (repeated No findings across rooms).',
        ],
      },
      {
        title: 'Section 3: Breakdown of Most Frequent "No" Items',
        defaultType: 'findings',
        questions: [
          'List the most frequent No items with number of occurrences and notes on impact.',
        ],
      },
      {
        title: 'Section 4: Actions Taken This Month',
        defaultType: 'findings',
        questions: [
          'Issues identified, actions completed, dates, and staff responsible.',
        ],
      },
      {
        title: 'Section 5: Follow-Ups Required',
        defaultType: 'findings',
        questions: [
          'Outstanding issues, planned actions, responsible person, and target dates.',
        ],
      },
    ],
  },

  // 4 — Quality Assurance Analysis Form (CQC Family Feedback)
  {
    name: 'Quality Assurance',
    description: 'CQC inspection-ready RAG summary of family/resident questionnaire results, mapped to the five Key Lines of Enquiry (Safe, Caring, Effective, Responsive, Well-Led).',
    frequency: 'periodic',
    sections: [
      {
        title: 'Reporting Period & Response Summary',
        defaultType: 'free_text',
        questions: [
          'Questionnaire issued date, closing date, number of completed responses, and return rate %.',
        ],
      },
      {
        title: 'SAFE – Safety, Dignity & Respect',
        defaultType: 'findings',
        questions: [
          '% positive responses (Strongly Agree / Agree / Yes) for safety and dignity questions.',
          'RAG rating (Red / Amber / Green) with key evidence and family comments.',
        ],
      },
      {
        title: 'CARING – Kindness, Compassion & Relationships',
        defaultType: 'findings',
        questions: [
          '% positive responses for caring and compassion questions.',
          'RAG rating with key evidence and family comments.',
        ],
      },
      {
        title: 'EFFECTIVE – Dementia Understanding & Meaningful Activity',
        defaultType: 'findings',
        questions: [
          '% positive responses for effectiveness and activity questions.',
          'RAG rating with key evidence and family comments.',
        ],
      },
      {
        title: 'RESPONSIVE – Communication, Listening & Involvement',
        defaultType: 'findings',
        questions: [
          '% positive responses for communication and responsiveness questions.',
          'RAG rating with key evidence and family comments.',
        ],
      },
      {
        title: 'WELL-LED – Leadership, Openness & Complaint Handling',
        defaultType: 'findings',
        questions: [
          '% positive responses for leadership and complaint handling questions.',
          'RAG rating with key evidence and family comments.',
        ],
      },
      {
        title: 'Risks, Escalation & Improvement Priorities',
        defaultType: 'findings',
        questions: [
          'Any Red areas requiring escalation — details and actions triggered.',
          'Top improvement priorities for next 6–12 months (area, action, lead, review date).',
          'Year-on-year trend comparison — last year RAG vs this year RAG with commentary.',
        ],
      },
    ],
  },

  // 5 — Medicines Management Monthly
  {
    name: 'Medicines Management',
    description: 'Monthly medicines management audit covering supply, storage, administration, hygiene, recording, controlled drugs, disposal, and homely remedies.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Supply',
        defaultType: 'findings',
        questions: [
          'Are repeat prescriptions obtained in a safe and efficient manner?',
          'Are there any ordering or stock problems?',
          'Are there any problems with the pharmacy or the GP surgery?',
          'Are all medicines checked in correctly?',
          'Are medicines clearly labelled by the pharmacist? (Spot check 3 residents)',
          'Are there any "as directed" labels?',
          'Are up-to-date MAR sheets available for all service users?',
          'Are the medications in date? (Spot check 3 residents)',
        ],
      },
      {
        title: 'Levels of Support',
        defaultType: 'findings',
        questions: [
          'Does the instruction in the care plan accurately reflect the support needed (e.g. prompt, self-medication)?',
        ],
      },
      {
        title: 'Storage',
        defaultType: 'findings',
        questions: [
          'Are all medications stored safely and appropriately?',
          'Are excessive quantities of medication being stored?',
          'Is key security appropriate?',
          'Is stock rotated appropriately?',
          'Is there any evidence of borrowing or sharing medicine?',
        ],
      },
      {
        title: 'Administration',
        defaultType: 'findings',
        questions: [
          'Is the system of administration safe and appropriate?',
          'Have any medicines been missed?',
          'Is the medication given at the correct time and in the right way?',
          'Are the best outcomes being met for the service user with their medicines?',
          'Are PRN medicines being given according to their protocol and care plan?',
          'Have refusals been monitored and reported back?',
          'Are medicines being administered covertly to any service users?',
          'Are liquids being measured accurately?',
        ],
      },
      {
        title: 'Basic Hygiene & Housekeeping',
        defaultType: 'findings',
        questions: [
          'Are hands being washed prior to the administration of medicines?',
          'Are gloves being worn when administering creams?',
          'Is the storage area clean, tidy, and well-ordered?',
          'Are liquids in clean bottles with no spillage?',
          'Are medications separated from food if stored in a domestic fridge?',
        ],
      },
      {
        title: 'Recording',
        defaultType: 'findings',
        questions: [
          'Are fridge and room temperature records complete and have actions been taken where necessary?',
          'Have gaps on MAR sheets been identified and staff advised?',
          'Are all discontinued medicines removed from the MAR sheets?',
          'Does the audit trail for medicines tally? (Spot check 3 service users)',
          'Are all medications signed for immediately when they are administered?',
          'Do senior staff use the correct procedure for dose changes and MAR sheet amendments?',
          'Is the current list of staff signatures up to date?',
          'Are care plans up to date, accurate, and complete?',
        ],
      },
      {
        title: 'Controlled Drugs',
        defaultType: 'findings',
        questions: [
          'Are stock levels of controlled drugs appropriate?',
          'Does the quantity in the CD register reflect actual stock?',
          'Is the administration of CDs in line with current policy?',
          'Are CDs disposed of appropriately?',
          'Has the administration of CDs been risk assessed?',
        ],
      },
      {
        title: 'Disposal',
        defaultType: 'findings',
        questions: [
          'Has medication been held for a sufficient time following the death of a service user?',
          'Are any medications destroyed in the home?',
          'Is the returns record up to date?',
          'Is medication for disposal separated from medicines in use?',
        ],
      },
      {
        title: 'Homely Remedies',
        defaultType: 'findings',
        questions: [
          'Are all homely remedies in date?',
          'Are homely remedies stored separately and securely?',
          'Have any homely remedies been given for more than 2 days without contacting the GP?',
        ],
      },
    ],
  },

  // 6 — Kitchen Audit Monthly
  {
    name: 'Kitchen Audit',
    description: 'Monthly kitchen audit covering hygiene, food storage, fridge/freezer safety, cooking practice, allergen management, equipment, staff hygiene, pest control, and resident nutrition.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: General Hygiene & Cleanliness',
        questions: [
          'Kitchen clean, tidy, and free from clutter.',
          'Work surfaces sanitised and in good condition.',
          'Sinks clean with correct detergent and sanitiser available.',
          'Floors clean, free from spills, and non-slip.',
          'Cleaning schedules fully completed and signed.',
          'Waste bins lidded, clean, emptied regularly, and labelled.',
        ],
      },
      {
        title: 'Section 2: Food Storage',
        questions: [
          'Dry store clean and well-organised.',
          'All food labelled with delivery/open dates.',
          'No out-of-date foods present.',
          'Correct segregation of raw and cooked foods.',
          'Chemicals stored safely away from food.',
          'All containers sealed and pest-proof.',
        ],
      },
      {
        title: 'Section 3: Fridge & Freezer Safety',
        questions: [
          'Fridge temperatures recorded daily and within 0–5°C.',
          'Freezer temperatures recorded daily and within −18°C or below.',
          'No thawed or refrozen foods present.',
          'Food stored covered and dated.',
          'Fridge/freezer seals intact and clean.',
        ],
      },
      {
        title: 'Section 4: Cooking & Reheating Practice',
        questions: [
          'Probes used correctly and sanitised before and after use.',
          'Foods cooked to correct core temperature (min 75°C).',
          'Reheated foods reach 75°C or higher.',
          'Hot-holding temperatures above 63°C.',
          'Temperature recording sheets complete.',
        ],
      },
      {
        title: 'Section 5: Allergen & Special Diet Maintenance',
        questions: [
          'Allergen charts up to date and displayed.',
          'Staff aware of resident allergies and texture requirements.',
          'Cross-contamination controls in place.',
          'Dementia-appropriate diets considered (finger foods, fortified foods, soft diets).',
          'Modified-consistency foods prepared safely (IDDSI compliant).',
        ],
      },
      {
        title: 'Section 6: Equipment & Maintenance',
        questions: [
          'Ovens, microwaves, and appliances clean and functional.',
          'Ventilation systems and extractor fans clean and functioning.',
          'PAT testing in date for all electrical equipment.',
          'Faults reported and logged.',
          'Dishwashers reaching correct sanitisation temperature.',
        ],
      },
      {
        title: 'Section 7: Staff Hygiene & Training',
        questions: [
          'Staff wearing clean uniform, hairnets, and PPE as required.',
          'Handwashing technique followed correctly.',
          'Food hygiene training in date for all staff.',
          'Staff aware of residents with dementia-related eating risks (choking, distraction).',
        ],
      },
      {
        title: 'Section 8: Pest Control',
        questions: [
          'No signs of pests (droppings, damage, insects).',
          'External doors secured and pest-proof.',
          'Pest control contract in place and up to date.',
          'Pest monitoring stations checked and recorded.',
        ],
      },
      {
        title: 'Section 9: Nutrition & Resident Wellbeing (Dementia-Focused)',
        questions: [
          'Menus reflect resident needs (dementia-friendly choices, visual appeal).',
          'Snacks and fluids accessible throughout the day.',
          'Food presentation appropriate for dementia residents.',
          'Fortification plans followed for residents at risk of malnutrition.',
          'Meal choices documented and communicated with care staff.',
        ],
      },
    ],
  },

  // 7 — Infection Control Quarterly
  {
    name: 'Infection Control',
    description: 'Quarterly infection control audit covering general precautions, specimen handling, waste, laundry, pest control, staff health, food safety, and MRSA management.',
    frequency: 'quarterly',
    sections: [
      {
        title: 'General',
        questions: [
          'General infection control policy in place.',
          'Specific infection prevention procedures in place.',
          'Acceptable personal hygiene standards maintained.',
          'All staff washing hands before, after, and between physical/clinical/care procedures.',
          'All staff using acceptable hand-washing techniques.',
          'All staff covering cuts and skin breaks appropriately.',
          'Disposable towels provided at hand-washing stations.',
          'Liquid soaps provided at hand-washing stations.',
          'Posters/notices displayed by sinks.',
          'Elbow taps in clinical areas.',
          'Isolation facilities available (where required).',
          'Room temperatures within acceptable ranges.',
          'Ventilation adequate.',
          'Cleaning, disinfection, and sterilisation policy in place and adhered to.',
          'Spillage procedures (vomit, blood, urine, excreta) in place and adhered to.',
          'Use of protective clothing policy in place and adhered to.',
          'Sharps handling and disposal policy in place and adhered to.',
          'Action to take upon discovery of infection identified including major outbreak plan.',
          'Clear reporting requirements and record-keeping procedures in place.',
        ],
      },
      {
        title: 'Specimens',
        questions: [
          'Collection, handling, storing, and transportation of specimens policy in place and adhered to.',
          'Specimens correctly labelled.',
          'Specimens correctly sealed and stored.',
          'Staff wash hands before and after handling specimens.',
        ],
      },
      {
        title: 'Waste',
        questions: [
          'Suitable waste bags provided.',
          'Bagging procedures in place and adhered to.',
          'Waste appropriately segregated.',
          'Staff wash hands after handling waste.',
        ],
      },
      {
        title: 'Laundry',
        questions: [
          'Laundry facilities provided and clean.',
          'Correct bags provided and used.',
          'Bag capacity adequate.',
          'Laundry effectively segregated (dirty vs clean).',
          'Transportation of laundry managed safely.',
        ],
      },
      {
        title: 'Pest Control',
        questions: [
          'Food leftovers cleared promptly.',
          'Access to food areas prevented for pests.',
          'Pest-proof containers used for food storage.',
          'Food covered when not in use.',
          'Food stored above ground level.',
          'Drains protected.',
          'Premises free from droppings or evidence of pests.',
          'Fabric of building maintained to prevent pest entry.',
        ],
      },
      {
        title: 'Staff Health',
        questions: [
          'Screening and immunisation of staff in place.',
          'Early detection, treatment, and follow-up of infectious diseases among staff.',
          'Infected staff off work until safe to return.',
          'Occupational health advice available and followed.',
        ],
      },
      {
        title: 'Food Safety & Hygiene',
        questions: [
          'Reliable food suppliers used.',
          'Acceptable standards for food preparation maintained.',
          'Acceptable standards for cooking of food maintained.',
          'Acceptable standards for cooling food maintained.',
          'Acceptable standards for storing food maintained.',
          'Acceptable standards for serving food maintained.',
          'Adequate washing-up procedures in place.',
          'Training in infection control for cooks and food handlers up to date.',
          'Transport and delivery of food to and around the home managed safely.',
          'Catering and food storage areas cleaned appropriately.',
          'Food preparation surfaces and equipment cleaned and sanitised.',
        ],
      },
      {
        title: 'MRSA',
        questions: [
          'MRSA policy in place.',
          'Records in notes of service users known to be infected.',
          'Procedures in place for high-risk skin conditions.',
          'Procedures in place for pressure sores.',
          'Procedures in place for post-operative wounds.',
          'Procedures in place for indwelling intravascular lines.',
          'Procedures in place for catheters.',
        ],
      },
    ],
  },

  // 8 — GDPR Audit Checklist
  {
    name: 'GDPR Audit Checklist',
    description: 'Periodic audit of GDPR compliance covering data responsibilities, consent, security, accuracy, staff training, and subject access rights.',
    frequency: 'periodic',
    sections: [
      {
        title: 'GDPR Compliance',
        questions: [
          'As a manager, am I aware of my responsibilities as a DPO under GDPR?',
          'Do I really need this information about an individual?',
          'Do I know what it is going to be used for?',
          'Are people whose information I hold aware I have it, and likely to understand what it will be used for?',
          'Are people aware of their data protection rights?',
          'Am I satisfied the information is being held securely, whether on paper or computer?',
          'Is our website secure?',
          'Am I sure the personal information is accurate and up to date?',
          'Do I delete/destroy personal information as soon as I have no more need for it, in line with retention legislation?',
          'Is access to personal information limited only to those with a strict need to know?',
          'If I want to put staff details on the website, have I consulted with them?',
          'If I want to monitor staff (e.g. by checking email use), have I told them and explained why?',
          'Have I trained my staff in their duties and responsibilities under GDPR, and are they putting them into practice?',
          'Am I and my staff clear when GDPR allows personal information to be passed on?',
          'Would I know what to do if a service user or employee asks for a copy of the information I hold on them?',
          'Do I have a policy for dealing with data protection issues?',
          'Do I need to notify the Information Commissioner?',
          'If I have already notified, is my notification up to date, or does it need removing or amending?',
        ],
      },
    ],
  },

  // 9 — Fire Marshall Checklist
  {
    name: 'Fire Marshall Checklist',
    description: 'Daily fire safety checklist completed by the fire marshall covering the fire panel, exits, doors, extinguishers, combustibles, hazards, signage, and emergency lighting.',
    frequency: 'daily',
    sections: [
      {
        title: 'Fire Safety Checks',
        questions: [
          'Fire panel functioning and showing normal.',
          'All fire exits and routes are clear from obstruction.',
          'All fire doors with automatic closing mechanism close fully without staff intervention.',
          'All fire extinguishers are sealed, visible, and in good working condition.',
          'Fire blanket in the kitchen area.',
          'Tumble dryer checked for fluff build-up.',
          'Walk round inside: no combustible materials near possible ignition sources.',
          'Walk round outside: no combustible materials near possible ignition sources.',
          'Staff aware of procedure in the event of a fire.',
          'Fire marshall jacket is in the office.',
          'Fire call points are intact.',
          'No trip hazards inside the premises.',
          'All exit signs are in good condition and undamaged.',
          'All emergency lighting working correctly.',
          'Visitors logbook updated.',
        ],
      },
    ],
  },

  // 10 — Fire Drill Record Form
  {
    name: 'Fire Drill Record Form',
    description: 'Quarterly fire drill record capturing drill details, staff response observations, issues identified, and actions required.',
    frequency: 'quarterly',
    sections: [
      {
        title: 'Drill Details & Outcomes',
        questions: [
          { text: 'Fire alarm panel checked during drill.', type: 'yes_no' },
          { text: '999 call simulated.', type: 'yes_no' },
          { text: 'Fire & Rescue Service meeting point identified.', type: 'yes_no' },
          { text: 'Drill completed successfully.', type: 'yes_no' },
          { text: 'Observations (staff response, communication, knowledge, use of equipment).', type: 'free_text' },
          { text: 'Issues identified during the drill.', type: 'free_text' },
          { text: 'Actions required following the drill.', type: 'free_text' },
        ],
      },
    ],
  },

  // 11 — Accident & Incident Book Audit Monthly
  {
    name: 'Accident & Incident Book Audit',
    description: 'Monthly audit of the accident and incident book covering record quality, regulatory compliance (CQC, RIDDOR, HSE), and follow-up actions.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: Quality of Records Check',
        defaultType: 'yes_no_na',
        questions: [
          'All incidents logged in the accident/incident book.',
          'Entries are complete, accurate, and legible.',
          'Time, date, and location recorded.',
          'Witness statements included where appropriate.',
          'Staff signatures present.',
        ],
      },
      {
        title: 'Section 2: Regulatory Compliance (CQC, RIDDOR, HSE)',
        defaultType: 'yes_no_na',
        questions: [
          'RIDDOR incidents identified correctly.',
          'RIDDOR reports sent within required timeframe.',
          'Notifiable incidents reported to CQC.',
        ],
      },
      {
        title: 'Section 3: Follow-Up Actions & Care Plan',
        defaultType: 'yes_no_na',
        questions: [
          'Care plan amended to reflect new risks.',
          'GP/paramedic notified if required.',
          'Family informed.',
          'Equipment checked (hoists, bedrails, flooring, lighting).',
        ],
      },
    ],
  },

  // 12 — Accident & Incident Book Analysis Monthly
  {
    name: 'Accident & Incident Book Analysis',
    description: 'Monthly analysis of accident and incident data including trend analysis by time and location, and dementia-specific incident review.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: Monthly Summary (Incident Counts)',
        defaultType: 'findings',
        questions: [
          'Total incidents — number this month, number last month, % change.',
          'Falls (witnessed) — number this month vs last month.',
          'Falls (unwitnessed) — number this month vs last month.',
          'Challenging/distressed behaviour incidents — this month vs last month.',
          'Medication errors — this month vs last month.',
          'Skin tears/bruising incidents — this month vs last month.',
          'Choking/near miss incidents — this month vs last month.',
          'Environmental accidents (slips/trips) — this month vs last month.',
          'Hospital admissions — this month vs last month.',
          'Safeguarding alerts — this month vs last month.',
          'Equipment-related incidents (hoists, bedrails, flooring, lighting) — this month vs last month.',
        ],
      },
      {
        title: 'Section 2: Trend Analysis',
        defaultType: 'findings',
        questions: [
          'Morning incidents — count and comments.',
          'Afternoon incidents — count and comments.',
          'Evening incidents — count and comments.',
          'Night incidents — count and comments.',
          'Bedroom hotspot — count and comments.',
          'Lounge hotspot — count and comments.',
          'Dining room hotspot — count and comments.',
          'Corridor hotspot — count and comments.',
          'Garden/outdoors hotspot — count and comments.',
          'Residents with repeated incidents this month (list names/room numbers and frequency).',
        ],
      },
      {
        title: 'Section 3: Dementia-Specific Analysis',
        defaultType: 'yes_no_na',
        questions: [
          'Incident linked to confusion, wandering, or exit-seeking.',
          'Behavioural triggers identified (pain, noise, overstimulation).',
          'ABC or behaviour chart completed (if applicable).',
          'Environmental adjustments made (lighting, signs, clutter).',
          'Staff used dementia-appropriate communication.',
        ],
      },
    ],
  },
]

export const DEFAULT_AUDIT_RECOMMENDATIONS_PROMPT = `You are a senior care quality consultant with deep expertise in UK care home regulation, CQC inspection frameworks, and best-practice governance for registered care settings.

You have been given the results of a completed {{audit_name}} audit for {{organisation_name}}, conducted by {{auditor_name}} ({{auditor_role}}) on {{audit_date}}.

───────────────────────────────────────────────────
AUDIT RESULTS
───────────────────────────────────────────────────
{{audit_results}}

───────────────────────────────────────────────────
AUDITOR'S SUMMARY
───────────────────────────────────────────────────
Strengths identified: {{strengths}}
Areas requiring improvement: {{improvements}}
Target completion date for actions: {{actions_deadline}}

───────────────────────────────────────────────────
YOUR TASK
───────────────────────────────────────────────────
Analyse the audit results above and produce a structured, actionable improvement report using the exact section headings and guidance below. Every recommendation must be:
- Grounded in the specific audit evidence provided (quote or paraphrase specific answers where relevant)
- Practical and achievable for a UK care home team
- Referenced to the relevant CQC Key Line of Enquiry (KLOE) or Fundamental Standard where applicable

Interpret answer formats as follows:
- YES answers indicate good practice; NO answers indicate a gap requiring action
- N/A answers indicate the question does not apply; do not flag these as failures
- "Findings:" entries contain the auditor's written observations; "Actions & Timescales:" contain planned corrective steps — assess whether the planned actions are sufficient and suggest improvements where not
- Free-text narrative answers should be assessed for completeness and quality

---

## IMMEDIATE ACTIONS REQUIRED
List any NO answers or critical findings that represent a direct risk to resident safety, welfare, or regulatory compliance. For each item: state the specific finding, explain the risk it poses, and recommend a concrete corrective action to be completed within 7 days. If there are no immediate actions required, state "No immediate actions identified — continue monitoring."

## PRIORITY IMPROVEMENTS
Identify the top 3–5 areas where the audit reveals consistent gaps, weak compliance, or insufficient evidence of good practice. For each: name the section or pattern, summarise the evidence from the audit, and provide a specific recommended improvement with an indicative timeframe (within 4 weeks or before next audit cycle). Where findings-type answers have been provided, assess whether the planned actions are sufficiently detailed and escalate any that appear vague.

## CQC KEY LINES OF ENQUIRY — COMPLIANCE ANALYSIS
Map the audit findings to the five CQC KLOEs. For each KLOE that has relevant findings, provide a brief assessment (1–3 sentences) of current compliance strength. Focus only on KLOEs where the audit provides meaningful evidence. Use the labels: **Safe**, **Effective**, **Caring**, **Responsive**, **Well-Led**.

## COMMENDATIONS
Identify 2–4 specific areas where the audit shows strong or exemplary practice. Quote the relevant answers or findings. These should be evidence-based — do not commend areas where the audit provides no supporting evidence.

## NEXT AUDIT CYCLE — RECOMMENDED FOCUS AREAS
Recommend 3–5 specific things the team should focus on before the next audit run, based on the gaps identified. These should be actionable monitoring points, not general advice.

## QUALITY RATING
Provide an overall audit quality rating using the following scale:
- **Outstanding**: Consistently high compliance across all sections, clear evidence of proactive quality improvement
- **Good**: Majority of sections compliant, minor gaps with clear plans in place
- **Requires Improvement**: Multiple gaps, some immediate actions needed, plans present but incomplete
- **Inadequate**: Significant failures, immediate risk to residents, urgent management attention required

State the rating, then give a 2–3 sentence justification citing specific evidence from this audit.

---

Write clearly and professionally. Avoid generic statements that could apply to any care home — every point must be tied to the specific evidence in this audit. Use plain English that a registered manager could share directly with their team.`

// ─── Seed helper ─────────────────────────────────────────────────────────────

async function ensurePlatformTemplatesSeeded() {
  const existing = await (prisma as any).auditTemplate.findMany({
    where:  { is_seed: true, tenant_id: null },
    select: { name: true },
  })
  const existingNames = new Set<string>(existing.map((t: any) => t.name))

  for (const tmpl of PLATFORM_TEMPLATES) {
    if (existingNames.has(tmpl.name)) continue
    await (prisma as any).auditTemplate.create({
      data: {
        name:        tmpl.name,
        description: tmpl.description,
        is_seed:     true,
        frequency:   tmpl.frequency,
        tenant_id:   null,
        sections: {
          create: tmpl.sections.map((s, si) => ({
            title:         s.title,
            section_order: si,
            questions: {
              create: s.questions.map((q, qi) => {
                const text = typeof q === 'string' ? q : q.text
                const type = typeof q === 'object' && q.type ? q.type : (s.defaultType ?? 'yes_no')
                return { question_text: text, question_order: qi, question_type: type }
              }),
            },
          })),
        },
      },
    })
    console.log(`[audits] Seeded platform template: ${tmpl.name}`)
  }
}

// ─── GET /audits/templates ────────────────────────────────────────────────────

auditsRouter.get('/templates', requireAdmin, async (req: Request, res: Response) => {
  await ensurePlatformTemplatesSeeded()
  const tenantId = (req as any).tenantId as string

  const templates = await (prisma as any).auditTemplate.findMany({
    where: {
      is_active: true,
      OR: [{ tenant_id: null }, { tenant_id: tenantId }],
    },
    include: {
      _count: { select: { sections: true } },
      runs:   { where: { tenant_id: tenantId }, orderBy: { audit_month: 'desc' }, take: 1 },
    },
    orderBy: [{ tenant_id: 'asc' }, { name: 'asc' }],
  })

  ok(res, { templates })
})

// ─── POST /audits/templates ───────────────────────────────────────────────────

auditsRouter.post('/templates', requireAdmin, async (req: Request, res: Response) => {
  const tenantId                  = (req as any).tenantId as string
  const { name, description, sections } = req.body

  if (!name?.trim()) return err(res, 'MISSING_NAME', 'Template name is required', 400)
  if (!Array.isArray(sections) || sections.length === 0)
    return err(res, 'MISSING_SECTIONS', 'At least one section is required', 400)

  const template = await (prisma as any).auditTemplate.create({
    data: {
      tenant_id:   tenantId,
      name:        name.trim(),
      description: description?.trim() ?? null,
      sections: {
        create: sections.map((s: any, si: number) => ({
          title:         s.title,
          section_order: si,
          questions: {
            create: (s.questions as string[]).map((q, qi) => ({
              question_text:  q,
              question_order: qi,
              question_type:  'yes_no',
            })),
          },
        })),
      },
    },
    include: { sections: { include: { questions: true } } },
  })

  ok(res, { template }, 201)
})

// ─── GET /audits/runs ─────────────────────────────────────────────────────────

// ─── GET /audits/stats ───────────────────────────────────────────────────────

auditsRouter.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string

  const runs = await (prisma as any).auditRun.findMany({
    where:  { tenant_id: tenantId },
    select: { status: true, completed_at: true, audit_month: true, template: { select: { frequency: true, name: true } } },
  })

  const FREQS = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic'] as const
  const by_frequency: Record<string, { completed: number; in_progress: number; last_completed: string | null }> = {}
  for (const f of FREQS) by_frequency[f] = { completed: 0, in_progress: 0, last_completed: null }

  for (const run of runs) {
    const freq = run.template?.frequency ?? 'monthly'
    if (!by_frequency[freq]) continue
    if (run.status === 'completed') {
      by_frequency[freq].completed++
      const ca = run.completed_at ? new Date(run.completed_at).toISOString() : null
      if (ca && (!by_frequency[freq].last_completed || ca > by_frequency[freq].last_completed!)) {
        by_frequency[freq].last_completed = ca
      }
    } else {
      by_frequency[freq].in_progress++
    }
  }

  ok(res, {
    total:        runs.length,
    completed:    runs.filter((r: any) => r.status === 'completed').length,
    in_progress:  runs.filter((r: any) => r.status !== 'completed').length,
    by_frequency,
  })
})

// ─── GET /audits/runs ─────────────────────────────────────────────────────────

auditsRouter.get('/runs', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string
  const { status, template_id } = req.query

  const where: any = { tenant_id: tenantId }
  if (status)      where.status      = status
  if (template_id) where.template_id = template_id

  const runs = await (prisma as any).auditRun.findMany({
    where,
    include: {
      template: { select: { id: true, name: true } },
      _count:   { select: { answers: true } },
    },
    orderBy: { audit_month: 'desc' },
  })

  ok(res, { runs })
})

// ─── POST /audits/runs ────────────────────────────────────────────────────────

auditsRouter.post('/runs', requireAdmin, async (req: Request, res: Response) => {
  const tenantId                                    = (req as any).tenantId as string
  const { template_id, audit_month, auditor_name, auditor_role } = req.body

  if (!template_id)  return err(res, 'MISSING_TEMPLATE', 'template_id is required', 400)
  if (!audit_month)  return err(res, 'MISSING_MONTH',    'audit_month is required', 400)

  const template = await (prisma as any).auditTemplate.findFirst({
    where: { id: template_id, is_active: true, OR: [{ tenant_id: null }, { tenant_id: tenantId }] },
  })
  if (!template) return err(res, 'NOT_FOUND', 'Audit template not found', 404)

  const monthDate = new Date(audit_month)
  monthDate.setDate(1)
  monthDate.setHours(0, 0, 0, 0)

  const existing = await (prisma as any).auditRun.findFirst({
    where: { tenant_id: tenantId, template_id, audit_month: monthDate },
  })
  if (existing) return ok(res, { run: existing })

  const run = await (prisma as any).auditRun.create({
    data: {
      tenant_id:    tenantId,
      template_id,
      audit_month:  monthDate,
      auditor_name: auditor_name?.trim() ?? null,
      auditor_role: auditor_role?.trim() ?? null,
    },
  })

  ok(res, { run }, 201)
})

// ─── GET /audits/runs/:id ─────────────────────────────────────────────────────

auditsRouter.get('/runs/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string

  const run = await (prisma as any).auditRun.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
    include: {
      template: {
        include: {
          sections: {
            orderBy:  { section_order: 'asc' },
            include:  {
              questions: {
                where:   { is_active: true },
                orderBy: { question_order: 'asc' },
              },
            },
          },
        },
      },
      answers: true,
    },
  })

  if (!run) return err(res, 'NOT_FOUND', 'Audit run not found', 404)
  ok(res, { run })
})

// ─── PUT /audits/runs/:id ─────────────────────────────────────────────────────

auditsRouter.put('/runs/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string
  const { auditor_name, auditor_role, strengths, improvements, actions_deadline } = req.body

  const existing = await (prisma as any).auditRun.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })
  if (!existing) return err(res, 'NOT_FOUND', 'Audit run not found', 404)

  const run = await (prisma as any).auditRun.update({
    where: { id: req.params.id },
    data: {
      ...(auditor_name      !== undefined && { auditor_name:    auditor_name?.trim() ?? null }),
      ...(auditor_role      !== undefined && { auditor_role:    auditor_role?.trim() ?? null }),
      ...(strengths         !== undefined && { strengths }),
      ...(improvements      !== undefined && { improvements }),
      ...(actions_deadline  !== undefined && { actions_deadline }),
    },
  })

  ok(res, { run })
})

// ─── POST /audits/runs/:id/answers ───────────────────────────────────────────

auditsRouter.post('/runs/:id/answers', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string
  const { answers } = req.body  // Array<{ question_id, answer_yn?, outcome_text?, actions_text? }>

  if (!Array.isArray(answers) || answers.length === 0)
    return err(res, 'MISSING_ANSWERS', 'answers array is required', 400)

  const run = await (prisma as any).auditRun.findFirst({
    where: { id: req.params.id, tenant_id: tenantId, status: 'in_progress' },
  })
  if (!run) return err(res, 'NOT_FOUND', 'In-progress audit run not found', 404)

  // Upsert each answer
  for (const a of answers) {
    await (prisma as any).auditAnswer.upsert({
      where:  { run_id_question_id: { run_id: run.id, question_id: a.question_id } },
      create: {
        run_id:       run.id,
        question_id:  a.question_id,
        answer_yn:    a.answer_yn    ?? null,
        answer_na:    a.answer_na    ?? false,
        outcome_text: a.outcome_text ?? null,
        actions_text: a.actions_text ?? null,
      },
      update: {
        ...(a.answer_yn    !== undefined && { answer_yn:    a.answer_yn }),
        ...(a.answer_na    !== undefined && { answer_na:    a.answer_na }),
        ...(a.outcome_text !== undefined && { outcome_text: a.outcome_text }),
        ...(a.actions_text !== undefined && { actions_text: a.actions_text }),
        answered_at: new Date(),
      },
    })
  }

  ok(res, { saved: answers.length })
})

// ─── POST /audits/runs/:id/complete ──────────────────────────────────────────

auditsRouter.post('/runs/:id/complete', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string

  const run = await (prisma as any).auditRun.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
    include: {
      template: {
        include: {
          sections: {
            orderBy: { section_order: 'asc' },
            include: { questions: { where: { is_active: true }, orderBy: { question_order: 'asc' } } },
          },
        },
      },
      answers: true,
      tenant:  { select: { name: true } },
    },
  })
  if (!run) return err(res, 'NOT_FOUND', 'Audit run not found', 404)

  // Build audit results summary for AI
  const answerMap = new Map<string, any>(run.answers.map((a: any) => [a.question_id, a]))

  const auditResultsText = run.template.sections.map((section: any) => {
    const lines: string[] = [`\n${section.title}:`]
    for (const q of section.questions) {
      const a: any = answerMap.get(q.id)
      if (q.question_type === 'yes_no' || q.question_type === 'yes_no_na') {
        let yn: string
        if (a?.answer_na)            yn = 'N/A'
        else if (a?.answer_yn === true)  yn = 'YES'
        else if (a?.answer_yn === false) yn = 'NO'
        else                             yn = 'NOT ANSWERED'
        lines.push(`  - ${q.question_text}: ${yn}`)
        if (a?.outcome_text) lines.push(`    Outcome: ${a.outcome_text}`)
        if (a?.actions_text) lines.push(`    Actions: ${a.actions_text}`)
      } else {
        lines.push(`  - ${q.question_text}`)
        if (a?.outcome_text) lines.push(`    Findings: ${a.outcome_text}`)
        if (a?.actions_text) lines.push(`    Actions & Timescales: ${a.actions_text}`)
      }
    }
    return lines.join('\n')
  }).join('\n')

  // Fetch AI prompt (with default fallback)
  const promptRecord = await (prisma as any).aiPrompt.findFirst({
    where: { usage: 'audit_recommendations', is_active: true },
    orderBy: { updated_at: 'desc' },
  })
  const promptTemplate = promptRecord?.system_prompt ?? DEFAULT_AUDIT_RECOMMENDATIONS_PROMPT

  const filledPrompt = promptTemplate
    .replace('{{audit_name}}',      run.template.name)
    .replace('{{organisation_name}}', run.tenant.name)
    .replace('{{auditor_name}}',    run.auditor_name ?? 'Unknown')
    .replace('{{auditor_role}}',    run.auditor_role ?? 'Unknown')
    .replace('{{audit_date}}',      new Date(run.audit_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))
    .replace('{{audit_results}}',   auditResultsText)
    .replace('{{strengths}}',       run.strengths ?? 'Not provided')
    .replace('{{improvements}}',    run.improvements ?? 'Not provided')
    .replace('{{actions_deadline}}', run.actions_deadline ?? 'Not specified')

  let recommendations: string
  try {
    recommendations = await callClaude(
      'You are a senior health and safety consultant specialising in UK care home compliance.',
      filledPrompt,
      { maxTokens: 1200 },
    )
  } catch {
    recommendations = 'AI recommendations could not be generated at this time. Please review the audit results manually.'
  }

  const completed = await (prisma as any).auditRun.update({
    where: { id: run.id },
    data:  {
      status:             'completed',
      ai_recommendations: recommendations,
      completed_at:       new Date(),
    },
  })

  ok(res, { run: completed, recommendations })
})

// ─── GET /audits/runs/:id/report ──────────────────────────────────────────────

auditsRouter.get('/runs/:id/report', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).tenantId as string

  const run = await (prisma as any).auditRun.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
    include: {
      template: {
        include: {
          sections: {
            orderBy: { section_order: 'asc' },
            include: { questions: { where: { is_active: true }, orderBy: { question_order: 'asc' } } },
          },
        },
      },
      answers: true,
      tenant:  { select: { name: true } },
    },
  })
  if (!run) return err(res, 'NOT_FOUND', 'Audit run not found', 404)

  const answerMap = new Map<string, any>(run.answers.map((a: any) => [a.question_id, a]))

  const report = {
    organisation:      run.tenant.name,
    audit_name:        run.template.name,
    auditor_name:      run.auditor_name,
    auditor_role:      run.auditor_role,
    audit_month:       run.audit_month,
    status:            run.status,
    completed_at:      run.completed_at,
    strengths:         run.strengths,
    improvements:      run.improvements,
    actions_deadline:  run.actions_deadline,
    ai_recommendations: run.ai_recommendations,
    sections: run.template.sections.map((s: any) => ({
      title:     s.title,
      questions: s.questions.map((q: any) => {
        const a: any = answerMap.get(q.id)
        return {
          id:            q.id,
          question:      q.question_text,
          question_type: q.question_type,
          answer_yn:     a?.answer_yn    ?? null,
          answer_na:     a?.answer_na    ?? false,
          outcome_text:  a?.outcome_text ?? null,
          actions_text:  a?.actions_text ?? null,
        }
      }),
    })),
  }

  ok(res, { report })
})
