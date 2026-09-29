// GDPR and Data Protection Annual Refresher: full course content for CPD submission.
//
// Framework: the Data Security and Protection Toolkit (DSPT) staff training
// requirement for adult social care, whose four learning areas (data protection
// rights and responsibilities; keeping data secure; threats to data security;
// data breaches) are mapped section by section in the timings table. The law is
// UK GDPR and the Data Protection Act 2018 as amended by the Data (Use and
// Access) Act 2025, with ICO guidance, and the National Data Guardian's eight
// Caldicott Principles (2020). The Skills for Care statutory and mandatory
// training guide (December 2025) lists GDPR and data protection as training set
// by the employer. Knowledge only: no observed practical.
//
// Timings total 60 minutes. Applied to the tier='cpd' module by
// scripts/apply-cpd-course.ts; the prebuilt tier is never touched.

import type { CpdCourse } from './cpd-course-types'

export const CPD_GDPR: CpdCourse = {
  module_id: '118c178f-8387-4c0e-a6bd-3ccc4b25321f',
  name: 'GDPR and Data Protection Annual Refresher',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: false,
  description:
    'Annual data protection and data security refresher for everyone working in adult social care, meeting the ' +
    'Data Security and Protection Toolkit expectation of yearly staff training. Built on UK GDPR, the Data ' +
    'Protection Act 2018 as amended in 2025, ICO guidance and the Caldicott Principles, it covers the data ' +
    'protection principles, confidentiality and lawful sharing, people\'s rights, recording and storing ' +
    'information, cyber threats and scams, paper records and devices, and recognising and reporting data ' +
    'breaches. Eight lessons with scenarios and activities, then a final assessment.',
  entry_requirements:
    'Foundation level. For all staff, volunteers and managers in adult social care who see, record or share ' +
    'personal information, in care homes, home care, supported living and day services. No prior qualification ' +
    'is needed. Data protection leads may need further specialist training.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check so your learning gain can be measured, and ' +
    'finish with a 32 question assessment with a pass mark of 80%. The Data Security and Protection Toolkit ' +
    'expects staff to complete data security training every year.',
  outcomes: [
    'Explain the UK GDPR data protection principles and why health and care information is special category data',
    'Apply the Caldicott Principles and the duty of confidentiality when using and sharing information',
    'Describe people\'s rights over their information, including access requests and complaints, and how to respond',
    'Record, store, share and dispose of personal information securely, on paper and digitally',
    'Recognise cyber threats such as phishing and scams, and use devices, passwords and messaging safely',
    'Recognise a data breach, including data received in error, and report it immediately',
  ],
  key_points: [
    'Health and care information is special category data and needs extra protection',
    'Share on a need to know basis, but remember the duty to share can be as important as the duty to protect',
    'People have the right to see their information; pass access requests to your data protection lead straight away',
    'Lock screens, use strong passwords and never share logins',
    'Stop and check before clicking links or opening attachments; scams are often urgent and convincing',
    'Lock away paper records and use confidential waste; never leave records where others can see them',
    'Report a suspected breach immediately: your organisation may have to tell the ICO within 72 hours',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. Rights and responsibilities: data protection law and principles', minutes: 5 },
    { part: 'Section 2. Rights and responsibilities: confidentiality and the Caldicott Principles', minutes: 5 },
    { part: 'Section 3. Rights and responsibilities: people\'s rights over their information', minutes: 5 },
    { part: 'Section 4. Keeping data secure: sharing confidential information', minutes: 5 },
    { part: 'Section 5. Keeping data secure: recording, storing and disposing of information', minutes: 5 },
    { part: 'Section 6. Threats to data security: fraud, scams and cyber security', minutes: 5 },
    { part: 'Section 7. Threats to data security: devices, apps and paper records', minutes: 5 },
    { part: 'Section 8. Data breaches: recognising, containing and reporting', minutes: 4 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'Information about a person\'s health is:', options: ['Ordinary personal data', 'Special category data needing extra protection', 'Not personal data', 'Public information'], correct: 1 },
    { id: 'pc2', text: 'How long does an organisation normally have to respond to a request for a copy of someone\'s information?', options: ['One week', 'One month', 'Six months', 'A year'], correct: 1 },
    { id: 'pc3', text: 'You receive an email asking you to urgently confirm your password through a link. This is likely to be:', options: ['An IT update', 'A phishing scam', 'A message from your manager', 'Safe to click'], correct: 1 },
    { id: 'pc4', text: 'You send a resident\'s care plan to the wrong email address. What should you do?', options: ['Nothing, it was a mistake', 'Report it immediately as a possible data breach', 'Wait to see if anyone complains', 'Delete your sent items'], correct: 1 },
    { id: 'pc5', text: 'The Caldicott Principles are about:', options: ['Food hygiene', 'Using and sharing confidential information appropriately', 'Fire safety', 'Staff rotas'], correct: 1 },
  ],
  sections: [
    {
      heading: 'Data protection law and principles',
      minutes: 5,
      body:
        'Personal data is any information that identifies a living person, directly or indirectly: a name, address, date of birth, room number, photograph, NHS number, or a description that makes it clear who someone is. Some personal data is special category data, which needs extra protection because misuse could cause serious harm. It includes information about a person\'s health, including their care, medicines and conditions, as well as racial or ethnic origin, religious beliefs, sexual orientation and genetic data. Almost everything you record in care is special category data.\n\n' +
        'The law is UK GDPR and the Data Protection Act 2018, as amended by the Data (Use and Access) Act 2025. The Information Commissioner\'s Office (ICO) regulates it. UK GDPR sets seven principles for handling personal data. It must be used lawfully, fairly and transparently. It must be collected for specified purposes and not used for something unrelated. It must be adequate, relevant and limited to what is needed. It must be accurate and kept up to date. It must be kept no longer than necessary. It must be kept secure. And the organisation must be able to show it complies, which is called accountability.\n\n' +
        'Your employer is the data controller and is responsible for how personal data is used. It must have a lawful basis for each use. In care, this is usually not consent: it is normally that the processing is needed to provide care, under a contract or a public task, with the specific condition in UK GDPR for health and social care. This means people cannot usually "opt out" of their care records, but they must be told how their information is used, in a privacy notice.\n\n' +
        'You have a personal responsibility too. Only access the information you need for your role, use it only for care, keep it secure, and follow your workplace\'s data protection policy. Looking up someone\'s records out of curiosity, even a colleague or neighbour, is a serious breach and can be a criminal offence. The ICO can fine organisations, and staff can face disciplinary action.',
      scenario: {
        situation: 'A well known local person moves into the care home. A colleague who works on another unit and is not involved in their care opens their care record on the electronic system "just to see why they are here".',
        prompt: 'Is this acceptable, and what should happen?',
        answer: 'No. Staff should only access the information they need to do their job. Looking at a record out of curiosity is a breach of data protection and confidentiality, and knowingly obtaining personal data without authority can be a criminal offence. Remind your colleague, and report it to your manager or data protection lead, as the access may need to be treated as a data breach. Electronic systems usually keep audit trails of who opens records.',
      },
      check: {
        question: 'Which of these is special category data?',
        options: ['A person\'s favourite colour', 'The weather forecast', 'The name of the care home', 'Information about a person\'s health and care'],
        correct: 3,
        explanation: 'Health and care information is special category data under UK GDPR and needs extra protection, as do data about ethnicity, religion, sexuality and genetics.',
      },
      image_prompt: 'A care worker using a tablet with a digital care record at a quiet workstation in a care home, a privacy screen filter on the display, a padlock icon visible on the screen without readable text.',
      image_alt: 'A care worker using a secure digital care record on a tablet with a padlock symbol on screen',
    },
    {
      heading: 'Confidentiality and the Caldicott Principles',
      minutes: 5,
      body:
        'Alongside data protection law, the common law duty of confidentiality means information given in confidence, such as details of a person\'s health and care, should not be shared without the person\'s consent unless there is a legal requirement or a clear justification, such as protecting someone from serious harm.\n\n' +
        'The National Data Guardian\'s eight Caldicott Principles guide how confidential information is used in health and social care. First, justify the purpose for using confidential information. Second, use it only when it is necessary. Third, use the minimum necessary. Fourth, access should be on a strict need to know basis. Fifth, everyone with access must understand their responsibilities. Sixth, comply with the law. Seventh, the duty to share information for individual care is as important as the duty to protect confidentiality. Eighth, inform people about how their confidential information is used.\n\n' +
        'The seventh principle matters in care. Failing to share information can harm people, for example if a hospital is not told about a person\'s allergies, or a district nurse is not told about a pressure sore. Sharing relevant information with other professionals involved in someone\'s care, for their care, is normally expected and lawful. If you are unsure whether to share, ask your manager or data protection lead, but do not let uncertainty put someone at risk.\n\n' +
        'Safeguarding is a clear example. If you believe a person is at risk of abuse or neglect, you must share the information needed to protect them through your safeguarding procedure, even without consent. Data protection law does not stop this.\n\n' +
        'Confidentiality also applies to conversations. Do not discuss people you support in public places, on social media, or with your own friends and family, even without using names, because details can still identify them.',
      scenario: {
        situation: 'Mr Ellis is being taken to hospital by ambulance after a fall. The paramedic asks for his medicines list, allergies and DNACPR status. A new colleague hesitates, saying they cannot share information without his consent, and he is too confused to give it.',
        prompt: 'What should happen?',
        answer: 'Share the information. It is needed for his immediate care, and the duty to share information for individual care is as important as the duty to protect it. Give the paramedic the relevant information, such as his medicines, allergies, DNACPR or ReSPECT form and key care needs, following your transfer procedure, and record what was shared and with whom. Explain to your colleague why this is lawful and expected.',
      },
      check: {
        question: 'Which Caldicott Principle says sharing information for care matters as much as protecting it?',
        options: ['The duty to share information for individual care is as important as the duty to protect confidentiality', 'Use the minimum necessary', 'Justify the purpose', 'Comply with the law'],
        correct: 0,
        explanation: 'The seventh Caldicott Principle recognises that not sharing can cause harm. Relevant information should be shared with those providing care.',
      },
      image_prompt: 'A care worker handing a sealed transfer folder to a paramedic at the entrance of a care home, an ambulance visible outside, an older man on a wheeled stretcher chair with a blanket, calm and professional.',
      image_alt: 'A care worker handing a transfer folder to a paramedic as an older man is taken to hospital',
    },
    {
      heading: 'People\'s rights over their information',
      minutes: 5,
      body:
        'People have rights over their personal information under UK GDPR. They have the right to be informed about how it is used, usually through a privacy notice. They have the right of access, to see and get a copy of their information, called a subject access request. They have the right to have inaccurate information corrected, and in some circumstances the rights to have information erased, to restrict or object to how it is used, and to move it to another organisation.\n\n' +
        'A subject access request can be made verbally or in writing, to anyone in the organisation, and does not have to use particular words. If someone asks you for a copy of their records, or says "I want to see what you have written about me", pass it to your manager or data protection lead straight away, recording the date. The organisation normally has one month to respond, which can be extended in some cases. Since the Data (Use and Access) Act 2025, the clock can be paused while the organisation asks for information it genuinely needs, such as proof of identity, and it only has to make reasonable and proportionate searches.\n\n' +
        'Other people may ask for someone\'s information: relatives, friends or other organisations. Relatives do not automatically have a right to see a person\'s records. They may have legal authority, such as a registered lasting power of attorney that covers the decision, or the person may consent to sharing. If not, refer the request to your manager. Records of people who have died are not covered by UK GDPR, but are still confidential, and access is handled under other law, such as the Access to Health Records Act 1990 for the personal representative. Refer these requests to your manager too.\n\n' +
        'People also have the right to complain. Since the 2025 changes, organisations must make it easy to complain about how personal information has been used, acknowledge complaints within 30 days, and respond without undue delay. People can also complain to the ICO.',
      scenario: {
        situation: 'On a visit, Mrs Carter says she is unhappy with something written in her daily notes and wants a copy of everything the agency holds about her.',
        prompt: 'What should you do?',
        answer: 'Treat this as a subject access request, even though she has not used those words or put it in writing. Tell her you will pass it on, record the date and her request, and report it to your manager or data protection lead straight away so it can be answered within the time limit. Her concern about the notes may also be a request to correct inaccurate information, or a complaint, so include that in your report.',
      },
      check: {
        question: 'A subject access request:',
        options: ['Must be in writing on a special form', 'Can be made verbally or in writing, to anyone in the organisation', 'Must be made to the ICO', 'Is only for staff'],
        correct: 1,
        explanation: 'A request can be made in any form, to anyone. Pass it to your data protection lead straight away so the organisation can respond within the time limit.',
      },
      image_prompt: 'A home care worker sitting with an older woman at her kitchen table, listening and writing a note on a small pad while the woman speaks, a folder of care notes on the table, respectful and attentive.',
      image_alt: 'A home care worker listening to an older woman and making a note at her kitchen table',
    },
    {
      heading: 'Sharing information safely',
      minutes: 5,
      body:
        'Before you share personal information, ask yourself: is there a good reason, does this person need to know for the person\'s care or safety, and am I sharing only what they need? Then share it securely.\n\n' +
        'On the phone, check who you are speaking to before discussing anyone. Callers claiming to be relatives, professionals or the police may not be who they say. Take their details and call them back through a verified number, or check with the person or their care plan who information can be shared with. Many services use a password or agreed contact list.\n\n' +
        'By email, only use approved, secure email accounts, never personal ones. Check the recipient address carefully before sending, especially with autofill, which is one of the most common causes of breaches. Use secure email or encryption for personal information, as your workplace directs, and put only the minimum needed in the subject line.\n\n' +
        'Messaging apps and social media need particular care. Only use apps your employer has approved for sharing care information. Never post anything about the people you support, their photographs or details of your work on personal social media, even in closed groups. Photographs of people you support may only be taken on approved devices, for an agreed purpose, with consent or a lawful reason.\n\n' +
        'Conversations can be overheard. Do handovers in private spaces, keep your voice down, and avoid discussing people in corridors, lifts, shops or on public transport. In people\'s own homes, be careful what you say in front of visitors, and never leave notes where others can read them.\n\n' +
        'When sharing with other organisations, such as a hospital, GP or local authority, follow your workplace\'s procedures, use secure methods, and record what was shared, with whom, when and why.',
      scenario: {
        situation: 'The phone rings. The caller says they are Mrs Singh\'s nephew, calling from abroad, and asks how she is and whether her dementia has got worse. He is not on her contact list.',
        prompt: 'What should you do?',
        answer: 'Do not share any information about her health, as you cannot confirm who he is and he is not on her agreed contact list. Be polite, take his name and number, and explain that you will pass on his message. Check with Mrs Singh, if she is able, or her next of kin or care plan, about whether he can be given information, and tell your manager. This protects her confidentiality without being unkind.',
      },
      check: {
        question: 'What is one of the most common causes of data breaches by email?',
        options: ['Using a strong password', 'Using secure email', 'Sending to the wrong recipient, often through autofill', 'Checking the address'],
        correct: 2,
        explanation: 'Emails sent to the wrong person are among the most common breaches. Always check the recipient before sending, and use secure methods for personal information.',
      },
      image_prompt: 'A care worker at a care home reception desk on the telephone, writing a caller\'s name and number on a blank message pad without reading out any records, a closed folder beside them, professional and polite.',
      image_alt: 'A care worker taking a caller\'s details on a message pad instead of sharing information',
    },
    {
      heading: 'Recording, storing and disposing of information',
      minutes: 5,
      body:
        'Care records are vital for safe care and are a legal record of what happened. Write records accurately, clearly and promptly, ideally at the time or as soon as possible afterwards. Record facts, what you saw, heard and did, and the person\'s own words where relevant, not opinions or judgements. Use respectful language, because people have the right to read what is written about them. If you make an error, correct it as your system allows, without deleting or obscuring the original.\n\n' +
        'Store information securely. Digital care records should only be accessed on approved devices, with your own login. Lock your screen whenever you step away and log out at the end of your shift. Paper records, such as medicine charts, handover sheets and care plans, should be kept in a locked cabinet or office when not in use, and never left on corridors, in lounges, in cars, or in people\'s homes where they are not meant to be kept.\n\n' +
        'Keep information only as long as it is needed. Your organisation has a retention schedule, guided by the national records management code of practice for health and social care, setting how long each type of record is kept. Do not create extra copies, such as personal notebooks or photos of handover sheets on your phone.\n\n' +
        'Dispose of information securely. Paper containing personal information goes in the confidential waste bin or shredder, never the ordinary bin or recycling. This includes handover notes, drafts, labels from medicine bottles and old lists. Devices and storage are disposed of by your IT provider so data cannot be recovered.\n\n' +
        'Clear desk and clear screen habits help: at the end of each task, put papers away, close records and lock the screen.',
      scenario: {
        situation: 'At the end of a night shift you notice several printed handover sheets with residents\' names, medicines and conditions left on the lounge coffee table and one in the ordinary kitchen bin.',
        prompt: 'What should you do?',
        answer: 'Gather them straight away, including the one from the bin, and put them in the confidential waste or shredder, or back in the secure file if still needed. Handover sheets contain special category data and should never be left where residents, visitors or contractors can see them. Report it to the senior or manager, as it may need to be assessed as a possible breach and the handover process reviewed.',
      },
      check: {
        question: 'Where should a used handover sheet with residents\' details go?',
        options: ['The ordinary bin', 'The recycling', 'Your bag to read later', 'The confidential waste bin or shredder'],
        correct: 3,
        explanation: 'Paper with personal information must be destroyed securely in confidential waste or a shredder so it cannot be read by anyone else.',
      },
      image_prompt: 'A care worker placing printed papers into a locked confidential waste bin with a slot in a care home office, a clear tidy desk and a computer with a locked screen showing a padlock icon.',
      image_alt: 'A care worker putting papers into a locked confidential waste bin beside a clear desk',
    },
    {
      heading: 'Fraud, scams and cyber security',
      minutes: 5,
      body:
        'Care organisations hold valuable information and are targeted by criminals. Most cyber attacks start with people, not technology, so your actions are the most important defence.\n\n' +
        'Phishing is when criminals send emails, texts or messages pretending to be someone trusted, such as your manager, a supplier, a bank, the NHS or IT support, to trick you into clicking a link, opening an attachment, entering your password or sending money or information. Warning signs include urgency or pressure ("act now or your account will close"), requests for passwords or payment, unexpected attachments, slightly wrong email addresses or links, poor spelling, and offers that seem too good to be true. Phone calls, called vishing, use the same tricks.\n\n' +
        'Stop, check and report. Do not click links or open attachments you are not expecting. Check with the sender using contact details you already have, not those in the message. Report suspicious messages to your manager or IT support, following your workplace\'s procedure. If you have already clicked or entered details, report it immediately; speed limits the damage, and you will not be blamed for reporting honestly.\n\n' +
        'Passwords protect everything. Use a strong password for each system, such as three random words, never reuse your work password elsewhere, and never share your login, even with a colleague or manager. Use multi factor authentication where it is available. Everything done under your login is recorded as you.\n\n' +
        'Install updates when prompted, only use approved software and apps, and never plug unknown USB sticks into work devices. Ransomware, which locks systems and records until a payment is made, can stop you accessing care plans and medicine records, so good security protects the people you support as well as their information.\n\n' +
        'People you support can also be targeted by scams by phone, post, email or doorstep. Be alert and report concerns through your safeguarding procedure.',
      scenario: {
        situation: 'You receive an email that looks like it is from your manager, saying they are in a meeting and need you to urgently buy gift cards for a resident\'s birthday and send the codes by reply. The email address is slightly different from usual.',
        prompt: 'What should you do?',
        answer: 'Do not reply, click anything or buy anything. The urgency, the request for gift cards and the slightly different address are classic signs of a phishing scam. Check with your manager directly using the phone number or contact details you already have, and report the email to your manager or IT support following your procedure. If you had already replied or sent anything, report that straight away.',
      },
      check: {
        question: 'Which of these is a warning sign of phishing?',
        options: ['An email from a colleague you were expecting', 'A message with no links', 'Urgent pressure to click a link or give a password', 'A calendar reminder you set'],
        correct: 2,
        explanation: 'Phishing uses urgency and pressure to make you act without thinking. Stop, check through a trusted route, and report it.',
      },
      image_prompt: 'A care worker at a computer in a care home office pausing with a thoughtful expression, the screen showing an email with a warning triangle symbol and a fishing hook icon, no readable text.',
      image_alt: 'A care worker pausing before clicking, with a warning symbol and hook icon on the email',
    },
    {
      heading: 'Devices, apps and paper records',
      minutes: 5,
      body:
        'Work phones, tablets and laptops hold or give access to a great deal of personal information. Keep them with you or locked away, use a PIN or password lock, and never let anyone else, including family, use them. Do not store care information on personal devices unless your employer has approved it and it is secured. If a work device is lost or stolen, report it immediately so it can be locked or wiped remotely.\n\n' +
        'Home care and community workers carry information between visits. Take only what you need, keep papers and devices out of sight and locked in the boot of your car rather than on the seat, never leave them in a car overnight, and do not leave notes about other people in someone\'s home. Take care when using devices in public places, where screens can be overlooked.\n\n' +
        'Messaging apps are convenient but risky. Only use apps your employer has approved for care information, and follow its rules. Messages sent to the wrong group or person, screenshots, and messages left on personal phones after someone leaves the job are common causes of breaches. Personal WhatsApp or similar groups should never be used to share information about the people you support unless your employer has formally approved and secured it.\n\n' +
        'Paper records are still widely used. Keep medicine charts, care plans and daily notes in their proper place, close files when you are not using them, and never take records home. Make sure fax machines, printers and photocopiers are not left with documents on them.\n\n' +
        'Remember physical security too. Keep offices and cabinets locked, do not let unknown visitors into staff areas, and challenge politely anyone you do not recognise who is looking at records.',
      scenario: {
        situation: 'A home care worker sets up a WhatsApp group on their personal phone with colleagues to share updates, including photos of a person\'s pressure sore, because the approved app is "too slow".',
        prompt: 'What is the problem, and what should happen?',
        answer: 'Sharing photographs and health information on a personal, unapproved messaging group puts special category data outside the organisation\'s control, on personal devices, and risks it being forwarded, backed up or kept after staff leave. It is likely to be a data breach. The group should stop sharing care information and the photos should be deleted as your data protection lead advises. Report it to your manager so it can be assessed, and raise concerns about the approved app so they can be fixed properly.',
      },
      check: {
        question: 'Your work phone is lost on a visit. What should you do?',
        options: ['Wait a few days in case it turns up', 'Report it immediately so it can be locked or wiped', 'Buy a replacement', 'Tell no one'],
        correct: 1,
        explanation: 'A lost device can expose personal information. Reporting immediately means it can be locked or wiped and the risk assessed quickly.',
      },
      image_prompt: 'A home care worker placing a work tablet and a closed folder into the locked boot of a small car parked on a residential street, the car seats visibly empty, daylight.',
      image_alt: 'A home care worker locking a work tablet and folder out of sight in the boot of a car',
    },
    {
      heading: 'Data breaches',
      minutes: 4,
      body:
        'A personal data breach is a security incident that affects the confidentiality, integrity or availability of personal data. Confidentiality breaches are when information is seen by or sent to someone who should not have it, such as an email to the wrong person, a lost handover sheet or someone accessing records without a reason. Integrity breaches are when information is changed or recorded incorrectly without authority, so it can no longer be trusted, such as notes written in the wrong person\'s record. Availability breaches are when information is lost or cannot be accessed, such as records destroyed in error or a system locked by ransomware.\n\n' +
        'Receiving data in error is also important. If you are sent information that is not meant for you, such as another care provider\'s records or an email about someone you do not support, do not read further, do not forward it, tell the sender and your manager, and delete it as advised.\n\n' +
        'If you think a breach has happened, report it immediately to your manager or data protection lead, however small it seems and even if it was your mistake. Do not try to cover it up or investigate it yourself. If you can safely contain it, do so, for example by asking the recipient of a misdirected email to delete it, retrieving lost papers or reporting a lost device so it can be wiped.\n\n' +
        'Your organisation will assess the breach. If it is likely to result in a risk to people\'s rights and freedoms, it must be reported to the ICO within 72 hours of the organisation becoming aware of it; care providers using the Data Security and Protection Toolkit usually report through its incident reporting tool. If the risk to the people affected is high, they must be told without undue delay. Every breach is recorded, and the organisation learns from it to stop it happening again. Reporting quickly and honestly protects the people you support and is always the right thing to do.',
      scenario: {
        situation: 'You realise you have written the whole morning\'s care notes, including a fall and medicines given, into the wrong resident\'s electronic record. You are tempted to quietly delete them.',
        prompt: 'What should you do?',
        answer: 'Do not delete or hide the entries. This is an integrity breach, because the wrong person\'s record is now inaccurate and the right person\'s record is missing important information about a fall and medicines. Tell the senior and your data protection lead immediately. Follow your system\'s procedure to correct the record so the mistake is visible and traceable, and record the care in the correct person\'s record. Reporting honestly keeps both people safe.',
      },
      check: {
        question: 'Within how long must an organisation report a notifiable data breach to the ICO?',
        options: ['72 hours', '24 hours', 'One month', 'One year'],
        correct: 0,
        explanation: 'Breaches that are likely to risk people\'s rights and freedoms must be reported to the ICO within 72 hours of the organisation becoming aware. That is why staff must report immediately.',
      },
      image_prompt: 'A care worker speaking to their manager in a care home office, pointing to a laptop screen showing a warning icon, the manager listening calmly and taking notes, supportive atmosphere, no readable text.',
      image_alt: 'A care worker reporting a data breach to their manager, pointing to a warning on the laptop',
    },
  ],
  activities: [
    {
      id: 'gdpr-act-1', type: 'match', after_section: 0,
      title: 'The data protection principles',
      instructions: 'Match each UK GDPR principle to what it means in care.',
      pairs: [
        { term: 'Lawfulness, fairness and transparency', definition: 'People are told how their information is used, in a privacy notice' },
        { term: 'Data minimisation', definition: 'Only recording what is needed for the person\'s care' },
        { term: 'Accuracy', definition: 'Correcting a wrong date of birth in the care record' },
        { term: 'Storage limitation', definition: 'Following the retention schedule, then destroying records securely' },
        { term: 'Integrity and confidentiality', definition: 'Locking your screen and filing cabinets' },
      ],
    },
    {
      id: 'gdpr-act-2', type: 'sort', after_section: 1,
      title: 'Share or not?',
      instructions: 'Sort each situation. Should the information be shared?',
      bins: [
        { id: 'share', name: 'Share', note: 'Needed for care or safety' },
        { id: 'dont', name: 'Do not share', note: 'No need to know' },
      ],
      items: [
        { text: 'Telling paramedics about a person\'s allergies', bin: 'share' },
        { text: 'Raising a safeguarding concern with the local authority', bin: 'share' },
        { text: 'Telling the district nurse about a new pressure sore', bin: 'share' },
        { text: 'Telling a neighbour why a resident went to hospital', bin: 'dont' },
        { text: 'Posting about a resident\'s birthday on your personal social media', bin: 'dont' },
        { text: 'Discussing a person\'s diagnosis with your own family', bin: 'dont' },
      ],
    },
    {
      id: 'gdpr-act-3', type: 'match', after_section: 2,
      title: 'People\'s rights',
      instructions: 'Match each right to an example.',
      pairs: [
        { term: 'Right to be informed', definition: 'Being given a privacy notice explaining how information is used' },
        { term: 'Right of access', definition: 'Asking for a copy of everything the service holds about you' },
        { term: 'Right to rectification', definition: 'Asking for a wrong address to be corrected' },
        { term: 'Right to complain', definition: 'Raising a concern about how information was used, with the organisation or the ICO' },
      ],
    },
    {
      id: 'gdpr-act-4', type: 'order', after_section: 3,
      title: 'A phone call asking about a resident',
      instructions: 'Put the steps into order when an unknown caller asks about someone you support.',
      steps: [
        'Do not confirm or share any information yet',
        'Take the caller\'s name, relationship and phone number',
        'Check the care plan or contact list for who information can be shared with',
        'Check with the person, if they are able, or their representative',
        'Call back through a verified number if sharing is appropriate',
        'Record what was shared, with whom and why',
      ],
    },
    {
      id: 'gdpr-act-5', type: 'sort', after_section: 4,
      title: 'Good records practice?',
      instructions: 'Sort each practice.',
      bins: [
        { id: 'good', name: 'Good practice', note: 'Accurate and secure' },
        { id: 'poor', name: 'Poor practice', note: 'Inaccurate or insecure' },
      ],
      items: [
        { text: 'Recording what you saw and did, at the time', bin: 'good' },
        { text: 'Locking your screen when you step away', bin: 'good' },
        { text: 'Shredding old handover sheets', bin: 'good' },
        { text: 'Writing "difficult as usual" about a resident', bin: 'poor' },
        { text: 'Taking a photo of the handover sheet on your own phone', bin: 'poor' },
        { text: 'Leaving care plans on the lounge table', bin: 'poor' },
      ],
    },
    {
      id: 'gdpr-act-6', type: 'sort', after_section: 5,
      title: 'Spot the scam',
      instructions: 'Sort each message.',
      bins: [
        { id: 'suspicious', name: 'Suspicious', note: 'Stop, check and report' },
        { id: 'normal', name: 'Expected and normal', note: 'Still take care' },
      ],
      items: [
        { text: '"Your account will close in 1 hour, confirm your password here"', bin: 'suspicious' },
        { text: 'An urgent request from "your manager" to buy gift cards', bin: 'suspicious' },
        { text: 'An unexpected invoice attachment from an unknown supplier', bin: 'suspicious' },
        { text: 'A rota update from your manager on the approved system', bin: 'normal' },
        { text: 'A training reminder in the app your employer uses', bin: 'normal' },
      ],
    },
    {
      id: 'gdpr-act-7', type: 'match', after_section: 6,
      title: 'Keeping it secure on the move',
      instructions: 'Match each risk to the safe practice.',
      pairs: [
        { term: 'Papers in the car', definition: 'Locked out of sight in the boot, never left overnight' },
        { term: 'Work phone', definition: 'PIN locked and never lent to anyone' },
        { term: 'Sharing a wound photo', definition: 'Only on an approved app, never a personal group' },
        { term: 'Lost device', definition: 'Report immediately so it can be locked or wiped' },
      ],
    },
    {
      id: 'gdpr-act-8', type: 'match', after_section: 7,
      title: 'Types of breach',
      instructions: 'Match each type of breach to an example.',
      pairs: [
        { term: 'Confidentiality', definition: 'A care plan emailed to the wrong family' },
        { term: 'Integrity', definition: 'Notes written in the wrong person\'s record' },
        { term: 'Availability', definition: 'Records locked by ransomware so staff cannot see medicines' },
        { term: 'Data received in error', definition: 'Another provider\'s records sent to you by mistake' },
      ],
    },
  ],
  references: [
    { title: 'Data Security and Protection Toolkit', url: 'https://www.dsptoolkit.nhs.uk/', source: 'NHS England', note: 'The self assessment care providers use to show good data security, including the expectation that staff complete data security training every year.' },
    { title: 'Data Security and Protection eLearning for staff', url: 'https://www.digitalcarehub.co.uk/digital-skills-and-training/elearning/staff/', source: 'Digital Care Hub, Better Security Better Care', note: 'The four learning areas this course is mapped to: rights and responsibilities, keeping data secure, threats, and data breaches.' },
    { title: 'A guide to the data protection principles', url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/data-protection-principles/a-guide-to-the-data-protection-principles/', source: 'Information Commissioner\'s Office', note: 'The seven UK GDPR principles explained, the basis for section 1.' },
    { title: 'Data (Use and Access) Act 2025: data protection and privacy changes', url: 'https://www.gov.uk/guidance/data-use-and-access-act-2025-data-protection-and-privacy-changes', source: 'Department for Science, Innovation and Technology, GOV.UK', note: 'The 2025 changes to UK GDPR, including subject access and the new right to complain to organisations.' },
    { title: 'A guide to subject access', url: 'https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/subject-access-requests/a-guide-to-subject-access/', source: 'Information Commissioner\'s Office', note: 'How subject access requests work, including time limits and what counts as a request.' },
    { title: 'The Caldicott Principles', url: 'https://www.gov.uk/government/publications/the-caldicott-principles', source: 'National Data Guardian, GOV.UK', note: 'The eight principles for using and sharing confidential information in health and social care, used in section 2.' },
    { title: 'Report a breach', url: 'https://ico.org.uk/for-organisations/report-a-breach/', source: 'Information Commissioner\'s Office', note: 'How and when organisations report personal data breaches to the ICO.' },
    { title: 'Data security and protection for health and care organisations', url: 'https://www.gov.uk/government/publications/data-security-and-protection-for-health-and-care-organisations', source: 'Department of Health and Social Care, GOV.UK', note: 'The National Data Guardian\'s data security standards that sit behind the toolkit.' },
    { title: 'Phishing: spot and report scam emails, texts, websites and calls', url: 'https://www.ncsc.gov.uk/collection/phishing-scams', source: 'National Cyber Security Centre', note: 'How to recognise and report phishing, used in section 6.' },
    { title: 'Three random words', url: 'https://www.ncsc.gov.uk/collection/top-tips-for-staying-secure-online/three-random-words', source: 'National Cyber Security Centre', note: 'Simple advice on creating strong, memorable passwords.' },
  ],
  glossary: [
    { term: 'Personal data', definition: 'Any information that identifies a living person, directly or indirectly.' },
    { term: 'Special category data', definition: 'Sensitive personal data, including health information, that needs extra protection.' },
    { term: 'Data controller', definition: 'The organisation that decides how and why personal data is used, usually your employer.' },
    { term: 'UK GDPR', definition: 'The UK General Data Protection Regulation, the main law on personal data, with the Data Protection Act 2018.' },
    { term: 'ICO', definition: 'The Information Commissioner\'s Office, the UK regulator for data protection.' },
    { term: 'Caldicott Principles', definition: 'Eight principles for using and sharing confidential information in health and social care.' },
    { term: 'Subject access request', definition: 'A request by a person for a copy of the personal information held about them.' },
    { term: 'Privacy notice', definition: 'Information telling people how their personal data is used and what their rights are.' },
    { term: 'Phishing', definition: 'Messages pretending to be from a trusted source to trick people into giving information or money.' },
    { term: 'Multi factor authentication', definition: 'Logging in with a second check, such as a code on your phone, as well as a password.' },
    { term: 'Personal data breach', definition: 'A security incident affecting the confidentiality, integrity or availability of personal data.' },
    { term: 'DSPT', definition: 'The Data Security and Protection Toolkit, used by care providers to show good data security.' },
  ],
  practical_checklist: [],
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. Data protection law and principles
    { id: 'q1', text: 'Which of these is personal data?', options: ['The weather', 'The home\'s opening hours', 'A resident\'s room number and first name', 'A blank form'], correct: 2 },
    { id: 'q2', text: 'Who regulates data protection in the UK?', options: ['The Information Commissioner\'s Office', 'The CQC', 'The police', 'The local council'], correct: 0 },
    { id: 'q3', text: 'Which data protection principle means only recording what is needed?', options: ['Accuracy', 'Data minimisation', 'Storage limitation', 'Accountability'], correct: 1 },
    { id: 'q4', text: 'Looking at a person\'s care record out of curiosity is:', options: ['A breach, and can be a criminal offence', 'Acceptable if you work there', 'Fine if you tell no one', 'Allowed for managers only'], correct: 0 },
    // Section 2. Confidentiality and the Caldicott Principles
    { id: 'q5', text: 'How many Caldicott Principles are there?', options: ['Four', 'Six', 'Eight', 'Ten'], correct: 2 },
    { id: 'q6', text: 'You suspect a resident is being financially abused by a relative. Can you share this without their consent?', options: ['No, never', 'Only if the relative agrees', 'Yes, through your safeguarding procedure, to protect them', 'Only after a month'], correct: 2 },
    { id: 'q7', text: 'Which Caldicott Principle limits information to those who need it?', options: ['Justify the purpose', 'Inform people', 'Comply with the law', 'Access on a strict need to know basis'], correct: 3 },
    { id: 'q8', text: 'Discussing a resident with your friends, without using their name, is:', options: ['Fine, because no name was used', 'Good for your wellbeing', 'Allowed off duty', 'Still a breach of confidentiality, as details can identify them'], correct: 3 },
    // Section 3. People's rights over their information
    { id: 'q9', text: 'A resident says, "I want to see what you have written about me." This is:', options: ['Not a formal request', 'Only valid in writing', 'A subject access request to pass on straight away', 'A complaint only'], correct: 2 },
    { id: 'q10', text: 'Does a relative automatically have the right to see a person\'s care records?', options: ['Yes, always', 'Only the eldest child', 'Yes, if they visit often', 'No, they need the person\'s consent or legal authority'], correct: 3 },
    { id: 'q11', text: 'Since the 2025 changes, an organisation that receives a data protection complaint must acknowledge it within:', options: ['24 hours', '7 days', '30 days', '6 months'], correct: 2 },
    { id: 'q12', text: 'Records of people who have died are:', options: ['Public information', 'Still confidential, with access handled under other law', 'Destroyed immediately', 'Given to anyone who asks'], correct: 1 },
    // Section 4. Sharing information safely
    { id: 'q13', text: 'A caller says they are from the police and asks about a resident. You should:', options: ['Share everything', 'Ask the resident\'s neighbour', 'Hang up', 'Take their details and verify their identity through a trusted route before sharing'], correct: 3 },
    { id: 'q14', text: 'Which email account should you use for care information?', options: ['Your personal email', 'Any account that is quick', 'An approved, secure work account', 'A shared family account'], correct: 2 },
    { id: 'q15', text: 'Can you post a photo of a resident\'s birthday party on your personal social media?', options: ['Yes, if they look happy', 'Yes, in a private group', 'No', 'Yes, with faces blurred'], correct: 2 },
    { id: 'q16', text: 'Where should handovers ideally take place?', options: ['In the lounge with residents present', 'In a private space where you cannot be overheard', 'In the car park', 'On a public bus'], correct: 1 },
    // Section 5. Recording, storing and disposing of information
    { id: 'q17', text: 'Good care records are:', options: ['Accurate, factual and written promptly', 'Written days later from memory', 'Full of personal opinions', 'Kept in personal notebooks'], correct: 0 },
    { id: 'q18', text: 'You make a mistake in a record. You should:', options: ['Delete it so no one sees', 'Tear out the page', 'Correct it as your system allows, keeping the original visible and traceable', 'Ignore it'], correct: 2 },
    { id: 'q19', text: 'What should you do with your computer when you step away?', options: ['Leave it open', 'Lock the screen', 'Turn off the monitor only', 'Ask a resident to watch it'], correct: 1 },
    { id: 'q20', text: 'Old medicine labels with names on should go in:', options: ['The confidential waste or shredder', 'The recycling', 'The ordinary bin', 'The resident\'s room'], correct: 0 },
    // Section 6. Fraud, scams and cyber security
    { id: 'q21', text: 'You clicked a suspicious link and entered your password. What now?', options: ['Say nothing and hope for the best', 'Wait a week', 'Report it immediately to your manager or IT support', 'Change your personal email only'], correct: 2 },
    { id: 'q22', text: 'Which is a strong password approach recommended by the NCSC?', options: ['Password123', 'Your name', 'Your date of birth', 'Three random words'], correct: 3 },
    { id: 'q23', text: 'A colleague asks to use your login because theirs is locked. You should:', options: ['Share it just this once', 'Refuse and suggest they contact IT or the manager', 'Log in for them', 'Write it down for them'], correct: 1 },
    { id: 'q24', text: 'Why is ransomware a risk to care?', options: ['It can lock systems so staff cannot access care plans and medicine records', 'It only affects banks', 'It makes computers faster', 'It is not a risk'], correct: 0 },
    // Section 7. Devices, apps and paper records
    { id: 'q25', text: 'Where should a home care worker keep papers when driving between visits?', options: ['On the passenger seat', 'In an open bag', 'On the dashboard', 'Locked out of sight in the boot'], correct: 3 },
    { id: 'q26', text: 'Can you share a person\'s wound photograph in a personal WhatsApp group with colleagues?', options: ['Yes, it is quicker', 'No, only approved and secure apps may be used', 'Yes, if you delete it later', 'Yes, if the group is small'], correct: 1 },
    { id: 'q27', text: 'Can you take care records home to finish writing them?', options: ['Yes', 'Only if they are in a bag', 'Only at weekends', 'No'], correct: 3 },
    { id: 'q28', text: 'A stranger is looking through files in the office. You should:', options: ['Politely challenge them and inform your manager', 'Ignore them', 'Help them find what they need', 'Lock them in'], correct: 0 },
    // Section 8. Data breaches
    { id: 'q29', text: 'Which of these is an integrity breach?', options: ['Notes written in the wrong person\'s record', 'A locked screen', 'A shredded document', 'A secure email'], correct: 0 },
    { id: 'q30', text: 'You receive another provider\'s records by email in error. You should:', options: ['Read them in case they are useful', 'Stop reading, tell the sender and your manager, and delete as advised', 'Forward them to colleagues', 'Keep them just in case'], correct: 1 },
    { id: 'q31', text: 'Why must staff report possible breaches immediately?', options: ['Only for large breaches', 'To get someone in trouble', 'It is optional', 'So the organisation can contain it and report to the ICO within 72 hours if required'], correct: 3 },
    { id: 'q32', text: 'Who decides whether a breach is reported to the ICO?', options: ['The organisation, usually the data protection lead or manager', 'The member of staff who made the mistake', 'The person affected', 'The police'], correct: 0 },
  ],
}
