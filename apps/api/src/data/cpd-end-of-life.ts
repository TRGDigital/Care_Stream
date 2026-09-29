// End of Life and Palliative Care: full course content for CPD submission.
//
// Framework: End of Life Care Core Skills Education and Training Framework
// (Health Education England, Skills for Health and Skills for Care, 2017), the
// framework the Skills for Care statutory and mandatory training guide (December
// 2025) says end of life training should align to. A revised version is under
// review by Skills for Care and Skills for Health but is not yet published, so
// the 2017 framework remains current. This course is pitched at Tier 2 (health
// and social care workers who provide person centred end of life care), and each
// section maps to named framework subjects in the timings table. Clinical content
// follows NICE NG31 (care of dying adults in the last days of life) and NG142
// (end of life care for adults: service delivery). Knowledge only.
//
// Timings total 60 minutes. Applied to the tier='cpd' module by
// scripts/apply-cpd-course.ts; the prebuilt tier is never touched.

import type { CpdCourse } from './cpd-course-types'

export const CPD_END_OF_LIFE: CpdCourse = {
  module_id: 'c0599540-07c1-4bb8-9bb1-cb9cb341c832',
  name: 'End of Life and Palliative Care',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: false,
  description:
    'End of life and palliative care for care workers in care homes, nursing homes, home care and supported ' +
    'living, mapped to Tier 2 of the End of Life Care Core Skills Education and Training Framework and NICE ' +
    'guidance. It covers person centred end of life care, communication, advance care planning and the law, ' +
    'recognising the last days of life, symptoms and comfort, emotional, spiritual and cultural needs, ' +
    'supporting families and bereavement, and care after death and your own wellbeing. Eight lessons with ' +
    'scenarios and activities, then a final assessment.',
  entry_requirements:
    'Intermediate. For care workers and senior care workers who support people approaching the end of life in ' +
    'any adult social care setting. No specific qualification is needed. It does not replace clinical training ' +
    'for registered nurses, such as verifying death or managing syringe pumps.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check so your learning gain can be measured, and ' +
    'finish with a 32 question assessment with a pass mark of 80%. The course is designed to be taken every year.',
  outcomes: [
    'Explain what palliative and end of life care mean and how to put the person\'s wishes at the centre of their care',
    'Communicate sensitively about dying, death and bereavement, using active listening and open questions',
    'Describe advance care planning, advance decisions, lasting power of attorney, DNACPR and ReSPECT, and your role',
    'Recognise the signs that a person may be entering the last days of life, and what to report',
    'Support comfort and symptom relief within your role, and know when and how to escalate',
    'Support families and carers, provide respectful care after death, and look after your own wellbeing',
  ],
  key_points: [
    'Palliative care is about quality of life; end of life care usually covers the last year of life',
    'Ask what matters to the person, and follow their advance care plan and preferred place of care',
    'A DNACPR decision is only about CPR; all other care and treatment continue',
    'Changes in breathing, skin, eating and drinking can mean the last days of life: report them',
    'Pain and other symptoms that are not controlled must be escalated promptly, including at weekends',
    'Families need information, time and compassion; carers may need their own support',
    'Care after death is carried out with dignity and respect for the person\'s culture and faith',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. Subjects 1 and 3: person centred end of life care, equality and diversity', minutes: 5 },
    { part: 'Section 2. Subject 2: communication in end of life care', minutes: 5 },
    { part: 'Section 3. Subjects 6 and 12: advance care planning, law, ethics and safeguarding', minutes: 5 },
    { part: 'Section 4. Subjects 5 and 7: recognising the last days of life', minutes: 5 },
    { part: 'Section 5. Subject 7: symptom management and comfort', minutes: 5 },
    { part: 'Section 6. Subject 5: practical, emotional, spiritual and cultural support', minutes: 5 },
    { part: 'Section 7. Subjects 8 and 9: working in partnership and support for carers', minutes: 5 },
    { part: 'Section 8. Subjects 10 and 11: care after death and your own wellbeing', minutes: 4 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'A DNACPR decision means:', options: ['No care or treatment is given', 'Cardiopulmonary resuscitation will not be attempted; all other care continues', 'The person has refused food', 'The family makes all decisions'], correct: 1 },
    { id: 'pc2', text: 'Which of these can be a sign that someone is entering the last days of life?', options: ['Increased appetite', 'Changes in breathing pattern and mottled skin', 'Wanting to go for a walk', 'Better sleep'], correct: 1 },
    { id: 'pc3', text: 'An advance decision to refuse life sustaining treatment must be:', options: ['Spoken to a carer', 'In writing, signed and witnessed, stating it applies even if life is at risk', 'Agreed by the family', 'Written by the GP'], correct: 1 },
    { id: 'pc4', text: 'Palliative care focuses on:', options: ['Curing the illness', 'Quality of life and comfort for people with life limiting illness', 'Hospital treatment only', 'The last hour of life only'], correct: 1 },
    { id: 'pc5', text: 'Which sense may continue until very close to death?', options: ['Taste', 'Hearing', 'Smell', 'None'], correct: 1 },
  ],
  sections: [
    {
      heading: 'Person centred end of life care',
      minutes: 5,
      body:
        'Palliative care is care that improves the quality of life of people with a life limiting illness, and of those close to them, by relieving pain and other symptoms and supporting their emotional, social and spiritual needs. It can start early in an illness, alongside other treatment. End of life care is the part of palliative care for people who are likely to die within the next 12 months, including those whose death is expected within hours or days. Many of the people you support will be in this stage, often with frailty, dementia, heart or lung disease, or cancer.\n\n' +
        'Person centred end of life care means the person is the expert in their own life. Find out who they are, what matters to them, what they hope for and what they fear, and who is important to them. Their priorities might be being pain free, staying in their own home or care home rather than going to hospital, having a pet close by, hearing their favourite music, or seeing a particular person. Care for the whole person: physical comfort, emotions, relationships, spiritual and cultural needs.\n\n' +
        'Everyone has the right to a good death on their own terms. People\'s wishes may differ from your own beliefs, and that is their right. Culture, faith, sexuality, disability and past experiences can all shape how people want to be cared for as they die. Ask rather than assume. People with dementia, a learning disability, or who cannot speak for themselves have the same rights, and may need extra time, different ways of communicating and advocates.\n\n' +
        'Know your part. You are often the person who spends the most time with someone at the end of their life, so what you notice and how you care make a huge difference. Know who is leading their care, such as their GP, district nurse, the home\'s nurse or a hospice team, and where to go for support.',
      scenario: {
        situation: 'Mrs Okafor, who has advanced heart failure, tells you she does not want to go into hospital again. She wants to die in her room at the care home with her Bible and her daughter nearby. A new agency worker says hospital is always the safest place.',
        prompt: 'How should her wishes be supported?',
        answer: 'Her wishes should be at the centre of her care. Make sure they are known to the senior and recorded in her care plan and advance care plan, so her GP can be involved in planning, including what to do if she becomes unwell out of hours. Explain to the agency worker that being cared for where she chooses is part of good end of life care, and that decisions about hospital are made with her, not for her. Keep her Bible close and make sure her daughter knows she can visit.',
      },
      check: {
        question: 'End of life care usually refers to care for people who are likely to die within:',
        options: ['The next hour', 'The next 10 years', 'The next 12 months', 'The next week only'],
        correct: 2,
        explanation: 'People are generally considered to be approaching the end of life when they are likely to die within 12 months. End of life care includes those in the last days and hours of life.',
      },
      image_prompt: 'An older woman resting peacefully in an armchair by a window in a care home bedroom, a Bible and family photographs on the side table, a care worker sitting beside her holding her hand, soft warm light, calm and dignified.',
      image_alt: 'A care worker holding the hand of an older woman resting by a window, with a Bible and family photos nearby',
    },
    {
      heading: 'Communicating about dying',
      minutes: 5,
      body:
        'Many people want to talk about dying but find others change the subject. Not knowing what to say is common, but you do not need the perfect words. What matters most is being present, listening and allowing the person to lead.\n\n' +
        'Use active listening: give your full attention, sit at the person\'s level, allow silences, and show you have heard by reflecting back what they say. Open questions invite people to share: "How are you feeling about things?", "What is worrying you most?", "What would help right now?". Follow their cues; some people want to talk in detail, others only a little, and that can change from day to day.\n\n' +
        'Be honest and do not give false reassurance, such as "you will be fine" or "don\'t talk like that". If someone asks a question you cannot answer, such as about their prognosis, acknowledge it ("That is an important question") and tell them you will ask the nurse or doctor to talk with them, then make sure you do. Never guess about medical information.\n\n' +
        'Barriers to communication include hearing and sight loss, dementia, a learning disability, a stroke, tiredness, medicines and a noisy or busy environment. Adapt: check hearing aids and glasses, use simple words and pictures, watch body language and facial expressions, and involve people who know the person well. Changes in behaviour, such as restlessness, may be the person telling you they are in pain or afraid.\n\n' +
        'Families may want to talk too, and may ask you difficult questions. Listen, show compassion, share only what you are permitted to under confidentiality, and involve the senior or nurse. Record important conversations, especially any wishes the person expresses, so everyone caring for them knows.',
      scenario: {
        situation: 'While you help Mr Hughes wash, he says quietly, "I don\'t think I\'ve got long left, have I?" You feel unsure what to say.',
        prompt: 'How could you respond?',
        answer: 'Do not brush it off or give false reassurance. Pause, sit or stand at his level and gently ask an open question, such as "What makes you think that?" or "What is on your mind?" Listen, allow silences, and follow his lead. If he asks something medical you cannot answer, tell him honestly that you will ask the nurse or GP to talk with him, and make sure you do. Record the conversation and tell the senior so his wishes and worries can be explored.',
      },
      check: {
        question: 'Which of these is an open question?',
        options: ['"Are you OK?"', '"What is worrying you most?"', '"Do you want a cup of tea?"', '"Is it your back?"'],
        correct: 1,
        explanation: 'Open questions cannot be answered with yes or no, so they invite people to share their feelings and priorities.',
      },
      image_prompt: 'A care worker sitting at eye level beside an older man in bed, listening attentively with a gentle expression, the man speaking thoughtfully, a quiet bedroom with soft lamp light.',
      image_alt: 'A care worker sitting at eye level beside an older man in bed, listening attentively',
    },
    {
      heading: 'Advance care planning and the law',
      minutes: 5,
      body:
        'Advance care planning is a voluntary process of conversations about a person\'s wishes and preferences for future care, while they are able to say what they want. It might cover where they would like to be cared for and to die, treatments they would or would not want, who they would like to be involved, and personal, cultural or religious wishes, such as funeral plans or organ donation. People can change their minds at any time. Your role is to know what is in the person\'s plan, follow it, and report when the person expresses new wishes.\n\n' +
        'Several documents may be part of this. An advance statement records wishes and preferences; it is not legally binding but must be taken into account. An advance decision to refuse treatment is legally binding if it is valid and applies to the situation; if it refuses life sustaining treatment, it must be in writing, signed and witnessed, and state that it applies even if life is at risk. A lasting power of attorney for health and welfare gives a named person the legal authority to make decisions if the person loses capacity, if the power has been registered and it covers that decision.\n\n' +
        'A DNACPR decision (do not attempt cardiopulmonary resuscitation) means CPR will not be attempted if the person\'s heart or breathing stops. It is made by the senior clinician, ideally with the person. It is only about CPR: all other care and treatment, including pain relief, fluids and treatment for infections, continue. Many areas use a ReSPECT form, which records a person\'s priorities and recommendations for emergency care, including CPR. Know where these documents are kept, and make sure they go with the person if they are transferred.\n\n' +
        'The Mental Capacity Act 2005 applies throughout: assume capacity, support people to decide, respect unwise decisions, and act in a person\'s best interests only when they lack capacity for that specific decision. People approaching the end of life can be at risk of abuse or neglect, including financial abuse. Report concerns through your safeguarding procedure.',
      scenario: {
        situation: 'Mr Price has a DNACPR form in his care file. He develops a high temperature and a cough. A colleague says there is "no point calling the GP, he is DNACPR anyway".',
        prompt: 'Is your colleague right?',
        answer: 'No. A DNACPR decision is only about not attempting CPR if his heart or breathing stops. All other care and treatment continue, including assessment and treatment of a possible chest infection. Report his symptoms to the senior and contact the GP in line with his care plan and any ReSPECT recommendations and wishes he has expressed. Record what you observed and did.',
      },
      check: {
        question: 'A lasting power of attorney for health and welfare allows the named person to:',
        options: ['Make health and welfare decisions if the person lacks capacity, once registered and within its scope', 'Manage the person\'s bank account only', 'Override the person while they still have capacity', 'Sign a DNACPR form'],
        correct: 0,
        explanation: 'A registered health and welfare LPA lets the attorney make decisions the person cannot make for themselves, within the powers it gives. While the person has capacity, they decide.',
      },
      image_prompt: 'A senior care worker and an older man with his adult daughter sitting around a small table in a quiet lounge, talking calmly with a blank folder open, a cup of tea on the table, supportive atmosphere.',
      image_alt: 'A senior care worker talking with an older man and his daughter about future care wishes',
    },
    {
      heading: 'Recognising the last days of life',
      minutes: 5,
      body:
        'Recognising that someone may be entering the last days of life means their care can be focused on comfort, their wishes, and the people important to them. NICE guidance describes signs to look out for, which should be reported so a clinician can assess the person. They include increasing sleepiness and reduced consciousness, being bedbound and needing more help, losing interest in food and drink, difficulty swallowing, changes in breathing, such as breathing that becomes irregular with pauses, or noisy breathing from secretions in the throat, cool or mottled skin, especially on the hands, feet and knees, confusion or agitation, and passing less urine.\n\n' +
        'Signs can come and go, and some people improve for a while, so the clinical team reviews the person regularly. Your observations and records are an important part of this. Tell the senior promptly about any change.\n\n' +
        'Food and drink needs naturally reduce near the end of life. Do not force someone to eat or drink, as this can cause choking and distress. Offer small amounts of food and fluids the person enjoys, if they want them and can swallow safely. Mouth care is very important, because a dry mouth is uncomfortable: keep the lips moist and the mouth clean using the products and method in their care plan. Decisions about clinically assisted hydration are made by the clinical team with the person and their family.\n\n' +
        'Anticipatory medicines, sometimes called just in case medicines, are often prescribed in advance so they are available quickly for pain, breathlessness, nausea, agitation or noisy breathing, especially out of hours. Know whether the person has them and where they are.\n\n' +
        'The person may still be able to hear until very close to death. Keep talking to them gently, tell them what you are doing, and encourage family to speak to them and hold their hand.',
      scenario: {
        situation: 'Over two days Mrs Lewis has been sleeping most of the time, has only taken sips of water, her breathing has changed with short pauses, and her knees look mottled. Her son asks whether you can get her to eat something.',
        prompt: 'What should you do?',
        answer: 'Report the changes to the senior or nurse straight away, as they may be signs that she is entering the last days of life and she needs a clinical review. Explain gently to her son that people often need much less food and drink near the end of life and that forcing food can cause distress or choking. Offer sips or mouth care if she wants, keep her lips moist, and encourage him to sit with her, talk to her and hold her hand, as she may still hear him.',
      },
      check: {
        question: 'Why should you not force someone to eat or drink in the last days of life?',
        options: ['It is against the law', 'It can cause choking and distress, and needs naturally reduce', 'It makes the room messy', 'Families prefer it'],
        correct: 1,
        explanation: 'Appetite and thirst naturally reduce near the end of life. Offer what the person wants if they can swallow safely, and focus on comfort and mouth care.',
      },
      image_prompt: 'A care worker gently applying lip balm with a soft swab to an older woman resting in bed with her eyes closed, a family member holding her hand on the other side, a small glass of water and mouth care items on the bedside table.',
      image_alt: 'A care worker giving gentle mouth care to a woman in bed while a relative holds her hand',
    },
    {
      heading: 'Symptoms and comfort',
      minutes: 5,
      body:
        'Common symptoms towards the end of life include pain, breathlessness, nausea and vomiting, constipation, anxiety, agitation or restlessness, and noisy breathing. Symptoms have many causes, and the right response depends on the cause, so observe carefully and report.\n\n' +
        'Pain is not always reported. People with dementia or who cannot speak may show pain through facial expressions, groaning, restlessness, guarding part of the body, changes in behaviour or refusing care. Pain assessment tools designed for people who cannot tell you, such as the Abbey Pain Scale, help. Report pain promptly, and report if pain relief does not seem to be working. Symptoms that are not controlled must be escalated, including at night, weekends and bank holidays, through the out of hours GP, district nurses or the specialist palliative care advice line.\n\n' +
        'Non drug comfort measures make a real difference. Change the person\'s position regularly and carefully to relieve pressure and aid breathing, following their care plan and moving and handling plan. Keep them clean, dry and comfortable, with good mouth, eye and skin care. For breathlessness, sit them upright if they wish, open a window or use a fan towards the face, and stay calm. Reduce noise and bright light. For restlessness, check for causes such as a full bladder, constipation, pain or being too hot, and provide familiar voices, music or touch.\n\n' +
        'Some people have a syringe pump, which gives medicines under the skin continuously. Registered nurses set it up and manage it. Your role is to observe and report: if the alarm sounds, the site looks red or swollen, the line is disconnected, or the person\'s symptoms change. Never adjust it yourself.\n\n' +
        'Noisy breathing near the end of life, caused by secretions the person can no longer clear, can be distressing for families but is not usually distressing for the person. Repositioning may help; report it so the nurse can consider medicine, and explain it gently to relatives.',
      scenario: {
        situation: 'Mr Davies, who has advanced dementia and cannot tell you how he feels, is grimacing, groaning and pulling away when you try to reposition him. It is Saturday evening.',
        prompt: 'What should you do?',
        answer: 'Treat this as possible pain. Stop and reassure him, and report it to the senior or nurse now. A pain assessment tool such as the Abbey Pain Scale can help show his level of pain. If he has anticipatory pain relief, the nurse can consider giving it; if not, or if it does not work, escalate out of hours to the GP service, district nurses or palliative care advice line, as weekends are no reason to wait. Record your observations and what was done.',
      },
      check: {
        question: 'What is your role with a syringe pump?',
        options: ['Adjust the dose if the person is in pain', 'Remove it if it alarms', 'Observe and report alarms, site problems or changes in symptoms', 'Refill it from the medicine trolley'],
        correct: 2,
        explanation: 'Registered nurses set up and manage syringe pumps. Care workers observe and report problems, and never adjust the pump.',
      },
      image_prompt: 'A care worker and a nurse gently repositioning an older man in a care home bed with pillows for comfort, a small fan on the bedside table, calm soft lighting, careful and respectful body language.',
      image_alt: 'A care worker and nurse gently repositioning an older man in bed with pillows for comfort',
    },
    {
      heading: 'Emotional, spiritual and cultural support',
      minutes: 5,
      body:
        'Approaching the end of life can bring many feelings: fear, sadness, anger, guilt, regret, relief or peace. People may worry about pain, about being a burden, about the people they will leave behind, or about what happens after death. Loss starts before death: loss of independence, of roles, of their home, of their future. Listen without judging, accept the feelings the person has, and do not tell them how they should feel.\n\n' +
        'Spiritual needs are about meaning, hope, love and connection, and are not only religious. Some people want to reflect on their life, put things right with someone, or leave something behind, such as letters, recordings or a memory box. Others want to pray, receive sacraments, or have a faith leader visit. Ask what would help, and support them to do what matters to them.\n\n' +
        'Culture and faith shape practices around dying and death. For example, some people want family present at all times, readings or prayers at the bedside, particular positioning of the bed, or specific practices immediately after death. Do not assume based on a person\'s background: ask the person and their family, and record their wishes in the care plan.\n\n' +
        'Dignity matters throughout. Keep the person clean and well presented in the way they would want, close doors and curtains during personal care, use their preferred name, and talk to them, not over them. Some people want company, others want time alone; respect their choice while checking on them regularly and making sure they can call for help.\n\n' +
        'Low mood is common, but depression is not inevitable and can be treated. Report signs such as persistent hopelessness, withdrawal or talk of wanting to die sooner, so the person can be offered support.',
      scenario: {
        situation: 'Mrs Rahman, a Muslim woman in the last days of life, is being cared for in her room. Her family ask whether they can be with her all the time and read from the Qur\'an at her bedside, and ask what will happen after she dies.',
        prompt: 'How should you respond?',
        answer: 'Welcome them and support them to be with her and read at her bedside, making sure they have chairs, drinks and privacy. Ask them, and her if she is able, what practices are important to them before and after death, rather than assuming, and record these wishes in her care plan. Share them with the senior and nurse so they can be followed, including any wishes about who cares for her body after death and timing of funeral arrangements.',
      },
      check: {
        question: 'What is the best way to find out someone\'s cultural or religious wishes at the end of life?',
        options: ['Ask the person and their family, and record it in the care plan', 'Assume from their background', 'Look it up online', 'Follow what was done for the last resident'],
        correct: 0,
        explanation: 'People of the same faith or culture differ in what they want. Asking and recording their wishes means everyone can support them in the way that matters to them.',
      },
      image_prompt: 'A family of three gathered around an older woman resting in a care home bed, one relative reading quietly from a small book, a care worker placing a tray of drinks on the side table, soft warm light, peaceful atmosphere.',
      image_alt: 'A family gathered around a woman in bed, one reading quietly, while a care worker brings drinks',
    },
    {
      heading: 'Families, carers and working together',
      minutes: 5,
      body:
        'The people important to someone who is dying may be family, friends, partners or neighbours. Many are also carers, and may not see themselves that way. They may be exhausted, anxious, grieving before the death, or in conflict with each other. Recognise their knowledge of the person and, where they wish, support them to keep doing things for their loved one, such as helping with mouth care or feeding.\n\n' +
        'Give families honest, clear information within what you are permitted to share, and involve the nurse or senior for medical questions. Explain what changes they may see, such as changes in breathing, so they are not frightened. Make them welcome, offer drinks, somewhere to rest, and privacy, and make sure they know how to reach the person\'s care team. Tell them they can go home to rest and that you will call them if there is a change, if that is what they want.\n\n' +
        'Carers are entitled to a carer\'s assessment from their local authority, and may benefit from support from organisations such as hospices, carers\' centres and bereavement services. Be alert to young carers, children or young people who help care for a family member, who may need support of their own.\n\n' +
        'Good end of life care depends on working in partnership: the person, their family, care staff, the GP, district and palliative care nurses, hospices, pharmacists, social workers, chaplains and faith leaders. Share relevant information promptly and accurately, including the person\'s wishes, so they do not have to repeat themselves. Know the referral routes to specialist palliative care. Use handovers and records to make sure everyone knows the plan, especially out of hours.\n\n' +
        'Grief is a natural response to loss and is different for everyone. People may move between focusing on their loss and getting on with daily life. After a death, offer families time and compassion, and information about bereavement support.',
      scenario: {
        situation: 'Mr Wood\'s wife has been at his bedside for three days and nights. She looks exhausted, hasn\'t eaten, and says she cannot leave in case he dies while she is away.',
        prompt: 'How could you support her?',
        answer: 'Acknowledge how hard this is and how much she loves him. Offer her food, a drink and somewhere comfortable to rest nearby. Ask what would help: some people want to stay, and some find it helps to know staff will sit with the person and call them straight away if anything changes. Respect her choice. Let the senior know how she is, so her needs can be considered, and mention support such as the hospice or carers\' services.',
      },
      check: {
        question: 'Who is entitled to request a carer\'s assessment from the local authority?',
        options: ['Only paid care workers', 'Nobody', 'Only people aged over 65', 'Carers, such as family members who look after someone'],
        correct: 3,
        explanation: 'Unpaid carers, including family and friends, are entitled to a carer\'s assessment to identify support they may need.',
      },
      image_prompt: 'A care worker offering a cup of tea and a blanket to a tired older woman sitting in an armchair beside her husband\'s bed in a care home, the man asleep, soft evening light, compassionate mood.',
      image_alt: 'A care worker offering tea and a blanket to a tired woman sitting beside her husband\'s bed',
    },
    {
      heading: 'Care after death and caring for yourself',
      minutes: 4,
      body:
        'When a person dies, care continues. If the death was expected, follow your workplace\'s procedure: note the time, inform the senior or nurse, and contact the person responsible for verifying the death, such as a registered nurse, doctor or paramedic trained to do so. If the death was unexpected or there are any concerns, do not move the person or remove anything, and call 999 and your manager, as the police and coroner may need to be involved.\n\n' +
        'Care after death is carried out with dignity and respect for the person\'s wishes, culture and faith, following national guidance such as Hospice UK\'s care after death guidance and your policy. It usually includes laying the person flat with a pillow under the head, closing the eyes and mouth if possible, washing and dressing them as their family or faith requires, and making them presentable for family to visit. Some faiths have specific practices and may prefer family or faith members to carry them out, so check the care plan and ask. Wear gloves and an apron, and follow infection control precautions. Record and safeguard the person\'s property and valuables, and record who they were given to.\n\n' +
        'Since 9 September 2024, every death in England and Wales is reviewed by a medical examiner or referred to a coroner. The death is registered, usually by a relative, within five days of the medical examiner\'s office confirming it can be registered. Knowing this helps you explain to families what happens next.\n\n' +
        'Caring for someone who is dying and their family is a privilege, but it can affect you deeply. You may feel sadness, grief or distress, especially if you knew the person well or the death reminds you of your own losses. This is normal. Take time to reflect, talk to colleagues, use debriefs and supervision, and access your employer\'s support. Know the limits of your role and ask for help when you need it. Looking after yourself means you can keep giving compassionate care.',
      scenario: {
        situation: 'Mrs Kelly, whom you have cared for over four years, has died peacefully. Her death was expected. You are asked to help with care after death, and you feel upset.',
        prompt: 'What should you do?',
        answer: 'Follow your workplace\'s procedure: make sure the senior or nurse is informed and the death is verified by someone trained to do so. Carry out care after death with dignity, following her care plan and any wishes about her faith and culture, wearing gloves and an apron, and record her property. Check how her family would like to be involved. Acknowledge your own feelings: it is normal to be upset. Take a short break if you need to, talk to a colleague, and use supervision or a debrief afterwards.',
      },
      check: {
        question: 'Since September 2024, every death in England and Wales is reviewed by:',
        options: ['The care home manager', 'The family\'s solicitor', 'The police', 'A medical examiner, or referred to a coroner'],
        correct: 3,
        explanation: 'The statutory medical examiner system means every death is independently reviewed by a medical examiner or investigated by a coroner before registration.',
      },
      image_prompt: 'Two care workers standing quietly together in a softly lit care home corridor, one with a comforting hand on the other\'s shoulder, a vase of fresh flowers on a small table beside them, gentle and supportive.',
      image_alt: 'A care worker comforting a colleague in a quiet corridor beside a vase of flowers',
    },
  ],
  activities: [
    {
      id: 'eol-act-1', type: 'sort', after_section: 0,
      title: 'Person centred or not?',
      instructions: 'Sort each approach to end of life care.',
      bins: [
        { id: 'yes', name: 'Person centred', note: 'Built around what matters to the person' },
        { id: 'no', name: 'Not person centred', note: 'Built around routine or assumptions' },
      ],
      items: [
        { text: 'Asking what would make today a good day', bin: 'yes' },
        { text: 'Playing the person\'s favourite music', bin: 'yes' },
        { text: 'Supporting them to stay where they choose to be cared for', bin: 'yes' },
        { text: 'Assuming what someone wants because of their religion', bin: 'no' },
        { text: 'Washing everyone at the same time every morning regardless of wishes', bin: 'no' },
        { text: 'Talking over the person to their relatives', bin: 'no' },
      ],
    },
    {
      id: 'eol-act-2', type: 'sort', after_section: 1,
      title: 'Helpful or unhelpful?',
      instructions: 'Sort each response to someone who wants to talk about dying.',
      bins: [
        { id: 'help', name: 'Helpful', note: 'Opens up conversation' },
        { id: 'unhelp', name: 'Unhelpful', note: 'Closes it down' },
      ],
      items: [
        { text: '"What is on your mind?"', bin: 'help' },
        { text: 'Sitting quietly and allowing silence', bin: 'help' },
        { text: '"I will ask the nurse to come and talk with you"', bin: 'help' },
        { text: '"Don\'t talk like that, you will be fine"', bin: 'unhelp' },
        { text: 'Changing the subject to the weather', bin: 'unhelp' },
        { text: 'Guessing how long they have left', bin: 'unhelp' },
      ],
    },
    {
      id: 'eol-act-3', type: 'match', after_section: 2,
      title: 'Plans and decisions',
      instructions: 'Match each term to its meaning.',
      pairs: [
        { term: 'Advance statement', definition: 'Wishes and preferences that must be taken into account, but are not legally binding' },
        { term: 'Advance decision to refuse treatment', definition: 'A legally binding refusal of specific treatment, if valid and applicable' },
        { term: 'Lasting power of attorney for health and welfare', definition: 'A named person can make decisions if the person lacks capacity' },
        { term: 'DNACPR', definition: 'CPR will not be attempted; all other care continues' },
        { term: 'ReSPECT', definition: 'A plan recording priorities and recommendations for emergency care' },
      ],
    },
    {
      id: 'eol-act-4', type: 'sort', after_section: 3,
      title: 'Possible signs of the last days of life',
      instructions: 'Sort each observation.',
      bins: [
        { id: 'sign', name: 'Possible sign of the last days', note: 'Report for clinical review' },
        { id: 'not', name: 'Not usually a sign', note: 'Still record anything unusual' },
      ],
      items: [
        { text: 'Sleeping most of the day and harder to wake', bin: 'sign' },
        { text: 'Breathing with long pauses', bin: 'sign' },
        { text: 'Cool, mottled skin on the knees and feet', bin: 'sign' },
        { text: 'Only taking sips of fluid', bin: 'sign' },
        { text: 'Asking for a second helping at lunch', bin: 'not' },
        { text: 'Walking to the lounge to join an activity', bin: 'not' },
      ],
    },
    {
      id: 'eol-act-5', type: 'match', after_section: 4,
      title: 'Comfort measures',
      instructions: 'Match each symptom to a comfort measure within a care worker\'s role.',
      pairs: [
        { term: 'Breathlessness', definition: 'Sitting upright and a fan directed towards the face' },
        { term: 'Dry mouth', definition: 'Regular mouth care and moist lips' },
        { term: 'Restlessness', definition: 'Checking for a full bladder, pain or being too hot' },
        { term: 'Pressure on the skin', definition: 'Regular, careful repositioning as the care plan says' },
        { term: 'Uncontrolled pain', definition: 'Report promptly and escalate, including out of hours' },
      ],
    },
    {
      id: 'eol-act-6', type: 'match', after_section: 5,
      title: 'Types of support',
      instructions: 'Match each need to a way of supporting it.',
      pairs: [
        { term: 'Spiritual need', definition: 'Arranging a visit from a faith leader or time to reflect' },
        { term: 'Emotional need', definition: 'Listening without judging to fears and worries' },
        { term: 'Cultural need', definition: 'Asking about and recording practices around dying and death' },
        { term: 'Dignity', definition: 'Closing curtains and using the person\'s preferred name' },
      ],
    },
    {
      id: 'eol-act-7', type: 'sort', after_section: 6,
      title: 'Supporting families',
      instructions: 'Sort each action.',
      bins: [
        { id: 'good', name: 'Supportive', note: 'Helps families and carers' },
        { id: 'poor', name: 'Unsupportive', note: 'Could add to distress' },
      ],
      items: [
        { text: 'Explaining gently what changes in breathing may mean', bin: 'good' },
        { text: 'Offering drinks and somewhere to rest', bin: 'good' },
        { text: 'Telling them about bereavement and carers\' support', bin: 'good' },
        { text: 'Sharing a guess about how long the person has', bin: 'poor' },
        { text: 'Asking them to leave during a quiet moment without reason', bin: 'poor' },
        { text: 'Not telling them how to reach the care team out of hours', bin: 'poor' },
      ],
    },
    {
      id: 'eol-act-8', type: 'order', after_section: 7,
      title: 'After an expected death',
      instructions: 'Put the steps into a sensible order.',
      steps: [
        'Note the time and inform the senior or nurse',
        'Arrange for the death to be verified by someone trained to do so',
        'Check the care plan and ask about cultural and faith wishes',
        'Carry out care after death with dignity, wearing gloves and an apron',
        'Record and safeguard the person\'s property and valuables',
        'Support the family and take time to look after yourself',
      ],
    },
  ],
  references: [
    { title: 'End of Life Care Core Skills Education and Training Framework (2017)', url: 'https://www.skillsforhealth.org.uk/content/uploads/2021/01/EoLC-Core-Skills-Training-Framework.pdf', source: 'Health Education England, Skills for Health and Skills for Care', note: 'The framework this course is mapped to, at Tier 2. A revised version is under review but not yet published, so this remains current.' },
    { title: 'Statutory and mandatory training guide for adult social care employers (December 2025)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf', source: 'Skills for Care', note: 'Lists end of life care as training that should align to the relevant core skills framework, which is the one above.' },
    { title: 'Care of dying adults in the last days of life (NG31)', url: 'https://www.nice.org.uk/guidance/ng31', source: 'NICE', note: 'How to recognise the last days of life, manage symptoms, support hydration and involve people in decisions. The basis for sections 4 and 5.' },
    { title: 'End of life care for adults: service delivery (NG142)', url: 'https://www.nice.org.uk/guidance/ng142', source: 'NICE', note: 'How services should identify people approaching the end of life, plan their care and support carers.' },
    { title: 'ReSPECT', url: 'https://www.resus.org.uk/respect', source: 'Resuscitation Council UK', note: 'The Recommended Summary Plan for Emergency Care and Treatment, used in many areas to record emergency care recommendations, including CPR.' },
    { title: 'Mental Capacity Act 2005 Code of Practice', url: 'https://www.gov.uk/government/publications/mental-capacity-act-code-of-practice', source: 'GOV.UK', note: 'Explains capacity, best interests, advance decisions and lasting powers of attorney.' },
    { title: 'Care after death guidance', url: 'https://www.hospiceuk.org/publications-and-resources/care-after-death', source: 'Hospice UK', note: 'National guidance on caring for a person after death with dignity and respect.' },
    { title: 'An overview of the death certification reforms', url: 'https://www.gov.uk/government/publications/changes-to-the-death-certification-process/an-overview-of-the-death-certification-reforms', source: 'Department of Health and Social Care, GOV.UK', note: 'How the statutory medical examiner system introduced in September 2024 works.' },
    { title: 'What to do after someone dies: register the death', url: 'https://www.gov.uk/after-a-death', source: 'GOV.UK', note: 'How and when a death is registered, useful when families ask what happens next.' },
    { title: 'End of life care', url: 'https://www.nhs.uk/conditions/end-of-life-care/', source: 'NHS', note: 'Clear information for people and families about end of life care, planning ahead and what to expect.' },
  ],
  glossary: [
    { term: 'Palliative care', definition: 'Care that improves quality of life for people with a life limiting illness by relieving symptoms and supporting emotional, social and spiritual needs.' },
    { term: 'End of life care', definition: 'Care for people likely to die within the next 12 months, including the last days and hours of life.' },
    { term: 'Advance care planning', definition: 'Conversations about a person\'s wishes for future care, while they are able to express them.' },
    { term: 'Advance decision to refuse treatment', definition: 'A legally binding decision to refuse specific treatment in the future, if valid and applicable.' },
    { term: 'Lasting power of attorney', definition: 'A legal document naming someone to make decisions if the person loses capacity.' },
    { term: 'DNACPR', definition: 'Do not attempt cardiopulmonary resuscitation. It applies only to CPR.' },
    { term: 'ReSPECT', definition: 'Recommended Summary Plan for Emergency Care and Treatment.' },
    { term: 'Anticipatory medicines', definition: 'Medicines prescribed in advance, sometimes called just in case medicines, so symptoms can be treated quickly.' },
    { term: 'Syringe pump', definition: 'A small pump that gives medicines under the skin continuously, managed by registered nurses.' },
    { term: 'Abbey Pain Scale', definition: 'A tool for assessing pain in people who cannot say how they feel, such as people with advanced dementia.' },
    { term: 'Medical examiner', definition: 'An independent senior doctor who reviews deaths that are not referred to a coroner.' },
    { term: 'Care after death', definition: 'The respectful care given to a person\'s body after they have died.' },
  ],
  practical_checklist: [],
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. Person centred end of life care
    { id: 'q1', text: 'Palliative care aims to:', options: ['Cure the illness', 'Improve quality of life by relieving symptoms and supporting emotional, social and spiritual needs', 'Only manage the last hour of life', 'Move people to hospital'], correct: 1 },
    { id: 'q2', text: 'Who is the expert in a person\'s own life and wishes?', options: ['The GP', 'The person', 'The care home manager', 'The newest carer'], correct: 1 },
    { id: 'q3', text: 'A person\'s wishes about dying differ from your own beliefs. You should:', options: ['Try to change their mind', 'Report them', 'Respect their wishes', 'Ignore them'], correct: 2 },
    { id: 'q4', text: 'Person centred end of life care includes:', options: ['Only physical symptoms', 'Only what the family wants', 'Only medicines', 'Physical, emotional, social, spiritual and cultural needs'], correct: 3 },
    // Section 2. Communicating about dying
    { id: 'q5', text: 'A person asks how long they have left. You should:', options: ['Give your best guess', 'Change the subject', 'Acknowledge the question and arrange for the nurse or doctor to talk with them', 'Tell them not to worry'], correct: 2 },
    { id: 'q6', text: 'Which is an example of false reassurance?', options: ['"I will stay with you for a while"', '"What is worrying you?"', '"You will be fine"', '"Would you like to talk about it?"'], correct: 2 },
    { id: 'q7', text: 'Restlessness in a person with dementia near the end of life may be:', options: ['Always deliberate', 'Normal and never treatable', 'Nothing to report', 'A sign of pain, fear or another need'], correct: 3 },
    { id: 'q8', text: 'Why should important conversations about wishes be recorded?', options: ['So everyone caring for the person knows and follows their wishes', 'For the family only', 'It is not necessary', 'For legal action'], correct: 0 },
    // Section 3. Advance care planning and the law
    { id: 'q9', text: 'An advance statement of wishes and preferences is:', options: ['Not legally binding, but must be taken into account', 'Legally binding', 'Only for people in hospital', 'The same as a DNACPR'], correct: 0 },
    { id: 'q10', text: 'A person with a DNACPR decision develops a chest infection. What happens?', options: ['Nothing, they are DNACPR', 'Assessment and treatment continue; DNACPR only relates to CPR', 'They cannot see a GP', 'Their family must decide'], correct: 1 },
    { id: 'q11', text: 'Who normally makes a DNACPR decision?', options: ['A care worker', 'The receptionist', 'A neighbour', 'The senior clinician responsible, ideally with the person'], correct: 3 },
    { id: 'q12', text: 'Can a person change their advance care plan?', options: ['No, it is fixed', 'Yes, at any time while they are able to', 'Only once a year', 'Only with a solicitor'], correct: 1 },
    // Section 4. Recognising the last days of life
    { id: 'q13', text: 'Which of these may be a sign that someone is entering the last days of life?', options: ['Wanting to go shopping', 'A sudden improvement in appetite', 'Walking more', 'Cool, mottled skin on the hands and feet'], correct: 3 },
    { id: 'q14', text: 'Anticipatory medicines are:', options: ['Medicines prescribed in advance so symptoms can be treated quickly', 'Medicines given before meals', 'Vitamins', 'Medicines the family buys'], correct: 0 },
    { id: 'q15', text: 'Why is mouth care important in the last days of life?', options: ['It prevents a dry, uncomfortable mouth', 'It helps people eat more', 'It is only cosmetic', 'It is not important'], correct: 0 },
    { id: 'q16', text: 'Why should you keep talking gently to a person who seems unconscious?', options: ['They may still be able to hear', 'It passes the time', 'It is required by law', 'It wakes them up'], correct: 0 },
    // Section 5. Symptoms and comfort
    { id: 'q17', text: 'A person cannot tell you they are in pain. Which of these may show pain?', options: ['Smiling', 'Grimacing, groaning and guarding part of the body', 'Sleeping peacefully', 'Asking for a newspaper'], correct: 1 },
    { id: 'q18', text: 'Pain is not controlled on a Sunday evening. You should:', options: ['Escalate promptly using out of hours services', 'Wait until Monday', 'Give extra paracetamol from your bag', 'Tell the family to deal with it'], correct: 0 },
    { id: 'q19', text: 'A syringe pump alarm sounds. What should you do?', options: ['Report it to the nurse straight away', 'Switch it off and restart it', 'Adjust the rate', 'Remove the line'], correct: 0 },
    { id: 'q20', text: 'Which comfort measure can help breathlessness?', options: ['Lying flat', 'Closing all windows', 'Sitting upright and a fan directed towards the face', 'Encouraging a large meal'], correct: 2 },
    // Section 6. Emotional, spiritual and cultural support
    { id: 'q21', text: 'Spiritual needs at the end of life are:', options: ['About meaning, hope, love and connection, and may or may not be religious', 'Only about religion', 'Not the care worker\'s concern', 'Only for chaplains'], correct: 0 },
    { id: 'q22', text: 'A family asks to read prayers at the bedside. You should:', options: ['Refuse, it disturbs others', 'Support them and ask about any other wishes', 'Limit it to five minutes', 'Ask a manager to stop it'], correct: 1 },
    { id: 'q23', text: 'Which of these protects dignity?', options: ['Leaving the door open during personal care', 'Talking over the person', 'Closing curtains and using the person\'s preferred name', 'Using a nickname they dislike'], correct: 2 },
    { id: 'q24', text: 'A person at the end of life says they feel hopeless and want to die sooner. You should:', options: ['Ignore it, it is expected', 'Tell them to cheer up', 'Listen and report it so they can be offered support', 'Tell their family only'], correct: 2 },
    // Section 7. Families, carers and working together
    { id: 'q25', text: 'Young carers are:', options: ['Care workers under 25', 'Volunteers', 'Student nurses', 'Children or young people who help care for a family member'], correct: 3 },
    { id: 'q26', text: 'Why share the person\'s wishes with the wider care team promptly?', options: ['Only for audits', 'It is not allowed', 'To save paperwork', 'So they do not have to repeat themselves and everyone follows the plan'], correct: 3 },
    { id: 'q27', text: 'A relative is exhausted after days at the bedside. You could:', options: ['Tell them to go home', 'Offer food, drink and rest, and respect their choice about staying', 'Ignore them', 'Stop them visiting'], correct: 1 },
    { id: 'q28', text: 'Grief is:', options: ['The same for everyone', 'Always over in a month', 'A natural response to loss that is different for everyone', 'A mental illness'], correct: 2 },
    // Section 8. Care after death and caring for yourself
    { id: 'q29', text: 'If a death is unexpected, you should:', options: ['Carry out care after death straight away', 'Not move the person or remove anything, and call 999 and your manager', 'Wait for the family', 'Clean the room'], correct: 1 },
    { id: 'q30', text: 'When carrying out care after death, you should:', options: ['Leave it to the family', 'Remove all jewellery without recording it', 'Do it as quickly as possible without checking wishes', 'Follow the person\'s cultural and faith wishes, wear gloves and apron, and record their property'], correct: 3 },
    { id: 'q31', text: 'A death is usually registered within five days of:', options: ['The funeral', 'The care home invoice', 'The will being read', 'The medical examiner\'s office confirming it can be registered'], correct: 3 },
    { id: 'q32', text: 'You feel upset after the death of someone you cared for. This is:', options: ['Unprofessional', 'A sign you are in the wrong job', 'A normal response, and you should use the support available', 'Something to hide'], correct: 2 },
  ],
}
