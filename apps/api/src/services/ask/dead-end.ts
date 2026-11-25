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

/** True when a finished answer ends with a choice put in words and gives the administrator nothing to click. */
export function endsInProseChoice(answer: string): boolean {
  const t = String(answer ?? '').trim()
  if (!t || HAS_BLOCK.test(t)) return false
  const { para, before } = lastParagraph(t)
  if (!/\?\s*[)"'”]*$/.test(para)) return false
  if (CHOICE_PHRASE.test(para)) return true
  // a list of options followed by a short question ("1. ... 2. ... Which one?")
  const tail = (before ? before.split('\n').slice(-8) : []).concat(para.split('\n'))
  return tail.filter(l => LIST_ITEM.test(l)).length >= 2
}

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

/** The answer, with a next_steps block added only when it would otherwise dead end. `appended` says whether it did. */
export function withDeadEndFallback(answer: string, o: { agentId?: string; drafts?: number } = {}): { text: string; appended: boolean } {
  if (!endsInProseChoice(answer)) return { text: answer, appended: false }
  const steps = fallbackSteps(answer, o)
  return { text: `${String(answer).trimEnd()}\n\n\`\`\`next_steps\n${JSON.stringify({ steps })}\n\`\`\``, appended: true }
}
