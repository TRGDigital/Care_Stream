// CQC Well-led: the one place the wording lives (page banner, home page section, hero panel and the /cqc-well-led hub).
//
// Wording rule: this is EVIDENCE FOR Well-led. Never "CQC compliant", never a promise about a rating, never "delivers Well-led".
// The judgement is always the inspector's. No dashes in the copy (site rule).

export type WellLedTopic = 'gov' | 'learn' | 'edi' | 'cult'

export const CQC_WELL_LED_URL = 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led'
export const HUB_PATH = '/cqc-well-led'

export type Product = { name: string; href: string }

/** Every product that builds Well-led evidence, with the page that explains it. */
export const PRODUCTS: Record<string, Product> = {
  roles:       { name: 'Named role holders',                    href: '/care-policies' },
  coverage:    { name: 'Regulation coverage check',             href: '/policy-gap-detection' },
  alerts:      { name: 'Alerts when rules change',              href: '/regulatory-knowledge' },
  gap:         { name: 'Policy gap analysis',                   href: '/policy-gap-detection' },
  consistency: { name: 'Cross policy consistency',              href: '/policy-gap-detection' },
  approval:    { name: 'Policy approval trail',                 href: '/care-policies' },
  matrix:      { name: 'Training matrix',                       href: '/training-platform' },
  training:    { name: 'Training and evidence',                 href: '/training-platform' },
  cpd:         { name: 'CPD training',                          href: '/cpd-certified' },
  audits:      { name: 'Audits linked to training',             href: '/care-audits' },
  knowledge:   { name: 'Knowledge base',                        href: '/rag' },
  language:    { name: 'Tackles language barrier training gaps', href: '/languages' },
  report:      { name: 'Inspection evidence report',            href: '/cqc-compliance' },
  analytics:   { name: 'Analytics and CQC evidence',            href: '/cqc-compliance' },
}

export const PRODUCT_GROUPS: Array<{ id: 'pol' | 'trn' | 'evi'; title: string; sub: string; items: string[] }> = [
  { id: 'pol', title: 'Policies and governance',  sub: 'Who owns what, and what the rules say',   items: ['roles', 'coverage', 'alerts', 'gap', 'consistency', 'approval'] },
  { id: 'trn', title: 'Training and learning',    sub: 'Staff trained, and understanding checked', items: ['matrix', 'training', 'cpd', 'audits', 'knowledge', 'language'] },
  { id: 'evi', title: 'Evidence for inspectors',  sub: 'What you can show on the day',             items: ['report', 'analytics'] },
]

export type Statement = {
  topic: WellLedTopic
  anchor: string
  /** CQC's own name for the quality statement. */
  cqcName: string
  cqcUrl: string
  /** Short card title for the home page and hero. */
  short: string
  cardLine: string
  heroSub: string
  /** Products shown on this statement's home card (every product appears on exactly one card). */
  cardProducts: string[]
  /** The page banner. */
  bannerHead: string
  bannerLine: string
  /** Products highlighted as most relevant on the banner. */
  key: string[]
}

export const STATEMENTS: Statement[] = [
  {
    topic: 'gov', anchor: 'governance',
    cqcName: 'Governance, management and sustainability',
    cqcUrl: 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/governance-management-sustainability',
    short: 'Governance', cardLine: 'Clear roles, risks managed, records you can show.', heroSub: 'Roles, risks, records',
    cardProducts: ['roles', 'coverage', 'alerts', 'gap', 'consistency'],
    bannerHead: 'Can you show CQC inspectors how you know your policies are followed?',
    bannerLine: 'CQC inspectors ask how leaders know what is happening in the service. CareStream keeps your policies, the people named in them and the training behind them in one place.',
    key: ['roles', 'matrix', 'coverage', 'alerts', 'gap', 'consistency', 'approval', 'report'],
  },
  {
    topic: 'learn', anchor: 'learning',
    cqcName: 'Learning, improvement and innovation',
    cqcUrl: 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/learning-improvement-innovation',
    short: 'Learning and improvement', cardLine: 'Learning that leads to change, with proof.', heroSub: 'Audits, training, proof',
    cardProducts: ['audits', 'training', 'analytics', 'report'],
    bannerHead: 'Can you show CQC inspectors what changed after the last audit?',
    bannerLine: 'CQC inspectors look for learning that leads to improvement. CareStream shows the audit, the action, the follow up and the re-check, with the results over time.',
    key: ['audits', 'training', 'analytics', 'knowledge', 'cpd'],
  },
  {
    topic: 'edi', anchor: 'inclusion',
    cqcName: 'Workforce equality, diversity and inclusion',
    cqcUrl: 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/workforce-equality-diversity-inclusion',
    short: 'Inclusion', cardLine: 'Every voice heard, every barrier removed.', heroSub: 'Every language, every voice',
    cardProducts: ['language', 'cpd', 'matrix'],
    bannerHead: 'Can you show CQC inspectors every member of staff understood their training?',
    bannerLine: 'CQC inspectors ask how leaders hear every voice and remove barriers. CareStream offers training in a person\'s own language on paid plans, and shows where language may be holding learning back.',
    key: ['language', 'training', 'cpd', 'knowledge', 'analytics'],
  },
  {
    topic: 'cult', anchor: 'direction',
    cqcName: 'Shared direction and culture',
    cqcUrl: 'https://www.cqc.org.uk/guidance-regulation/providers/assessment/single-assessment-framework/well-led/shared-direction-culture',
    short: 'Shared direction', cardLine: 'Staff who know what you are aiming for.', heroSub: 'Your policies, lived daily',
    cardProducts: ['knowledge', 'approval'],
    bannerHead: 'Can you show CQC inspectors your staff know what you are aiming for?',
    bannerLine: 'CQC inspectors look for a vision and values that staff understand and share. CareStream puts your own policies, and the named person for each role, in every member of staff\'s hand.',
    key: ['roles', 'knowledge', 'training', 'cpd', 'approval'],
  },
]

export const statementFor = (t: WellLedTopic): Statement => STATEMENTS.find(s => s.topic === t) ?? STATEMENTS[0]

// ── Which message a page gets ────────────────────────────────────────────────

const RX_EDI   = /language|translat|english|multilingual|interpret|inclusi|diversity/
const RX_GOV   = /polic|regulation|cqc|governance|compliance|inspector|inspection|evidence|consisten/
const RX_LEARN = /audit|follow-?up|training|learn|improv|gap|quiz|retention|competen|action|recheck|knowledge/
const RX_CULT  = /culture|induction|incentive|recogni|champion|leader|supervis|values|aiming|direction|vision|manager|hub|engagement|probation|team/

/** The Well-led message that suits a page, chosen from its address. Policy and regulation pages get Governance; language pages get Inclusion; audit and training pages get Learning. */
export function topicForPath(pathname: string): WellLedTopic {
  const p = pathname.toLowerCase()
  if (RX_EDI.test(p)) return 'edi'
  if (RX_GOV.test(p)) return 'gov'
  if (RX_LEARN.test(p)) return 'learn'
  if (RX_CULT.test(p)) return 'cult'
  return 'gov'
}

/** Pages the banner appears on: the searchable content pages. Never the index pages, the shop and checkout, sign in, legal, pricing or the hub itself. */
export function showsWellLedBanner(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '')
  if (/^\/(blog|scenarios|collection|care-audits|topics)\/[^/]+/.test(p)) return true
  if (/^\/care-policies\/[^/]+/.test(p)) return !/^\/care-policies\/(checkout|thank-you|packs)(\/|$)/.test(p)
  return false
}

export const hubHref = (topic: WellLedTopic, from: string) => `${HUB_PATH}?from=${from}-${topic}#${statementFor(topic).anchor}`
