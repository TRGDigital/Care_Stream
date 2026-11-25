// A SAFETY NET for house rules 1, 2 and 7 (never end on a choice written in words). The prompt tells every agent to end with a question form, option cards or next step buttons, but a model
// can still write "Would you like to: 1. ... 2. ... What would you like to do?" and stop, which leaves the administrator with nothing to click. This runs on every finished answer, in plain
// code (no model): when the answer ENDS in a choice question and carries no questions, options or next_steps block, it appends a next_steps block of buttons so the chat never dead ends.
// It never changes the words the model wrote, it only adds the block at the end.

const HAS_BLOCK = /```\s*(questions|options|next_steps)\b/i
/** The phrases a choice question opens with. */
const CHOICE_PHRASE = /\b(would you like|would you prefer|do you want|do you need|shall i|should i|want me to|how would you like|what would you like|what do you want|which (?:one |option |would |do |of )?(?:you |these |them )?(?:would |do )?(?:you )?(?:prefer|like|want|choose)|let me know (?:which|what|if|whether)|what should i|where should i|who should i)\b/i
const LIST_ITEM = /^\s*(?:\d+[.)]|[-*•])\s+\S/

export interface Step { id: string; label: string; kind: 'ask' | 'action'; payload: string }

function lastParagraph(t: string): { para: string; before: string } {
  const text = t.trim(); const i = text.lastIndexOf('\n\n')
  return i < 0 ? { para: text, before: '' } : { para: text.slice(i + 2).trim(), before: text.slice(0, i) }
}

/** Phrases that INVITE the administrator to say what they want (a dead end whatever the punctuation): "What would you like me to change?", "Let me know", "I can adjust...", "Feel free to...". */
const INVITE = /\b(what would you like|would you like|would you prefer|shall i|should i|do you want|do you need|let me know|tell me (?:what|if|which)|i can (?:adjust|help|also|make|change|add|do|tweak|update|edit|amend|rewrite|write|create|draft|show|look)|i could (?:adjust|help|also|make|change|add|do)|feel free to|anything else|any other|any changes|how would you like|how should i|which (?:would you|do you|one|option)|what (?:changes|else|other|do you)|want me to|if you'd like|if you would like|if you want)\b/i

/** The last two sentences of an answer (a dead end can be in either). */
function lastSentences(t: string): string {
  const parts = String(t).trim().split(/(?<=[.!?])\s+(?=[A-Z"'“(])/)
  return parts.slice(-2).join(' ')
}

/** True when a finished answer ends with a choice or an invitation put in words and gives the administrator nothing to click. */
export function endsInProseChoice(answer: string): boolean {
  const t = String(answer ?? '').trim()
  if (!t || HAS_BLOCK.test(t)) return false
  const { para, before } = lastParagraph(t)
  const tail2 = lastSentences(para)
  if (INVITE.test(tail2) || INVITE.test(para)) return true
  if (/\?/.test(para)) return true    // a question mark anywhere in the last paragraph
  if (CHOICE_PHRASE.test(para) && /\?\s*[)"'”]*$/.test(para)) return true
  // a list of options followed by a short question ("1. ... 2. ... Which one?")
  const tail = (before ? before.split('\n').slice(-8) : []).concat(para.split('\n'))
  return tail.filter(l => LIST_ITEM.test(l)).length >= 2 && /\?/.test(para)
}

/** An open question about WHAT TO CHANGE put in words ("What would you like me to change? I can adjust the wording..."): it gets the Change questions form, never prose. */
export function isChangeQuestion(answer: string): boolean {
  const t = String(answer ?? '').trim()
  if (!t || HAS_BLOCK.test(t)) return false
  const { para } = lastParagraph(t)
  return /\b(what (?:would you like|do you want|should i|changes|would you want)|which (?:parts?|sections?|bits?)|how would you like|anything (?:you(?:'d| would) like|else) (?:me )?to)\b[^.?!]{0,60}\b(change|changed|edit|adjust|alter|amend|update|different|tweak|improve|revise|fix)\b/i.test(para)
    || /\bwhat (?:would you like|do you want) (?:me )?to (?:change|edit|adjust|alter|amend|update)\b/i.test(para)
    || /\b(?:i can adjust|i can change|i can edit|make any other edits|add or remove (?:sections|paragraphs))\b/i.test(para)
}

/** The questions form that replaces an open "what would you like to change?" (house rule 1): a choice plus a free text box, so nothing is ambiguous. */
export function changeMenuBlock(agentId?: string): string {
  const choices = agentId === 'letters' ? ['Wording', 'Tone', 'Add or remove a paragraph', 'Recipient', 'Sign off', 'Something else']
    : agentId === 'newsletter' ? ['Wording', 'Add or remove a section', 'Tone', 'People', 'Gift', 'Colours', 'Layout']
    : ['Wording', 'Tone', 'Add or remove something', 'Something else']
  const form = { title: 'What would you like to change?', questions: [
    { id: 'what', label: 'What would you like to change?', kind: 'choice', choices, required: false },
    { id: 'how', label: 'Tell me what to change', hint: 'For example: make the thank you warmer, or add a line about the summer fair.', kind: 'longtext', required: true },
  ] }
  return '```questions\n' + JSON.stringify(form) + '\n```'
}

const WORD = (t: string) => (String(t).match(/\S+/g) ?? []).length
/** A whole document pasted into the chat and not saved: the agent had a save tool, did not use it, and wrote 120 or more words that look like a draft (headings, a rule, a salutation). */
export function looksLikeUnsavedDocument(answer: string, o: { saveTools?: string[]; drafts?: number }): boolean {
  if (!(o.saveTools ?? []).length || (o.drafts ?? 0) > 0) return false
  const t = String(answer ?? '').replace(/```[\s\S]*?```/g, ' ').trim()
  if (WORD(t) < 120) return false
  return /^\s*-{3,}\s*$/m.test(t) || /^\s*#{1,3}\s+\S/m.test(t) || /^\s*dear\b/im.test(t) || /^\s*\*\*[^*\n]{2,60}\*\*\s*$/m.test(t) || /\n\s*\n[A-Z][^\n]{2,60}\n\n/.test(t) && /(?:thank|congratulat|delighted|regards|sincerely|yours)/i.test(t)
}
export const SAVE_DRAFT_STEP: Step = { id: 'save_draft', label: 'Save this as a draft', kind: 'ask', payload: 'Please save the text above as a draft now with your save tool. Do not paste the text again.' }

const DRAFT_STEPS: Step[] = [
  { id: 'edit', label: 'Edit the content', kind: 'action', payload: 'edit' },
  { id: 'preview', label: 'See the designed version', kind: 'action', payload: 'preview' },
  { id: 'save_library', label: 'Save to library', kind: 'action', payload: 'save_library' },
  { id: 'save_pdf', label: 'Save PDF', kind: 'action', payload: 'save_pdf' },
  { id: 'share', label: 'Send or share', kind: 'action', payload: 'share' },
]
const COLOUR_STEPS: Step[] = [
  { id: 'colour_choices', label: 'Show me the colour choices', kind: 'ask', payload: 'Show me the colour choices for this newsletter as cards I can preview.' },
  { id: 'block_look', label: "Change a block's look", kind: 'ask', payload: 'I want to change how one block looks.' },
  { id: 'reset_blocks', label: 'Reset all blocks', kind: 'ask', payload: 'Reset all the block looks to the default.' },
]
const LIST_STEPS: Step[] = [
  { id: 'show_choices', label: 'Show me the choices', kind: 'ask', payload: 'Please show the choices as cards or buttons instead of a list.' },
  { id: 'something_else', label: 'Something different', kind: 'ask', payload: 'I would like something different.' },
]
const CHANGE_STEP: Step = { id: 'change', label: 'Change something', kind: 'ask', payload: 'I would like to change something first.' }
const YES_STEPS: Step[] = [
  { id: 'yes', label: 'Yes, please', kind: 'ask', payload: 'Yes, please go ahead.' },
  { id: 'change', label: 'Change something', kind: 'ask', payload: 'I would like to change something first.' },
  { id: 'not_now', label: 'Not now', kind: 'ask', payload: 'No thank you, not now.' },
]

/** The buttons for a dead end, chosen from what the answer was about. Deterministic. */
export function fallbackSteps(answer: string, o: { agentId?: string; drafts?: number }): Step[] {
  const t = String(answer ?? '')
  if (o.agentId === 'newsletter' && /colou?r|palette|accent/i.test(t)) return COLOUR_STEPS
  if ((o.drafts ?? 0) > 0) return DRAFT_STEPS
  const { before, para } = lastParagraph(t.trim())
  const listed = (before ? before.split('\n').slice(-8) : []).concat(para.split('\n')).filter(l => LIST_ITEM.test(l)).length >= 2
  return listed ? LIST_STEPS : YES_STEPS
}

/** The default row for a reply that carries no block at all (even a plain answer): up to three buttons chosen by the kind of agent and the look of the answer. Never a "Would you like...". */
// Agents whose answers can be turned into a letter or newsletter for staff (the rest are about the account, the law or the data itself).
const DOCUMENT_AGENTS = new Set(['staff', 'holiday', 'pay', 'incentives', 'training', 'cpd', 'cqc-prep', 'audits', 'onboarding', 'compliance', 'governance', 'finance', 'analytics', 'cqc-analytics', 'knowledge'])
export function defaultSteps(agentId: string | undefined, answer: string): Step[] {
  const t = String(answer ?? '')
  const figures = /£\s?\d|\d+(?:\.\d+)?\s?%|\b\d{2,}\b/.test(t)
  const steps: Step[] = []
  if (figures) steps.push({ id: 'show_working', label: 'Show the working', kind: 'ask', payload: 'Please show the working behind those figures and say where each came from.' })
  if (!agentId || DOCUMENT_AGENTS.has(agentId)) steps.push({ id: 'make_document', label: 'Make a letter or newsletter from this', kind: 'ask', payload: 'Please turn this into a letter or a newsletter for me. Ask me with a form what you need.' })
  steps.push({ id: 'follow_up', label: 'Ask a follow up', kind: 'action', payload: 'follow_up' })
  return steps.slice(0, 3)
}
const isAcknowledgement = (t: string) => WORD(t) < 15
const isErrorMessage = (t: string) => /^(i could not finish|that took too long|something went wrong|sorry, i)/i.test(t.trim())
const block = (kind: 'next_steps', steps: Step[]) => `\n\n\`\`\`next_steps\n${JSON.stringify({ steps })}\n\`\`\``

/** The answer with the right block added when it would otherwise dead end. Never changes the model's words, only appends. `appended` says whether anything was added. */
export function withDeadEndFallback(answer: string, o: { agentId?: string; drafts?: number; saveTools?: string[] } = {}): { text: string; appended: boolean } {
  const fixed = optionsUsedAsNextSteps(answer); if (fixed.changed) answer = fixed.text   // option cards with nothing to preview are next steps: show them as buttons
  const a = String(answer ?? '')
  if (HAS_BLOCK.test(a)) return { text: a, appended: fixed.changed }
  const base = a.trimEnd()
  // 1) a whole draft pasted into the chat and not saved: offer to save it (with Change and Not now)
  if (looksLikeUnsavedDocument(a, o)) return { text: base + block('next_steps', [SAVE_DRAFT_STEP, CHANGE_STEP]), appended: true }
  // 2) an open "what would you like to change?" in words becomes the Change questions form
  if (isChangeQuestion(a)) return { text: base + '\n\n' + changeMenuBlock(o.agentId), appended: true }
  // 3) any other invitation or choice in words
  if (endsInProseChoice(a)) return { text: base + block('next_steps', fallbackSteps(a, o)), appended: true }
  // 4) catch all: a reply with no block at all gets a small default row (not for one line acknowledgements or errors)
  if (!isAcknowledgement(a) && !isErrorMessage(a) && (o.drafts ?? 0) === 0) return { text: base + block('next_steps', defaultSteps(o.agentId, a)), appended: true }
  return { text: a, appended: fixed.changed }
}

// Option cards are for choosing between designs or documents that can be PREVIEWED. A model sometimes writes its NEXT STEPS as an options block (cards with nothing to preview, "This option has no
// designed preview yet"). When no option in a block has a real preview kind, this rewrites that block as a next_steps block so the administrator gets buttons, not empty cards. Plain code, no model.
const REAL_PREVIEW = new Set(['newsletter', 'letter', 'report', 'notification', 'email', 'newsletter_palette'])
export function optionsUsedAsNextSteps(answer: string): { text: string; changed: boolean } {
  let changed = false
  const text = String(answer ?? '').replace(/```\s*options\b[^\n]*\n([\s\S]*?)```/gi, (whole, raw: string) => {
    let j: any; try { j = JSON.parse(String(raw).trim()) } catch { return whole }
    const list: any[] | null = Array.isArray(j) ? j : Array.isArray(j?.options) ? j.options : null
    if (!list || !list.length) return whole
    if (list.some(o => REAL_PREVIEW.has(String(o?.preview?.kind ?? '').toLowerCase()))) return whole
    const steps = list.slice(0, 5).map((o, i) => ({ id: String(o?.id ?? `n${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '') || `n${i + 1}`, label: String(o?.title ?? o?.label ?? '').trim().slice(0, 60), kind: 'ask', payload: String(o?.description ?? '').trim().slice(0, 200) })).filter(x => x.label)
    if (!steps.length) return whole
    changed = true
    return '```next_steps\n' + JSON.stringify({ steps }) + '\n```'
  })
  return { text, changed }
}
