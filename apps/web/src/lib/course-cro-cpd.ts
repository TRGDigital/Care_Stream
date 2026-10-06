// Course page copy for the nine annual refreshers certified by The CPD Certification Service
// (October 2026), in the same shape as the Care Certificate's entry in course-cro.ts. Every moment
// is something the course actually covers (its eight lessons are listed beside each entry), and
// the resources are the official frameworks each course was built on
// (apps/api/src/data/training-authority-links.ts). Site copy rules: no em or en dashes.
import type { CourseCro } from './course-cro'

const SFC_GUIDE = {
  label: 'Skills for Care: statutory and mandatory training guide',
  url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf',
  note: 'What Skills for Care expect every course on this subject to cover, and how often.',
}
const UPDATED = 'October 2026'

export const CPD_COURSE_CRO: Record<string, CourseCro> = {
  // Lessons: why food safety matters, personal hygiene and fitness to work, chilling storage and
  // dates, cooking hot holding cooling reheating, cross contamination, cleaning disinfecting pests,
  // allergens special diets and texture modified food, mealtimes gift food records and reporting.
  'food-hygiene': {
    whoFor: 'Perfect for care workers who prepare, handle or serve food, or help people to eat and drink, in care homes, home care and supported living.',
    benefits: ['Covers allergens, special diets and texture modified food', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'A new starter will be handling food', body: 'Cover personal hygiene, fitness to work and cross contamination before their first shift in the kitchen or at mealtimes.' },
      { title: 'Your annual refresher is due', body: 'About {duration} online, with a certificate for each learner and a dashboard showing who has finished.' },
      { title: 'Someone in your care has an allergy or a modified diet', body: 'Allergens, special diets and texture modified food are covered in their own lesson.' },
      { title: 'An environmental health or CQC visit is coming', body: 'Every learner gets a dated, CPD Certified certificate to show their food hygiene training is current.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'Food Standards Agency: online food safety training', url: 'https://www.food.gov.uk/business-guidance/online-food-safety-training', note: 'The Food Standards Agency’s own free courses, including allergen training.' },
    ],
  },
  // Lessons: what COSHH is, how substances cause harm, pictograms labels and safety data sheets,
  // COSHH assessments and control, using and storing safely, PPE and skin care, body fluids water
  // and medicines, spills exposure and emergencies.
  'coshh-control-of-substances-hazardous-to-health': {
    whoFor: 'Perfect for care, domestic, laundry, kitchen and maintenance staff who use cleaning products or come into contact with body fluids in any care setting.',
    benefits: ['Covers labels, safety data sheets and COSHH assessments', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'You have brought in new cleaning products', body: 'Staff learn to read hazard pictograms, labels and safety data sheets, and to follow your COSHH assessment.' },
      { title: 'Your annual refresher is due', body: 'About {duration} online, with a certificate for each learner and a dashboard showing who has finished.' },
      { title: 'There has been a spill or an exposure', body: 'Covers what to do with spills, splashes and exposure, and how to report it.' },
      { title: 'Domestic and laundry staff need training too', body: 'Written for everyone who handles substances, not just care staff, including body fluids and soiled laundry.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'HSE: COSHH, Control of Substances Hazardous to Health', url: 'https://www.hse.gov.uk/coshh/', note: 'The Health and Safety Executive’s guidance on the COSHH Regulations 2002.' },
    ],
  },
  // Lessons: person centred end of life care, communicating about dying, advance care planning
  // and the law, recognising the last days of life, symptoms and comfort, emotional spiritual and
  // cultural support, families carers and working together, care after death and caring for yourself.
  'end-of-life-palliative-care': {
    whoFor: 'Perfect for care workers who support people at the end of their life in care homes, nursing homes, home care and supported living.',
    benefits: ['Mapped to Tier 2 of the End of Life Care Core Skills Framework', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'Someone in your care is nearing the end of life', body: 'Staff learn to recognise the last days of life and keep the person comfortable, in line with NICE guidance.' },
      { title: 'A family wants to talk about what happens next', body: 'Covers communicating about dying, advance care planning and supporting families and carers.' },
      { title: 'Your annual refresher is due', body: 'About {duration} online, with a certificate for each learner and a dashboard showing who has finished.' },
      { title: 'Your team has been through a death', body: 'Includes care after death and how staff look after their own wellbeing.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'End of Life Care Core Skills Education and Training Framework', url: 'https://www.skillsforhealth.org.uk/content/uploads/2021/01/EoLC-Core-Skills-Training-Framework.pdf', note: 'The national framework this course is mapped to (Tier 2).' },
      { label: 'NICE NG142: end of life care for adults, service delivery', url: 'https://www.nice.org.uk/guidance/ng142', note: 'NICE guidance on delivering end of life care.' },
    ],
  },
  // Lessons: law and principles, confidentiality and the Caldicott Principles, people's rights,
  // sharing safely, recording storing and disposing, fraud scams and cyber security, devices apps
  // and paper records, data breaches.
  'gdpr-data-protection': {
    whoFor: 'Perfect for everyone working in adult social care, and for services completing the Data Security and Protection Toolkit, which expects yearly staff training.',
    benefits: ['Covers UK GDPR, the Caldicott Principles and cyber security', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'Your Data Security and Protection Toolkit is due', body: 'The toolkit expects every member of staff to complete data security training each year. Every learner gets a dated certificate.' },
      { title: 'There has been a data breach or a near miss', body: 'Staff learn to spot a breach, what to do straight away and who to tell.' },
      { title: 'Staff use phones, apps or care software', body: 'Covers devices, apps and paper records, plus fraud, scams and cyber security.' },
      { title: 'Your annual refresher is due', body: 'About {duration} online, with a certificate for each learner and a dashboard showing who has finished.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'NHS England: Data Security and Protection Toolkit', url: 'https://www.dsptoolkit.nhs.uk/', note: 'Where care providers complete their yearly toolkit, including staff training.' },
      { label: 'ICO: guide to the data protection principles', url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/', note: 'The Information Commissioner’s guide to the principles the course is built on.' },
    ],
  },
  // Lessons: law and your responsibilities, risk assessment, common hazards in care settings,
  // hazardous substances, security and lone working, stress violence and wellbeing, accidents and
  // sudden illness, recording and reporting.
  'general-health-and-safety-awareness': {
    whoFor: 'Perfect for everyone working in adult social care, in care homes, people’s own homes, supported living and day services.',
    benefits: ['Covers risk assessment, lone working and RIDDOR reporting', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'A new starter joins your team', body: 'Cover the law, their responsibilities and the common hazards in your setting from day one.' },
      { title: 'Your staff work alone in people’s homes', body: 'Includes security, lone working, stress and violence at work.' },
      { title: 'There has been an accident or a near miss', body: 'Staff learn what to do, how to record it and what must be reported.' },
      { title: 'Your annual refresher is due', body: 'About {duration} online, with a certificate for each learner and a dashboard showing who has finished.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'HSE: health and social care services', url: 'https://www.hse.gov.uk/healthservices/index.htm', note: 'The Health and Safety Executive’s guidance for care providers.' },
    ],
  },
  // Lessons: chain of infection, standard precautions, hand hygiene, PPE, recognising and reporting
  // infection, outbreaks and transmission based precautions, cleaning equipment laundry and spills,
  // waste sharps and exposure incidents.
  'infection-prevention-and-control': {
    whoFor: 'Perfect for care workers in residential and nursing homes, home care, supported living and day services.',
    benefits: ['Built on the national infection prevention and control manual', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'There is an outbreak, or flu season is coming', body: 'Covers recognising and reporting infection, outbreaks and transmission based precautions.' },
      { title: 'Hand hygiene or PPE use needs improving', body: 'Hand hygiene and personal protective equipment each have their own lesson.' },
      { title: 'A CQC inspection is coming', body: 'Every learner gets a dated, CPD Certified certificate, and your dashboard shows who has finished.' },
      { title: 'Your annual refresher is due', body: 'About {duration} online, at their own pace, on any phone or computer.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'NHS England: national infection prevention and control manual', url: 'https://www.england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/', note: 'The national manual this course is built on.' },
    ],
  },
  // Lessons: law guidance and your role, common medicines, consent capacity and covert medication,
  // preparing to administer, administration techniques, recording and monitoring, controlled drugs
  // storage and disposal, errors your limits and seeking advice. Requires an observed practical.
  'medication-administration-and-competency': {
    whoFor: 'Perfect for care workers who support people with their medicines in care homes, home care and supported living.',
    benefits: ['Built on NICE SC1 and NG67 and CQC medicines guidance', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'Your yearly competency check is due', body: 'The knowledge online in about {duration}, then you observe each carer in practice and sign them off.' },
      { title: 'There has been a medication error', body: 'Covers errors, the limits of a carer’s role and when to seek advice.' },
      { title: 'Someone lacks capacity or refuses medicines', body: 'Includes consent, capacity and covert medication, done the right way.' },
      { title: 'CQC asks about your medicines training', body: 'Every learner gets a dated, CPD Certified certificate once you have signed off their practical.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'NICE SC1: managing medicines in care homes', url: 'https://www.nice.org.uk/guidance/sc1', note: 'NICE guidance for care homes on managing medicines.' },
      { label: 'NICE NG67: managing medicines for adults receiving social care in the community', url: 'https://www.nice.org.uk/guidance/ng67', note: 'NICE guidance for home care services.' },
    ],
  },
  // Lessons: what mental health means, common needs, stigma rights and trauma informed care,
  // communicating with someone in distress, physical health loneliness and wellbeing, older people
  // learning disability and neurodivergence, self harm and suicide, working together law safeguarding.
  'mental-health-awareness': {
    whoFor: 'Perfect for everyone working in adult social care who supports people with their mental health and wellbeing.',
    benefits: ['Mapped to Tier 1 of the Mental Health Core Capabilities Framework', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'Someone in your care is in distress', body: 'Staff learn how to communicate with someone in distress and when to get help.' },
      { title: 'You are worried about self harm or suicide', body: 'Covers recognising the signs, what to say and how to keep the person safe.' },
      { title: 'Your team supports people with dementia, a learning disability or autism', body: 'Includes older people, learning disability and neurodivergence.' },
      { title: 'Your annual refresher is due', body: 'About {duration} online, with a certificate for each learner and a dashboard showing who has finished.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'Skills for Health: Mental Health Core Capabilities Framework (2026)', url: 'https://www.skillsforhealth.org.uk/resources/mental-health-core-capabilities-framework/', note: 'The framework this course is mapped to (Tier 1).' },
      { label: 'NHS England: mental health', url: 'https://www.england.nhs.uk/mental-health/', note: 'NHS England’s mental health services and guidance.' },
    ],
  },
  // Lessons: law and guidance, your back and how injuries happen, risk assessment and handling
  // plans, principles of safe handling, moving and positioning with dignity, hoists and slings,
  // other equipment bed rails and falls, your limits and the observed practical.
  'moving-and-handling-of-people': {
    whoFor: 'Perfect for care workers who assist and move people in care homes, nursing homes, home care and supported living.',
    benefits: ['Covers hoists, slings, bed rails and handling plans', 'Taken in your staff’s own language, 60+ to choose from'],
    updated: UPDATED,
    moments: [
      { title: 'Your yearly moving and handling update is due', body: 'The knowledge online in about {duration}, then you observe each carer in practice and sign them off.' },
      { title: 'Someone in your care now needs a hoist', body: 'Covers hoists and slings, handling plans and moving people with dignity.' },
      { title: 'A carer has hurt their back', body: 'Staff learn how back injuries happen and the principles of safe handling.' },
      { title: 'CQC asks about your moving and handling training', body: 'Every learner gets a dated, CPD Certified certificate once you have signed off their practical.' },
    ],
    resources: [
      SFC_GUIDE,
      { label: 'HSE: moving and handling in health and social care', url: 'https://www.hse.gov.uk/healthservices/moving-handling/index.htm', note: 'The Health and Safety Executive’s guidance on moving and handling people.' },
    ],
  },
}
