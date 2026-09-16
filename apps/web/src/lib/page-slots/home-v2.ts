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

  // ── Proof strip ─────────────────────────────────────────────────────────────
  { key: 'proof.stat', group: 'Proof strip', label: 'Heading', default: 'Trusted by CQC-registered services across England' },
  { key: 'proof.caption', group: 'Proof strip', label: 'Caption beside the faces', default: 'Real carers and managers using CareStream today' },

  // ── Walkthrough ─────────────────────────────────────────────────────────────
  { key: 'watch.eyebrow', group: 'Walkthrough', label: 'Eyebrow', default: 'Watch' },
  { key: 'watch.h2', group: 'Walkthrough', label: 'Heading', default: 'See CareStream working, end to end' },
  { key: 'watch.lede', group: 'Walkthrough', label: 'Paragraph', multiline: true, default: 'A short walkthrough of the whole platform, from uploading your first policy, policy gaps, training to the evidence assembling itself while your team gets on with the job.' },
  { key: 'watch.step1', group: 'Walkthrough', label: 'Step 1', default: 'Upload your policy library and run the first gap analysis' },
  { key: 'watch.step2', group: 'Walkthrough', label: 'Step 2', default: 'Adopt the suggested wording, then approve and publish it' },
  { key: 'watch.step3', group: 'Walkthrough', label: 'Step 3', default: 'See what your staff get in the hub, in their own language' },
  { key: 'watch.cta1', group: 'Walkthrough', label: 'Primary button', default: 'Watch the walkthrough' },
  { key: 'watch.cta2', group: 'Walkthrough', label: 'Secondary button', default: 'Book a live demo' },
  { key: 'watch.duration', group: 'Walkthrough', label: 'Duration chip', default: '2 min 8 sec' },

  // ── One source of truth ─────────────────────────────────────────────────────
  { key: 'hub.eyebrow', group: 'One source of truth', label: 'Eyebrow', default: 'One source of truth' },
  { key: 'hub.h2', group: 'One source of truth', label: 'Heading', default: 'Everything runs off your policy library' },
  { key: 'hub.lede', group: 'One source of truth', label: 'Paragraph', multiline: true, default: 'Nothing is typed twice. Change a policy and the training, the answers your staff get and the evidence in your file all move with it.' },
  { key: 'hub.core', group: 'One source of truth', label: 'Label on the centre', default: 'Your policy library' },

  // ── Policy intelligence ─────────────────────────────────────────────────────
  { key: 'pi.eyebrow', group: 'Policy intelligence', label: 'Eyebrow', default: 'Policy intelligence' },
  { key: 'pi.h2', group: 'Policy intelligence', label: 'Heading', default: 'Compliance that reads your actual documents' },
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
  { key: 'hubband.h2', group: 'Staff hub', label: 'Heading', default: 'Answers at 3am, in their language' },
  { key: 'hubband.lede', group: 'Staff hub', label: 'Paragraph', multiline: true, default: 'A carer asks a question in Tagalog and gets your policy back in Tagalog. The same answer your handbook gives, not something from the internet. Every question is logged as evidence.' },
  { key: 'hubband.cta1', group: 'Staff hub', label: 'Primary button', default: 'See the hub' },
  { key: 'hubband.cta2', group: 'Staff hub', label: 'Secondary button', default: 'All 60+ languages' },

  // ── The platform ────────────────────────────────────────────────────────────
  { key: 'showcase.eyebrow', group: 'The platform', label: 'Eyebrow', default: 'The platform' },
  { key: 'showcase.h2', group: 'The platform', label: 'Heading', default: 'Real compliance work, for every part of the service' },

  // ── Customer story ──────────────────────────────────────────────────────────
  { key: 'story.eyebrow', group: 'Customer story', label: 'Eyebrow', default: 'Customer story' },
  { key: 'story.quote', group: 'Customer story', label: 'Quote', multiline: true, default: '“The inspector asked for evidence and I had it on screen before she finished the sentence.”' },
  { key: 'story.cite', group: 'Customer story', label: 'Attribution', default: 'Registered Manager · 48-bed nursing home, West Sussex' },

  // ── Closing call to action ──────────────────────────────────────────────────
  { key: 'cta.h2', group: 'Closing CTA', label: 'Heading', default: 'See it against your own policies' },
  { key: 'cta.lede', group: 'Closing CTA', label: 'Paragraph', multiline: true, default: 'Upload one document and watch what comes back. Nothing to install, nothing to configure.' },
  { key: 'cta.primary', group: 'Closing CTA', label: 'Primary button', default: 'Start free trial' },
  { key: 'cta.secondary', group: 'Closing CTA', label: 'Secondary button', default: 'Book a demo' },
  { key: 'cta.microcopy', group: 'Closing CTA', label: 'Line under the buttons', default: '£85 per month, less than one agency shift hour' },
]
