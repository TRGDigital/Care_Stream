import type { SlotDef } from './types'

// Editable copy for the rebuilt /languages page. Defaults are the approved theme copy;
// overrides are saved under Main site pages -> /languages.
//
// The sixty-nine languages themselves are NOT here. They come from COURSE_LANGUAGES, which the
// theme's list was built from and which is already the source of truth for the training pages'
// Course schema. A second copy would drift from the schema the first time either was edited.
//
// The count in the heading is not here either, for the same reason: it is the list's length,
// so it cannot say 69 while the list holds 70.
export const LANGUAGES_V2_SLOTS: SlotDef[] = [
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Multilingual' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Training your whole team understands, in over 60 languages.' },
  { key: 'hero.lede', group: 'Hero', label: 'Paragraph', multiline: true, default: 'Care teams are diverse. CareStream delivers every module, policy answer and CQC tool in the language each staff member is most confident in, so nothing is lost in translation, while your records stay in English.' },

  { key: 'how.label', group: 'How it works', label: 'Eyebrow', default: 'How multilingual works' },
  { key: 'how.h2', group: 'How it works', label: 'Heading', default: 'One platform, every language, no setup.' },
  { key: 'how.c1.title', group: 'How it works', label: 'Card 1 title', default: 'Staff choose their language' },
  { key: 'how.c1.body', group: 'How it works', label: 'Card 1 body', multiline: true, default: 'Each staff member reads and answers in the language they know best, with no admin, no separate accounts, and no per-language versions to maintain.' },
  { key: 'how.c2.title', group: 'How it works', label: 'Card 2 title', default: 'Teach-then-check in that language' },
  { key: 'how.c2.body', group: 'How it works', label: 'Card 2 body', multiline: true, default: 'Lessons, real care scenarios and the assessment are delivered in their language. A wrong answer triggers a short follow-up lesson so the gap is always closed.' },
  { key: 'how.c3.title', group: 'How it works', label: 'Card 3 title', default: 'Records stay in English' },
  { key: 'how.c3.body', group: 'How it works', label: 'Card 3 body', multiline: true, default: 'Completions, certificates and your audit trail stay in English, ready as evidence for CQC, while your team learns in their own language.' },

  { key: 'list.label', group: 'The languages', label: 'Eyebrow', default: 'The languages' },
  // {count} is replaced with the length of COURSE_LANGUAGES.
  { key: 'list.h2', group: 'The languages', label: 'Heading', default: '{count} languages your care team can learn in.' },
  { key: 'list.intro', group: 'The languages', label: 'Paragraph', multiline: true, default: 'These are the languages CareStream delivers training and policy access in today. Your team speaks one that is not listed? It is almost certainly supported too, just ask.' },
  { key: 'list.note.before', group: 'The languages', label: 'Note, before the link', default: 'Speak a language not shown here?' },
  { key: 'list.note.link', group: 'The languages', label: 'Note link text', default: 'Contact us' },
  { key: 'list.note.after', group: 'The languages', label: 'Note, after the link', default: 'and we will confirm it, the list keeps growing.' },

  { key: 'cta.h2', group: 'Closing', label: 'Heading', default: 'Give your whole team training they can understand.' },
  { key: 'cta.lede', group: 'Closing', label: 'Paragraph', multiline: true, default: 'Browse the CareStream training library, or see a live module in action first.' },
]
