// Product campaigns: the two sequences for people who buy training licences or
// a written policy WITHOUT taking a CareStream plan.
//
// These are not the plan drip. The buyer has no manager onboarding, often no
// staff in the system, and a single transaction behind them. Each email is
// gated on what the buyer has actually done, because the useful thing to say on
// day 4 depends entirely on whether they allocated the licence on day 1.
//
// Seeded as drafts like everything else: nothing sends until it is published.
// House style, as in content.ts: no dashes, benefit first, no claim the product
// cannot back up.

import type { OnboardingEmail } from './content'

export type CampaignKey = 'training_shop' | 'policy_shop'

export interface CampaignEmail extends OnboardingEmail {
  /** Predicate from conditions.ts, checked when this email is due. */
  condition?: string
  /** What to do when the condition is false. skip: never send it. wait: hold
   *  the sequence here until it is true, up to holdMaxDays. */
  conditionUnmet?: 'skip' | 'wait'
  holdMaxDays?: number
}

export interface Campaign {
  key:    CampaignKey
  label:  string
  blurb:  string
  emails: CampaignEmail[]
}

// ─── Training shop ────────────────────────────────────────────────────────────

const TRAINING: CampaignEmail[] = [
  {
    draft: true,
    condition: 'licence_unallocated', conditionUnmet: 'skip',
    subject:   'Your licence is waiting for a name',
    preheader: 'One step turns a purchase into training somebody is doing.',
    headline:  'Nobody is booked onto it yet',
    intro: [
      'You bought a training licence, which is the hard part done. It is sitting unallocated, which means nobody can start it yet.',
      'Allocating takes about thirty seconds. One licence covers one module for one member of staff, and they get an email the moment you assign it.',
    ],
    steps: [
      { title: 'Open your staff list', body: 'Add the person if they are not there yet. Name and email is all it takes.' },
      { title: 'Allocate the licence', body: 'Choose the module you bought and the person doing it.' },
      { title: 'They take it from there', body: 'They get a link, complete it on any phone or computer, and you see the result.' },
    ],
    tip: 'If you bought it to try the platform rather than for a particular person, allocate it to yourself. Seeing what your staff see is the fastest way to judge it.',
    ctaLabel: 'Allocate your licence',
    ctaHref:  '/staff',
  },
  {
    draft: true,
    subject:   'What your carer actually sees',
    preheader: 'A look at the course from the other side.',
    headline:  'Thirty five minutes, on the phone in their pocket',
    intro: [
      'You have bought it. It is worth knowing exactly what lands with the person doing it, because that is what decides whether they finish.',
      'They get a short lesson broken into sections, a workplace scenario where they choose what they would do, a quick check after each part, and a final assessment. It runs in the browser on any phone, with no app to install.',
    ],
    steps: [
      { title: 'They open the link', body: 'Straight into the lesson, no setup.' },
      { title: 'They work at their own pace', body: 'Progress saves, so an interrupted shift does not cost them the module.' },
      { title: 'They sit the assessment', body: 'Pass and the certificate is issued to their record, with CPD hours stated.' },
    ],
    tip: 'Take it yourself before you assign it to your team. Ten minutes will tell you more than any sales page.',
    ctaLabel: 'See your training',
    ctaHref:  '/training',
  },
  {
    draft: true,
    condition: 'training_not_started', conditionUnmet: 'skip',
    subject:   'Still not started',
    preheader: 'A nudge, and the two reasons it usually stalls.',
    headline:  'Allocated, but nobody has opened it',
    intro: [
      'The licence is assigned and the module has not been started. In our experience that is almost always one of two things: the email went to a personal address they rarely check, or they are waiting to be told it is a priority.',
      'Both are fixed in a minute. Say something at handover, and check the address you used is one they actually read.',
    ],
    steps: [
      { title: 'Check the email address', body: 'Open your staff list and confirm it is one they use.' },
      { title: 'Mention it in person', body: 'Training that arrives by email alone gets treated as optional.' },
      { title: 'Watch it move', body: 'You will see the status change as soon as they start.' },
    ],
    tip: 'Give them a deadline. "By Friday" finishes far more modules than "when you get a chance".',
    ctaLabel: 'Check your staff list',
    ctaHref:  '/staff',
  },
  {
    draft: true,
    condition: 'training_completed', conditionUnmet: 'wait', holdMaxDays: 21,
    subject:   'That is one carer trained, and evidenced',
    preheader: 'The certificate, the score and the learning gain are on their record.',
    headline:  'What you now hold',
    intro: [
      'Somebody has finished. Beyond the certificate, you now have the things an inspector actually asks for: what they scored, how long they spent, and what they knew before against what they knew after.',
      'That last one is worth understanding. The pre-course check means you can show the training taught something, rather than that a confident member of staff passed a quiz.',
    ],
    steps: [
      { title: 'Open their record', body: 'Certificate, score, time spent and CPD hours, all in one place.' },
      { title: 'Download the certificate', body: 'Yours to keep, print or attach to a supervision record.' },
      { title: 'Look at the learning gain', body: 'The before and after comparison is the part most training providers cannot show you.' },
    ],
    tip: 'Save the certificate now rather than at inspection. Two minutes today beats an hour in a panic.',
    ctaLabel: 'See the record',
    ctaHref:  '/staff',
  },
  {
    draft: true,
    subject:   'Train the rest of the team',
    preheader: 'What it takes to move from one carer to all of them.',
    headline:  'One was the test. The team is the point.',
    intro: [
      'Training one person proves the course works. It does not move your compliance position, which is measured across everyone who does the job.',
      'Buying for the team is the same process repeated, and the record builds into something you can show: who is trained, on what, when it expires, and who is overdue.',
    ],
    steps: [
      { title: 'Add the rest of your staff', body: 'One at a time, or import a list if there are more than a handful.' },
      { title: 'Buy the licences you need', body: 'One licence per module per person, and they last a year.' },
      { title: 'Allocate and watch it fill in', body: 'Your compliance view shows the gaps closing.' },
    ],
    tip: 'Start with the training that expires soonest across your team. That is where an inspection would find you first.',
    ctaLabel: 'Browse the courses',
    ctaHref:  '/training',
  },
  {
    draft: true,
    condition: 'no_plan_yet', conditionUnmet: 'skip',
    subject:   'Where buying by the licence stops making sense',
    preheader: 'An honest comparison, including when it does not.',
    headline:  'The maths, and the things licences cannot do',
    intro: [
      'Licences are the right answer for a handful of people and a few modules. Past that the sums change, and there are things a licence cannot give you at any volume.',
      'A licence trains one person on one module. It does not answer your staff questions from your own policies, tell you which policies are out of date, find the ones you are missing, or produce inspection evidence across your whole service. Those come with the platform rather than the course.',
    ],
    steps: [
      { title: 'Count what you are buying', body: 'Your staff, times the modules each needs, times a year.' },
      { title: 'Compare it with a plan', body: 'Plans include training allocations every month, and everything else alongside them.' },
      { title: 'Ask for a walk-through', body: 'Fifteen minutes on your own service is worth more than any comparison table.' },
    ],
    tip: 'If you are buying more than about ten licences a year, it is worth a conversation. Below that, licences are genuinely the cheaper option and we will say so.',
    ctaLabel: 'See what a plan includes',
    ctaHref:  '/pricing',
  },
]

// ─── Policy shop ──────────────────────────────────────────────────────────────

const POLICY: CampaignEmail[] = [
  {
    draft: true,
    condition: 'policy_intake_outstanding', conditionUnmet: 'skip',
    subject:   'We cannot start writing until you answer these',
    preheader: 'A few questions about your service, and then it is over to us.',
    headline:  'Your policy is waiting on you',
    intro: [
      'Your order is paid and we are ready to write. The one thing we cannot do without you is the detail that makes it your policy rather than a template: who your named leads are, how your service is set up, the things only you know.',
      'It is a short set of questions and it is the whole difference between a document with your name on the front and a document that describes how you actually work.',
    ],
    steps: [
      { title: 'Open your order', body: 'The questions are waiting there, with an explanation of why each one is asked.' },
      { title: 'Answer in your own words', body: 'Short answers are fine. We are after the facts, not prose.' },
      { title: 'Submit and leave it with us', body: 'Writing starts as soon as you are done.' },
    ],
    tip: 'Answers you give once are reused on any future policy, so this is a one-off for the details that never change.',
    ctaLabel: 'Complete your answers',
    ctaHref:  '/policies',
  },
  {
    draft: true,
    condition: 'policy_intake_outstanding', conditionUnmet: 'skip',
    subject:   'Your policy is still on hold',
    preheader: 'Ten minutes of answers is all that stands in the way.',
    headline:  'Nothing has moved since you paid',
    intro: [
      'We have not forgotten your order. We are holding it because the intake questions are still unanswered, and writing a policy about your service without them would produce exactly the generic document you were trying to avoid.',
      'If something in the questions is unclear, reply to this email and a person will answer.',
    ],
    steps: [
      { title: 'Open the questions', body: 'Most people finish them in under ten minutes.' },
      { title: 'Ask us if you are unsure', body: 'Reply to this email. It reaches a person, not a queue.' },
      { title: 'We take it from there', body: 'Written, checked against the law, and read by a person before it reaches you.' },
    ],
    ctaLabel: 'Finish your answers',
    ctaHref:  '/policies',
  },
  {
    draft: true,
    condition: 'policy_drafted', conditionUnmet: 'wait', holdMaxDays: 21,
    subject:   'How your policy was written and checked',
    preheader: 'Verified against the legislation, and challenged before it reached you.',
    headline:  'What happened between your order and your document',
    intro: [
      'Your policy has been written. Before it reached you it went through two checks that are worth knowing about, because they are the reason this is not a template with your name dropped in.',
      'First, a verification gate: the document is checked against the legislation the policy exists to satisfy, point by point. Second, an independent challenge on what a policy of this kind should cover, so that gaps are found by us rather than by an inspector.',
    ],
    steps: [
      { title: 'Read it properly', body: 'It is your document and your name is on it. Read it as if you wrote it, because in the eyes of a regulator you did.' },
      { title: 'Change anything that is not right', body: 'You know your service better than any checklist does.' },
      { title: 'Approve it', body: 'Approving puts it in your library and makes it the live version.' },
    ],
    tip: 'Read it with the person who will have to follow it. They will spot the line that does not match how the shift actually runs.',
    ctaLabel: 'Read your policy',
    ctaHref:  '/policies',
  },
  {
    draft: true,
    condition: 'policy_approved', conditionUnmet: 'wait', holdMaxDays: 21,
    subject:   'A policy nobody has read changes nothing',
    preheader: 'The part after approval that most services skip.',
    headline:  'Getting it off the shelf',
    intro: [
      'Your policy is approved and in your library. That satisfies the paperwork and, on its own, changes nothing about what happens on shift.',
      'The services that get value from a policy do three things with it, none of which take long.',
    ],
    steps: [
      { title: 'Tell your team it exists', body: 'Name it at handover. A policy staff have never heard of is a document, not a practice.' },
      { title: 'Point to the part that changes something', body: 'There is usually one paragraph that alters what somebody does. Read that one out.' },
      { title: 'Put a review date on it', body: 'A policy with no review date is out of date the moment the law moves.' },
    ],
    tip: 'Keep the record of when you introduced it. Inspectors ask how staff were made aware, not just whether the document exists.',
    ctaLabel: 'Open your library',
    ctaHref:  '/policies',
  },
  {
    draft: true,
    condition: 'policy_single_purchase', conditionUnmet: 'skip',
    subject:   'The policies the law says you should have',
    preheader: 'We checked your service against the regulations. Here is what is missing.',
    headline:  'One down. Here is what else is required.',
    intro: [
      'You bought one policy, which suggests you know there are others. We can tell you precisely which, because we check your library against the regulations that apply to a service like yours.',
      'This is not a list of nice-to-haves. Each one names the regulation that requires it, and each is a document you do not currently hold.',
    ],
    steps: [
      { title: 'Open your gap list', body: 'Every policy required by law that you have nothing for, with the regulation beside it.' },
      { title: 'Start with the legal duties', body: 'Some gaps are good practice. Others are a legal requirement with your registration attached.' },
      { title: 'Order what you need', body: 'Each is written for your service and checked the same way as the one you have.' },
    ],
    tip: 'Missing is worse than out of date. An old policy can be updated in an afternoon; an absent one is a finding.',
    ctaLabel: 'See what you are missing',
    ctaHref:  '/gaps',
  },
  {
    draft: true,
    subject:   'Policies go out of date quietly',
    preheader: 'Nothing tells you when the law behind your policy moves.',
    headline:  'The document does not know the law changed',
    intro: [
      'The policy you bought is current today. It will not stay current on its own. Guidance gets revised, an Act is amended, a framework is replaced, and nothing in your folder tells you which of your documents just went out of date.',
      'That is how services end up citing the Mental Health Act 2007 as the current Act, or referring to CQC key lines of enquiry three years after they were replaced. Nobody was careless. Nothing told them.',
    ],
    steps: [
      { title: 'Diarise a review', body: 'At minimum, an annual read of every policy you hold.' },
      { title: 'Watch the big ones', body: 'Safeguarding, mental capacity, infection control and health and safety move most often.' },
      { title: 'Check the wording, not just the date', body: 'A policy reviewed last month can still name a framework that no longer exists.' },
    ],
    tip: 'If you only check one thing, search your documents for KLOE. Its replacement has been in force since 2023 and it is still in most policy libraries.',
    ctaLabel: 'Read your policy',
    ctaHref:  '/policies',
  },
  {
    draft: true,
    condition: 'no_plan_yet', conditionUnmet: 'skip',
    subject:   'What a library that maintains itself looks like',
    preheader: 'Where buying policies one at a time stops being the cheaper option.',
    headline:  'The honest comparison',
    intro: [
      'Buying a policy at a time is the right call when you need two or three. If you are missing ten, the sums change, and there are things a purchased document cannot do however many you own.',
      'On a plan the library is yours in full, it is checked against legislation as that legislation moves, and your staff can ask questions of it and get answers drawn from your own policies rather than from the internet.',
    ],
    steps: [
      { title: 'Count your gaps', body: 'Your missing list already gives you the number.' },
      { title: 'Compare honestly', body: 'Ten policies bought singly against a plan that includes the library, the monitoring and the staff access.' },
      { title: 'Ask for a look at your own service', body: 'We will run your gap analysis with you and you can decide afterwards.' },
    ],
    tip: 'If you need two more policies, buy them. We will tell you when a plan is not worth it.',
    ctaLabel: 'See what a plan includes',
    ctaHref:  '/pricing',
  },
]

export const CAMPAIGNS: Record<CampaignKey, Campaign> = {
  training_shop: {
    key: 'training_shop',
    label: 'Training buyer',
    blurb: 'For someone who bought training licences without a CareStream plan. Gated on whether the licence was allocated and whether anyone finished.',
    emails: TRAINING,
  },
  policy_shop: {
    key: 'policy_shop',
    label: 'Policy buyer',
    blurb: 'For someone who bought a written policy without a CareStream plan. Follows the order from paid through intake, drafting and approval.',
    emails: POLICY,
  },
}

export const CAMPAIGN_ORDER: CampaignKey[] = ['training_shop', 'policy_shop']
