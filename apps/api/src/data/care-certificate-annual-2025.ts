// Care Certificate Annual Training — full course content, rebuilt against the
// March 2025 Care Certificate standards (16 standards) for CPD resubmission.
//
// One section per standard, each with a substantive refresher body grounded in
// the official assessment outcomes (Skills for Care, Care Certificate standards
// March 2025), a workplace scenario, and an in-lesson check. The final
// assessment bank holds 32 questions, two per standard. Timings are explicit so
// the navigation guide, submission form and hub all state the same 1.5 hours.
//
// Applied to the tier='cpd' copy of the Care Certificate module by
// scripts/apply-care-certificate-2025.ts — the prebuilt tier is untouched.

export const CC_ANNUAL_2025 = {
  name: 'Care Certificate Annual Training',
  duration_minutes: 90,
  pass_mark: 80,
  description:
    'Annual refresher training across all 16 standards of the Care Certificate (March 2025). ' +
    'You will revisit every standard, from understanding your role and duty of care through ' +
    'person-centred working, communication, safeguarding, basic life support, health and safety, ' +
    'handling information and infection prevention and control, including the new standard on ' +
    'awareness of learning disability and autism. Each standard has a short lesson, a workplace ' +
    'scenario and a knowledge check, followed by a final assessment. Your knowledge certificate ' +
    'is issued once you pass the assessment and your manager has verified your observed ' +
    'competency assessment.',
  entry_requirements:
    'Intermediate. For staff who have already completed Care Certificate induction or hold ' +
    'equivalent knowledge and experience from their care role. This course is the annual ' +
    'refresher of that induction, not a replacement for it.',
  summary:
    'This annual refresher revisits all 16 Care Certificate standards updated in March 2025. ' +
    'Work through each standard in order. Every section ends with a scenario from a real care ' +
    'setting and a quick check. The course closes with a 32 question assessment with a pass ' +
    'mark of 80%, and an observed competency assessment completed with your manager.',
  outcomes: [
    'Refresh working knowledge of every one of the 16 Care Certificate standards (March 2025)',
    'Apply the standards to everyday situations through workplace scenarios',
    'Identify what changed in the March 2025 update, including the new learning disability and autism standard',
    'Demonstrate continued competence through the assessment and a manager observed practice check',
  ],
  // Displayed under the course and included in the CPD navigation guide so the
  // stated 1.5 hours is evidenced by a timed structure.
  timings: [
    { part: 'Pre-course knowledge check', minutes: 3 },
    { part: 'Standards 1 to 16, lesson plus scenario plus check (about 4 minutes each)', minutes: 64 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
    { part: 'Observed competency assessment briefing', minutes: 5 },
  ],
  // Pre-course knowledge check, served by the existing baseline flow and graded
  // server-side; results are compared with the final score as learning gain.
  baseline: [
    { id: 'pc1', text: 'How many standards does the Care Certificate contain since March 2025?', options: ['12', '15', '16', '20'], correct: 2 },
    { id: 'pc2', text: 'Duty of candour means:', options: ['Keeping all information confidential', 'Being open and honest when things go wrong', 'Always following the care plan', 'Reporting colleagues to the CQC'], correct: 1 },
    { id: 'pc3', text: 'Which of these is a standard infection prevention and control precaution?', options: ['Hand hygiene at the required moments', 'Only isolating people who ask', 'Sharing PPE between rooms', 'Cleaning equipment weekly'], correct: 0 },
    { id: 'pc4', text: 'An adult at risk is legally defined as an adult who:', options: ['Lives alone', 'Has needs for care and support and is experiencing, or at risk of, abuse or neglect and cannot protect themselves', 'Is over 75', 'Lacks capacity for every decision'], correct: 1 },
    { id: 'pc5', text: 'Person-centred working means:', options: ['Doing tasks in the fastest order', 'Care built around the wishes, preferences and needs of the individual', 'Treating everyone exactly the same', 'Following the rota'], correct: 1 },
  ],
  sections: [
    {
      heading: 'Standard 1: Understand your role',
      minutes: 4,
      body:
        'Your role is defined by your job description, your agreed ways of working, and the standards and codes that apply to care work, including the Code of Conduct for Healthcare Support Workers and Adult Social Care Workers. Working to your agreed ways of working matters because they translate legislation and your employer\'s policies into what you actually do on shift. Know your main duties and responsibilities, and equally know the limits of your role: doing something you are not trained or authorised to do puts people at risk, however well meant. Your relationships at work are professional ones. That means reliability, honesty, respecting boundaries with the people you support and their families, and working in partnership with colleagues and other agencies. Your own experiences, attitudes and beliefs will shape how you see situations. Being aware of that, and not letting it override a person\'s own choices, is part of professional practice. When you are unsure about any part of your role, ask. Your supervisor, your policies and your induction materials are your agreed sources of guidance.',
      scenario: {
        situation: 'A resident\'s daughter asks you to change her mother\'s medication time because "the morning carer always did it at 8". Your medication training does not cover changing administration times.',
        prompt: 'What do you do?',
        answer: 'Explain politely that medication timing changes are outside your role, and refer the request to the senior on duty or the manager so it can be reviewed properly and, if agreed, recorded in the care plan. Working within the limits of your role protects the resident, and passing the request on rather than ignoring it respects the family.',
      },
      check: {
        question: 'Which of these best describes agreed ways of working?',
        options: ['The way the longest serving carer does things', 'Your employer\'s policies and procedures applied to your role', 'Whatever the person being supported prefers', 'Guidance that only applies to nurses'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 2: Your personal development',
      minutes: 4,
      body:
        'Care work changes: guidance is updated, people\'s needs change, and your own role develops. A personal development plan, agreed with your manager, records your objectives and how you will meet them. It is a live document, not a form filled in once a year. Feedback from others, in supervision, after incidents, and informally from colleagues and the people you support, is one of the most valuable sources of learning you have, because it shows you what you cannot see yourself. Reflection is the other: taking a few minutes after a difficult shift or an unfamiliar situation to ask what went well, what did not, and what you would do differently. This course itself is part of your development record. Completing your annual refresher, recording it, and acting on anything you found difficult keeps your knowledge current, which is exactly what CQC inspectors and your employer mean by continuing professional development. Functional skills matter here too: reading care plans accurately, writing clear records and using your service\'s digital systems are all part of doing the role well.',
      scenario: {
        situation: 'In supervision your manager says two families have mentioned you seem rushed during personal care. Your first reaction is that the rota leaves you no time.',
        prompt: 'How do you use this feedback well?',
        answer: 'Treat it as information rather than criticism. Both things can be true: the rota may be tight and the experience of feeling rushed is real for the people you support. Discuss the workload honestly, and also look at what you can change, such as talking through each step during care so it feels less hurried. Record the action in your development plan and review it next supervision.',
      },
      check: {
        question: 'Why is feedback from others important to your development?',
        options: ['It decides your pay', 'It shows you things about your practice you cannot see yourself', 'It is a legal requirement', 'It replaces training'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 3: Duty of care',
      minutes: 4,
      body:
        'Duty of care is your legal and professional obligation to act in the best interests of the people you support, to keep them safe from harm, and to act within your competence. Duty of candour is its partner: being open and honest when things go wrong, telling the person and your employer promptly, and supporting an honest account of what happened. Dilemmas are part of care. A person\'s right to make their own choices can conflict with your duty to keep them safe, for example when someone with capacity chooses to do something risky. Your duty is not to prevent every risk but to make sure the person understands it, to reduce it where they agree, and to record and escalate your concerns. Know where support sits when a dilemma arises: your line manager, your policies, and where relevant advocacy services. Complaints and incidents are part of this standard. Respond to comments and complaints in line with your agreed ways of working, never obstruct them, and treat them as information the service needs. Recognise adverse events, incidents, errors and near misses, report them promptly, and be honest about your own part in them. Sorry, said early and sincerely, is part of candour, not an admission that ends your career.',
      scenario: {
        situation: 'You gave a resident another resident\'s paracetamol by mistake. The resident seems fine. No one saw it happen.',
        prompt: 'What does duty of candour require?',
        answer: 'Report it immediately to the senior or manager, follow the medication error procedure, make sure the resident is checked and monitored, tell the resident honestly what happened, and record it accurately. Not reporting it because the resident seems fine puts them at risk and turns a recoverable error into misconduct.',
      },
      check: {
        question: 'Duty of candour requires you to:',
        options: ['Report only serious injuries', 'Be open and honest when things go wrong, starting with prompt reporting', 'Wait to be asked before mentioning an error', 'Tell only your colleagues'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 4: Equality, diversity, inclusion and human rights',
      minutes: 4,
      body:
        'This standard was strengthened in March 2025 to add inclusion and human rights explicitly. Equality means fair treatment and equal opportunity, underpinned by the Equality Act 2010 and its nine protected characteristics, which include age, disability, race, religion or belief, sex and sexual orientation. Diversity means recognising and valuing difference. Inclusion means people are not just present but genuinely involved: their voice shapes their own care. Human rights, protected by the Human Rights Act 1998, include dignity, respect for private and family life, and freedom from degrading treatment, and they belong to every person you support regardless of their needs. Bias can be conscious or unconscious, and discrimination can be deliberate or happen by neglect, for example when information is only ever provided in ways a person cannot use. Reduce the likelihood of discrimination by knowing the people you support as individuals, challenging exclusionary practice when you see it, and using your agreed ways of working. If you witness or suspect discrimination, report it: staying silent lets it continue. Where you need support on equality or inclusion questions, your manager, your policies and organisations such as the Equality and Human Rights Commission provide it.',
      scenario: {
        situation: 'A colleague repeatedly skips the vegetarian option preparation for a resident whose faith requires it, saying "she never complains and it is quicker".',
        prompt: 'What is happening and what should you do?',
        answer: 'This is discrimination by neglect of a need linked to religion or belief, a protected characteristic, and it disregards the resident\'s rights and preferences. Challenge it directly if you feel able, and report it to the senior or manager. The resident not complaining does not make it acceptable, and inclusion means her needs are met without her having to fight for them.',
      },
      check: {
        question: 'Which of these is NOT one of the ideas this standard covers?',
        options: ['Equality and protected characteristics', 'Diversity and inclusion', 'Human rights', 'Payroll administration'],
        correct: 3,
      },
    },
    {
      heading: 'Standard 5: Work in a person-centred way',
      minutes: 4,
      body:
        'Person-centred values put the individual at the centre of everything: individuality, independence, privacy, partnership, choice, dignity, respect and rights. In practice that means care built around the person\'s history, preferences, wishes and needs, not around the routine of the service. Care plans are the tool for this, and they only work when they are current: report changes in a person\'s needs or wishes so the plan stays true to them. Working in a person-centred way includes supporting people in distress, being aware of their emotional and spiritual wellbeing, not only their physical needs, and recognising the environment matters, from noise levels to whether their room feels like their own. Promote dignity in every interaction. Support people to maintain their identity and self-esteem: use the name they choose, involve them in decisions at their pace, and support their relationships. Minimising environmental discomfort, pain and distress is part of this standard: notice, ask, act and report. Independence is a value, not a risk: supporting a person to do what they can for themselves, even when doing it for them would be quicker, is person-centred care working as intended.',
      scenario: {
        situation: 'A new resident\'s care plan says she needs full support with washing. Each morning she tries to wash her own face and hands, slowly, and a colleague gently takes over "so she is not exhausted".',
        prompt: 'Is this person-centred? What would be?',
        answer: 'Taking over removes her independence and ignores what she is showing you she wants and can do. Person-centred practice supports her to do what she can at her own pace, offers help with the rest, and reports the difference between the care plan and her actual ability so the plan is updated.',
      },
      check: {
        question: 'A care plan should be:',
        options: ['Written once at admission and left alone', 'A live document updated as the person\'s needs and wishes change', 'Only for nurses to read', 'A checklist of tasks'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 6: Communication',
      minutes: 4,
      body:
        'People communicate in many ways: speech, tone, facial expression, body language, touch, behaviour, writing, pictures and technology. In care, communication is not an extra skill, it is the work: it builds trust, prevents errors, and is how you learn what a person needs and wants. Establish each person\'s communication and language needs, wishes and preferences from their care plan, from the person themselves, and from those who know them. Barriers include noise and environment, sensory impairment, language, cognitive conditions such as dementia, pain, and your own assumptions. Reduce them: face the person, get to their level, allow time, use plain language, check understanding, and use aids the person relies on, from hearing aids and glasses to communication boards and interpreters. Never invent your own workaround for a need that requires expertise: know how to access extra support such as speech and language therapy, translation and advocacy services. Confidentiality is part of this standard: share information about a person only with those who need it for their care, in line with your agreed ways of working, and understand that confidentiality has limits, for example when someone is at risk of harm.',
      scenario: {
        situation: 'A gentleman with dementia becomes agitated every afternoon when you try to explain his granddaughter is visiting tomorrow, not today.',
        prompt: 'How do you adapt your communication?',
        answer: 'Long verbal explanations may be adding confusion. Slow down, use short sentences, calm tone and reassuring body language, and try other channels such as a written note by his chair, a photo of his granddaughter with the visit day, or redirection to a comforting activity. Record what works so the whole team communicates with him consistently.',
      },
      check: {
        question: 'Confidential information about a person you support may be shared:',
        options: ['With anyone who asks politely', 'Never, in any circumstances', 'With those who need it for the person\'s care, and where someone is at risk of harm', 'Only with the family'],
        correct: 2,
      },
    },
    {
      heading: 'Standard 7: Privacy and dignity',
      minutes: 4,
      body:
        'Privacy is a person\'s right to control who sees them, their body, their space and their information. Dignity is being treated as a person of worth in every interaction. The situations where these are most easily compromised are everyday ones: personal care with a door ajar, talking across a person as if they were not there, discussing someone\'s continence needs in a corridor, entering a room without knocking. Maintain privacy and dignity actively: knock and wait, close doors and curtains, keep the person covered during care, explain what you are doing and seek agreement as you go, and keep personal information out of public spaces and conversations. Support people\'s active participation in their own care: involve them in decisions, offer real choices, and respect the choice they make even when you would choose differently, including risk decisions where the person has capacity, which should be discussed, understood and recorded rather than overridden. Where a person\'s choice creates a risk to themselves or others, report and record your concerns through your agreed ways of working. Supporting active participation is also how independence is maintained: every decision made for a person that they could have made themselves takes something from them.',
      scenario: {
        situation: 'During a busy morning a colleague leaves a resident\'s door open during personal care "to keep an ear on the corridor".',
        prompt: 'What do you do?',
        answer: 'Close the door or ask the colleague to, and offer to cover the corridor yourself. Whatever the operational pressure, exposing a person during personal care is a serious breach of privacy and dignity. If it is a pattern, raise it with the senior so the real staffing issue is addressed rather than paid for by residents\' dignity.',
      },
      check: {
        question: 'A person with capacity makes a choice you believe is risky. You should:',
        options: ['Override the choice to keep them safe', 'Respect the choice, make sure the risk is understood, and record and report concerns', 'Ask the family to decide', 'Ignore it'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 8: Fluids and nutrition',
      minutes: 4,
      body:
        'Good nutrition and hydration protect health, wound healing, energy, mood and dignity. Poor nutrition shows as weight loss, loose clothing, tiredness, poor wound healing and increased falls and infections. Dehydration shows as dark urine, headaches, dizziness, confusion, dry mouth and urinary tract infections, and in older people confusion is often the first visible sign. Know the signs, and report concerns promptly: changed appetite, swallowing difficulty, meals left unfinished and refused drinks are all reportable observations, not personal choices to ignore. Support people to eat and drink in line with their care plan: correct consistency where a speech and language therapist has prescribed it, correct positioning, the right pace, and equipment that supports independence. Ensure drinks are within reach and offered often, not only at set times. Food safety and hygiene in the preparation and handling of food protects people whose immunity may already be low: clean hands, clean surfaces, correct storage temperatures, and awareness of allergens against each person\'s documented needs. Mealtimes are social and cultural events, not just fuel: protecting them from interruption and honouring preferences is person-centred care.',
      scenario: {
        situation: 'A resident on a level 4 pureed diet is given a normal sponge pudding by a new colleague who "felt sorry for her". She is eating it happily.',
        prompt: 'What do you do and why?',
        answer: 'Remove the pudding gently and explain to the colleague that the consistency is prescribed because of swallowing risk: aspiration can be silent and life threatening. Offer the correct texture alternative, observe the resident for any signs of difficulty, and report the incident so it is recorded and the colleague gets the training they clearly need.',
      },
      check: {
        question: 'Which is often the first visible sign of dehydration in an older person?',
        options: ['A rash', 'New or worsening confusion', 'A high temperature', 'Swollen ankles'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 9: Awareness of mental health and dementia',
      minutes: 4,
      body:
        'Since March 2025 this standard focuses on mental health and dementia, with learning disability and autism moved to its own standard 16. Mental health describes how we think, feel and cope; mental wellbeing can be good or poor in anyone, including people receiving care and the colleagues beside you. Common conditions include depression, anxiety, bipolar disorder, schizophrenia and post-traumatic stress disorder. Dementia is not one disease but a group of progressive conditions, Alzheimer\'s disease being the most common, affecting memory, reasoning, communication and the ability to manage daily life. These conditions can influence a person\'s needs and the support they require, and two truths must be held together: the condition explains behaviour, and the person remains an individual whose history, preferences and rights are intact. Early signs matter: withdrawal, changed sleep or appetite, new confusion or uncharacteristic behaviour should be reported, because early support changes outcomes, and in the case of confusion may indicate a treatable physical cause such as infection. Care must adjust to the person\'s reality: arguing a person with dementia back to the present usually increases distress. Legal frameworks, including the Mental Capacity Act 2005, promote wellbeing by requiring that people are assumed to have capacity, supported to decide, and protected by best interests decision making only when a specific decision genuinely exceeds their capacity.',
      scenario: {
        situation: 'A usually settled resident with dementia becomes suddenly more confused and distressed over two days, trying to leave "for work" and refusing personal care.',
        prompt: 'What should you consider and do?',
        answer: 'Sudden change is not "just the dementia progressing". Report it promptly: new confusion often signals a physical cause such as a urinary tract infection, pain or dehydration. Meanwhile reduce distress by entering his reality rather than correcting it, keep him safe, and record what you observe, when it started and what helps.',
      },
      check: {
        question: 'The Mental Capacity Act 2005 says you should assume:',
        options: ['A person with dementia cannot make decisions', 'A person has capacity unless shown otherwise for a specific decision', 'The family decides once dementia is diagnosed', 'Capacity is decided once, for everything'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 10: Adult safeguarding',
      minutes: 4,
      body:
        'Adult safeguarding means protecting an adult\'s right to live in safety, free from abuse and neglect. The legal definition of an adult at risk is an adult who has needs for care and support, is experiencing or at risk of abuse or neglect, and as a result of those needs cannot protect themselves. The main types of abuse are physical, sexual, psychological or emotional, financial or material, discriminatory, organisational, domestic abuse, modern slavery, and neglect including self-neglect. Harm includes ill treatment, impairment of health or development, and the impact of witnessing the ill treatment of others. Abuse happens anywhere, and the abuser can be anyone, including staff, family and other residents. Signs may be physical, behavioural or environmental: unexplained injuries, fearfulness around a particular person, missing money, poor living conditions, withdrawal. Reduce the likelihood of abuse through person-centred care, active participation, robust recruitment and training, and a culture where concerns are speakable. Your role: recognise, respond, record and refer. If someone discloses abuse, listen, take it seriously, do not promise secrecy, do not investigate yourself, preserve evidence, and report it immediately through your agreed ways of working. If the concern involves your manager, go above them or to the local authority safeguarding team directly; whistleblowing law protects you. In an emergency, or if a crime is in progress, contact the police.',
      scenario: {
        situation: 'While helping a resident to bed she says quietly, "Don\'t tell anyone, but the night man is rough with me". She asks you to promise to keep it between you.',
        prompt: 'How do you respond?',
        answer: 'Listen calmly and take her seriously. Explain gently that you cannot keep it secret because keeping her safe matters more, and that you will only tell the people whose job it is to help. Do not question her in detail or confront the colleague. Report it immediately to the safeguarding lead or manager and record her exact words, the time and the context.',
      },
      check: {
        question: 'A resident discloses abuse and asks you to keep it secret. You should:',
        options: ['Promise secrecy to keep her trust', 'Explain you must pass it on to keep her safe, then report it immediately', 'Investigate quietly first', 'Wait to see if it happens again'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 11: Safeguarding children',
      minutes: 4,
      body:
        'Even in adult services, children are part of the picture: they visit relatives, they accompany families, some staff work across settings, and the people you support may have contact with children in the community. Safeguarding children means protecting anyone under 18 from abuse, neglect and harm to their health or development. The categories of child abuse are physical, emotional, sexual abuse and neglect, and children can also be harmed by witnessing abuse of others, by exploitation including online, and by radicalisation. In social care your duty is clear: if you have concerns about a child, or a child discloses to you, you must act. Listen without leading, do not promise secrecy, and report immediately through your agreed ways of working to your safeguarding lead, or directly to local authority children\'s services or the police where the concern is urgent. Record what you saw or heard factually and promptly. If you work in a health setting, national minimum training standards for safeguarding children apply at the level appropriate to your workplace, in line with the intercollegiate guidance. The principle is the same as adult safeguarding: it is not your job to be certain, it is your job to report concerns to the people whose job it is to find out.',
      scenario: {
        situation: 'A regular young visitor, about 9, is always hungry when she visits her grandmother, wears the same unwashed clothes in all weathers, and today has a bruise she will not talk about.',
        prompt: 'This is an adult care setting. Is this your business?',
        answer: 'Yes. Safeguarding duties do not stop at the age of the people you are commissioned to care for. Report what you have observed to your safeguarding lead the same day, with facts rather than conclusions: what you saw, when, and what was said. The lead can refer to children\'s services, who can find out what is happening.',
      },
      check: {
        question: 'If a child discloses harm to you, you should:',
        options: ['Promise to keep it secret', 'Ask detailed questions to establish the truth', 'Listen, avoid leading questions, and report immediately', 'Tell the child\'s family member in the home'],
        correct: 2,
      },
    },
    {
      heading: 'Standard 12: Basic life support',
      minutes: 4,
      body:
        'This standard requires practical training that meets UK Resuscitation Council guidelines, refreshed regularly and assessed face to face: this online section refreshes the knowledge that underpins your practical certificate, it does not replace it. The chain of survival: early recognition and call for help, early CPR, early defibrillation, and post-resuscitation care. Approach using DRSABC: check for Danger, check Response, Shout for help, open the Airway, check Breathing for no more than 10 seconds, and start Compressions if the person is not breathing normally. Call 999, or delegate the call clearly by naming a person, and send for the defibrillator (AED) if one is available; in a care setting know where yours is kept before you ever need it. Adult compressions: centre of the chest, 5 to 6 centimetres deep, 100 to 120 per minute, allowing full recoil, with rescue breaths at 30 to 2 if trained and able, or continuous compressions if not. Use the AED as soon as it arrives and follow its prompts: it will not shock a heart that does not need it. For choking: encourage coughing, then up to five back blows, then up to five abdominal thrusts, alternating, and call 999 if it is not relieved. Agitation aside, remember DNACPR: know before an emergency which of the people you support have a documented decision, and where it is recorded.',
      scenario: {
        situation: 'You find a resident collapsed in the lounge. He does not respond to voice or gentle shoulder squeeze. Another carer is in the corridor.',
        prompt: 'Talk through your first four actions.',
        answer: 'Check for danger, confirm no response, and shout for the colleague, telling them by name to call 999 and bring the AED. Open the airway with head tilt and chin lift and check breathing for no more than 10 seconds. If he is not breathing normally, start chest compressions at 100 to 120 per minute, 5 to 6 centimetres deep, and use the AED the moment it arrives. Also know whether he has a DNACPR in place; in a well run home you know this before the emergency.',
      },
      check: {
        question: 'Adult chest compressions should be delivered at:',
        options: ['60 to 80 per minute, 3 centimetres deep', '100 to 120 per minute, 5 to 6 centimetres deep', 'As fast as possible', '80 per minute, 8 centimetres deep'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 13: Health and safety',
      minutes: 4,
      body:
        'The Health and Safety at Work etc. Act 1974 places duties on your employer to provide a safe workplace, safe equipment, training and policies, and on you to take reasonable care of yourself and others, to follow training and procedures, and to report hazards. Supporting legislation includes COSHH for hazardous substances, RIDDOR for reporting specified injuries and dangerous occurrences, and the Manual Handling Operations Regulations. Know the tasks you must not carry out without special training: moving and handling of people, medication, emergency first aid, and the use of specific equipment. Risk assessment is how hazards become manageable: read the assessments that apply to your work, follow them, and report anything that has changed. Accidents, injuries and sudden illness must be responded to within your competence and reported and recorded promptly. Moving and assisting people and objects safely protects you as much as them: assess, prepare, use the equipment prescribed, and never lift manually where equipment is specified. Medication and healthcare tasks require specific training and agreed ways of working. Hazardous substances must be stored, used and disposed of per COSHH. Fire safety: know your setting\'s procedure, evacuation strategy and your own role, and keep escape routes clear. Security: check identity of visitors, protect keys, codes and call systems, and know your lone working procedure if you work alone. Finally, stress is a health and safety matter: recognise your own signs and use the support your employer provides.',
      scenario: {
        situation: 'The hoist in the east wing has a frayed strap. It is the only hoist on that floor and two residents need it before lunch.',
        prompt: 'What is the safe sequence?',
        answer: 'Take the hoist out of use immediately and label it: a frayed strap can fail under load. Report it straight away to the senior and follow the defect procedure, and arrange the residents\' transfers using safe alternatives, borrowing the other wing\'s serviced hoist or delaying with the residents kept comfortable and informed. Inconvenience is never a reason to use unsafe lifting equipment.',
      },
      check: {
        question: 'Under health and safety law, your personal responsibilities include:',
        options: ['Buying your own equipment', 'Taking reasonable care of yourself and others, and following training and procedures', 'Writing the fire risk assessment', 'Fixing broken equipment yourself'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 14: Handling information',
      minutes: 4,
      body:
        'The information you handle, care plans, daily notes, medication records, messages from families, is sensitive personal data protected by the Data Protection Act 2018 and UK GDPR, and governed by your agreed ways of working. Secure systems exist for a reason: paper records locked away, screens locked when unattended, passwords never shared, conversations about people held where they cannot be overheard, and information shared only with those who need it for the person\'s care. Your records are legal documents and care tools at once. Keep them up to date, complete, accurate and legible, write factually and respectfully, distinguishing what you observed from what you were told or concluded, and record at the time or as soon as possible afterwards, because contemporaneous notes are both safer for the person and more credible if ever examined. If you notice records are missing, wrong or have been accessed inappropriately, report it: information incidents are incidents. People have rights over their own information, including the right to access it, and questions about disclosure, for example a relative asking to read notes, should go through your manager and your policies rather than be decided on the spot.',
      scenario: {
        situation: 'A resident\'s son phones and asks you to read out his mother\'s recent care notes. He is her son, he says, and has a right to know.',
        prompt: 'How do you handle the call?',
        answer: 'Politely explain you cannot share records over the phone, verify nothing about her care to an unverified caller, and pass the request to the manager. His mother\'s information belongs to her: access depends on her consent or a legal basis such as power of attorney, which the manager can check. Log the call.',
      },
      check: {
        question: 'Care records should be written:',
        options: ['At the end of the week from memory', 'Factually, promptly and legibly, at the time or as soon as possible', 'Only when something goes wrong', 'In your own private notebook'],
        correct: 1,
      },
    },
    {
      heading: 'Standard 15: Infection prevention and control',
      minutes: 4,
      body:
        'Infection needs a chain to spread: an infectious agent, a reservoir, a way out, a mode of transmission, a way in, and a susceptible person. Break any link and infection stops, and the people you support are often the most susceptible people in the building. The standard IPC precautions protect everyone, every time, regardless of known infection status: hand hygiene at the recognised moments, before and after contact with each person, after body fluids, before clean tasks and after touching surroundings; respiratory hygiene; correct use of personal protective equipment, gloves and aprons on for the task and off, safely, immediately after; safe management of the care environment, equipment and laundry; safe handling and disposal of waste and sharps; and managing blood and body fluid spillages correctly. PPE only works with the right technique: donning clean, doffing dirty to clean, hand hygiene after removal, and never reusing single-use items. Your employer\'s policies and the national IPC manual set out the detail for your setting, including outbreak procedures, when transmission-based precautions are added, and how to report and record infections. If you are unwell yourself, especially with diarrhoea, vomiting or fever, report it and stay away in line with policy: presenteeism spreads outbreaks.',
      scenario: {
        situation: 'A colleague wearing the same gloves moves from changing one resident\'s continence pad straight to helping another resident with breakfast.',
        prompt: 'What is wrong and what do you do?',
        answer: 'Gloves have carried contamination from a dirty task to food and a second person: gloves are single task, removed immediately after, followed by hand hygiene. Intervene now, politely, before the second resident is helped, and report or discuss it so the practice is corrected. This is exactly how gastrointestinal outbreaks start in care settings.',
      },
      check: {
        question: 'Standard IPC precautions apply:',
        options: ['Only during declared outbreaks', 'Only to residents with a diagnosed infection', 'To every person, every time', 'Only in clinical areas'],
        correct: 2,
      },
    },
    {
      heading: 'Standard 16: Awareness of learning disability and autism',
      minutes: 4,
      body:
        'This is the new standard added in March 2025, and it reflects a legal requirement: all staff in CQC regulated services must undertake training in how to interact appropriately with people with a learning disability and autistic people, at a level appropriate to their role, with the Oliver McGowan Mandatory Training the government\'s preferred package. A learning disability is a reduced ability to understand new or complex information and to learn new skills, starting before adulthood and lasting throughout life, affecting people to very different degrees. Autism is a lifelong difference in how people communicate, process information and experience the world, including sensory experiences; it is not an illness, and autistic people\'s needs and strengths vary enormously. Neither means a person cannot make decisions: assume capacity, communicate in the way that works for the person, allow processing time, and involve people fully in their own care. Reasonable adjustments are a legal duty under the Equality Act 2010: clearer information, longer appointments, quieter environments, consistency of routine and staff, whatever removes the barrier for that individual. Diagnostic overshadowing, attributing physical symptoms to the disability or autism instead of investigating them, contributes to avoidable deaths and is exactly what this standard exists to prevent: changes in behaviour are communication, and often the only accessible way a person can tell you something is wrong.',
      scenario: {
        situation: 'A young autistic man in supported living has started refusing his usual day centre trips and hitting his own leg. Staff describe it as "just his autism playing up".',
        prompt: 'Why is that dangerous, and what should happen?',
        answer: 'That is diagnostic overshadowing. A change in behaviour is communication: he may be in pain, unwell, distressed by a change in environment or routine, or something may have happened. He needs a proper look: health checks including things he cannot easily report such as toothache, a review of any changes around him, and communication support to express what is wrong. Record the changes factually and escalate.',
      },
      check: {
        question: 'Diagnostic overshadowing means:',
        options: ['Making two diagnoses at once', 'Attributing new symptoms or behaviour to a person\'s disability instead of investigating them', 'A second opinion', 'Shadowing a senior clinician'],
        correct: 1,
      },
    },
  ],
  // References and further reading, rendered by the hub's existing references
  // block ({title, url, source}). CPD referral point 3e.
  references: [
    { title: 'Care Certificate standards, March 2025 (Skills for Care)', url: 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', source: 'Skills for Care' },
    { title: 'Care Certificate assessor and employer guide, March 2025 (PDF)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Care-Certificate/Care-Certificate-Standards/Care-Certificate-assessor-and-employer-guide-March-2025.pdf', source: 'Skills for Care' },
    { title: 'Code of Conduct for Healthcare Support Workers and Adult Social Care Workers', url: 'https://www.skillsforcare.org.uk/Support-for-leaders-and-managers/Managing-people/Code-of-conduct.aspx', source: 'Skills for Care' },
    { title: 'UK Resuscitation Council guidelines', url: 'https://www.resus.org.uk/library/2021-resuscitation-guidelines', source: 'Resuscitation Council UK' },
    { title: 'Mental Capacity Act 2005 Code of Practice', url: 'https://www.gov.uk/government/publications/mental-capacity-act-code-of-practice', source: 'GOV.UK' },
    { title: 'National infection prevention and control manual for England', url: 'https://www.england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england/', source: 'NHS England' },
    { title: 'Information Commissioner\'s Office, health and social care guidance', url: 'https://ico.org.uk/for-organisations/', source: 'ICO' },
    { title: 'Oliver McGowan Mandatory Training on Learning Disability and Autism', url: 'https://www.hee.nhs.uk/our-work/learning-disability/current-projects/oliver-mcgowan-mandatory-training-learning-disability-autism', source: 'NHS Health Education England' },
    { title: 'Health and Safety Executive, health and social care services', url: 'https://www.hse.gov.uk/healthservices/index.htm', source: 'GOV.UK' },
    { title: 'Safeguarding adults: Care Act 2014 statutory guidance, chapter 14', url: 'https://www.gov.uk/government/publications/care-act-statutory-guidance/care-and-support-statutory-guidance#safeguarding-1', source: 'GOV.UK' },
  ],
  // Final assessment: two questions per standard, 32 total, pass mark 80%,
  // maximum three attempts before directed further learning.
  questions: [
    { id: 'q1', text: 'Working within the limits of your role means:', options: ['Refusing extra shifts', 'Not carrying out tasks you are not trained or authorised to do', 'Only doing what is on the rota', 'Avoiding difficult residents'], correct: 1 },
    { id: 'q2', text: 'Your agreed ways of working are found in:', options: ['Your employer\'s policies and procedures for your role', 'A colleague\'s advice', 'Last year\'s rota', 'The CQC website only'], correct: 0 },
    { id: 'q3', text: 'A personal development plan should be:', options: ['Written by HR without you', 'Agreed with your manager and reviewed as a live document', 'Completed once at induction', 'Kept secret'], correct: 1 },
    { id: 'q4', text: 'Reflection after a difficult shift is valuable because it:', options: ['Fills supervision time', 'Turns experience into learning you can act on', 'Is required by RIDDOR', 'Replaces training'], correct: 1 },
    { id: 'q5', text: 'Duty of care means:', options: ['Doing whatever the family asks', 'Acting in people\'s best interests, keeping them safe, and working within your competence', 'Never allowing any risk', 'Following the fastest routine'], correct: 1 },
    { id: 'q6', text: 'After a near miss that harmed no one, you should:', options: ['Move on, since no harm was done', 'Report and record it so the risk can be removed before it harms someone', 'Mention it if asked', 'Handle it yourself'], correct: 1 },
    { id: 'q7', text: 'The protected characteristics are defined by:', options: ['The Care Act 2014', 'The Equality Act 2010', 'COSHH 2002', 'The Human Rights Act 1998'], correct: 1 },
    { id: 'q8', text: 'Inclusion means:', options: ['Inviting everyone to activities', 'People being genuinely involved, with their voice shaping their own care', 'Treating everyone identically', 'Recording ethnicity data'], correct: 1 },
    { id: 'q9', text: 'Which list contains person-centred values?', options: ['Individuality, independence, privacy, choice, dignity', 'Efficiency, speed, routine, uniformity', 'Compliance, audit, inspection', 'Rotas, tasks, targets'], correct: 0 },
    { id: 'q10', text: 'A resident\'s abilities differ from what her care plan says. You should:', options: ['Follow the plan exactly anyway', 'Support what she can do and report so the plan is updated', 'Rewrite the plan yourself', 'Ignore the plan'], correct: 1 },
    { id: 'q11', text: 'Which of these is a barrier to communication?', options: ['Allowing extra time', 'Background noise and jargon', 'Facing the person', 'Checking understanding'], correct: 1 },
    { id: 'q12', text: 'A person needs an interpreter for a care review. You should:', options: ['Use gestures and carry on', 'Ask a bilingual resident to help', 'Access interpreting support through your agreed ways of working', 'Skip the review'], correct: 2 },
    { id: 'q13', text: 'Before entering a resident\'s room you should:', options: ['Walk in quietly', 'Knock, announce yourself and wait for a response where possible', 'Enter only with a colleague', 'Phone ahead'], correct: 1 },
    { id: 'q14', text: 'Active participation means:', options: ['The person takes part in activities daily', 'The person is an active partner in their own care and decisions', 'Family attends reviews', 'Staff stay active'], correct: 1 },
    { id: 'q15', text: 'Signs of poor nutrition include:', options: ['Weight loss, tiredness and poor wound healing', 'Improved mobility', 'Better sleep', 'Steady weight'], correct: 0 },
    { id: 'q16', text: 'A resident on thickened fluids asks for a normal cup of tea. You should:', options: ['Give it, choice comes first', 'Explain, provide the prescribed consistency, and raise the request for review', 'Refuse all drinks', 'Water the tea down'], correct: 1 },
    { id: 'q17', text: 'Sudden new confusion in an older person most often signals:', options: ['Normal ageing', 'A possible physical cause such as infection that needs prompt review', 'Attention seeking', 'Nothing significant'], correct: 1 },
    { id: 'q18', text: 'When a person with dementia insists it is 1975, best practice is to:', options: ['Correct them until they accept the date', 'Meet them in their reality and reduce distress', 'Ignore them', 'Test their orientation repeatedly'], correct: 1 },
    { id: 'q19', text: 'The legal definition of an adult at risk requires:', options: ['Age over 65', 'Care and support needs, experience or risk of abuse or neglect, and inability to self-protect because of those needs', 'A dementia diagnosis', 'Residence in a care home'], correct: 1 },
    { id: 'q20', text: 'Financial abuse includes:', options: ['A resident buying gifts freely', 'Pressuring a person about wills, property or benefits, or misusing their money', 'Family paying fees', 'A resident lending a book'], correct: 1 },
    { id: 'q21', text: 'Your safeguarding responsibilities cover children:', options: ['Never, in adult services', 'Whenever you have concerns about any child, including visitors', 'Only if you have a DBS for children', 'Only in schools'], correct: 1 },
    { id: 'q22', text: 'If a safeguarding concern involves your manager, you should:', options: ['Drop it', 'Report above them or directly to the local authority; whistleblowing law protects you', 'Confront the manager', 'Wait for evidence'], correct: 1 },
    { id: 'q23', text: 'You check breathing for no more than:', options: ['30 seconds', '10 seconds', '2 minutes', '1 minute'], correct: 1 },
    { id: 'q24', text: 'An AED should be used:', options: ['Only by nurses', 'As soon as it arrives, following its prompts', 'After 10 minutes of CPR', 'Only in hospitals'], correct: 1 },
    { id: 'q25', text: 'Which task requires special training before you may do it?', options: ['Making a bed', 'Moving and handling of people', 'Serving lunch', 'Answering the phone'], correct: 1 },
    { id: 'q26', text: 'You find a fire door propped open with a wheelchair. You should:', options: ['Leave it, it helps airflow', 'Close it and report the practice', 'Prop it wider', 'Only act during a drill'], correct: 1 },
    { id: 'q27', text: 'Records should distinguish:', options: ['Fact from what you were told or concluded', 'Day shift from night shift only', 'Nothing in particular', 'Staff opinions from manager opinions'], correct: 0 },
    { id: 'q28', text: 'A relative asks to read their mother\'s care notes. You should:', options: ['Hand them over', 'Refuse rudely', 'Route the request through your manager and policy, since access depends on consent or legal basis', 'Read selected parts aloud'], correct: 2 },
    { id: 'q29', text: 'Hand hygiene is required:', options: ['Only when hands look dirty', 'At the recognised moments, including before and after contact with each person', 'Once per shift', 'Only after using gloves'], correct: 1 },
    { id: 'q30', text: 'Gloves should be:', options: ['Worn for a whole corridor of tasks', 'Single task, removed immediately after, followed by hand hygiene', 'Washed for reuse', 'Optional with clean hands'], correct: 1 },
    { id: 'q31', text: 'The Care Certificate standard added in March 2025 covers:', options: ['Digital skills', 'Awareness of learning disability and autism', 'Fire marshalling', 'Food hygiene'], correct: 1 },
    { id: 'q32', text: 'An autistic resident\'s sudden behaviour change should be treated as:', options: ['Part of autism, needing no action', 'Communication that something may be wrong, needing health checks and review', 'A disciplinary matter', 'Attention seeking'], correct: 1 },
  ],
}
