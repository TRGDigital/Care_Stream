import type { SlotDef } from './types'

// Editable copy for /case-studies. Defaults are the current live copy; editing a
// slot in the platform (Main site pages → /case-studies) overrides it without
// touching the design.
export const CASE_STUDIES_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'Case Studies' },
  { key: 'hero.title', group: 'Hero', label: 'Headline', default: 'Real results. Real care settings.' },
  { key: 'hero.subtitle', group: 'Hero', label: 'Subtitle', multiline: true, default: 'How care organisations are using CareStreamAI to support their teams, reduce manager burden, and build continuous compliance evidence.' },

  // Shared metric labels
  { key: 'metrics.beforeLabel', group: 'Metric labels', label: 'Before label', default: 'Before' },
  { key: 'metrics.afterLabel', group: 'Metric labels', label: 'After label', default: 'After' },

  // Case study 1
  { key: 'cs1.tag', group: 'Case study 1', label: 'Tag', default: 'Residential Care' },
  { key: 'cs1.title', group: 'Case study 1', label: 'Title', default: 'Night shift confidence at a 45-bed residential home' },
  { key: 'cs1.summary', group: 'Case study 1', label: 'Summary', rich: true, default: 'A registered manager was receiving 4–6 calls per week from night staff asking policy questions. After deploying CareStreamAI, out-of-hours calls dropped to near zero within the first month.' },
  { key: 'cs1.metric1.label', group: 'Case study 1', label: 'Metric 1 label', default: 'Out-of-hours calls' },
  { key: 'cs1.metric1.before', group: 'Case study 1', label: 'Metric 1 before', default: '4–6 per week' },
  { key: 'cs1.metric1.after', group: 'Case study 1', label: 'Metric 1 after', default: 'Near zero' },
  { key: 'cs1.metric2.label', group: 'Case study 1', label: 'Metric 2 label', default: 'Time to answer' },
  { key: 'cs1.metric2.before', group: 'Case study 1', label: 'Metric 2 before', default: '10–30 minutes' },
  { key: 'cs1.metric2.after', group: 'Case study 1', label: 'Metric 2 after', default: 'Under 30 seconds' },
  { key: 'cs1.quote', group: 'Case study 1', label: 'Quote', multiline: true, default: 'Night staff actually feel supported now. They get the answer they need without waking me up, and I know the right procedure was followed.' },
  { key: 'cs1.attribution', group: 'Case study 1', label: 'Attribution', default: 'Registered Manager, 45-bed residential home' },
  { key: 'cs1.initials', group: 'Case study 1', label: 'Avatar initials', default: 'JM' },

  // Case study 2
  { key: 'cs2.tag', group: 'Case study 2', label: 'Tag', default: 'Domiciliary Care' },
  { key: 'cs2.title', group: 'Case study 2', label: 'Title', default: 'Policy access for a 60% overseas workforce' },
  { key: 'cs2.summary', group: 'Case study 2', label: 'Summary', rich: true, default: 'A domiciliary provider with a predominantly overseas workforce was spending significant time on induction support. With CareStreamAI, new starters could ask policy questions in their own language from day one.' },
  { key: 'cs2.metric1.label', group: 'Case study 2', label: 'Metric 1 label', default: 'Languages used' },
  { key: 'cs2.metric1.before', group: 'Case study 2', label: 'Metric 1 before', default: '—' },
  { key: 'cs2.metric1.after', group: 'Case study 2', label: 'Metric 1 after', default: '11' },
  { key: 'cs2.metric2.label', group: 'Case study 2', label: 'Metric 2 label', default: 'HR query load' },
  { key: 'cs2.metric2.before', group: 'Case study 2', label: 'Metric 2 before', default: 'High (ongoing)' },
  { key: 'cs2.metric2.after', group: 'Case study 2', label: 'Metric 2 after', default: 'Reduced by ~60%' },
  { key: 'cs2.quote', group: 'Case study 2', label: 'Quote', multiline: true, default: "Our Romanian and Filipino carers told us they felt included for the first time. They didn't have to guess, they could just ask." },
  { key: 'cs2.attribution', group: 'Case study 2', label: 'Attribution', default: 'HR Director, domiciliary care provider' },
  { key: 'cs2.initials', group: 'Case study 2', label: 'Avatar initials', default: 'AO' },

  // Case study 3
  { key: 'cs3.tag', group: 'Case study 3', label: 'Tag', default: 'Group Operator' },
  { key: 'cs3.title', group: 'Case study 3', label: 'Title', default: 'CQC inspection evidence, built automatically across 4 homes' },
  { key: 'cs3.summary', group: 'Case study 3', label: 'Summary', rich: true, default: "A group operator with four homes was manually assembling inspection evidence for each CQC visit. CareStreamAI's CQC Readiness Report replaced that process entirely." },
  { key: 'cs3.metric1.label', group: 'Case study 3', label: 'Metric 1 label', default: 'Evidence prep time' },
  { key: 'cs3.metric1.before', group: 'Case study 3', label: 'Metric 1 before', default: '2–3 days per inspection' },
  { key: 'cs3.metric1.after', group: 'Case study 3', label: 'Metric 1 after', default: 'One click export' },
  { key: 'cs3.metric2.label', group: 'Case study 3', label: 'Metric 2 label', default: 'Homes covered' },
  { key: 'cs3.metric2.before', group: 'Case study 3', label: 'Metric 2 before', default: 'Manually, one at a time' },
  { key: 'cs3.metric2.after', group: 'Case study 3', label: 'Metric 2 after', default: 'All 4 in a single report' },
  { key: 'cs3.quote', group: 'Case study 3', label: 'Quote', multiline: true, default: 'When the inspector arrived, I handed over a 12-page evidence document showing exactly how our team engages with our policies. That conversation used to take hours to prepare.' },
  { key: 'cs3.attribution', group: 'Case study 3', label: 'Attribution', default: 'Operations Director, 4-home group' },
  { key: 'cs3.initials', group: 'Case study 3', label: 'Avatar initials', default: 'PT' },

  // Bottom CTA
  { key: 'cta.heading', group: 'Bottom CTA', label: 'Heading', default: 'Want to see results like these in your organisation?' },
  { key: 'cta.sub', group: 'Bottom CTA', label: 'Sub-text', default: '14-day free trial. No charge until day 14.' },
  { key: 'cta.primary', group: 'Bottom CTA', label: 'Primary button', default: 'Book a Free Demo' },
  { key: 'cta.secondary', group: 'Bottom CTA', label: 'Secondary button', default: 'Start Free Trial' },
]
