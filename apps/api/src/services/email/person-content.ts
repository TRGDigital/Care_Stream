// The words of every person-led staff message, built ONCE and used for both the email (outbound.ts) and the hub overlay
// (staff_notices). Pure functions, no database and no network, so the email and the overlay can never drift apart.
// Each builder takes the acting person's name (the headline starts with it) and returns the headline, an optional intro, the
// detail rows, the button label and the hub path the button opens, plus the short phrase used in the email footer.

export type AllocationKind = 'induction' | 'training' | 'annual_training' | 'cqc_prep' | 'follow_up'

export interface NoticeDetail { label: string; value: string }

export interface PersonContent {
  headline: string
  intro?: string
  /** Rows for the details card. Empty values are already left out. */
  details: NoticeDetail[]
  /** Email only: ready-made HTML for the card, where the email shows richer markup than plain rows. */
  bodyHtml?: string
  buttonLabel: string | null
  /** Relative hub path, for example "/chat?view=training". Null when there is no button. */
  path: string | null
  /** Completes "You received this because <name> ... in CareStream", for the email footer. */
  footerDid: string
}

const keep = (rows: Array<{ label: string; value: string | null | undefined }>): NoticeDetail[] =>
  rows.filter(r => r.value !== null && r.value !== undefined && String(r.value).trim() !== '').map(r => ({ label: r.label, value: String(r.value) }))

export const ALLOC_COPY: Record<AllocationKind, { noun: string; path: string; cta: string }> = {
  induction:       { noun: 'induction',       path: '/chat?view=induction', cta: 'Start my induction' },
  training:        { noun: 'training',         path: '/chat?view=training',  cta: 'Go to my training' },
  annual_training: { noun: 'annual training',  path: '/chat?view=annual',    cta: 'Start annual training' },
  follow_up:       { noun: 'follow-up',        path: '/chat?view=followup',  cta: 'Complete my follow-up' },
  cqc_prep:        { noun: 'CQC prep',          path: '/cqc',                 cta: 'View my CQC questions' },
}

export const ALLOC_THING: Record<AllocationKind, string> = {
  induction: 'an induction', training: 'training', annual_training: 'annual training', follow_up: 'a follow-up', cqc_prep: 'CQC prep questions',
}

export const fmtDue = (d: Date | string | null | undefined): string | null =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null

/** Plain text from a small piece of email HTML: paragraphs become lines, tags and entities are removed. */
export function htmlToText(html: string): string {
  return String(html ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|tr)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&rsquo;|&lsquo;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .split('\n').map(l => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n')
}

/** "Sarah Jones has allocated you training". */
export function allocationContent(adminName: string, kind: AllocationKind): PersonContent {
  const c = ALLOC_COPY[kind], thing = ALLOC_THING[kind]
  return {
    headline: `${adminName} has allocated you ${thing}`,
    intro: 'Open the hub to get started. You can do it on your phone or computer.',
    details: keep([{ label: 'Allocated', value: `New ${c.noun}` }, { label: 'Where', value: 'Your CareStream hub' }]),
    buttonLabel: c.cta, path: c.path, footerDid: `allocated you ${thing}`,
  }
}

/** The manual "Re-send email" reminder for one course. */
export function trainingReminderContent(adminName: string, o: { courseName: string; dueDate: Date | null; kind: 'training' | 'annual_training' }): PersonContent {
  const c = ALLOC_COPY[o.kind]
  return {
    headline: `${adminName} sent you a reminder about ${o.courseName}`,
    intro: 'You can do it on your phone or computer, and your progress is saved as you go.',
    details: keep([{ label: 'Course', value: o.courseName }, { label: 'Due by', value: fmtDue(o.dueDate) }]),
    buttonLabel: c.cta, path: c.path, footerDid: 'sent you a training reminder',
  }
}

export function faceToFaceReminderContent(adminName: string, o: { title: string; dateLabel: string; trainerLabel?: string | null }): PersonContent {
  return {
    headline: `${adminName} sent you a reminder about a training session`,
    intro: 'You are booked into a face-to-face training session. Please make sure you attend. If you cannot make it, let your manager know as soon as possible.',
    details: keep([{ label: 'Training', value: o.title }, { label: 'Date', value: o.dateLabel }, { label: 'Delivered by', value: o.trainerLabel }]),
    buttonLabel: 'See my training progress', path: '/chat?view=progress', footerDid: 'sent you a session reminder',
  }
}

export function cqcPrepContent(adminName: string, questionCount: number): PersonContent {
  const thing = `${questionCount} CQC prep ${questionCount === 1 ? 'question' : 'questions'}`
  return {
    headline: `${adminName} has allocated you ${thing}`,
    intro: 'Take a few minutes to review and prepare your answers before the next inspection.',
    details: keep([{ label: 'Allocated', value: thing }, { label: 'Where', value: 'Your CareStream hub, on your phone or computer' }]),
    buttonLabel: 'View my CQC questions', path: '/cqc', footerDid: 'allocated you CQC prep questions',
  }
}

/** Enrolled on an induction. The email shows the supplied HTML; the overlay shows the same words as plain text. */
export function onboardingContent(adminName: string, bodyHtml: string): PersonContent {
  return {
    headline: `${adminName} has enrolled you on an induction`,
    details: keep([{ label: 'Details', value: htmlToText(bodyHtml) }]), bodyHtml,
    buttonLabel: 'Start my induction', path: '/chat?view=induction', footerDid: 'enrolled you on an induction',
  }
}

/** The free-form update emails (audit assigned, supervision booked). */
export function updateContent(adminName: string, o: { personAction?: string; bodyHtml: string; buttonLabel?: string; path?: string | null }): PersonContent {
  const action = o.personAction || 'has sent you an update'
  return {
    headline: `${adminName} ${action}`,
    details: keep([{ label: 'Details', value: htmlToText(o.bodyHtml) }]), bodyHtml: o.bodyHtml,
    buttonLabel: o.buttonLabel || 'Open in your hub', path: o.path || '/chat', footerDid: 'sent you this',
  }
}

export interface ActionLineLike { description: string; priority: string; due_date: string | null; audit_name: string }
const PRIORITY_WORDS: Record<string, string> = { immediate: 'Do now', priority: 'Priority', monitor: 'Monitor' }

export function actionPlanContent(adminName: string, actions: ActionLineLike[]): PersonContent {
  const n = actions.length
  const what = `${n} audit action${n === 1 ? '' : 's'}`
  return {
    headline: `${adminName} has assigned you ${what}`,
    intro: `Please complete ${n === 1 ? 'it' : 'them'} and mark ${n === 1 ? 'it' : 'each one'} done in your CareStream hub, under My actions.`,
    details: keep(actions.map(a => {
      const due = a.due_date ? new Date(a.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
      return { label: PRIORITY_WORDS[a.priority] ?? 'Priority', value: `${a.description} (${[a.audit_name, due ? `due ${due}` : ''].filter(Boolean).join(', ')})` }
    })),
    buttonLabel: 'Open my actions', path: '/chat?view=actions', footerDid: `assigned you ${what} from an audit action plan`,
  }
}
