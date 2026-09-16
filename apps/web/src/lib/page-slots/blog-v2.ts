import type { SlotDef } from './types'

// Editable copy for the rebuilt /blog index. Defaults are the approved theme copy; overrides
// are saved under Main site pages -> /blog.
//
// The posts themselves are not here, obviously: they come from the blog API and are managed in
// the platform admin. This is only the furniture around them.
export const BLOG_V2_SLOTS: SlotDef[] = [
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Blog' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Insight for people running care services' },
  { key: 'hero.lede', group: 'Hero', label: 'Paragraph', multiline: true, default: 'Regulatory guidance, workforce insight and practical resources for everyone working in health and social care in the UK.' },

  { key: 'filter.all', group: 'Filter', label: 'All-categories button', default: 'All' },
  { key: 'filter.search', group: 'Filter', label: 'Search placeholder', default: 'Search articles' },

  { key: 'lead.cta', group: 'Featured post', label: 'Button label', default: 'Read article' },

  { key: 'empty.filtered', group: 'Empty states', label: 'No match for the filter', multiline: true, default: 'No articles match that. Try another category or clear the search.' },
  { key: 'empty.none', group: 'Empty states', label: 'No posts published at all', multiline: true, default: 'No articles published yet. Check back soon.' },

  { key: 'end.h2', group: 'Closing', label: 'Heading', default: 'Put the guidance to work' },
  { key: 'end.lede', group: 'Closing', label: 'Paragraph', multiline: true, default: 'Everything here is written from what care services actually run into. See how CareStream handles it against your own policies.' },
]
