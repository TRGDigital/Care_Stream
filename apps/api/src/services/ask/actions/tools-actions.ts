// The Ask CareStream action tools. They PROPOSE only (see propose.ts); the card the administrator sees is how anything gets done. Also two read tools the agents need to
// make good proposals: holiday_settings (so the agent knows the holiday year end) and find_training_courses.
import type { AskTool, ToolContext } from '../tools'
import { ownSource } from '../sources'
import { holidaySettings, holidayYearRows } from '../data'
import { proposeNotification, proposeUnreadReminder, proposeTrainingAllocation, proposeTrainingReminders, type ProposeResult } from './propose'
import { findModules } from './training-data'
import { tierCNote } from './tier-c'
import { loadAskSettings } from './settings'

const OWN = (label: string, ctx: ToolContext) => ownSource(`${label} (CareStream records)`, ctx.today)
const NO_SEND = 'A card is now waiting for the administrator to review. NOTHING has been sent or changed. Tell them to check the people and the wording on the card, then press Confirm.'

function done(ctx: ToolContext, r: ProposeResult) {
  if (!r.ok) return { data: { proposed: false, error: r.error }, sources: [] }
  ctx.collectProposal?.(r.action.id)
  const n = Array.isArray(r.action.payload?.user_ids) ? r.action.payload.user_ids.length : 0
  return { data: { proposed: true, card_id: r.action.id, type: r.action.type, recipients: n, notes: r.notes, message: NO_SEND }, sources: [] }
}
const pctx = (ctx: ToolContext) => ({ tenantId: ctx.tenantId, userId: ctx.userId, conversationId: ctx.conversationId ?? null })

const WHO = {
  audience: { type: 'string', enum: ['all', 'selected'], description: 'all = every active member of staff who can be reached. Use selected together with staff_names or job_role.' },
  staff_names: { type: 'array', items: { type: 'string' }, description: 'Full names of the people it is for (as found by your other tools).' },
  job_role: { type: 'string', description: 'Everyone whose job role contains this text.' },
}

export const ACTION_TOOLS: AskTool[] = [
  {
    name: 'holiday_settings',
    description: 'The holiday year for this account: its start and end dates, whether untaken holiday carries over, whether managers approve, and the most people who may be off at once. Use this for "when does the holiday year end".',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const s = await holidaySettings(ctx.tenantId)
      const y = await holidayYearRows(ctx.tenantId, ctx.today)
      return { data: { holiday_year: y.label, year_starts: y.from, year_ends: y.to, carry_over_on: s.carry_over, manager_approval_on: s.manager_approval, max_people_off_at_once: s.max_off }, sources: [OWN('Holiday settings', ctx)] }
    },
  },
  {
    name: 'find_training_courses',
    description: 'Find courses that can be allocated, by part of a name. Returns the course names that match.',
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    async run(ctx, input) {
      const m = await findModules(ctx.tenantId, [String(input?.name ?? '')])
      return { data: { courses: m.modules.map(x => x.name), others: m.alternatives, unmatched: m.unmatched }, sources: [OWN('Training courses', ctx)] }
    },
  },
  {
    name: 'ask_actions_status',
    description: 'Whether the administrator has switched on actions (notifications, training) in Settings, and the limits. Check this before promising an action.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { const s = await loadAskSettings(ctx.tenantId); return { data: { actions_enabled: s.actions_enabled, notifications: s.notifications_enabled, training: s.training_enabled, emails: s.emails_enabled, max_people_per_action: s.max_recipients }, sources: [] } },
  },
  {
    name: 'propose_staff_notification',
    description: 'PROPOSE a hub notification to staff (it is not sent until the administrator presses Confirm on the card). Give a short title and the message. You may use the placeholders {first_name}, {hours_left}, {hours_taken}, {holiday_year_end} and {training_due}: the system fills in each person\'s own figure.',
    input_schema: { type: 'object', properties: { title: { type: 'string', description: 'Up to 120 characters.' }, message: { type: 'string', description: 'The message, up to 2000 characters, plain text.' }, ...WHO, email: { type: 'boolean', description: 'Also email them (default yes, if emails are switched on).' }, reason: { type: 'string', description: 'One line on why these people were chosen.' } }, required: ['title', 'message'] },
    async run(ctx, input) { return done(ctx, await proposeNotification(pctx(ctx), input)) },
  },
  {
    name: 'propose_unread_reminder',
    description: 'PROPOSE a reminder to the people who have not read a staff notification. Give notification_id, or part of its title, or leave both out for the latest. Not sent until the administrator confirms.',
    input_schema: { type: 'object', properties: { notification_id: { type: 'string' }, title_contains: { type: 'string' } } },
    async run(ctx, input) { return done(ctx, await proposeUnreadReminder(pctx(ctx), input)) },
  },
  {
    name: 'propose_training_allocation',
    description: 'PROPOSE allocating one or more courses to staff, with an optional due date (YYYY-MM-DD). People who already have the course are skipped and shown on the card. Not done until the administrator confirms.',
    input_schema: { type: 'object', properties: { course_names: { type: 'array', items: { type: 'string' } }, ...WHO, due_date: { type: 'string' } }, required: ['course_names'] },
    async run(ctx, input) { return done(ctx, await proposeTrainingAllocation(pctx(ctx), input)) },
  },
  {
    name: 'propose_training_reminders',
    description: 'PROPOSE reminders for overdue training (scope overdue) or training due soon (scope due_soon, within_days). Optionally only for named people or a job role. Not sent until the administrator confirms.',
    input_schema: { type: 'object', properties: { scope: { type: 'string', enum: ['overdue', 'due_soon'] }, within_days: { type: 'number' }, staff_names: WHO.staff_names, job_role: WHO.job_role }, required: ['scope'] },
    async run(ctx, input) { return done(ctx, await proposeTrainingReminders(pctx(ctx), input)) },
  },
  {
    name: 'where_to_do_this',
    description: 'For something Ask CareStream cannot do itself (changing pay, approving or editing holiday, removing or archiving staff, permissions, sickness, anything financial): returns the screen where the administrator can do it.',
    input_schema: { type: 'object', properties: { request: { type: 'string', description: 'What the administrator asked for, in their words.' } }, required: ['request'] },
    async run(_ctx, input) { const t = tierCNote(String(input?.request ?? '')); return { data: t ? { cannot_do: t.label, open_this_screen: t.link, say: 'Ask CareStream does not do this itself. Tell the administrator to do it on that screen.' } : { cannot_do: 'unknown', say: 'Say that you cannot do that yourself and suggest the matching screen.' }, sources: [] } },
  },
]
