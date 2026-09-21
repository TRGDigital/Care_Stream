import type { SlotDef } from './types'

// Editable copy for the rebuilt homepage, read the same way HOME_SLOTS is: defaults here,
// overrides saved in the platform under Main site pages -> /.
//
// A separate set from HOME_SLOTS rather than an edit of it. The two designs say different
// things — 0 of the 29 paragraphs on the new page appear in the old slots — so merging them
// would leave a pile of keys belonging to whichever design is not currently live, and no way
// to tell which is which.
//
// Every default below is the approved theme copy, carried across rather than written.
export const HOME_V2_SLOTS: SlotDef[] = [
  // ── Hero ────────────────────────────────────────────────────────────────────
  // The design sets 'evidence' and 'for your teams' in a gradient, so the headline carries its
  // own line breaks and emphasis. Kept as three parts rather than one string with markup in it.
  { key: 'hero.h1.lead', group: 'Hero', label: 'Headline — first line', default: 'Your care policies,' },
  { key: 'hero.h1.mid', group: 'Hero', label: 'Headline — before the emphasis', default: 'turned into' },
  { key: 'hero.h1.grad1', group: 'Hero', label: 'Headline — emphasis 1', default: 'evidence' },
  { key: 'hero.h1.grad2', group: 'Hero', label: 'Headline — emphasis 2', default: 'for your teams' },
  { key: 'hero.lede', group: 'Hero', label: 'Sub-paragraph', multiline: true, default: 'Upload your documents once. CareStream turns them into staff answers, training, audits and inspection evidence, grounded only in what you wrote.' },
  { key: 'hero.cta', group: 'Hero', label: 'Submit button', default: 'Start free trial' },
  { key: 'hero.email.placeholder', group: 'Hero', label: 'Email field placeholder', default: 'name@yourcarehome.co.uk' },
  { key: 'hero.microcopy', group: 'Hero', label: 'Line under the button', default: 'No card required · Set up in a day · UK data residency' },

  // ── Hero constellation ──────────────────────────────────────────────────────
  // The illustrative cards and labels around the hero copy. Illustrative figures, not claims
  // about a real service, but still words on the page, so they are editable like the rest.
  { key: 'hero.n.policies.big', group: 'Hero cards', label: 'Policies card: figure', default: '44' },
  { key: 'hero.n.policies.title', group: 'Hero cards', label: 'Policies card: title', default: 'Policies updated' },
  { key: 'hero.n.policies.sub', group: 'Hero cards', label: 'Policies card: line', default: 'Across your whole library this year' },
  { key: 'hero.n.policies.tag', group: 'Hero cards', label: 'Policies card: tag', default: 'All published' },
  { key: 'hero.n.library', group: 'Hero cards', label: 'Label: policy library', default: 'Policy library' },
  { key: 'hero.n.hub', group: 'Hero cards', label: 'Label: staff hub', default: 'Staff hub · 60+ languages' },
  { key: 'hero.n.training.big', group: 'Hero cards', label: 'Training card: figure', default: '28' },
  { key: 'hero.n.training.title', group: 'Hero cards', label: 'Training card: title', default: 'Training modules completed' },
  { key: 'hero.n.training.sub', group: 'Hero cards', label: 'Training card: line', default: 'This month, across 38 staff' },
  { key: 'hero.n.training.tag', group: 'Hero cards', label: 'Training card: tag', default: 'On track' },
  { key: 'hero.n.gaps.big', group: 'Hero cards', label: 'Gaps card: figure', default: '18' },
  { key: 'hero.n.gaps.title', group: 'Hero cards', label: 'Gaps card: title', default: 'New training gaps identified' },
  { key: 'hero.n.gaps.sub', group: 'Hero cards', label: 'Gaps card: line', default: 'Found in the last analysis' },
  { key: 'hero.n.gaps.tag', group: 'Hero cards', label: 'Gaps card: tag', default: 'Needs a look' },
  { key: 'hero.n.evidence', group: 'Hero cards', label: 'Label: CQC evidence', default: 'CQC evidence' },
  { key: 'hero.n.audit', group: 'Hero cards', label: 'Label: audits', default: 'Audits passed' },
  { key: 'hero.n.manager.title', group: 'Hero cards', label: 'Approval card: title', default: 'Care Manager approved' },
  { key: 'hero.n.manager.sub', group: 'Hero cards', label: 'Approval card: line', default: 'Safeguarding Adults v3.1 signed off' },
  { key: 'hero.n.manager.tag', group: 'Hero cards', label: 'Approval card: tag', default: '2 minutes ago' },
  { key: 'hero.n.edits', group: 'Hero cards', label: 'Label: approved edits', default: 'Approved edits' },
  { key: 'hero.n.cqc', group: 'Hero cards', label: 'Label: CQC questions', default: 'CQC questions' },

  // ── Proof strip ─────────────────────────────────────────────────────────────
  { key: 'proof.stat', group: 'Proof strip', label: 'Heading', default: 'Trusted by CQC-registered services across England' },
  { key: 'proof.caption', group: 'Proof strip', label: 'Caption beside the faces (a new line breaks it, as the design does)', multiline: true, default: 'Real carers and managers\nusing CareStream today' },

  // ── Walkthrough ─────────────────────────────────────────────────────────────
  { key: 'watch.eyebrow', group: 'Walkthrough', label: 'Eyebrow', default: 'Watch' },
  { key: 'watch.h2', group: 'Walkthrough', label: 'Heading (a new line breaks it, as the design does)', multiline: true, default: 'See CareStream working,\nend to end' },
  { key: 'watch.lede', group: 'Walkthrough', label: 'Paragraph', multiline: true, default: 'A short walkthrough of the whole platform, from uploading your first policy, policy gaps, training to the evidence assembling itself while your team gets on with the job.' },
  { key: 'watch.step1', group: 'Walkthrough', label: 'Step 1', default: 'Upload your policy library and run the first gap analysis' },
  { key: 'watch.step2', group: 'Walkthrough', label: 'Step 2', default: 'Adopt the suggested wording, then approve and publish it' },
  { key: 'watch.step3', group: 'Walkthrough', label: 'Step 3', default: 'See what your staff get in the hub, in their own language' },
  { key: 'watch.cta1', group: 'Walkthrough', label: 'Primary button', default: 'Watch the walkthrough' },
  { key: 'watch.cta2', group: 'Walkthrough', label: 'Secondary button', default: 'Book a live demo' },
  { key: 'watch.duration', group: 'Walkthrough', label: 'Duration chip', default: '2 min 8 sec' },

  // ── One source of truth ─────────────────────────────────────────────────────
  { key: 'hub.eyebrow', group: 'One source of truth', label: 'Eyebrow', default: 'One source of truth' },
  { key: 'hub.h2', group: 'One source of truth', label: 'Heading (a new line breaks it, as the design does)', multiline: true, default: 'Everything runs off\nyour policy library' },
  { key: 'hub.lede', group: 'One source of truth', label: 'Paragraph', multiline: true, default: 'Nothing is typed twice. Change a policy and the training, the answers your staff get and the evidence in your file all move with it.' },
  { key: 'hub.core', group: 'One source of truth', label: 'Label on the centre', default: 'Your policy library' },

  // ── Policy intelligence ─────────────────────────────────────────────────────
  { key: 'pi.eyebrow', group: 'Policy intelligence', label: 'Eyebrow', default: 'Policy intelligence' },
  { key: 'pi.h2', group: 'Policy intelligence', label: 'Heading (a new line breaks it, as the design does)', multiline: true, default: 'Compliance that reads\nyour actual documents' },
  { key: 'pi.a1.title', group: 'Policy intelligence', label: 'Point 1 title', default: 'Regulation coverage' },
  { key: 'pi.a1.body', group: 'Policy intelligence', label: 'Point 1 body', multiline: true, default: 'Every regulation that applies to your service, checked against the words in your own policies. Not a tick-box list you fill in yourself.' },
  { key: 'pi.a2.title', group: 'Policy intelligence', label: 'Point 2 title', default: 'Out-of-date content' },
  { key: 'pi.a2.body', group: 'Policy intelligence', label: 'Point 2 body', multiline: true, default: 'Superseded law, retired regulators and stale placeholders, found across every document you hold and replaced in one pass.' },
  { key: 'pi.a3.title', group: 'Policy intelligence', label: 'Point 3 title', default: 'Cross-policy consistency' },
  { key: 'pi.a3.body', group: 'Policy intelligence', label: 'Point 3 body', multiline: true, default: 'Where two of your policies contradict each other. The thing inspectors find and you don’t.' },
  { key: 'pi.a4.title', group: 'Policy intelligence', label: 'Point 4 title', default: 'CQC wording alignment' },
  { key: 'pi.a4.body', group: 'Policy intelligence', label: 'Point 4 body', multiline: true, default: 'Checks how your policies read against the language the Single Assessment Framework expects, policy by policy.' },
  { key: 'pi.a5.title', group: 'Policy intelligence', label: 'Point 5 title', default: 'What to add, and where' },
  { key: 'pi.a5.body', group: 'Policy intelligence', label: 'Point 5 body', multiline: true, default: 'Suggested wording, the policy it belongs in, and the exact paragraph it should sit beside. Adopt it, reword it, or add it as a new section.' },

  // ── Staff hub ───────────────────────────────────────────────────────────────
  { key: 'hubband.eyebrow', group: 'Staff hub', label: 'Eyebrow', default: 'Staff hub' },
  { key: 'hubband.h2', group: 'Staff hub', label: 'Heading (a new line breaks it, as the design does)', multiline: true, default: 'Answers at 3am,\nin their language' },
  { key: 'hubband.lede', group: 'Staff hub', label: 'Paragraph', multiline: true, default: 'A carer asks a question in Tagalog and gets your policy back in Tagalog. The same answer your handbook gives, not something from the internet. Every question is logged as evidence.' },
  { key: 'hubband.cta1', group: 'Staff hub', label: 'Primary button', default: 'See the hub' },
  { key: 'hubband.cta2', group: 'Staff hub', label: 'Secondary button', default: 'All 60+ languages' },

  // ── The platform ────────────────────────────────────────────────────────────
  { key: 'showcase.eyebrow', group: 'The platform', label: 'Eyebrow', default: 'The platform' },
  { key: 'showcase.h2', group: 'The platform', label: 'Heading (a new line breaks it, as the design does)', multiline: true, default: 'Real compliance work,\nfor every part of the service' },
  { key: 'showcase.hint', group: 'The platform', label: 'Scroll hint', default: 'Scroll, or pick an area above' },

  // ── Training ────────────────────────────────────────────────────────────────
  { key: 'training.eyebrow', group: 'Training', label: 'Eyebrow', default: 'Training' },
  { key: 'training.h2', group: 'Training', label: 'Heading (a new line breaks it, as the design does)', multiline: true, default: 'Training built from\nyour own policies' },
  { key: 'training.lede', group: 'Training', label: 'Paragraph', multiline: true, default: 'Not generic e-learning. Modules written from your agreed ways of working, approved by you before staff ever see them.' },
  { key: 'training.a1.title', group: 'Training', label: 'Step 1 title', default: 'A module is generated from a policy' },
  { key: 'training.a1.body', group: 'Training', label: 'Step 1 body', multiline: true, default: 'Point CareStream at a policy and it drafts a short module from what that document actually says: the lesson, the key points, and multiple-choice questions with the right answer taken from your wording rather than a generic bank.' },
  { key: 'training.a2.title', group: 'Training', label: 'Step 2 title', default: 'You approve it before anyone sees it' },
  { key: 'training.a2.body', group: 'Training', label: 'Step 2 body', multiline: true, default: 'Nothing reaches staff automatically. You read the module, reword anything that does not sound like your service, remove questions you do not want, then publish. Until you do, it stays a draft.' },
  { key: 'training.a3.title', group: 'Training', label: 'Step 3 title', default: 'Allocate it in a click' },
  { key: 'training.a3.body', group: 'Training', label: 'Step 3 body', multiline: true, default: 'Assign a module to everyone, to a job role, or to named staff. New starters are enrolled automatically as they join, so nobody has to remember to add them.' },
  { key: 'training.a4.title', group: 'Training', label: 'Step 4 title', default: 'Staff complete it in the hub' },
  { key: 'training.a4.body', group: 'Training', label: 'Step 4 body', multiline: true, default: 'It appears in their hub alongside their induction and annual training, and they can take it in any of 60+ languages. Questions answered incorrectly are flagged for you to follow up.' },
  { key: 'training.a5.title', group: 'Training', label: 'Step 5 title', default: 'The evidence files itself' },
  { key: 'training.a5.body', group: 'Training', label: 'Step 5 body', multiline: true, default: 'Completion, scores and certificates land in your training matrix and your inspection evidence as they happen, so there is no separate record to keep up to date.' },
  { key: 'training.c1.title', group: 'Training', label: 'Card 1 title', default: 'Measured learning gain' },
  { key: 'training.c1.body', group: 'Training', label: 'Card 1 body', multiline: true, default: 'Before-and-after scores per module, so you can show training changed something.' },
  // The theme titles this card "CPD-accredited courses". That accreditation is not held, so the
  // default says what is true; the template shows the theme's title once TRAINING_ACCREDITED is on.
  { key: 'training.c2.title', group: 'Training', label: 'Card 2 title (until CPD accreditation is held)', default: 'Ready-made annual courses' },
  { key: 'training.c2.body', group: 'Training', label: 'Card 2 body', multiline: true, default: 'Ready-made annual courses for every mandatory subject, licensed per staff member.' },
  { key: 'training.c3.title', group: 'Training', label: 'Card 3 title', default: 'Certificates that file themselves' },
  { key: 'training.c3.body', group: 'Training', label: 'Card 3 body', multiline: true, default: 'Completion records land in your evidence pack without anyone printing anything.' },

  // ── Get started ─────────────────────────────────────────────────────────────
  { key: 'start.eyebrow', group: 'Get started', label: 'Eyebrow', default: 'Get started easily' },
  { key: 'start.h2', group: 'Get started', label: 'Heading', default: 'From sign-up to evidence in an afternoon' },
  { key: 'start.lede', group: 'Get started', label: 'Paragraph', multiline: true, default: 'No implementation project, no data migration, no consultant. Upload what you already have and the rest follows.' },
  { key: 'start.s1.time', group: 'Get started', label: 'Step 1 time', default: '2 minutes' },
  { key: 'start.s1.title', group: 'Get started', label: 'Step 1 title', default: 'Sign up' },
  { key: 'start.s1.body', group: 'Get started', label: 'Step 1 line', default: 'Work email, no card, no setup call.' },
  { key: 'start.s2.time', group: 'Get started', label: 'Step 2 time', default: '10 minutes' },
  { key: 'start.s2.title', group: 'Get started', label: 'Step 2 title', default: 'Upload your policies' },
  { key: 'start.s2.body', group: 'Get started', label: 'Step 2 line', default: 'The library you already have, as it is.' },
  { key: 'start.s3.time', group: 'Get started', label: 'Step 3 time', default: 'Runs in the background' },
  { key: 'start.s3.title', group: 'Get started', label: 'Step 3 title', default: 'Run the analysis' },
  { key: 'start.s3.body', group: 'Get started', label: 'Step 3 line', default: 'Coverage, gaps, and the wording to close them.' },
  { key: 'start.s4.time', group: 'Get started', label: 'Step 4 time', default: 'Same day' },
  { key: 'start.s4.title', group: 'Get started', label: 'Step 4 title', default: 'Generate training' },
  { key: 'start.s4.body', group: 'Get started', label: 'Step 4 line', default: 'Approve the module, then allocate it.' },
  { key: 'start.s5.time', group: 'Get started', label: 'Step 5 time', default: 'Same day' },
  { key: 'start.s5.title', group: 'Get started', label: 'Step 5 title', default: 'Open the staff hub' },
  { key: 'start.s5.body', group: 'Get started', label: 'Step 5 line', default: 'Invite by email or a printed QR sheet.' },
  { key: 'start.end.title', group: 'Get started', label: 'Finish title', default: 'You are live' },
  { key: 'start.end.body', group: 'Get started', label: 'Finish line', default: 'Evidence builds itself from here' },
  { key: 'start.cta1', group: 'Get started', label: 'Primary button', default: 'Start free trial' },
  { key: 'start.cta2', group: 'Get started', label: 'Secondary button', default: 'Book a walkthrough' },
  { key: 'start.microcopy', group: 'Get started', label: 'Line beside the buttons', default: 'No card required' },

  // ── Customer story ──────────────────────────────────────────────────────────
  // The reviews themselves are not slots: they are customers' own words, kept verbatim in
  // lib/reviews.ts, so they cannot be reworded from the console.
  { key: 'story.eyebrow', group: 'Customer story', label: 'Eyebrow', default: 'Customer reviews' },
  { key: 'story.h2', group: 'Customer story', label: 'Heading', default: 'What care providers say' },

  // ── Closing call to action ──────────────────────────────────────────────────
  { key: 'cta.h2', group: 'Closing CTA', label: 'Heading', default: 'See it against your own policies' },
  { key: 'cta.lede', group: 'Closing CTA', label: 'Paragraph', multiline: true, default: 'Upload one document and watch what comes back. Nothing to install, nothing to configure.' },
  { key: 'cta.primary', group: 'Closing CTA', label: 'Primary button', default: 'Start free trial' },
  { key: 'cta.secondary', group: 'Closing CTA', label: 'Secondary button', default: 'Book a demo' },
  { key: 'cta.microcopy', group: 'Closing CTA', label: 'Line under the buttons', default: '£85 per month, less than one agency shift hour' },
]
