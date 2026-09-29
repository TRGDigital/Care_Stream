// Medication Administration: Annual Refresher. Full course content for CPD submission.
//
// Framework: Skills for Care, Statutory and mandatory training guide for adult
// social care employers (December 2025), medication administration row. Its
// headings (legislation, policy and procedures; common types of medication and
// use; procedures and techniques for administration; preparing for
// administration; administering and monitoring safely; own and other roles and
// responsibilities; what can and cannot be carried out within own
// responsibilities and when to seek advice) are mapped section by section in
// the timings table. Practice content follows NICE SC1 (managing medicines in
// care homes), NICE NG67 (managing medicines for adults receiving social care in
// the community) and CQC medicines guidance for adult social care. This is the
// knowledge component: the course also requires an observed practical
// assessment against the checklist below, every point met, signed off by the
// employer before the certificate is issued.
//
// Timings total 60 minutes. Applied to the tier='cpd' module by
// scripts/apply-cpd-course.ts; the prebuilt tier is never touched.

import type { CpdCourse } from './cpd-course-types'

export const MEDICATION_CHECKLIST: string[] = [
  'Washes hands and prepares a clean, uninterrupted space before starting',
  'Checks the person\'s identity against the MAR chart before giving any medicine',
  'Checks the MAR against the pharmacy label for the medicine, strength, dose, route, time and expiry date',
  'Checks for allergies and instructions such as timing with food, and when any previous dose was given',
  'Explains the medicine to the person, gains their consent and respects a refusal',
  'Prepares and gives the medicine by the prescribed route without touching tablets with bare hands',
  'Follows the PRN protocol before giving a when required medicine, and records the reason and outcome',
  'Stays with the person until the medicine has been taken',
  'Signs the MAR immediately after administration, never in advance, and uses the correct codes for refusals and omissions',
  'Follows the controlled drugs register and witnessing requirements when handling controlled drugs',
  'Stores medicines securely, keeping trolleys, cupboards and keys under control at all times',
  'Reports any refusal, error, near miss or change in the person to the senior on duty without delay',
]

export const CPD_MEDICATION: CpdCourse = {
  module_id: '236a0401-d4ab-43c6-bc3d-601f99c1d462',
  name: 'Medication Administration: Annual Refresher',
  duration_minutes: 60,
  pass_mark: 80,
  frequency: 'annual',
  renewal_months: 12,
  requires_practical: true,
  description:
    'Annual medication administration refresher for care workers who support people with medicines in care ' +
    'homes, home care and supported living. Built on the Skills for Care statutory and mandatory training guide, ' +
    'NICE guidance SC1 and NG67 and CQC medicines guidance, it covers the law and your role, common medicines, ' +
    'consent, capacity and covert administration, preparing to administer, administration techniques, recording ' +
    'and monitoring, controlled drugs and storage, and errors and your limits. Eight lessons with scenarios and ' +
    'activities, a final assessment, then an observed practical assessment by your employer.',
  entry_requirements:
    'Intermediate. For care workers who administer or support people with medicines in any adult social care ' +
    'setting and have completed their employer\'s medicines induction training. The course is the knowledge ' +
    'component; the certificate is issued only after an observed practical assessment is signed off by the ' +
    'employer. Specialist tasks such as insulin injections or buccal midazolam need separate training.',
  summary:
    'Eight short lessons, each with a care scenario, an interactive activity and a quick check with an ' +
    'explanation. You start with a five question knowledge check, then finish with a 32 question assessment ' +
    'with a pass mark of 80%. Your manager or a suitably trained assessor then observes a medicines round ' +
    'against a 12 point checklist; every point must be met before your certificate is issued.',
  outcomes: [
    'Explain the law, national guidance and policies that apply to medicines in social care, and the roles of everyone involved',
    'Describe common types of medicines, what they are used for and the side effects to look out for',
    'Apply the principles of consent and mental capacity, including when a person refuses and when covert administration is considered',
    'Prepare for and administer medicines safely using the six rights, by the correct route and technique',
    'Record administration accurately, monitor the person\'s response and handle controlled drugs and storage correctly',
    'Recognise medication errors and near misses, act on them immediately, and know the limits of your role',
  ],
  key_points: [
    'Follow the six rights: right person, medicine, dose, route, time and documentation',
    'Check identity, allergies and the pharmacy label against the MAR every time',
    'People have the right to refuse; covert administration only after a best interests decision and pharmacy advice',
    'Sign the MAR immediately after the medicine is taken, never before',
    'Follow the PRN protocol and record the reason and the effect',
    'Schedule 2 controlled drugs go in the controlled drugs cupboard and register, with a trained witness',
    'Report errors and near misses straight away: the person\'s safety comes first',
  ],
  timings: [
    { part: 'Pre-course knowledge check, 5 questions', minutes: 3 },
    { part: 'Section 1. Legislation, policy and procedures; own and other roles and responsibilities', minutes: 5 },
    { part: 'Section 2. Common types of medication and their use', minutes: 5 },
    { part: 'Section 3. Consent, capacity, refusal and covert administration', minutes: 5 },
    { part: 'Section 4. Preparing for the administration of medication', minutes: 5 },
    { part: 'Section 5. Procedures and techniques for administration', minutes: 5 },
    { part: 'Section 6. Administering and monitoring medication safely: records and review', minutes: 5 },
    { part: 'Section 7. Administering and monitoring safely: controlled drugs, storage and disposal', minutes: 5 },
    { part: 'Section 8. What you can and cannot do, errors, and when to seek advice', minutes: 4 },
    { part: 'Final assessment, 32 questions', minutes: 15 },
    { part: 'Feedback and reflection', minutes: 3 },
  ],
  baseline: [
    { id: 'pc1', text: 'Which of these is one of the six rights of medication administration?', options: ['Right colour', 'Right route', 'Right price', 'Right carer'], correct: 1 },
    { id: 'pc2', text: 'When should you sign the MAR chart?', options: ['Before giving the medicine', 'Immediately after the person has taken it', 'At the end of the shift', 'Once a week'], correct: 1 },
    { id: 'pc3', text: 'A person with capacity refuses their tablets. You should:', options: ['Hide them in food', 'Respect the refusal, record it and report it', 'Insist until they take them', 'Give them later without asking'], correct: 1 },
    { id: 'pc4', text: 'Where are Schedule 2 controlled drugs stored in a care home?', options: ['In the kitchen', 'In the controlled drugs cupboard, recorded in the register', 'In the person\'s bag', 'On the medicines trolley overnight'], correct: 1 },
    { id: 'pc5', text: 'What does PRN mean?', options: ['Give every morning', 'When required', 'Only by a nurse', 'Before food'], correct: 1 },
  ],
  sections: [
    {
      heading: 'The law, guidance and your role',
      minutes: 5,
      body:
        'Medicines help people live well, but used incorrectly they cause serious harm. Several laws apply. The Human Medicines Regulations 2012 control how medicines are made, supplied and prescribed. The Misuse of Drugs Act 1971 and the Misuse of Drugs Regulations 2001 control controlled drugs, such as morphine and fentanyl, including how they are stored and recorded. The Health and Social Care Act 2008 (Regulated Activities) Regulations 2014 require the proper and safe management of medicines (Regulation 12), which the Care Quality Commission inspects. The Mental Capacity Act 2005 applies to consent.\n\n' +
        'National guidance sets out good practice: NICE SC1, managing medicines in care homes, and NICE NG67, managing medicines for adults receiving social care in the community. CQC publishes detailed medicines guidance for care homes, home care and supported living. Your employer\'s medicines policy turns all of this into the procedures you follow, and you must know it.\n\n' +
        'Everyone has a role. The prescriber, usually the GP or a nurse or pharmacist prescriber, decides what the person needs and writes the prescription. The pharmacist dispenses it, labels it, and gives advice. Your employer provides the policy, training and assessment of competence and keeps records. You administer or support people with medicines only as trained, assessed and authorised, following the prescription, label and MAR, and you observe and report. The person has the right to be involved, to be informed and to refuse.\n\n' +
        'There are different levels of support. Some people manage their own medicines, sometimes with prompting or reminders. Others need assistance, such as opening packaging. Some need medicines administered: selecting, preparing and giving the medicine. The person\'s care plan and medicines risk assessment say which applies, and it should be reviewed when their needs change. People who can manage their own medicines should be supported to keep doing so.',
      scenario: {
        situation: 'Mrs Hill has always managed her own inhalers and eye drops. A new agency worker takes them away and starts giving them to her, saying "we do all the medicines here".',
        prompt: 'What should happen?',
        answer: 'Mrs Hill\'s care plan and medicines risk assessment set out her level of support. If they say she manages these herself, she should keep doing so, as supporting independence is good practice and her right. Return her medicines, apologise, and explain to the agency worker how to check the plan. Report it to the senior so it is recorded, and so her assessment is reviewed if there are any concerns.',
      },
      check: {
        question: 'Who decides what medicine a person should take?',
        options: ['The care worker', 'The prescriber, such as the GP', 'The family', 'The pharmacist alone'],
        correct: 1,
        explanation: 'The prescriber decides and prescribes. The pharmacist dispenses and advises, and care staff administer as prescribed and trained.',
      },
      image_prompt: 'A care worker and a pharmacist talking at a community pharmacy counter, the pharmacist handing over a labelled medicines bag, shelves of boxes behind them without readable text, friendly and professional.',
      image_alt: 'A pharmacist handing a labelled medicines bag to a care worker at a pharmacy counter',
    },
    {
      heading: 'Common medicines and their use',
      minutes: 5,
      body:
        'Knowing what a medicine is for helps you give it safely and notice problems. Common groups include pain relief, such as paracetamol and opioids like codeine and morphine; antibiotics for infections; anticoagulants, which thin the blood, such as warfarin, apixaban and rivaroxaban; medicines for the heart and blood pressure; diuretics, sometimes called water tablets; medicines for diabetes, including insulin; inhalers for asthma and COPD; laxatives; and medicines for mental health, epilepsy, Parkinson\'s disease and dementia.\n\n' +
        'Medicines come in many forms: tablets and capsules, some designed to dissolve slowly (modified or slow release); liquids; creams and ointments; patches; inhalers; eye, ear and nose drops; suppositories; and injections. The form matters: it affects how the medicine works and how it must be given.\n\n' +
        'Some medicines are high risk, because small mistakes can cause serious harm. They include anticoagulants, insulin, opioids, methotrexate (usually taken once a week, not daily), and medicines for epilepsy and Parkinson\'s disease. Some medicines are time critical: for example, Parkinson\'s medicines must be given at the exact times prescribed, because delays can quickly cause stiffness, falls and swallowing problems.\n\n' +
        'All medicines can cause side effects. Common ones include drowsiness, dizziness, falls, constipation, nausea, confusion and rashes. Anticoagulants can cause bleeding and bruising. Report anything new or unusual after a medicine is started or changed. A severe allergic reaction, with swelling of the face or throat or difficulty breathing, is an emergency: call 999.\n\n' +
        'Homely remedies are non prescription medicines, such as paracetamol for a headache, that a care home may give under a policy agreed with the GP or pharmacist. Only give them as the policy allows, and check they will not interact with the person\'s prescribed medicines or duplicate them.',
      scenario: {
        situation: 'Mr Price has Parkinson\'s disease. His medicines are due at 8am, 12pm, 4pm and 8pm. The lunchtime round is running 45 minutes late because of an emergency elsewhere in the home.',
        prompt: 'What should you do?',
        answer: 'Parkinson\'s medicines are time critical, and late doses can quickly cause stiffness, falls and swallowing problems. Tell the senior straight away so his dose can be given on time, even if the rest of the round is delayed. Record the time it is given. If it has been missed or delayed, report it and follow your procedure, and watch for changes in his movement and swallowing.',
      },
      check: {
        question: 'Which of these medicines is time critical?',
        options: ['A daily vitamin', 'A cough sweet', 'A moisturising cream', 'Parkinson\'s disease medicines'],
        correct: 3,
        explanation: 'Parkinson\'s medicines must be given at the prescribed times. Delays can quickly cause serious symptoms such as rigidity, falls and swallowing difficulty.',
      },
      image_prompt: 'A neat arrangement of different medicine forms on a clean tray: a blister pack of tablets, a liquid bottle with a measuring syringe, an inhaler, a skin patch, a tube of cream and eye drops, no readable text on labels.',
      image_alt: 'Different forms of medicine on a tray: tablets, liquid, inhaler, patch, cream and eye drops',
    },
    {
      heading: 'Consent, capacity and covert medication',
      minutes: 5,
      body:
        'People have the right to make decisions about their own medicines, including the right to refuse. Always explain what the medicine is, what it is for, and gain the person\'s consent before giving it. The Mental Capacity Act 2005 says a person must be assumed to have capacity unless it is established that they lack it for that specific decision, and they must be supported to decide, for example by explaining simply, using pictures or choosing a better time.\n\n' +
        'If a person with capacity refuses a medicine, respect their decision. Do not force or trick them. You may gently offer it again a little later, or find out why, such as difficulty swallowing, side effects or a misunderstanding. Record the refusal on the MAR with the correct code, and report it, particularly for important medicines such as antibiotics, anticoagulants or insulin, so the prescriber can be told. Repeated refusals need a review.\n\n' +
        'Covert administration means giving a medicine hidden in food or drink so the person does not know. It is only ever considered for a person who lacks capacity to make the decision about their medicine, when it is essential to their health. It must follow a best interests decision involving the prescriber, a pharmacist, care staff and the person\'s family or representative, and be recorded in a covert medicines plan. A pharmacist must advise how each medicine can be given, because crushing tablets or mixing medicines with food can make them unsafe or ineffective; crushing a slow release tablet, for example, can release the whole dose at once and cause an overdose. Covert administration must be used for as short a time as possible and reviewed regularly. You must never decide to give medicine covertly yourself.\n\n' +
        'Restraint to give medicines is not acceptable except in exceptional, legally authorised circumstances. If you are unsure whether a person can consent, ask the senior.',
      scenario: {
        situation: 'Mrs Patel, who has dementia, keeps spitting out her blood pressure tablet. A colleague suggests crushing it into her yoghurt, as "it is for her own good".',
        prompt: 'What should you do?',
        answer: 'Do not crush or hide the tablet. Covert administration can only happen after a capacity assessment and a best interests decision involving her prescriber, a pharmacist and her family, with pharmacist advice on whether and how the tablet can be given, recorded in a covert medicines plan. Record the refusal on her MAR, report it to the senior, and ask for her GP and pharmacist to review, as another form of the medicine or a different time may help.',
      },
      check: {
        question: 'Who can decide that a medicine will be given covertly?',
        options: ['The care worker on shift', 'The family alone', 'A best interests decision involving the prescriber, pharmacist, staff and family, for a person who lacks capacity', 'Anyone, if it is for the person\'s good'],
        correct: 2,
        explanation: 'Covert administration needs a capacity assessment, a documented best interests decision with the prescriber and pharmacist, and regular review.',
      },
      image_prompt: 'A care worker sitting beside an older woman at a dining table, gently explaining a small medicine cup with a single tablet, the woman listening thoughtfully, a glass of water on the table, respectful atmosphere.',
      image_alt: 'A care worker explaining a medicine to an older woman before asking for her consent',
    },
    {
      heading: 'Preparing to administer',
      minutes: 5,
      body:
        'Safe administration starts with preparation. Wash your hands. Work in a clean, well lit area, and avoid interruptions: many services use a "do not disturb" tabard during medicines rounds, because interruptions cause errors. Have the MAR, the medicines, the person\'s care plan, water and any equipment ready.\n\n' +
        'Use the six rights for every medicine. Right person: confirm who the person is, for example by their photograph on the MAR, asking their name and date of birth if they can tell you, and checking with colleagues who know them. Never rely on room numbers alone. Right medicine: check the pharmacy label against the MAR, including the name and strength. Right dose: check the amount and how much is left. Right route: by mouth, on the skin, into the eye, and so on. Right time: check when it is due and when any previous dose was given, including for when required medicines. Right documentation: record it straight away. Many services add the right to refuse.\n\n' +
        'Also check allergies, recorded on the MAR and care plan, and any special instructions on the label, such as "take with or after food", "swallow whole" or "take 30 minutes before breakfast". Check the expiry date, and that liquids, creams and eye drops have not passed their use by date once opened, which should be written on them.\n\n' +
        'Stop and get advice if anything does not match: the label and MAR differ, a dose looks unusual, the medicine looks different from usual, or the MAR is unclear or handwritten without being checked. Never guess, and never use medicines prescribed for someone else.\n\n' +
        'Monitored dosage systems, such as blister packs, help, but do not remove the need to check each medicine against the MAR.',
      scenario: {
        situation: 'On the morning round, the pharmacy label on Mr Evans\'s new box of tablets says 5mg, but his MAR says 2.5mg. The senior is on the phone.',
        prompt: 'What should you do?',
        answer: 'Do not give the medicine until the discrepancy is resolved. Set it aside safely, continue the round for other people if appropriate, and tell the senior as soon as possible. The senior will check the prescription and contact the pharmacy or GP to confirm the correct dose. Record what happened, including if the dose is given late, and make sure the MAR is corrected by an authorised person if needed.',
      },
      check: {
        question: 'Why should you avoid interruptions during a medicines round?',
        options: ['It is rude', 'It makes the round longer', 'Interruptions are a common cause of medication errors', 'It is the law'],
        correct: 2,
        explanation: 'Being interrupted breaks concentration and is a well known cause of errors. Many services use tabards or signs to protect medicines rounds.',
      },
      image_prompt: 'A care worker wearing a red do not disturb tabard with no readable words, at a medicines trolley in a care home corridor, checking a blister pack against a MAR chart folder, focused and calm.',
      image_alt: 'A care worker in a do not disturb tabard checking a blister pack against the MAR chart',
    },
    {
      heading: 'Administration techniques',
      minutes: 5,
      body:
        'Give each medicine by the route and method prescribed, and as the pharmacy label directs. Support the person to sit upright for oral medicines, and offer a full glass of water unless their fluids are thickened, in which case follow their speech and language therapy plan. Do not touch tablets with bare hands: pop them from the pack into a medicine pot or use a clean spoon. Give one medicine at a time if that helps the person, and stay with them until they have swallowed it.\n\n' +
        'Liquids should be shaken if the label says so and measured accurately with an oral syringe or medicine measure at eye level, never a household spoon. Do not crush tablets or open capsules unless a pharmacist has confirmed it is safe and it is recorded, because this can make medicines dangerous or ineffective.\n\n' +
        'Creams and ointments are applied with gloves, to the area and in the amount shown on a body map or topical MAR. Some creams, including paraffin based emollients, soak into clothing and bedding and make them more flammable, so follow your fire safety advice for people using them.\n\n' +
        'Patches, such as pain relief patches containing fentanyl or buprenorphine, must be applied at the right frequency and to a different site each time, as the label says. Remove the old patch before applying the new one and fold it sticky sides together for disposal, record the site, and never apply heat, such as a hot water bottle, over a patch, because it can release too much medicine.\n\n' +
        'Inhalers should be used with the technique the person has been shown, often with a spacer; check with the pharmacist or nurse if you are unsure. Eye drops are given into the lower eyelid without the dropper touching the eye, with a gap of about five minutes between different drops.\n\n' +
        'When required (PRN) medicines are given only when needed, following the person\'s PRN protocol, which says what the medicine is for, the signs to look for, the dose, minimum time between doses and the maximum in 24 hours. Record the reason and check and record whether it worked.',
      scenario: {
        situation: 'Mr Holt has a fentanyl patch changed every three days. You find the old patch still on his upper arm, and the MAR says the new one should go on today.',
        prompt: 'What is the correct way to change it?',
        answer: 'Check the MAR, the prescription and when it was last changed. Wearing gloves, remove the old patch first, fold it sticky sides together and dispose of it following your controlled drugs procedure. Apply the new patch to clean, dry, hairless skin at a different site, as the label advises. Record the time and new site on the MAR and patch chart, and never let a heat source be placed over it.',
      },
      check: {
        question: 'Why should you never apply heat, such as a hot water bottle, over a pain relief patch?',
        options: ['It can release too much medicine and cause an overdose', 'It makes the patch fall off', 'It stains the skin', 'It makes it less effective only'],
        correct: 0,
        explanation: 'Heat increases how quickly the medicine is absorbed from patches such as fentanyl, which can cause dangerous overdose.',
      },
      image_prompt: 'A care worker wearing gloves applying a small skin patch to the upper back of an older man sitting on the edge of his bed, a patch site chart with a simple body outline on the bedside table, no readable text.',
      image_alt: 'A care worker in gloves applying a skin patch to an older man, with a body chart beside the bed',
    },
    {
      heading: 'Recording and monitoring',
      minutes: 5,
      body:
        'The medicines administration record (MAR) is a legal record of the medicines given. Sign it immediately after the person has taken the medicine, never in advance and never for someone else. If a medicine is not given, use the correct code, such as refused, asleep, in hospital or not required, and explain in the notes. Leaving a gap is unsafe, because nobody can tell whether the dose was given. Electronic MAR systems work the same way: record at the time, as you give it.\n\n' +
        'Only authorised, trained staff should make handwritten changes to a MAR, following your policy, for example when a prescriber changes a dose, and changes are usually checked by a second person. Never cross out or use correction fluid; errors are corrected so the original is still visible.\n\n' +
        'Monitoring is part of administering. Watch for the effects a medicine should have, such as pain relief, and for side effects, such as drowsiness, dizziness, confusion, falls, constipation, rashes, bruising or bleeding. Some medicines need specific checks, such as blood sugar for people on insulin, or pulse before some heart medicines, but only carry these out if you are trained and it is in the person\'s plan. Report changes promptly, and record them.\n\n' +
        'Medicines need regular review by the prescriber or pharmacist, including structured medication reviews, especially for people on many medicines or on antipsychotics for dementia, which should be reviewed regularly. Your observations inform these reviews.\n\n' +
        'Moving between services is a risky time. When a person moves into care or returns from hospital, their medicines must be checked against the discharge information and their GP record, which is called medicines reconciliation. Send a current MAR and medicines information with anyone going into hospital.',
      scenario: {
        situation: 'At the end of a round you notice a colleague has signed the MAR for the lunchtime doses of three residents before the round began, "to save time".',
        prompt: 'What should you do?',
        answer: 'This is unsafe and against policy: signing in advance means the record may show medicines as given when they were not, for example if a resident refused or was asleep. Tell the senior immediately so the records can be checked against what was actually given and corrected properly. The colleague needs support and possibly further training. Record your concern following your procedure.',
      },
      check: {
        question: 'If a medicine is not given, what should be recorded on the MAR?',
        options: ['The correct code with an explanation', 'Nothing, leave it blank', 'A signature anyway', 'A question mark'],
        correct: 0,
        explanation: 'A blank is unsafe because nobody can tell what happened. Use the correct code, such as refused or asleep, with an explanation, and report as needed.',
      },
      image_prompt: 'A care worker signing a paper MAR chart on a clipboard at a medicines trolley straight after an older woman has taken her tablets with a glass of water, the woman smiling, bright care home lounge, no readable text.',
      image_alt: 'A care worker signing the MAR chart straight after a woman has taken her tablets',
    },
    {
      heading: 'Controlled drugs, storage and disposal',
      minutes: 5,
      body:
        'Controlled drugs are medicines that could be misused, such as morphine, oxycodone, fentanyl and methylphenidate. They are grouped into schedules. In care homes, unless a person is looking after their own medicines, Schedule 2 controlled drugs must be stored in a controlled drugs cupboard that meets legal requirements, and every movement recorded in a controlled drugs register: a bound book with numbered pages. Entries record receipt, administration, disposal and transfer, are made on the same day, and must not be crossed out or altered; corrections are signed and dated in the margin. Whenever possible, the member of staff giving a controlled drug is witnessed by a suitably trained colleague, who also signs the register. Stock is counted and checked regularly. Report any discrepancy immediately.\n\n' +
        'In people\'s own homes, controlled drugs belong to the person and are usually stored in their home as agreed in their risk assessment, but you still record administration on the MAR and follow your employer\'s controlled drugs procedure.\n\n' +
        'All medicines must be stored securely: in a locked trolley, cupboard or room, with keys kept by an authorised person and never left in the lock. Medicine trolleys are locked and secured when not in use and never left unattended. Store medicines at the temperature on the label. Most are kept below 25°C; medicines that need refrigeration are kept in a dedicated medicines fridge between 2°C and 8°C, with the temperature checked and recorded daily and anything out of range reported. People who manage their own medicines should have a lockable place to keep them.\n\n' +
        'Unwanted, out of date or discontinued medicines are separated from current stock, recorded, and returned for disposal in line with your policy. Care homes without nursing return them, including controlled drugs, to the community pharmacy, recording controlled drugs in the register with a witness. Never put medicines in the bin, toilet or sink.',
      scenario: {
        situation: 'During the evening controlled drugs check, the register shows 12 morphine tablets for Mrs Lee, but you count 11 in the cupboard.',
        prompt: 'What should you do?',
        answer: 'Recount with the witness to be sure, then report the discrepancy to the senior or manager immediately. Do not alter the register or make up the balance. Check the MAR and register for any dose given but not recorded, and whether Mrs Lee has had any unexplained effects. The manager will investigate, follow the controlled drugs procedure, and may need to report it to the local NHS England controlled drugs accountable officer and CQC. Record what you found.',
      },
      check: {
        question: 'What temperature range should a medicines fridge be kept at?',
        options: ['0 to 1°C', '2 to 8°C', '10 to 15°C', 'Below 25°C'],
        correct: 1,
        explanation: 'Medicines needing refrigeration are stored between 2°C and 8°C in a dedicated fridge, checked and recorded daily.',
      },
      image_prompt: 'Two care workers at a wall mounted locked metal controlled drugs cabinet in a care home clinical room, one counting a medicine box and the other watching and holding a bound register book with no readable text, a small medicines fridge with a thermometer nearby.',
      image_alt: 'Two care workers checking controlled drugs stock against the register at a locked cabinet',
    },
    {
      heading: 'Errors, your limits and seeking advice',
      minutes: 4,
      body:
        'Medication errors include giving the wrong medicine, dose, route or time, giving a medicine to the wrong person, missing a dose, giving a medicine the person is allergic to, and recording errors. A near miss is an error caught before it reached the person. They happen in every service, and what matters is what you do next.\n\n' +
        'If you make or discover an error, make sure the person is safe first. Check them, and seek clinical advice straight away from the GP, NHS 111 or the pharmacist, or call 999 if they are unwell. Tell the senior or manager immediately. Record what happened, when, and what was done. Do not hide an error or wait to see if the person is affected. Your employer will inform the person or their family in line with the duty of candour, may need to notify CQC or the local safeguarding team, and will look at why it happened so it can be prevented. Being open is protected; covering up is not.\n\n' +
        'Know the limits of your role. Only carry out medicines tasks you have been trained and assessed as able to do, for that person, as their plan and your policy say. Some tasks need specific training and delegation from a healthcare professional, such as insulin injections, buccal midazolam for seizures, PEG administration or rectal medicines. Never give medicines prescribed for someone else, never take verbal instructions to change a dose unless your policy allows and it is properly recorded, and never give a homely remedy outside the agreed policy.\n\n' +
        'Seek advice whenever you are unsure: from the senior, the pharmacist, the prescriber or NHS 111. The pharmacist is an excellent source of advice about how to give medicines, side effects and interactions.\n\n' +
        'After you pass the assessment, your manager or a suitably trained assessor will observe you giving medicines against a 12 point checklist. Every point must be met. If any point is not met yet, you will be told which, given support and further learning on it, and observed again. Your certificate is issued once your manager records a full sign-off.',
      scenario: {
        situation: 'Just after the round, you realise you gave Mrs Brown\'s evening medicines to Mrs Browne in the next room. Mrs Browne seems well.',
        prompt: 'What should you do?',
        answer: 'Tell the senior immediately and check Mrs Browne is safe, observing her closely. Get clinical advice straight away from the GP, out of hours service, NHS 111 or pharmacist about the medicines she received, and call 999 if she becomes unwell. Make sure Mrs Brown\'s medicines are dealt with as advised. Record exactly what happened. The manager will inform both people or their families in line with the duty of candour, report as required, and review why it happened.',
      },
      check: {
        question: 'What is the first priority when a medication error is discovered?',
        options: ['Completing the paperwork', 'Waiting to see if they are affected', 'Finding out who to blame', 'Making sure the person is safe and getting clinical advice'],
        correct: 3,
        explanation: 'The person\'s safety comes first: check them and get clinical advice immediately, then report and record.',
      },
      image_prompt: 'A care worker speaking urgently but calmly on the phone at a nurses station while a senior colleague checks on an older woman sitting in an armchair nearby, a MAR folder open on the desk, no readable text.',
      image_alt: 'A care worker phoning for advice while a senior colleague checks on a resident after an error',
    },
  ],
  activities: [
    {
      id: 'med-act-1', type: 'match', after_section: 0,
      title: 'Who does what?',
      instructions: 'Match each role to its responsibility.',
      pairs: [
        { term: 'Prescriber', definition: 'Decides what the person needs and writes the prescription' },
        { term: 'Pharmacist', definition: 'Dispenses and labels medicines and gives advice' },
        { term: 'Employer', definition: 'Provides the policy, training and assessment of staff' },
        { term: 'Care worker', definition: 'Administers as prescribed and trained, observes and reports' },
        { term: 'The person', definition: 'Has the right to be informed, involved and to refuse' },
      ],
    },
    {
      id: 'med-act-2', type: 'match', after_section: 1,
      title: 'Medicines and their risks',
      instructions: 'Match each medicine group to something to look out for.',
      pairs: [
        { term: 'Anticoagulants', definition: 'Bleeding and bruising' },
        { term: 'Opioid pain relief', definition: 'Drowsiness and constipation' },
        { term: 'Parkinson\'s medicines', definition: 'Must be given at the exact prescribed times' },
        { term: 'Methotrexate', definition: 'Usually taken once a week, not daily' },
        { term: 'Diuretics', definition: 'Needing the toilet more often, and dehydration' },
      ],
    },
    {
      id: 'med-act-3', type: 'order', after_section: 2,
      title: 'Before covert administration',
      instructions: 'Put the steps into order before covert administration can be used.',
      steps: [
        'Explore why the person is refusing and try other approaches',
        'Assess the person\'s capacity for the decision about their medicine',
        'Hold a best interests meeting with the prescriber, pharmacist, staff and family',
        'Get pharmacist advice on how each medicine can safely be given',
        'Record the decision in a covert medicines plan',
        'Review it regularly and for as short a time as possible',
      ],
    },
    {
      id: 'med-act-4', type: 'order', after_section: 3,
      title: 'Preparing to give a medicine',
      instructions: 'Put the preparation steps into order.',
      steps: [
        'Wash your hands and prepare a clean, uninterrupted space',
        'Confirm the person\'s identity',
        'Check allergies and special instructions',
        'Check the pharmacy label against the MAR: medicine, strength and dose',
        'Check the route, time and when any previous dose was given',
        'Check the expiry date and appearance of the medicine',
      ],
    },
    {
      id: 'med-act-5', type: 'sort', after_section: 4,
      title: 'Right or wrong technique?',
      instructions: 'Sort each practice.',
      bins: [
        { id: 'right', name: 'Correct technique', note: 'Safe administration' },
        { id: 'wrong', name: 'Incorrect technique', note: 'Could cause harm' },
      ],
      items: [
        { text: 'Measuring a liquid with an oral syringe', bin: 'right' },
        { text: 'Removing the old patch before applying a new one', bin: 'right' },
        { text: 'Leaving five minutes between different eye drops', bin: 'right' },
        { text: 'Crushing a slow release tablet to make it easier to swallow', bin: 'wrong' },
        { text: 'Popping a tablet into your hand before giving it', bin: 'wrong' },
        { text: 'Putting a hot water bottle over a pain relief patch', bin: 'wrong' },
      ],
    },
    {
      id: 'med-act-6', type: 'sort', after_section: 5,
      title: 'Safe recording?',
      instructions: 'Sort each recording practice.',
      bins: [
        { id: 'safe', name: 'Safe', note: 'Accurate and timely' },
        { id: 'unsafe', name: 'Unsafe', note: 'Could lead to harm' },
      ],
      items: [
        { text: 'Signing the MAR straight after the medicine is taken', bin: 'safe' },
        { text: 'Using the refused code and explaining in the notes', bin: 'safe' },
        { text: 'Recording the reason for a PRN dose and whether it worked', bin: 'safe' },
        { text: 'Signing the MAR before the round to save time', bin: 'unsafe' },
        { text: 'Leaving a blank when a dose was not given', bin: 'unsafe' },
        { text: 'Using correction fluid on an error', bin: 'unsafe' },
      ],
    },
    {
      id: 'med-act-7', type: 'match', after_section: 6,
      title: 'Storage and controlled drugs',
      instructions: 'Match each item to the correct requirement.',
      pairs: [
        { term: 'Schedule 2 controlled drugs in a care home', definition: 'Controlled drugs cupboard and register' },
        { term: 'Controlled drugs register', definition: 'A bound book with numbered pages, entries made the same day' },
        { term: 'Medicines fridge', definition: 'Between 2°C and 8°C, checked and recorded daily' },
        { term: 'Unwanted medicines in a care home without nursing', definition: 'Returned to the community pharmacy and recorded' },
      ],
    },
    {
      id: 'med-act-8', type: 'order', after_section: 7,
      title: 'After a medication error',
      instructions: 'Put the actions into order.',
      steps: [
        'Check the person is safe',
        'Get clinical advice straight away, or call 999 if they are unwell',
        'Tell the senior or manager immediately',
        'Record exactly what happened and what was done',
        'Support the manager to inform the person or family and report as required',
        'Take part in the review of why it happened',
      ],
    },
  ],
  references: [
    { title: 'Statutory and mandatory training guide for adult social care employers (December 2025)', url: 'https://www.skillsforcare.org.uk/resources/documents/Developing-your-workforce/Guide-to-developing-your-staff/Statutory-and-mandatory-training-guide-December-2025.pdf', source: 'Skills for Care', note: 'The framework this course is mapped to. Its medication administration row sets the expected content and names NICE SC1 and NG67.' },
    { title: 'Managing medicines in care homes (SC1)', url: 'https://www.nice.org.uk/guidance/sc1', source: 'NICE', note: 'National guidance for care homes on administering, recording, storing and reviewing medicines, including covert administration.' },
    { title: 'Managing medicines for adults receiving social care in the community (NG67)', url: 'https://www.nice.org.uk/guidance/ng67', source: 'NICE', note: 'National guidance for home care and community services, including levels of support and recording.' },
    { title: 'Medicines in care homes (QS85)', url: 'https://www.nice.org.uk/guidance/qs85', source: 'NICE', note: 'The quality standard for medicines in care homes, used by providers and inspectors.' },
    { title: 'Medicines information for adult social care services', url: 'https://www.cqc.org.uk/guidance-providers/adult-social-care/medicines-information-adult-social-care-services', source: 'Care Quality Commission', note: 'CQC\'s guidance hub for medicines in care homes, home care and supported living.' },
    { title: 'Controlled drugs in care homes', url: 'https://www.cqc.org.uk/guidance-providers/adult-social-care/controlled-drugs-care-homes', source: 'Care Quality Commission', note: 'Storage, the register, witnessing, stock checks and disposal of controlled drugs, the basis for section 7.' },
    { title: 'Covert administration of medicines', url: 'https://www.cqc.org.uk/guidance-providers/adult-social-care/covert-administration-medicines', source: 'Care Quality Commission', note: 'When covert administration may be considered, the best interests process and the need for pharmacy advice.' },
    { title: 'Medicines administration records in adult social care', url: 'https://www.cqc.org.uk/guidance-providers/adult-social-care/medicines-administration-records-adult-social-care', source: 'Care Quality Commission', note: 'What a MAR must contain and how to record administration, refusals and changes.' },
    { title: 'Transdermal fentanyl patches: life threatening and fatal opioid toxicity from accidental exposure', url: 'https://www.gov.uk/drug-safety-update/transdermal-fentanyl-patches-life-threatening-and-fatal-opioid-toxicity-from-accidental-exposure-particularly-in-children', source: 'MHRA, GOV.UK', note: 'Safety advice on applying, removing and disposing of fentanyl patches, used in section 5.' },
    { title: 'The Misuse of Drugs Regulations 2001', url: 'https://www.legislation.gov.uk/uksi/2001/3998/contents', source: 'legislation.gov.uk', note: 'The regulations governing controlled drugs, including records and schedules.' },
  ],
  glossary: [
    { term: 'MAR', definition: 'Medicines administration record: the legal record of medicines given to a person.' },
    { term: 'Six rights', definition: 'Right person, medicine, dose, route, time and documentation.' },
    { term: 'PRN', definition: 'When required: a medicine given only when needed, following a PRN protocol.' },
    { term: 'Controlled drug', definition: 'A medicine that could be misused, with extra legal controls on storage and recording.' },
    { term: 'Controlled drugs register', definition: 'A bound book recording every movement of Schedule 2 controlled drugs.' },
    { term: 'Covert administration', definition: 'Giving medicine hidden in food or drink, only after a best interests decision for a person who lacks capacity.' },
    { term: 'Time critical medicine', definition: 'A medicine that must be given at a precise time, such as Parkinson\'s medicines.' },
    { term: 'Homely remedy', definition: 'A non prescription medicine a care home may give under a policy agreed with a GP or pharmacist.' },
    { term: 'Modified release', definition: 'A medicine designed to release slowly; it must not be crushed or chewed.' },
    { term: 'Medicines reconciliation', definition: 'Checking a person\'s medicines against reliable sources when they move between services.' },
    { term: 'Duty of candour', definition: 'The duty to be open and honest with people when something goes wrong with their care.' },
    { term: 'Near miss', definition: 'An error that was caught before it reached the person.' },
  ],
  practical_checklist: MEDICATION_CHECKLIST,
  // Final assessment: four questions per section, 32 in total, 80% to pass (26 of
  // 32), maximum three attempts before the learner is returned to the lesson.
  questions: [
    // Section 1. The law, guidance and your role
    { id: 'q1', text: 'Which regulations control how controlled drugs are stored and recorded?', options: ['RIDDOR 2013', 'The Food Safety Act 1990', 'The Misuse of Drugs Regulations 2001', 'The Equality Act 2010'], correct: 2 },
    { id: 'q2', text: 'Which NICE guidance covers managing medicines in care homes?', options: ['NG67', 'SC1', 'CG179', 'NG31'], correct: 1 },
    { id: 'q3', text: 'A person can manage their own medicines. You should:', options: ['Take them away to be safe', 'Support them to keep doing so, as their plan says', 'Give them yourself', 'Ask the family to do it'], correct: 1 },
    { id: 'q4', text: 'Who dispenses and labels medicines?', options: ['The care worker', 'The family', 'The pharmacist', 'The registered manager'], correct: 2 },
    // Section 2. Common medicines and their use
    { id: 'q5', text: 'Which side effect should you watch for with anticoagulants?', options: ['Hair growth', 'Better appetite', 'Bleeding and bruising', 'Improved sleep'], correct: 2 },
    { id: 'q6', text: 'Methotrexate is usually taken:', options: ['Once a week', 'Three times a day', 'Only at night', 'Every hour'], correct: 0 },
    { id: 'q7', text: 'Why should a slow release tablet not be crushed?', options: ['It can release the whole dose at once and cause harm', 'It tastes bad', 'It becomes stronger over time', 'It is too hard'], correct: 0 },
    { id: 'q8', text: 'A homely remedy may be given:', options: ['Whenever someone asks', 'Instead of prescribed medicines', 'By visitors', 'Only as allowed by the policy agreed with the GP or pharmacist'], correct: 3 },
    // Section 3. Consent, capacity and covert medication
    { id: 'q9', text: 'A person with capacity refuses a medicine. You should:', options: ['Hide it in their food', 'Give it anyway', 'Respect it, record it and report it', 'Tell them they must take it'], correct: 2 },
    { id: 'q10', text: 'Under the Mental Capacity Act, a person is:', options: ['Assumed to lack capacity if they have dementia', 'Assumed to have capacity unless it is established that they lack it', 'Never able to refuse medicines', 'Only able to decide with family'], correct: 1 },
    { id: 'q11', text: 'Why must a pharmacist advise before covert administration?', options: ['It is polite', 'It is not needed', 'Pharmacists must taste the food', 'Crushing or mixing medicines can make them unsafe or ineffective'], correct: 3 },
    { id: 'q12', text: 'How long should covert administration continue?', options: ['For ever once started', 'One month exactly', 'Until the family says stop', 'For as short a time as possible, with regular review'], correct: 3 },
    // Section 4. Preparing to administer
    { id: 'q13', text: 'What is the safest way to confirm a person\'s identity before giving medicines?', options: ['Their room number only', 'Their photograph on the MAR and asking their name and date of birth where possible', 'Asking another resident', 'Guessing from their clothes'], correct: 1 },
    { id: 'q14', text: 'The pharmacy label and the MAR show different doses. You should:', options: ['Not give it and get the discrepancy resolved', 'Give the dose on the MAR', 'Give the dose on the label', 'Give half of each'], correct: 0 },
    { id: 'q15', text: 'Why do many services use a "do not disturb" tabard during medicines rounds?', options: ['For identification only', 'It is a uniform rule', 'Interruptions cause errors', 'To look professional'], correct: 2 },
    { id: 'q16', text: 'Which is one of the six rights?', options: ['Right colour', 'Right day of the week only', 'Right price', 'Right documentation'], correct: 3 },
    // Section 5. Administration techniques
    { id: 'q17', text: 'How should a liquid medicine be measured?', options: ['With a teaspoon', 'With a cup', 'By eye', 'With an oral syringe or medicine measure'], correct: 3 },
    { id: 'q18', text: 'When changing a pain relief patch, you should:', options: ['Leave the old one on', 'Remove the old patch first and apply the new one to a different site', 'Apply it over the old one', 'Use the same site every time'], correct: 1 },
    { id: 'q19', text: 'A PRN protocol tells you:', options: ['Only the person\'s name', 'The pharmacy\'s opening hours', 'The price of the medicine', 'What the medicine is for, the signs, the dose, the minimum interval and the maximum in 24 hours'], correct: 3 },
    { id: 'q20', text: 'Why can paraffin based emollients be a risk?', options: ['They stain', 'They soak into fabrics and make them more flammable', 'They are too cold', 'They are expensive'], correct: 1 },
    // Section 6. Recording and monitoring
    { id: 'q21', text: 'When should the MAR be signed?', options: ['Before the round', 'Immediately after the person has taken the medicine', 'At handover', 'The next day'], correct: 1 },
    { id: 'q22', text: 'Why is a blank on the MAR unsafe?', options: ['It looks untidy', 'Nobody can tell whether the dose was given', 'It wastes paper', 'It is not unsafe'], correct: 1 },
    { id: 'q23', text: 'Medicines reconciliation means:', options: ['Checking a person\'s medicines against reliable sources when they move between services', 'Ordering new stock', 'Returning medicines to the pharmacy', 'Counting tablets weekly'], correct: 0 },
    { id: 'q24', text: 'After giving a PRN painkiller, you should:', options: ['Forget about it', 'Give another straight away', 'Record the reason and check and record whether it worked', 'Tell the family only'], correct: 2 },
    // Section 7. Controlled drugs, storage and disposal
    { id: 'q25', text: 'A controlled drugs register should be:', options: ['A loose leaf folder', 'Kept on a phone', 'A notebook in the office', 'A bound book with numbered pages'], correct: 3 },
    { id: 'q26', text: 'The controlled drugs count does not match the register. You should:', options: ['Change the register to match', 'Recount with a witness and report it immediately', 'Ignore a small difference', 'Wait until the next check'], correct: 1 },
    { id: 'q27', text: 'Most medicines should be stored:', options: ['Below 25°C, or as the label says', 'In direct sunlight', 'In a car', 'Above 30°C'], correct: 0 },
    { id: 'q28', text: 'How should unwanted medicines be disposed of in a care home without nursing?', options: ['Returned to the community pharmacy and recorded', 'Flushed down the toilet', 'Put in the bin', 'Given to another resident'], correct: 0 },
    // Section 8. Errors, your limits and seeking advice
    { id: 'q29', text: 'You discover you gave a medicine to the wrong person. What comes first?', options: ['Filling in the form', 'Hiding the mistake', 'Checking the person is safe and getting clinical advice', 'Waiting to see if they are affected'], correct: 2 },
    { id: 'q30', text: 'Which task needs specific training and delegation before you can do it?', options: ['Giving tablets from a blister pack', 'Reading the MAR', 'Offering a glass of water', 'Insulin injections'], correct: 3 },
    { id: 'q31', text: 'A near miss is:', options: ['An error caught before it reached the person', 'An error that reached the person', 'A late round', 'A refusal'], correct: 0 },
    { id: 'q32', text: 'When is your medication certificate issued?', options: ['After you pass the assessment and your manager signs off an observation with every point met', 'When you start the course', 'After the assessment only', 'After a year'], correct: 0 },
  ],
}
