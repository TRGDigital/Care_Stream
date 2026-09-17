// Built-in audits added to the shared library, written with the full question set: number checks with
// pass ranges, options that count as a fail, ratings, "only ask if" conditions, and the CQC quality
// statement each question evidences (by reference_key; matched to quality_statements when seeded).
//
// Seeded once each by name alongside PLATFORM_TEMPLATES (routes/audits.ts). Once seeded they are edited
// on /platform/audit-seeds like any other built-in audit, never here.

export type LibraryQuestion = {
  key?: string
  text: string
  type?: 'yes_no' | 'yes_no_na' | 'findings' | 'free_text' | 'number' | 'date' | 'choice' | 'multi_choice' | 'rating'
  settings?: Record<string, any>
  show_if?: { key: string; equals: string[] }
  qs?: string
}
export type LibraryTemplate = {
  name: string
  description: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'periodic'
  subject_scope?: 'none' | 'room' | 'resident' | 'staff'
  sections: Array<{ title: string; questions: LibraryQuestion[] }>
}

const yn = (text: string, qs?: string): LibraryQuestion => ({ text, type: 'yes_no_na', qs })
// A screening question ("Were there any falls?"): answered Yes or No, not scored, used to open follow-ups.
const YES_NO = { options: [{ label: 'Yes' }, { label: 'No' }] }

export const AUDIT_LIBRARY: LibraryTemplate[] = [
  {
    name: 'Dementia Care Environment',
    description: 'Checks the environment, signage, orientation cues and daily experience for people living with dementia.',
    frequency: 'quarterly',
    sections: [
      { title: 'Orientation and signage', questions: [
        yn('Signage uses pictures and words, at eye level for residents.', 'safe-environments'),
        yn('Toilet and bathroom doors are a contrasting colour and clearly signed.', 'safe-environments'),
        yn('Clocks and calendars show the correct day, date and time.', 'caring-treating-individuals'),
        yn('Bedroom doors are personalised (photo, name or memory box).', 'caring-treating-individuals'),
      ] },
      { title: 'Environment', questions: [
        yn('Lighting is even, with no dark corners or strong shadows.', 'safe-environments'),
        yn('Flooring has no patterns or shiny areas that could be mistaken for steps or water.', 'safe-environments'),
        yn('There is a safe, accessible outdoor space residents can use freely.', 'caring-independence-choice-control'),
        { key: 'noise', text: 'Noise level in communal areas', type: 'choice', settings: { options: [{ label: 'Calm' }, { label: 'Some background noise' }, { label: 'Loud or distressing', fail: true }] }, qs: 'caring-kindness-compassion-dignity' },
        { text: 'What was causing the noise, and what was done?', type: 'findings', show_if: { key: 'noise', equals: ['Loud or distressing'] } },
      ] },
      { title: 'Daily experience', questions: [
        yn('Meaningful activities or rummage items are available and in use.', 'responsive-person-centred-care'),
        yn('Staff were observed approaching residents from the front and at eye level.', 'caring-kindness-compassion-dignity'),
        yn('Life story information is in the care plan and known to staff asked.', 'responsive-person-centred-care'),
        { text: 'Overall dementia friendliness of the environment', type: 'rating', settings: { max_rating: 5, pass_min: 3 } },
      ] },
    ],
  },
  {
    name: 'Safeguarding Log Review',
    description: 'Reviews safeguarding concerns raised, referrals, notifications and follow-up.',
    frequency: 'monthly',
    sections: [
      { title: 'Concerns this month', questions: [
        { key: 'count', text: 'Number of safeguarding concerns raised this month', type: 'number', settings: { min: 0 } },
        { key: 'any', text: 'Were any safeguarding concerns raised this month?', type: 'choice', settings: YES_NO },
        { text: 'Every concern was logged on the day it was raised.', type: 'yes_no', show_if: { key: 'any', equals: ['Yes'] }, qs: 'safe-safeguarding' },
        { text: 'Referrals were made to the local authority where the threshold was met.', type: 'yes_no_na', show_if: { key: 'any', equals: ['Yes'] }, qs: 'safe-safeguarding' },
        { text: 'CQC was notified without delay where required.', type: 'yes_no_na', show_if: { key: 'any', equals: ['Yes'] }, qs: 'wellled-governance-management-sustainability' },
        { text: 'The person and their representative were involved and kept informed.', type: 'yes_no_na', show_if: { key: 'any', equals: ['Yes'] }, qs: 'safe-involving-people-manage-risks' },
      ] },
      { title: 'Learning and training', questions: [
        yn('Themes or patterns from concerns were reviewed and discussed with the team.', 'safe-learning-culture'),
        yn('All staff have in-date safeguarding training.', 'safe-safeguarding'),
        yn('Staff asked could say how to raise a concern and who the safeguarding lead is.', 'safe-safeguarding'),
        { text: 'Actions agreed from this review', type: 'findings' },
      ] },
    ],
  },
  {
    name: 'Night Shift Walkround',
    description: 'An unannounced check of care, safety and staffing during the night.',
    frequency: 'monthly',
    sections: [
      { title: 'Staffing', questions: [
        { text: 'Number of staff on duty', type: 'number', settings: { min: 1 } },
        yn('Staffing matched the planned rota and dependency tool.', 'safe-effective-staffing'),
        yn('Staff knew who was in charge and how to contact the on-call manager.', 'safe-effective-staffing'),
        yn('Staff were awake, alert and in uniform with ID.'),
      ] },
      { title: 'Care and safety', questions: [
        yn('Residents were comfortable, and night checks were recorded at the planned times.', 'responsive-person-centred-care'),
        yn('Call bells were within reach and answered promptly.', 'caring-immediate-needs'),
        yn('Repositioning was done and recorded for residents who need it.', 'effective-evidence-based-care'),
        yn('Fire exits were clear and doors that should be locked were locked.', 'safe-environments'),
        yn('Medicines were stored securely, and the trolley was locked when unattended.', 'safe-medicines-optimisation'),
        { text: 'Temperature in the lounge', type: 'number', settings: { unit: '°C', min: 18, max: 26 } },
      ] },
      { title: 'Findings', questions: [
        { text: 'Overall impression of the night shift', type: 'rating', settings: { max_rating: 5, pass_min: 3 } },
        { text: 'Observations and feedback given to staff', type: 'findings' },
      ] },
    ],
  },
  {
    name: 'HR Staff Files',
    description: 'Checks a staff member\'s recruitment and employment file is complete, one person at a time.',
    frequency: 'quarterly',
    subject_scope: 'staff',
    sections: [
      { title: 'Recruitment checks', questions: [
        yn('Application form with a full employment history, and gaps explained.', 'safe-effective-staffing'),
        yn('Two references, including one from the most recent care employer.', 'safe-effective-staffing'),
        yn('Enhanced DBS check with the barred list, dated before starting.', 'safe-effective-staffing'),
        yn('Right to work evidence, checked and copied.', 'safe-effective-staffing'),
        yn('Proof of identity and address on file.'),
        { key: 'registered', text: 'Does this role need professional registration (for example NMC)?', type: 'choice', settings: YES_NO },
        { text: 'Registration is current and the expiry date is recorded.', type: 'yes_no', show_if: { key: 'registered', equals: ['Yes'] }, qs: 'safe-effective-staffing' },
      ] },
      { title: 'Employment', questions: [
        yn('Signed contract and job description.'),
        yn('Induction completed and signed off.', 'effective-staff-teams-work-together'),
        { text: 'Date of the last supervision', type: 'date', qs: 'caring-workforce-wellbeing' },
        yn('Annual appraisal completed within the last 12 months.', 'caring-workforce-wellbeing'),
        yn('Mandatory training is in date.', 'safe-effective-staffing'),
      ] },
    ],
  },
  {
    name: 'Premises & Maintenance',
    description: 'Checks the building, grounds, equipment servicing and maintenance records.',
    frequency: 'monthly',
    sections: [
      { title: 'Building and grounds', questions: [
        yn('Paths, car park and entrances are clear, well lit and free from trip hazards.', 'safe-environments'),
        yn('Decoration is in good condition, with no damage to walls, doors or floors.', 'safe-environments'),
        yn('Window restrictors are fitted and working on all windows residents can reach.', 'safe-environments'),
        yn('Radiators and hot surfaces are covered or risk assessed.', 'safe-environments'),
        yn('The building is secure, with visitors signed in.', 'safe-environments'),
      ] },
      { title: 'Servicing and records', questions: [
        yn('Lift serviced and the thorough examination (LOLER) is in date.', 'safe-environments'),
        yn('Hoists and slings inspected every six months (LOLER), with records.', 'safe-environments'),
        yn('Gas safety certificate in date.', 'safe-environments'),
        yn('Electrical installation condition report (EICR) in date.', 'safe-environments'),
        yn('Portable appliance testing up to date.', 'safe-environments'),
        { key: 'repairs', text: 'Are any reported repairs still outstanding after 28 days?', type: 'choice', settings: { options: [{ label: 'Yes', fail: true }, { label: 'No' }] } },
        { text: 'Which repairs are outstanding, and when will they be done?', type: 'findings', show_if: { key: 'repairs', equals: ['Yes'] } },
      ] },
    ],
  },
  {
    name: 'Weekly Medication Stock & Storage',
    description: 'A weekly check of medicines storage, temperatures, controlled drugs and stock.',
    frequency: 'weekly',
    sections: [
      { title: 'Storage', questions: [
        { text: 'Medicines fridge temperature (current)', type: 'number', settings: { unit: '°C', min: 2, max: 8 }, qs: 'safe-medicines-optimisation' },
        { text: 'Medicines room temperature', type: 'number', settings: { unit: '°C', max: 25 }, qs: 'safe-medicines-optimisation' },
        yn('Fridge temperatures were recorded every day this week.', 'safe-medicines-optimisation'),
        yn('The medicines room and trolleys are locked and keys are held by authorised staff.', 'safe-medicines-optimisation'),
      ] },
      { title: 'Controlled drugs', questions: [
        { key: 'cd', text: 'Controlled drug balance check against the register', type: 'choice', settings: { options: [{ label: 'All balances correct' }, { label: 'Discrepancy found', fail: true }, { label: 'No controlled drugs held' }] }, qs: 'safe-medicines-optimisation' },
        { text: 'What was the discrepancy, and who was informed?', type: 'findings', show_if: { key: 'cd', equals: ['Discrepancy found'] } },
        yn('Register entries are signed by two people.', 'safe-medicines-optimisation'),
      ] },
      { title: 'Stock', questions: [
        yn('No out-of-date medicines in stock.', 'safe-medicines-optimisation'),
        yn('Opened liquids, creams and eye drops are dated.', 'safe-medicines-optimisation'),
        yn('Returns are recorded and stored separately until collected.', 'safe-medicines-optimisation'),
        yn('There is enough stock for every resident until the next delivery.', 'safe-medicines-optimisation'),
      ] },
    ],
  },
  {
    name: 'Mealtime Experience',
    description: 'An observation of a mealtime: choice, support, dignity and nutrition.',
    frequency: 'monthly',
    sections: [
      { title: 'Choice and presentation', questions: [
        yn('Residents were offered a choice at the time of the meal, with pictures or plated examples.', 'caring-independence-choice-control'),
        yn('Modified texture meals were presented well and matched each person\'s IDDSI level.', 'effective-evidence-based-care'),
        yn('Drinks were offered throughout the meal.', 'effective-healthier-lives'),
        { text: 'Temperature of the hot main course when served', type: 'number', settings: { unit: '°C', min: 63 } },
      ] },
      { title: 'Support and dignity', questions: [
        yn('Residents who need help were supported at their own pace, with staff seated beside them.', 'caring-kindness-compassion-dignity'),
        yn('Clothing protectors were offered, not assumed.', 'caring-kindness-compassion-dignity'),
        yn('Adapted cutlery and crockery were available for those who need them.', 'caring-independence-choice-control'),
        yn('Staff chatted with residents, and the atmosphere was relaxed.', 'caring-kindness-compassion-dignity'),
        { text: 'Overall mealtime experience', type: 'rating', settings: { max_rating: 5, pass_min: 3 } },
      ] },
      { title: 'Records', questions: [
        yn('Food and fluid charts were completed for residents who need them.', 'effective-monitoring-outcomes'),
        yn('Residents at risk of malnutrition have a current MUST score and plan.', 'effective-assessing-needs'),
      ] },
    ],
  },
  {
    name: 'Falls Prevention & Post-Fall Review',
    description: 'Reviews falls this month, post-fall care and prevention measures.',
    frequency: 'monthly',
    sections: [
      { title: 'Falls this month', questions: [
        { key: 'falls', text: 'Were there any falls this month?', type: 'choice', settings: YES_NO },
        { text: 'Number of falls', type: 'number', settings: { min: 0 }, show_if: { key: 'falls', equals: ['Yes'] } },
        { text: 'Post-fall observations were completed for every fall, including head injury checks.', type: 'yes_no', show_if: { key: 'falls', equals: ['Yes'] }, qs: 'safe-systems-pathways-transitions' },
        { text: 'Families were informed and the incident recorded.', type: 'yes_no', show_if: { key: 'falls', equals: ['Yes'] }, qs: 'safe-learning-culture' },
        { text: 'Falls risk assessments were reviewed after each fall.', type: 'yes_no', show_if: { key: 'falls', equals: ['Yes'] }, qs: 'safe-involving-people-manage-risks' },
        { text: 'Times, places and causes of falls', type: 'multi_choice', show_if: { key: 'falls', equals: ['Yes'] }, settings: { options: [{ label: 'Night time' }, { label: 'Bedroom' }, { label: 'Bathroom' }, { label: 'Communal area' }, { label: 'Unwitnessed' }] } },
      ] },
      { title: 'Prevention', questions: [
        yn('Residents at high risk have sensor mats or equipment in place and working.', 'safe-involving-people-manage-risks'),
        yn('Footwear is well fitting and walking aids are within reach.', 'safe-involving-people-manage-risks'),
        yn('Referrals to the falls team or physiotherapy were made where needed.', 'responsive-provision-integration-continuity'),
        { text: 'Themes and actions from this month\'s falls', type: 'findings' },
      ] },
    ],
  },
  {
    name: 'Pressure Care & Skin Integrity',
    description: 'Checks pressure area care for one resident: assessment, equipment, repositioning and wounds.',
    frequency: 'monthly',
    subject_scope: 'resident',
    sections: [
      { title: 'Assessment', questions: [
        { text: 'Waterlow score', type: 'number', settings: { min: 0 }, qs: 'effective-assessing-needs' },
        yn('Skin integrity assessment reviewed within the last month.', 'effective-assessing-needs'),
        yn('Care plan describes how pressure areas are protected.', 'responsive-person-centred-care'),
      ] },
      { title: 'Equipment and repositioning', questions: [
        yn('Pressure relieving mattress and cushion are in place.', 'effective-evidence-based-care'),
        { text: 'Mattress setting matches the person\'s current weight', type: 'yes_no_na', qs: 'effective-evidence-based-care' },
        yn('Repositioning charts are completed at the planned frequency.', 'effective-evidence-based-care'),
      ] },
      { title: 'Wounds', questions: [
        { key: 'wound', text: 'Does the person have a pressure ulcer or wound?', type: 'choice', settings: YES_NO },
        { text: 'Pressure ulcer category', type: 'choice', show_if: { key: 'wound', equals: ['Yes'] }, settings: { options: [{ label: 'Category 1' }, { label: 'Category 2' }, { label: 'Category 3', fail: true }, { label: 'Category 4', fail: true }, { label: 'Unstageable', fail: true }, { label: 'Not a pressure ulcer' }] } },
        { text: 'Wound care plan and photographs are up to date.', type: 'yes_no', show_if: { key: 'wound', equals: ['Yes'] }, qs: 'effective-monitoring-outcomes' },
        { text: 'Tissue viability or district nurse involved where needed.', type: 'yes_no_na', show_if: { key: 'wound', equals: ['Yes'] }, qs: 'responsive-provision-integration-continuity' },
      ] },
    ],
  },
  {
    name: 'Water Safety & Legionella',
    description: 'Monthly water temperature checks, flushing and Legionella controls.',
    frequency: 'monthly',
    sections: [
      { title: 'Temperatures', questions: [
        { text: 'Hot water at the calorifier outlet', type: 'number', settings: { unit: '°C', min: 60 }, qs: 'safe-environments' },
        { text: 'Hot water at the furthest outlet after one minute', type: 'number', settings: { unit: '°C', min: 50 }, qs: 'safe-environments' },
        { text: 'Hot water at a resident outlet with a mixing valve', type: 'number', settings: { unit: '°C', max: 44 }, qs: 'safe-environments' },
        { text: 'Cold water at the furthest outlet after two minutes', type: 'number', settings: { unit: '°C', max: 20 }, qs: 'safe-environments' },
      ] },
      { title: 'Controls', questions: [
        yn('Little-used outlets were flushed weekly and recorded.', 'safe-environments'),
        yn('Showerheads were descaled and disinfected at the planned frequency.', 'safe-infection-prevention-control'),
        yn('Thermostatic mixing valves were serviced in the last year.', 'safe-environments'),
        yn('The Legionella risk assessment is in date (reviewed within two years).', 'safe-environments'),
      ] },
    ],
  },
  {
    name: 'Laundry',
    description: 'Checks laundry segregation, washing temperatures, equipment and dignity of residents\' clothing.',
    frequency: 'monthly',
    sections: [
      { title: 'Infection control', questions: [
        yn('Clean and dirty areas are kept separate, with a one-way flow.', 'safe-infection-prevention-control'),
        yn('Soiled and infected laundry goes into red water-soluble bags.', 'safe-infection-prevention-control'),
        { text: 'Disinfection wash temperature for soiled linen', type: 'number', settings: { unit: '°C', min: 65 }, qs: 'safe-infection-prevention-control' },
        yn('PPE is available and worn when handling soiled laundry.', 'safe-infection-prevention-control'),
      ] },
      { title: 'Equipment and clothing', questions: [
        yn('Washing machines and dryers are serviced and lint filters cleaned.', 'safe-environments'),
        yn('Residents\' clothes are labelled and returned to the right person.', 'caring-kindness-compassion-dignity'),
        yn('Clothing is ironed or folded and put away with care.', 'caring-kindness-compassion-dignity'),
        yn('There is enough clean linen and towels for every resident.'),
      ] },
    ],
  },
  {
    name: 'Call Bell Response',
    description: 'Tests call bell response times and access to call bells.',
    frequency: 'monthly',
    sections: [
      { title: 'Response times', questions: [
        { text: 'Response time for test call 1 (minutes)', type: 'number', settings: { unit: 'minutes', max: 3 }, qs: 'caring-immediate-needs' },
        { text: 'Response time for test call 2 (minutes)', type: 'number', settings: { unit: 'minutes', max: 3 }, qs: 'caring-immediate-needs' },
        { text: 'Response time for test call 3, at night (minutes)', type: 'number', settings: { unit: 'minutes', max: 3 }, qs: 'caring-immediate-needs' },
      ] },
      { title: 'Access', questions: [
        yn('Call bells were within reach of every resident in their room.', 'safe-involving-people-manage-risks'),
        yn('Residents who cannot use a call bell have an agreed alternative in their care plan.', 'responsive-person-centred-care'),
        yn('Call bells in bathrooms and toilets are working and within reach.', 'safe-environments'),
        { text: 'Residents asked said help comes quickly when they call', type: 'rating', settings: { max_rating: 5, pass_min: 3 }, qs: 'responsive-listening-involving' },
      ] },
    ],
  },
]
