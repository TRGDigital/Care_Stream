import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../db/client'
import { requireAdmin, requireAuditAccess, auditTemplateAllowed } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { imageUploadMiddleware } from '../middleware/upload'
import { detectEvidenceType } from '../lib/evidence-file'
import { scanBuffer, scannerConfigured } from '../services/security/malware-scan'
import { uploadAuditEvidence, downloadFile, deleteFile } from '../services/storage/s3'
import { callClaude } from '../services/ai/claude'
import { trackAiAction, checkFeature, PlanLimitError } from '../lib/plan-limits'
import { notifyAdmin } from '../lib/notify'
import { sendAuditUpdateEmail } from '../services/email/outbound'
import { getAuditsDue } from '../services/audits/due'
import { auditApprovalRequired, submitAuditForApproval } from '../services/audits/approval'
import { scoreAuditDomains } from '../services/analytics/readiness'

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
    description: 'CQC inspection-ready RAG summary of family/resident questionnaire results, mapped to the five CQC key questions (Safe, Caring, Effective, Responsive, Well-Led).',
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

  // 12 — Staff Training & Compliance (monthly)
  {
    name: 'Staff Training & Compliance',
    description: 'Monthly review of mandatory and role-specific training, induction and the Care Certificate, supervision, appraisal and competency, and the training and compliance records that underpin a safe, skilled workforce.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: Mandatory Training',
        questions: [
          'Safeguarding adults training is completed and in date for all staff.',
          'Mental Capacity Act and Deprivation of Liberty Safeguards training is completed and in date.',
          'Moving and handling training (theory and practical) is completed and in date.',
          'Fire safety training and evacuation awareness is completed and in date.',
          'Infection prevention and control training is completed and in date.',
          'Health and safety, including COSHH, is completed and in date.',
          'Food hygiene training is completed and in date for relevant staff.',
          'First aid / basic life support cover is in place and in date.',
          'Medication training and annual competency is completed for all staff who administer.',
        ],
      },
      {
        title: 'Section 2: Specialist & Role-Specific Training',
        questions: [
          'Oliver McGowan Mandatory Training on Learning Disability and Autism is completed to the required tier.',
          'Dementia care training is completed for staff supporting people living with dementia.',
          'End of life and palliative care training is completed for relevant staff.',
          'Tissue viability / pressure area care training is completed for care staff.',
          'Nutrition, hydration and dysphagia awareness is completed for relevant staff.',
          'Equality, diversity and human rights training is completed.',
          'Data protection and confidentiality training is completed.',
        ],
      },
      {
        title: 'Section 3: Induction & Care Certificate',
        questions: [
          'New starters have completed a structured induction before working unsupervised.',
          'Care Certificate is on track to complete within 12 weeks for eligible new staff.',
          'Shadowing shifts are recorded for new starters.',
          'Agency staff receive a local induction and their training is verified on arrival.',
        ],
      },
      {
        title: 'Section 4: Supervision, Appraisal & Competency',
        questions: [
          'One-to-one supervisions are held at the frequency set in policy.',
          'Every member of staff has an annual appraisal recorded.',
          'Competency assessments (for example medication and moving and handling) are current.',
          'Reflective practice or learning from incidents is discussed and recorded in supervision.',
        ],
      },
      {
        title: 'Section 5: Records & Compliance',
        questions: [
          'The training matrix is up to date and identifies who is due or overdue.',
          'Renewals for expiring training are booked in advance.',
          'Professional registrations (for example NMC) are checked and in date.',
          'DBS checks are in date and renewed in line with policy.',
          'Right to work documentation is verified and held for all staff.',
          { text: 'Overall training compliance rate and any recurring gaps.', type: 'findings' },
        ],
      },
    ],
  },

  // 13 — Care Plan Review & Update (monthly)
  {
    name: 'Care Plan Review & Update',
    description: 'Monthly audit of care plans and risk assessments for currency, person-centredness, mental capacity and consent, health and wellbeing, and evidence that people and their families are involved and outcomes are recorded.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: Content & Person-Centredness',
        defaultType: 'yes_no_na',
        questions: [
          'The care plan reflects the person’s assessed needs, wishes and preferences.',
          'It records what matters to the person and their life history.',
          'It is written in plain, respectful language about the person, not just tasks.',
          'Communication needs and any Accessible Information Standard requirements are recorded.',
          'Protected characteristics and cultural, religious or spiritual needs are addressed.',
        ],
      },
      {
        title: 'Section 2: Currency & Review',
        defaultType: 'yes_no_na',
        questions: [
          'The care plan has been reviewed within the last month, or sooner after a change of need.',
          'Changes are dated, signed and clearly evidenced.',
          'Previous versions are retained so the history of care is traceable.',
        ],
      },
      {
        title: 'Section 3: Risk Assessments',
        defaultType: 'yes_no_na',
        questions: [
          'Falls risk assessment is current and linked to the care plan.',
          'Skin / pressure area risk (for example Waterlow) is current.',
          'Nutrition and hydration risk (for example MUST) is current.',
          'Moving and handling assessment is current and matches the equipment in use.',
          'Choking / dysphagia risk and any SALT guidance are recorded and followed.',
          'Bedrails, lap belts or other restrictive equipment are risk-assessed.',
        ],
      },
      {
        title: 'Section 4: Consent, Mental Capacity & DoLS',
        defaultType: 'yes_no_na',
        questions: [
          'Consent to care is recorded, or a capacity assessment is in place where consent cannot be given.',
          'Best interests decisions are recorded where the person lacks capacity.',
          'DoLS applications and authorisations are tracked and conditions are being met.',
          'Lasting Power of Attorney or advance decisions are noted and respected.',
        ],
      },
      {
        title: 'Section 5: Health, Wellbeing & Involvement',
        questions: [
          'Weights, and any escalation for weight loss, are recorded.',
          'Continence, skin integrity, oral health and pain are monitored and recorded.',
          'Input from GP, district nurse or other professionals is recorded and acted on.',
          'The person and, where appropriate, their family are involved in the care plan.',
          'Daily records reflect the care plan and evidence the care delivered.',
          { text: 'Care plans sampled this month and any themes found.', type: 'findings' },
        ],
      },
    ],
  },

  // 14 — Daily Medication Audit (daily)
  {
    name: 'Daily Medication Audit',
    description: 'A short daily check of medicines safety covering MAR charts, controlled drugs and stock, storage and temperatures, administration practice, and errors and disposal.',
    frequency: 'daily',
    sections: [
      {
        title: 'Section 1: MAR Charts',
        defaultType: 'yes_no_na',
        questions: [
          'MAR charts have no unexplained gaps or missing signatures for the last 24 hours.',
          'Allergies and sensitivities are clearly recorded on the MAR.',
          'PRN (as required) medicines have a current protocol and administrations are justified.',
          'Handwritten entries and amendments are signed and witnessed.',
          'Time-specific medicines (for example Parkinson’s) were given on time.',
        ],
      },
      {
        title: 'Section 2: Controlled Drugs & Stock',
        defaultType: 'yes_no_na',
        questions: [
          'The controlled drugs register balance matches the physical stock and is witnessed.',
          'The controlled drugs cabinet is secure and compliant.',
          'Stock balances for a sample of medicines reconcile with the MAR.',
        ],
      },
      {
        title: 'Section 3: Storage & Temperature',
        defaultType: 'yes_no_na',
        questions: [
          'Medicines are stored securely and the trolley or room is locked when unattended.',
          'Fridge temperatures are recorded and within the 2 to 8 degrees range.',
          'Room temperature is monitored where required.',
          'No expired or discontinued medicines are in use or storage.',
        ],
      },
      {
        title: 'Section 4: Administration Practice',
        defaultType: 'yes_no_na',
        questions: [
          'Staff observed following the rights of administration (right person, medicine, dose, time and route).',
          'Covert administration, where used, is authorised and supported by a capacity assessment and pharmacist advice.',
          'Self-administration, where in place, is risk-assessed and reviewed.',
          'Thickened fluids and crushed or dispersed medicines follow current guidance.',
        ],
      },
      {
        title: 'Section 5: Errors, Ordering & Disposal',
        questions: [
          { text: 'Any medication errors, near misses or discrepancies in the last 24 hours, and the action taken.', type: 'findings' },
          'Ordering and stock levels are managed so no one has missed a dose through unavailability.',
          'Returns and disposal (including controlled drugs) are recorded correctly.',
          'The homely remedies protocol is in place and followed.',
        ],
      },
    ],
  },

  // 15 — Fluid Intake & Hydration (daily)
  {
    name: 'Fluid Intake & Hydration',
    description: 'A daily hydration audit covering fluid charts, individual targets and risk, and escalation and outcomes for people at risk of dehydration.',
    frequency: 'daily',
    sections: [
      {
        title: 'Section 1: Charts & Recording',
        defaultType: 'yes_no_na',
        questions: [
          'Fluid charts are in place for everyone identified as needing one.',
          'Charts are completed at the time care is given, not written up later.',
          'Intake is totalled at the end of each shift and each day.',
          'Output is recorded where this is part of the person’s plan.',
        ],
      },
      {
        title: 'Section 2: Targets & Risk',
        defaultType: 'yes_no_na',
        questions: [
          'An individual daily fluid target is set and recorded.',
          'People at higher risk are identified (for example dysphagia, dementia, catheter, recent UTI or infection).',
          'Thickened fluids are prepared to the correct consistency in line with SALT guidance.',
          'Drinks and prompts are offered regularly and preferences are respected.',
        ],
      },
      {
        title: 'Section 3: Escalation & Outcomes',
        questions: [
          'Low intake against target is escalated to the nurse in charge or GP.',
          'Signs of dehydration (for example concentrated urine, confusion, dry mouth) are monitored and acted on.',
          'Weights and any linked nutrition (MUST) concerns are considered alongside hydration.',
          { text: 'People below their fluid target today and the action taken.', type: 'findings' },
        ],
      },
    ],
  },

  // 16 — Monthly Governance Review (monthly)
  {
    name: 'Monthly Governance Review',
    description: 'A strategic monthly governance review pulling together incidents, safeguarding and notifications, complaints and feedback, audit and action plans, staffing and training, clinical quality data, and regulatory records for management oversight.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: Incidents, Safeguarding & Notifications',
        questions: [
          'Accidents and incidents are logged and analysed for trends this month.',
          'Safeguarding concerns are referred appropriately and tracked to outcome.',
          'All required CQC statutory notifications have been submitted.',
          'Learning from incidents and safeguarding is shared with the team.',
          { text: 'Key incident, accident and safeguarding themes this month.', type: 'findings' },
        ],
      },
      {
        title: 'Section 2: Complaints & Feedback',
        questions: [
          'Complaints are logged and responded to within the policy timescale.',
          'Complaint themes are analysed and used to improve the service.',
          'Compliments and positive feedback are recorded.',
        ],
      },
      {
        title: 'Section 3: Audit & Action Plans',
        questions: [
          'Scheduled audits for the month have been completed.',
          'Action plans have named owners and target dates.',
          'Overdue actions are escalated and progressed.',
        ],
      },
      {
        title: 'Section 4: Staffing & Training',
        questions: [
          'Staffing levels meet resident dependency and the rota is safe.',
          'Agency and bank usage is monitored and inductions are verified.',
          'Training compliance is on target and gaps are being addressed.',
          'Supervisions and appraisals are on schedule.',
        ],
      },
      {
        title: 'Section 5: Clinical Quality Data',
        questions: [
          { text: 'Falls, pressure ulcers, weight loss, infections and hospital admissions this month, with any trends.', type: 'findings' },
          'DoLS applications and authorisations are up to date and tracked.',
          'Care plan and medication audit outcomes have been reviewed.',
        ],
      },
      {
        title: 'Section 6: Regulatory & Records',
        questions: [
          'Policies due for review this month have been reviewed.',
          'Statement of Purpose and CQC registration details are current.',
          'Required meetings have been held (for example staff, residents and health and safety).',
          'Insurance, servicing and compliance certificates are in date.',
        ],
      },
    ],
  },

  // 17 — Resident Feedback Round (monthly)
  {
    name: 'Resident Feedback Round',
    description: 'A monthly resident feedback round capturing people’s voice on choice and control, dignity and respect, food and environment, activities and social contact, and how the service listens and acts on what people say.',
    frequency: 'monthly',
    sections: [
      {
        title: 'Section 1: Voice, Choice & Control',
        questions: [
          'People are asked about their care and daily routines and feel listened to.',
          'Choices are respected (for example when to get up and go to bed, meals and activities).',
          'People know how to raise a concern or complaint and feel able to.',
          { text: 'What people told us about choice and control this month.', type: 'findings' },
        ],
      },
      {
        title: 'Section 2: Dignity & Respect',
        questions: [
          'Privacy and dignity are respected during care.',
          'People are addressed by their preferred name and treated as individuals.',
          'Support with personal appearance and grooming is provided as people wish.',
          'Cultural, religious and spiritual needs are supported.',
        ],
      },
      {
        title: 'Section 3: Food & Environment',
        questions: [
          'People are satisfied with the food, choice and mealtime experience.',
          'Bedrooms and communal areas are comfortable, clean and homely.',
          'Temperature, noise and lighting suit the people living there.',
        ],
      },
      {
        title: 'Section 4: Activities & Social Contact',
        questions: [
          'Meaningful activities and occupation are offered and reflect people’s interests.',
          'Contact with family, friends and the community is supported.',
          'Boredom, loneliness and isolation are recognised and addressed.',
        ],
      },
      {
        title: 'Section 5: Listening & Acting on Feedback',
        questions: [
          'Residents’ and relatives’ meetings are held and recorded.',
          'There is clear "you said, we did" evidence of acting on feedback.',
          'Survey or feedback results are shared and used to improve the service.',
          { text: 'Actions agreed from this month’s feedback.', type: 'findings' },
        ],
      },
    ],
  },

  // 18 — Single Assessment Framework Review (quarterly)
  {
    name: 'Single Assessment Framework Review',
    description: 'A quarterly self-assessment against the CQC Single Assessment Framework, working through the quality statements under each of the five key questions. For each, record the evidence of how you meet it and any actions. Use this as your strategic CQC readiness review.',
    frequency: 'quarterly',
    sections: [
      {
        title: 'Safe',
        defaultType: 'findings',
        questions: [
          'Learning culture: we learn from safety events and use them to improve.',
          'Safe systems, pathways and transitions: care is safe across services and at points of transition.',
          'Safeguarding: we protect people from abuse and neglect.',
          'Involving people to manage risks: we work with people to understand and manage risks.',
          'Safe environments: the environment and equipment are safe and well maintained.',
          'Safe and effective staffing: we have enough suitably skilled, competent staff.',
          'Infection prevention and control: we assess and manage the risk of infection.',
          'Medicines optimisation: medicines are managed safely and support good outcomes.',
        ],
      },
      {
        title: 'Effective',
        defaultType: 'findings',
        questions: [
          'Assessing needs: we assess needs and review care and treatment.',
          'Delivering evidence-based care and treatment: care follows current best practice.',
          'How staff, teams and services work together: we work well across teams and services.',
          'Supporting people to live healthier lives: we support people to manage their health.',
          'Monitoring and improving outcomes: we monitor outcomes and improve them.',
          'Consent to care and treatment: we get consent and follow the Mental Capacity Act.',
        ],
      },
      {
        title: 'Caring',
        defaultType: 'findings',
        questions: [
          'Kindness, compassion and dignity: we treat people with kindness and respect privacy.',
          'Treating people as individuals: care meets people’s individual needs and preferences.',
          'Independence, choice and control: we promote independence, choice and control.',
          'Responding to people’s immediate needs: we respond promptly to needs, views and wishes.',
          'Workforce wellbeing and enablement: we support and enable our staff.',
        ],
      },
      {
        title: 'Responsive',
        defaultType: 'findings',
        questions: [
          'Person-centred care: care is centred on the person and what matters to them.',
          'Care provision, integration and continuity: care is coordinated and continuous.',
          'Providing information: we give people accessible, tailored information.',
          'Listening to and involving people: we listen, involve people and act on feedback.',
          'Equity in access: everyone can access the care they need.',
          'Equity in experiences and outcomes: we work to reduce inequality in experience and outcomes.',
          'Planning for the future: we support people to plan for important changes, including end of life.',
        ],
      },
      {
        title: 'Well-led',
        defaultType: 'findings',
        questions: [
          'Shared direction and culture: we have a shared vision and a positive culture.',
          'Capable, compassionate and inclusive leaders: leaders have the skills and values to lead well.',
          'Freedom to speak up: staff feel safe and are encouraged to speak up.',
          'Workforce equality, diversity and inclusion: we value and support equality and inclusion.',
          'Governance, management and sustainability: we have clear governance and accountability.',
          'Partnerships and communities: we work in partnership to plan and improve care.',
          'Learning, improvement and innovation: we focus on learning, improvement and innovation.',
          'Environmental sustainability: we consider our environmental impact.',
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
- Referenced to the relevant CQC key question (Safe, Effective, Caring, Responsive, Well-led) or Fundamental Standard where applicable

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

## CQC KEY QUESTIONS — COMPLIANCE ANALYSIS
Map the audit findings to the five CQC key questions. For each key question that has relevant findings, provide a brief assessment (1–3 sentences) of current compliance strength. Focus only on key questions where the audit provides meaningful evidence. Use the labels: **Safe**, **Effective**, **Caring**, **Responsive**, **Well-Led**.

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

FORMATTING RULES
- Use the exact section headings above, each on its own line starting with "## ".
- Use "- " at the start of every list item. Use **bold** only for key terms, the quality rating, and the CQC key-question labels (Safe, Effective, Caring, Responsive, Well-Led).
- Do NOT output any horizontal rules (---), tables, code blocks, or a document title. Start directly with the first "## " heading.
- Keep it tight and scannable — short sentences, no filler, no repetition between sections. A registered manager should be able to read the whole report in about two minutes.

Write clearly and professionally in UK English. Avoid generic statements that could apply to any care home — every point must be tied to the specific evidence in this audit. Use plain English that a registered manager could share directly with their team.`

// ─── Seed helper ─────────────────────────────────────────────────────────────

export async function ensurePlatformTemplatesSeeded() {
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
        subject_scope: auditSubjectScope(tmpl.name),
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

// Templates audited one room/bed at a time (a room must be chosen on Start).
export function isRoomBasedAudit(name: string): boolean {
  return /bedroom/i.test(name ?? '')
}

// What each run of a template is "about": a whole-service audit (none), or one room, resident or
// staff member. Used to seed subject_scope and as a fallback for older rows.
export function auditSubjectScope(name: string): 'none' | 'room' | 'resident' | 'staff' {
  if (/bedroom/i.test(name ?? '')) return 'room'
  if (['Care Plan Review & Update', 'Fluid Intake & Hydration', 'Resident Feedback Round'].includes(name)) return 'resident'
  if (name === 'Staff Training & Compliance') return 'staff'
  return 'none'
}

// A human label for a run's subject, used in the report and the AI recommendations.
export function subjectLabel(scope: string): string {
  return scope === 'resident' ? 'Resident' : scope === 'staff' ? 'Staff member' : scope === 'room' ? 'Room' : ''
}

auditsRouter.get('/templates', requireAuditAccess, async (req: Request, res: Response) => {
  await ensurePlatformTemplatesSeeded()
  const tenantId = req.user!.tenant_id

  const [templates, tenant, staffRows, subjectRows, meRow] = await Promise.all([
    (prisma as any).auditTemplate.findMany({
      where: {
        is_active: true,
        OR: [{ tenant_id: null }, { tenant_id: tenantId }],
      },
      include: {
        _count: { select: { sections: true } },
        runs:   { where: { tenant_id: tenantId }, orderBy: { audit_month: 'desc' }, take: 1 },
      },
      orderBy: [{ tenant_id: 'asc' }, { name: 'asc' }],
    }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { rooms: true, room_count: true } }),
    (prisma as any).user.findMany({ where: { tenant_id: tenantId, name: { not: null } }, select: { name: true, job_role: true }, orderBy: { name: 'asc' } }).catch(() => []),
    (prisma as any).auditRun.findMany({ where: { tenant_id: tenantId, room_number: { not: null } }, select: { template_id: true, room_number: true }, orderBy: { created_at: 'desc' }, take: 400 }).catch(() => []),
    (prisma as any).user.findUnique({ where: { id: req.user!.sub }, select: { name: true, job_role: true } }).catch(() => null),
  ])

  // Room picker options: rooms 1..room_count, plus any custom-named rooms.
  const count   = Math.max(0, Math.min(500, Number(tenant?.room_count) || 0))
  const numbered = Array.from({ length: count }, (_, i) => String(i + 1))
  const custom   = (Array.isArray(tenant?.rooms) ? tenant.rooms : []).filter((r: string) => !numbered.includes(r))
  const rooms    = [...numbered, ...custom]

  // Staff picker options (for staff-scoped audits) and per-template recent subjects (autocomplete
  // for resident-scoped audits).
  const staff = [...new Set((staffRows as any[]).map(u => String(u.name || '').trim()).filter(Boolean))]
  const recentSubjects: Record<string, string[]> = {}
  for (const r of subjectRows as any[]) {
    const v = String(r.room_number || '').trim()
    if (!v) continue
    const list = recentSubjects[r.template_id] ?? (recentSubjects[r.template_id] = [])
    if (!list.includes(v) && list.length < 50) list.push(v)
  }

  let withFlags = (templates as any[]).map(t => {
    const scope = t.subject_scope ?? (isRoomBasedAudit(t.name) ? 'room' : 'none')
    return { ...t, subject_scope: scope, room_based: scope === 'room' }
  })
  // "Staff + Audits" members only see their allocated templates.
  if (req.auditAllowed !== 'all') {
    const allowed = req.auditAllowed as string[]
    withFlags = withFlags.filter(t => allowed.includes(t.id))
  }
  ok(res, { templates: withFlags, rooms, staff, recent_subjects: recentSubjects, me: { name: meRow?.name ?? null, job_role: meRow?.job_role ?? null } })
})

// ─── POST /audits/rooms ───────────────────────────────────────────────────────
// Add a room/bed number to the tenant's list (for the audit room picker).

auditsRouter.post('/rooms', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const room = String(req.body?.room ?? '').trim().slice(0, 40)
  if (!room) return err(res, 'MISSING_ROOM', 'room is required', 400)
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { rooms: true } })
  const rooms: string[] = Array.isArray(tenant?.rooms) ? tenant.rooms : []
  if (!rooms.includes(room)) {
    rooms.push(room)
    await (prisma as any).tenant.update({ where: { id: tenantId }, data: { rooms } })
  }
  ok(res, { rooms })
})

// ─── POST /audits/templates ───────────────────────────────────────────────────

auditsRouter.post('/templates', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  // Building your own audit is an Enterprise feature.
  try { await checkFeature(tenantId, 'has_custom_audits') }
  catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } throw e }
  const { name, description, frequency } = req.body
  if (!name?.trim()) return err(res, 'MISSING_NAME', 'Audit name is required', 400)

  const VALID_TYPES = new Set(['yes_no', 'yes_no_na', 'findings', 'free_text'])
  const normQ = (q: any) => (typeof q === 'string' ? { text: q, type: 'yes_no_na' } : { text: String(q?.text ?? ''), type: VALID_TYPES.has(q?.type) ? q.type : 'yes_no_na' })

  // Accept either a flat `questions` array (wrapped into one section) or explicit `sections`.
  let rawSections: Array<{ title: string; questions: any[] }>
  if (Array.isArray(req.body.sections) && req.body.sections.length) {
    rawSections = req.body.sections.map((s: any) => ({ title: String(s?.title ?? '').trim() || 'Questions', questions: Array.isArray(s?.questions) ? s.questions : [] }))
  } else if (Array.isArray(req.body.questions) && req.body.questions.length) {
    rawSections = [{ title: 'Questions', questions: req.body.questions }]
  } else {
    return err(res, 'MISSING_QUESTIONS', 'Add at least one question', 400)
  }

  // Clean: drop empty question texts; default each question to yes_no_na (Yes/No/N/A + notes).
  const sections = rawSections
    .map(s => ({ title: s.title, questions: s.questions.map(normQ).filter(q => q.text.trim()) }))
    .filter(s => s.questions.length)
  if (!sections.length) return err(res, 'MISSING_QUESTIONS', 'Add at least one question', 400)

  const moduleIds = Array.isArray(req.body.module_ids) ? [...new Set(req.body.module_ids.map(String))].slice(0, 20) : []
  const template = await (prisma as any).auditTemplate.create({
    data: {
      tenant_id:   tenantId,
      name:        name.trim(),
      description: description?.trim() ?? null,
      frequency:   ['daily', 'weekly', 'monthly', 'quarterly', 'periodic'].includes(frequency) ? frequency : 'periodic',
      module_ids:  moduleIds,
      sections: {
        create: sections.map((s, si) => ({
          title:         s.title,
          section_order: si,
          questions: { create: s.questions.map((q, qi) => ({ question_text: q.text.trim(), question_order: qi, question_type: q.type })) },
        })),
      },
    },
    include: { sections: { include: { questions: true } } },
  })
  ok(res, { template }, 201)
})

// ─── PATCH /audits/templates/:id — link/unlink the training modules this audit measures ─
auditsRouter.patch('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  // Linking audits to training (Training Impact) is an Enterprise feature.
  try { await checkFeature(tenantId, 'has_training_impact') }
  catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } throw e }
  const id = String(req.params.id)
  const existing = await (prisma as any).auditTemplate.findFirst({ where: { id, tenant_id: tenantId }, select: { id: true } })
  if (!existing) { err(res, 'NOT_FOUND', 'Audit not found, or it is a shared template that can\'t be edited here.', 404); return }
  const data: any = {}
  if (Array.isArray(req.body.module_ids)) data.module_ids = [...new Set(req.body.module_ids.map(String))].slice(0, 20)
  if (Object.keys(data).length) await (prisma as any).auditTemplate.update({ where: { id }, data })
  ok(res, { updated: true })
})

// ─── DELETE /audits/templates/:id — deactivate a tenant's own custom audit ────
auditsRouter.delete('/templates/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const tpl = await (prisma as any).auditTemplate.findFirst({ where: { id: req.params.id, tenant_id: tenantId } })
  if (!tpl) { err(res, 'NOT_FOUND', 'Audit not found (built-in audits cannot be deleted)', 404); return }
  await (prisma as any).auditTemplate.update({ where: { id: tpl.id }, data: { is_active: false } })
  ok(res, { deleted: true })
})

// ─── GET /audits/runs ─────────────────────────────────────────────────────────

// ─── GET /audits/stats ───────────────────────────────────────────────────────

auditsRouter.get('/stats', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const scopeIds = req.auditAllowed === 'all' ? null : (req.auditAllowed as string[])

  const runs = await (prisma as any).auditRun.findMany({
    where:  { tenant_id: tenantId, ...(scopeIds ? { template_id: { in: scopeIds } } : {}) },
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

  // "Due to start" — same logic as the reminder email / hub badge (scoped for staff).
  const { due } = await getAuditsDue(tenantId, scopeIds ?? undefined)

  const now = new Date()
  const completed_this_month = runs.filter((r: any) =>
    r.status === 'completed' && r.completed_at &&
    new Date(r.completed_at).getUTCFullYear() === now.getUTCFullYear() &&
    new Date(r.completed_at).getUTCMonth() === now.getUTCMonth()
  ).length

  ok(res, {
    total:        runs.length,
    completed:    runs.filter((r: any) => r.status === 'completed').length,
    in_progress:  runs.filter((r: any) => r.status !== 'completed').length,
    due:          due.length,
    due_list:     due,
    completed_this_month,
    by_frequency,
  })
})

// ─── GET /audits/runs ─────────────────────────────────────────────────────────

auditsRouter.get('/runs', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const { status, template_id } = req.query

  const where: any = { tenant_id: tenantId }
  if (status)      where.status      = status
  if (template_id) where.template_id = template_id
  // Scope "Staff + Audits" members to their allocated templates.
  if (req.auditAllowed !== 'all') {
    const allowed = req.auditAllowed as string[]
    if (template_id) { if (!allowed.includes(String(template_id))) return ok(res, { runs: [] }) }
    else where.template_id = { in: allowed }
  }

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

auditsRouter.post('/runs', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId                                    = req.user!.tenant_id
  const { template_id, audit_month, auditor_name, auditor_role, room_number, subject } = req.body

  if (!template_id)  return err(res, 'MISSING_TEMPLATE', 'template_id is required', 400)
  if (!audit_month)  return err(res, 'MISSING_MONTH',    'audit_month is required', 400)
  if (!auditTemplateAllowed(req, template_id)) return err(res, 'FORBIDDEN', 'You are not allocated this audit.', 403)

  const template = await (prisma as any).auditTemplate.findFirst({
    where: { id: template_id, is_active: true, OR: [{ tenant_id: null }, { tenant_id: tenantId }] },
  })
  if (!template) return err(res, 'NOT_FOUND', 'Audit template not found', 404)

  // Scoped audits (a room, a resident, or a staff member) are tracked one subject at a time; the
  // subject value is stored in room_number and the run is unique per subject and period.
  const scope: string = template.subject_scope ?? (isRoomBasedAudit(template.name) ? 'room' : 'none')
  const scoped = scope !== 'none'
  const subjectValue = scoped ? String(subject ?? room_number ?? '').trim().slice(0, 80) : null
  // A resident-scoped audit can also record which room the person is in (optional).
  const subjectRoom = scope === 'resident' ? (String(req.body.subject_room ?? '').trim().slice(0, 40) || null) : null
  if (scoped && !subjectValue) {
    const what = scope === 'resident' ? 'resident' : scope === 'staff' ? 'staff member' : 'room'
    return err(res, 'MISSING_SUBJECT', `Choose the ${what} this audit is for.`, 400)
  }

  // Daily audits are tracked per calendar day (one run per day); all other
  // frequencies are tracked per month. The audit_month column stores the run's
  // period start — today for daily, the first of the month otherwise.
  const periodDate = template.frequency === 'daily' ? new Date() : new Date(audit_month)
  if (template.frequency !== 'daily') periodDate.setDate(1)
  periodDate.setHours(0, 0, 0, 0)

  const existing = await (prisma as any).auditRun.findFirst({
    where: { tenant_id: tenantId, template_id, audit_month: periodDate, ...(scoped ? { room_number: subjectValue } : {}) },
  })
  if (existing) return ok(res, { run: existing })

  // Default the auditor to the signed-in user so every run always carries who did it and their
  // role (the AI recommendations otherwise flag "Unknown" as an accountability gap).
  const me = await (prisma as any).user.findUnique({ where: { id: req.user!.sub }, select: { name: true, job_role: true } }).catch(() => null)

  const run = await (prisma as any).auditRun.create({
    data: {
      tenant_id:    tenantId,
      template_id,
      audit_month:  periodDate,
      auditor_name: (auditor_name?.trim() || me?.name || null),
      auditor_role: (auditor_role?.trim() || me?.job_role || null),
      room_number:  subjectValue,
      subject_room: subjectRoom,
    },
  })

  // Remember typed room names for the room picker (residents and staff are picked elsewhere).
  if (subjectValue && scope === 'room') {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { rooms: true } })
    const rooms: string[] = Array.isArray(t?.rooms) ? t.rooms : []
    if (!rooms.includes(subjectValue)) await (prisma as any).tenant.update({ where: { id: tenantId }, data: { rooms: [...rooms, subjectValue] } }).catch(() => {})
  }

  ok(res, { run }, 201)
})

// ─── GET /audits/runs/:id ─────────────────────────────────────────────────────

auditsRouter.get('/runs/:id', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

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

  if (!run || !auditTemplateAllowed(req, run.template_id)) return err(res, 'NOT_FOUND', 'Audit run not found', 404)

  // Attach any evidence photos (grouped client-side by question_id).
  const evidence = await (prisma as any).auditAnswerEvidence.findMany({
    where:   { run_id: run.id },
    orderBy: { created_at: 'asc' },
    select:  { id: true, question_id: true, file_name: true, file_type: true, size_bytes: true, created_at: true },
  })
  const approval_required = await auditApprovalRequired(tenantId).catch(() => false)
  ok(res, { run: { ...run, evidence }, approval_required })
})

// ─── PUT /audits/runs/:id ─────────────────────────────────────────────────────

auditsRouter.put('/runs/:id', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const { auditor_name, auditor_role, strengths, improvements, actions_deadline } = req.body

  const existing = await (prisma as any).auditRun.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })
  if (!existing || !auditTemplateAllowed(req, existing.template_id)) return err(res, 'NOT_FOUND', 'Audit run not found', 404)

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

auditsRouter.post('/runs/:id/answers', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const { answers } = req.body  // Array<{ question_id, answer_yn?, outcome_text?, actions_text? }>

  if (!Array.isArray(answers) || answers.length === 0)
    return err(res, 'MISSING_ANSWERS', 'answers array is required', 400)

  const run = await (prisma as any).auditRun.findFirst({
    where: { id: req.params.id, tenant_id: tenantId, status: 'in_progress' },
  })
  if (!run || !auditTemplateAllowed(req, run.template_id)) return err(res, 'NOT_FOUND', 'In-progress audit run not found', 404)

  // Upsert all answers in a single transaction — one round-trip, atomic
  // (no half-saved audit state) instead of N sequential awaits.
  await (prisma as any).$transaction(
    answers.map((a: any) =>
      (prisma as any).auditAnswer.upsert({
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
    )
  )

  ok(res, { saved: answers.length })
})

// ─── Audit evidence photos (optional, per question) ──────────────────────────
const SAFE_AUDIT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

// POST /audits/runs/:id/questions/:questionId/evidence — attach one image.
auditsRouter.post('/runs/:id/questions/:questionId/evidence', requireAuditAccess, imageUploadMiddleware, async (req: Request, res: Response) => {
  const tenantId   = req.user!.tenant_id
  const runId      = String(req.params.id)
  const questionId = String(req.params.questionId)
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) { err(res, 'NO_FILE', 'No image was uploaded.', 400); return }

  const run = await (prisma as any).auditRun.findFirst({
    where:  { id: runId, tenant_id: tenantId, status: 'in_progress' },
    select: { id: true, template_id: true },
  })
  if (!run || !auditTemplateAllowed(req, run.template_id)) { err(res, 'NOT_FOUND', 'In-progress audit run not found', 404); return }

  // The question must belong to this run's template.
  const question = await (prisma as any).auditQuestion.findFirst({
    where:  { id: questionId, section: { template_id: run.template_id } },
    select: { id: true },
  })
  if (!question) { err(res, 'NOT_FOUND', 'Question not found on this audit', 404); return }

  const detected = detectEvidenceType(file.buffer)
  if (!detected || !detected.mime.startsWith('image/')) { err(res, 'INVALID_IMAGE', 'That file is not a valid image.', 400); return }

  const scan = await scanBuffer(file.buffer, file.originalname)
  if (scan.status === 'infected') { err(res, 'MALWARE_DETECTED', 'That image failed the malware scan and was not uploaded.', 400); return }
  if (scan.status === 'error' && scannerConfigured()) { err(res, 'SCAN_FAILED', 'The image could not be virus-scanned just now, so it was not uploaded. Please try again.', 503); return }

  const key   = `${randomUUID()}.${detected.ext}`
  const s3Key = await uploadAuditEvidence({ tenantId, runId: run.id, key, buffer: file.buffer, mimeType: detected.mime })
  const ev = await (prisma as any).auditAnswerEvidence.create({
    data: {
      tenant_id: tenantId, run_id: run.id, question_id: questionId, s3_key: s3Key,
      file_name: file.originalname.slice(0, 200), file_type: detected.mime, size_bytes: file.size ?? 0,
      scan_status: scan.status === 'clean' ? 'clean' : 'skipped', uploaded_by: req.user!.sub,
    },
  })
  ok(res, { evidence: { id: ev.id, question_id: ev.question_id, file_name: ev.file_name, file_type: ev.file_type, size_bytes: ev.size_bytes, created_at: ev.created_at } }, 201)
})

// GET /audits/evidence/:id — stream the image (authenticated, tenant-scoped).
auditsRouter.get('/evidence/:id', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const ev = await (prisma as any).auditAnswerEvidence.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
  if (!ev) { err(res, 'NOT_FOUND', 'Evidence not found', 404); return }
  try {
    const buf  = await downloadFile(ev.s3_key)
    const type = SAFE_AUDIT_IMAGE_TYPES.has(ev.file_type) ? ev.file_type : 'application/octet-stream'
    res.setHeader('Content-Type', type)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; object-src 'none'")
    res.setHeader('Cache-Control', 'private, no-store')
    const disposition = type === 'application/octet-stream' ? 'attachment' : 'inline'
    res.setHeader('Content-Disposition', `${disposition}; filename="${String(ev.file_name).replace(/[^a-zA-Z0-9._\- ]/g, '_')}"`)
    res.send(buf)
  } catch (e: any) { err(res, 'DOWNLOAD_FAILED', e?.message ?? 'Could not load image', 500) }
})

// DELETE /audits/evidence/:id — remove an evidence image (only while in progress).
auditsRouter.delete('/evidence/:id', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const ev = await (prisma as any).auditAnswerEvidence.findFirst({
    where:   { id: String(req.params.id), tenant_id: tenantId },
    include: { run: { select: { status: true, template_id: true } } },
  })
  if (!ev || !auditTemplateAllowed(req, ev.run.template_id)) { err(res, 'NOT_FOUND', 'Evidence not found', 404); return }
  if (ev.run.status !== 'in_progress') { err(res, 'LOCKED', 'This audit is completed and its evidence is locked.', 400); return }
  try { await deleteFile(ev.s3_key) } catch { /* best effort — row removal is what matters */ }
  await (prisma as any).auditAnswerEvidence.delete({ where: { id: ev.id } })
  ok(res, { deleted: true })
})

// The 34 CQC Single Assessment Framework quality statements, grouped by key question, as a
// compact reference the model can ground the "CQC compliance" section in (so it names real
// statements instead of guessing). Read live from platform data, so edits there flow through.
const KQ_ORDER = ['safe', 'effective', 'caring', 'responsive', 'well-led'] as const
const KQ_LABEL: Record<string, string> = { safe: 'SAFE', effective: 'EFFECTIVE', caring: 'CARING', responsive: 'RESPONSIVE', 'well-led': 'WELL-LED' }

async function buildQualityStatementsBlock(): Promise<string> {
  const rows = await (prisma as any).qualityStatement.findMany({
    where:   { is_active: true },
    select:  { name: true, key_question: true, we_statement: true, number: true },
    orderBy: [{ key_question: 'asc' }, { number: 'asc' }],
  }).catch(() => [])
  if (!rows.length) return ''
  const byKq = new Map<string, any[]>()
  for (const r of rows) {
    const k = String(r.key_question || '').toLowerCase()
    if (!byKq.has(k)) byKq.set(k, [])
    byKq.get(k)!.push(r)
  }
  const parts: string[] = []
  for (const kq of KQ_ORDER) {
    const list = byKq.get(kq)
    if (!list?.length) continue
    parts.push(KQ_LABEL[kq] ?? kq.toUpperCase())
    for (const r of list) parts.push(`- ${r.name}: ${String(r.we_statement || '').trim()}`)
    parts.push('')
  }
  return parts.join('\n').trim()
}

// Generate the AI recommendations for a completed audit and save them to the run. Extracted so it
// can run either at completion (no approval) OR once the care manager approves (approval workflow).
export async function generateAuditRecommendations(tenantId: string, runId: string): Promise<string> {
  const run = await (prisma as any).auditRun.findFirst({
    where: { id: runId, tenant_id: tenantId },
    include: {
      template: { include: { sections: { orderBy: { section_order: 'asc' }, include: { questions: { where: { is_active: true }, orderBy: { question_order: 'asc' } } } } } },
      answers:  true,
      tenant:   { select: { name: true } },
    },
  })
  if (!run) return ''

  const answerMap = new Map<string, any>(run.answers.map((a: any) => [a.question_id, a]))
  const auditResultsText = run.template.sections.map((section: any) => {
    const lines: string[] = [`\n${section.title}:`]
    for (const q of section.questions) {
      const a: any = answerMap.get(q.id)
      if (q.question_type === 'yes_no' || q.question_type === 'yes_no_na') {
        let yn: string
        if (a?.answer_na)                yn = 'N/A'
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

  const [promptRecord, qsBlock] = await Promise.all([
    (prisma as any).aiPrompt.findUnique({ where: { usage: 'audit_recommendations' } }).catch(() => null),
    buildQualityStatementsBlock(),
  ])
  const promptTemplate = promptRecord?.content ?? DEFAULT_AUDIT_RECOMMENDATIONS_PROMPT
  // For a scoped run (resident / staff / room), name the subject so the recommendations are
  // specific to that person or room rather than the service as a whole.
  const runScope = run.template.subject_scope ?? 'none'
  const auditNameForPrompt = (runScope !== 'none' && run.room_number)
    ? `${run.template.name} for ${subjectLabel(runScope)}: ${run.room_number}${run.subject_room ? ` (Room ${run.subject_room})` : ''}`
    : run.template.name

  let filledPrompt = promptTemplate
    .replace('{{audit_name}}',        auditNameForPrompt)
    .replace('{{organisation_name}}', run.tenant.name)
    .replace('{{auditor_name}}',      run.auditor_name ?? 'Unknown')
    .replace('{{auditor_role}}',      run.auditor_role ?? 'Unknown')
    .replace('{{audit_date}}',        new Date(run.audit_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }))
    .replace('{{audit_results}}',     auditResultsText)
    .replace('{{strengths}}',         run.strengths ?? 'Not provided')
    .replace('{{improvements}}',      run.improvements ?? 'Not provided')
    .replace('{{actions_deadline}}',  run.actions_deadline ?? 'Not specified')
    .replace('{{cqc_quality_statements}}', qsBlock)

  // If the prompt doesn't position the placeholder itself, append the statements + how to use them,
  // so the CQC compliance section is always grounded in the real quality statements.
  if (qsBlock && !promptTemplate.includes('{{cqc_quality_statements}}')) {
    filledPrompt += `\n\nCQC SINGLE ASSESSMENT FRAMEWORK — QUALITY STATEMENTS (reference)\n${qsBlock}\n\nWhen writing the CQC COMPLIANCE NOTES section, link each failed or weak item to the most relevant quality statement above, naming it exactly (for example "Safe environments"). Use only statements from this list and do not invent others.`
  }

  // Score this audit's CQC domains in parallel (feeds the CQC Readiness Score). Never throws.
  const scoresP = scoreAuditDomains(run.template.name, auditResultsText)

  let recommendations: string
  try {
    recommendations = await callClaude('You are a senior health and safety consultant specialising in UK care home compliance.', filledPrompt, { maxTokens: 1200 })
  } catch {
    recommendations = 'AI recommendations could not be generated at this time. Please review the audit results manually.'
  }
  const scores = await scoresP
  await (prisma as any).auditRun.update({ where: { id: runId }, data: { ai_recommendations: recommendations, ...(scores ? { readiness_scores: scores } : {}) } })
  trackAiAction(tenantId, 'audit_recs', runId)
  return recommendations
}

// ─── POST /audits/runs/:id/complete ──────────────────────────────────────────

auditsRouter.post('/runs/:id/complete', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

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
  if (!run || !auditTemplateAllowed(req, run.template_id)) return err(res, 'NOT_FOUND', 'Audit run not found', 404)

  // Backfill the auditor from the person completing it if it wasn't captured at start, so the
  // report always records who carried it out and their role.
  if (!run.auditor_name || !run.auditor_role) {
    const cu = await (prisma as any).user.findUnique({ where: { id: req.user!.sub }, select: { name: true, job_role: true } }).catch(() => null)
    run.auditor_name = run.auditor_name || cu?.name || null
    run.auditor_role = run.auditor_role || cu?.job_role || null
    await (prisma as any).auditRun.update({ where: { id: run.id }, data: { auditor_name: run.auditor_name, auditor_role: run.auditor_role } }).catch(() => {})
  }

  const approvalRequired = await auditApprovalRequired(tenantId).catch(() => false)

  // When manager approval is on, completing just marks it done and sends it to the care manager —
  // fast, with NO AI call. The AI recommendations are generated once the manager approves.
  if (approvalRequired) {
    const completed = await (prisma as any).auditRun.update({
      where: { id: run.id }, data: { status: 'completed', completed_at: new Date() },
    })
    await submitAuditForApproval(tenantId, run.id, run.auditor_name ?? '').catch(e => console.error('[audits/complete] submit for approval:', e))
    completed.approval_status = 'pending_manager'
    completed.submitted_at    = new Date()
    completed.submitted_by    = run.auditor_name ?? null
    ok(res, { run: completed, recommendations: null, approval_required: true })
    return
  }

  // No approval required: generate the recommendations now and finalise.
  const recommendations = await generateAuditRecommendations(tenantId, run.id)
  const completed = await (prisma as any).auditRun.update({
    where: { id: run.id }, data: { status: 'completed', completed_at: new Date() },
  })

  ok(res, { run: completed, recommendations, approval_required: false })

  const orgName = run.tenant?.name ?? ''
  notifyAdmin(run.tenant_id ?? tenantId, 'audit_updates', (email, name) =>
    sendAuditUpdateEmail({
      to:       email,
      name,
      orgName,
      subject:  `Audit completed — ${run.template.name}`,
      bodyHtml: `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
          The <strong>${run.template.name}</strong> audit for <strong>${new Date(run.audit_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong>
          has been completed and AI recommendations have been generated.
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
          Log in to your admin dashboard to view the full report and recommendations.
        </p>`,
    })
  ).catch(e => console.error('[audits/complete] Notify error:', e))
})

// ─── GET /audits/runs/:id/report ──────────────────────────────────────────────

auditsRouter.get('/runs/:id/report', requireAuditAccess, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

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
  if (!run || !auditTemplateAllowed(req, run.template_id)) return err(res, 'NOT_FOUND', 'Audit run not found', 404)

  const answerMap = new Map<string, any>(run.answers.map((a: any) => [a.question_id, a]))

  const report = {
    organisation:      run.tenant.name,
    audit_name:        run.template.name,
    subject:           run.room_number,
    subject_room:      run.subject_room,
    subject_scope:     run.template.subject_scope ?? 'none',
    auditor_name:      run.auditor_name,
    auditor_role:      run.auditor_role,
    audit_month:       run.audit_month,
    status:            run.status,
    completed_at:      run.completed_at,
    approval_status:   run.approval_status,
    submitted_by:      run.submitted_by,
    submitted_at:      run.submitted_at,
    approved_by_name:  run.approved_by_name,
    approved_by_role:  run.approved_by_role,
    approved_at:       run.approved_at,
    approval_note:     run.approval_note,
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
