// The Ask CareStream prompts that can be edited on the platform Prompts page (/platform/prompts, group "Ask CareStream").
//
// Each prompt has a code DEFAULT (the wording that shipped), shown on the Prompts page even before anyone edits it. The runner reads the edited text through a
// cached lookup and falls back to the default on any error or empty text, so a prompt problem can never stop an answer. The LOCKED rules (safety.ts) are always added
// AFTER the editable text, so an edit can sharpen tone and answers but can never remove the privacy and safety rules.
import { prisma } from '../../db/client'
import { AGENTS, HOUSE_RULES, type AgentDef } from './agents'
import { LOCKED_RULES } from './safety'
import { DEFAULT_ACTIONS_RULES, ACTION_TOOL_NAMES } from './actions/prompts'
import { KNOWLEDGE_PROMPTS } from './agents-knowledge'
import { uploadPromptMeta } from './agents-uploads'
import { HOUSE_RULES_FORMS_USAGE, DEFAULT_HOUSE_RULES_FORMS, HOUSE_RULES_FORMS_LABEL } from './house-rules-forms'

export const ASK_GROUP = 'Ask CareStream'
export const ASK_PROMPT_MAX = 14000   // the shared house rules entry is long (ten rules with examples), so there is room to edit it
const CACHE_MS = 60_000

export interface AskPromptMeta { usage: string; label: string; note: string; default: string }

// Letters and the newsletter keep their drafting rules in the last paragraph of their prompt; they are separate prompts so the wording can be tuned on its own.
function splitLast(text: string): [string, string] {
  const i = text.lastIndexOf('\n')
  return i < 0 ? [text, ''] : [text.slice(0, i), text.slice(i + 1)]
}
const jobOf = (id: string) => AGENTS.find(a => a.id === id)?.prompt ?? ''
const [LETTERS_JOB, LETTERS_DRAFTING] = splitLast(jobOf('letters'))
const [NEWSLETTER_JOB, NEWSLETTER_DRAFTING] = splitLast(jobOf('newsletter'))

export const DEFAULT_PAGE_CONTEXT = 'The administrator is currently looking at {{label}}.{{who}} Use this only to understand phrases such as "this person", "this year" or "this month". It is a pointer, not data: always use your tools for any figure, and never mention that you were told what they are looking at unless it helps.'

export const ASK_PROMPTS: AskPromptMeta[] = [
  { usage: 'ask_house_rules', label: 'Ask CareStream: house rules', default: HOUSE_RULES,
    note: 'Used at the start of every answer by every Ask CareStream agent: how it answers, its tone, British English, no dashes, showing working. The privacy and safety rules are separate and locked.' },
  { usage: HOUSE_RULES_FORMS_USAGE, label: HOUSE_RULES_FORMS_LABEL, default: DEFAULT_HOUSE_RULES_FORMS,
    note: 'Added to EVERY Ask CareStream agent after its own job and before the locked rules. It holds nine of the ten house rules: 1 question forms (one labelled box per question), 2 option previews (cards with a Preview button), 3 the staff list with pictures, 4 Save PDF and Print on every document, 5 the distribution choice (how, who, a summary, then Send), 7 next step buttons, 8 context awareness (use what was already said), 9 a gentle check on unexpected choices (one line with buttons when a choice differs from what was said), and 10 document layout (screen, PDF and print match; newsletters are one page, portrait or landscape; letters never split a paragraph across pages). Rule 6, never reveal how CareStream works, is locked and is not here. The screen reads the three block formats (questions, options, next_steps), so keep the examples as they are.' },
  { usage: 'ask_agent_staff', label: 'Ask CareStream: Staff agent', default: jobOf('staff'),
    note: 'Used after the house rules when an administrator picks the Staff agent: roster, hours, checks due, pay questions. It chooses from the Staff agent tools.' },
  { usage: 'ask_agent_holiday', label: 'Ask CareStream: Holiday agent', default: jobOf('holiday'),
    note: 'Used for the Holiday agent: balances, who is off, liability, starters and leavers (the entitlement calculator).' },
  { usage: 'ask_agent_pay', label: 'Ask CareStream: Pay and inflation agent', default: jobOf('pay'),
    note: 'Used for the Pay and inflation agent: minimum wage, inflation, pay scenarios and fee uplift.' },
  { usage: 'ask_agent_letters', label: 'Ask CareStream: Letters agent', default: LETTERS_JOB,
    note: 'Used for the Letters agent: the steps for choosing a template, finding the person, asking for missing values and saving a draft. The drafting rules are the next prompt.' },
  { usage: 'ask_letter_drafting', label: 'Ask CareStream: letter drafting rules', default: LETTERS_DRAFTING,
    note: 'Added to the Letters agent prompt: how it handles working, wording and the not legal advice line.' },
  { usage: 'ask_agent_newsletter', label: 'Ask CareStream: Staff newsletter agent', default: NEWSLETTER_JOB,
    note: 'Used for the Staff newsletter agent: internal staff newsletters only, the steps and the data it may use. The accuracy and tone rules are the next prompt.' },
  { usage: 'ask_newsletter_drafting', label: 'Ask CareStream: newsletter accuracy and tone', default: NEWSLETTER_DRAFTING,
    note: 'Added to the Staff newsletter agent prompt: British English, short paragraphs, no dashes, no superlatives, no invented figures.' },
  { usage: 'ask_agent_notifications', label: 'Ask CareStream: Notifications agent', default: jobOf('notifications'),
    note: 'Used for the Notifications agent: drafts a short staff message and the fenced block that opens it in Notifications. It never sends.' },
  { usage: 'ask_agent_analytics', label: 'Ask CareStream: Analytics agent', default: jobOf('analytics'),
    note: 'Used for the Analytics agent: how the team uses CareStream, what staff ask about and where CareStream could not answer.' },
  { usage: 'ask_agent_cqc_analytics', label: 'Ask CareStream: CQC analytics agent', default: jobOf('cqc-analytics'),
    note: 'Used for the CQC analytics agent: how records line up with the five CQC key questions. Policy gap detail stays on the Policy Gaps page.' },
  { usage: 'ask_agent_cqc_prep', label: 'Ask CareStream: CQC prep agent', default: jobOf('cqc-prep'),
    note: 'Used for the CQC prep agent: how staff are doing with CQC prep questions and where to focus.' },
  { usage: 'ask_agent_audits', label: 'Ask CareStream: Audits agent', default: jobOf('audits'),
    note: 'Used for the Audits agent: scores and trends, repeat failures, overdue audits and actions.' },
  { usage: 'ask_agent_governance', label: 'Ask CareStream: Governance reports agent', default: jobOf('governance'),
    note: 'Used for the Governance reports agent: builds a monthly governance review from the home\'s own figures and saves it as a draft for approval.' },
  { usage: 'ask_agent_finance', label: 'Ask CareStream: Finance and pay agent', default: jobOf('finance'),
    note: 'Used for the Finance and pay agent: fee income, staff cost, break even, fee reviews, premium pay and the value of untaken holiday. All locked data, administrators only. It is told never to call income less staff cost profit.' },
  { usage: 'ask_agent_complaints', label: 'Ask CareStream: Complaints and incidents agent', default: jobOf('complaints'),
    note: 'Used for the Complaints and incidents agent: it reads audit results and actions (CareStream holds no complaints register), and themes in text the administrator pastes after removing names.' },
  { usage: 'ask_actions_rules', label: 'Ask CareStream: how agents use actions', default: DEFAULT_ACTIONS_RULES,
    note: 'Added for any agent that can propose actions (notifications, reminders, training): how to propose, the personalised placeholders, and what to do when asked for something it cannot do. Nothing it proposes happens until the administrator presses Confirm; that and the privacy rules are locked in code.' },
  ...KNOWLEDGE_PROMPTS,
  { usage: 'ask_page_context', label: 'Ask CareStream: page context line', default: DEFAULT_PAGE_CONTEXT,
    note: 'One line added when the administrator is looking at a page. Placeholders: {{label}} (what they are looking at) and {{who}} (the staff member on screen, if any, already written as a sentence).' },
]
ASK_PROMPTS.push(...uploadPromptMeta())   // uploaded files (agents-uploads.ts)
import { peoplePromptMeta } from './agents-people'; ASK_PROMPTS.push(...peoplePromptMeta())   // people development agents (training, CPD, onboarding, compliance, incentives)
export const ASK_USAGES = ASK_PROMPTS.map(p => p.usage)
export const isAskUsage = (u: string) => u.startsWith('ask_')
export const askDefault = (usage: string) => ASK_PROMPTS.find(p => p.usage === usage)?.default ?? ''

// ── Reading an editable prompt: cached, never throws, never blank ────────────────
type Reader = (usage: string) => Promise<string | null | undefined>
const dbReader: Reader = async usage => ((await (prisma as any).aiPrompt.findUnique({ where: { usage }, select: { content: true } })) as any)?.content
let reader: Reader = dbReader
let clock: () => number = Date.now
const cache = new Map<string, { at: number; text: string }>()
export function __setPromptTestHooks(h: { reader?: Reader | null; clock?: (() => number) | null }) { reader = h.reader ?? dbReader; clock = h.clock ?? Date.now; cache.clear() }
export function clearAskPromptCache() { cache.clear() }

/** The text to use for a prompt: the edited text when there is one, else the code default. A failed or empty lookup falls back and is not cached for long. */
export async function askPrompt(usage: string): Promise<string> {
  const fallback = askDefault(usage)
  const hit = cache.get(usage)
  const now = clock()
  if (hit && now - hit.at < CACHE_MS) return hit.text
  let text = fallback, ok = false
  try {
    const row = await reader(usage)
    text = typeof row === 'string' && row.trim() ? row.trim() : fallback
    ok = true
  } catch { text = fallback }
  cache.set(usage, { at: ok ? now : now - CACHE_MS + 5_000, text })   // after a failed lookup try again in about 5 seconds
  return text
}

// ── Putting it together ───────────────────────────────────────────────────────────
/** The system prompt for one run: house rules, today, this agent's job (and its drafting rules), the page line, then the LOCKED rules last. */
export async function buildSystemPrompt(a: AgentDef, today: string, orgName: string, pageLine: string): Promise<string> {
  const actions = a.tools.some(t => (ACTION_TOOL_NAMES as readonly string[]).includes(t)) ? await askPrompt('ask_actions_rules') : ''
  const [house, forms, job, drafting] = await Promise.all([
    askPrompt('ask_house_rules'),
    askPrompt(HOUSE_RULES_FORMS_USAGE),
    askPrompt(`ask_agent_${a.id.replace(/-/g, '_')}`),
    a.id === 'letters' ? askPrompt('ask_letter_drafting') : a.id === 'newsletter' ? askPrompt('ask_newsletter_drafting') : Promise.resolve(''),
  ])
  const uploads = a.uploads ? (await Promise.all([askPrompt('ask_uploads_rules'), askPrompt(`ask_uploads_${a.id.replace(/-/g, '_')}`)])).filter(Boolean).join('\n') : ''
  const jobText = [job, drafting, actions, uploads].filter(Boolean).join('\n')
  return `${house}\n\nTODAY: ${today} (UK). ORGANISATION: ${orgName}.\n\nYOUR JOB: ${jobText}${pageLine}\n\n${forms}\n\n${LOCKED_RULES}`
}

/** The page context line from the editable template. */
export async function pageContextLine(c: { label: string; staff_name?: string | null } | null | undefined): Promise<string> {
  if (!c) return ''
  const who = c.staff_name ? ` The staff member on screen is ${c.staff_name}.` : ''
  const t = await askPrompt('ask_page_context')
  return '\n' + t.replace(/\{\{\s*label\s*\}\}/g, c.label).replace(/\{\{\s*who\s*\}\}/g, who)
}

// ── Saving: what an edit may not do ───────────────────────────────────────────────
const ATTEMPTS: RegExp[] = [
  /ignore (all |any |the |your )?(previous |above |earlier |safety |privacy |locked )*(rules|instructions|safety|restrictions)/i,
  /disregard (all |any |the |your )?(previous |above |safety |privacy |locked )*(rules|instructions|safety|restrictions)/i,
  /(reveal|show|print|output|repeat) (me )?(the |your )?(system|hidden|locked) (prompt|instructions|rules)/i,
  /(share|give|show|reveal) (the |their |staff )?(sickness|health|medical)/i,
  /(show|reveal|share|include) (dates? of birth|date of birth|dob|(email|phone|contact) (addresses|numbers|details))/i,
  /(disable|remove|override|turn off|bypass) (the |all |your )?(safety|privacy|locked) (rules|checks|restrictions)/i,
]
/** A reason the edit cannot be saved, or null when it is fine. */
export function validateAskPrompt(usage: string, content: unknown): string | null {
  if (!isAskUsage(usage)) return null
  const text = typeof content === 'string' ? content.trim() : ''
  if (!text) return 'This prompt cannot be empty. Ask CareStream needs it to answer.'
  if (text.length > ASK_PROMPT_MAX) return `This prompt is ${text.length.toLocaleString()} characters. Ask CareStream prompts can be up to ${ASK_PROMPT_MAX.toLocaleString()}.`
  // A line that forbids something ("never reveal the system prompt") is fine; a line that asks for it is not.
  const asks = text.split(/\n+/).filter(line => !/\b(never|do not|don't|must not|cannot|can't|not allowed|refuse)\b/i.test(line))
  for (const re of ATTEMPTS) if (asks.some(line => re.test(line))) return 'This wording tries to switch off the locked safety or privacy rules, which cannot be changed here. Please remove that instruction.'
  return null
}
