import type { SlotDef } from './types'

// Editable copy for the rebuilt /who-we-serve page. Defaults are the approved theme copy;
// overrides are saved under Main site pages -> /who-we-serve.
//
// Only the page's own prose is here. The eleven setting cards are NOT: they come from
// SETTINGS_LIST, which already holds the same label and description, and a second copy would
// drift from the pages it links to the first time either was edited.
export const WHO_WE_SERVE_V2_SLOTS: SlotDef[] = [
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Who we serve' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Built for every CQC-regulated setting.' },
  { key: 'hero.lede', group: 'Hero', label: 'Paragraph', multiline: true, default: 'CareStream gives your whole team instant access to your policies, training, audits and CQC tools, grounded in your own documents and in any language. Whatever kind of service you run, find out how CareStream works for you.' },

  { key: 'list.label', group: 'The settings', label: 'Eyebrow', default: 'Find your service' },
  { key: 'list.h2', group: 'The settings', label: 'Heading', default: 'Eleven settings, one policy library.' },
  { key: 'list.lede', group: 'The settings', label: 'Paragraph', multiline: true, default: 'Each page below shows how CareStream works for that kind of service, with the questions your team actually asks.' },

  { key: 'same.label', group: 'The same underneath', label: 'Eyebrow', default: 'The same underneath' },
  { key: 'same.h2', group: 'The same underneath', label: 'Heading', default: 'What every setting gets, whatever the badge on the door.' },
  { key: 'same.lede', group: 'The same underneath', label: 'Paragraph', multiline: true, default: 'The setting changes the questions and the evidence. It does not change the engine.' },

  { key: 'cta.h2', group: 'Closing', label: 'Heading', default: 'Not sure if CareStream fits your service?' },
  { key: 'cta.lede', group: 'Closing', label: 'Paragraph', multiline: true, default: 'If you are a CQC-regulated service, it almost certainly does. Book a demo and we will show you, using two or three of your own policies.' },
]
