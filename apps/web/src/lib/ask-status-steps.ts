// HOUSE RULE 15: buttons that follow where the document is (draft, waiting, approved, shared). Pure and tested. The agent's own wording never decides which document step is offered: this does.
// A step that cannot be used yet stays visible but greyed, with a short reason. The model's other buttons (questions, links, follow ups) are kept after the document steps.
import type { NextStep } from '@/lib/ask-blocks'

export type DocState = 'draft' | 'pending' | 'approved' | 'shared'
export interface StepWithReason extends NextStep { reason?: string }

const DOC_ACTIONS = new Set(['edit', 'preview', 'share', 'choose_who', 'send', 'save_pdf', 'print', 'save_library', 'colours', 'add_block'])
const step = (id: string, label: string, payload: string, reason?: string): StepWithReason => ({ id, label, kind: 'action', payload, ...(reason ? { reason } : {}) })

export function statusSteps(given: NextStep[], status: string | null | undefined): StepWithReason[] {
  if (status !== 'draft' && status !== 'pending' && status !== 'approved' && status !== 'shared') return given
  const others = given.filter(s => !(s.kind === 'action' && DOC_ACTIONS.has(String(s.payload))))
  const doc: StepWithReason[] =
    status === 'draft' ? [step('open_draft', 'Open the draft', 'edit'), step('submit', 'Submit for approval', 'edit'), step('share_wait', 'Share it', 'share', 'It needs approval first'), step('save_pdf', 'Save PDF', 'save_pdf')]
    : status === 'pending' ? [step('open_approve', 'Open to approve', 'edit'), step('share_wait', 'Share it', 'share', 'Waiting for approval'), step('save_pdf', 'Save PDF', 'save_pdf')]
    : status === 'approved' ? [step('share', 'Share it', 'share'), step('open_draft', 'Open it', 'edit'), step('save_pdf', 'Save PDF', 'save_pdf'), step('print', 'Print', 'print')]
    : [step('who_got', 'View who got it', 'edit'), step('save_pdf', 'Save PDF', 'save_pdf'), step('print', 'Print', 'print')]
  return [...doc, ...others].slice(0, 6)
}
