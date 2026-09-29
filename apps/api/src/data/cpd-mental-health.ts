// Mental Health Awareness: full course content for CPD submission.
//
// Framework: Mental Health Core Capabilities Framework (Skills for Health,
// Skills for Care and NHS England, February 2026, replacing the 2016 Core
// Skills Education and Training Framework). This course is pitched at its
// Tier 1, "applicable to everyone", and each section maps to named Tier 1
// capabilities in the timings table. The Skills for Care statutory and
// mandatory training guide (December 2025) lists mental health as additional
// training set by the employer, and points to the relevant framework for
// content. Knowledge only: no observed practical.
//
// Timings total 60 minutes. Applied to the tier='cpd' module by
// scripts/apply-cpd-course.ts; the prebuilt tier is never touched.

import type { CpdCourse } from './cpd-course-types'

export const CPD_MENTAL_HEALTH: CpdCourse = {
  module_id: '6050a7d9-5bf0-4783-aa81-dd60eb216f07',
  name: 'Mental Health Awareness',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: false,
  description:
    'Mental health awareness for everyone working in adult social care, mapped to Tier 1 of the Mental Health ' +
    'Core Capabilities Framework (2026). It covers what mental health and wellbeing mean, common mental health ' +
    'needs, stigma, rights and trauma informed practice, communicating with people in distress, physical health ' +
    'and loneliness, older people and people with a learning disability or who are neurodivergent, recognising ' +
    'and responding to self harm and suicide, and working with families, other services and the law. Eight ' +
    'lessons with scenarios and activities, then a final assessment.',
  entry_requirements:
    'Foundation level. For all care workers and support staff in residential, nursing, home care, supported ' +
    'living and day services. No prior mental health training or qualification is needed. It gives general ' +
    'awareness for everyone and does not replace specialist training for roles that assess or treat mental ' +
    'health needs.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check so your learning gain can be measured, and ' +
    'finish with a 32 question assessment with a pass mark of 80%. The course is designed to be taken every year ' +
    'so your awareness stays current.',
  outcomes: [
    'Explain what mental health, mental wellbeing and poor mental health mean, and why respectful language matters',
    'Describe common mental health needs and how they may present in the people you support',
    'Recognise how stigma, inequality and trauma affect people, and apply a non judgemental, trauma informed approach',
    'Communicate calmly and empathetically with someone in distress, recognising behaviour as a form of communication',
    'Recognise the signs of self harm and suicidal thoughts, and know how to respond, report and signpost',
    'Know how to work with a person\'s support network and other services, within the law and the limits of your role',
  ],
  key_points: [
    'Everyone has mental health; more than 1 in 4 people in the UK experience a mental health need each year',
    'Use clear, respectful language and challenge stigma, including your own assumptions',
    'Listen, stay calm and remember that behaviour may be communication',
    'In older people, depression and delirium are often missed or mistaken for dementia: report changes',
    'Asking someone directly about suicide does not put the idea in their head, and it can save a life',
    'NHS 111 option 2 reaches urgent mental health help; call 999 if a life is at immediate risk',
    'Know the limits of your role, report concerns and involve the person\'s support network with their consent',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. Capability 2: mental health awareness, wellbeing and causes', minutes: 5 },
    { part: 'Section 2. Capabilities 2 and 12: common mental health needs', minutes: 5 },
    { part: 'Section 3. Capabilities 2 and 7: stigma, rights, equality and trauma', minutes: 5 },
    { part: 'Section 4. Capability 3: communication and positive relationships', minutes: 5 },
    { part: 'Section 5. Capability 1: physical health, loneliness and your own wellbeing', minutes: 5 },
    { part: 'Section 6. Capabilities 10 and 11: older people, learning disability and neurodivergence', minutes: 5 },
    { part: 'Section 7. Capability 4: recognising and responding to self harm and suicide', minutes: 5 },
    { part: 'Section 8. Capabilities 5, 6 and 16: support networks, partnership, law and safeguarding', minutes: 4 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'Roughly how many people in the UK experience a mental health need each year?', options: ['1 in 100', '1 in 20', 'More than 1 in 4', '9 in 10'], correct: 2 },
    { id: 'pc2', text: 'Does asking someone directly whether they are thinking about suicide increase the risk?', options: ['Yes, always', 'No, it does not, and it can help them talk', 'Only for younger people', 'Only if they have depression'], correct: 1 },
    { id: 'pc3', text: 'An older person becomes suddenly confused over a day or two. What could this be?', options: ['Normal ageing', 'Delirium, which needs urgent medical review', 'Attention seeking', 'Tiredness only'], correct: 1 },
    { id: 'pc4', text: 'Which phone option reaches urgent NHS mental health help in England?', options: ['NHS 111, option 2', '101', '112, option 5', 'There is none'], correct: 0 },
    { id: 'pc5', text: 'Which of these is respectful language?', options: ['"She is a schizophrenic"', '"He is mental"', '"A person living with depression"', '"A psycho"'], correct: 2 },
  ],
  sections: [
    {
      heading: 'What mental health means',
      minutes: 5,
      body:
        'Everyone has mental health, in the same way that everyone has physical health. Mental wellbeing is how we think, feel and cope with everyday life: feeling reasonably positive, managing stress, having relationships and a sense of purpose. Poor mental health is when that balance is lost for a time. A mental health need, or mental illness, is when difficulties with thoughts, feelings or behaviour last long enough, or are severe enough, to affect a person\'s daily life and may need support or treatment. People move along this range throughout their lives, and a person can live well with a diagnosed condition.\n\n' +
        'Mental health needs are common. The 2026 Mental Health Core Capabilities Framework notes that more than 1 in 4 people in the UK experience a mental health need each year. Among the people you support the rate is higher, because long term illness, pain, disability, bereavement, loss of independence and moving into care all put pressure on mental health.\n\n' +
        'There is rarely a single cause. Genetics, physical illness, medicines, trauma, loss, loneliness, money worries, poor housing, discrimination and substance use can all cause or worsen mental health needs. Basic needs come first: a person who is hungry, in pain, unsafe or isolated will struggle to engage with any support.\n\n' +
        'Mental health can also be protected. The Five Ways to Wellbeing are a simple, evidence based guide: connect with other people, be active, take notice of the world around you, keep learning, and give to others. In care these are everyday opportunities: a conversation over a cup of tea, a walk in the garden, a new hobby, a role such as laying the tables, and time to enjoy the moment. Supporting them is part of person centred care, not an extra.\n\n' +
        'Words matter. Say "a person living with depression" rather than labelling someone by their diagnosis, and never use terms such as "mental" or "psycho". Clear, respectful language helps people feel safe enough to ask for help.',
      scenario: {
        situation: 'Mr Clarke moved into the home six weeks ago after his wife died. He is polite but spends most days in his room, has stopped reading the paper and tells you "there is not much point to anything now".',
        prompt: 'What does this tell you, and what could you do?',
        answer: 'Bereavement and a move into care are major life events that put pressure on mental health, and his withdrawal and loss of interest could be signs of low mood or depression. Spend time with him, listen, and use the Five Ways to Wellbeing: invite him to connect with others, find out what he enjoys and offer meaningful activity. Record what you have noticed and report it to the senior so his GP can be involved if needed. His comment about there being no point should also be taken seriously and passed on.',
      },
      check: {
        question: 'Which of these is one of the Five Ways to Wellbeing?',
        options: ['Avoid other people', 'Connect with others', 'Stay indoors', 'Keep busy with work only'],
        correct: 1,
        explanation: 'The Five Ways to Wellbeing are connect, be active, take notice, keep learning and give. Connecting with other people is one of the strongest protections for mental health.',
      },
      image_prompt: 'An older man sitting in a care home garden with a care worker beside him, both holding cups of tea and talking warmly, a flower bed and a bird feeder nearby, a calm and hopeful atmosphere.',
      image_alt: 'A care worker sharing a cup of tea and a conversation with an older man in a garden',
    },
    {
      heading: 'Common mental health needs',
      minutes: 5,
      body:
        'You do not diagnose mental health conditions, but knowing the common ones helps you notice changes, understand what a person is going through and support their care plan.\n\n' +
        'Depression is more than feeling sad for a few days. It is a persistent low mood or loss of interest and pleasure lasting weeks, often with poor sleep, changes in appetite, tiredness, feelings of worthlessness or guilt, poor concentration, and sometimes thoughts of death or suicide. Anxiety disorders involve worry or fear that is hard to control and out of proportion, with physical symptoms such as a racing heart, breathlessness, sweating and restlessness; they include generalised anxiety, panic attacks, phobias and obsessive compulsive disorder. Post traumatic stress disorder can follow frightening or distressing events, with flashbacks, nightmares, avoidance and being constantly on edge.\n\n' +
        'Bipolar disorder involves episodes of depression and episodes of very high mood, called mania, with reduced need for sleep, racing thoughts and sometimes risky behaviour. Psychosis, which can occur in schizophrenia, severe depression, bipolar disorder, delirium and dementia, is when a person experiences things differently from those around them, such as hearing voices (hallucinations) or holding fixed beliefs that are not shared by others (delusions). These experiences are real to the person. Personality disorders describe long standing patterns in how a person thinks, feels and relates to others that cause them significant distress, often linked to past trauma. Eating disorders and problems with alcohol or drugs are also mental health needs.\n\n' +
        'Mental health needs vary between people with the same diagnosis, so the person\'s care plan and what they tell you matter more than the label. Look for changes from what is usual for them: in mood, sleep, appetite, self care, behaviour, speech or contact with others. Record what you see and hear, and report it.',
      scenario: {
        situation: 'Ms Barker, who lives with schizophrenia, tells you the television is sending messages about her and she is frightened to go into the lounge. Her care plan says she has experienced voices and fixed beliefs before, and that her mental health team should be told about changes.',
        prompt: 'How do you respond?',
        answer: 'Stay calm and take her fear seriously: the experience is real to her, even if you do not share it. Do not argue with the belief or laugh it off, and do not agree with it either. Acknowledge how frightening it must be, offer somewhere she feels safe, and check what helps her according to her care plan. Report the change to the senior today so her mental health team can be contacted, and record what she said in her own words.',
      },
      check: {
        question: 'What is psychosis?',
        options: ['A type of personality', 'Experiencing things differently from those around you, such as hallucinations or delusions', 'Feeling sad for a day', 'A physical illness only'],
        correct: 1,
        explanation: 'Psychosis is when a person experiences things differently from others, for example hearing voices or holding fixed beliefs that others do not share. It can occur in several conditions, including delirium and dementia.',
      },
      image_prompt: 'A care worker sitting at a calm distance beside a worried middle aged woman in a quiet, softly lit room, the care worker listening attentively with an open posture, a window with daylight behind them.',
      image_alt: 'A care worker listening calmly to a worried woman in a quiet room',
    },
    {
      heading: 'Stigma, rights and trauma informed care',
      minutes: 5,
      body:
        'Stigma is the negative attitudes and discrimination people face because of their mental health. It comes from stereotypes, jokes, media portrayals and careless language, and it causes real harm: people hide their difficulties, delay asking for help, lose work and relationships, and can come to believe the stereotypes about themselves, which is called self stigma. People can face more than one kind of discrimination at once, for example because of their age, race, sexuality or disability as well as their mental health.\n\n' +
        'People with mental health needs have the same rights as everyone else: to dignity, respect, privacy, choice and to be involved in decisions about their care. Under the Equality Act 2010 a mental health condition can count as a disability when it has a substantial and long term effect on day to day life, which means people are protected from discrimination and entitled to reasonable adjustments. The Human Rights Act 1998 protects rights such as respect for private and family life and freedom from degrading treatment.\n\n' +
        'Everyone has personal views and unconscious biases. Be aware of yours and how they might affect how you speak to or support someone. Challenge discriminatory practice when you see it, such as a colleague dismissing someone\'s distress as "attention seeking", and report it if it continues.\n\n' +
        'Trauma is the lasting effect of events that were frightening, threatening or overwhelming, such as abuse, violence, war, serious accidents, or experiences in institutions. Many people you support will have experienced trauma, often long ago, and it can shape how they react to care today. Personal care, being touched, raised voices, locked doors or not being believed can bring back feelings of threat. A trauma informed approach means asking "what has happened to you?" rather than "what is wrong with you?": offering choice and control, explaining what you are doing, keeping promises, and noticing what helps the person feel safe.',
      scenario: {
        situation: 'During handover a colleague describes Mrs Idowu, who has a diagnosis of personality disorder, as "a nightmare, she is just attention seeking again". Mrs Idowu becomes very distressed when staff enter her room without warning.',
        prompt: 'What should you do?',
        answer: 'Challenge the language calmly: labelling her as attention seeking is stigmatising and can stop her distress being taken seriously. Her reaction when people enter without warning may be linked to past trauma, so suggest a trauma informed approach: knock and wait, introduce yourself, explain what you are there for and offer her choices. If dismissive comments continue, raise it with the senior or manager, because stigma affects the quality of her care.',
      },
      check: {
        question: 'A trauma informed approach asks:',
        options: ['"What has happened to you?"', '"What is wrong with you?"', '"Why are you behaving like this?"', '"Who is to blame?"'],
        correct: 0,
        explanation: 'Trauma informed care recognises that past experiences shape how people react now. Asking what has happened, and offering safety, choice and control, helps people feel secure.',
      },
      image_prompt: 'A care worker knocking gently on an open bedroom door and waiting on the threshold, smiling and introducing themselves to an older woman seated inside, respectful body language, warm light.',
      image_alt: 'A care worker knocking and waiting at a bedroom door before entering, introducing themselves',
    },
    {
      heading: 'Communicating with someone in distress',
      minutes: 5,
      body:
        'How you communicate can calm a situation or make it worse. When someone is distressed, stay calm yourself, because your tone and body language are contagious. Speak slowly and clearly, keep sentences short and use the person\'s preferred name. Sit or stand at their level, at a comfortable distance, with an open posture. Give them time to respond, and avoid crowding them with several staff at once.\n\n' +
        'Active listening means giving your full attention, showing you are listening by nodding or saying "I see", reflecting back what you have heard ("It sounds like you are frightened about tonight") and asking open questions such as "How are you feeling?" or "What would help right now?". Do not rush to fix things, argue, minimise ("it is not that bad") or make promises you cannot keep. Empathy and a non judgemental response help a person trust you, and trust is what allows them to tell you what is wrong.\n\n' +
        'Behaviour is often communication. Pacing, shouting, refusing care, withdrawing or crying can mean pain, fear, confusion, boredom, hunger or a need that the person cannot put into words. Ask what they might be trying to tell you, and look for patterns in when it happens. Physical illness and the setting also affect communication: pain, infection, hearing or sight loss, noise and unfamiliar staff all make it harder. Check that hearing aids and glasses are in place, reduce noise and use the communication approaches in the care plan. For someone whose first language is not English, arrange an interpreter rather than relying on family where the conversation is sensitive.\n\n' +
        'Remember the Mental Capacity Act: a person must be assumed to have capacity to make their own decisions unless it is shown otherwise, and they should be supported to make decisions. Distress or a diagnosis does not, on its own, mean someone lacks capacity. Set clear, kind boundaries, and ask a senior for help when a situation is beyond your role.',
      scenario: {
        situation: 'In the evening Mr Fenton, who has anxiety, is pacing the hallway, breathing fast and saying he needs to get out. Two colleagues are telling him loudly to calm down and go back to his room.',
        prompt: 'What would help?',
        answer: 'Ask your colleagues, quietly, if you can speak with him alone, so he is not crowded. Stand to the side at a comfortable distance, speak slowly and calmly, and use his name. Acknowledge how he feels ("You seem really worried, I am here") and ask what is troubling him and what usually helps, such as slow breathing, a quieter space or a walk. Listen without arguing. Check for physical causes such as pain, and record and report what happened so his care plan can include what helped.',
      },
      check: {
        question: 'Which of these is an example of active listening?',
        options: ['Telling the person it is not that bad', 'Checking your phone while they talk', 'Finishing their sentences to save time', 'Reflecting back what they have said and asking open questions'],
        correct: 3,
        explanation: 'Active listening shows the person you are paying full attention. Reflecting back and asking open questions help them feel heard and help you understand what they need.',
      },
      image_prompt: 'A care worker standing slightly to the side of an anxious older man in a care home hallway, speaking calmly with open hands at chest height, the man beginning to relax, a quiet lounge doorway nearby.',
      image_alt: 'A care worker speaking calmly with open hands to an anxious man in a hallway',
    },
    {
      heading: 'Physical health, loneliness and your own wellbeing',
      minutes: 5,
      body:
        'Mental and physical health are closely linked. NHS England reports that people living with severe mental illness are at risk of dying 15 to 20 years earlier than other people, mostly from preventable physical illnesses such as heart disease, lung disease, diabetes and cancer. Some medicines for mental illness cause weight gain and other side effects, and people may find it hard to attend appointments or look after themselves when they are unwell. Supporting physical health is part of supporting mental health.\n\n' +
        'In practice that means encouraging good nutrition and hydration, regular activity and time outdoors, good sleep, and creative and social activities the person enjoys. Support people to attend health checks, screening, dental and eye appointments. People with severe mental illness are offered an annual physical health check by their GP. Where people smoke, drink heavily or use drugs, have a respectful conversation and signpost them to support, such as stop smoking services, in line with their care plan. Report physical changes, because pain, infection, constipation or thyroid problems can all show up as changes in mood or behaviour.\n\n' +
        'Loneliness is a serious risk to mental and physical health. Living in a busy care home does not protect people from feeling lonely, and people who receive care at home may see no one except their care worker for days. Help people keep in touch with family and friends, including by phone or video call, and to take part in community life, clubs, faith groups and activities they value. Social prescribing, through the GP, can connect people to community activities.\n\n' +
        'Your own mental health matters too. Care work is rewarding but can be emotionally demanding. Notice your own signs of stress, such as poor sleep, irritability or dreading work. Use the Five Ways to Wellbeing, take your breaks, talk to someone you trust, use supervision, and find out what support your employer offers, such as an employee assistance programme. Asking for help is a strength, not a weakness.',
      scenario: {
        situation: 'Ms Hart, who has bipolar disorder, has put on a lot of weight since starting a new medicine and has stopped going to her art group because she feels "too big and too tired". She has missed her annual health check.',
        prompt: 'How could you support her?',
        answer: 'Recognise that her physical and mental health are linked, and that medicine side effects may be affecting her mood and confidence. Talk with her kindly, without judgement, about what she would like to do. Report the weight gain and tiredness so her GP or mental health team can review her medicine, and support her to rebook the annual health check. Encourage her back to the art group or another activity she enjoys, perhaps with someone going with her at first.',
      },
      check: {
        question: 'On average, people living with severe mental illness are at risk of dying how much earlier than other people?',
        options: ['1 to 2 years', '5 years', '15 to 20 years', 'No difference'],
        correct: 2,
        explanation: 'NHS England reports a 15 to 20 year gap, mostly from preventable physical illness. Supporting physical health, activity and health checks is part of supporting mental health.',
      },
      image_prompt: 'A small group of older adults and a care worker doing a gentle painting activity at a table in a bright care home activity room, one woman smiling as she paints, plants and natural light around them.',
      image_alt: 'A care worker and older adults enjoying a painting activity together in a bright room',
    },
    {
      heading: 'Older people, learning disability and neurodivergence',
      minutes: 5,
      body:
        'Depression is common in older people but is often missed, because it can be put down to "just getting old", to physical illness or to dementia. It may show as tiredness, aches and pains, poor appetite, memory problems, irritability or withdrawal rather than obvious sadness. Anxiety, grief and loneliness are also common after loss, illness or a move into care. Older people have the same right to mental health assessment and treatment as anyone else, and should not face discrimination because of their age.\n\n' +
        'Know the difference between three conditions that can look alike. Dementia develops gradually over months or years. Delirium is a sudden change over hours or days, with confusion, poor attention, drowsiness or agitation, and sometimes hallucinations; it is often caused by infection, dehydration, constipation, pain or medicines, and it is a medical emergency that needs prompt review. Depression can affect memory and concentration and may be mistaken for dementia. Any sudden change in how someone thinks or behaves should be reported the same day.\n\n' +
        'Adapt how you communicate with older people: allow more time, check hearing aids and glasses, avoid talking over them to relatives, and respect their preferences, life history and the way they like to be addressed.\n\n' +
        'People with a learning disability, and people who are autistic or otherwise neurodivergent, have the same mental health needs as everyone else and are at higher risk of some, such as anxiety and depression. Their mental health needs may present differently, for example as changes in behaviour, sleep or routine, or as distress that others put down to their disability. This is called diagnostic overshadowing, and it means real conditions go untreated. Report changes from the person\'s usual presentation, and support reasonable adjustments to their care, such as longer appointments, easy read information, a quiet waiting area or a familiar person to accompany them.',
      scenario: {
        situation: 'Over two days Mrs Rowe, who has mild dementia, has become much more confused, drowsy and is seeing insects on the wall. A colleague says it is "just her dementia getting worse".',
        prompt: 'What do you do?',
        answer: 'A sudden change over hours or days is not typical of dementia and could be delirium, which is a medical emergency. Report it to the senior straight away so she can be reviewed by her GP or another clinician today. Note any possible causes, such as signs of infection, reduced drinking, constipation, pain or a recent change in medicines. Keep her safe, calm and well hydrated, with a familiar person, good lighting and her glasses and hearing aids in place.',
      },
      check: {
        question: 'Which of these most suggests delirium rather than dementia?',
        options: ['Gradual memory loss over two years', 'Enjoying old photographs', 'A sudden change in confusion and alertness over hours or days', 'Forgetting names occasionally'],
        correct: 2,
        explanation: 'Delirium comes on suddenly, often because of infection, dehydration, pain or medicines, and needs urgent medical review. Dementia develops gradually.',
      },
      image_prompt: 'A care worker gently helping an older woman with glasses drink a glass of water in a well lit bedroom, a family photograph and clock visible on the bedside table, calm and reassuring mood.',
      image_alt: 'A care worker helping an older woman to drink water in a well lit bedroom',
    },
    {
      heading: 'Self harm and suicide',
      minutes: 5,
      body:
        'Self harm is when a person intentionally hurts or poisons themselves, often as a way of coping with overwhelming feelings. It is not always linked to wanting to die, but it is a sign of serious distress and a risk factor for suicide, so it must always be taken seriously. Self harm can include cutting, burning, hitting, taking too much medicine, not eating or neglecting essential care.\n\n' +
        'Warning signs of suicidal thoughts include talking about wanting to die or being a burden, feeling hopeless or trapped, withdrawing from people, giving away possessions, saying goodbye, sudden calm after a period of deep distress, increased alcohol or drug use, and searching for or collecting means, such as stockpiling medicines. Risk is higher after a loss or bereavement, a new diagnosis or chronic pain, in older men, in people who have self harmed before, and in people who are isolated.\n\n' +
        'If you are worried, ask directly: "Are you thinking about suicide?" or "Are you thinking of ending your life?" Asking clearly does not put the idea into someone\'s head, and it often brings relief because they can finally talk. Listen without judging, do not promise to keep it secret, and do not leave the person alone if you think they are at immediate risk. Remove obvious means if you safely can, such as medicines.\n\n' +
        'Report every concern to the senior on duty straight away, and record what the person said in their own words. Follow the person\'s care plan or safety plan if they have one, which sets out their warning signs, what helps and who to contact. If there is immediate danger to life, or they have seriously harmed themselves, call 999. For urgent mental health help in England, anyone can call NHS 111 and choose option 2 to reach their local crisis service, 24 hours a day. Samaritans can be called free on 116 123 at any time. Supporting someone in crisis is upsetting, so look after yourself afterwards and use supervision.',
      scenario: {
        situation: 'While you help Mr Nowak, whose wife died last year and who lives with chronic pain, he says quietly, "I have been saving my tablets. Everyone would be better off without me."',
        prompt: 'What should you do?',
        answer: 'Take it seriously. Stay with him, stay calm and ask directly whether he is thinking about ending his life. Listen without judging, and tell him you are glad he told you and that you need to get him help, so you cannot keep it secret. Do not leave him alone. Tell the senior on duty immediately so the stored tablets can be safely removed and urgent help arranged, through his GP, the crisis service via NHS 111 option 2, or 999 if he is in immediate danger. Record his words exactly.',
      },
      check: {
        question: 'Does asking someone directly if they are thinking about suicide increase the risk?',
        options: ['No, it can help them talk and get support', 'Yes, it puts the idea in their head', 'Only if they are young', 'Only if you are not a nurse'],
        correct: 0,
        explanation: 'Asking directly does not increase risk. It shows you are willing to listen and often brings relief, and it is the first step to getting the person help.',
      },
      image_prompt: 'A care worker sitting close beside an older man on a sofa in a quiet lounge, leaning in and listening with full attention and a concerned, kind expression, the man looking down, soft daylight.',
      image_alt: 'A care worker sitting beside an older man and listening closely with a kind, concerned expression',
    },
    {
      heading: 'Working together, the law and safeguarding',
      minutes: 4,
      body:
        'Families, friends and carers often know the person best and can spot early warning signs. With the person\'s consent, involve them in planning care and keep them informed. Recognise that they may be under strain themselves, including young carers, and signpost them to carers\' support. If the person does not want their family involved, respect that unless there is a safeguarding or legal reason to share information.\n\n' +
        'Mental health support often involves several services: the GP, community mental health teams, crisis teams, social workers, advocates, pharmacists and voluntary organisations. Share relevant information promptly and accurately through your workplace\'s procedures, attend to what professionals ask you to observe, and help people access referrals and community support. Know the limits of your role and competence: when you are unsure, ask a senior rather than guess.\n\n' +
        'The law protects people\'s rights. The Mental Capacity Act 2005 applies to decisions about care and treatment: assume capacity, support the person to decide, respect unwise decisions, and act in their best interests, in the least restrictive way, only when they lack capacity for a specific decision. The Mental Health Act 1983 allows a person to be assessed and treated in hospital, in specific circumstances and with safeguards, when their mental disorder puts them or others at serious risk. Confidentiality and data protection law require you to share information only with those who need it, but you must share it when someone is at risk of harm.\n\n' +
        'People with mental health needs can be at greater risk of abuse, exploitation and neglect, including financial abuse and cuckooing. Know the signs and report concerns through your safeguarding procedure. The Care Act 2014 sets out six principles of adult safeguarding: empowerment, prevention, proportionality, protection, partnership and accountability. If a concern involves your manager, report it above them or directly to the local authority.',
      scenario: {
        situation: 'You support Mr Doyle, who has a psychosis diagnosis, in his own flat. You notice two new "friends" are often there, his food shopping has stopped and he says he has lent them his bank card.',
        prompt: 'What should you do?',
        answer: 'This could be financial abuse or exploitation, sometimes called cuckooing, which people with mental health needs are more vulnerable to. Do not confront the visitors. Talk to Mr Doyle privately and gently about what is happening and how he feels. Report your concerns to your manager as a safeguarding concern today, following your procedure, and record the facts you have seen and what he told you. His care coordinator or mental health team should also be informed.',
      },
      check: {
        question: 'Which of these is one of the six principles of adult safeguarding under the Care Act 2014?',
        options: ['Punishment', 'Secrecy', 'Speed', 'Proportionality'],
        correct: 3,
        explanation: 'The six principles are empowerment, prevention, proportionality, protection, partnership and accountability. Proportionality means the least intrusive response appropriate to the risk.',
      },
      image_prompt: 'A small multidisciplinary meeting around a table in a care home office, a care worker, a nurse, a social worker and a family member talking together with a care plan folder open, collaborative atmosphere.',
      image_alt: 'A care worker, nurse, social worker and family member discussing a care plan around a table',
    },
  ],
  activities: [
    {
      id: 'mh-act-1', type: 'match', after_section: 0,
      title: 'The Five Ways to Wellbeing',
      instructions: 'Match each of the Five Ways to Wellbeing to an everyday example in care.',
      pairs: [
        { term: 'Connect', definition: 'A chat over a cup of tea with another resident' },
        { term: 'Be active', definition: 'A walk around the garden' },
        { term: 'Take notice', definition: 'Watching the birds at the feeder and talking about them' },
        { term: 'Keep learning', definition: 'Trying a new craft or learning to video call family' },
        { term: 'Give', definition: 'Helping to lay the tables for lunch' },
      ],
    },
    {
      id: 'mh-act-2', type: 'match', after_section: 1,
      title: 'Common mental health needs',
      instructions: 'Match each mental health need to a description of it.',
      pairs: [
        { term: 'Depression', definition: 'Persistent low mood or loss of interest lasting weeks' },
        { term: 'Anxiety disorder', definition: 'Worry or fear that is hard to control, with physical symptoms such as a racing heart' },
        { term: 'Bipolar disorder', definition: 'Episodes of depression and episodes of very high mood' },
        { term: 'Psychosis', definition: 'Hearing voices or holding beliefs that others do not share' },
        { term: 'Post traumatic stress disorder', definition: 'Flashbacks, nightmares and feeling on edge after a traumatic event' },
      ],
    },
    {
      id: 'mh-act-3', type: 'sort', after_section: 2,
      title: 'Respectful or stigmatising?',
      instructions: 'Sort each phrase or action.',
      bins: [
        { id: 'respect', name: 'Respectful', note: 'Supports dignity and recovery' },
        { id: 'stigma', name: 'Stigmatising', note: 'Reinforces negative attitudes' },
      ],
      items: [
        { text: '"A person living with schizophrenia"', bin: 'respect' },
        { text: 'Asking "what has happened to you?"', bin: 'respect' },
        { text: 'Offering choice and explaining what you are doing', bin: 'respect' },
        { text: '"She is just attention seeking"', bin: 'stigma' },
        { text: '"He is a psycho"', bin: 'stigma' },
        { text: 'Joking about someone being "mental"', bin: 'stigma' },
      ],
    },
    {
      id: 'mh-act-4', type: 'order', after_section: 3,
      title: 'Supporting someone in distress',
      instructions: 'Put the steps of supporting a distressed person into a sensible order.',
      steps: [
        'Stay calm yourself and reduce crowding or noise',
        'Approach at their level, at a comfortable distance, using their name',
        'Acknowledge how they feel and ask an open question',
        'Listen actively without arguing or minimising',
        'Agree what might help, using their care plan',
        'Record what happened and what helped, and report it',
      ],
    },
    {
      id: 'mh-act-5', type: 'sort', after_section: 4,
      title: 'Protects or harms wellbeing?',
      instructions: 'Sort each situation by its likely effect on mental wellbeing.',
      bins: [
        { id: 'protect', name: 'Protects wellbeing', note: 'Supports mental and physical health' },
        { id: 'risk', name: 'A risk to wellbeing', note: 'May worsen mental or physical health' },
      ],
      items: [
        { text: 'A weekly video call with family', bin: 'protect' },
        { text: 'Support to attend an annual physical health check', bin: 'protect' },
        { text: 'Time outdoors each day', bin: 'protect' },
        { text: 'Days without any conversation', bin: 'risk' },
        { text: 'Missed appointments for medicine side effects', bin: 'risk' },
        { text: 'Staff skipping breaks and supervision for months', bin: 'risk' },
      ],
    },
    {
      id: 'mh-act-6', type: 'sort', after_section: 5,
      title: 'Dementia, delirium or depression?',
      instructions: 'Sort each description to the condition it most suggests.',
      bins: [
        { id: 'dementia', name: 'Dementia', note: 'Gradual, over months or years' },
        { id: 'delirium', name: 'Delirium', note: 'Sudden, over hours or days' },
        { id: 'depression', name: 'Depression', note: 'Low mood and loss of interest' },
      ],
      items: [
        { text: 'Memory slowly getting worse over two years', bin: 'dementia' },
        { text: 'Suddenly drowsy and confused since yesterday, with a urine infection', bin: 'delirium' },
        { text: 'Seeing insects on the wall after a change in medicines', bin: 'delirium' },
        { text: 'Lost interest in hobbies and says "what is the point" for weeks', bin: 'depression' },
        { text: 'Gradually finding it harder to follow conversations and manage money', bin: 'dementia' },
        { text: 'Poor appetite, poor sleep and feeling worthless since a bereavement', bin: 'depression' },
      ],
    },
    {
      id: 'mh-act-7', type: 'order', after_section: 6,
      title: 'Someone tells you they want to die',
      instructions: 'Put your response into order.',
      steps: [
        'Take it seriously and stay with the person',
        'Ask directly whether they are thinking about suicide',
        'Listen without judging, and do not promise secrecy',
        'Remove obvious means if you can do so safely',
        'Tell the senior on duty immediately, or call 999 if life is in immediate danger',
        'Record what the person said in their own words',
      ],
    },
    {
      id: 'mh-act-8', type: 'match', after_section: 7,
      title: 'Safeguarding principles',
      instructions: 'Match each Care Act safeguarding principle to what it means in practice.',
      pairs: [
        { term: 'Empowerment', definition: 'Supporting people to make their own decisions' },
        { term: 'Prevention', definition: 'Taking action before harm occurs' },
        { term: 'Proportionality', definition: 'The least intrusive response appropriate to the risk' },
        { term: 'Protection', definition: 'Support and representation for those in greatest need' },
        { term: 'Partnership', definition: 'Working with communities and services to prevent and respond to abuse' },
        { term: 'Accountability', definition: 'Being open and clear about everyone\'s role' },
      ],
    },
  ],
  references: [
    { title: 'Mental Health Core Capabilities Framework (2026)', url: 'https://www.skillsforhealth.org.uk/resources/mental-health-core-capabilities-framework/', source: 'Skills for Health, Skills for Care and NHS England', note: 'The framework this course is mapped to, at Tier 1, applicable to everyone. It replaced the 2016 Mental Health Core Skills Education and Training Framework.' },
    { title: 'Statutory and mandatory training guide for adult social care employers (December 2025)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf', source: 'Skills for Care', note: 'Lists mental health as additional training set by the employer and asks that training aligns with the relevant framework, which is the one above.' },
    { title: 'Care Certificate standards (March 2025)', url: 'https://www.skillsforcare.org.uk/Developing-your-workforce/Care-Certificate/Care-Certificate-standards.aspx', source: 'Skills for Care', note: 'Standard 9 covers awareness of mental health and dementia at induction. This course builds on it for annual refreshing.' },
    { title: 'NHS 111 offering crisis mental health support', url: 'https://www.england.nhs.uk/2024/08/nhs-111-offering-crisis-mental-health-support-for-the-first-time/', source: 'NHS England', note: 'How NHS 111 option 2 connects anyone in England to their local mental health crisis service, 24 hours a day.' },
    { title: 'Improving the physical health of people living with severe mental illness', url: 'https://www.england.nhs.uk/long-read/improving-the-physical-health-of-people-living-with-severe-mental-illness/', source: 'NHS England', note: 'The evidence on the 15 to 20 year mortality gap, and the annual physical health check offered through GPs.' },
    { title: 'Self-harm: assessment, management and preventing recurrence (NG225)', url: 'https://www.nice.org.uk/guidance/ng225', source: 'NICE', note: 'The national guideline on self harm, including how staff in all settings should respond without judgement.' },
    { title: 'Depression in adults: treatment and management (NG222)', url: 'https://www.nice.org.uk/guidance/ng222', source: 'NICE', note: 'The national guideline on recognising and treating depression, relevant to supporting people through their treatment plans.' },
    { title: 'Delirium: prevention, diagnosis and management (CG103)', url: 'https://www.nice.org.uk/guidance/cg103', source: 'NICE', note: 'Explains delirium, its common causes, and why a sudden change in thinking or behaviour needs prompt review.' },
    { title: 'Mental Capacity Act 2005 Code of Practice', url: 'https://www.gov.uk/government/publications/mental-capacity-act-code-of-practice', source: 'GOV.UK', note: 'The principles for supporting decisions and acting in a person\'s best interests, with worked examples.' },
    { title: 'Five steps to mental wellbeing', url: 'https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/', source: 'NHS', note: 'The NHS version of the Five Ways to Wellbeing, useful for staff and for sharing with the people you support.' },
  ],
  glossary: [
    { term: 'Mental wellbeing', definition: 'How we think, feel and cope with everyday life.' },
    { term: 'Mental health need', definition: 'Difficulties with thoughts, feelings or behaviour that affect daily life and may need support or treatment.' },
    { term: 'Stigma', definition: 'Negative attitudes and discrimination towards people because of their mental health.' },
    { term: 'Trauma informed care', definition: 'Care that recognises the effect of past trauma and offers safety, choice, trust and control.' },
    { term: 'Psychosis', definition: 'Experiencing things differently from those around you, such as hallucinations or delusions.' },
    { term: 'Delirium', definition: 'A sudden change in confusion and alertness, usually caused by physical illness or medicines, needing urgent review.' },
    { term: 'Diagnostic overshadowing', definition: 'When a person\'s symptoms are wrongly put down to an existing condition, such as a learning disability, so a new illness is missed.' },
    { term: 'Self harm', definition: 'Intentionally hurting or poisoning oneself, often as a way of coping with overwhelming feelings.' },
    { term: 'Safety plan', definition: 'A personal plan listing a person\'s warning signs, what helps them and who to contact in a crisis.' },
    { term: 'NHS 111 option 2', definition: 'The NHS phone route in England to local urgent mental health crisis support, available 24 hours a day.' },
    { term: 'Five Ways to Wellbeing', definition: 'Connect, be active, take notice, keep learning and give.' },
    { term: 'Cuckooing', definition: 'When someone takes over a vulnerable person\'s home, often for crime or financial gain.' },
  ],
  practical_checklist: [],
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. What mental health means
    { id: 'q1', text: 'Which statement about mental health is true?', options: ['Mental health never changes', 'Only some people have mental health', 'Everyone has mental health, just as everyone has physical health', 'Mental health needs are rare'], correct: 2 },
    { id: 'q2', text: 'The Mental Health Core Capabilities Framework says that each year in the UK, mental health needs affect:', options: ['Fewer than 1 in 100 people', 'About 1 in 20 people', 'More than 1 in 4 people', 'Everyone'], correct: 2 },
    { id: 'q3', text: 'Which of these can cause or worsen mental health needs?', options: ['Only genetics', 'Bereavement, loneliness and money worries', 'Only drug use', 'Nothing, they have no cause'], correct: 1 },
    { id: 'q4', text: 'Which is the most respectful way to describe someone?', options: ['"A depressive"', '"A person living with depression"', '"Mental"', '"A nutter"'], correct: 1 },
    // Section 2. Common mental health needs
    { id: 'q5', text: 'Depression is best described as:', options: ['Feeling sad for an afternoon', 'Being lazy', 'Always crying', 'Persistent low mood or loss of interest lasting weeks'], correct: 3 },
    { id: 'q6', text: 'Bipolar disorder involves:', options: ['A physical injury', 'Only anxiety', 'Hearing voices only', 'Episodes of depression and episodes of very high mood'], correct: 3 },
    { id: 'q7', text: 'A person describes hearing voices that others cannot hear. How should you respond?', options: ['Tell them the voices are not real', 'Agree the voices are real', 'Laugh it off to lighten the mood', 'Stay calm, take their experience seriously and report the change'], correct: 3 },
    { id: 'q8', text: 'When supporting someone with a diagnosis, what matters most?', options: ['The label alone', 'What other staff assume', 'The person, their care plan and changes from what is usual for them', 'Nothing, diagnosis is for doctors'], correct: 2 },
    // Section 3. Stigma, rights and trauma informed care
    { id: 'q9', text: 'Self stigma means:', options: ['Being proud of your recovery', 'Stigma from the media only', 'A type of medicine', 'A person coming to believe negative stereotypes about themselves'], correct: 3 },
    { id: 'q10', text: 'Under the Equality Act 2010, a mental health condition can count as a disability when:', options: ['It lasts a week', 'It has a substantial and long term effect on day to day life', 'A family member says so', 'Never'], correct: 1 },
    { id: 'q11', text: 'A colleague calls a distressed resident "attention seeking". What should you do?', options: ['Agree with them', 'Ignore it', 'Challenge the language calmly and report it if it continues', 'Tell the resident'], correct: 2 },
    { id: 'q12', text: 'Which of these is part of a trauma informed approach?', options: ['Entering rooms without warning', 'Offering choice, explaining what you are doing and keeping promises', 'Raising your voice to be clear', 'Asking "what is wrong with you?"'], correct: 1 },
    // Section 4. Communicating with someone in distress
    { id: 'q13', text: 'When someone is very distressed, it usually helps to:', options: ['Have several staff surround them', 'Speak slowly and calmly at a comfortable distance', 'Tell them to calm down loudly', 'Leave them alone for an hour'], correct: 1 },
    { id: 'q14', text: 'Behaviour such as pacing or shouting can be:', options: ['Ignored if it happens often', 'Always deliberate', 'A form of communication about pain, fear or an unmet need', 'A sign the person lacks capacity'], correct: 2 },
    { id: 'q15', text: 'Under the Mental Capacity Act, a person with a mental health diagnosis:', options: ['Always lacks capacity', 'Cannot make any decisions', 'Must be assumed to have capacity unless it is shown otherwise', 'Needs their family to decide for them'], correct: 2 },
    { id: 'q16', text: 'Which of these is an open question?', options: ['"Are you OK?"', '"Do you want a drink?"', '"What would help you right now?"', '"Is it your leg?"'], correct: 2 },
    // Section 5. Physical health, loneliness and your own wellbeing
    { id: 'q17', text: 'Most early deaths among people with severe mental illness are caused by:', options: ['Preventable physical illnesses such as heart and lung disease', 'Their mental illness alone', 'Old age', 'Accidents only'], correct: 0 },
    { id: 'q18', text: 'People living with severe mental illness are offered which check by their GP?', options: ['An annual physical health check', 'A weekly blood test', 'A hearing test only', 'None'], correct: 0 },
    { id: 'q19', text: 'Why is loneliness a concern for people receiving care?', options: ['It is not a concern in a busy home', 'It is a serious risk to mental and physical health, even among other people', 'It only affects younger people', 'It improves sleep'], correct: 1 },
    { id: 'q20', text: 'Which of these helps protect your own mental health at work?', options: ['Using supervision and talking to someone you trust', 'Keeping stress to yourself', 'Skipping breaks', 'Working extra shifts every week'], correct: 0 },
    // Section 6. Older people, learning disability and neurodivergence
    { id: 'q21', text: 'Depression in older people is often:', options: ['Easy to spot', 'Missed or put down to ageing, illness or dementia', 'Untreatable', 'Rare'], correct: 1 },
    { id: 'q22', text: 'Delirium is:', options: ['A sudden change in confusion and alertness that needs urgent review', 'A gradual decline over years', 'A normal part of ageing', 'A type of personality'], correct: 0 },
    { id: 'q23', text: 'Diagnostic overshadowing means:', options: ['A diagnosis is made too quickly', 'Sharing a diagnosis with family', 'A shadow on an X-ray', 'New symptoms are wrongly put down to an existing condition'], correct: 3 },
    { id: 'q24', text: 'Which is a reasonable adjustment for a person with a learning disability attending an appointment?', options: ['A shorter appointment', 'No explanation of what will happen', 'Easy read information and a familiar person to go with them', 'A busy waiting area'], correct: 2 },
    // Section 7. Self harm and suicide
    { id: 'q25', text: 'Which of these can be a warning sign of suicidal thoughts?', options: ['Making plans for a holiday', 'Joining a new club', 'Asking for a favourite meal', 'Giving away possessions and saying goodbye'], correct: 3 },
    { id: 'q26', text: 'If someone tells you they are thinking of ending their life, you should:', options: ['Wait until your next shift to report it', 'Promise to keep it secret', 'Change the subject', 'Stay with them, listen, and tell the senior immediately'], correct: 3 },
    { id: 'q27', text: 'In England, which number reaches urgent NHS mental health crisis support?', options: ['101', '0800 NHS', '118 118', 'NHS 111, option 2'], correct: 3 },
    { id: 'q28', text: 'When should you call 999 about someone in mental health crisis?', options: ['If there is immediate danger to life or they have seriously harmed themselves', 'Only after speaking to their family', 'Never', 'Only during the night'], correct: 0 },
    // Section 8. Working together, the law and safeguarding
    { id: 'q29', text: 'Before involving a person\'s family in their mental health care, you should normally:', options: ['Have the person\'s consent, unless there is a safeguarding or legal reason', 'Ask a neighbour', 'Never involve family', 'Share everything without asking'], correct: 0 },
    { id: 'q30', text: 'The Mental Health Act 1983 allows:', options: ['Anyone to be detained for any reason', 'Assessment and treatment in hospital in specific circumstances, with safeguards', 'Care workers to restrain people at home', 'Relatives to make all decisions'], correct: 1 },
    { id: 'q31', text: 'Cuckooing is:', options: ['When someone takes over a vulnerable person\'s home, often for crime or money', 'A type of therapy', 'A breathing exercise', 'A medicine side effect'], correct: 0 },
    { id: 'q32', text: 'If a safeguarding concern involves your manager, you should:', options: ['Report it above them or directly to the local authority', 'Confront the manager in front of others', 'Drop it', 'Wait for more evidence for six months'], correct: 0 },
  ],
}
