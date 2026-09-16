import type { SlotDef } from './types'

// Editable copy for the rebuilt /who-its-for page. Defaults are the approved theme copy;
// overrides are saved under Main site pages -> /who-its-for.
//
// Only the page's own prose is here. The twenty-two setting panels, the four shared cards, the
// role rows and the notice are NOT: they run to a hundred and forty paragraphs, and they are
// generated from the theme into src/lib/who-its-for-data.ts by gen_who_its_for.py. Retyping
// them into slots would be a second copy to keep in step, and the generator is the thing to
// re-run if the design changes.
export const WHO_ITS_FOR_V2_SLOTS: SlotDef[] = [
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: "Who It's For" },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Built for every registered care provider.' },
  { key: 'hero.lede', group: 'Hero', label: 'Paragraph', multiline: true, default: 'If your organisation has internal policies and a team that needs to follow them, CareStreamAI turns those policies into a 24-hour knowledge resource for every member of staff.' },

  { key: 'settings.label', group: 'Care settings', label: 'Eyebrow', default: 'Care settings' },
  { key: 'settings.h2', group: 'Care settings', label: 'Heading', default: 'Find your setting.' },
  { key: 'settings.lede', group: 'Care settings', label: 'Paragraph', multiline: true, default: 'Every registered setting has its own pressures. Pick yours to see the questions staff ask, the policy areas they ask about, and what it maps to.' },

  { key: 'shared.label', group: 'Across every setting', label: 'Eyebrow', default: 'Across every setting' },
  { key: 'shared.h2', group: 'Across every setting', label: 'Heading', default: 'The same four things, whatever you run.' },

  { key: 'roles.label', group: 'By role', label: 'Eyebrow', default: 'By role' },
  { key: 'roles.h2', group: 'By role', label: 'Heading', default: 'What it changes, depending on your job.' },

  // Kept from the current page: a live module taster and the real training library. The theme
  // has no block for it, so it is rendered in the theme's own card and split styling.
  { key: 'training.label', group: 'Training managers', label: 'Eyebrow', default: 'Training managers' },
  { key: 'training.h2', group: 'Training managers', label: 'Heading', default: 'Assign, track and prove training, from one library, in every language.' },
  { key: 'training.lede', group: 'Training managers', label: 'Paragraph', multiline: true, default: 'Move beyond the annual tick-box. Roll out ready-built modules or generate new ones from your own policies, then watch completion and compliance across your whole team on a single dashboard.' },
  { key: 'training.try', group: 'Training managers', label: 'Demo caption', multiline: true, default: 'Read the lesson, answer the question, then tap the language button to flip the whole step into another language. The same flow your staff use in the hub, in over 50 languages.' },

  { key: 'end.h2', group: 'Closing', label: 'Heading', default: 'See it against your own policies.' },
  { key: 'end.lede', group: 'Closing', label: 'Paragraph', multiline: true, default: 'Whatever you run, upload what you already have and see it working inside a fortnight.' },
]
