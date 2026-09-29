// Moving and Handling of People: Annual Refresher. Full course content for CPD submission.
//
// Framework: Skills for Care, Statutory and mandatory training guide for adult
// social care employers (December 2025), "assisting and moving people" row. Its
// headings (legislation, guidelines, policies, procedures and protocols; anatomy
// and physiology; risk management; moving and positioning people safely and with
// dignity; using equipment; what can and cannot be carried out within own
// responsibilities and when to seek advice) are mapped section by section in the
// timings table. Practice content follows HSE guidance for moving and handling in
// health and social care, the Manual Handling Operations Regulations 1992 and
// LOLER 1998. This is the knowledge component: the course also requires an
// observed practical assessment against the checklist below, every point met,
// signed off by the employer before the certificate is issued.
//
// Timings total 60 minutes. Applied to the tier='cpd' module by
// scripts/apply-cpd-course.ts; the prebuilt tier is never touched.

import type { CpdCourse } from './cpd-course-types'

export const MOVING_HANDLING_CHECKLIST: string[] = [
  'Checks the person\'s moving and handling plan and risk assessment before starting',
  'Explains the move to the person, gains their consent and involves them throughout',
  'Prepares the area: clears obstacles and checks the floor, lighting and the person\'s footwear',
  'Checks the equipment before use: undamaged, clean, within its safe working load, thorough examination in date and brakes working',
  'Selects the sling specified in the plan, checks its label for type, size and examination date, and fits it correctly',
  'Uses slide sheets correctly for repositioning in bed, and never uses a drag lift or lifts the person by hand',
  'Adopts a stable base, keeps the load close, bends the knees and avoids twisting or stooping',
  'When working with a colleague, agrees who leads and uses clear, agreed commands',
  'Encourages the person to do as much as they can for themselves',
  'Maintains the person\'s dignity and privacy throughout',
  'Stops and reassesses if the person shows pain, distress or resistance, or anything changes',
  'Leaves the person comfortable and safe with their call bell in reach, and records and reports as required',
]

export const CPD_MOVING_HANDLING: CpdCourse = {
  module_id: '469f93b9-654a-4075-885a-2910eb105814',
  name: 'Moving and Handling of People: Annual Refresher',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: true,
  description:
    'Annual moving and handling of people refresher for care workers who assist and move people in care homes, ' +
    'nursing homes, home care and supported living. Built on the Skills for Care statutory and mandatory ' +
    'training guide and Health and Safety Executive guidance, it covers the law, how backs are injured, risk ' +
    'assessment, safe handling principles, moving and positioning with dignity, hoists and slings, other ' +
    'equipment and falls, and the limits of your role. Eight lessons with scenarios and activities, a final ' +
    'assessment, then an observed practical assessment by your employer.',
  entry_requirements:
    'Foundation level. For care workers who assist and move people in any adult social care setting and have ' +
    'already had moving and handling induction training. The course is the knowledge component; the ' +
    'certificate is issued only after an observed practical assessment is signed off by the employer.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check, then finish with a 32 question assessment ' +
    'with a pass mark of 80%. Your manager or a suitably trained assessor then observes you moving people at work ' +
    'against a 12 point checklist; every point must be met before your certificate is issued.',
  outcomes: [
    'Explain the law and guidance on moving and handling people, and your own duties under it',
    'Describe how the spine works and how poor handling causes injury to workers and to the people being moved',
    'Use a moving and handling plan and the TILEO approach to recognise and reduce risk',
    'Apply the principles of safe handling when moving and positioning people, with dignity and consent',
    'Check and use hoists, slings and other equipment safely, and respond safely when someone has fallen',
    'Recognise what is and is not within your role, when to stop, and when to seek advice',
  ],
  key_points: [
    'Avoid hazardous manual handling, assess what cannot be avoided, and reduce the risk',
    'Always read the person\'s moving and handling plan before you start, and report changes',
    'Think TILEO: task, individual, load, environment and other factors',
    'Never use a drag lift, and never lift a person by hand, including after a fall',
    'Check hoists and slings before every use; equipment for lifting people is examined at least every 6 months',
    'Encourage people to do what they can, explain each step and gain consent',
    'Stop if the person is in pain or distress, or anything has changed, and get advice',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. Legislation, guidelines, policies and procedures', minutes: 5 },
    { part: 'Section 2. Anatomy and physiology: your back and how injuries happen', minutes: 5 },
    { part: 'Section 3. Risk management: handling plans and TILEO', minutes: 5 },
    { part: 'Section 4. Moving and positioning people safely: principles of safe handling', minutes: 5 },
    { part: 'Section 5. Moving and positioning people with dignity: in bed, sitting and standing', minutes: 5 },
    { part: 'Section 6. Using equipment: hoists and slings', minutes: 5 },
    { part: 'Section 7. Using equipment: other aids, bed rails and after a fall', minutes: 5 },
    { part: 'Section 8. What you can and cannot do, and when to seek advice', minutes: 4 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'Under the Manual Handling Operations Regulations, what is the first thing an employer should do about hazardous manual handling?', options: ['Provide back belts', 'Avoid it so far as is reasonably practicable', 'Train staff to lift heavier loads', 'Nothing'], correct: 1 },
    { id: 'pc2', text: 'Is the drag lift, with a hand or arm under the person\'s armpit, a safe technique?', options: ['Yes, for small people', 'No, it should never be used', 'Yes, with two staff', 'Only in an emergency'], correct: 1 },
    { id: 'pc3', text: 'How often must a hoist used for lifting people be thoroughly examined?', options: ['Every 6 months', 'Every 2 years', 'Every 5 years', 'Never'], correct: 0 },
    { id: 'pc4', text: 'In TILEO, what does the I stand for?', options: ['Injury', 'Individual', 'Instructions', 'Insurance'], correct: 1 },
    { id: 'pc5', text: 'You find someone on the floor after a fall. Should you lift them up by hand?', options: ['Yes, quickly', 'No, check for injury and use equipment such as a lifting cushion or hoist if safe', 'Yes, if two staff help', 'Only if they ask'], correct: 1 },
  ],
  sections: [
    {
      heading: 'The law and guidance',
      minutes: 5,
      body:
        'Moving and handling people is part of everyday care, and done badly it injures both care workers and the people being moved. Musculoskeletal disorders, such as back injuries, are among the most common causes of work related ill health in health and social care, and people being moved can suffer falls, skin tears, fractures and loss of dignity.\n\n' +
        'Several laws apply. The Health and Safety at Work etc. Act 1974 sets the general duties of employers and employees. The Manual Handling Operations Regulations 1992 require employers to avoid hazardous manual handling so far as is reasonably practicable, to assess the risks of any that cannot be avoided, and to reduce those risks to the lowest reasonably practicable level. The Management of Health and Safety at Work Regulations 1999 require risk assessment. The Provision and Use of Work Equipment Regulations 1998 (PUWER) require equipment to be suitable, maintained and used by trained people. The Lifting Operations and Lifting Equipment Regulations 1998 (LOLER) apply to hoists and slings, and require equipment for lifting people to be thoroughly examined by a competent person at least every six months.\n\n' +
        'In England, the Care Quality Commission regulates the safety of people receiving care, including safe care and treatment and safe equipment. The Mental Capacity Act 2005 and human rights law mean people must be involved in decisions about how they are moved, and their dignity respected.\n\n' +
        'As an employee, you must follow the moving and handling plans, safe systems of work and training you have been given, use the equipment provided correctly, not interfere with or misuse it, and tell your employer about anything that affects safety, such as a change in the person\'s condition, faulty equipment, or your own injury, pregnancy or health condition.\n\n' +
        'Your employer\'s moving and handling policy sets out local procedures, including who carries out assessments, how many staff are needed for different tasks, and what to do after a fall. Know where to find it.',
      scenario: {
        situation: 'A colleague says the home has a "no lifting policy" so the law must ban all lifting, and asks why you are allowed to help residents stand at all.',
        prompt: 'How would you explain it?',
        answer: 'The law requires employers to avoid hazardous manual handling where reasonably practicable, assess what cannot be avoided, and reduce the risk. It does not ban all handling. Lifting a person\'s whole weight by hand should be avoided, but supporting people to move themselves, following an assessed plan and using equipment, is safe and helps them stay independent. Your policy and each person\'s plan set out what is safe for them.',
      },
      check: {
        question: 'What do the Manual Handling Operations Regulations require employers to do first?',
        options: ['Buy hoists for everyone', 'Ban all moving of people', 'Train staff to lift heavier weights', 'Avoid hazardous manual handling so far as is reasonably practicable'],
        correct: 3,
        explanation: 'The order is avoid, assess, reduce. Hazardous handling is avoided where reasonably practicable; what cannot be avoided is assessed and the risk reduced.',
      },
      image_prompt: 'A care home staff room with a moving and handling policy folder open on a table and two care workers reading it together, a hoist and folded slings stored neatly in the background, no readable text.',
      image_alt: 'Two care workers reading the moving and handling policy with a hoist stored in the background',
    },
    {
      heading: 'Your back and how injuries happen',
      minutes: 5,
      body:
        'Your spine is a column of 33 vertebrae: seven in the neck, twelve in the upper back, five in the lower back, then the sacrum and coccyx. Between most vertebrae are discs, tough pads with a softer centre that absorb shock and let the spine bend. Muscles, ligaments and tendons support the spine and move it. The spine is naturally shaped in gentle curves, and it is strongest when those curves are maintained.\n\n' +
        'The lower back carries the most load, and it is where most handling injuries happen. Injury is often not caused by one event but builds up over time: repeated bending, twisting, stooping over beds, reaching, holding awkward postures and lifting loads away from the body all add strain. Eventually something gives, such as a muscle strain, a ligament sprain or a damaged disc, and the pain can last for months or become permanent.\n\n' +
        'Risky postures to avoid include stooping with a rounded back, twisting while holding or supporting weight, reaching across a bed, lifting with the arms outstretched, and sudden jerky movements. Keeping loads close to your body reduces the strain on your back dramatically, because the further away a load is, the greater the force on your lower back.\n\n' +
        'The people you support are vulnerable too. Older skin tears easily, bones may be fragile because of osteoporosis, joints may be painful or stiff, and people may have weakness on one side after a stroke. Pulling on arms or under the armpits can dislocate a shoulder or cause lasting pain. Knowing the person\'s condition, from their plan, is part of moving them safely.\n\n' +
        'Look after your own back: adjust bed heights to your waist level before care, take breaks, warm up for physical work, and report aches or injuries early. Tell your employer if you have a condition or are pregnant, so your work can be assessed.',
      scenario: {
        situation: 'You are making a bed with a person in it. The bed is at its lowest height, and you find yourself stooping and reaching across it. You have had a niggling ache in your lower back for a week.',
        prompt: 'What should you do?',
        answer: 'Stop and raise the bed to around your waist height so you can work without stooping, and work from both sides with a colleague rather than reaching across, lowering the bed again afterwards if the person is at risk of falls. Report the back ache to your manager now, before it becomes an injury, so your tasks can be reviewed and you can get advice. Small aches are an early warning of cumulative strain.',
      },
      check: {
        question: 'Why should you keep a load close to your body?',
        options: ['The further away a load is, the more strain it puts on your lower back', 'It looks more professional', 'It is quicker', 'It keeps your hands warm'],
        correct: 0,
        explanation: 'Holding or supporting weight away from the body multiplies the force on the lower back. Keeping close reduces the strain.',
      },
      image_prompt: 'A simple educational illustration of a care worker standing upright beside a care home bed raised to waist height, with a subtle outline of the spine shown on the worker\'s back, calm clean style, no text.',
      image_alt: 'A care worker at a bed raised to waist height, with the outline of their spine showing a neutral posture',
    },
    {
      heading: 'Risk assessment and handling plans',
      minutes: 5,
      body:
        'Every person who needs help to move should have a moving and handling risk assessment and plan, written by a trained assessor with the person, and reviewed regularly and whenever their needs change. The plan tells you how to help them with each task, such as getting out of bed, standing, transferring to a chair, toileting, bathing and repositioning in bed, including the equipment, sling type and size, and how many staff are needed. Read it before you help someone you have not supported recently, and follow it every time.\n\n' +
        'A useful way to think about risk is TILEO. Task: what are you doing, does it involve twisting, stooping, reaching, pushing or repetition, and how long does it take? Individual: are you trained and fit to do it, and are there enough staff? Load: in people handling, this is the person, including their weight, their ability to help, pain, confusion, skin, attachments such as catheters, and how they are feeling today. Environment: is there enough space, is the floor dry and even, is the lighting good, are the bed and chair at the right height? Other factors: equipment condition, clothing and footwear, time of day, and anything else that affects safety.\n\n' +
        'People\'s abilities can change from day to day, even from hour to hour, because of illness, pain, tiredness, medicines or infection. Before each move, do a quick check: ask how they are feeling, and look for anything different from their plan. If the person cannot do what the plan expects, do not improvise. Stop, make them safe, and get advice.\n\n' +
        'Risk assessment also supports people\'s independence. A good plan balances safety with what matters to the person, such as walking a short distance with support instead of using a wheelchair, and it should be agreed with them.',
      scenario: {
        situation: 'Mr Clarke\'s plan says he transfers from bed to chair with a standing aid and one carer. Today he is drowsy, cannot bear weight on his legs and seems confused. He has a temperature.',
        prompt: 'What should you do?',
        answer: 'Do not attempt the transfer with the standing aid, as he cannot meet the requirements of his plan today and could fall. Keep him safe and comfortable in bed and report to the senior straight away, as the change may mean an infection and needs a clinical review. His moving and handling plan also needs reassessing before he is moved, which may mean using a full hoist for now.',
      },
      check: {
        question: 'In TILEO, what does the L refer to when moving people?',
        options: ['The load, meaning the person, their ability, weight and condition', 'Lighting', 'The law', 'The length of the shift'],
        correct: 0,
        explanation: 'When handling people, the load is the person: their ability to help, weight, pain, confusion, attachments and how they are today.',
      },
      image_prompt: 'A care worker at a bedside reading a moving and handling plan on a tablet showing simple icons of a hoist and a person, while an older man rests in bed, a standing aid parked to one side, no readable text.',
      image_alt: 'A care worker reading a moving and handling plan on a tablet beside an older man in bed',
    },
    {
      heading: 'Principles of safe handling',
      minutes: 5,
      body:
        'Whatever the task, the same principles protect you and the person. Before you start, check the plan, explain what you are going to do and gain the person\'s consent, prepare the space and equipment, and make sure you have enough help.\n\n' +
        'Adopt a stable base, with your feet apart and one foot slightly forward, pointing in the direction of the movement. Bend your knees rather than your back, keeping the natural curves of your spine. Keep the load close to your body. Move your feet to turn, rather than twisting at the waist. Lead the movement with your head, looking in the direction you are going. Move smoothly, without jerking, and let the person do as much as they can at their own pace.\n\n' +
        'Adjust heights before you start: raise the bed to your waist level for care and repositioning, and make sure chairs and wheelchairs are positioned at the right angle and height, with brakes on.\n\n' +
        'When two or more people are handling, agree beforehand who will lead and what the command will be, for example "ready, steady, move", and include the person so they know when the movement will happen. Move together, on the command, and stop straight away if anyone is uncomfortable.\n\n' +
        'Some techniques are dangerous and must never be used. The drag lift, where a hand or arm is placed under the person\'s armpit to lift or pull them, can dislocate their shoulder and injure your back. Lifting a person\'s whole weight by hand, such as the cradle lift or the through arm lift, puts you and them at serious risk. Pulling a person by their clothes, arms or a draw sheet causes friction and skin damage. If a person needs more help than you can safely give without these techniques, their plan needs to change.',
      scenario: {
        situation: 'Mrs Grant has slid down in her armchair. A colleague suggests you each hook an arm under her armpits and pull her back up, "it only takes a second".',
        prompt: 'What should you do?',
        answer: 'Refuse to use the drag lift: it can dislocate her shoulder, cause pain and skin damage, and injure your backs. Explain what you are going to do, then help her reposition herself if she is able, for example by prompting her to shuffle back while you guide, or use the method and equipment in her plan, such as a slide sheet or a hoist. If her plan does not cover this, ask the senior for advice and report that she keeps sliding, as her seating may need reviewing.',
      },
      check: {
        question: 'How should you turn while supporting someone?',
        options: ['Twist at the waist', 'Lean backwards', 'Move your feet rather than twisting your back', 'Turn quickly'],
        correct: 2,
        explanation: 'Twisting while supporting weight is one of the most harmful movements for the lower back. Move your feet and keep your body facing the direction of travel.',
      },
      image_prompt: 'Two care workers standing either side of an older woman in an armchair, both with a stable wide stance and bent knees, one speaking to agree a command, the woman smiling and ready to move, clean care home lounge.',
      image_alt: 'Two care workers with a stable stance agreeing a command before helping a woman in an armchair',
    },
    {
      heading: 'Moving and positioning with dignity',
      minutes: 5,
      body:
        'Moving and handling is something you do with a person, not to them. Explain each step before you do it, ask for their consent, and check they are comfortable. Encourage them to do as much as they can, even if it takes longer, because it maintains their strength, independence and confidence. Protect their privacy and dignity: close doors and curtains, keep them covered, and never discuss them over their head.\n\n' +
        'Repositioning in bed is common and important. People who cannot move themselves need regular position changes to relieve pressure on their skin and help their breathing and comfort. NICE guidance advises that adults at risk of pressure ulcers should be encouraged to change position at least every six hours, and those at high risk at least every four hours, but the person\'s own care plan sets their schedule. Use slide sheets to turn people or move them up the bed, with the bed raised to a safe working height and a colleague where the plan says. Slide sheets reduce friction and the force needed, and protect fragile skin. A 30 degree tilt, supported by pillows, relieves pressure on the hips and base of the spine. Remove slide sheets after use, because they are designed to slide and can cause falls.\n\n' +
        'Sitting to standing: help the person shuffle forward to the edge of the seat, place their feet slightly apart and back under their knees, lean forward "nose over toes", and push up from the armrests on an agreed command. Support them without taking their weight. If they cannot stand with the help set out in their plan, do not force it.\n\n' +
        'Walking: walk slightly behind and to the side of the person, on their weaker side, and make sure their walking aid is within reach and correctly adjusted. If they start to fall, do not try to hold them up. Guide them gently to the floor if you can, protecting their head, and then follow your post fall procedure.',
      scenario: {
        situation: 'Mr Ahmed needs to be moved up the bed. His plan says two carers and a slide sheet. You are on your own, it is late, and he is uncomfortable.',
        prompt: 'What should you do?',
        answer: 'Do not attempt it alone. Reassure him, check he is safe, and make him as comfortable as you can without moving his whole weight, for example by adjusting pillows. Call a colleague to help, and if nobody is available tell the senior on duty. When there are two of you, raise the bed, use the slide sheet as planned, move him up on an agreed command, then remove the slide sheet and check his comfort and skin.',
      },
      check: {
        question: 'Why should slide sheets be removed after use?',
        options: ['They are expensive', 'They are too warm', 'They are designed to slide and can cause the person to slip or fall', 'They must be washed every time'],
        correct: 2,
        explanation: 'Slide sheets are low friction. Left in place, they can cause the person to slide down the bed or out of a chair.',
      },
      image_prompt: 'Two care workers using a blue slide sheet to gently move an older man up a raised care bed, both at waist height with a stable stance, the man comfortable and involved, privacy curtain drawn behind.',
      image_alt: 'Two care workers using a slide sheet to move an older man up a raised bed',
    },
    {
      heading: 'Hoists and slings',
      minutes: 5,
      body:
        'Hoists allow people who cannot bear their own weight to be moved safely. They include mobile hoists, ceiling track hoists, standing hoists and bath hoists. Only use a hoist you have been trained to use, in the way the person\'s plan sets out.\n\n' +
        'Before every use, check the hoist and sling. The hoist should be clean, undamaged, charged, with brakes and emergency lowering working, and a label showing the date of its last thorough examination, which must be within six months under LOLER, and its safe working load, which must be more than the person\'s weight. Slings must be the type and size specified in the person\'s plan, and compatible with the hoist according to the manufacturers. Check the sling label for its type, size, serial number and examination date, and look for fraying, tears, damaged stitching, worn loops and fading. Many services give people their own slings, for fit and for infection control. Never use a sling that is damaged, has an unreadable label, or is not the one in the plan.\n\n' +
        'During the hoist, explain each step to the person and reassure them. Position the sling correctly, check that every loop or clip is attached securely before lifting, and lift slowly to just clear the surface first, checking the attachments again and that the person is comfortable and secure. Follow the manufacturer\'s instructions about brakes. Move the hoist smoothly, pushing it using the handles rather than pulling the person, and never over long distances or uneven surfaces. Never leave the person unattended in a hoist. Lower them gently and remove the sling carefully.\n\n' +
        'The number of staff needed for hoisting is set by the person\'s risk assessment, not by habit. Deaths and serious injuries have happened when people have fallen from hoists because slings were the wrong size or incorrectly attached, so these checks matter every single time.\n\n' +
        'Report any fault straight away, take the equipment out of use, and label it as faulty.',
      scenario: {
        situation: 'You are about to hoist Mrs Bell. Her plan specifies a medium full body sling. The only clean one in her room is a large, and its label is too faded to read.',
        prompt: 'What should you do?',
        answer: 'Do not use it. A sling of the wrong size can let her slip out, and without a readable label you cannot confirm its type, size or that it has been examined. Keep her safe and comfortable, find the correct medium sling from the laundry or store, and report the faded label so the sling can be checked and withdrawn if it cannot be identified. Only hoist her with the sling in her plan, attached correctly.',
      },
      check: {
        question: 'Who decides how many staff are needed for hoisting?',
        options: ['Whoever is on shift', 'The person\'s risk assessment and moving and handling plan', 'The hoist manufacturer only', 'The family'],
        correct: 1,
        explanation: 'The number of staff is set by the person\'s assessed needs in their plan. Follow it every time.',
      },
      image_prompt: 'A care worker checking the label on a fabric hoist sling beside a mobile hoist in a care home bedroom, an older woman seated in an armchair waiting calmly, sling loops and hoist spreader bar visible, no readable text.',
      image_alt: 'A care worker checking a sling label beside a mobile hoist before moving a woman',
    },
    {
      heading: 'Other equipment, bed rails and falls',
      minutes: 5,
      body:
        'Other equipment helps people move with less risk. Transfer boards bridge the gap between a bed, chair or wheelchair for people who can sit but not stand. Turntables and standing aids help people who can bear some weight to turn or stand. Profiling beds adjust height and position. Wheelchairs must have brakes on during transfers, footplates removed or folded away for transfers and in place when moving, and the person should be positioned well back in the seat. Check all equipment before use and use it only as the plan and your training say.\n\n' +
        'Bed rails can prevent people rolling out of bed, but they can also cause serious harm through entrapment or falls from climbing over them. The MHRA advises that bed rails are used only after a risk assessment for that person, with rails that are compatible with the bed and mattress, correctly fitted, and checked regularly for gaps. Never add or remove bed rails without the assessment, and report any gaps or damage.\n\n' +
        'Falls are a major cause of harm to older people. NICE guidance (NG249, 2025) emphasises assessing people\'s falls risk and acting on it. Help prevent falls by keeping walking aids and the call bell within reach, keeping floors clear, making sure footwear fits and lighting is good, and reporting changes such as dizziness or new confusion.\n\n' +
        'If someone falls, do not rush to get them up and never lift them by hand. Stay calm, make the area safe, and reassure them. Check for injury before any move: pain, especially in the hip, head or neck, bleeding, a leg that looks shortened or turned out, new confusion, or signs they hit their head. If you suspect a serious injury, keep them still and warm and call 999. If there is no injury and they cannot get up on their own with guidance, use the equipment your service provides, such as an inflatable lifting cushion or a hoist, following your post fall procedure. Afterwards, observe them for delayed signs of injury, record and report the fall, and make sure their falls risk and moving and handling plan are reviewed.',
      scenario: {
        situation: 'You find Mr Doyle sitting on the bathroom floor. He says he is fine, has no pain and did not hit his head, and asks you and a colleague to just pull him up by his arms.',
        prompt: 'What should you do?',
        answer: 'Do not pull him up by his arms. Reassure him and check for injury systematically, including his head, neck, hips and limbs, and ask what happened. If there is no injury, see whether he can get up himself with guidance, for example onto his hands and knees and then to a sturdy chair. If he cannot, use the lifting cushion or hoist as your post fall procedure says. Afterwards, observe him for delayed signs of injury, record and report the fall, and make sure his falls risk and plan are reviewed.',
      },
      check: {
        question: 'Before using bed rails, what must happen?',
        options: ['Nothing, they are always safe', 'A risk assessment for that person, with rails compatible with the bed and mattress', 'The family must buy them', 'They must be fitted by any member of staff'],
        correct: 1,
        explanation: 'Bed rails can cause entrapment and falls. They are used only after an individual risk assessment, with compatible, correctly fitted equipment checked regularly.',
      },
      image_prompt: 'A care worker kneeling beside an older man sitting on a bathroom floor, calmly talking to him, an inflatable lifting cushion folded beside them ready to use, a second care worker arriving at the door.',
      image_alt: 'A care worker reassuring a man seated on the floor, with an inflatable lifting cushion ready beside them',
    },
    {
      heading: 'Your limits and the observed practical',
      minutes: 4,
      body:
        'Know the limits of your role. Only carry out moves and use equipment you have been trained and assessed to use, as the person\'s plan describes. Do not improvise a new technique, use equipment that is not in the plan, or move someone with fewer staff than the plan says because you are short staffed.\n\n' +
        'Stop and seek advice when the person\'s condition has changed, when they are in pain or distressed or refuse, when equipment is missing or faulty, when the plan does not cover the situation, or when you feel unsure. Make the person safe and comfortable, then talk to the senior on duty or the person responsible for moving and handling assessments. Stopping is not failing; it is what a safe worker does.\n\n' +
        'If a person refuses to be moved, respect their decision if they have capacity, explain the risks, and try again later or in a different way. Record and report it, as their plan may need reviewing. If they lack capacity for that decision, follow their best interests plan.\n\n' +
        'Record and report: moves that did not go to plan, near misses, falls, skin damage, faulty equipment and any injury to you. Reporting allows assessments to be updated and equipment to be fixed before someone is hurt.\n\n' +
        'This course is the knowledge part of your moving and handling training. After you pass the assessment, your manager or a competent assessor will observe you moving people at work, against a 12 point checklist covering checking the plan, consent, preparing the area, equipment and sling checks, safe technique, working with a colleague, promoting independence, dignity, stopping when something changes, and leaving the person safe and recording. Every point must be met. If any point is not met yet, you will be told which, given support and further learning on it, and observed again. Your certificate is issued once your manager records a full sign-off.',
      scenario: {
        situation: 'On a busy morning a colleague asks you to help hoist a new resident with a type of ceiling hoist you have never been trained on, saying "it is just like the mobile one".',
        prompt: 'What should you do?',
        answer: 'Explain that you have not been trained on this hoist and cannot use it safely. Do not guess. Keep the resident safe and comfortable, and ask the senior to arrange for a trained colleague to carry out the transfer, and for you to be trained on the equipment. Record and report the gap in training so it can be addressed. Working within your training protects the resident and you.',
      },
      check: {
        question: 'In the observed practical assessment, how many checklist points must be met?',
        options: ['At least half', 'Only the equipment points', 'Any eight', 'All of them'],
        correct: 3,
        explanation: 'Every point must be met. Where any point is not met, you receive feedback and support and are observed again before your certificate is issued.',
      },
      image_prompt: 'A senior care worker with a clipboard observing a care worker using a mobile hoist with an older woman in a care home bedroom, the senior nodding encouragingly, the resident relaxed, no readable text.',
      image_alt: 'A senior care worker with a clipboard observing a colleague using a hoist with a resident',
    },
  ],
  activities: [
    {
      id: 'mh-act-1', type: 'order', after_section: 0,
      title: 'The manual handling hierarchy',
      instructions: 'Put the steps the Manual Handling Operations Regulations require into order.',
      steps: [
        'Avoid hazardous manual handling so far as is reasonably practicable',
        'Assess the risks of any handling that cannot be avoided',
        'Reduce the risks to the lowest reasonably practicable level',
        'Review the assessment when things change',
      ],
    },
    {
      id: 'mh-act-2', type: 'sort', after_section: 1,
      title: 'Kind or harmful to your back?',
      instructions: 'Sort each posture or action.',
      bins: [
        { id: 'safe', name: 'Protects your back', note: 'Reduces strain' },
        { id: 'harm', name: 'Harms your back', note: 'Adds strain' },
      ],
      items: [
        { text: 'Raising the bed to waist height before care', bin: 'safe' },
        { text: 'Keeping the load close to your body', bin: 'safe' },
        { text: 'Moving your feet to turn', bin: 'safe' },
        { text: 'Reaching across the bed with arms outstretched', bin: 'harm' },
        { text: 'Twisting at the waist while supporting someone', bin: 'harm' },
        { text: 'Stooping over a low bed for several minutes', bin: 'harm' },
      ],
    },
    {
      id: 'mh-act-3', type: 'match', after_section: 2,
      title: 'TILEO',
      instructions: 'Match each part of TILEO to an example of what to consider.',
      pairs: [
        { term: 'Task', definition: 'Does the move involve twisting, stooping or reaching?' },
        { term: 'Individual', definition: 'Am I trained and fit, and are there enough staff?' },
        { term: 'Load', definition: 'Can the person help today, and are they in pain?' },
        { term: 'Environment', definition: 'Is there enough space, and is the floor dry?' },
        { term: 'Other', definition: 'Is the equipment in good condition and in date?' },
      ],
    },
    {
      id: 'mh-act-4', type: 'sort', after_section: 3,
      title: 'Safe or dangerous technique?',
      instructions: 'Sort each technique.',
      bins: [
        { id: 'safe', name: 'Safe technique', note: 'Follows the principles' },
        { id: 'danger', name: 'Dangerous, never use', note: 'Risks injury' },
      ],
      items: [
        { text: 'Using a slide sheet to reposition in bed', bin: 'safe' },
        { text: 'Agreeing a command before moving together', bin: 'safe' },
        { text: 'Prompting the person to shuffle forward before standing', bin: 'safe' },
        { text: 'The drag lift, with an arm under the armpit', bin: 'danger' },
        { text: 'Lifting a person\'s whole weight by hand', bin: 'danger' },
        { text: 'Pulling the person up the bed by their arms', bin: 'danger' },
      ],
    },
    {
      id: 'mh-act-5', type: 'order', after_section: 4,
      title: 'Helping someone stand from a chair',
      instructions: 'Put the steps into order.',
      steps: [
        'Check the plan and explain what you are going to do',
        'Make sure the walking aid is in reach and the brakes are on',
        'Help the person shuffle forward to the edge of the seat',
        'Place their feet slightly apart and back under their knees',
        'Ask them to lean forward, nose over toes, and push up from the armrests on the agreed command',
        'Support without taking their weight, and check they are steady',
      ],
    },
    {
      id: 'mh-act-6', type: 'order', after_section: 5,
      title: 'Safe hoisting',
      instructions: 'Put the steps of a hoist transfer into order.',
      steps: [
        'Check the plan, the hoist and the sling label',
        'Explain to the person and gain consent',
        'Position the sling and attach all loops or clips securely',
        'Lift slightly to clear the surface and check the attachments and comfort',
        'Move the hoist smoothly using the handles, never leaving the person unattended',
        'Lower gently, remove the sling and check the person is comfortable',
      ],
    },
    {
      id: 'mh-act-7', type: 'order', after_section: 6,
      title: 'After a fall',
      instructions: 'Put the steps into order when you find someone on the floor.',
      steps: [
        'Stay calm, make the area safe and reassure the person',
        'Check for injury before any move',
        'If a serious injury is suspected, keep them still and warm and call 999',
        'If uninjured, guide them to get up themselves or use a lifting cushion or hoist',
        'Observe them afterwards for delayed signs of injury',
        'Record and report the fall and ask for their plan to be reviewed',
      ],
    },
    {
      id: 'mh-act-8', type: 'sort', after_section: 7,
      title: 'Carry on or stop and seek advice?',
      instructions: 'Sort each situation.',
      bins: [
        { id: 'go', name: 'Carry on, following the plan', note: 'Within your role' },
        { id: 'stop', name: 'Stop and seek advice', note: 'Outside the plan or unsafe' },
      ],
      items: [
        { text: 'The person is as usual and the equipment checks are fine', bin: 'go' },
        { text: 'Two trained staff are available, as the plan requires', bin: 'go' },
        { text: 'The person is suddenly unable to bear weight', bin: 'stop' },
        { text: 'The sling label is unreadable', bin: 'stop' },
        { text: 'You have not been trained on this hoist', bin: 'stop' },
        { text: 'The person says the move is hurting them', bin: 'stop' },
      ],
    },
  ],
  references: [
    { title: 'Statutory and mandatory training guide for adult social care employers (December 2025)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf', source: 'Skills for Care', note: 'The framework this course is mapped to. Its assisting and moving people row sets the expected content, from legislation to the limits of your role.' },
    { title: 'Moving and handling in health and social care', url: 'https://www.hse.gov.uk/healthservices/moving-handling/index.htm', source: 'Health and Safety Executive', note: 'The HSE\'s guidance for care, including the laws that apply and the risks of poor practice.' },
    { title: 'Moving and handling equipment', url: 'https://www.hse.gov.uk/healthservices/moving-handling/moving-handling-equipment.htm', source: 'Health and Safety Executive', note: 'Choosing and using hoists and slings safely, including sling identification and compatibility.' },
    { title: 'The Manual Handling Operations Regulations 1992', url: 'https://www.legislation.gov.uk/uksi/1992/2793/contents', source: 'legislation.gov.uk', note: 'The regulations requiring hazardous manual handling to be avoided, assessed and reduced.' },
    { title: 'LOLER regulation 9: thorough examination', url: 'https://www.legislation.gov.uk/uksi/1998/2307/regulation/9/made', source: 'legislation.gov.uk', note: 'The requirement for equipment for lifting people to be thoroughly examined at least every six months.' },
    { title: 'Lifting Operations and Lifting Equipment Regulations (LOLER)', url: 'https://www.hse.gov.uk/work-equipment-machinery/loler.htm', source: 'Health and Safety Executive', note: 'HSE\'s plain English guide to LOLER for employers and users.' },
    { title: 'Bed rails: management and safe use', url: 'https://www.gov.uk/government/publications/bed-rails-management-and-safe-use', source: 'MHRA, GOV.UK', note: 'The national guidance on assessing, fitting and checking bed rails to prevent entrapment and falls.' },
    { title: 'Falls: assessment and prevention in older people (NG249)', url: 'https://www.nice.org.uk/guidance/ng249', source: 'NICE', note: 'The 2025 guideline on assessing falls risk and preventing falls, relevant to section 7.' },
    { title: 'Pressure ulcers: prevention and management (CG179)', url: 'https://www.nice.org.uk/guidance/cg179', source: 'NICE', note: 'The source of the repositioning intervals in section 5.' },
    { title: 'Manual handling at work', url: 'https://www.hse.gov.uk/msd/manual-handling/index.htm', source: 'Health and Safety Executive', note: 'General guidance on manual handling risk assessment, including the TILE approach, for moving objects and equipment.' },
  ],
  glossary: [
    { term: 'MHOR', definition: 'The Manual Handling Operations Regulations 1992: avoid, assess, reduce.' },
    { term: 'LOLER', definition: 'The Lifting Operations and Lifting Equipment Regulations 1998, covering hoists and slings.' },
    { term: 'Thorough examination', definition: 'A detailed inspection of lifting equipment by a competent person, at least every six months for equipment lifting people.' },
    { term: 'Safe working load', definition: 'The maximum weight a piece of lifting equipment is designed to lift safely.' },
    { term: 'TILEO', definition: 'Task, Individual, Load, Environment, Other: a way of thinking through handling risk.' },
    { term: 'Moving and handling plan', definition: 'The person\'s individual plan setting out how they should be helped to move, with what equipment and how many staff.' },
    { term: 'Drag lift', definition: 'An unsafe technique with a hand or arm under the armpit. It must never be used.' },
    { term: 'Slide sheet', definition: 'A low friction sheet used to reposition people in bed with less force and less skin damage.' },
    { term: 'Musculoskeletal disorder', definition: 'An injury or condition affecting muscles, joints, ligaments or the back.' },
    { term: '30 degree tilt', definition: 'A supported side lying position that relieves pressure on the hips and base of the spine.' },
    { term: 'Inflatable lifting cushion', definition: 'Equipment that helps a person who has fallen rise safely from the floor without being lifted by hand.' },
    { term: 'Observed practical assessment', definition: 'An assessment of your practice at work against a checklist, carried out by your manager or a competent assessor.' },
  ],
  practical_checklist: MOVING_HANDLING_CHECKLIST,
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. The law and guidance
    { id: 'q1', text: 'Which regulations cover hoists and slings?', options: ['LOLER 1998', 'COSHH 2002', 'RIDDOR 2013', 'The Food Safety Act 1990'], correct: 0 },
    { id: 'q2', text: 'How often must equipment for lifting people be thoroughly examined?', options: ['Every 12 months', 'At least every 6 months', 'Every 5 years', 'Only when it breaks'], correct: 1 },
    { id: 'q3', text: 'Which is an employee duty?', options: ['Writing the moving and handling policy', 'Following the plans and training, and reporting changes and faults', 'Buying equipment', 'Deciding staffing levels'], correct: 1 },
    { id: 'q4', text: 'Why must people be involved in decisions about how they are moved?', options: ['It is quicker', 'Their consent, dignity and rights must be respected', 'It is optional', 'Only for insurance'], correct: 1 },
    // Section 2. Your back and how injuries happen
    { id: 'q5', text: 'Where do most handling injuries to the back happen?', options: ['The neck', 'The shoulders only', 'The lower back', 'The feet'], correct: 2 },
    { id: 'q6', text: 'Handling injuries often:', options: ['Build up over time from repeated strain', 'Always come from one heavy lift', 'Never happen with good intentions', 'Only affect older staff'], correct: 0 },
    { id: 'q7', text: 'Why is pulling a person by their arms or under their armpits harmful?', options: ['It is untidy', 'It can dislocate their shoulder and damage fragile skin', 'It is too slow', 'It is only harmful to staff'], correct: 1 },
    { id: 'q8', text: 'You have a niggling back ache. You should:', options: ['Ignore it', 'Lift more to strengthen it', 'Take extra shifts', 'Report it to your manager early'], correct: 3 },
    // Section 3. Risk assessment and handling plans
    { id: 'q9', text: 'When should a person\'s moving and handling plan be reviewed?', options: ['Never', 'Only once a year', 'Regularly and whenever their needs change', 'Only after an inspection'], correct: 2 },
    { id: 'q10', text: 'In TILEO, the E stands for:', options: ['Equipment', 'Emergency', 'Energy', 'Environment'], correct: 3 },
    { id: 'q11', text: 'The person cannot do what their plan expects today. You should:', options: ['Improvise a new technique', 'Ask the person to try harder', 'Use extra force', 'Stop, make them safe and seek advice'], correct: 3 },
    { id: 'q12', text: 'Positive risk taking in moving and handling means:', options: ['Balancing safety with what matters to the person, agreed with them', 'Ignoring risk', 'Letting staff choose', 'Avoiding all movement'], correct: 0 },
    // Section 4. Principles of safe handling
    { id: 'q13', text: 'A stable base means:', options: ['Feet apart, one slightly forward, pointing where you are moving', 'Feet together', 'Standing on tiptoe', 'Kneeling'], correct: 0 },
    { id: 'q14', text: 'When two staff move someone together, you should:', options: ['Agree who leads and use an agreed command', 'Each move when ready', 'Let the person decide mid move', 'Move as fast as possible'], correct: 0 },
    { id: 'q15', text: 'Which of these must never be used?', options: ['A slide sheet', 'The drag lift', 'A standing aid in the plan', 'An agreed command'], correct: 1 },
    { id: 'q16', text: 'Before providing care in bed, the bed should be:', options: ['At its lowest height', 'Tilted steeply', 'Raised to around your waist height', 'Moved against the wall'], correct: 2 },
    // Section 5. Moving and positioning with dignity
    { id: 'q17', text: 'NICE advises adults at high risk of pressure ulcers should change position at least every:', options: ['12 hours', '6 hours', '4 hours', '24 hours'], correct: 2 },
    { id: 'q18', text: 'What is the purpose of a slide sheet?', options: ['To keep the bed warm', 'To reduce friction and the force needed to reposition someone', 'To lift a person\'s whole weight', 'To replace a hoist'], correct: 1 },
    { id: 'q19', text: 'When helping someone walk, where should you usually be?', options: ['In front, pulling them', 'Holding both their hands', 'A few metres away', 'Slightly behind and to the side, on their weaker side'], correct: 3 },
    { id: 'q20', text: 'A person you are walking with starts to fall. You should:', options: ['Try to hold them up', 'Pull them upright', 'Let go and step back', 'Guide them gently to the floor if you can, protecting their head'], correct: 3 },
    // Section 6. Hoists and slings
    { id: 'q21', text: 'Which of these must you check on a sling before use?', options: ['Its colour only', 'Its price', 'Its type, size, label and examination date, and for damage', 'Nothing, if it is clean'], correct: 2 },
    { id: 'q22', text: 'The hoist\'s safe working load must be:', options: ['Less than the person\'s weight', 'More than the person\'s weight', 'The same for everyone', 'Ignored'], correct: 1 },
    { id: 'q23', text: 'What should you do just after the person has lifted clear of the surface?', options: ['Move off quickly', 'Remove the sling', 'Leave to fetch the chair', 'Pause and check the attachments and that they are comfortable and secure'], correct: 3 },
    { id: 'q24', text: 'Can a person be left alone while suspended in a hoist?', options: ['Yes, briefly', 'Yes, if the brakes are on', 'No, never', 'Yes, at night'], correct: 2 },
    // Section 7. Other equipment, bed rails and falls
    { id: 'q25', text: 'When transferring someone to a wheelchair, the brakes should be:', options: ['Off', 'Removed', 'On', 'Half on'], correct: 2 },
    { id: 'q26', text: 'The main risks from bed rails include:', options: ['Entrapment and falls from climbing over', 'Noise', 'Rust', 'Cold'], correct: 0 },
    { id: 'q27', text: 'After someone falls and is uninjured but cannot get up, you should:', options: ['Lift them by hand with a colleague', 'Use equipment such as a lifting cushion or hoist, following your procedure', 'Leave them until the next shift', 'Pull them up by their arms'], correct: 1 },
    { id: 'q28', text: 'After a fall, why do you keep observing the person?', options: ['Some injuries, such as head injuries, show later', 'For paperwork only', 'To stop them moving', 'It is not necessary'], correct: 0 },
    // Section 8. Your limits and the observed practical
    { id: 'q29', text: 'You are asked to use a hoist you have not been trained on. You should:', options: ['Decline, keep the person safe, and ask for a trained colleague and training', 'Try it, they are all similar', 'Ask the person to guide you', 'Use it with extra care'], correct: 0 },
    { id: 'q30', text: 'A person with capacity refuses to be moved. You should:', options: ['Move them anyway', 'Leave them without checking again', 'Ask their family to insist', 'Respect their decision, explain the risks, try again later and report it'], correct: 3 },
    { id: 'q31', text: 'Why should near misses be reported?', options: ['To blame someone', 'They should not be reported', 'So plans and equipment can be fixed before someone is hurt', 'Only for inspections'], correct: 2 },
    { id: 'q32', text: 'When is your moving and handling certificate issued?', options: ['As soon as you start the course', 'After you pass the assessment and your manager signs off an observation with every point met', 'After the assessment only', 'After one year'], correct: 1 },
  ],
}
