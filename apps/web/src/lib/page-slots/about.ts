import type { SlotDef } from './types'

// Editable copy for /about. Defaults are the current live copy; editing a slot in
// the platform (Main site pages → /about) overrides it without touching the design.
export const ABOUT_SLOTS: SlotDef[] = [
  // Hero
  { key: 'hero.label', group: 'Hero', label: 'Eyebrow', default: 'About' },
  { key: 'hero.h1', group: 'Hero', label: 'Headline', default: 'Built by people who understand care.' },
  { key: 'hero.intro', group: 'Hero', label: 'Intro paragraph', multiline: true, default: 'CareStreamAI was founded with one mission: to give every member of a care team, whatever language they think in, the same instant access to the policies, training and guidance they need to do their job safely and well. Today it is one platform that does exactly that.' },
  { key: 'hero.chip1', group: 'Hero', label: 'Chip 1', default: 'UK-built and hosted' },
  { key: 'hero.chip2', group: 'Hero', label: 'Chip 2', default: 'CQC-aligned' },
  { key: 'hero.chip3', group: 'Hero', label: 'Chip 3', default: '60+ languages' },

  // Origin
  { key: 'origin.label', group: 'Origin', label: 'Eyebrow', default: 'Where We Started' },
  { key: 'origin.h2', group: 'Origin', label: 'Heading', default: 'The problem was always the same.' },
  { key: 'origin.p1', group: 'Origin', label: 'Paragraph 1', rich: true, default: 'Every care organisation invests time and money in writing good policies. The challenge has never been the policies themselves, it has been getting them into the hands of the people who need them, at the moment they need them, in a form they can understand.' },
  { key: 'origin.p2', group: 'Origin', label: 'Paragraph 2', rich: true, default: 'Care workers on a night shift do not have time to search through a policy folder. New starters from overseas should not have to navigate complex legal English on day one. Managers should not spend their shifts fielding questions their written policies already answer.' },
  { key: 'origin.p3', group: 'Origin', label: 'Paragraph 3', rich: true, default: 'CareStreamAI was built to close that gap, not by replacing policies, but by making them genuinely accessible to everyone. The same problem, we realised, applied to mandatory training and to the evidence a service needs at inspection. So CareStream grew from policy access into a single hub for policies, training, audits and CQC readiness.' },
  { key: 'origin.stat', group: 'Origin', label: 'Stat figure', default: '190,000+' },
  { key: 'origin.statLabel', group: 'Origin', label: 'Stat label', default: 'overseas workers joined the UK care sector in 2023/24.' },
  { key: 'origin.statSub', group: 'Origin', label: 'Stat sub-text', multiline: true, default: 'Most were expected to navigate complex policy libraries in a second language from day one.' },

  // The platform today
  { key: 'platform.label', group: 'The platform today', label: 'Eyebrow', default: 'The Platform Today' },
  { key: 'platform.h2', group: 'The platform today', label: 'Heading', default: 'One platform for your whole care operation.' },
  { key: 'platform.intro', group: 'The platform today', label: 'Intro', multiline: true, default: 'What began as policy access has grown into a single hub for the things a care team relies on every day, all grounded in your own documents and available in any language.' },
  { key: 'platform.card1.title', group: 'The platform today', label: 'Card 1 title', default: 'Policy access' },
  { key: 'platform.card1.body', group: 'The platform today', label: 'Card 1 body', multiline: true, default: 'Instant, cited answers from your own policies, in 60+ languages, day or night.' },
  { key: 'platform.card2.title', group: 'The platform today', label: 'Card 2 title', default: 'Staff training' },
  { key: 'platform.card2.body', group: 'The platform today', label: 'Card 2 body', multiline: true, default: 'Mandatory training and modules built from your own policies, delivered in the hub.' },
  { key: 'platform.card3.title', group: 'The platform today', label: 'Card 3 title', default: 'Care audits' },
  { key: 'platform.card3.body', group: 'The platform today', label: 'Card 3 body', multiline: true, default: 'Structured audits with AI recommendations, so issues are found and fixed early.' },
  { key: 'platform.card4.title', group: 'The platform today', label: 'Card 4 title', default: 'CQC readiness' },
  { key: 'platform.card4.body', group: 'The platform today', label: 'Card 4 body', multiline: true, default: 'Inspection evidence and reports that build themselves from everyday use.' },
  { key: 'platform.card5.title', group: 'The platform today', label: 'Card 5 title', default: 'The hub' },
  { key: 'platform.card5.body', group: 'The platform today', label: 'Card 5 body', multiline: true, default: 'One app where staff find policies, training and answers, on the phone in their pocket.' },
  { key: 'platform.card6.title', group: 'The platform today', label: 'Card 6 title', default: 'HR policies' },
  { key: 'platform.card6.body', group: 'The platform today', label: 'Card 6 body', multiline: true, default: 'The same instant, grounded access for your staff handbook and HR procedures.' },

  // Principles
  { key: 'principles.label', group: 'Principles', label: 'Eyebrow', default: 'What We Believe' },
  { key: 'principles.h2', group: 'Principles', label: 'Heading', default: 'Our principles.' },
  { key: 'principles.p1.title', group: 'Principles', label: 'Principle 1 title', default: 'Access is a safety issue' },
  { key: 'principles.p1.body', group: 'Principles', label: 'Principle 1 body', multiline: true, default: "When a care worker can't find or understand the correct procedure, the people they support are at risk. Equitable access to the right knowledge is foundational to safe care." },
  { key: 'principles.p2.title', group: 'Principles', label: 'Principle 2 title', default: 'Language should not be a barrier' },
  { key: 'principles.p2.body', group: 'Principles', label: 'Principle 2 body', multiline: true, default: 'The UK care sector is one of the most linguistically diverse workforces in the country. A care worker whose first language is Tagalog deserves the same access to policy knowledge as a native English speaker.' },
  { key: 'principles.p3.title', group: 'Principles', label: 'Principle 3 title', default: 'AI should be bounded, not speculative' },
  { key: 'principles.p3.body', group: 'Principles', label: 'Principle 3 body', multiline: true, default: 'In a compliance setting, confident but incorrect AI answers are dangerous. CareStreamAI is designed so the AI can only answer from approved documents, never from general knowledge, never from guesswork.' },
  { key: 'principles.p4.title', group: 'Principles', label: 'Principle 4 title', default: 'Compliance should be continuous' },
  { key: 'principles.p4.body', group: 'Principles', label: 'Principle 4 body', multiline: true, default: 'Inspection evidence should not be assembled manually the week before a CQC visit. CareStreamAI builds that evidence automatically, one policy interaction at a time.' },
  { key: 'principles.p5.title', group: 'Principles', label: 'Principle 5 title', default: 'Data belongs to you' },
  { key: 'principles.p5.body', group: 'Principles', label: 'Principle 5 body', multiline: true, default: 'Your policies, your staff data, and your query history are yours. We will never use them to train AI models or share them with any other party.' },
  { key: 'principles.p6.title', group: 'Principles', label: 'Principle 6 title', default: 'Knowledge should be reinforced, not filed' },
  { key: 'principles.p6.body', group: 'Principles', label: 'Principle 6 body', multiline: true, default: 'A policy nobody reads, or training watched once and forgotten, is a liability. CareStreamAI keeps knowledge active: accessed when it is needed, taught in short modules, checked, and demonstrably used by the people it is there to help.' },

  // UK-specific
  { key: 'uk.label', group: 'UK-specific', label: 'Eyebrow', default: 'UK-Specific' },
  { key: 'uk.h2', group: 'UK-specific', label: 'Heading', default: 'Built for the UK care sector, not adapted from a generic product.' },
  { key: 'uk.p1', group: 'UK-specific', label: 'Paragraph 1', rich: true, default: 'CareStreamAI is not a general-purpose AI assistant with a care skin applied to it. It was designed from the ground up for the regulatory environment of UK health and social care.' },
  { key: 'uk.p2', group: 'UK-specific', label: 'Paragraph 2', rich: true, default: 'Our regulatory knowledge base is built specifically around UK law and guidance: UK GDPR, the Care Act 2014, CQC Fundamental Standards, RIDDOR, the Misuse of Drugs Act, the NMC Code, and more.' },
  { key: 'uk.p3', group: 'UK-specific', label: 'Paragraph 3', rich: true, default: 'All data is stored within the UK and EEA. Our data processing agreements are written under UK law. Our product development is informed by people with direct experience of UK care regulation and CQC inspection.' },

  // Team
  { key: 'team.label', group: 'Team', label: 'Eyebrow', default: 'The Team' },
  { key: 'team.h2', group: 'Team', label: 'Heading', default: 'Shaped by people who know the sector.' },
  { key: 'team.body', group: 'Team', label: 'Paragraph', rich: true, default: 'CareStreamAI is developed with direct input from registered managers, quality leads, HR directors, and care workers. Every feature exists because someone working in the sector identified a real need. We do not build features for the sake of novelty, we build them because they solve a problem that matters to the people delivering care.' },
]
