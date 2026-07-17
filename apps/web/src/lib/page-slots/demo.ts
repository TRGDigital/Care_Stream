import type { SlotDef } from './types'

// Editable copy for /demo. Defaults are the current live copy; editing a slot in
// the platform (Main site pages → /demo) overrides it without touching the design
// or the booking form.
export const DEMO_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Book a Demo' },
  { key: 'hero.title', group: 'Hero', label: 'Headline', default: 'See CareStreamAI with your own policies.' },
  { key: 'hero.subtitle', group: 'Hero', label: 'Subtitle', multiline: true, default: "Book a 30-minute walkthrough with our team. We'll use your actual policies if you share them in advance, so you see exactly what your team would experience." },

  // What to expect
  { key: 'expect.h2', group: 'What to expect', label: 'Heading', default: 'What to expect' },
  { key: 'expect.step1.title', group: 'What to expect', label: 'Step 1 title', default: '30 minutes, no pressure' },
  { key: 'expect.step1.body', group: 'What to expect', label: 'Step 1 body', multiline: true, default: 'A focused walkthrough of the product, not a sales presentation. We show you what it does and you tell us whether it fits.' },
  { key: 'expect.step2.title', group: 'What to expect', label: 'Step 2 title', default: 'Using your own documents' },
  { key: 'expect.step2.body', group: 'What to expect', label: 'Step 2 body', multiline: true, default: 'If you share two or three policies in advance, we will load them into a demo environment so you can see your own content in the system.' },
  { key: 'expect.step3.title', group: 'What to expect', label: 'Step 3 title', default: 'Live multilingual demonstration' },
  { key: 'expect.step3.body', group: 'What to expect', label: 'Step 3 body', multiline: true, default: 'We will show you queries submitted in multiple languages and the instant responses your team would receive.' },
  { key: 'expect.step4.title', group: 'What to expect', label: 'Step 4 title', default: 'Your questions, answered' },
  { key: 'expect.step4.body', group: 'What to expect', label: 'Step 4 body', multiline: true, default: 'We leave time for your questions, about data security, compliance, pricing, or anything else that matters to your organisation.' },

  // Trial callout
  { key: 'trial.title', group: 'Trial callout', label: 'Heading', default: 'Prefer to try it yourself first?' },
  { key: 'trial.body', group: 'Trial callout', label: 'Body', multiline: true, default: 'Start a free 14-day trial — no charge until day 14. You can still book a demo any time during or after the trial.' },
  { key: 'trial.chip1', group: 'Trial callout', label: 'Chip 1', default: '14-day free trial' },
  { key: 'trial.chip2', group: 'Trial callout', label: 'Chip 2', default: 'No charge until day 14' },
  { key: 'trial.chip3', group: 'Trial callout', label: 'Chip 3', default: 'Set up in under an hour' },

  // Form
  { key: 'form.h3', group: 'Form', label: 'Form heading', default: 'Request a demo' },
]
