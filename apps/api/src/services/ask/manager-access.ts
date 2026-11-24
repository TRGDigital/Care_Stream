// Managers (people whose job role is a care manager or registered manager, the same rule as policy and holiday approvals) can use Ask CareStream only when the account has
// switched on "Let managers use Ask CareStream" (Settings). They get a SAFE subset: no pay rates, no resident funding and no other person's holiday balance, unless the
// existing "Let managers see funding" switch allows pay and funding. Anything not listed here is blocked for managers (an allowlist), so a new tool is admin only until it is added.
export type AskRole = 'admin' | 'manager'

export const MANAGER_TOOLS = new Set([
  'staff_roster', 'staff_summary', 'staff_credentials_due', 'staff_record_gaps', 'care_setting', 'find_staff',
  'holiday_who_is_off', 'holiday_busiest_weeks', 'holiday_settings', 'statutory_minimum',
  'ask_actions_status', 'find_training_courses', 'where_to_do_this',
  'propose_staff_notification', 'propose_unread_reminder', 'propose_training_allocation', 'propose_training_reminders',
])
/** Added only when the account lets managers see pay and funding. */
export const MANAGER_MONEY_TOOLS = new Set(['pay_summary', 'pay_list', 'pay_gaps', 'pay_compare_nlw', 'staff_cost', 'get_figures', 'nlw_impact', 'pay_rise_cost', 'pay_review_table', 'fee_uplift_needed', 'funding_summary'])

export function toolAllowed(role: AskRole | undefined, moneyOk: boolean, tool: string): boolean {
  if (!role || role === 'admin') return true
  return MANAGER_TOOLS.has(tool) || (moneyOk && MANAGER_MONEY_TOOLS.has(tool))
}
/** The agents a manager sees: those that keep at least one allowed tool. */
export const agentForManager = (tools: string[], moneyOk: boolean): boolean => tools.some(t => toolAllowed('manager', moneyOk, t))

export const MANAGER_LINE = '\nThe person you are speaking with is a MANAGER, not an administrator. Pay rates, resident funding and other people\'s holiday balances are not available to you in this conversation (your tools do not return them). Do not offer them. You can help with the staff list, who is off, checks due, and proposing notifications, reminders and training for the staff they look after.'

/** Which Ask routes a manager may reach (everything else answers 404): the chat, their own conversations, and the action cards. Never settings, the library or approvals. */
export function managerMayReach(method: string, path: string): boolean {
  if (path === '/meta' || path === '/chat') return true
  if (/^\/conversations(\/[^/]+)?$/.test(path)) return true
  if (/^\/actions\/(staff|[^/]+(\/(confirm|cancel))?)$/.test(path) && !path.startsWith('/actions/settings')) return true
  return false
}
