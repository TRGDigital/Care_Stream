import type { SlotDef } from './types'

// Editable copy for /contact. Defaults are the current live copy; editing a slot in
// the platform (Main site pages → /contact) overrides it without touching the design.
// Only marketing copy is slotted here — the contact form itself (fields, submit
// logic) lives in ./contact-form and is untouched.
export const CONTACT_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Contact' },
  { key: 'hero.title', group: 'Hero', label: 'Headline', default: 'Get in touch.' },
  { key: 'hero.subtitle', group: 'Hero', label: 'Subtitle', multiline: true, default: 'Questions about the product, pricing, data security, or your specific situation, we respond to every message within one business day.' },

  // How to reach us
  { key: 'reach.h2', group: 'How to reach us', label: 'Heading', default: 'How to reach us' },
  { key: 'reach.card1.title', group: 'How to reach us', label: 'Card 1 title', default: 'General enquiries' },
  { key: 'reach.card1.detail', group: 'How to reach us', label: 'Card 1 detail', multiline: true, default: 'Questions about the product, pricing, or how CareStreamAI would work in your setting.' },
  { key: 'reach.card2.title', group: 'How to reach us', label: 'Card 2 title', default: 'Data protection and legal' },
  { key: 'reach.card2.detail', group: 'How to reach us', label: 'Card 2 detail', multiline: true, default: 'UK GDPR enquiries, DPA requests, and legal correspondence.' },
  { key: 'reach.card3.title', group: 'How to reach us', label: 'Card 3 title', default: 'Technical support' },
  { key: 'reach.card3.detail', group: 'How to reach us', label: 'Card 3 detail', multiline: true, default: 'For existing subscribers, login issues, upload problems, or anything not working as expected.' },

  // Prefer a call
  { key: 'call.title', group: 'Prefer a call?', label: 'Heading', default: 'Prefer a call?' },
  { key: 'call.body', group: 'Prefer a call?', label: 'Lead text (before the link)', multiline: true, default: 'Book a 30-minute demo and we can answer your questions live.' },

  // Form
  { key: 'form.h3', group: 'Form', label: 'Form heading', default: 'Send a message' },
]
