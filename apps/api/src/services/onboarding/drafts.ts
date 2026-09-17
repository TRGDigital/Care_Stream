// Draft onboarding emails — a second wave covering the features and situations
// the original sequence does not reach.
//
// Every email here carries `draft: true`, which seeds it with is_active = false.
// A draft is visible in Platform → Email Marketing, can be previewed and test
// sent, and is skipped by the dispatcher, so nothing reaches a tenant until it
// is published. The intended flow is: review the copy, add the screenshot, then
// publish.
//
// House style, as in content.ts: no dashes, benefit first, plain English, and
// never a claim the product cannot back up.

import type { OnboardingEmail, PlanKey } from './content'

// ── Shared: every plan ────────────────────────────────────────────────────────

export const DRAFTS_CORE: OnboardingEmail[] = [
  {
    draft: true,
    subject:   'The questions your staff ask at 3am',
    preheader: 'Query history shows you what your team really needs to know.',
    headline:  'Every question your team asks, in one place',
    intro: [
      'Your staff ask CareStream things they would never put in an email to you. What to do when a resident refuses medication. Whether they can accept a gift. Who to call when the heating fails on a Sunday night.',
      'Query history collects all of it. Not to check up on anyone, but because the questions themselves tell you exactly where your training and your policies are thin.',
    ],
    steps: [
      { title: 'Open Query history', body: 'You will see what has been asked across your service, with the busiest topics first.' },
      { title: 'Look for repeats', body: 'The same question asked five times is a gap in your induction, not five curious carers.' },
      { title: 'Act on the pattern', body: 'Add a knowledge base entry, update the policy, or set a training module. The next person gets a better answer.' },
    ],
    tip: 'Check this weekly for the first month. It is the fastest read you will get on what your team is unsure about.',
    ctaLabel: 'See what your team is asking',
    ctaHref:  '/queries',
  },
  {
    draft: true,
    subject:   'Capture what your longest-serving carer knows',
    preheader: 'The knowledge base holds what is not written in any policy.',
    headline:  'The things that live in people’s heads',
    intro: [
      'Every service runs on knowledge that was never written down. Which GP surgery picks up first. Where the spare hoist battery is kept. Why the fire panel beeps on a Tuesday. It sits with the people who have been there longest, and it walks out of the door when they do.',
      'Your knowledge base is where that becomes permanent. Entries are generated from your policies, pre-loaded from our UK care regulations library, and added by hand for everything else. Approve one and every member of staff can ask about it.',
    ],
    steps: [
      { title: 'Open the Knowledge Base', body: 'Review what CareStream has already drawn from your policies, grouped by category.' },
      { title: 'Add what is missing', body: 'Choose Add entry and write the question the way a carer would ask it, not the way a policy would phrase it.' },
      { title: 'Approve it', body: 'An entry only reaches your staff once approved, so nothing goes live that you have not read.' },
    ],
    tip: 'Ask your longest-serving member of staff what new starters always get wrong. Their answer is your first five entries.',
    ctaLabel: 'Build your knowledge base',
    ctaHref:  '/knowledge',
  },
  {
    draft: true,
    subject:   'Your new starter can now ask about Mrs Patel by name',
    preheader: 'Resident entries in your knowledge base, ready when the regular team is not.',
    headline:  'What the regular team knows, available to everyone',
    intro: [
      'A bank carer walks onto your unit at 7am. The person in room 4 will not eat breakfast, gets distressed at the sound of the trolley, and likes to be called by her middle name. The regular team knows all of this. Tonight nobody on shift does.',
      'Resident entries put that knowledge where it can be reached. What a person likes to be called, their background, the food they enjoy, the routine that settles them at night. Once you have approved an entry, staff can ask about that resident by name in the hub.',
    ],
    steps: [
      { title: 'Add an entry', body: 'On the Knowledge Base, choose Add entry and pick the Resident category.' },
      { title: 'Write what matters day to day', body: 'Preferred name, life history, what calms them, what unsettles them. The detail a new starter would take three weeks to learn.' },
      { title: 'Approve it', body: 'Resident entries are stored apart from your policies and coloured so you can see them at a glance. Approve, and your staff can ask.' },
    ],
    tip: 'Start with the residents your bank and agency staff find hardest. That is where the difference shows up first.',
    ctaLabel: 'Add your first resident entry',
    ctaHref:  '/knowledge',
  },
  {
    draft: true,
    subject:   'Supervisions that leave a record without the paperwork',
    preheader: 'Allocate, hold and record a supervision in one place.',
    headline:  'The supervision is the easy part. The record is not.',
    intro: [
      'Most managers do not mind holding supervisions. What they mind is the form afterwards, the chasing, and the moment an inspector asks to see the last twelve months and nobody is sure where they are.',
      'CareStream handles the administration around it. Allocate supervisions to the right people, capture the conversation against a structure, and keep every record in one place that can be produced on request.',
    ],
    steps: [
      { title: 'Allocate supervisions', body: 'Set who supervises whom, so nobody is missed and nobody is supervised by two people at once.' },
      { title: 'Record as you go', body: 'Complete the form during or straight after the conversation, while it is still fresh.' },
      { title: 'See the whole picture', body: 'Your supervision record shows who is up to date and who is overdue, without a spreadsheet.' },
    ],
    tip: 'Overdue supervision is one of the most common findings in a well-led judgement. It is also one of the easiest to fix.',
    ctaLabel: 'Set up your supervisions',
    ctaHref:  '/supervisions',
  },
  {
    draft: true,
    subject:   'Knowledge is half of competence. Here is the other half.',
    preheader: 'Observed competency sign-off, recorded alongside the certificate.',
    headline:  'Passing a quiz is not the same as doing the job',
    intro: [
      'A carer can score full marks on moving and handling and still position a sling badly. Everyone in care knows this, which is why a certificate on its own has never been enough.',
      'For training that requires it, CareStream holds the certificate until a manager or competent assessor has watched the person do the task and signed it off. The learner sees that it is pending and what is outstanding, and the certificate names who verified the observation and when.',
    ],
    steps: [
      { title: 'Check which modules require it', body: 'Practical topics carry an observed competency requirement and an observation checklist.' },
      { title: 'Observe and sign off', body: 'Watch the task in the workplace, complete the checklist, and record the sign-off against that member of staff.' },
      { title: 'The certificate issues', body: 'Knowledge and observed practice together, evidenced on one document.' },
    ],
    tip: 'This is the difference between evidencing that someone was trained and evidencing that they are competent. Inspectors ask about the second.',
    ctaLabel: 'See your practical checklists',
    ctaHref:  '/training',
  },
  {
    draft: true,
    subject:   'Your carer reads it in Polish. Your records stay in English.',
    preheader: 'Training in over 60 languages, with one compliance record.',
    headline:  'Learning in their language, evidence in yours',
    intro: [
      'A carer who reads English as a second language can pass a test by recognising words rather than understanding them. That is a risk you carry every day, and it does not show up until something goes wrong.',
      'CareStream delivers the lesson, the scenario and the assessment in the language your carer thinks in, while your training record, certificates and inspection evidence stay in English. Nobody has to choose between understanding and paperwork.',
    ],
    steps: [
      { title: 'Let staff pick their language', body: 'They choose it in the hub, and can switch at any point without losing their place.' },
      { title: 'Watch the scores change', body: 'Comprehension often jumps once the barrier is language rather than knowledge.' },
      { title: 'Produce evidence in English', body: 'Your records read the same for an inspector as they always did.' },
    ],
    tip: 'Ask a member of staff who reads English as a second language to try a module in their own language, then ask which they understood better.',
    ctaLabel: 'See the languages available',
    ctaHref:  '/staff',
  },
  {
    draft: true,
    subject:   'For the carer who would rather listen than read',
    preheader: 'Read aloud, clear layouts and larger touch targets, built in.',
    headline:  'Training that does not assume a confident reader',
    intro: [
      'Around one in six adults in the UK reads below the level of a nine year old, and a good number of them are excellent carers. Dense text on a small screen is not a fair test of whether someone can do this job well.',
      'CareStream can read lesson content aloud, uses high contrast text and a consistent layout, and is built for a phone held in one hand. Nobody has to declare a difficulty to get the version that works for them.',
    ],
    steps: [
      { title: 'Show staff the listen control', body: 'It sits with the lesson text. Tap it and the content is read aloud.' },
      { title: 'Let them set their own view', body: 'Display settings in the hub adjust how content is presented for each person.' },
      { title: 'Say it out loud once', body: 'Tell your team these options exist. Most people will not ask.' },
    ],
    tip: 'This matters most for the staff least likely to raise it. Mention it in a team meeting rather than waiting for someone to ask.',
    ctaLabel: 'See the accessibility options',
    ctaHref:  '/chat',
  },
  {
    draft: true,
    subject:   'You have inherited a service. Start here.',
    preheader: 'A first thirty days for a manager who has just taken over.',
    headline:  'Find out what you have actually taken on',
    intro: [
      'Taking over a service means inheriting somebody else’s paperwork, somebody else’s training record and somebody else’s idea of what good looks like. The hardest part of the first month is not fixing things. It is finding out what needs fixing.',
      'CareStream gives you that picture in a morning rather than a quarter. What policies exist, which are out of date, who has been trained on what, and where the gaps are.',
    ],
    steps: [
      { title: 'Upload what you inherited', body: 'Put the existing policy folder in as it is. You are not committing to it, you are looking at it.' },
      { title: 'Run the gaps analysis', body: 'See what is missing, what is out of date and what cites legislation that has moved on.' },
      { title: 'Check the training record', body: 'The compliance view shows who is current, who is overdue and who was never trained at all.' },
    ],
    tip: 'Do this before you change anything. Knowing the starting point is what lets you show improvement later.',
    ctaLabel: 'See where your service stands',
    ctaHref:  '/gaps',
  },
  {
    draft: true,
    subject:   'The inspector is coming. Here is your evidence.',
    preheader: 'Pull your training, policy and audit evidence together in one go.',
    headline:  'What to do with the notice you have just had',
    intro: [
      'The call comes and the next two days disappear into folders. Training matrices printed, certificates hunted down, policies checked for dates, staff briefed on what they might be asked.',
      'Most of that is already in CareStream. Your evidence pack, your compliance position and your staff preparation can be produced in an afternoon, which leaves you the rest of the time for the part that actually matters: your team.',
    ],
    steps: [
      { title: 'Generate your evidence', body: 'Produce the training and compliance evidence in one click rather than one folder at a time.' },
      { title: 'Check your gaps', body: 'See what an inspector would find before they find it, and fix what can still be fixed.' },
      { title: 'Prepare your staff', body: 'Role-matched CQC questions let your team practise the questions they will actually be asked.' },
    ],
    tip: 'Do the staff preparation first. Documents can be produced quickly. Confidence cannot.',
    ctaLabel: 'Build your evidence pack',
    ctaHref:  '/compliance',
  },
  {
    draft: true,
    subject:   'Turning a rating around, with the paper trail to prove it',
    preheader: 'Requires Improvement is a starting point, if you can evidence the change.',
    headline:  'Showing improvement, not just making it',
    intro: [
      'Services that turn a rating around usually did the work. What they often cannot do is prove when it started, what changed, and that it held. Improvement without evidence reads as luck.',
      'CareStream timestamps the lot. Policies updated and approved, training completed and verified, audits run and acted on. When the inspector returns, the story tells itself in dates.',
    ],
    steps: [
      { title: 'Fix the policies first', body: 'Out of date content and missing policies are the findings most easily closed before the next visit.' },
      { title: 'Evidence the training', body: 'Assign, complete and verify, with observed competency where practice matters.' },
      { title: 'Show the rhythm', body: 'Monthly audits and supervisions demonstrate a service that runs well, not one that tidied up for a visit.' },
    ],
    tip: 'Start the record on day one of your action plan. A gap at the beginning is the part nobody can fill in later.',
    ctaLabel: 'Start your improvement record',
    ctaHref:  '/dashboard',
  },
  {
    draft: true,
    subject:   'Induct an agency carer before their first shift',
    preheader: 'A short, role-matched induction that travels with the worker.',
    headline:  'The carer who has never been in your building',
    intro: [
      'Agency and bank staff arrive knowing the job but not your service. Where the fire panel is. How you record a refusal. Who to ring at night. On a short-notice shift, most of that gets explained in the corridor, if at all.',
      'CareStream gives them a short induction they can complete before they arrive, matched to the role they are covering, with your policies behind it. An existing flow can be marked as suitable for agency, so you are not maintaining a second set.',
    ],
    steps: [
      { title: 'Mark a flow as agency suitable', body: 'Use the induction you already have rather than building another one.' },
      { title: 'Send it ahead of the shift', body: 'They complete it on their own phone before they walk in.' },
      { title: 'Keep the record', body: 'You can evidence that a temporary worker was inducted, which is a question inspectors do ask.' },
    ],
    tip: 'Keep it short. An agency carer will do ten minutes before a shift and will not do an hour.',
    ctaLabel: 'Set up an agency induction',
    ctaHref:  '/onboarding',
  },
  {
    draft: true,
    subject:   'Registering a new service? Start with the policies.',
    preheader: 'A complete, setting-specific policy set from day one.',
    headline:  'CQC will ask for your policies before you open',
    intro: [
      'Registration asks you to evidence how you will run a service that has not opened yet. That means a full policy set, matched to your care setting, written well enough to satisfy an inspector who has read a thousand of them.',
      'CareStream seeds a complete library for your setting, whether that is residential, nursing, supported living, domiciliary or one of the other settings we cover, and every policy is yours to edit before you adopt it.',
    ],
    steps: [
      { title: 'Choose your care setting', body: 'The library that seeds is the one for the service you are registering, not a generic pack.' },
      { title: 'Review and adopt', body: 'Read, adjust the detail that is specific to your building and your team, then adopt.' },
      { title: 'Show the AI behind it', body: 'From day one your staff can ask questions of the policies you have just written.' },
    ],
    tip: 'Registering more than one service? The library seeds per service, so each one gets a set that matches what it actually does.',
    ctaLabel: 'See your policy library',
    ctaHref:  '/policies',
  },
  {
    draft: true,
    subject:   'Since Oliver McGowan training became mandatory',
    preheader: 'Learning disability and autism awareness, at the level your roles need.',
    headline:  'A legal duty most services are still catching up on',
    intro: [
      'Every CQC registered service must now train its staff in how to interact appropriately with people who have a learning disability and autistic people, at a level suited to their role. For most providers this arrived faster than the training to meet it.',
      'CareStream covers the awareness level across your workforce, including the new sixteenth Care Certificate standard, and records who has completed it. Reasonable adjustments, diagnostic overshadowing, communication that works for the person in front of you.',
    ],
    steps: [
      { title: 'Assign the awareness training', body: 'Everyone needs it, including staff who do not deliver hands-on care.' },
      { title: 'Match the level to the role', body: 'The duty is role-appropriate, so your kitchen team and your nurses need different depth.' },
      { title: 'Keep the record', body: 'Completion is evidenced per person, ready for the question when it comes.' },
    ],
    tip: 'This applies to every role in the building, not only carers. That is the part most services get wrong.',
    ctaLabel: 'Assign the training',
    ctaHref:  '/training',
  },
  {
    draft: true,
    subject:   'Your staff are never in the same building',
    preheader: 'For domiciliary and community teams with no noticeboard and no staff room.',
    headline:  'Community care has no corridor to catch people in',
    intro: [
      'In a care home you can put a notice by the kettle and know it has been seen. In domiciliary care your team starts at home, works alone all day and may not see a manager for a fortnight. Every method of getting information to them competes with their own time.',
      'CareStream lives on the phone they already carry. A carer between calls can ask a question and get an answer from your policies in seconds, complete training in the gaps of a day, and never come into the office for either.',
    ],
    steps: [
      { title: 'Get the hub onto their phones', body: 'No app store, no laptop, no office visit.' },
      { title: 'Set training they can do in pieces', body: 'Progress saves, so a module survives being interrupted by a call.' },
      { title: 'Watch completion without chasing', body: 'You can see who is progressing rather than ringing round to ask.' },
    ],
    tip: 'Lone working questions are the most common thing community staff ask. Make sure that policy is one of the first you upload.',
    ctaLabel: 'Set your team up',
    ctaHref:  '/staff',
  },
  {
    draft: true,
    subject:   'The training your carers will mention at interview',
    preheader: 'CPD accredited training is a recruitment argument, not just a compliance cost.',
    headline:  'Turn your training into a reason to join you',
    intro: [
      'Care recruitment is won on small differences. Pay is broadly the same across the road. What differs is whether a carer believes the job will take them somewhere, and most employers give them no reason to think so.',
      'Training that is CPD accredited, delivered in their language and recorded properly is something a carer can take with them and something they will mention when a friend asks where they work. It costs you nothing extra to say so in the advert.',
    ],
    steps: [
      { title: 'Say it in your job adverts', body: 'CPD accredited training, in over 60 languages, from day one. Most adverts in your area say nothing about development at all.' },
      { title: 'Show it at induction', body: 'A new starter who sees a pathway in week one is a new starter who is still there in month six.' },
      { title: 'Let staff see their record', body: 'Their own certificates and progress, visible to them, not filed in an office.' },
    ],
    tip: 'Turnover costs more than training. A carer who leaves at four months costs you the recruitment, the induction and the agency cover that fills the gap.',
    ctaLabel: 'See your training library',
    ctaHref:  '/training',
  },
  {
    draft: true,
    subject:   'What that agency shift actually cost you',
    preheader: 'Agency workers, their dates, their day rate and what they can see.',
    headline:  'Agency spend, visible before the invoice arrives',
    intro: [
      'Agency covers the gap and nobody argues with that at 6am on a Sunday. The problem is that the cost only becomes real weeks later, on an invoice, by which point the decisions that caused it are long forgotten.',
      'Add an agency worker to CareStream with their agency, their start and end dates and their day rate, and your staff page carries a running twelve month picture of what agency is costing you, next to the team it is covering for.',
    ],
    steps: [
      { title: 'Add them as an agency worker', body: 'Choose the agency type when you add the person, then record the agency name, the dates and the day rate.' },
      { title: 'Watch the spend panel', body: 'Agency spend over the last twelve months sits above your staff list as soon as you have bookings.' },
      { title: 'Give them what they need', body: 'They get the same hub access to your policies as your own team, so nobody is working from guesswork on their first shift.' },
    ],
    tip: 'Record the day rate even when finance already has it. The value is seeing spend beside the vacancies causing it, which is the argument for recruiting.',
    ctaLabel: 'Add an agency worker',
    ctaHref:  '/staff',
  },
  {
    draft: true,
    subject:   'The signed sheet from your last training session',
    preheader: 'Print it, sign it, upload it. The evidence sits with the session.',
    headline:  'Face to face training, evidenced properly',
    intro: [
      'A classroom session leaves you with a sheet of signatures on a clipboard. Six months later an inspector asks who attended the moving and handling refresher in March, and the answer is in a drawer, a folder, or nowhere.',
      'CareStream prints the sign-in sheet for you, with your attendees listed and a signature column, and lets you upload the signed copy back against the session. Attendance, signatures and any certificates live with the record rather than in a cupboard.',
    ],
    steps: [
      { title: 'Print the sign-in sheet', body: 'Your attendee list, a signature column and a trainer signature line, ready for the room.' },
      { title: 'Upload the signed copy', body: 'Photograph or scan it after the session and attach it to that session as evidence.' },
      { title: 'Record who actually came', body: 'Mark attendance against the list, so the record shows who was there rather than who was invited.' },
    ],
    tip: 'Upload it the same day. The sheet that gets scanned a fortnight later is the one nobody can find.',
    ctaLabel: 'Set up a session',
    ctaHref:  '/training',
  },
  {
    draft: true,
    subject:   'Something happened last night. Train on it this morning.',
    preheader: 'Push targeted questions to the right staff, hours after an incident.',
    headline:  'The training that lands while it still matters',
    intro: [
      'A fall, a medication error, a safeguarding concern. The response is usually a note in the handover book and a plan to cover it at the next team meeting, three weeks away, by which point the people who needed it most have moved on.',
      'Post-incident training closes that gap. Describe what happened, choose the topic, pick who needs it, and CareStream pushes targeted questions from that module straight to them. You can send to everyone, to the night shift only, or to named individuals.',
    ],
    steps: [
      { title: 'Describe the incident', body: 'A sentence or two of context, so staff understand why this arrived today.' },
      { title: 'Choose the topic and the audience', body: 'Everyone, day shift, night shift, or specific people. A night-time fall is a night shift conversation.' },
      { title: 'Check who received it', body: 'You see per person whether it was delivered, and who could not be reached because they have no contact details on file.' },
    ],
    tip: 'Send it to the shift that was on, not the whole home. Training that is obviously aimed at the people involved gets taken seriously.',
    ctaLabel: 'Send post-incident training',
    ctaHref:  '/training',
  },
]

// ── Professional and above ────────────────────────────────────────────────────

export const DRAFTS_PRO: OnboardingEmail[] = [
  {
    draft: true,
    badge: 'Professional feature',
    subject:   'When the law changes, your policies raise their hand',
    preheader: 'Legislation moves. CareStream tells you which policies it touched.',
    headline:  'Nobody reads the statute book on a Tuesday',
    intro: [
      'Guidance is updated, a code of practice is revised, an Act is amended. None of it arrives with a note telling you which of your policies just went out of date, and most services find out at inspection.',
      'CareStream watches the changes that matter to social care and tells you which of your policies reference what has moved, so you can update the three that need it rather than re-reading forty.',
    ],
    steps: [
      { title: 'See what has changed', body: 'Legislation changes are tracked and matched against the content of your own policies.' },
      { title: 'Check the flagged policies', body: 'Each one shows the wording that is now out of date and what it should say instead.' },
      { title: 'Update and approve', body: 'Adopt the change into a draft, approve it, and your policy library moves with the law.' },
    ],
    tip: 'This is the part almost no provider has an answer for. Being able to show it at inspection says more than any single policy does.',
    ctaLabel: 'See what has changed',
    ctaHref:  '/gaps',
  },
  {
    draft: true,
    badge: 'Professional feature',
    subject:   'Every policy, mapped to a quality statement',
    preheader: 'The Single Assessment Framework replaced KLOEs. Your evidence should follow.',
    headline:  'Inspection changed shape. Your evidence can too.',
    intro: [
      'The Single Assessment Framework asks for evidence against quality statements, but most policy libraries are still organised the way they were when inspectors asked about key lines of enquiry.',
      'CareStream maps your policies to the quality statements they support, so when you are asked how you evidence a statement, you can answer with what you already have rather than building the link in your head.',
    ],
    steps: [
      { title: 'Open CQC Quality Statements', body: 'See the statements and what in your service speaks to each one.' },
      { title: 'Find the thin ones', body: 'A statement with nothing behind it is the one to work on first.' },
      { title: 'Use it in your evidence', body: 'Produce the mapping when you are asked, rather than assembling it under pressure.' },
    ],
    tip: 'If your policy set still refers to KLOEs anywhere, the out of date content check will find it for you.',
    ctaLabel: 'See your quality statements',
    ctaHref:  '/cqc-quality-statements',
  },
  {
    draft: true,
    badge: 'Professional feature',
    subject:   'The policies you do not have yet',
    preheader: 'Missing is harder to spot than out of date, and costs more.',
    headline:  'You cannot review a policy that was never written',
    intro: [
      'Out of date content is visible. Absence is not. A service can run for years without a policy it is legally required to hold, and nobody notices until an inspector asks for it by name.',
      'CareStream compares your library against what a service like yours is required to have, and lists what is not there. Not a generic checklist, but measured against your care setting and the legislation that applies to it.',
    ],
    steps: [
      { title: 'Run the analysis', body: 'Your library is checked against the policies your setting is expected to hold.' },
      { title: 'Review what is missing', body: 'Each gap explains what the policy is for and why it applies to you.' },
      { title: 'Seed what you need', body: 'Adopt a policy from the library, edit it to match your service, and close the gap.' },
    ],
    tip: 'Work top down. The missing policies tied to a legal duty matter more than the ones that are merely good practice.',
    ctaLabel: 'Find what is missing',
    ctaHref:  '/gaps',
  },
  {
    draft: true,
    badge: 'Professional feature',
    subject:   'Audits that arrive on their own',
    preheader: 'A monthly rhythm, with a sign-off trail behind it.',
    headline:  'Audit as a habit, not an event',
    intro: [
      'Most services audit properly in the month before an inspection and sporadically the rest of the time. Inspectors can tell, because the dates cluster.',
      'CareStream schedules your audits so they arrive on a rhythm, routes them to the right person, and keeps the sign-off. A year of evenly spaced audits with actions closed says more about a well-led service than any single document.',
    ],
    steps: [
      { title: 'Set your monthly audits', body: 'Choose what runs each month and who it goes to.' },
      { title: 'Complete and approve', body: 'The person doing the audit completes it. A manager signs it off.' },
      { title: 'Act on the findings', body: 'Actions are recorded against the audit, so the next one can show what changed.' },
    ],
    tip: 'Spread them across the month rather than doing them all on the first. The pattern is part of the evidence.',
    ctaLabel: 'Schedule your audits',
    ctaHref:  '/audits',
  },
]

// ── Enterprise only ───────────────────────────────────────────────────────────

export const DRAFTS_ENTERPRISE: OnboardingEmail[] = [
  {
    draft: true,
    badge: 'Enterprise feature',
    subject:   'One view across every home you run',
    preheader: 'Compare services, spot the outlier, share what works.',
    headline:  'Running six services should not mean six spreadsheets',
    intro: [
      'When you hold more than one service, the hard question is not how any single home is doing. It is which one is drifting, and whether you will notice before someone else does.',
      'The group view puts your services side by side. Training compliance, policy currency, audit completion and usage, per home, in one place. The home that is behind becomes obvious, and so does the home worth copying.',
    ],
    steps: [
      { title: 'Open the Group view', body: 'Every service you run, with the same measures across all of them.' },
      { title: 'Find the outlier', body: 'One home consistently behind is a management conversation, not a training one.' },
      { title: 'Standardise what works', body: 'A policy or induction flow that works in one service can be used across the group.' },
    ],
    tip: 'The measure worth watching across a group is consistency. Two homes at ninety per cent beats one at a hundred and one at eighty.',
    ctaLabel: 'See your group',
    ctaHref:  '/group',
  },
  {
    draft: true,
    badge: 'Enterprise feature',
    subject:   'Know exactly who is using what',
    preheader: 'Licences, seats and usage, without a reconciliation exercise.',
    headline:  'The question your finance director will ask',
    intro: [
      'Software spend in care creeps. A seat here for a leaver who never got removed, a licence there for a service that closed. By the time anyone checks, nobody can say who is actually using what.',
      'Licences shows you the position at a glance: who holds a seat, who is active, and where you are paying for someone who left in March.',
    ],
    steps: [
      { title: 'Open Licences', body: 'See your allocation and how much of it is in use.' },
      { title: 'Reclaim the idle seats', body: 'Leavers and dormant accounts are the easiest saving you will make this quarter.' },
      { title: 'Plan from real numbers', body: 'Base your next renewal on what you use rather than what you bought.' },
    ],
    tip: 'Do this the same week you process leavers. It takes two minutes then and an afternoon six months later.',
    ctaLabel: 'Review your licences',
    ctaHref:  '/licences',
  },
]

/** Draft emails that apply to a given plan, cheapest plan that owns them first. */
export function draftsFor(plan: PlanKey): OnboardingEmail[] {
  if (plan === 'starter') return DRAFTS_CORE
  if (plan === 'professional') return [...DRAFTS_CORE, ...DRAFTS_PRO]
  return [...DRAFTS_CORE, ...DRAFTS_PRO, ...DRAFTS_ENTERPRISE]
}
