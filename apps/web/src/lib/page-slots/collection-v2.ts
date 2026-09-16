import type { SlotDef } from './types'

// Editable copy for the rebuilt /collection/[slug] pages. Defaults are the approved theme copy;
// overrides are saved under Main site pages -> /collection.
//
// This is the page FURNITURE only, and it is deliberately shared by all three collections: the
// title, eyebrow, intro, body, FAQs, sibling links and every product come from the collection
// record, which is where they are already edited. Only the lines the theme repeats unchanged
// on each collection are here.
export const COLLECTION_V2_SLOTS: SlotDef[] = [
  // The first meta line is "<n> in this collection", where n is the number of products, so the
  // count is never written down and cannot disagree with the grid beneath it.
  { key: 'meta.noun', group: 'Hero meta', label: 'After the product count', default: 'in this collection' },
  { key: 'meta.line2', group: 'Hero meta', label: 'Second line', default: 'Written for your service, not a template' },
  { key: 'meta.line3', group: 'Hero meta', label: 'Third line', default: 'Checked against the law before it carries your name' },

  { key: 'links.h2', group: 'Sibling collections', label: 'Heading', default: 'Browse the rest of the library' },
  { key: 'links.sub', group: 'Sibling collections', label: 'Paragraph', multiline: true, default: 'Most services need more than one. These are the collections people buy alongside this one.' },

  { key: 'cta.h2', group: 'Closing', label: 'Heading', default: 'Policies are one part of it.' },
  { key: 'cta.lede', group: 'Closing', label: 'Paragraph', multiline: true, default: 'CareStream is the compliance system underneath: your policies, your staff training, your audits and your evidence, kept current and ready for the day somebody asks to see them.' },
  { key: 'cta.point1', group: 'Closing', label: 'Point 1', default: 'Policies written and kept updated for you' },
  { key: 'cta.point2', group: 'Closing', label: 'Point 2', default: 'Staff training that records itself against the standard' },
  { key: 'cta.point3', group: 'Closing', label: 'Point 3', default: 'Gap analysis showing what you are missing before an inspector does' },
  { key: 'cta.point4', group: 'Closing', label: 'Point 4', default: 'Everything in one place, for one price' },
]
