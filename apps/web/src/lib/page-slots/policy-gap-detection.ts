import type { SlotDef } from './types'

// Editable copy for /policy-gap-detection. Defaults are the current live copy;
// editing a slot in the platform (Main site pages → /policy-gap-detection)
// overrides it without touching the design.
export const POLICY_GAP_DETECTION_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.badge', group: 'Hero', label: 'Plan badge', default: 'Professional & Enterprise' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Know exactly where your policies fall short. Then close the gap.' },
  { key: 'hero.intro', group: 'Hero', label: 'Intro paragraph', rich: true, default: 'CareStream reads inside your policies, tells you which regulations you cover and where the gaps are, checks the wording against the CQC Single Assessment Framework and suggests person-centred alternatives, shows what to add and why it is required, and tracks changes to the standards.' },
  { key: 'hero.cta.primary', group: 'Hero', label: 'Primary button', default: 'Start Free Trial' },
  { key: 'hero.cta.secondary', group: 'Hero', label: 'Secondary button', default: 'Book a Demo' },

  // The three checks (overview of what Policy Gap Detection runs)
  { key: 'checks.label', group: 'The three checks', label: 'Eyebrow', default: 'What we check for' },
  { key: 'checks.h2', group: 'The three checks', label: 'Heading', default: 'Three checks across your whole policy library.' },
  { key: 'checks.intro', group: 'The three checks', label: 'Intro paragraph', rich: true, default: 'Policy Gap Detection runs three different checks over everything you have uploaded. One finds what is missing, one finds what has gone out of date, and one finds where your policies disagree with each other. Together they turn a shelf of documents into a measured, defensible picture of where you stand.' },

  { key: 'check1.title', group: 'The three checks', label: 'Card 1 · Title', default: 'Regulation coverage' },
  { key: 'check1.body', group: 'The three checks', label: 'Card 1 · Body', multiline: true, default: 'We read the actual content of every policy, not just its title, and judge each regulation that applies to your service as covered, partly covered or a gap, mapped to the CQC Single Assessment Framework. You get a coverage score, and the policy that evidences each requirement is named for you.' },
  { key: 'check1.tag', group: 'The three checks', label: 'Card 1 · Tag', default: 'Covered · Partial · Gap' },

  { key: 'check2.title', group: 'The three checks', label: 'Card 2 · Title', default: 'Out-of-date content' },
  { key: 'check2.body', group: 'The three checks', label: 'Card 2 · Body', multiline: true, default: 'We scan your whole library for policies that have quietly gone stale: superseded law and regulators, retired frameworks like the CQC Key Lines of Enquiry, pandemic-era wording and unfilled template placeholders. It runs instantly and uses no AI credits, and every flag shows what changed, what it should say now, and a link to the source.' },
  { key: 'check2.tag', group: 'The three checks', label: 'Card 2 · Tag', default: 'Superseded law · Stale wording' },

  { key: 'check3.title', group: 'The three checks', label: 'Card 3 · Title', default: 'Cross-policy consistency' },
  { key: 'check3.body', group: 'The three checks', label: 'Card 3 · Body', multiline: true, default: 'We compare related and near-duplicate policies and surface where they contradict each other on the same point: conflicting timeframes, escalation routes, named roles or definitions, and drift between two versions of a policy that have slowly grown apart. You resolve the conflict yourself, before it turns up in an inspection.' },
  { key: 'check3.tag', group: 'The three checks', label: 'Card 3 · Tag', default: 'Contradictions · Drift' },

  // Steps
  { key: 'steps.label', group: 'How it works', label: 'Eyebrow', default: 'How it works' },
  { key: 'steps.h2', group: 'How it works', label: 'Heading', default: 'From “are we compliant?” to exactly what to do about it.' },
  { key: 'steps.intro', group: 'How it works', label: 'Intro paragraph', rich: true, default: 'Most homes assume coverage rather than verify it. This turns policy compliance from a guess into a measured, defensible, actionable picture — and keeps it current as the rules change.' },

  // Step 1
  { key: 'step1.label', group: 'Step 1 · Regulation coverage', label: 'Eyebrow', default: 'Regulation coverage' },
  { key: 'step1.title', group: 'Step 1 · Regulation coverage', label: 'Title', default: 'It reads inside your policies, not just the titles.' },
  { key: 'step1.body', group: 'Step 1 · Regulation coverage', label: 'Body', multiline: true, default: 'For every regulation that applies to your service, CareStream searches the actual content of your whole policy library and an AI auditor judges whether you substantively cover it: covered, partial, or a gap. A policy is only ever flagged when your documents genuinely do not address it, never because nothing happens to be named after it.' },
  { key: 'step1.point1', group: 'Step 1 · Regulation coverage', label: 'List item 1', default: 'A coverage score mapped to the CQC framework' },
  { key: 'step1.point2', group: 'Step 1 · Regulation coverage', label: 'List item 2', default: 'Covered, partial and gap verdicts with the evidencing policy named' },
  { key: 'step1.point3', group: 'Step 1 · Regulation coverage', label: 'List item 3', default: 'Checked against every uploaded policy, so nothing held elsewhere is missed' },

  // Step 2
  { key: 'step2.label', group: 'Step 2 · What to add', label: 'Eyebrow', default: 'What to add' },
  { key: 'step2.title', group: 'Step 2 · What to add', label: 'Title', default: 'Not just where you fall short — exactly what to add.' },
  { key: 'step2.body', group: 'Step 2 · What to add', label: 'Body', multiline: true, default: 'Drill into any partial or gap and CareStream shows the specific requirements you are missing, with example wording you can adapt, verified against your whole library first so it never tells you to add something you already hold in another policy.' },
  { key: 'step2.point1', group: 'Step 2 · What to add', label: 'List item 1', default: 'Requirement-by-requirement checklist per regulation' },
  { key: 'step2.point2', group: 'Step 2 · What to add', label: 'List item 2', default: 'Example wording to review, adapt and approve' },
  { key: 'step2.point3', group: 'Step 2 · What to add', label: 'List item 3', default: 'Highlights exactly where an existing policy already covers part of it' },

  // Step 3
  { key: 'step3.label', group: 'Step 3 · CQC wording alignment', label: 'Eyebrow', default: 'CQC wording alignment' },
  { key: 'step3.title', group: 'Step 3 · CQC wording alignment', label: 'Title', default: 'Whether your policy reads the way CQC expects, not just whether it covers the rule.' },
  { key: 'step3.body', group: 'Step 3 · CQC wording alignment', label: 'Body', multiline: true, default: 'The CQC Single Assessment Framework looks for policies that are person-centred and outcomes-focused, not just procedurally correct. CareStream checks your wording against the framework, and where a policy covers the requirement but reads too procedurally, it flags it and suggests person-centred alternative wording in your policy’s own voice, that you can adopt in a click.' },
  { key: 'step3.point1', group: 'Step 3 · CQC wording alignment', label: 'List item 1', default: 'Checked against the CQC Single Assessment Framework quality statements' },
  { key: 'step3.point2', group: 'Step 3 · CQC wording alignment', label: 'List item 2', default: 'Suggested person-centred wording, numbered and highlighted in the policy' },
  { key: 'step3.point3', group: 'Step 3 · CQC wording alignment', label: 'List item 3', default: 'Adopt it straight into your policy, through the same review and approval' },

  // Step 4
  { key: 'step4.label', group: 'Step 4 · The legal basis', label: 'Eyebrow', default: 'The legal basis' },
  { key: 'step4.title', group: 'Step 4 · The legal basis', label: 'Title', default: 'Every recommendation shows why it matters.' },
  { key: 'step4.body', group: 'Step 4 · The legal basis', label: 'Body', multiline: true, default: 'Each item is marked Legally required or Advised good practice, and names the regulation or guidance behind it with a link to the source. So a recommendation is never a black-box suggestion, it is a defensible, cited requirement your inspectors would recognise.' },
  { key: 'step4.point1', group: 'Step 4 · The legal basis', label: 'List item 1', default: 'Legally required vs advised, at a glance' },
  { key: 'step4.point2', group: 'Step 4 · The legal basis', label: 'List item 2', default: 'The citing legislation, regulation or guidance named' },
  { key: 'step4.point3', group: 'Step 4 · The legal basis', label: 'List item 3', default: 'Direct links to the source for evidence' },

  // Step 5
  { key: 'step5.label', group: 'Step 5 · Where it goes', label: 'Eyebrow', default: 'Where it goes' },
  { key: 'step5.title', group: 'Step 5 · Where it goes', label: 'Title', default: 'It tells you which policy to put it in.' },
  { key: 'step5.body', group: 'Step 5 · Where it goes', label: 'Body', multiline: true, default: 'For a partial, CareStream opens the policy that partly covers the regulation and highlights the passages that already address it. For a gap, it points to the existing policy the wording belongs in, or tells you a new policy is needed.' },
  { key: 'step5.point1', group: 'Step 5 · Where it goes', label: 'List item 1', default: 'Matched to the right policy in your library' },
  { key: 'step5.point2', group: 'Step 5 · Where it goes', label: 'List item 2', default: 'Covered passages highlighted in the document' },
  { key: 'step5.point3', group: 'Step 5 · Where it goes', label: 'List item 3', default: 'Flags when a brand-new policy is required' },

  // Step 6
  { key: 'step6.label', group: 'Step 6 · Right for your service', label: 'Eyebrow', default: 'Right for your service' },
  { key: 'step6.title', group: 'Step 6 · Right for your service', label: 'Title', default: 'Only tested against what actually applies to you.' },
  { key: 'step6.body', group: 'Step 6 · Right for your service', label: 'Body', multiline: true, default: 'A short service profile, pre-filled from your setting type, tells CareStream what your service actually does. So a home that holds no controlled drugs is never assessed against controlled-drug rules, and a service that does not support people under the Mental Health Act is never flagged for it.' },
  { key: 'step6.point1', group: 'Step 6 · Right for your service', label: 'List item 1', default: 'Scoped by care setting and what your service does' },
  { key: 'step6.point2', group: 'Step 6 · Right for your service', label: 'List item 2', default: 'The CQC Fundamental Standards apply to everyone' },
  { key: 'step6.point3', group: 'Step 6 · Right for your service', label: 'List item 3', default: 'No irrelevant gaps, no noise' },

  // Step 7
  { key: 'step7.label', group: 'Step 7 · Track legal changes', label: 'Eyebrow', default: 'Track legal changes' },
  { key: 'step7.title', group: 'Step 7 · Track legal changes', label: 'Title', default: 'When the standards change, you know.' },
  { key: 'step7.body', group: 'Step 7 · Track legal changes', label: 'Body', multiline: true, default: 'CareStream tracks changes to the regulations and standards you are assessed against. When one changes, the homes affected are alerted on their gaps page so they can review and re-check their policies, before it becomes an inspection finding.' },
  { key: 'step7.point1', group: 'Step 7 · Track legal changes', label: 'List item 1', default: 'Change history for every standard' },
  { key: 'step7.point2', group: 'Step 7 · Track legal changes', label: 'List item 2', default: 'Homes assessed against a changed standard are alerted' },
  { key: 'step7.point3', group: 'Step 7 · Track legal changes', label: 'List item 3', default: 'Re-check coverage in a click' },

  // Step 8
  { key: 'step8.label', group: 'Step 8 · Turn changes into training', label: 'Eyebrow', default: 'Turn changes into training' },
  { key: 'step8.title', group: 'Step 8 · Turn changes into training', label: 'Title', default: 'Every policy change becomes staff training.' },
  { key: 'step8.body', group: 'Step 8 · Turn changes into training', label: 'Body', multiline: true, default: 'Once you add the recommended wording, or when a standard updates, generate a short, ready-to-assign training module built from exactly that change. Diagnose the gap, close it, and make sure your staff learn it — in one flow.' },
  { key: 'step8.point1', group: 'Step 8 · Turn changes into training', label: 'List item 1', default: 'A micro-lesson and assessment from the change' },
  { key: 'step8.point2', group: 'Step 8 · Turn changes into training', label: 'List item 2', default: 'Lands as a draft for you to review and publish' },
  { key: 'step8.point3', group: 'Step 8 · Turn changes into training', label: 'List item 3', default: 'Reuses your existing training and certificate flow' },

  // Availability
  { key: 'availability.badge', group: 'Availability', label: 'Plan badge', default: 'Professional & Enterprise' },
  { key: 'availability.h2', group: 'Availability', label: 'Heading', default: 'Policy Gap Detection is included on the Professional and Enterprise plans.' },
  { key: 'availability.body', group: 'Availability', label: 'Paragraph', rich: true, default: 'Regulation coverage, remediation guidance with the legal basis, change tracking and gap-driven training are all part of Professional and Enterprise. Starter customers can upgrade in a click.' },
  { key: 'availability.cta', group: 'Availability', label: 'CTA button', default: 'See plans & pricing' },
]
