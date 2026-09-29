// COSHH: Safe Use of Hazardous Substances. Full course content for CPD submission.
//
// Framework: the Control of Substances Hazardous to Health Regulations 2002 and
// the Health and Safety Executive's COSHH guidance (COSHH basics and the brief
// guide INDG136), with GB CLP hazard pictograms. It deepens the "hazardous
// substances" heading of the Skills for Care statutory and mandatory training
// guide (December 2025) health and safety row. Section topics follow HSE's
// COSHH basics: what counts as hazardous, how harm happens, labels and safety
// data sheets, assessment and control, safe use, PPE and skin, biological and
// clinical hazards, and emergencies. Knowledge only: no observed practical.
//
// Timings total 60 minutes. Applied to the tier='cpd' module by
// scripts/apply-cpd-course.ts; the prebuilt tier is never touched.

import type { CpdCourse } from './cpd-course-types'

export const CPD_COSHH: CpdCourse = {
  module_id: '6f222caa-2ad7-41b8-af6c-4d9664dee0db',
  name: 'COSHH: Safe Use of Hazardous Substances',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: false,
  description:
    'Annual COSHH training for care, domestic, laundry, kitchen and maintenance staff in any adult social care ' +
    'setting. Built on the Control of Substances Hazardous to Health Regulations 2002 and Health and Safety ' +
    'Executive guidance, it covers what counts as a hazardous substance, how harm happens, hazard pictograms and ' +
    'safety data sheets, COSHH assessments and controls, safe use and storage, gloves and skin care, body fluids ' +
    'and medicines, and dealing with spills and exposure. Eight lessons with scenarios and activities, then a ' +
    'final assessment.',
  entry_requirements:
    'Foundation level. For everyone who uses, stores or could be exposed to hazardous substances at work in adult ' +
    'social care, including care, domestic, laundry, catering and maintenance staff. No prior qualification is ' +
    'needed. It does not replace product specific training or your workplace\'s own COSHH assessments.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check so your learning gain can be measured, and ' +
    'finish with a 32 question assessment with a pass mark of 80%. The course is designed to be taken every year.',
  outcomes: [
    'Explain what COSHH is, what counts as a hazardous substance, and the duties of employers and employees',
    'Describe how hazardous substances enter the body and the harm they can cause, including dermatitis and asthma',
    'Interpret hazard pictograms and use safety data sheets and COSHH assessments to work safely',
    'Apply the hierarchy of control and your workplace\'s controls when using, storing and disposing of substances',
    'Select and use gloves and other protective equipment correctly, and look after your skin',
    'Know how to deal with spills, splashes, swallowing and other exposures, and what to report',
  ],
  key_points: [
    'COSHH covers chemicals, products containing chemicals, fumes, dusts, vapours, gases and germs',
    'Substances harm through breathing in, skin and eye contact, swallowing and cuts or needlesticks',
    'Read the label and follow the COSHH assessment; a safety data sheet is not a risk assessment',
    'Prevent exposure first; PPE is the last resort and only protects the wearer while worn',
    'Never mix products, never decant into drinks containers, and keep everything locked away',
    'Report skin problems early; occupational dermatitis and asthma are preventable',
    'For spills and exposures, follow the safety data sheet, get help and report it',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. What COSHH is and what counts as a hazardous substance', minutes: 5 },
    { part: 'Section 2. How hazardous substances cause harm', minutes: 5 },
    { part: 'Section 3. Hazard pictograms, labels and safety data sheets', minutes: 5 },
    { part: 'Section 4. COSHH assessments and the hierarchy of control', minutes: 5 },
    { part: 'Section 5. Using and storing substances safely in care settings', minutes: 5 },
    { part: 'Section 6. Protective equipment and skin care', minutes: 5 },
    { part: 'Section 7. Biological agents, body fluids and medicines', minutes: 5 },
    { part: 'Section 8. Spills, exposure, emergencies and reporting', minutes: 4 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'What does COSHH stand for?', options: ['Care of Substances Harmful to Humans', 'Control of Substances Hazardous to Health', 'Code of Safety for Home Health', 'Chemical Order for Safe Housekeeping'], correct: 1 },
    { id: 'pc2', text: 'Which of these is covered by COSHH?', options: ['Asbestos', 'Germs in body fluids', 'Lead', 'Radioactive materials'], correct: 1 },
    { id: 'pc3', text: 'What shape and colour are GB CLP hazard pictograms?', options: ['Yellow triangles', 'Diamonds with a red border', 'Blue circles', 'Green squares'], correct: 1 },
    { id: 'pc4', text: 'Mixing bleach with some other cleaners can:', options: ['Make them work better', 'Release a toxic gas', 'Make them safer', 'Have no effect'], correct: 1 },
    { id: 'pc5', text: 'In the hierarchy of control, personal protective equipment is:', options: ['The first thing to use', 'The last resort', 'Not needed if you are careful', 'Only for managers'], correct: 1 },
  ],
  sections: [
    {
      heading: 'What COSHH is',
      minutes: 5,
      body:
        'The Control of Substances Hazardous to Health Regulations 2002, known as COSHH, require employers to prevent or adequately control exposure to substances that can harm health, so that people do not become ill because of their work.\n\n' +
        'COSHH covers a wide range of things: chemicals and products containing chemicals, fumes, dusts, vapours, mists, gases, and biological agents, meaning germs. In care settings that includes cleaning products and disinfectants, bleach, descalers, dishwasher and laundry chemicals, hand sanitiser, some medicines, and the germs carried in blood, body fluids and water systems. If a product\'s packaging has a hazard pictogram, it is classed as hazardous. Lead, asbestos and radioactive substances are not covered by COSHH because they have their own regulations.\n\n' +
        'Employers must identify the hazardous substances used or produced at work, assess the risks, decide on and put in place controls to prevent or reduce exposure, make sure controls are used and maintained, monitor exposure and provide health surveillance where needed, plan for emergencies, and give employees information, instruction and training. Cleaning and maintenance staff are included.\n\n' +
        'Employees have duties too. You must make full and proper use of the controls provided, follow the COSHH assessment and your training, wear and look after the protective equipment given to you, store substances as directed, and report anything that is damaged, missing or not working, such as a broken dispenser, an unlabelled bottle or gloves that split. You must also tell your manager about symptoms that could be linked to work, such as a rash on your hands or a new cough.\n\n' +
        'COSHH protects the people you support as well as staff. People living with dementia, sight loss or confusion may not recognise danger, and a product left within reach can cause serious harm in seconds.',
      scenario: {
        situation: 'A new domestic colleague brings in their own bottle of strong limescale remover from home because "it works much better than what we have here".',
        prompt: 'What should you say?',
        answer: 'Explain kindly that only products your workplace has assessed under COSHH should be used, because the assessment sets out the hazards, the safe way to use the product, the protective equipment and what to do in an emergency. A product from home has none of that, and it could react with other cleaners or harm residents. Suggest they raise it with the manager, who can assess it if it is needed, and ask them to take it home.',
      },
      check: {
        question: 'Which of these is NOT covered by the COSHH Regulations?',
        options: ['Asbestos', 'Germs in body fluids', 'Cleaning chemicals', 'Dusts and fumes'],
        correct: 0,
        explanation: 'COSHH covers chemicals, fumes, dusts, vapours, gases and germs. Lead, asbestos and radioactive substances have their own separate regulations.',
      },
      image_prompt: 'A care home cleaning cupboard shelf with neatly arranged labelled cleaning bottles, each with red bordered diamond hazard symbols, a folder on the shelf, a domestic worker in gloves reaching for one bottle.',
      image_alt: 'A domestic worker in gloves taking a labelled cleaning product from an organised cupboard',
    },
    {
      heading: 'How hazardous substances cause harm',
      minutes: 5,
      body:
        'Hazardous substances enter the body in four main ways. They can be breathed in as fumes, sprays, vapours or dust, reaching the lungs. They can contact the skin or eyes, causing damage where they land or passing through the skin into the body. They can be swallowed, for example from contaminated hands, food or drinks, or by someone mistaking a product for a drink. And they can enter through cuts, broken skin or needlestick injuries.\n\n' +
        'Effects can be immediate, such as stinging eyes, coughing, burns, dizziness or poisoning, or they can build up over time. Two long term conditions are especially relevant to care work. Occupational dermatitis is inflammation of the skin, usually the hands, causing redness, itching, dryness, cracking and blistering. It is caused by frequent wet work, repeated handwashing, detergents and some glove materials. Occupational asthma is caused by breathing in substances that sensitise the airways, such as some cleaning sprays. Once a person is sensitised, even a small exposure can trigger a reaction, and it can become permanent.\n\n' +
        'Natural rubber latex, found in some gloves and medical devices, can cause dermatitis, asthma and, rarely, severe allergic reactions including anaphylaxis. This is why many care settings use nitrile gloves.\n\n' +
        'Some people are at greater risk: people with existing skin or breathing conditions, pregnant and breastfeeding workers, young workers, and the people you support, who may be frail, have fragile skin or be unable to move away from fumes. Using sprays near someone with a chest condition, or cleaning around a person in bed, can expose them without them being able to object.\n\n' +
        'The amount and length of exposure matter. Using the correct dilution, not using more than needed, keeping rooms ventilated and limiting how long you are exposed all reduce the risk.',
      scenario: {
        situation: 'Your hands have become red, cracked and itchy over the last few weeks. You wash them many times a shift and do most of the laundry. A colleague suggests just using more hand cream at home.',
        prompt: 'What should you do?',
        answer: 'These are signs of possible occupational dermatitis, which should be reported to your manager early, not just treated at home. Your employer can review your tasks, gloves and products and may arrange health surveillance or an occupational health or GP review. Keep using the moisturiser provided at work, dry your hands thoroughly, wear the right gloves for wet work and chemicals, and do not wear gloves longer than needed. If a doctor diagnoses occupational dermatitis, your employer may need to report it under RIDDOR.',
      },
      check: {
        question: 'Which of these is a common cause of occupational dermatitis in care work?',
        options: ['Walking between rooms', 'Reading care plans', 'Using a computer', 'Frequent wet work and repeated handwashing'],
        correct: 3,
        explanation: 'Frequent wet work, repeated handwashing, detergents and some glove materials damage the skin barrier. Early reporting, correct gloves and moisturising help prevent dermatitis.',
      },
      image_prompt: 'Close view of a care worker gently applying moisturising cream to their hands beside a sink in a care home staff area, a box of nitrile gloves and a paper towel dispenser nearby.',
      image_alt: 'A care worker applying moisturiser to their hands beside a sink and a box of gloves',
    },
    {
      heading: 'Pictograms, labels and safety data sheets',
      minutes: 5,
      body:
        'Always read the label before you use a product. Under the GB CLP rules, hazardous products carry hazard pictograms: diamonds with a red border and a white background. There are nine. The flame means flammable. The flame over a circle means oxidising, which can make fires burn more fiercely. The exploding bomb means explosive. The corrosion symbol means the product can burn skin and eyes or damage metal. The skull and crossbones means acute toxicity, which can cause serious harm or death even in small amounts. The exclamation mark means a health hazard such as irritation, sensitisation or harm if swallowed. The health hazard symbol, a person with a starburst on the chest, means a serious long term health hazard such as causing asthma or cancer. The gas cylinder means gas under pressure. The environment symbol means hazardous to the environment.\n\n' +
        'Labels also carry a signal word, "Danger" for the more severe hazards or "Warning" for the less severe, and hazard and precautionary statements, such as "Causes serious eye damage" and "Wear eye protection".\n\n' +
        'Every hazardous product has a safety data sheet from the supplier. It describes the hazards, safe handling and storage, protective equipment, what to do in a fire or spill, and first aid. You should know where the safety data sheets are kept and be able to find them quickly in an emergency.\n\n' +
        'A safety data sheet is not a risk assessment. Your employer uses it, together with how the product is actually used in your workplace, to write a COSHH assessment for each substance or task. The assessment is what tells you, specifically, how to use the product safely in your job. If a product arrives with a different label or from a new supplier, it needs to be checked and assessed before use.',
      scenario: {
        situation: 'A new toilet cleaner has been delivered. Its label shows a corrosion pictogram and the word "Danger". It is not on the COSHH file and nobody has told you how to use it.',
        prompt: 'What do you do?',
        answer: 'Do not use it yet. A corrosion pictogram with "Danger" means it can seriously burn skin and eyes. Tell the manager or senior that it is a new product without a COSHH assessment, and continue with the assessed product. The manager will obtain the safety data sheet, assess the risks for how it will be used, and brief staff on safe use and protective equipment before it goes into use.',
      },
      check: {
        question: 'What does the skull and crossbones pictogram mean?',
        options: ['Flammable', 'Hazardous to the environment', 'Acute toxicity: can cause serious harm or death even in small amounts', 'Gas under pressure'],
        correct: 2,
        explanation: 'The skull and crossbones shows acute toxicity. The product can cause serious harm or death even in small amounts, so exposure must be strictly controlled.',
      },
      image_prompt: 'A close view of a care worker reading the back label of a cleaning product bottle marked with a red bordered diamond corrosion pictogram, a ring binder labelled with a simple icon open on the counter beside them.',
      image_alt: 'A care worker reading a product label that shows a red diamond hazard pictogram',
    },
    {
      heading: 'COSHH assessments and control',
      minutes: 5,
      body:
        'A COSHH assessment looks at each hazardous substance and task in your workplace: what the harm could be, who could be exposed and how, how often and for how long, and what controls are needed. It is written by your employer or a competent person, but it depends on staff: you know how products are really used, so your feedback matters.\n\n' +
        'Controls follow a hierarchy, from most to least effective. The best option is to avoid using a hazardous substance at all, for example using steam cleaning or microfibre cloths with water for some tasks. Next is substitution: swapping to a milder product, or a safer form, such as a gel or pre-measured tablet instead of a powder or concentrated liquid. Then come controls that reduce exposure at source, such as good ventilation, dosing and dilution systems that measure the product for you, and closed dispensing. Then ways of working: procedures, training, supervision, limiting how often and how long a task is done, and keeping people away while you work. Personal protective equipment is the last resort, because it only protects the wearer, only while it is worn, and gives no protection if it fails.\n\n' +
        'The COSHH assessment for each product tells you which product to use for which task, the correct dilution, the protective equipment to wear, how to store it and dispose of it, and what to do in an emergency. Follow it every time. Do not change a product\'s dilution or use it for a job it was not intended for.\n\n' +
        'Employers must make sure controls keep working: ventilation, dispensers and equipment are checked and maintained, and records are kept. Where a risk of ill health remains, such as dermatitis for staff doing a lot of wet work, the employer may arrange health surveillance, such as regular skin checks. Tell your manager if a control is not working, if a task has changed, or if you think a safer product could be used.',
      scenario: {
        situation: 'A colleague makes the floor cleaner "extra strong" by adding more concentrate than the dispenser measures, saying the floors come up better.',
        prompt: 'Why is this a problem, and what should happen?',
        answer: 'The dilution in the COSHH assessment is part of the control: stronger solutions increase the risk of skin and eye burns, fumes and slippery residues, and waste product. The dispenser is there to measure it safely. Remind your colleague to use it as intended, and if the floors are not coming clean, raise it with the manager so the product, method or equipment can be reviewed properly.',
      },
      check: {
        question: 'Which is the most effective control in the hierarchy?',
        options: ['Wearing gloves', 'Avoiding or replacing the hazardous substance', 'Putting up a sign', 'Working faster'],
        correct: 1,
        explanation: 'Removing or substituting the hazard protects everyone. PPE is the last resort because it only protects the wearer, and only while it works.',
      },
      image_prompt: 'A wall mounted chemical dosing and dilution dispenser in a care home domestic room filling a labelled spray bottle, a care worker in gloves and apron watching, a laminated instruction card with icons beside it.',
      image_alt: 'A care worker filling a labelled bottle from a wall mounted dilution dispenser',
    },
    {
      heading: 'Using and storing substances safely',
      minutes: 5,
      body:
        'Use only the products you have been trained to use, for the job they are intended for, at the right dilution. Read the label and follow the COSHH assessment. Open windows or use extraction where the assessment says, and avoid spraying near people\'s faces, especially people with breathing problems; spray onto a cloth instead where you can.\n\n' +
        'Never mix products. Bleach mixed with acidic products such as some toilet cleaners and descalers releases chlorine gas, and mixed with ammonia based products it releases toxic chloramine vapours. Both can cause serious breathing problems. Rinse equipment between products, and do not pour one product into another\'s container.\n\n' +
        'Keep products in their original, labelled containers. Never decant a product into a drinks bottle, cup or unlabelled spray, because someone could drink it. If a product has to be diluted into a spray bottle, the bottle must be labelled with the product name and hazards, as your workplace provides.\n\n' +
        'Store hazardous substances in a locked cupboard or room, away from food, drink and medicines, and away from heat. Keep flammable products away from sources of ignition. Close lids straight after use. Never leave a cleaning trolley or product unattended in areas where people you support are, even for a moment: a person with dementia may drink disinfectant, hand sanitiser or laundry capsules believing it is a drink or sweet.\n\n' +
        'Dispose of products and empty containers as the COSHH assessment and safety data sheet say, and never pour substances down a drain unless that is the stated method.\n\n' +
        'In people\'s own homes, the products belong to the person, but you still need to use them safely. Read the labels, do not mix them, make sure they are stored out of reach where the person is at risk, and report anything that worries you, such as products stored with food or in drinks bottles.',
      scenario: {
        situation: 'In a supported living flat you find bleach decanted into a lemonade bottle on the kitchen worktop, next to the person\'s squash. They tell you a friend did it to "save space".',
        prompt: 'What should you do?',
        answer: 'Remove the risk straight away: move the bottle away from food and drinks and, with the person\'s agreement, safely pour it back into a properly labelled bleach container or dispose of it following the label. Explain why products must stay in their labelled containers. Record what you found and report it to your manager so the person\'s risk assessment and support plan can be reviewed.',
      },
      check: {
        question: 'Why must bleach never be mixed with acidic toilet cleaners?',
        options: ['It stops the bleach working', 'It releases chlorine gas', 'It stains the toilet', 'It is not allowed at night'],
        correct: 1,
        explanation: 'Bleach and acids react to release chlorine gas, which can cause serious breathing problems. Never mix products, and rinse equipment between uses.',
      },
      image_prompt: 'A care worker placing a labelled cleaning bottle into a locked cleaning trolley compartment in a care home corridor, the trolley closed and secured, a resident lounge visible in the background.',
      image_alt: 'A care worker securing cleaning products in a lockable trolley compartment',
    },
    {
      heading: 'Protective equipment and skin care',
      minutes: 5,
      body:
        'When a COSHH assessment specifies personal protective equipment, you must wear it, and your employer must provide it free of charge. PPE only works if it is the right type, fits, is in good condition and is used correctly.\n\n' +
        'Gloves are the most common PPE for hazardous substances in care, but not all gloves are equal. The COSHH assessment or safety data sheet tells you which type to use. Nitrile gloves are widely used because they resist many chemicals and avoid latex allergy. Polythene gloves are not suitable for chemical or personal care tasks. Heavy duty household style gloves may be needed for some cleaning and are either single use or cleaned and stored as your workplace directs. Check gloves for holes before use, change them if damaged or between tasks, and remove them without touching the outside with bare skin. Gloves are not a replacement for hand hygiene.\n\n' +
        'Wear a disposable apron to protect your clothing, and eye protection, such as goggles or a visor, when there is a risk of splashes, for example when decanting, using sprays at head height or cleaning up spills. Some tasks need a mask or respirator; only use respiratory protection you have been trained and, where required, fit tested for.\n\n' +
        'Look after your skin. Wear gloves only when needed and for no longer than needed, because sweating inside gloves also damages skin. Use warm, not hot, water, dry your hands thoroughly, and use the moisturiser provided, especially at the end of a shift. Check your hands regularly for redness, dryness, itching or cracking, and report any changes early. Your employer may carry out regular skin checks as health surveillance. Tell your manager if you have a known allergy, such as to latex.',
      scenario: {
        situation: 'You are about to descale the kettle and dishwasher in the unit kitchen. The COSHH assessment says to wear nitrile gloves and eye protection. There are only polythene food gloves in the kitchen, and the goggles are missing.',
        prompt: 'What do you do?',
        answer: 'Do not start the task without the specified PPE. Polythene gloves do not protect against the descaler, and without eye protection a splash could cause serious eye damage. Get the correct nitrile gloves and goggles from the PPE store, or ask the senior. Report the missing goggles so they are replaced, then carry out the task following the COSHH assessment.',
      },
      check: {
        question: 'Why are polythene gloves unsuitable for chemical tasks?',
        options: ['They are too expensive', 'They are too thick', 'They do not give adequate protection against chemicals', 'They are only for managers'],
        correct: 2,
        explanation: 'Polythene gloves are designed for food handling and give little protection against chemicals. Use the glove type specified on the COSHH assessment, often nitrile.',
      },
      image_prompt: 'A care worker putting on safety goggles and blue nitrile gloves in a fully drawn care home kitchen with walls and cupboards behind, before descaling a kettle, a descaler bottle showing a red bordered diamond corrosion pictogram (liquid dripping onto a hand and a surface) on the counter.',
      image_alt: 'A care worker putting on goggles and nitrile gloves before using a descaler',
    },
    {
      heading: 'Body fluids, water and medicines',
      minutes: 5,
      body:
        'COSHH covers biological agents, meaning germs, as well as chemicals. In care, the main biological hazards are germs in blood and body fluids, such as urine, faeces, vomit and sputum, and bacteria in water systems.\n\n' +
        'Treat all blood and body fluids as potentially infectious. Follow standard infection prevention and control precautions: hand hygiene, gloves and apron for contact with body fluids, eye protection where splashing is likely, safe disposal of waste and sharps, and the correct spill procedure. Remember that chlorine releasing disinfectants must not be poured directly onto urine, because they can release chlorine gas. Your infection prevention and control training covers these in detail.\n\n' +
        'Legionella bacteria can grow in water systems and cause Legionnaires\' disease, a serious lung infection caught by breathing in fine water droplets, for example from showers. Older people and people with weakened immunity are most at risk. Your workplace will have a water management plan. Your part may include running rarely used taps and showers regularly, reporting water that is not hot enough or not cold enough, and cleaning and descaling shower heads as scheduled.\n\n' +
        'Some medicines are hazardous to the people handling them. Cytotoxic drugs, used for cancer and some other conditions such as rheumatoid arthritis and multiple sclerosis, can harm staff through skin contact, breathing in particles, swallowing and needlesticks, including from the person\'s body fluids and waste for a period after a dose. If someone you support takes cytotoxic medicines, follow the specific guidance in their care plan, which usually includes wearing gloves and an apron when handling the medicine or the person\'s body fluids and waste, and disposing of waste in the designated cytotoxic waste stream. Never crush tablets or open capsules unless a pharmacist has advised it is safe and how to do it.\n\n' +
        'Pregnant or breastfeeding workers should tell their manager, so that the risks from some substances, including some medicines, can be assessed.',
      scenario: {
        situation: 'Mr Adams has started oral chemotherapy tablets at home. His care plan now says to wear gloves and an apron when handling his tablets and when emptying his catheter bag for 48 hours after each dose. A colleague says that is "over the top for tablets".',
        prompt: 'What should you do?',
        answer: 'Follow the care plan. Cytotoxic drugs can harm staff through skin contact with the medicine and through the person\'s body fluids and waste for a period after each dose. Wear the gloves and apron as directed, dispose of waste in the designated stream, and wash your hands afterwards. Explain to your colleague why the precautions are there, and raise it with the manager if they continue to ignore the plan.',
      },
      check: {
        question: 'How is Legionnaires\' disease usually caught?',
        options: ['Breathing in fine water droplets from contaminated water systems, such as showers', 'Drinking tap water', 'Touching taps', 'Eating food'],
        correct: 0,
        explanation: 'Legionella bacteria are breathed in as fine water droplets or spray, for example from showers. Running rarely used outlets and keeping water at the right temperatures helps control it.',
      },
      image_prompt: 'A care worker in gloves and an apron carefully handling a blister pack of tablets at a clean medicines area in a person\'s home, a small labelled purple lidded waste container on the table nearby.',
      image_alt: 'A care worker in gloves and apron handling tablets, with a designated waste container nearby',
    },
    {
      heading: 'Spills, exposure and emergencies',
      minutes: 4,
      body:
        'Your workplace should have a plan for foreseeable emergencies with hazardous substances, including spill kits, protective equipment and trained people. Know where the spill kit, eyewash and safety data sheets are kept.\n\n' +
        'For a spill, keep people away, especially the people you support, and ventilate the area if it is safe to do so. Put on the protective equipment the safety data sheet or COSHH assessment specifies. Contain the spill with absorbent material from the spill kit, working from the outside in, then clean the area as directed and dispose of the waste as the safety data sheet says. For a large spill, a spill you are not sure how to handle, or one giving off fumes, leave the area, close the door and get help.\n\n' +
        'If a substance splashes into someone\'s eyes, rinse them immediately with plenty of clean running water or eyewash for as long as the safety data sheet advises, often at least 10 to 15 minutes, holding the eyelids open, and get medical help. For skin contact, remove contaminated clothing and rinse the skin with plenty of water. If someone has breathed in fumes, move them to fresh air if it is safe. If someone has swallowed a product, do not make them sick; call 999 if they are unwell or NHS 111 for advice, and have the container or safety data sheet with you. Follow the first aid on the safety data sheet in every case.\n\n' +
        'Report every spill, exposure and near miss through your workplace\'s procedure, and record what happened, what was involved and what you did. Report symptoms that might be linked to work, such as rashes or breathing problems. If a doctor diagnoses occupational dermatitis or occupational asthma linked to work, your employer must report it to the Health and Safety Executive under RIDDOR. Reporting helps your workplace review its COSHH assessments and stop it happening again.',
      scenario: {
        situation: 'While refilling a spray bottle, a colleague splashes disinfectant concentrate into their eye. They are rubbing it and say it stings.',
        prompt: 'What should you do?',
        answer: 'Stop them rubbing and rinse the eye immediately with plenty of clean running water or eyewash, holding the eyelid open, for as long as the safety data sheet advises, usually at least 10 to 15 minutes. Send someone for help and the safety data sheet, and get medical advice, calling 999 if the injury looks serious. Then record and report the incident so the task and protective equipment can be reviewed.',
      },
      check: {
        question: 'Someone has swallowed a cleaning product. Which of these should you NOT do?',
        options: ['Call 999 or NHS 111', 'Follow the first aid on the safety data sheet', 'Have the container or safety data sheet with you', 'Make them sick'],
        correct: 3,
        explanation: 'Making someone sick can cause further damage, especially with corrosive products. Get medical help, follow the safety data sheet and have the product details ready.',
      },
      image_prompt: 'A care worker helping a colleague rinse their eye at a wall mounted eyewash station in a care home domestic room, a spill kit bag and a safety data sheet folder on the wall nearby.',
      image_alt: 'A care worker helping a colleague rinse their eye at an eyewash station, with a spill kit nearby',
    },
  ],
  activities: [
    {
      id: 'coshh-act-1', type: 'sort', after_section: 0,
      title: 'Covered by COSHH?',
      instructions: 'Sort each item. Is it covered by COSHH, or by other regulations?',
      bins: [
        { id: 'coshh', name: 'Covered by COSHH', note: 'Hazardous to health' },
        { id: 'other', name: 'Covered by other regulations', note: 'Has its own specific law' },
      ],
      items: [
        { text: 'Bleach and disinfectants', bin: 'coshh' },
        { text: 'Germs in urine and faeces', bin: 'coshh' },
        { text: 'Dishwasher detergent', bin: 'coshh' },
        { text: 'Legionella bacteria in water systems', bin: 'coshh' },
        { text: 'Asbestos in an old ceiling tile', bin: 'other' },
        { text: 'Lead in old paint', bin: 'other' },
      ],
    },
    {
      id: 'coshh-act-2', type: 'match', after_section: 1,
      title: 'Routes into the body',
      instructions: 'Match each route of entry to an example.',
      pairs: [
        { term: 'Breathing in', definition: 'Spray from an aerosol cleaner used at head height' },
        { term: 'Skin or eye contact', definition: 'A splash of descaler onto the hands' },
        { term: 'Swallowing', definition: 'Eating a snack without washing hands after cleaning' },
        { term: 'Through the skin', definition: 'A needlestick injury or a cut on the hand' },
      ],
    },
    {
      id: 'coshh-act-3', type: 'match', after_section: 2,
      title: 'Read the pictograms',
      instructions: 'Match each GB CLP pictogram to what it means.',
      pairs: [
        { term: 'Flame', definition: 'Flammable' },
        { term: 'Corrosion', definition: 'Can burn skin and eyes or damage metal' },
        { term: 'Skull and crossbones', definition: 'Acute toxicity, harmful even in small amounts' },
        { term: 'Exclamation mark', definition: 'Irritant, sensitiser or harmful if swallowed' },
        { term: 'Health hazard, a person with a starburst', definition: 'Serious long term health hazard such as causing asthma' },
        { term: 'Flame over circle', definition: 'Oxidising, can make fires burn more fiercely' },
      ],
    },
    {
      id: 'coshh-act-4', type: 'order', after_section: 3,
      title: 'The hierarchy of control',
      instructions: 'Put the controls in order, from most effective to least effective.',
      steps: [
        'Avoid using the hazardous substance altogether',
        'Substitute it with a safer product or safer form',
        'Control it at source, such as ventilation or a dosing system',
        'Safe ways of working, training and supervision',
        'Personal protective equipment, as the last resort',
      ],
    },
    {
      id: 'coshh-act-5', type: 'sort', after_section: 4,
      title: 'Safe storage and use',
      instructions: 'Sort each practice.',
      bins: [
        { id: 'safe', name: 'Safe', note: 'Follows COSHH controls' },
        { id: 'unsafe', name: 'Unsafe', note: 'Could cause harm' },
      ],
      items: [
        { text: 'Locking products in a cupboard away from food', bin: 'safe' },
        { text: 'Spraying onto a cloth rather than towards a person', bin: 'safe' },
        { text: 'Rinsing the mop bucket between products', bin: 'safe' },
        { text: 'Mixing bleach and toilet cleaner for a tough stain', bin: 'unsafe' },
        { text: 'Keeping laundry capsules in an open bowl in the lounge', bin: 'unsafe' },
        { text: 'Decanting disinfectant into a water bottle', bin: 'unsafe' },
      ],
    },
    {
      id: 'coshh-act-6', type: 'order', after_section: 5,
      title: 'Removing gloves safely',
      instructions: 'Put the steps of removing single use gloves after a chemical task into order.',
      steps: [
        'Pinch the outside of one glove at the wrist, without touching your skin',
        'Peel it off so it turns inside out, and hold it in the gloved hand',
        'Slide a bare finger inside the wrist of the other glove',
        'Peel it off over the first glove, inside out',
        'Dispose of the gloves in the correct waste bin',
        'Wash and dry your hands, then moisturise',
      ],
    },
    {
      id: 'coshh-act-7', type: 'match', after_section: 6,
      title: 'Biological and clinical hazards',
      instructions: 'Match each hazard to a control.',
      pairs: [
        { term: 'Body fluids', definition: 'Standard precautions: hand hygiene, gloves and apron, safe disposal' },
        { term: 'Legionella', definition: 'Running rarely used outlets and descaling shower heads' },
        { term: 'Cytotoxic medicines', definition: 'Gloves and apron and the designated waste stream, as the care plan says' },
        { term: 'Urine spill', definition: 'Absorb first; never pour chlorine releasing product directly onto it' },
      ],
    },
    {
      id: 'coshh-act-8', type: 'order', after_section: 7,
      title: 'Dealing with a small chemical spill',
      instructions: 'Put the steps into order.',
      steps: [
        'Keep people away from the spill',
        'Check the safety data sheet or COSHH assessment',
        'Put on the protective equipment it specifies',
        'Contain the spill with absorbent material, working from the outside in',
        'Clean the area and dispose of the waste as directed',
        'Record and report the spill',
      ],
    },
  ],
  references: [
    { title: 'The Control of Substances Hazardous to Health Regulations 2002', url: 'https://www.legislation.gov.uk/uksi/2002/2677/contents', source: 'legislation.gov.uk', note: 'The regulations this course is built on, setting out the duties of employers and employees.' },
    { title: 'Working with substances hazardous to health: a brief guide to COSHH (INDG136)', url: 'https://www.hse.gov.uk/pubns/indg136.htm', source: 'Health and Safety Executive', note: 'The HSE\'s short guide to COSHH, including the steps employers take to control exposure.' },
    { title: 'COSHH basics: what is a substance hazardous to health?', url: 'https://www.hse.gov.uk/coshh/basics/substance.htm', source: 'Health and Safety Executive', note: 'What COSHH covers, including biological agents, and what it does not, such as lead and asbestos.' },
    { title: 'How to carry out a COSHH risk assessment', url: 'https://www.hse.gov.uk/coshh/basics/assessment.htm', source: 'Health and Safety Executive', note: 'How employers identify hazards, assess risks and decide on controls, the basis for section 4.' },
    { title: 'Hazard pictograms (symbols)', url: 'https://www.hse.gov.uk/chemical-classification/labelling-packaging/hazard-symbols-hazard-pictograms.htm', source: 'Health and Safety Executive', note: 'The nine GB CLP hazard pictograms and what each one means.' },
    { title: 'Statutory and mandatory training guide for adult social care employers (December 2025)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf', source: 'Skills for Care', note: 'Includes hazardous substances within the expected health and safety content for all adult social care workers.' },
    { title: 'Skin at work', url: 'https://www.hse.gov.uk/skin/', source: 'Health and Safety Executive', note: 'How to prevent work related skin disease, including choosing the right gloves.' },
    { title: 'Latex allergies in health and social care', url: 'https://www.hse.gov.uk/healthservices/latex/index.htm', source: 'Health and Safety Executive', note: 'Why latex can cause dermatitis, asthma and, rarely, anaphylaxis, and how workers are protected.' },
    { title: 'Safe handling of cytotoxic drugs in the workplace', url: 'https://www.hse.gov.uk/healthservices/safe-use-cytotoxic-drugs.htm', source: 'Health and Safety Executive', note: 'The risks from cytotoxic medicines, including in care homes and people\'s own homes, and the precautions to take.' },
    { title: 'Reportable occupational diseases (RIDDOR)', url: 'https://www.hse.gov.uk/riddor/occupational-diseases.htm', source: 'Health and Safety Executive', note: 'Why diagnosed occupational dermatitis and asthma linked to work must be reported by the employer.' },
  ],
  glossary: [
    { term: 'COSHH', definition: 'The Control of Substances Hazardous to Health Regulations 2002.' },
    { term: 'Hazardous substance', definition: 'Any substance that can harm health, including chemicals, fumes, dusts, vapours, gases and germs.' },
    { term: 'Biological agent', definition: 'A germ, such as bacteria or a virus, that can cause infection or illness.' },
    { term: 'COSHH assessment', definition: 'Your employer\'s assessment of a substance or task, setting out the risks and how to control them.' },
    { term: 'Safety data sheet', definition: 'The supplier\'s information on a product\'s hazards, handling, storage and first aid. It is not a risk assessment.' },
    { term: 'Hazard pictogram', definition: 'A red bordered diamond symbol on a label showing the type of hazard.' },
    { term: 'Hierarchy of control', definition: 'The order of controls from most to least effective, with PPE as the last resort.' },
    { term: 'Occupational dermatitis', definition: 'Work related inflammation of the skin, often caused by wet work and chemicals.' },
    { term: 'Sensitisation', definition: 'When the body becomes allergic to a substance, so even small later exposures cause a reaction.' },
    { term: 'Health surveillance', definition: 'Regular checks, such as skin checks, to detect early signs of work related ill health.' },
    { term: 'Legionella', definition: 'Bacteria that grow in water systems and can cause Legionnaires\' disease when breathed in.' },
    { term: 'Cytotoxic drug', definition: 'A medicine that is toxic to cells, used for cancer and some other conditions, which can harm people who handle it.' },
  ],
  practical_checklist: [],
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. What COSHH is
    { id: 'q1', text: 'What is the main aim of the COSHH Regulations?', options: ['To reduce cleaning costs', 'To ban all chemicals', 'To prevent or adequately control exposure to substances hazardous to health', 'To regulate food hygiene'], correct: 2 },
    { id: 'q2', text: 'Which of these counts as a hazardous substance under COSHH?', options: ['Radioactive materials', 'Asbestos', 'Germs in blood and body fluids', 'Lead'], correct: 2 },
    { id: 'q3', text: 'Which is an employee duty under COSHH?', options: ['Writing the COSHH assessments', 'Choosing new products', 'Buying protective equipment', 'Making full and proper use of the controls provided and reporting defects'], correct: 3 },
    { id: 'q4', text: 'A colleague brings in a cleaning product from home. What should happen?', options: ['Use it if it works better', 'Use it only at night', 'Mix it with the usual product', 'Do not use it unless the workplace has assessed it'], correct: 3 },
    // Section 2. How hazardous substances cause harm
    { id: 'q5', text: 'Which of these is a route by which substances enter the body?', options: ['Standing nearby with the lid closed', 'Hearing', 'Looking at the label', 'Breathing in fumes or sprays'], correct: 3 },
    { id: 'q6', text: 'Occupational asthma can be caused by:', options: ['Breathing in substances that sensitise the airways, such as some cleaning sprays', 'Drinking water', 'Walking briskly', 'Wearing gloves'], correct: 0 },
    { id: 'q7', text: 'Why do many care settings use nitrile rather than latex gloves?', options: ['They are cheaper', 'Latex can cause allergies, including dermatitis and asthma', 'Nitrile gloves last all day', 'Latex gloves are illegal'], correct: 1 },
    { id: 'q8', text: 'Why can the people you support be at greater risk from hazardous substances?', options: ['They use more products', 'They are always outdoors', 'They may not recognise danger or be able to move away from fumes', 'They are never at risk'], correct: 2 },
    // Section 3. Pictograms, labels and safety data sheets
    { id: 'q9', text: 'How many GB CLP hazard pictograms are there?', options: ['Four', 'Six', 'Nine', 'Twelve'], correct: 2 },
    { id: 'q10', text: 'The flame over a circle pictogram means:', options: ['Oxidising, can make fires burn more fiercely', 'Flammable', 'Explosive', 'Hot surface'], correct: 0 },
    { id: 'q11', text: 'Which signal word is used on labels for the more severe hazards?', options: ['Danger', 'Warning', 'Caution', 'Notice'], correct: 0 },
    { id: 'q12', text: 'Is a safety data sheet the same as a COSHH assessment?', options: ['Yes, they are the same', 'No, safety data sheets are not needed', 'Yes, if it is signed', 'No, the employer uses it to help write the assessment for how the product is used'], correct: 3 },
    // Section 4. COSHH assessments and control
    { id: 'q13', text: 'Why is PPE the last resort in the hierarchy of control?', options: ['It is expensive', 'It only protects the wearer, only while worn, and gives no protection if it fails', 'It is uncomfortable', 'It is optional'], correct: 1 },
    { id: 'q14', text: 'Swapping a powder product for a pre-measured tablet is an example of:', options: ['PPE', 'Emergency planning', 'Health surveillance', 'Substitution with a safer form'], correct: 3 },
    { id: 'q15', text: 'A colleague adds extra concentrate to make cleaner "stronger". This is:', options: ['Good practice', 'Unsafe, because it goes against the dilution in the COSHH assessment', 'Required for floors', 'Fine if they wear gloves'], correct: 1 },
    { id: 'q16', text: 'Health surveillance for staff doing a lot of wet work might include:', options: ['Hearing tests', 'Eye tests', 'Regular skin checks', 'Blood pressure checks only'], correct: 2 },
    // Section 5. Using and storing substances safely
    { id: 'q17', text: 'Mixing bleach with an ammonia based cleaner can release:', options: ['Oxygen', 'Toxic chloramine vapours', 'Nothing harmful', 'Steam only'], correct: 1 },
    { id: 'q18', text: 'Where should hazardous substances be stored?', options: ['On an open shelf in the lounge', 'In a locked cupboard away from food, drink and medicines', 'Under the kitchen sink next to food', 'In residents\' rooms'], correct: 1 },
    { id: 'q19', text: 'Why should a cleaning trolley never be left unattended near residents?', options: ['It might be moved', 'It looks untidy', 'It blocks the corridor', 'A person may drink or eat a product believing it is safe'], correct: 3 },
    { id: 'q20', text: 'When cleaning near someone with a breathing problem, it is safer to:', options: ['Spray directly into the air', 'Use extra product', 'Spray onto a cloth rather than towards the person', 'Close the windows'], correct: 2 },
    // Section 6. Protective equipment and skin care
    { id: 'q21', text: 'Who must provide the PPE specified in a COSHH assessment?', options: ['The employee', 'The resident', 'The employer, free of charge', 'The supplier directly to staff'], correct: 2 },
    { id: 'q22', text: 'Which of these helps protect your skin?', options: ['Wearing gloves for as long as possible', 'Drying hands thoroughly and using the moisturiser provided', 'Washing in very hot water', 'Ignoring early redness'], correct: 1 },
    { id: 'q23', text: 'When is eye protection needed?', options: ['Never', 'Only for visitors', 'Only outdoors', 'When there is a risk of splashes, such as decanting or cleaning up spills'], correct: 3 },
    { id: 'q24', text: 'You find a small hole in a glove before a chemical task. You should:', options: ['Replace it with a new glove', 'Use it anyway', 'Tape over the hole', 'Wear it inside out'], correct: 0 },
    // Section 7. Body fluids, water and medicines
    { id: 'q25', text: 'Blood and body fluids should be treated as:', options: ['Safe if they look clean', 'Potentially infectious', 'Only hazardous at night', 'Not covered by COSHH'], correct: 1 },
    { id: 'q26', text: 'Which of these helps control Legionella?', options: ['Using bottled water only', 'Keeping hot water lukewarm', 'Leaving showers unused for weeks', 'Running rarely used taps and showers regularly'], correct: 3 },
    { id: 'q27', text: 'Cytotoxic medicines can harm staff through:', options: ['Only swallowing', 'Only needlesticks', 'Skin contact, breathing in particles, swallowing and the person\'s body fluids', 'Only if the person is unwell'], correct: 2 },
    { id: 'q28', text: 'Should you crush a tablet to make it easier to swallow?', options: ['Yes, always', 'Yes, if the person asks', 'Only if a pharmacist has advised it is safe and how', 'Yes, for cytotoxic tablets'], correct: 2 },
    // Section 8. Spills, exposure and emergencies
    { id: 'q29', text: 'Disinfectant splashes into a colleague\'s eye. What do you do first?', options: ['Rinse the eye with plenty of clean water or eyewash', 'Cover the eye with a dry pad', 'Tell them to rub it', 'Wait to see if it improves'], correct: 0 },
    { id: 'q30', text: 'When containing a spill, you should work:', options: ['From the middle outwards', 'From the outside in', 'In any direction', 'Only with bare hands'], correct: 1 },
    { id: 'q31', text: 'If a doctor diagnoses occupational dermatitis linked to work, the employer must:', options: ['Report it to the HSE under RIDDOR', 'Do nothing', 'Tell the local newspaper', 'Dismiss the worker'], correct: 0 },
    { id: 'q32', text: 'A large spill is giving off strong fumes. You should:', options: ['Leave the area, close the door and get help', 'Clean it up alone quickly', 'Add water to dilute it', 'Cover it with a towel and carry on'], correct: 0 },
  ],
}
