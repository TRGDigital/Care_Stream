// The Free account sequence. Every email is a DRAFT: seeded inactive, previewable and test
// sendable on the email marketing page, and never sent until Len publishes it there.
//
// Gated on what the person has actually done (predicates in conditions.ts), so nobody is told to
// run their first audit after they have run three. House style as in content.ts: no dashes,
// benefit first, no claim the product cannot back up. Subjects are unique across the whole table
// because an email's identity is its subject (seed.ts).
//
// Consent: emails 1 to 3 are instructional. 4 to 6 respond to usage. 7, 9 and 10 promote the paid
// plans and are the ones to clear for PECR before publishing (docs/free-tier/DESIGN.md section 9).

import type { CampaignEmail } from './campaigns'

export const FREE_PLAN_EMAILS: CampaignEmail[] = [
  {
    draft: true,
    subject: 'Your free CareStream account is ready',
    preheader: 'Every audit is unlocked. Here is the quickest way to start.',
    headline: 'You can run your first audit today',
    intro: [
      'Thanks for signing up. Your free account includes every CareStream audit, with no card and no time limit.',
      'You can also check your first five policies against the CQC regulations. Both work straight away.',
    ],
    steps: [
      { title: 'Pick an audit', body: 'Open Audits and choose any template, from daily checks to monthly governance audits.' },
      { title: 'Answer the questions', body: 'Work through it on a phone or computer, add photos as evidence, and sign at the end.' },
      { title: 'Download the report', body: 'You get a PDF you can put in your CQC evidence folder.' },
    ],
    tip: 'Start with one audit your home already does on paper. It is the fastest way to see what you gain.',
    ctaLabel: 'Open your audits',
    ctaHref: '/audits',
  },
  {
    draft: true,
    condition: 'free_no_audit_completed', conditionUnmet: 'skip',
    subject: 'Your first audit takes about fifteen minutes',
    preheader: 'A short walk through, from choosing a template to the signed report.',
    headline: 'Your first audit, step by step',
    intro: [
      'Most homes start with an audit they already know, so the questions feel familiar.',
      'Here is how it works from start to finish.',
    ],
    steps: [
      { title: 'Choose the audit and the month', body: 'Resident or room based audits ask who or which room it is for.' },
      { title: 'Answer each question', body: 'Yes, No or Not applicable. If the answer is No, say whether it is correct for this home or a gap, and add what you found.' },
      { title: 'Add a summary and sign', body: 'Note strengths, areas to improve and a date for the actions.' },
      { title: 'Complete the audit', body: 'Your report is saved, and you can turn the gaps into an action plan.' },
    ],
    tip: 'Staff can do audits from the hub on their phone. Open Staff, choose a person and tick which audits they can carry out.',
    ctaLabel: 'Start an audit',
    ctaHref: '/audits',
  },
  {
    draft: true,
    condition: 'free_no_policy_added', conditionUnmet: 'skip',
    subject: 'See which regulations your policies cover',
    preheader: 'Add up to five policies and get a coverage check in a few minutes.',
    headline: 'Check your policies against the regulations',
    intro: [
      'Gap analysis reads inside your policies and tells you which CQC regulations they cover, where they are thin and what is out of date.',
      'Your free account covers your first five policies in total, so choose the ones that matter most.',
    ],
    steps: [
      { title: 'Add your policies', body: 'Upload up to five as PDF or Word files from the Policies page.' },
      { title: 'Run the analysis', body: 'Open Policy gap analysis and start with regulation coverage. It runs in batches and you can watch the progress.' },
      { title: 'Read the results', body: 'Each regulation is covered, partly covered or a gap, with the reason in plain English.' },
    ],
    tip: 'Pick policies that inspectors ask about most, such as safeguarding, medication and infection control. The five you add are the five you get, so choose with care.',
    ctaLabel: 'Add a policy',
    ctaHref: '/policies',
  },
  {
    draft: true,
    condition: 'free_slots_partial', conditionUnmet: 'wait', holdMaxDays: 14,
    subject: 'You have started your five free policy checks',
    preheader: 'Here is what you have used and what is still available.',
    headline: 'Policies checked so far',
    intro: [
      'You have added some of your five free policies. Each one is read by every section of the analysis: coverage, out of date content, consistency and CQC wording.',
      'Your allowance is five policies in total, for as long as the account lasts.',
    ],
    steps: [
      { title: 'Look at the out of date section', body: 'It flags superseded law and placeholders.' },
      { title: 'Check consistency', body: 'If two policies give different timescales, you will see it.' },
      { title: 'Use the wording check', body: 'It shows where a policy could read as more person centred for CQC.' },
    ],
    tip: 'Deleting a policy does not give the place back, so replace a file by uploading a new version of the same policy instead.',
    ctaLabel: 'Open gap analysis',
    ctaHref: '/gaps',
  },
  {
    draft: true,
    condition: 'free_slots_one_left', conditionUnmet: 'wait', holdMaxDays: 14,
    subject: 'One free policy check left',
    preheader: 'Make the last one count.',
    headline: 'One policy still to add',
    intro: [
      'You have used four of your five free policy checks.',
      'If you have a policy you are worried about, this is the one to add. If you need more than five, a paid plan removes the limit and keeps everything you have done.',
    ],
    steps: [
      { title: 'Choose your most important remaining policy', body: 'Think about what an inspector is most likely to ask for.' },
      { title: 'Upload it and run the sections you have not run yet', body: 'The results appear alongside the others.' },
      { title: 'Compare plans if you want to carry on beyond five', body: 'Starter, Professional and Enterprise all lift the limit.' },
    ],
    tip: 'Moving up a plan takes a minute and nothing you have done is lost.',
    ctaLabel: 'Add your last policy',
    ctaHref: '/policies',
  },
  {
    draft: true,
    condition: 'free_slots_exhausted', conditionUnmet: 'wait', holdMaxDays: 14,
    subject: 'You have used your five free policy checks',
    preheader: 'Your results stay. Here is how to carry on.',
    headline: 'Your free policy checks are complete',
    intro: [
      'Well done, all five policies have been checked. Your results stay in your account and you can keep re-running the analysis on those five whenever a policy changes.',
      'To add more policies you will need a paid plan.',
    ],
    steps: [
      { title: 'Review your gaps', body: 'Start with the regulations marked as a gap and the policies with the most out of date findings.' },
      { title: 'See what comes with a paid plan', body: 'Unlimited policies, what to add with example wording, and adopting a fix into your policy with approvals.' },
      { title: 'Choose Starter, Professional or Enterprise', body: 'You keep all your data.' },
    ],
    tip: 'Upgrading is charged straight away, and everything you have done carries over.',
    ctaLabel: 'See plans',
    ctaHref: '/billing',
  },
  {
    draft: true,
    condition: 'free_audit_completed', conditionUnmet: 'skip',
    subject: 'What you get when an audit ends with recommendations',
    preheader: 'A sample, so you can judge whether it is worth it.',
    headline: 'From findings to a ranked action list',
    intro: [
      'Your free audits give you the answers, the evidence and the report. On a paid plan the end of every audit also gives you written recommendations.',
      'They are based on your own answers, linked to the CQC quality statements, and ordered by risk. You can turn them into an action plan in one click. [SAMPLE TO BE ADDED: an anonymised real example]',
    ],
    steps: [
      { title: 'Immediate actions', body: 'The things to fix this week, with the evidence that prompted them.' },
      { title: 'Patterns', body: 'Where the same weakness appears across sections.' },
      { title: 'CQC notes', body: 'Which quality statements the findings touch.' },
    ],
    tip: 'Your completed free audits are kept, so when you upgrade you can add recommendations to them too.',
    ctaLabel: 'See plans',
    ctaHref: '/billing',
  },
  {
    draft: true,
    subject: 'Turn your audits into inspection evidence',
    preheader: 'Three habits that make an inspection easier.',
    headline: 'Audits that stand up on inspection day',
    intro: [
      'Inspectors look for audits that happen regularly, find real problems and lead to action.',
      'A few habits make yours easy to show.',
    ],
    steps: [
      { title: 'Set the dates', body: 'Schedule recurring audits so the pattern is visible.' },
      { title: 'Close the loop', body: 'Turn every gap into an action with an owner and a date, then record the evidence when it is done.' },
      { title: 'Keep the reports together', body: 'Download the signed PDFs into one folder or share them with your registered manager.' },
    ],
    tip: 'Ask your care manager to approve completed audits in the hub. The sign off is recorded in the report.',
    ctaLabel: 'Open your audits',
    ctaHref: '/audits',
  },
  {
    draft: true,
    condition: 'free_no_staff_invited', conditionUnmet: 'skip',
    subject: 'Share the audits with your team',
    preheader: 'There is no limit on staff logins.',
    headline: 'Let your team carry out audits',
    intro: [
      'You can add as many staff as you like on the free plan.',
      'Give a team leader or deputy access to just the audits they run, and they can complete them from their phone.',
    ],
    steps: [
      { title: 'Add the person', body: 'Their name and email is all it takes.' },
      { title: 'Choose which audits they can carry out', body: 'They only see the ones you allocate.' },
      { title: 'Send them a sign in link', body: 'They open it on their phone, with no password to remember.' },
    ],
    tip: 'Allocate the daily and weekly checks to the people who already do them on paper.',
    ctaLabel: 'Add staff',
    ctaHref: '/staff',
  },
  {
    draft: true,
    condition: 'free_not_upgraded', conditionUnmet: 'skip',
    subject: 'How other homes use CareStream after the free plan',
    preheader: 'What changes when audits end with recommendations and policies have no limit.',
    headline: 'When free is not enough',
    intro: [
      'The free plan is built to show you the value. Homes usually move to a paid plan when they want recommendations at the end of every audit, to check more than five policies, or to put their staff on a shared hub with training. [CASE STUDY TO BE ADDED]',
    ],
    steps: [
      { title: 'Compare the plans', body: 'Starter, Professional and Enterprise are side by side on the pricing page.' },
      { title: 'Upgrade from your account', body: 'It is charged straight away and takes a minute.' },
      { title: 'Keep what you have done', body: 'Your audits, reports and gap results carry straight over.' },
    ],
    tip: 'Annual billing saves two months.',
    ctaLabel: 'Compare plans',
    ctaHref: '/billing',
  },
]
