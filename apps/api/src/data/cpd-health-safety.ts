// General Health & Safety Awareness: Annual Refresher. Full course content for CPD submission.
//
// Framework: Skills for Care, Statutory and mandatory training guide for adult
// social care employers (December 2025), health and safety awareness row. Its
// headings (your own and others' responsibilities; risk assessment; hazardous
// substances; security measures; own mental health and personal wellbeing;
// and, where staff do not take formal first aid training, types of accidents
// and sudden illness and what can and cannot be done in response) are mapped
// section by section in the timings table. Practice content follows the Health
// and Safety Executive's guidance for health and social care services.
// Knowledge only: no observed practical.
//
// Timings total 60 minutes. Applied to the tier='cpd' module by
// scripts/apply-cpd-course.ts; the prebuilt tier is never touched.

import type { CpdCourse } from './cpd-course-types'

export const CPD_HEALTH_SAFETY: CpdCourse = {
  module_id: 'ea5ac200-ed00-4a30-82c2-b28f632e661c',
  name: 'General Health & Safety Awareness: Annual Refresher',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: false,
  description:
    'Annual health and safety refresher for everyone working in adult social care, in care homes, people\'s own ' +
    'homes, supported living and day services. Built on the Skills for Care statutory and mandatory training ' +
    'guide and Health and Safety Executive guidance for health and social care, it covers your legal duties, ' +
    'risk assessment, common hazards in care, hazardous substances, security and lone working, work related ' +
    'stress and your own wellbeing, responding to accidents and sudden illness, and reporting. Eight lessons ' +
    'with scenarios and activities, then a final assessment.',
  entry_requirements:
    'Foundation level. For all care, support, domestic, catering and maintenance staff in any adult social care ' +
    'setting. No prior qualification is needed. It refreshes existing knowledge and does not replace formal ' +
    'first aid, fire safety, moving and handling or COSHH training where your role requires them.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check so your learning gain can be measured, and ' +
    'finish with a 32 question assessment with a pass mark of 80%. Skills for Care recommends refreshing health ' +
    'and safety at least every three years; this course is designed to be taken every year.',
  outcomes: [
    'Explain the health and safety duties of employers and employees, and your own responsibilities at work',
    'Describe the five steps of risk assessment and apply them to everyday situations in care',
    'Identify common hazards in care settings, including hot water, windows, slips and trips, and hazardous substances',
    'Apply security and lone working measures that keep you and the people you support safe',
    'Recognise signs of work related stress and know how to look after your own mental health and wellbeing',
    'Know what you can and cannot do when someone has an accident or sudden illness, and how to record and report it',
  ],
  key_points: [
    'Your employer must keep you safe; you must take reasonable care of yourself and others and cooperate',
    'Risk assessment: identify hazards, assess risks, control them, record findings, review',
    'Bath and shower water no hotter than 44°C; window openings restricted to 100 mm',
    'Never mix chemicals, keep them in their original containers, and follow the safety data sheet',
    'Check identity, keep doors and codes secure, and follow your lone working procedure',
    'Work related stress is a health and safety issue: talk to your manager and use the support available',
    'In an emergency, keep yourself safe, call for help and 999, and act only within your training',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. Your own and others\' responsibilities: health and safety law', minutes: 5 },
    { part: 'Section 2. Risk assessment', minutes: 5 },
    { part: 'Section 3. Risk assessment in practice: common hazards in care settings', minutes: 5 },
    { part: 'Section 4. Hazardous substances', minutes: 5 },
    { part: 'Section 5. Security measures and lone working', minutes: 5 },
    { part: 'Section 6. Own mental health and personal wellbeing: stress, violence and aggression', minutes: 5 },
    { part: 'Section 7. Types of accidents and sudden illness, and what you can and cannot do', minutes: 5 },
    { part: 'Section 8. Procedures to follow: recording and reporting accidents and incidents', minutes: 4 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'Under health and safety law, employees must:', options: ['Do nothing, safety is the employer\'s job', 'Take reasonable care of themselves and others and cooperate with their employer', 'Buy their own safety equipment', 'Carry out all risk assessments'], correct: 1 },
    { id: 'pc2', text: 'What is the maximum safe temperature for bath water for people at risk of scalding?', options: ['38°C', '44°C', '50°C', '60°C'], correct: 1 },
    { id: 'pc3', text: 'What is the first step of risk assessment?', options: ['Review the controls', 'Record your findings', 'Identify the hazards', 'Buy equipment'], correct: 2 },
    { id: 'pc4', text: 'What does the F in the stroke check FAST stand for?', options: ['Fever', 'Face', 'Fall', 'Feet'], correct: 1 },
    { id: 'pc5', text: 'A near miss is:', options: ['An accident with a serious injury', 'An event that could have caused harm but did not', 'A late visit', 'A complaint'], correct: 1 },
  ],
  sections: [
    {
      heading: 'Health and safety law and your responsibilities',
      minutes: 5,
      body:
        'Health and safety law protects everyone in a care setting: staff, the people you support, visitors and contractors. The main law is the Health and Safety at Work etc. Act 1974. It places a duty on employers to ensure, so far as is reasonably practicable, the health, safety and welfare of their employees and of others affected by their work. That includes safe systems of work, safe equipment and premises, information, instruction, training and supervision, and a written health and safety policy where there are five or more employees.\n\n' +
        'Employees have duties too. You must take reasonable care of your own health and safety and that of others affected by what you do or do not do. You must cooperate with your employer on health and safety, and you must not interfere with or misuse anything provided for safety, such as fire equipment, bed rails or window restrictors. In practice that means following the procedures, risk assessments and training you have been given, using equipment only if you are trained, wearing the protective equipment provided, and reporting hazards, faults and incidents.\n\n' +
        'The Management of Health and Safety at Work Regulations 1999 require employers to assess risks and put controls in place. Other regulations cover manual handling, hazardous substances, work equipment, electricity, fire and reporting of injuries. In England, the Care Quality Commission regulates the safety of people receiving care in registered services, including safe care and treatment under Regulation 12 and safe premises and equipment under Regulation 15, while the Health and Safety Executive and local authorities enforce health and safety for workers.\n\n' +
        'In people\'s own homes, the home belongs to the person, but your employer still has to assess the risks to you, and you still follow safe working practices. Health and safety is not about stopping people doing things they enjoy. It is about managing risks sensibly so that people can live as independently and fully as possible.',
      scenario: {
        situation: 'You notice that the window restrictor in a first floor bedroom has been removed. A colleague says the resident asked for more fresh air, so they took it off.',
        prompt: 'What should you do?',
        answer: 'Removing a window restrictor is interfering with a safety measure, which employees must not do. Make the room safe straight away, for example by closing the window, and report it to the senior on duty so the restrictor is refitted today. Talk with the resident about other ways to get fresh air, such as a fan or time outside, and make sure the colleague understands why restrictors matter. Record what happened.',
      },
      check: {
        question: 'Which of these is a legal duty of employees?',
        options: ['Writing the health and safety policy', 'Carrying out fire risk assessments', 'Taking reasonable care of themselves and others and cooperating with their employer', 'Buying their own protective equipment'],
        correct: 2,
        explanation: 'Employees must take reasonable care of themselves and others, cooperate with their employer, and not misuse anything provided for safety. The policy and risk assessments are the employer\'s duty.',
      },
      image_prompt: 'A care home corridor with a health and safety law poster on the wall and a care worker checking a window restrictor on a first floor bedroom window, sunlight coming in.',
      image_alt: 'A care worker checking a window restrictor on a bedroom window',
    },
    {
      heading: 'Risk assessment',
      minutes: 5,
      body:
        'A hazard is anything with the potential to cause harm, such as a wet floor, a hot tap, a chemical or an aggressive dog in someone\'s home. A risk is the chance that someone will be harmed by that hazard, and how serious the harm could be. Risk assessment is simply a careful look at what could cause harm, so that sensible precautions can be put in place.\n\n' +
        'The Health and Safety Executive describes five steps. First, identify the hazards: walk around, think about the tasks, the people and the equipment, and look at past accidents. Second, decide who might be harmed and how: staff, the people you support, visitors, and anyone at particular risk, such as someone with dementia, a new or expectant mother, or a young worker. Third, evaluate the risks and decide on controls. Fourth, record your findings and put them into practice. Fifth, review the assessment regularly, and whenever something changes, such as a person\'s needs, the environment or after an incident.\n\n' +
        'Controls follow a hierarchy. The best option is to remove the hazard altogether. If that is not possible, replace it with something less hazardous, then use engineering controls such as thermostatic mixer valves or window restrictors, then safe systems of work, training and signs, and finally personal protective equipment, which is the last line of defence.\n\n' +
        'In care there are two kinds of risk assessment. Workplace assessments cover the premises and tasks. Individual assessments in each person\'s care plan cover things like falls, moving and handling, bed rails and choices the person makes. These should support positive risk taking: a person with capacity has the right to make choices that carry some risk, and the aim is to reduce the risk while respecting what matters to them, not to wrap them in cotton wool. You may not write risk assessments, but you must read, follow and help keep them up to date, and report when something has changed.',
      scenario: {
        situation: 'Mrs Grant, who has good capacity, wants to make her own cup of tea in the unit kitchenette each afternoon. Her hands have become shaky and last week she spilt some hot water.',
        prompt: 'How should the risk be managed?',
        answer: 'Report the change so her individual risk assessment can be reviewed with her. Positive risk taking means finding ways for her to keep doing what matters to her more safely, not simply stopping her. Options might include a kettle tipper, a lighter kettle filled only partly, an insulated cup with a lid, or someone nearby at that time. Agree the plan with her, record it in her care plan, and review it if things change.',
      },
      check: {
        question: 'What is the difference between a hazard and a risk?',
        options: ['There is no difference', 'A risk is always worse than a hazard', 'A hazard can cause harm; risk is the chance and seriousness of that harm', 'Hazards only exist in kitchens'],
        correct: 2,
        explanation: 'A hazard is anything that could cause harm. Risk is how likely it is that someone will be harmed, and how badly. Risk assessment is about reducing risk to an acceptable level.',
      },
      image_prompt: 'A senior care worker and an older woman sitting together at a kitchen table reviewing a care plan document with a pen, a kettle and a lidded mug on the counter behind them, collaborative and friendly.',
      image_alt: 'A senior care worker and an older woman reviewing a care plan together at a kitchen table',
    },
    {
      heading: 'Common hazards in care settings',
      minutes: 5,
      body:
        'Slips, trips and falls are among the most common causes of injury at work and a major cause of harm to the people you support. Clear up spills straight away and use a wet floor sign, keep walkways and stairs clear of trolleys, bags and cables, report damaged flooring and poor lighting, and wear sensible, closed footwear.\n\n' +
        'Hot water and hot surfaces can cause serious scalds and burns to people who cannot feel heat properly or move away quickly. The Health and Safety Executive advises that where people are at risk, baths and showers should have thermostatic mixer valves so water delivered does not exceed 44°C. Always check the water temperature with a thermometer before someone gets into a bath, and never leave a person alone in a bath unless their risk assessment says it is safe. Radiators and pipes that could cause burns should be covered or kept at safe surface temperatures.\n\n' +
        'Falls from windows have caused deaths in care settings. Windows above ground floor that are large enough for someone to fall through should have their opening restricted to 100 mm or less, with restrictors that can only be released with a special tool or key. Report any restrictor that is missing, broken or can be undone by hand.\n\n' +
        'Other hazards include electrical equipment (check plugs and leads before use, never use damaged items, and do not overload sockets), bed rails (only used after a risk assessment, correctly fitted to that bed and mattress), manual handling (use the equipment and methods in the person\'s plan and your moving and handling training), sharps, and Legionella bacteria in water systems (outlets that are rarely used are run regularly). In people\'s own homes, look out for trailing rugs, poor lighting, gas smells, faulty appliances, pets and cluttered access, and report them.\n\n' +
        'If you spot a hazard, deal with it if it is safe and within your role, then report it so it is fixed properly.',
      scenario: {
        situation: 'You are about to help Mr Singh, who has reduced feeling in his legs, into the bath. The water looks steamy and the bath thermometer is missing.',
        prompt: 'What do you do?',
        answer: 'Do not put him in the bath. Without a thermometer you cannot confirm the temperature is at or below 44°C, and his reduced sensation means he may not feel a scald. Find a thermometer or let the water cool and check it, and report the missing thermometer and the steamy water, as the thermostatic mixer valve may not be working. If the valve is faulty, report it urgently so no one else is put at risk.',
      },
      check: {
        question: 'Above ground floor, window openings should be restricted to:',
        options: ['100 mm or less', '300 mm', 'Half the window', 'No restriction'],
        correct: 0,
        explanation: 'HSE guidance says windows large enough to fall through should be restricted to 100 mm or less, with restrictors that need a special tool or key to release.',
      },
      image_prompt: 'A care worker checking bath water with a bath thermometer in a care home bathroom, a thermostatic mixer tap on the bath, a wet floor sign by the door, bright and clean.',
      image_alt: 'A care worker checking bath water with a thermometer before a bath',
    },
    {
      heading: 'Hazardous substances',
      minutes: 5,
      body:
        'Many products used in care can harm health if they are not used correctly: cleaning chemicals, disinfectants, bleach, descalers, dishwasher and laundry products, some medicines, and body fluids that may carry infection. The Control of Substances Hazardous to Health Regulations 2002, known as COSHH, require your employer to assess the risks from these substances and put controls in place. Your separate COSHH course covers this in more depth; this section covers what every worker needs to know.\n\n' +
        'Harm happens through breathing in fumes or dust, contact with skin or eyes, swallowing, or entry through cuts and needlestick injuries. Effects range from irritation, dermatitis and asthma to burns, poisoning and, for some substances, long term illness.\n\n' +
        'Read the label before you use any product. Hazard pictograms, red bordered diamonds, show the main dangers, such as corrosive, harmful or flammable. Every product has a safety data sheet, and your workplace has a COSHH assessment for each substance that tells you how to use, store and dispose of it and what protective equipment to wear.\n\n' +
        'Use only the products you have been trained to use, at the right dilution, for the right job. Wear the gloves, apron and eye protection specified. Never mix products: bleach mixed with some other cleaners, including those containing acids or ammonia, releases toxic gas. Keep products in their original, labelled containers, and never decant them into drinks bottles or cups. Store them in a locked cupboard, away from food, because a person with dementia may drink a cleaning product or handrub believing it is a drink. Close lids straight away and never leave a trolley unattended.\n\n' +
        'If a substance is spilt, splashed or swallowed, follow the first aid on the safety data sheet, get help, and report it. If someone has swallowed a hazardous product, call 999 or NHS 111 and have the container with you.',
      scenario: {
        situation: 'You find a cleaning trolley left unattended in the dementia unit lounge, with a bottle of disinfectant open. A resident is holding a plastic cup and walking towards it.',
        prompt: 'What should you do?',
        answer: 'Act straight away: calmly move between the resident and the trolley, close the bottle and move the trolley somewhere safe. Check whether the resident has swallowed anything. If they might have, get help immediately, follow the safety data sheet first aid, and call 999 or NHS 111 with the product in hand. Report the unattended trolley so the practice is addressed, and record what happened.',
      },
      check: {
        question: 'Why must cleaning products never be decanted into drinks bottles or cups?',
        options: ['Someone may drink them believing it is a drink', 'They lose their strength', 'It is untidy', 'It wastes product'],
        correct: 0,
        explanation: 'Products in unlabelled or drinks containers can be mistaken for drinks, especially by people with dementia or visual impairment. Keep substances in their original labelled containers.',
      },
      image_prompt: 'A care worker locking a cleaning cupboard containing neatly labelled bottles with red diamond hazard symbols, wearing gloves, a safety data sheet folder on a shelf inside the cupboard.',
      image_alt: 'A care worker locking a cupboard of labelled cleaning products with hazard symbols',
    },
    {
      heading: 'Security and lone working',
      minutes: 5,
      body:
        'Security protects the people you support, their belongings and their information, and it protects you. In a care home, follow your procedures for doors, keypads and visitors: check the identity of anyone you do not know, make sure visitors sign in and out, never share door codes, and do not let people follow you through a secure door. Wear your identity badge. Report anyone acting suspiciously, doors or windows that do not lock, and missing keys. Keep medicines, records and personal belongings secure, and log people\'s valuables in line with your policy.\n\n' +
        'Some people you support may be at risk if they leave the building unaccompanied, while others have every right to come and go. Follow each person\'s care plan, and never lock someone in or restrict their freedom without the proper legal authority, such as a Deprivation of Liberty authorisation.\n\n' +
        'In people\'s own homes, keep key safe codes confidential and store keys securely, close doors and windows behind you, and check people\'s homes are secure when you leave. Be alert to scams and bogus callers targeting the people you support, and report concerns.\n\n' +
        'Lone working is common in home care, supported living and on night shifts. Your employer must assess the risks to lone workers and put controls in place. Follow the lone working procedure, which usually includes logging in and out of visits, keeping your phone charged, telling the office if you are running late or plans change, and a way to raise the alarm. Before a visit, read the risk information about the home and the person. Trust your instincts: if you arrive and feel unsafe, for example because of an aggressive visitor, a loose dog or signs of drug use, do not go in. Leave, get to a safe place and contact your office or, in an emergency, call 999. Park in well lit areas, keep valuables out of sight, and never put yourself at risk to complete a visit.',
      scenario: {
        situation: 'You arrive for an evening home care visit. Through the window you can see an unknown man shouting and throwing things, and the person you support looks frightened. No one has answered the door.',
        prompt: 'What do you do?',
        answer: 'Do not go in: your safety comes first. Move to a safe place, and because the person you support may be in danger, call 999. Then contact your office or on call manager, following your lone working procedure. Record what you saw and heard. Afterwards, a safeguarding concern should be raised, as the person may be experiencing abuse.',
      },
      check: {
        question: 'Someone you do not recognise asks you to let them through a keypad door. What should you do?',
        options: ['Let them in if they look friendly', 'Ignore them', 'Tell them the door code', 'Check who they are and follow the visitor procedure'],
        correct: 3,
        explanation: 'Always check identity and follow the visitor procedure, including signing in. Never share codes or let people follow you through a secure door.',
      },
      image_prompt: 'A home care worker standing outside a front door at dusk holding a charged mobile phone showing a check in screen without readable text, a lanyard ID badge visible, a lit porch light, calm and alert posture.',
      image_alt: 'A home care worker with an ID badge checking in on their phone outside a front door',
    },
    {
      heading: 'Stress, violence and your wellbeing',
      minutes: 5,
      body:
        'Your own mental health and wellbeing are part of health and safety. Care work is rewarding, but it can be physically and emotionally demanding, with shift work, heavy workloads, difficult situations and bereavement. Work related stress is the harmful reaction people have to excessive pressure, and employers have a legal duty to assess and manage the risk of it.\n\n' +
        'The Health and Safety Executive\'s Management Standards describe six areas that, if not managed well, can cause stress: demands, such as workload and working patterns; control over how you do your work; support from managers and colleagues; relationships at work, including bullying; role, and whether you understand it; and change, and how it is managed and communicated.\n\n' +
        'Signs of stress include poor sleep, tiredness, irritability, headaches, difficulty concentrating, feeling overwhelmed, withdrawing from colleagues, drinking more and taking more time off. Notice them in yourself and in others. Talk to your manager early, use supervision to raise concerns about workload, take your breaks, and find out what your employer offers, such as an employee assistance programme. Look after the basics: sleep, food, activity and time with people you care about.\n\n' +
        'Violence and aggression towards staff must never be accepted as part of the job. Some people you support may hit out because of confusion, pain or fear, and understanding the reasons helps prevent it: follow their care plan and positive behaviour support strategies, approach calmly, and give space. Visitors and relatives can also be aggressive. Keep yourself safe, move away and get help if needed. Report every incident, including verbal abuse and threats, however minor, so that risks can be assessed, plans reviewed and you can be supported. Your employer should offer support after an incident, and you can also access help from your GP.\n\n' +
        'Looking after your wellbeing is not selfish. It keeps you safe and able to provide good care.',
      scenario: {
        situation: 'For several weeks you have been covering extra shifts. You are sleeping badly, snapping at colleagues and feel dread before work. You worry that saying anything will look like you cannot cope.',
        prompt: 'What should you do?',
        answer: 'Recognise these as signs of work related stress, which is a health and safety issue, not a personal failing. Talk to your manager or raise it in supervision, being specific about the extra shifts and how you are feeling, so your workload can be reviewed. Use the support your employer offers, such as an employee assistance programme, take your breaks and rest days, and speak to your GP if it continues. Asking for help early protects you and the people you care for.',
      },
      check: {
        question: 'Which of these is one of the six areas of the HSE Management Standards for work related stress?',
        options: ['Pay', 'Holidays abroad', 'Uniform', 'Demands'],
        correct: 3,
        explanation: 'The six areas are demands, control, support, relationships, role and change. Managing them well reduces work related stress.',
      },
      image_prompt: 'A care worker and their manager having a supportive one to one conversation in a quiet office with cups of tea, the care worker looking relieved, a window with plants, warm and calm.',
      image_alt: 'A care worker talking with their manager in a supportive one to one meeting',
    },
    {
      heading: 'Accidents and sudden illness',
      minutes: 5,
      body:
        'Accidents and sudden illness can happen at any time: falls, cuts, burns and scalds, choking, fractures, fainting, seizures, heart attack, stroke, a severe allergic reaction or a very low blood sugar in someone with diabetes. What you do in the first few minutes matters, and it must stay within your training.\n\n' +
        'First, make sure the area is safe for you and the person; do not become a second casualty. Check whether they respond, shout for help and call a first aider or the senior on duty. Call 999 for anyone who is unresponsive, not breathing normally, has chest pain, severe bleeding, a suspected serious injury, a seizure lasting more than five minutes, signs of anaphylaxis or signs of a stroke. Use FAST to spot a stroke: Face drooping, Arms weak or unable to lift, Speech slurred, Time to call 999.\n\n' +
        'Things you can do if you are trained include placing someone in the recovery position, basic life support and using a defibrillator, using an adrenaline auto injector prescribed for that person, applying pressure to a bleeding wound, cooling a burn under cool running water for 20 minutes, and giving back blows and abdominal thrusts for choking. Things you must not do include giving medicines that are not prescribed or covered by your training, giving food or drink to someone who may need surgery or is drowsy, moving someone who may have a head, neck or back injury or a fracture unless they are in danger, and lifting a person up from the floor by hand. After a fall, follow your post falls procedure: check for injury before any move, and use the right equipment, such as an inflatable lifting cushion or hoist.\n\n' +
        'Respect the person\'s wishes, including any advance decision or DNACPR decision recorded in their plan, and share this with paramedics. Stay with the person, reassure them, and keep observing until help arrives.',
      scenario: {
        situation: 'You find Mrs Evans on the floor of her bedroom. She is conscious but says her hip hurts badly and her leg looks shorter and turned out. She asks you to help her back into her chair.',
        prompt: 'What do you do?',
        answer: 'Do not move her or lift her. A shortened, turned out leg with hip pain suggests a hip fracture. Reassure her, call for help and ask for a first aider or the senior, and call 999. Keep her warm and comfortable where she is, with a pillow and blanket, do not give food or drink, and stay with her, observing her until paramedics arrive. Then record the fall and report it in line with your procedure.',
      },
      check: {
        question: 'In FAST, what does the T stand for?',
        options: ['Temperature', 'Time to call 999', 'Tablets', 'Talk later'],
        correct: 1,
        explanation: 'FAST is Face, Arms, Speech, Time to call 999. A stroke is an emergency, and fast treatment saves brain tissue.',
      },
      image_prompt: 'A care worker kneeling beside an older woman lying on a bedroom floor with a pillow under her head and a blanket over her, the care worker holding her hand and speaking on a phone, calm and reassuring.',
      image_alt: 'A care worker reassuring an older woman on the floor with a blanket while calling for help',
    },
    {
      heading: 'Recording and reporting',
      minutes: 4,
      body:
        'Every accident, incident and near miss should be recorded and reported through your workplace\'s procedure, usually an accident book or electronic incident system. A near miss is an event that could have caused harm but did not, such as a resident nearly slipping on a spill. Near misses matter because they show where the next accident is likely to happen. Record the facts: date, time, place, who was involved, what happened, any injury, what you did, and who you told. Write it as soon as possible, accurately, and without blame or guesswork.\n\n' +
        'Some incidents must also be reported to the Health and Safety Executive under the Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013, known as RIDDOR. Your employer, not you, makes these reports. They include work related deaths, specified serious injuries to workers such as fractures other than fingers and toes, injuries that keep a worker off normal duties for more than seven days, some occupational diseases, and dangerous occurrences such as the collapse of lifting equipment. For people receiving care in a CQC registered service in England, serious injuries and other events are notified to the Care Quality Commission by the registered manager. Safeguarding concerns are reported through your safeguarding procedure.\n\n' +
        'Reporting is how an organisation learns. After an incident, risk assessments and care plans are reviewed, equipment is repaired, training is updated and the person\'s family is informed where appropriate, in line with the duty of candour. You should feel able to report without fear. If you raise a genuine concern about health and safety and it is ignored, you can use your employer\'s whistleblowing procedure, and the law protects workers who raise concerns in the public interest.\n\n' +
        'If you are hurt at work, however minor it seems, report it and record it. It protects you if the injury later turns out to be more serious.',
      scenario: {
        situation: 'You slip on a wet patch by the laundry door but catch yourself on the wall without falling. There was no sign out. A colleague says there is no point reporting it as nobody was hurt.',
        prompt: 'What should you do?',
        answer: 'Report it as a near miss and record it. No one was hurt this time, but the next person, perhaps a resident, might be. Put out a wet floor sign or deal with the spill now if it is safe, and tell the senior. The report lets the cause be found, such as a leaking machine or a gap in the cleaning routine, so it can be fixed before someone is injured.',
      },
      check: {
        question: 'Who makes RIDDOR reports to the Health and Safety Executive?',
        options: ['Any care worker', 'The employer or responsible person', 'The injured person\'s family', 'The local newspaper'],
        correct: 1,
        explanation: 'RIDDOR reports are made by the employer or person in control of the premises. Your role is to record and report every incident promptly through your workplace\'s procedure.',
      },
      image_prompt: 'A care worker filling in an accident and incident report form on a tablet at a nurses station, a wet floor sign and a small puddle visible in the corridor behind them.',
      image_alt: 'A care worker recording an incident on a tablet, with a wet floor sign in the corridor behind',
    },
  ],
  activities: [
    {
      id: 'hs-act-1', type: 'sort', after_section: 0,
      title: 'Whose duty?',
      instructions: 'Sort each duty. Does it belong mainly to the employer or to the employee?',
      bins: [
        { id: 'employer', name: 'Employer', note: 'Provides and manages safety' },
        { id: 'employee', name: 'Employee', note: 'Takes care and cooperates' },
      ],
      items: [
        { text: 'Writing a health and safety policy', bin: 'employer' },
        { text: 'Carrying out workplace risk assessments', bin: 'employer' },
        { text: 'Providing training and protective equipment', bin: 'employer' },
        { text: 'Following the training and procedures you are given', bin: 'employee' },
        { text: 'Not interfering with window restrictors or fire equipment', bin: 'employee' },
        { text: 'Reporting hazards and incidents', bin: 'employee' },
      ],
    },
    {
      id: 'hs-act-2', type: 'order', after_section: 1,
      title: 'Five steps to risk assessment',
      instructions: 'Put the HSE steps of risk assessment into order.',
      steps: [
        'Identify the hazards',
        'Decide who might be harmed and how',
        'Evaluate the risks and decide on controls',
        'Record your findings and put them into practice',
        'Review the assessment regularly and when things change',
      ],
    },
    {
      id: 'hs-act-3', type: 'match', after_section: 2,
      title: 'Hazards and controls',
      instructions: 'Match each hazard to a control that reduces the risk.',
      pairs: [
        { term: 'Scalding from bath water', definition: 'Thermostatic mixer valve and checking with a thermometer' },
        { term: 'Falls from upstairs windows', definition: 'Restrictors limiting the opening to 100 mm or less' },
        { term: 'Slips on a wet floor', definition: 'Clearing the spill straight away and using a sign' },
        { term: 'Electric shock', definition: 'Checking plugs and leads and not using damaged items' },
        { term: 'Legionella in water', definition: 'Running rarely used outlets regularly' },
      ],
    },
    {
      id: 'hs-act-4', type: 'sort', after_section: 3,
      title: 'Safe or unsafe with chemicals?',
      instructions: 'Sort each practice with hazardous substances.',
      bins: [
        { id: 'safe', name: 'Safe practice', note: 'Follows COSHH controls' },
        { id: 'unsafe', name: 'Unsafe practice', note: 'Could cause harm' },
      ],
      items: [
        { text: 'Keeping products in their original labelled containers', bin: 'safe' },
        { text: 'Wearing the gloves specified on the COSHH assessment', bin: 'safe' },
        { text: 'Locking products away from food and residents', bin: 'safe' },
        { text: 'Mixing bleach with another cleaner to make it stronger', bin: 'unsafe' },
        { text: 'Pouring disinfectant into an empty squash bottle', bin: 'unsafe' },
        { text: 'Leaving the cleaning trolley in the lounge while you answer a call bell', bin: 'unsafe' },
      ],
    },
    {
      id: 'hs-act-5', type: 'order', after_section: 4,
      title: 'Feeling unsafe on a lone visit',
      instructions: 'Put the actions into order when you arrive at a home visit and feel unsafe.',
      steps: [
        'Trust your instincts and do not go in',
        'Move to a safe place',
        'Call 999 if anyone is in immediate danger',
        'Contact your office or on call manager',
        'Record what you saw and heard',
        'Raise a safeguarding concern if the person may be at risk',
      ],
    },
    {
      id: 'hs-act-6', type: 'match', after_section: 5,
      title: 'The six Management Standards',
      instructions: 'Match each area of the HSE Management Standards to an example.',
      pairs: [
        { term: 'Demands', definition: 'Workload, shift patterns and the work environment' },
        { term: 'Control', definition: 'How much say you have in how you do your work' },
        { term: 'Support', definition: 'Encouragement and resources from managers and colleagues' },
        { term: 'Relationships', definition: 'Positive working and dealing with bullying' },
        { term: 'Role', definition: 'Understanding what is expected of you' },
        { term: 'Change', definition: 'How changes at work are managed and communicated' },
      ],
    },
    {
      id: 'hs-act-7', type: 'sort', after_section: 6,
      title: 'Can or cannot?',
      instructions: 'Sort each action after an accident or sudden illness. Assume you have had the usual care worker training.',
      bins: [
        { id: 'can', name: 'You can do this', note: 'Within usual training' },
        { id: 'cannot', name: 'Do not do this', note: 'Unsafe or outside your role' },
      ],
      items: [
        { text: 'Call 999 for suspected stroke using FAST', bin: 'can' },
        { text: 'Cool a burn under cool running water for 20 minutes', bin: 'can' },
        { text: 'Stay with the person and reassure them', bin: 'can' },
        { text: 'Lift a person with a suspected hip fracture back into their chair', bin: 'cannot' },
        { text: 'Give paracetamol that is not prescribed for them', bin: 'cannot' },
        { text: 'Give a drink to someone who may need surgery', bin: 'cannot' },
      ],
    },
    {
      id: 'hs-act-8', type: 'match', after_section: 7,
      title: 'Who reports what?',
      instructions: 'Match each type of report to where it goes.',
      pairs: [
        { term: 'A near miss', definition: 'Your workplace\'s accident or incident system' },
        { term: 'A worker off normal duties for more than seven days after an injury', definition: 'The HSE under RIDDOR, by the employer' },
        { term: 'A serious injury to a person receiving care in a registered service', definition: 'The CQC, notified by the registered manager' },
        { term: 'Suspected abuse', definition: 'Your safeguarding procedure' },
        { term: 'A concern about safety that is being ignored', definition: 'Your whistleblowing procedure' },
      ],
    },
  ],
  references: [
    { title: 'Statutory and mandatory training guide for adult social care employers (December 2025)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf', source: 'Skills for Care', note: 'The framework this course is mapped to. Its health and safety awareness row sets the expected content, including accidents and sudden illness for staff without formal first aid training.' },
    { title: 'Health and social care services', url: 'https://www.hse.gov.uk/healthservices/index.htm', source: 'Health and Safety Executive', note: 'The HSE\'s guidance hub for care, covering the main risks to staff and people receiving care, and who regulates what.' },
    { title: 'Health and Safety at Work etc. Act 1974', url: 'https://www.legislation.gov.uk/ukpga/1974/37/contents', source: 'legislation.gov.uk', note: 'The main health and safety law, setting out the duties of employers and employees described in section 1.' },
    { title: 'Managing risks and risk assessment at work', url: 'https://www.hse.gov.uk/simple-health-safety/risk/steps-needed-to-manage-risk.htm', source: 'Health and Safety Executive', note: 'The HSE\'s steps for identifying hazards and controlling risk, the basis for section 2.' },
    { title: 'Scalding and burning in health and social care', url: 'https://www.hse.gov.uk/healthservices/scalding-burning.htm', source: 'Health and Safety Executive', note: 'Why water delivered to baths and showers for people at risk should not exceed 44°C, and how thermostatic mixer valves are used.' },
    { title: 'Falls from windows or balconies in health and social care', url: 'https://www.hse.gov.uk/healthservices/falls-windows.htm', source: 'Health and Safety Executive', note: 'The 100 mm window restriction and the requirement that restrictors can only be released with a tool or key.' },
    { title: 'Work related stress: the Management Standards', url: 'https://www.hse.gov.uk/stress/standards/', source: 'Health and Safety Executive', note: 'The six areas of work design that affect stress, used in section 6.' },
    { title: 'Protecting lone workers', url: 'https://www.hse.gov.uk/lone-working/', source: 'Health and Safety Executive', note: 'What employers must do to assess and control the risks to people who work alone, including home care staff.' },
    { title: 'RIDDOR: reporting of injuries, diseases and dangerous occurrences', url: 'https://www.hse.gov.uk/riddor/', source: 'Health and Safety Executive', note: 'Which work related incidents employers must report to the HSE, and how.' },
    { title: 'Stroke: symptoms', url: 'https://www.nhs.uk/conditions/stroke/symptoms/', source: 'NHS', note: 'The FAST test for recognising a stroke and why calling 999 straight away matters.' },
  ],
  glossary: [
    { term: 'Hazard', definition: 'Anything with the potential to cause harm.' },
    { term: 'Risk', definition: 'The chance that someone will be harmed by a hazard, and how serious the harm could be.' },
    { term: 'Risk assessment', definition: 'A careful look at what could cause harm, and the precautions needed to prevent it.' },
    { term: 'Positive risk taking', definition: 'Supporting people to do things that matter to them while managing the risks, rather than stopping them.' },
    { term: 'Thermostatic mixer valve', definition: 'A valve that mixes hot and cold water so it cannot come out hotter than a set temperature, such as 44°C.' },
    { term: 'COSHH', definition: 'The Control of Substances Hazardous to Health Regulations 2002.' },
    { term: 'Safety data sheet', definition: 'The manufacturer\'s information on a product\'s hazards, safe use, storage and first aid.' },
    { term: 'Lone worker', definition: 'Someone who works by themselves without close or direct supervision.' },
    { term: 'Work related stress', definition: 'The harmful reaction people have to excessive pressures or demands at work.' },
    { term: 'Near miss', definition: 'An event that could have caused harm or damage but did not.' },
    { term: 'RIDDOR', definition: 'The Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013.' },
    { term: 'FAST', definition: 'Face, Arms, Speech, Time to call 999: the check for a stroke.' },
  ],
  practical_checklist: [],
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. Health and safety law and your responsibilities
    { id: 'q1', text: 'Which is the main health and safety law in Great Britain?', options: ['The Care Act 2014', 'The Mental Capacity Act 2005', 'The Data Protection Act 2018', 'The Health and Safety at Work etc. Act 1974'], correct: 3 },
    { id: 'q2', text: 'Employers with five or more employees must have:', options: ['A staff gym', 'A written health and safety policy', 'An on site doctor', 'Nothing in writing'], correct: 1 },
    { id: 'q3', text: 'Removing a window restrictor because a resident wants fresh air is:', options: ['Interfering with a safety measure, which employees must not do', 'Good person centred care', 'Fine if the window is small', 'The manager\'s job only'], correct: 0 },
    { id: 'q4', text: 'In England, which body regulates the safety of people receiving care in registered services?', options: ['The Health and Safety Executive only', 'The Care Quality Commission', 'The Food Standards Agency', 'The police'], correct: 1 },
    // Section 2. Risk assessment
    { id: 'q5', text: 'A hazard is:', options: ['Anything with the potential to cause harm', 'The chance of harm', 'An accident report', 'A safety sign'], correct: 0 },
    { id: 'q6', text: 'Which step comes last in the HSE approach to risk assessment?', options: ['Review the assessment regularly and when things change', 'Record findings', 'Identify hazards', 'Decide who might be harmed'], correct: 0 },
    { id: 'q7', text: 'In the hierarchy of control, which comes last?', options: ['Removing the hazard', 'Engineering controls', 'Replacing it with something safer', 'Personal protective equipment'], correct: 3 },
    { id: 'q8', text: 'Positive risk taking means:', options: ['Ignoring risks', 'Stopping all risky activities', 'Supporting people to do what matters to them while managing the risks', 'Letting staff take risks'], correct: 2 },
    // Section 3. Common hazards in care settings
    { id: 'q9', text: 'Where people are at risk of scalding, water delivered to baths should not exceed:', options: ['38°C', '44°C', '50°C', '60°C'], correct: 1 },
    { id: 'q10', text: 'Window restrictors should be released:', options: ['Only with a special tool or key', 'By hand by anyone', 'Never, they are permanent', 'By residents when they want'], correct: 0 },
    { id: 'q11', text: 'You notice a plug with a cracked casing on a lamp. You should:', options: ['Use it carefully', 'Stop using it, label it faulty and report it', 'Tape it up', 'Move it to another room'], correct: 1 },
    { id: 'q12', text: 'Why are rarely used water outlets run regularly?', options: ['To save water', 'To clean the pipes of limescale', 'To test the boiler', 'To reduce the risk of Legionella bacteria'], correct: 3 },
    // Section 4. Hazardous substances
    { id: 'q13', text: 'Which document tells you how to use, store and dispose of a hazardous product safely?', options: ['The safety data sheet and COSHH assessment', 'The menu', 'The rota', 'The fire log'], correct: 0 },
    { id: 'q14', text: 'Why must you never mix bleach with other cleaning products?', options: ['It wastes bleach', 'It makes it weaker', 'It changes the colour', 'It can release toxic gas'], correct: 3 },
    { id: 'q15', text: 'Red bordered diamond symbols on a product label are:', options: ['Hazard pictograms showing its main dangers', 'Recycling symbols', 'Brand logos', 'Price labels'], correct: 0 },
    { id: 'q16', text: 'Someone may have swallowed a cleaning product. What should you do?', options: ['Make them sick', 'Get help, follow the safety data sheet first aid and call 999 or NHS 111 with the container', 'Give them milk and wait', 'Nothing unless they feel ill'], correct: 1 },
    // Section 5. Security and lone working
    { id: 'q17', text: 'A door code should be:', options: ['Shared with anyone who asks', 'Kept confidential and never shared', 'Written on the door', 'Told to visitors'], correct: 1 },
    { id: 'q18', text: 'Can you lock a resident in their room to stop them wandering?', options: ['Yes, if it is for their safety', 'Yes, at night', 'No, not without proper legal authority such as a DoLS authorisation', 'Yes, if the family agrees'], correct: 2 },
    { id: 'q19', text: 'You arrive at a home visit and feel unsafe. You should:', options: ['Go in anyway to finish the visit', 'Ask a neighbour to come in with you', 'Wait in the doorway', 'Not go in, get to a safe place and contact your office, or 999 in an emergency'], correct: 3 },
    { id: 'q20', text: 'Which is part of a typical lone working procedure?', options: ['Keeping your phone switched off', 'Not telling anyone where you are', 'Logging in and out of visits and telling the office if plans change', 'Working without a rota'], correct: 2 },
    // Section 6. Stress, violence and your wellbeing
    { id: 'q21', text: 'Work related stress is:', options: ['A personal weakness', 'Not covered by law', 'A health and safety issue employers must assess and manage', 'Only a problem for managers'], correct: 2 },
    { id: 'q22', text: 'Which of these is a sign of stress?', options: ['Sleeping well', 'Enjoying breaks', 'Irritability and difficulty concentrating', 'Feeling rested'], correct: 2 },
    { id: 'q23', text: 'A resident with dementia hits out at you during personal care. What should you do afterwards?', options: ['Ignore it, it is part of the job', 'Refuse to care for them again', 'Report and record it so the plan can be reviewed and you can be supported', 'Tell their family they are violent'], correct: 2 },
    { id: 'q24', text: 'Which of these helps protect your wellbeing at work?', options: ['Skipping breaks to get more done', 'Working every day off', 'Keeping problems to yourself', 'Using supervision to raise workload concerns'], correct: 3 },
    // Section 7. Accidents and sudden illness
    { id: 'q25', text: 'What is the first thing to check when you find someone who has had an accident?', options: ['The time', 'Their medicine chart', 'Whether the area is safe for you and them', 'Whether their family has been told'], correct: 2 },
    { id: 'q26', text: 'How long should a burn be cooled under cool running water?', options: ['1 minute', '5 minutes', '20 minutes', '1 hour'], correct: 2 },
    { id: 'q27', text: 'A person on the floor has hip pain and a shortened, turned out leg. You should:', options: ['Not move them, keep them warm, call for help and 999', 'Help them back into their chair', 'Give them painkillers', 'Ask them to try standing'], correct: 0 },
    { id: 'q28', text: 'Why should you not give food or drink to someone who may have a fracture?', options: ['It is against the rules at night', 'They may need surgery or an anaesthetic', 'It makes them sleepy', 'There is no reason'], correct: 1 },
    // Section 8. Recording and reporting
    { id: 'q29', text: 'Why should near misses be reported?', options: ['Only if a manager saw it', 'They are not important', 'Only to blame someone', 'They show where the next accident is likely to happen'], correct: 3 },
    { id: 'q30', text: 'Under RIDDOR, a worker injury must be reported by the employer when it keeps them off normal duties for more than:', options: ['One day', 'Three days', 'Seven days', 'One month'], correct: 2 },
    { id: 'q31', text: 'Serious injuries to people receiving care in a CQC registered service are notified to the CQC by:', options: ['The registered manager', 'Any care worker', 'The injured person', 'The GP'], correct: 0 },
    { id: 'q32', text: 'You are slightly hurt at work and feel fine. You should:', options: ['Say nothing', 'Record and report it in case it turns out to be more serious', 'Tell a colleague only', 'Report it next month'], correct: 1 },
  ],
}
