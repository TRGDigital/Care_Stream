// The four CQC Well-led statement pages, one template (components/marketing/well-led-page.tsx, built on the scenario page layout).
// Wording rule: evidence FOR Well-led. Never "CQC compliant", never a promise about a rating. No dashes in the copy (site rule).
// Text fields may contain <a href>, <em> and <b> only.

import type { WellLedTopic } from './well-led'

export type WLPage = {
  slug: 'governance' | 'learning' | 'inclusion' | 'direction'
  topic: WellLedTopic
  /** The statement's name on CQC's site. */
  cqcName: string
  cqcUrl: string
  meta_title: string
  meta_description: string
  title: string
  lede: string
  image: string
  image_alt: string
  panel: { title: string; rows: Array<{ label: string; note: string; done: boolean }>; meter: number }
  intro: { heading: string; sub: string; paragraph: string }
  looksFor: Array<{ title: string; body: string }>
  evidence: Array<string>
  helps: Array<{ id: string; text: string }>
  limits: Array<{ title: string; body: string }>
  faqs: Array<{ q: string; a: string }>
}

const IMG = 'https://api.carestreamai.com/public/policy-shop/image/'

export const WL_PAGES: WLPage[] = [
  {
    slug: 'governance', topic: 'gov',
    cqcName: 'Governance, management and sustainability',
    cqcUrl: 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/governance-management-sustainability',
    meta_title: 'CQC Governance: Show How Your Service Is Run | CareStreamAI',
    meta_description: 'CQC governance explained for care providers: what inspectors look for, the evidence to show, and how CareStream helps you build it.',
    title: 'CQC governance: show inspectors how the service is <em>run, not just written down</em>',
    lede: 'Under CQC\'s Well-led key question, governance means clear roles, systems that manage risk and performance, and records leaders use to improve care. CareStream keeps your policies, the people named in them and the training behind them in one place, so you can show how you know. Read <a href="https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/governance-management-sustainability" target="_blank" rel="noopener noreferrer">CQC\'s wording</a>.',
    image: IMG + 'a8414928-6fd8-4ba4-b889-0e5b7fa30290.webp',
    image_alt: 'A registered manager at a desk talking with a visitor, a shelf of ring binders behind them, both looking thoughtful.',
    panel: { title: 'Governance evidence', meter: 80, rows: [
      { label: 'Policies with a named owner', note: 'All 42', done: true },
      { label: 'Staff trained on each policy', note: '38 of 41', done: true },
      { label: 'Regulation changes reviewed', note: 'Up to date', done: true },
      { label: 'Audit actions closed', note: '2 still open', done: false },
    ] },
    intro: {
      heading: 'Inspectors ask how you know, not just what you have',
      sub: 'What the quality statement asks of leaders.',
      paragraph: 'A folder of policies shows what you intended. Governance shows what happens. When an inspector asks how you know staff follow a policy, they want to hear who owns it, who has opened it, who has been trained on it, and what you did when the rules changed. CQC\'s statement asks for clear roles and accountability, systems that manage performance and risk, secure and reliable records, and action on legal and regulatory requirements. The answers sit in records, not in memory.',
    },
    looksFor: [
      { title: 'Clear accountability', body: 'Leaders and staff understand their roles, and managers can account for what their teams do.' },
      { title: 'Risk and performance managed', body: 'Systems manage current and future performance and risk in a proportionate way.' },
      { title: 'Reliable records', body: 'Records and data are secure, and leaders use them to improve the quality of care.' },
      { title: 'Rules understood and acted on', body: 'Legal and regulatory requirements, and external recommendations such as safety alerts, are acted on.' },
    ],
    evidence: [
      'A policy library where every policy has a named owner and a review date.',
      'A record of who has opened each policy and who has been trained on it.',
      'A training matrix by role showing what is complete and what is due.',
      'A record of regulation changes and what you did about them.',
      'Audit results, and who was responsible for each action.',
    ],
    helps: [
      { id: 'roles',       text: 'Policies show the real name of your safeguarding lead, registered manager and other role holders, and follow the change when you change who holds a role.' },
      { id: 'coverage',    text: 'Your policies are checked against the regulations they should cover.' },
      { id: 'gap',         text: 'Gaps are listed with suggested wording that you review and approve.' },
      { id: 'consistency', text: 'Policies that say different things are found before an inspector finds them.' },
      { id: 'alerts',      text: 'CareStream watches the official sources behind the regulations your policies rely on, and flags changes for review.' },
      { id: 'approval',    text: 'Approval steps are recorded, so you can show who approved what, and when.' },
      { id: 'matrix',      text: 'See who is trained on what, by role.' },
      { id: 'report',      text: 'Produce an inspection evidence report you can download and take in.' },
    ],
    limits: [
      { title: 'It does not run your governance', body: 'CareStream gives you the records to show how the service runs. The decisions stay with your leaders.' },
      { title: 'It does not give a rating', body: 'Only CQC rates a service. CareStream keeps the evidence, and the judgement is always the inspector\'s.' },
      { title: 'Some products are on paid plans', body: 'The policy approval trail and the inspection evidence report are on Professional and above. See pricing for what each plan includes.' },
    ],
    faqs: [
      { q: 'What does CQC mean by governance?', a: 'In the Well-led key question, governance covers clear roles and accountability, systems that manage risk and performance, secure and reliable records, and acting on legal and regulatory requirements. CQC sets this out in its governance, management and sustainability quality statement.' },
      { q: 'How do I show staff follow our policies?', a: 'Keep a record of who owns each policy, who has opened it and who has been trained on it, and check the wording against the regulations. CareStream keeps these in one place. It shows that policies are in use, not that every person follows them every time.' },
      { q: 'How does this relate to Regulation 17?', a: 'Regulation 17 is the regulation on good governance, and it covers similar ground. Read it on <a href="https://www.legislation.gov.uk/uksi/2014/2936/regulation/17" target="_blank" rel="noopener noreferrer">legislation.gov.uk</a> for the exact requirements.' },
    ],
  },
  {
    slug: 'learning', topic: 'learn',
    cqcName: 'Learning, improvement and innovation',
    cqcUrl: 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/learning-improvement-innovation',
    meta_title: 'CQC Improvement Evidence: Show What Changed | CareStreamAI',
    meta_description: 'CQC learning and improvement for care providers: what inspectors look for, the audit and action trail to show, and how CareStream helps.',
    title: 'CQC improvement evidence: show what changed after the audit, and whether it <em>worked</em>',
    lede: 'CQC\'s Well-led key question looks for learning that leads to improvement, with the outcome measured. CareStream keeps the audit, the action, the follow up and the re-check together, so you can show the trail over months. Read <a href="https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/learning-improvement-innovation" target="_blank" rel="noopener noreferrer">CQC\'s wording</a>.',
    image: IMG + '1fdcc049-32aa-4759-80eb-5f5aadcdb9a0.webp',
    image_alt: 'A care home manager and a carer by a notice board in a bright corridor, the carer pointing at a note while the manager listens and smiles.',
    panel: { title: 'Improvement trail', meter: 66, rows: [
      { label: 'Baseline audit recorded', note: 'March', done: true },
      { label: 'Action agreed, owner named', note: 'April', done: true },
      { label: 'Follow up training completed', note: 'May', done: true },
      { label: 'Re-check shows the change', note: 'Due', done: false },
    ] },
    intro: {
      heading: 'Improvement is a trail, not a single audit',
      sub: 'What the quality statement asks of leaders.',
      paragraph: 'Most services find problems and agree actions. The harder question comes later: what changed, and did it work? CQC\'s statement on learning, improvement and innovation asks that staff and leaders know how to make improvement happen, that outcomes are measured, that learning follows when things go wrong, and that staff are encouraged to speak up with ideas. A trail with dates, owners and re-checks answers that better than a single report.',
    },
    looksFor: [
      { title: 'Improvement that happens', body: 'Staff and leaders understand how to make improvement happen, and the approach is consistent.' },
      { title: 'Outcomes measured', body: 'The impact of change is measured, not assumed.' },
      { title: 'Learning from mistakes and good practice', body: 'Processes make sure learning happens when things go wrong, and from examples of good practice.' },
      { title: 'Staff ideas and skills', body: 'Staff are supported to develop their skills, and encouraged to speak up with ideas.' },
    ],
    evidence: [
      'Audit results over time, not just the latest one.',
      'Actions with an owner, a date and a re-check.',
      'Follow up after a training question was answered wrongly.',
      'The knowledge gaps you found, and how they closed.',
    ],
    helps: [
      { id: 'audits',    text: 'Over 100 audits are free on every plan. Actions can carry photos and are re-checked at the next audit, and a weak result can lead to training.' },
      { id: 'training',  text: 'Short training is built from your own policies. A wrong answer becomes a short follow up lesson and a fresh question.' },
      { id: 'analytics', text: 'See the most missed questions, the weakest topics, and how gaps are closing.' },
      { id: 'knowledge', text: 'Staff ask questions that are answered from your own documents, and managers can see what staff are asking, which shows where a policy is unclear.' },
      { id: 'cpd',       text: 'CPD certified courses are free on every plan.' },
    ],
    limits: [
      { title: 'It does not decide what to improve', body: 'CareStream shows the trail. Your leaders decide the changes.' },
      { title: 'A staff idea needs a manager', body: 'There is no suggestion box. An idea enters the trail when a manager adds it as an action, with that person as the owner.' },
      { title: 'It does not give a rating', body: 'Only CQC rates a service. CareStream keeps the evidence, and the judgement is always the inspector\'s.' },
    ],
    faqs: [
      { q: 'How do we show learning from audits?', a: 'Keep the audit result, the action, who owned it, the follow up and the re-check, so you can show what changed and whether it worked. A trail over several months is stronger than a single audit.' },
      { q: 'What makes a good action plan?', a: 'An action has an owner, a date, a clear description of the change and a re-check to see whether it worked. A short action with a re-check is stronger than a long list with no follow up.' },
      { q: 'Are the audits free?', a: 'Over 100 audits are free on every plan, including the free plan. Building your own audit is on the Enterprise plan.' },
    ],
  },
  {
    slug: 'inclusion', topic: 'edi',
    cqcName: 'Workforce equality, diversity and inclusion',
    cqcUrl: 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/workforce-equality-diversity-inclusion',
    meta_title: 'CQC Workforce Inclusion: Evidence for Well-led | CareStreamAI',
    meta_description: 'CQC workforce equality, diversity and inclusion for care providers: what inspectors look for, and how CareStream helps every member of staff learn.',
    title: 'CQC workforce inclusion: show every member of staff <em>understood their training</em>',
    lede: 'CQC\'s Well-led key question asks leaders to hear every voice and remove barriers for staff. A green training matrix does not show that everyone understood it. CareStream offers training in a person\'s own language on paid plans, and shows where language may be holding learning back. Read <a href="https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/workforce-equality-diversity-inclusion" target="_blank" rel="noopener noreferrer">CQC\'s wording</a>.',
    image: IMG + '0490de6c-4250-46a4-a903-ba49d9464af9.webp',
    image_alt: 'A manager and a carer sit side by side in a bright staff room, looking together at a notebook, a mug and a window behind them.',
    panel: { title: 'Training understood', meter: 72, rows: [
      { label: 'Training in the person\'s language', note: 'Available', done: true },
      { label: 'Questions answered in the Staff Hub', note: 'Every worker', done: true },
      { label: 'Translation suggestions approved', note: 'Admin', done: true },
      { label: 'Language gaps reviewed with staff', note: 'To do', done: false },
    ] },
    intro: {
      heading: 'A pass mark is not the same as understanding',
      sub: 'What the quality statement asks of leaders.',
      paragraph: 'CQC\'s statement asks leaders to review and improve culture in the context of equality, diversity and inclusion, to act where some staff have a worse experience, and to hear the voices of the people least heard. Reasonable adjustments in the statement are about disabled staff. Language support is a different, practical way to act on hearing every voice: staff learn better in the language they think in, and a manager can see where learning may be getting lost.',
    },
    looksFor: [
      { title: 'Culture reviewed', body: 'Leaders review and improve culture in the context of equality, diversity and inclusion.' },
      { title: 'Action on disparity', body: 'Leaders act where some staff have a worse experience than others.' },
      { title: 'Reasonable adjustments', body: 'Disabled staff are supported to do their roles well.' },
      { title: 'Every voice heard', body: 'There are ways to hear the staff who are least heard, so they feel their concerns lead to change.' },
    ],
    evidence: [
      'What staff told you, and what you changed.',
      'Training that staff understood, whatever their first language.',
      'Adjustments you have made, and a record of them.',
    ],
    helps: [
      { id: 'language',  text: 'Staff can take training in their own language on paid plans. CareStream shows where answers suggest language may be getting in the way, so a manager can act.' },
      { id: 'training',  text: 'Staff can suggest a better translation, and an administrator approves it.' },
      { id: 'knowledge', text: 'Every member of staff can ask questions in the Staff Hub and get answers from your own policies.' },
      { id: 'cpd',       text: 'Free CPD certified courses for every member of staff, with certificates they keep.' },
      { id: 'matrix',    text: 'See who has finished what, so nobody is missed.' },
    ],
    limits: [
      { title: 'Machine translation', body: 'Translation is machine translation, accuracy is not tested for each language, and the Staff Hub menus stay in English.' },
      { title: 'Signals, not proof', body: 'What CareStream shows is a prompt for a manager to ask the person. It is not proof that someone did or did not understand.' },
      { title: 'Not a replacement for adjustments', body: 'Language support helps you act on hearing every voice. It does not replace reasonable adjustments for disabled staff.' },
    ],
    faqs: [
      { q: 'Does CQC require training in other languages?', a: 'The quality statement asks leaders to remove barriers and hear every voice. Training in a person\'s own language is one practical way to act on that. Read CQC\'s wording for the exact requirements.' },
      { q: 'How accurate is the translation?', a: 'It is machine translation and accuracy is not tested for each language. Staff can suggest a better translation, and an administrator approves it before it is used.' },
      { q: 'Can CareStream tell me who did not understand?', a: 'It shows signals, such as who switches to a second language and where answers go wrong. A signal is a prompt to talk to the person, not proof.' },
    ],
  },
  {
    slug: 'direction', topic: 'cult',
    cqcName: 'Shared direction and culture',
    cqcUrl: 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/shared-direction-culture',
    meta_title: 'CQC Culture and Shared Direction: Well-led | CareStreamAI',
    meta_description: 'CQC shared direction and culture for care providers: what inspectors look for, and how CareStream puts your own policies in every carer\'s hand.',
    title: 'CQC shared direction and culture: show staff <em>know what you are aiming for</em>',
    lede: 'CQC\'s Well-led key question looks for a vision and values that staff understand and share, with a positive culture of learning. CareStream puts your own policies, training and the named person for each role in every member of staff\'s hand. Read <a href="https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/shared-direction-culture" target="_blank" rel="noopener noreferrer">CQC\'s wording</a>.',
    image: IMG + '7d8f7358-029c-4b90-9d5c-03fae079a370.webp',
    image_alt: 'A small team gathers for a shift huddle around a noticeboard with three coloured cards pinned up, while the manager points to one and listens.',
    panel: { title: 'Shared direction', meter: 75, rows: [
      { label: 'Policies adopted in your own words', note: 'Approved', done: true },
      { label: 'Named person shown for each role', note: 'In every policy', done: true },
      { label: 'Short training for new starters', note: 'Built from your policies', done: true },
      { label: 'Staff can say what you aim for', note: 'Ask them', done: false },
    ] },
    intro: {
      heading: 'Direction is lived, not filed',
      sub: 'What the quality statement asks of leaders.',
      paragraph: 'A vision on the wall of the lobby is not the same as a vision staff can describe. CQC\'s statement on shared direction and culture looks for a shared vision, values and strategy that staff understand and share, and a positive culture of learning and improvement. The evidence is in daily practice: staff who know who to go to, policies written in your own words, and training that new starters actually take in.',
    },
    looksFor: [
      { title: 'A shared vision', body: 'Leaders and staff share a vision, values and direction that they understand.' },
      { title: 'A positive culture', body: 'There is a positive culture of learning and improvement.' },
      { title: 'Staff involved', body: 'Leaders involve staff and listen to them.' },
    ],
    evidence: [
      'Staff who can say what the service is aiming for.',
      'Policies and values that are used day to day, not filed.',
      'Induction and training that reflect them.',
    ],
    helps: [
      { id: 'knowledge', text: 'Your own policies are in every member of staff\'s hand, and they can ask questions about them at any hour.' },
      { id: 'roles',     text: 'The named person for each role is shown in the policy, so staff know who to go to.' },
      { id: 'approval',  text: 'Policies are adopted in your own words and approved by the people you choose.' },
      { id: 'training',  text: 'New starters get short training built from your own policies.' },
      { id: 'cpd',       text: 'Free CPD certified training builds the same standard across the team.' },
    ],
    limits: [
      { title: 'No vision or values feature', body: 'CareStream does not hold your vision or values. It puts your own policies and training in front of staff.' },
      { title: 'It cannot change a culture', body: 'Culture comes from leaders and teams. CareStream makes the way you work easy to follow and easy to evidence.' },
      { title: 'It does not give a rating', body: 'Only CQC rates a service. CareStream keeps the evidence, and the judgement is always the inspector\'s.' },
    ],
    faqs: [
      { q: 'Does CareStream hold our vision and values?', a: 'No. CareStream has no vision or values feature. It puts your own policies, training and named role holders in front of staff, so the way you work is easy to follow.' },
      { q: 'How do I know staff are using the policies?', a: 'Managers can see what staff ask the assistant, which shows where policies are unclear, and training follow ups show where understanding is missing.' },
      { q: 'Where do the named people come from?', a: 'Roles are set in Settings, either chosen from your staff or typed in. Policies show the name against each role and follow the change when it changes.' },
    ],
  },
]

export const wlPage = (slug: string) => WL_PAGES.find(p => p.slug === slug)
