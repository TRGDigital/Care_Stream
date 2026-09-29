// Infection Prevention and Control Annual Refresher: full course content for CPD submission.
//
// Framework: Skills for Care, Statutory and mandatory training guide for adult
// social care employers (December 2025), infection prevention and control row.
// Its headings (causes and chain of infection; systems and procedures, own role
// and the role of others; personal hygiene including hand hygiene; types and
// correct use of PPE; procedures for managing infection, cleaning, spills and
// clinical waste) are mapped section by section in the timings table. Practice
// content follows NHS England's National infection prevention and control
// manual (NIPCM, version 3, July 2026), whose principles apply in all care
// settings, and the UKHSA and DHSC Infection prevention and control resource
// for adult social care (March 2024). Knowledge only: no observed practical.
//
// Timings total 60 minutes. Applied to the tier='cpd' module by
// scripts/apply-cpd-course.ts; the prebuilt tier is never touched.

import type { CpdCourse } from './cpd-course-types'

export const CPD_IPC: CpdCourse = {
  module_id: '4f49f6d7-0d2a-4485-a96a-2079d46b1e2f',
  name: 'Infection Prevention and Control Annual Refresher',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: false,
  description:
    'Annual infection prevention and control refresher for care workers in residential, nursing, home care, ' +
    'supported living and day services. Built on the Skills for Care statutory and mandatory training guide, NHS ' +
    'England\'s national infection prevention and control manual and the adult social care IPC resource, it covers ' +
    'the chain of infection, standard precautions and your role, hand hygiene, PPE, recognising and reporting ' +
    'infection, outbreaks, cleaning, laundry and spills, waste, sharps and exposure incidents. Eight lessons with ' +
    'scenarios and activities, then a final assessment.',
  entry_requirements:
    'Foundation level. For all care workers and support staff who provide or support care, clean, or handle ' +
    'laundry or waste, in any adult social care setting. No prior qualification is needed. It refreshes existing ' +
    'knowledge and does not replace specialist training for clinical procedures such as catheter or wound care.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check so your learning gain can be measured, and ' +
    'finish with a 32 question assessment with a pass mark of 80%. Skills for Care recommends refreshing infection ' +
    'prevention and control at least every three years; this course is designed to be taken every year.',
  outcomes: [
    'Explain the chain of infection and how everyday care practice breaks each link',
    'Describe the standard infection control precautions and your responsibilities within your workplace\'s systems',
    'Apply the moments, product and technique for hand hygiene, including when soap and water must be used',
    'Select, put on and remove personal protective equipment in the correct order for common care tasks',
    'Recognise signs of infection and of a possible outbreak, and know who to report them to',
    'Apply the correct procedures for cleaning, equipment, laundry, spills, waste, sharps and exposure incidents',
  ],
  key_points: [
    'Infection needs every link in the chain; standard precautions break the links for every person, every time',
    'Clean hands before touching a person, before clean procedures, after body fluid exposure and after touching a person or their surroundings',
    'Use soap and water, not handrub, when hands are soiled or someone has diarrhoea or vomiting',
    'Put PPE on as apron, mask, eye protection, gloves; take it off as gloves, apron, eye protection, mask, then clean your hands',
    'New confusion, falls or not eating can be the first signs of infection in an older person: report them',
    'Two or more linked cases around the same time is a possible outbreak: tell the senior straight away',
    'Waste bags no more than three quarters full, sharps bins closed at the fill line, never recap a needle',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. Causes and chain of infection: how infection spreads', minutes: 5 },
    { part: 'Section 2. Systems and procedures, your role and the role of others: standard precautions', minutes: 5 },
    { part: 'Section 3. Personal hygiene including hand hygiene', minutes: 5 },
    { part: 'Section 4. Types and correct use of personal protective equipment', minutes: 5 },
    { part: 'Section 5. Management of infection: recognising, reporting and respiratory hygiene', minutes: 5 },
    { part: 'Section 6. Management of infection: outbreaks and transmission based precautions', minutes: 5 },
    { part: 'Section 7. Procedures: cleaning, care equipment, laundry and spills', minutes: 5 },
    { part: 'Section 8. Procedures: clinical waste, sharps and exposure incidents', minutes: 4 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'When must you use soap and water instead of alcohol handrub?', options: ['Never, handrub is always better', 'When hands are visibly soiled or someone has diarrhoea or vomiting', 'Only at the start of a shift', 'Only after using the toilet yourself'], correct: 1 },
    { id: 'pc2', text: 'What is the correct first item to remove when taking off PPE?', options: ['Mask', 'Apron', 'Gloves', 'Eye protection'], correct: 2 },
    { id: 'pc3', text: 'An outbreak in a care setting is usually defined as:', options: ['Any single infection', 'Two or more linked cases of the same infection around the same time', 'Ten or more people unwell', 'Any infection that needs antibiotics'], correct: 1 },
    { id: 'pc4', text: 'Which colour bag is typically used for infectious clinical waste in a care home?', options: ['Black', 'Clear', 'Orange', 'Green'], correct: 2 },
    { id: 'pc5', text: 'When should a sharps bin be closed and replaced?', options: ['When it is completely full', 'When it reaches the fill line', 'Once a year', 'When a manager says so'], correct: 1 },
  ],
  sections: [
    {
      heading: 'The chain of infection',
      minutes: 5,
      body:
        'Infections are caused by microorganisms such as bacteria, viruses and fungi. Many live on and in us harmlessly, but some cause illness when they reach the wrong place or the wrong person. The people you support are often more vulnerable: older age, long term conditions, wounds, catheters, some medicines and living closely with others all raise the risk of catching an infection and of it becoming serious.\n\n' +
        'Infection spreads through a chain with six links. There is the infectious agent itself, such as norovirus or flu. There is a reservoir where it lives and multiplies, which can be a person, equipment, the environment, or food and water. There is a way out of that reservoir, such as coughs and sneezes, faeces, vomit, blood or a wound. There is a means of transmission, most often hands, but also equipment, surfaces, droplets in the air and sharps. There is a way in, through the mouth, nose, eyes, broken skin, or an invasive device such as a urinary catheter. And there is a susceptible host, a person whose defences cannot stop it.\n\n' +
        'Remove any one link and the chain breaks. That is what infection prevention and control is: a set of everyday habits, each aimed at a link. Staying off work when you are ill removes a reservoir. Tissues and cough hygiene block a way out. Hand hygiene, the single most effective measure, stops transmission. Covering wounds and caring for catheters properly protect the way in. Vaccination, nutrition and hydration help the host fight back.\n\n' +
        'Infections do not only cause illness. They lead to hospital admissions, falls, confusion and loss of independence, and when antibiotics are used more than they need to be, bacteria become resistant to them. Preventing infection is one of the most important ways you protect the people you support.',
      scenario: {
        situation: 'A colleague says hand gel before and after every contact is "overkill" for Mr Patel, who is fit and well apart from his dementia. He shares a lounge with twelve other residents, two of whom have catheters.',
        prompt: 'How would you explain why it matters?',
        answer: 'The chain of infection does not depend on how well one person looks. Hands carry germs from person to person and from surfaces, and some residents in that lounge have catheters, a direct way in for infection. Cleaning hands at the right moments breaks the transmission link for everyone, including people who carry germs without symptoms. It is a standard precaution because it applies to every person, every time.',
      },
      check: {
        question: 'Which link in the chain of infection does hand hygiene break?',
        options: ['The means of transmission', 'The infectious agent', 'The susceptible host', 'The reservoir'],
        correct: 0,
        explanation: 'Hands are the most common way germs are carried from one person or surface to another. Cleaning them at the right moments breaks the means of transmission.',
      },
      image_prompt: 'A simple circular chain of six linked rings drawn beside a care home lounge scene, with a care worker using hand gel from a wall dispenser, older residents seated in the background.',
      image_alt: 'A care worker cleaning their hands with gel beside an illustrated chain of linked rings',
    },
    {
      heading: 'Standard precautions and your role',
      minutes: 5,
      body:
        'Standard infection control precautions are used by all staff, for everyone, at all times, whether or not an infection is known about, because many people carry germs without symptoms. The national infection prevention and control manual for England sets out ten of them: assessing each person for infection risk and placing them appropriately, hand hygiene, respiratory and cough hygiene, personal protective equipment, safe management of care equipment, safe management of the care environment, safe management of linen, safe management of blood and body fluid spills, safe disposal of waste including sharps, and occupational safety including preventing sharps injuries. The rest of this course works through them.\n\n' +
        'When an infection is known or suspected, transmission based precautions are added on top, never instead. The manual\'s principles apply in all care settings, including care homes and people\'s own homes.\n\n' +
        'Your workplace has systems that turn this into practice: an infection prevention and control policy, cleaning schedules, a named lead for infection control, outbreak plans, and audits. The Health and Social Care Act 2008 code of practice on the prevention and control of infections sets the criteria providers must meet, and Regulation 12 requires care to be safe, including preventing the spread of infection.\n\n' +
        'Everyone has a part. Managers make sure equipment, PPE and training are in place. The infection control lead advises and audits. You follow the procedures on every shift, keep yourself well, and report problems, such as a PPE shortage, a broken hand wash basin or a colleague skipping precautions. Vaccination is part of your role too: flu and COVID-19 vaccines protect you and the people you care for from serious illness.\n\n' +
        'If you are unwell with symptoms of infection, such as diarrhoea, vomiting, fever or a new cough, tell your manager before your shift and follow their advice about staying away from work.',
      scenario: {
        situation: 'You notice the liquid soap dispenser in a shared bathroom has been empty for two days. Staff have been using hand gel after helping residents with personal care there instead.',
        prompt: 'What should you do?',
        answer: 'Report it to the senior on duty so it is refilled straight away, and tell colleagues that gel is not a substitute for soap and water after contact with body fluids. Record it in the way your workplace expects. Reporting faults in the environment is part of your role, because a missing supply breaks a standard precaution for everyone who uses that room.',
      },
      check: {
        question: 'Who should standard infection control precautions be used for?',
        options: ['Only people with a diagnosed infection', 'Only people in isolation', 'Only people who are coughing', 'Everyone, at all times, whether or not an infection is known'],
        correct: 3,
        explanation: 'Many people carry germs without any symptoms, so standard precautions apply to everyone, every time. Extra transmission based precautions are added when an infection is known or suspected.',
      },
      image_prompt: 'A care worker reading a clear infection control policy folder in a care home office, a noticeboard behind with a cleaning schedule, a PPE supply shelf and a vaccination reminder poster without readable words.',
      image_alt: 'A care worker reading the infection control policy beside a noticeboard and a stocked PPE shelf',
    },
    {
      heading: 'Hand hygiene',
      minutes: 5,
      body:
        'Hand hygiene is the most important single measure for preventing infection. It works when it is done at the right moments, with the right product and the right technique.\n\n' +
        'The World Health Organization\'s moments for care in a residential setting are: before touching a person; before a clean or aseptic procedure, where one applies; after exposure to blood or body fluids; and after touching a person or significant contact with their surroundings. Clean your hands also after removing PPE, after using the toilet, between different care tasks for the same person, such as helping them wash and then helping them eat, after cleaning or handling waste, and before and after handling food.\n\n' +
        'Alcohol based handrub is the usual product, as long as hands are not visibly dirty. It must contain at least 60% alcohol. Rub it over every surface of both hands until it has fully evaporated. Use liquid soap and warm running water instead when hands are dirty, soiled or may have touched body fluids, and when caring for someone with diarrhoea or vomiting, because germs such as Clostridioides difficile and norovirus are not destroyed by alcohol. Wet your hands, apply soap, rub every surface of hands and wrists for at least 20 seconds, rinse thoroughly and dry with a disposable paper towel.\n\n' +
        'Technique is where most people go wrong: thumbs, fingertips, the backs of the hands and between the fingers are the most often missed. To make hand hygiene effective, keep nails short and free of varnish or false nails, remove wrist jewellery and watches, keep rings to a plain band, and roll sleeves above the elbow when giving care. Look after your skin with the hand cream your workplace provides, because sore, cracked skin carries more germs and makes hand hygiene painful. Report skin problems to your manager.\n\n' +
        'Handrub is flammable and harmful if swallowed, so where people might drink it, its use is risk assessed.',
      scenario: {
        situation: 'You have just helped Mrs Owen, who has had diarrhoea since last night, back to bed. You are wearing gloves and an apron, and your next task is to take tea to the lounge. There is a handrub dispenser by her door.',
        prompt: 'What should you do?',
        answer: 'Remove your gloves and apron in her room and dispose of them as infectious waste, then wash your hands with liquid soap and warm water for at least 20 seconds and dry them with a paper towel. Handrub is not enough here, because the germs that cause diarrhoea, such as norovirus and Clostridioides difficile, are not killed by alcohol. Only then take the tea to the lounge.',
      },
      check: {
        question: 'Why is soap and water used instead of handrub when caring for someone with diarrhoea?',
        options: ['It is quicker', 'Germs such as norovirus and C. difficile are not destroyed by alcohol', 'Handrub stains uniforms', 'Handrub is only for visitors'],
        correct: 1,
        explanation: 'Alcohol does not reliably kill the germs that commonly cause diarrhoea and vomiting. Washing with soap and water physically removes them from the hands.',
      },
      image_prompt: 'Close view of a care worker washing their hands thoroughly at a clinical hand wash basin, soap lather between the fingers and around the thumbs, a paper towel dispenser and an alcohol handrub dispenser on the wall nearby.',
      image_alt: 'A care worker washing between their fingers and thumbs at a hand basin, with handrub nearby',
    },
    {
      heading: 'Personal protective equipment',
      minutes: 5,
      body:
        'Personal protective equipment protects you and the people you support from germs in blood, body fluids, secretions and excretions. It is the last line of defence, used alongside hand hygiene and the other precautions, never instead of them, and it only works if you choose the right items and put them on and take them off correctly.\n\n' +
        'Gloves are for contact with blood, body fluids, mucous membranes or broken skin, and for handling hazardous products. They are single use: one person, one task, then removed and disposed of, followed by hand hygiene. Polythene gloves are not suitable for personal care. Wearing the same gloves between tasks or between people spreads infection rather than preventing it. Disposable plastic aprons protect your uniform during personal care, when handling dirty laundry and when emptying a commode or catheter bag; change them between people and tasks. A gown is for extensive splashing. A fluid resistant Type IIR surgical mask and eye protection are for when splashing into the face is likely. Regular glasses are not eye protection. Type IIR masks are worn for no more than four hours and replaced when damp or damaged. An FFP3 respirator is used only in the specific situations where airborne protection is needed, and only by staff who have been fit tested for it.\n\n' +
        'Order matters. Clean your hands, then put on the apron or gown, then the mask, then the eye protection, then the gloves. To take PPE off, remove the gloves first, then the apron or gown, then clean your hands, then remove eye protection and then the mask by the straps without touching the front, and clean your hands again. Take PPE off in the person\'s room or at the point of care, not in the corridor, and put it straight into the correct waste stream.',
      scenario: {
        situation: 'You are about to empty Mr Hughes\'s catheter bag, then move straight on to help Mrs Kaur with her breakfast. A colleague suggests keeping the same gloves on to save time, as you will "barely touch anything".',
        prompt: 'What should you do?',
        answer: 'Clean your hands and put on an apron and gloves to empty the catheter bag, because there is a risk of contact with urine. When you have finished, remove the gloves then the apron in his room, dispose of them correctly and clean your hands. Put on a clean apron before helping with breakfast. Gloves worn from one person to another carry germs with them, and Mr Hughes\'s catheter means he is vulnerable too.',
      },
      check: {
        question: 'When taking off PPE after care, what comes off first?',
        options: ['The mask', 'The apron', 'The gloves', 'The eye protection'],
        correct: 2,
        explanation: 'Gloves are the most contaminated item, so they come off first. Then the apron or gown, hand hygiene, then eye protection and mask, and hand hygiene again.',
      },
      image_prompt: 'A care worker at the doorway of a resident bedroom tying a disposable plastic apron with bare hands, no gloves on yet, a closed box of nitrile gloves and a pack of surgical masks waiting on a small PPE trolley beside them.',
      image_alt: 'A care worker putting on a disposable apron at a PPE station outside a bedroom',
    },
    {
      heading: 'Recognising and reporting infection',
      minutes: 5,
      body:
        'You are often the first person to notice that someone is becoming unwell. Early recognition means earlier treatment, and fewer people catching it.\n\n' +
        'Common signs of infection include fever or feeling hot or cold and shivery, a new or worsening cough, shortness of breath, diarrhoea or vomiting, pain or burning when passing urine, a wound that is red, swollen, hot, painful or oozing, and an unexplained rash. In older people and people with dementia the signs can be less obvious. New or worsening confusion, sleepiness, a fall, not eating or drinking, a change in behaviour or being "just not themselves" can be the first and only signs. Record what you see and report it to the senior on duty straight away; do not wait to see if it passes.\n\n' +
        'Sepsis is a life threatening reaction to infection. Signs that need urgent help include slurred speech or new confusion, extreme shivering or muscle pain, passing no urine in a day, severe breathlessness, mottled or bluish skin, or someone saying they feel like they might die. If you see these, escalate immediately using your workplace\'s procedure, which may mean calling 999.\n\n' +
        'Urinary tract infections are often over diagnosed in older people. National guidance advises against using urine dipstick tests to diagnose infection in people over 65, because many older people have bacteria in their urine without being infected. Report the person\'s actual symptoms and let the clinician decide.\n\n' +
        'Respiratory and cough hygiene stops respiratory infections spreading. Cover the nose and mouth with a tissue when coughing or sneezing, or use the crook of the arm if there is no tissue. Put used tissues in a bin straight away and clean your hands. Keep tissues and a bin within reach of people who are coughing, and support people who need help to do this. Good ventilation also helps.',
      scenario: {
        situation: 'Mrs Ahmed, who is usually chatty and eats well, has been sleepy all morning, has left her breakfast and seems muddled about where she is. She has no temperature and says she is fine.',
        prompt: 'What do you do?',
        answer: 'Treat this as a possible sign of infection and report it to the senior on duty now, describing exactly what has changed from her usual self. In older people new confusion, sleepiness and not eating can be the only signs of an infection such as a chest or urinary infection, even without a fever. Record your observations. If she shows any red flag signs of sepsis, such as mottled skin, severe breathlessness or not passing urine, escalate urgently.',
      },
      check: {
        question: 'In an older person, which of these can be the first sign of an infection?',
        options: ['New or worsening confusion', 'A good appetite', 'Sleeping well at night', 'Asking for a cup of tea'],
        correct: 0,
        explanation: 'Older people often do not have the classic signs such as fever. A change from their usual self, such as new confusion, a fall or not eating, can be the first sign and should always be reported.',
      },
      image_prompt: 'A care worker kneeling beside an older woman sitting in an armchair who looks sleepy and unwell, the care worker gently checking on her and holding a notepad, an untouched breakfast tray on a side table.',
      image_alt: 'A care worker gently checking on a sleepy older woman who has left her breakfast untouched',
    },
    {
      heading: 'Outbreaks and transmission based precautions',
      minutes: 5,
      body:
        'An outbreak is two or more linked cases of the same infection, confirmed or suspected, around the same time and associated with the same service. In care settings the most common are norovirus and other causes of diarrhoea and vomiting, flu, COVID-19 and other respiratory infections. Spotting an outbreak early is the most important step, so if you notice two or more people, including staff, with similar symptoms, tell the senior on duty straight away.\n\n' +
        'Your workplace\'s outbreak plan sets out what happens next. The manager will contact the local UK Health Security Agency health protection team for advice, and may inform others, such as the local authority, the GP, visiting professionals, families and any hospital where someone has an appointment. You follow the advice given, which may include extra cleaning, reducing communal activities, cohorting staff so they work with the same group, and changes to visiting.\n\n' +
        'Transmission based precautions are added to standard precautions when an infection is known or suspected. They depend on how the germ spreads. Contact precautions are for infections spread by touch, such as norovirus or C. difficile: gloves and apron for all contact, dedicated equipment where possible, and more frequent cleaning. Droplet precautions are for infections spread by larger droplets from coughs and sneezes, such as flu: add a fluid resistant surgical mask when close to the person. Airborne precautions, for infections carried in the air over longer distances, need specialist advice and FFP3 respirators.\n\n' +
        'Where a person is isolated in their own room, it is to protect others and should be for the shortest time the advice allows. Explain why, keep the door closed if it is safe to, put up a sign that does not reveal their diagnosis, and make sure the person still has company, stimulation, drinks within reach and a way to call for help. Isolation must never become neglect.',
      scenario: {
        situation: 'On a Monday morning you hear that two residents on the same corridor were sick overnight, and a colleague from that corridor has phoned in with diarrhoea.',
        prompt: 'What should you do?',
        answer: 'Tell the senior on duty straight away: three linked cases around the same time is a possible outbreak. Follow contact precautions for the residents affected, with gloves and apron for all contact, soap and water for hand hygiene, and dedicated equipment where possible. Support them to stay in their rooms while they are unwell, with drinks within reach and regular checks. The manager will follow the outbreak plan, including contacting the UKHSA health protection team.',
      },
      check: {
        question: 'Which precaution is added for flu, which spreads in droplets from coughs and sneezes?',
        options: ['Nothing extra is needed', 'Gloves only', 'An FFP3 respirator for every task', 'A fluid resistant surgical mask when close to the person'],
        correct: 3,
        explanation: 'Flu is spread mainly by droplets, so droplet precautions add a fluid resistant surgical mask when you are close to the person, on top of standard precautions.',
      },
      image_prompt: 'A care home corridor with a closed bedroom door showing a plain infection control sign with a hand symbol, a PPE trolley with aprons, gloves and masks outside, and a care worker putting on a surgical mask.',
      image_alt: 'A care worker putting on a mask beside a PPE trolley outside a closed bedroom door with a sign',
    },
    {
      heading: 'Cleaning, care equipment, laundry and spills',
      minutes: 5,
      body:
        'Germs survive on surfaces and equipment, so a clean care environment is a standard precaution. Follow your workplace\'s cleaning schedule, which sets out what is cleaned, how often, with which product and by whom. General purpose detergent and warm water is used for routine cleaning. Disinfectant is used for sanitary fittings, for spills and when there is infection.\n\n' +
        'Colour coded cleaning equipment stops germs moving between areas. The national scheme uses red for bathrooms, toilets and sluices; blue for general areas such as lounges and bedrooms; green for kitchens and food areas; and yellow for isolation rooms. Never take a red cloth or mop into a food area.\n\n' +
        'Reusable care equipment such as hoist slings, commodes, bath chairs, blood pressure cuffs and thermometers is cleaned after every use, following the manufacturer\'s instructions, and stored clean and dry. Single use items are used once and thrown away. If you are not sure who is responsible for cleaning a piece of equipment, ask.\n\n' +
        'Laundry falls into three groups: clean, used, and infectious, meaning used by someone with a known or suspected infection or contaminated with blood or body fluids. Wear an apron to handle used laundry. Do not shake it, and never put it on the floor or on surfaces. Bag it at the bedside. Infectious laundry goes into a water soluble bag, then into an impermeable outer bag, and the water soluble bag goes into the machine unopened, washed separately on a pre-wash or sluice cycle at the highest temperature the fabric allows. Never wash infectious laundry by hand. Keep clean and dirty laundry apart and clean your hands between handling them.\n\n' +
        'Spills of blood and body fluids are cleaned immediately using the spill kit and procedure for the type of spill, wearing gloves and an apron. Chlorine releasing products are used for blood spills, but must never be put directly onto urine, because this can release chlorine gas.',
      scenario: {
        situation: 'In a resident\'s bathroom you find a small pool of urine on the floor beside the toilet. The nearest cleaning trolley has a bottle of chlorine releasing disinfectant and a blue mop.',
        prompt: 'What is the safe way to deal with it?',
        answer: 'Put on gloves and an apron. Do not pour the chlorine releasing product directly onto urine, as it can release chlorine gas. Follow your workplace\'s urine spill procedure: absorb the spill with paper towels or the spill kit granules, dispose of it as waste, then clean the area with detergent and disinfect as the procedure directs. Use the red equipment for a bathroom, not the blue mop. Dispose of your PPE and clean your hands.',
      },
      check: {
        question: 'Why must a chlorine releasing disinfectant never be poured directly onto urine?',
        options: ['It stains the floor', 'It can release chlorine gas', 'It does not work on floors', 'Urine does not carry germs'],
        correct: 1,
        explanation: 'Chlorine releasing agents react with urine and can release harmful chlorine gas. Absorb the urine first and follow the specific urine spill procedure.',
      },
      image_prompt: 'A care worker in gloves and apron wiping down a commode chair with a disposable wipe in a care home bathroom, a colour coded cleaning trolley with red, blue, green and yellow buckets nearby, and a laundry trolley with separate bags.',
      image_alt: 'A care worker cleaning a commode beside a colour coded cleaning trolley and laundry bags',
    },
    {
      heading: 'Waste, sharps and exposure incidents',
      minutes: 4,
      body:
        'Waste is sorted at the point it is produced, into the right stream, so it is handled safely. In care homes the usual colours are black for general household waste; yellow with a black stripe, often called tiger bags, for offensive waste such as used continence pads from people who are not infectious; orange for infectious waste, such as PPE and dressings from someone with an infection; and yellow for waste contaminated with medicines or chemicals. Your waste contractor may use a different system, so follow your workplace\'s guide. Bins should be foot operated, lidded and lined. Fill bags no more than three quarters full, tie them, and clean your hands after handling waste.\n\n' +
        'Sharps, such as needles and lancets, go straight into a sharps container at the point of use, by the person who used them. Never pass a sharp from hand to hand, and never bend, break, take apart or recap a needle. Use the temporary closure on the container between uses, keep it where it cannot be knocked over, and close and replace it when it reaches the fill line. Nothing except sharps goes in a sharps container, and sharps never go in a waste bag.\n\n' +
        'An exposure incident is when blood or body fluid may have entered your body: a needlestick or other sharps injury, a bite that breaks the skin, or a splash into your eyes, nose or mouth. Act immediately. For a sharps injury or bite, encourage the wound to bleed gently, wash it with soap and running water, do not scrub or suck it, and cover it with a waterproof dressing. For a splash, rinse the eyes, nose or mouth with plenty of water. Then report it straight away to the senior on duty and seek medical advice without delay, through occupational health, your GP or an emergency department, because some treatments work best within hours. Record the incident so it can be investigated.',
      scenario: {
        situation: 'While clearing a tray after a district nurse visit, you find a used insulin needle left uncapped among the dressings packaging. As you pick up the packaging, the needle pricks your finger.',
        prompt: 'What do you do?',
        answer: 'Encourage the wound to bleed gently, wash it under running water with soap without scrubbing, and cover it with a waterproof dressing. Report it to the senior on duty straight away and seek medical advice without delay, as treatment may be time sensitive. Put the needle in a sharps container, never recap it. Record the incident, and the manager will raise the unsafe disposal with the nursing team so it does not happen again.',
      },
      check: {
        question: 'What is the first thing to do after a needlestick injury?',
        options: ['Suck the wound', 'Scrub it hard with a nail brush', 'Encourage it to bleed gently and wash it with soap and running water', 'Finish your task and report it at the end of the shift'],
        correct: 2,
        explanation: 'Gentle bleeding and washing with soap and water is the immediate first aid. Scrubbing or sucking can make it worse. Then report it and seek medical advice straight away.',
      },
      image_prompt: 'A care home sluice room with clearly separated waste bins lined with black, orange and yellow and black striped bags, and a yellow sharps container with an orange lid mounted on a wall bracket, a care worker tying a three quarters full bag.',
      image_alt: 'Colour coded waste bins and a wall mounted sharps container, with a care worker tying a waste bag',
    },
  ],
  activities: [
    {
      id: 'ipc-act-1', type: 'match', after_section: 0,
      title: 'Break the chain',
      instructions: 'Match each link in the chain of infection to an everyday action that breaks it.',
      pairs: [
        { term: 'Reservoir', definition: 'Staying off work when you have diarrhoea and vomiting' },
        { term: 'Way out', definition: 'Covering coughs and sneezes with a tissue' },
        { term: 'Means of transmission', definition: 'Cleaning your hands at the right moments' },
        { term: 'Way in', definition: 'Caring for a urinary catheter correctly' },
        { term: 'Susceptible host', definition: 'Supporting people to have their flu vaccine' },
      ],
    },
    {
      id: 'ipc-act-2', type: 'sort', after_section: 1,
      title: 'Standard or extra?',
      instructions: 'Sort each measure. Is it a standard precaution for everyone, or an extra precaution for a known or suspected infection?',
      bins: [
        { id: 'standard', name: 'Standard precaution', note: 'For everyone, every time' },
        { id: 'extra', name: 'Transmission based precaution', note: 'Added when infection is known or suspected' },
      ],
      items: [
        { text: 'Hand hygiene before touching a person', bin: 'standard' },
        { text: 'Cleaning a commode after every use', bin: 'standard' },
        { text: 'Putting waste in the correct coloured bag', bin: 'standard' },
        { text: 'Caring for someone with norovirus in their own room', bin: 'extra' },
        { text: 'A surgical mask when close to someone with flu', bin: 'extra' },
        { text: 'Dedicated equipment for a person with C. difficile', bin: 'extra' },
      ],
    },
    {
      id: 'ipc-act-3', type: 'order', after_section: 2,
      title: 'Washing your hands',
      instructions: 'Put the steps of washing your hands with soap and water into order.',
      steps: [
        'Remove wrist jewellery and roll sleeves above the elbow',
        'Wet your hands with warm running water',
        'Apply liquid soap',
        'Rub every surface of hands and wrists for at least 20 seconds, including thumbs and fingertips',
        'Rinse thoroughly under running water',
        'Dry with a disposable paper towel and use it to turn off the tap',
      ],
    },
    {
      id: 'ipc-act-4', type: 'order', after_section: 3,
      title: 'Taking off PPE',
      instructions: 'Put the steps for taking off PPE after care into order.',
      steps: [
        'Remove your gloves',
        'Remove your apron or gown',
        'Clean your hands',
        'Remove eye protection',
        'Remove your mask by the straps, without touching the front',
        'Clean your hands again',
      ],
    },
    {
      id: 'ipc-act-5', type: 'sort', after_section: 4,
      title: 'Report now or urgent help?',
      instructions: 'Sort each observation. Should you report it to the senior now, or is it a red flag needing urgent help?',
      bins: [
        { id: 'report', name: 'Report to the senior now', note: 'A possible sign of infection' },
        { id: 'urgent', name: 'Urgent help, possible sepsis', note: 'Escalate immediately' },
      ],
      items: [
        { text: 'New confusion and not eating breakfast', bin: 'report' },
        { text: 'Pain when passing urine', bin: 'report' },
        { text: 'A new cough', bin: 'report' },
        { text: 'Mottled or bluish skin', bin: 'urgent' },
        { text: 'No urine passed all day', bin: 'urgent' },
        { text: 'Severe breathlessness', bin: 'urgent' },
      ],
    },
    {
      id: 'ipc-act-6', type: 'match', after_section: 5,
      title: 'Which precautions?',
      instructions: 'Match each type of transmission based precaution to what it adds.',
      pairs: [
        { term: 'Contact precautions', definition: 'Gloves and apron for all contact, dedicated equipment, extra cleaning' },
        { term: 'Droplet precautions', definition: 'A fluid resistant surgical mask when close to the person' },
        { term: 'Airborne precautions', definition: 'Specialist advice and fit tested FFP3 respirators' },
        { term: 'Outbreak', definition: 'Two or more linked cases around the same time' },
      ],
    },
    {
      id: 'ipc-act-7', type: 'match', after_section: 6,
      title: 'Colour coded cleaning',
      instructions: 'Match each colour of cleaning equipment to where it is used.',
      pairs: [
        { term: 'Red', definition: 'Bathrooms, toilets and sluices' },
        { term: 'Blue', definition: 'General areas such as lounges and bedrooms' },
        { term: 'Green', definition: 'Kitchens and food areas' },
        { term: 'Yellow', definition: 'Isolation rooms' },
      ],
    },
    {
      id: 'ipc-act-8', type: 'sort', after_section: 7,
      title: 'Which waste stream?',
      instructions: 'Sort each item into the waste stream a care home typically uses. Your contractor may differ.',
      bins: [
        { id: 'black', name: 'Black bag', note: 'General household waste' },
        { id: 'tiger', name: 'Yellow and black striped bag', note: 'Offensive, non infectious waste' },
        { id: 'orange', name: 'Orange bag', note: 'Infectious waste' },
        { id: 'sharps', name: 'Sharps container', note: 'Needles and other sharps' },
      ],
      items: [
        { text: 'Newspaper and food packaging from the lounge', bin: 'black' },
        { text: 'A used continence pad from a person with no infection', bin: 'tiger' },
        { text: 'Gloves and apron used caring for someone with norovirus', bin: 'orange' },
        { text: 'A used insulin pen needle', bin: 'sharps' },
        { text: 'A used blood glucose lancet', bin: 'sharps' },
        { text: 'A soiled dressing from an infected wound', bin: 'orange' },
      ],
    },
  ],
  references: [
    { title: 'Statutory and mandatory training guide for adult social care employers (December 2025)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf', source: 'Skills for Care', note: 'The framework this course is mapped to. Its infection prevention and control row sets the expected content, from the chain of infection to spills and clinical waste.' },
    { title: 'National infection prevention and control manual (NIPCM) for England', url: 'https://www.england.nhs.uk/infection-prevention-and-control/nipcm-for-england/', source: 'NHS England', note: 'The national evidence based manual. Its principles apply in all care settings, and it supports providers to meet the code of practice.' },
    { title: 'NIPCM chapter 1: standard infection control precautions', url: 'https://www.england.nhs.uk/infection-prevention-and-control/nipcm-for-england/chapter-1-standard-infection-control-precautions-sicps/', source: 'NHS England', note: 'The ten standard precautions used for everyone, every time. Sections 2 to 4 and 7 to 8 of this course follow it.' },
    { title: 'NIPCM chapter 2: transmission based precautions', url: 'https://www.england.nhs.uk/infection-prevention-and-control/nipcm-for-england/chapter-2-transmission-based-precautions-tbps/', source: 'NHS England', note: 'Contact, droplet and airborne precautions, added when an infection is known or suspected. The basis for section 6.' },
    { title: 'Infection prevention and control: resource for adult social care', url: 'https://www.gov.uk/government/publications/infection-prevention-and-control-in-adult-social-care-settings/infection-prevention-and-control-resource-for-adult-social-care', source: 'UKHSA and DHSC, GOV.UK', note: 'Written for social care. The source for the hand hygiene moments, PPE table, laundry categories, waste colours and outbreak definition in this course.' },
    { title: 'Infection prevention and control: quick guide for care workers', url: 'https://www.gov.uk/government/publications/infection-prevention-and-control-in-adult-social-care-settings/infection-prevention-and-control-quick-guide-for-care-workers', source: 'UKHSA and DHSC, GOV.UK', note: 'A short summary of the same guidance for frontline staff, useful to keep to hand after the course.' },
    { title: 'Health and Social Care Act 2008: code of practice on the prevention and control of infections', url: 'https://www.gov.uk/government/publications/the-health-and-social-care-act-2008-code-of-practice-on-the-prevention-and-control-of-infections-and-related-guidance', source: 'Department of Health and Social Care, GOV.UK', note: 'The criteria registered providers must meet on infection prevention and control, which CQC uses when inspecting.' },
    { title: 'Regulation 12: Safe care and treatment', url: 'https://www.cqc.org.uk/guidance-providers/regulations/regulation-12-safe-care-treatment', source: 'Care Quality Commission', note: 'The regulation that requires providers to assess and prevent the risk of infection spreading.' },
    { title: 'Urinary tract infection: diagnostic tools for primary care', url: 'https://www.gov.uk/government/publications/urinary-tract-infection-diagnosis', source: 'UKHSA, GOV.UK', note: 'Explains why urine dipsticks are not used to diagnose infection in people over 65, and which symptoms matter instead.' },
    { title: 'Sepsis: recognition, diagnosis and early management (NG51)', url: 'https://www.nice.org.uk/guidance/ng51', source: 'NICE', note: 'The national guideline on recognising sepsis early. Use it alongside your workplace\'s escalation tool, such as RESTORE2 or NEWS2.' },
  ],
  glossary: [
    { term: 'Chain of infection', definition: 'The six links an infection needs to spread: agent, reservoir, way out, means of transmission, way in and susceptible host.' },
    { term: 'Standard infection control precautions', definition: 'The ten basic measures used for everyone, at all times, whether or not an infection is known.' },
    { term: 'Transmission based precautions', definition: 'Extra measures added to standard precautions when an infection is known or suspected: contact, droplet or airborne.' },
    { term: 'Outbreak', definition: 'Two or more linked cases of the same infection around the same time, associated with the same service.' },
    { term: 'PPE', definition: 'Personal protective equipment such as gloves, aprons, gowns, masks and eye protection.' },
    { term: 'Type IIR mask', definition: 'A fluid resistant surgical mask, worn when splashing is likely or for droplet precautions, for no more than four hours.' },
    { term: 'FFP3 respirator', definition: 'A close fitting mask that protects against airborne germs. It must be fit tested to the wearer.' },
    { term: 'Sepsis', definition: 'A life threatening reaction to infection that needs urgent medical treatment.' },
    { term: 'Water soluble bag', definition: 'A laundry bag that dissolves in the wash, so infectious laundry goes into the machine without being handled.' },
    { term: 'Offensive waste', definition: 'Non infectious waste that may be unpleasant, such as continence pads, usually in a yellow and black striped bag.' },
    { term: 'Exposure incident', definition: 'A needlestick injury, bite or splash that may let blood or body fluid into your body.' },
    { term: 'Norovirus', definition: 'A common cause of diarrhoea and vomiting outbreaks. It is not reliably killed by alcohol handrub.' },
  ],
  practical_checklist: [],
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. The chain of infection
    { id: 'q1', text: 'How many links are there in the chain of infection?', options: ['Three', 'Four', 'Six', 'Ten'], correct: 2 },
    { id: 'q2', text: 'A urinary catheter is an example of which link in the chain of infection?', options: ['A way in', 'The infectious agent', 'The reservoir', 'A way out'], correct: 0 },
    { id: 'q3', text: 'What happens when one link in the chain of infection is removed?', options: ['Nothing, the other links carry on', 'The chain is broken and the infection cannot spread that way', 'The infection becomes stronger', 'Only the host is affected'], correct: 1 },
    { id: 'q4', text: 'Why are many of the people you support more vulnerable to infection?', options: ['They wash less often', 'They do not take vitamins', 'Age, long term conditions, wounds, devices and some medicines weaken their defences', 'Care settings are always dirty'], correct: 2 },
    // Section 2. Standard precautions and your role
    { id: 'q5', text: 'Standard infection control precautions should be used:', options: ['Only for people with a known infection', 'Only by nurses', 'Only during an outbreak', 'For everyone, at all times'], correct: 3 },
    { id: 'q6', text: 'How many standard infection control precautions does the national manual for England set out?', options: ['Four', 'Six', 'Eight', 'Ten'], correct: 3 },
    { id: 'q7', text: 'You notice the soap dispenser in a shared bathroom is empty. What should you do?', options: ['Report it so it is refilled straight away', 'Use gel instead and say nothing', 'Bring soap from home', 'Stop using that bathroom'], correct: 0 },
    { id: 'q8', text: 'You wake up with vomiting before a shift. What should you do?', options: ['Go in and wear a mask', 'Tell your manager before your shift and follow their advice about staying away', 'Go in but avoid the kitchen', 'Take medicine and go in'], correct: 1 },
    // Section 3. Hand hygiene
    { id: 'q9', text: 'Which is one of the moments for hand hygiene in residential care?', options: ['Only after lunch', 'Only at the end of a shift', 'Before touching a person', 'Only when hands look dirty'], correct: 2 },
    { id: 'q10', text: 'What is the minimum alcohol content for an alcohol based handrub?', options: ['30%', '45%', '60%', '100%'], correct: 2 },
    { id: 'q11', text: 'For how long should you rub your hands with soap when washing them?', options: ['5 seconds', 'At least 20 seconds', 'Until the soap bubbles', 'At least 2 minutes'], correct: 1 },
    { id: 'q12', text: 'Which parts of the hands are most often missed during hand hygiene?', options: ['Palms', 'None, people rarely miss any', 'Wrists only', 'Thumbs, fingertips and between the fingers'], correct: 3 },
    // Section 4. Personal protective equipment
    { id: 'q13', text: 'Gloves should be:', options: ['Single use: one person, one task, then removed and followed by hand hygiene', 'Worn for the whole shift', 'Washed and reused', 'Worn instead of hand hygiene'], correct: 0 },
    { id: 'q14', text: 'What is the correct order for putting on PPE?', options: ['Gloves, mask, apron, eye protection', 'Apron, mask, eye protection, gloves', 'Mask, gloves, apron, eye protection', 'Eye protection, gloves, apron, mask'], correct: 1 },
    { id: 'q15', text: 'A fluid resistant Type IIR mask should be worn for no longer than:', options: ['30 minutes', '4 hours', '8 hours', 'A whole shift'], correct: 1 },
    { id: 'q16', text: 'Who can wear an FFP3 respirator?', options: ['Anyone who wants one', 'Only visitors', 'Only staff who have been fit tested for it', 'Only people with glasses'], correct: 2 },
    // Section 5. Recognising and reporting infection
    { id: 'q17', text: 'Which of these can be the only sign of infection in an older person?', options: ['A good night\'s sleep', 'Enjoying a meal', 'Asking for a newspaper', 'A fall or new confusion'], correct: 3 },
    { id: 'q18', text: 'Why are urine dipsticks not used to diagnose infection in people over 65?', options: ['Many older people have bacteria in their urine without being infected', 'They are too expensive', 'They only work on children', 'They are unsafe'], correct: 0 },
    { id: 'q19', text: 'Which of these is a red flag sign of possible sepsis?', options: ['A good appetite', 'Mottled or bluish skin', 'A mild sniffle', 'Feeling a little tired after a walk'], correct: 1 },
    { id: 'q20', text: 'If there is no tissue available, what is the best way to catch a cough or sneeze?', options: ['Into your hand', 'Into the air', 'Into the crook of the arm', 'Into a glove'], correct: 2 },
    // Section 6. Outbreaks and transmission based precautions
    { id: 'q21', text: 'An outbreak is defined as:', options: ['One person with an infection', 'Five or more people with a cold at any time of year', 'Any person on antibiotics', 'Two or more linked cases of the same infection around the same time'], correct: 3 },
    { id: 'q22', text: 'Who will your manager usually contact for advice about an outbreak?', options: ['The local UKHSA health protection team', 'The local newspaper', 'The fire service', 'The police'], correct: 0 },
    { id: 'q23', text: 'Contact precautions for norovirus include:', options: ['An FFP3 respirator for everyone', 'Gloves and apron for all contact and dedicated equipment where possible', 'No extra measures', 'Alcohol handrub only'], correct: 1 },
    { id: 'q24', text: 'A person is being cared for in their own room because of an infection. What else must you make sure of?', options: ['That the door is locked', 'That they have no visitors ever again', 'That they still have company, drinks within reach and a way to call for help', 'That the diagnosis is written on the door'], correct: 2 },
    // Section 7. Cleaning, care equipment, laundry and spills
    { id: 'q25', text: 'In the national colour coding scheme, red cleaning equipment is used for:', options: ['Kitchens', 'Isolation rooms', 'Lounges', 'Bathrooms, toilets and sluices'], correct: 3 },
    { id: 'q26', text: 'How should infectious laundry be placed in the washing machine?', options: ['In a water soluble bag, loaded without opening it', 'Shaken out first', 'Rinsed by hand first', 'Mixed with other laundry'], correct: 0 },
    { id: 'q27', text: 'Why must a chlorine releasing product never be poured directly onto urine?', options: ['It stains the floor', 'It can release chlorine gas', 'It does not work', 'It is too expensive'], correct: 1 },
    { id: 'q28', text: 'When should a reusable commode be cleaned?', options: ['Once a week', 'Only when it looks dirty', 'After every use', 'Only during an outbreak'], correct: 2 },
    // Section 8. Waste, sharps and exposure incidents
    { id: 'q29', text: 'How full should a waste bag be before it is tied and replaced?', options: ['Completely full', 'Overflowing is acceptable if tied', 'Half full', 'No more than three quarters full'], correct: 3 },
    { id: 'q30', text: 'What should you never do with a used needle?', options: ['Recap it', 'Put it in a sharps container', 'Dispose of it at the point of use', 'Use the temporary closure on the container'], correct: 0 },
    { id: 'q31', text: 'Gloves and aprons used while caring for someone with norovirus usually go into:', options: ['A black bag', 'An orange infectious waste bag', 'A recycling bin', 'A sharps container'], correct: 1 },
    { id: 'q32', text: 'After a needlestick injury and first aid, what must you do?', options: ['Wait to see if you feel ill', 'Report it at your next supervision', 'Report it straight away and seek medical advice without delay', 'Nothing, if it did not bleed much'], correct: 2 },
  ],
}
