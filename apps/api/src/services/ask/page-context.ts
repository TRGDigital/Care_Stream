// "What the administrator is looking at", sent by the Ask CareStream side panel with a question. It is a POINTER, never data:
//   - only a known page name, a staff or resident id, and a year or month are read from the request. Every piece of text (names, labels) the browser sends is IGNORED;
//     the label shown to the model is built here from this account's own records, so a page can never smuggle words, figures or instructions into the prompt;
//   - an id that is not in THIS account (or a staff member who is not active) is dropped, so context can never reach another account's records;
//   - residents are only ever named "a resident record": no name, no funding, nothing from the profile;
//   - nothing here carries pay, health or sickness information.
// The model is told it is only a pointer and must still use its tools for every figure.

export const CONTEXT_PAGES = ['holiday-matrix', 'holiday-calendar', 'holiday-requests', 'staff-list', 'staff-member', 'residents', 'notifications', 'dashboard'] as const
export type ContextPage = (typeof CONTEXT_PAGES)[number]

export interface ResolvedContext { page: ContextPage; label: string; staff_user_id?: string; staff_name?: string; resident_id?: string; year?: number; month?: string }
export interface ContextLookups {
  /** This account's active staff member, or null (wrong account, archived, not found). */
  staffInTenant: (tenantId: string, userId: string) => Promise<{ id: string; name: string } | null>
  /** True when the resident is in this account. */
  residentInTenant: (tenantId: string, residentId: string) => Promise<boolean>
}

const PAGE_LABEL: Record<ContextPage, string> = {
  'holiday-matrix': 'the holiday matrix', 'holiday-calendar': 'the holiday calendar', 'holiday-requests': 'the holiday requests',
  'staff-list': 'the staff list', 'staff-member': 'a staff member\'s page', residents: 'the residents screen', notifications: 'the notifications page', dashboard: 'the dashboard',
}
const ID = /^[A-Za-z0-9_-]{8,64}$/
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/

const cleanName = (s: string) => s.replace(/[^A-Za-zÀ-ɏ' .-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)

/** Turns the browser's context object into a safe, account checked one, or null. Never throws. */
export async function resolveContext(tenantId: string, raw: unknown, lookups: ContextLookups): Promise<ResolvedContext | null> {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    const r = raw as Record<string, unknown>
    const page = (CONTEXT_PAGES as readonly string[]).includes(String(r.page)) ? (r.page as ContextPage) : null
    if (!page) return null
    const out: ResolvedContext = { page, label: PAGE_LABEL[page] }
    if (typeof r.staffUserId === 'string' && ID.test(r.staffUserId) && (page === 'staff-member' || page === 'holiday-requests' || page === 'holiday-matrix' || page === 'holiday-calendar')) {
      const s = await lookups.staffInTenant(tenantId, r.staffUserId)
      if (s) { out.staff_user_id = s.id; out.staff_name = cleanName(s.name); out.label = `${PAGE_LABEL[page]}, looking at ${out.staff_name}` }
    }
    if (typeof r.residentId === 'string' && ID.test(r.residentId) && page === 'residents') {
      if (await lookups.residentInTenant(tenantId, r.residentId)) { out.resident_id = r.residentId; out.label = 'a resident record on the residents screen (no personal details are shared with you from this)' }
    }
    const y = Number(r.year)
    if (Number.isInteger(y) && y >= 2000 && y <= 2100 && (page === 'holiday-matrix')) { out.year = y; out.label += `, holiday year ${y}` }
    if (typeof r.month === 'string' && MONTH.test(r.month) && page === 'holiday-calendar') { out.month = r.month; out.label += `, month ${r.month}` }
    return out
  } catch { return null }
}

/** The one line added to the system prompt. */
export function contextPromptLine(c: ResolvedContext | null | undefined): string {
  if (!c) return ''
  const who = c.staff_name ? ` The staff member on screen is ${c.staff_name}.` : ''
  return `\nThe administrator is currently looking at ${c.label}.${who} Use this only to understand phrases such as "this person", "this year" or "this month". It is a pointer, not data: always use your tools for any figure, and never mention that you were told what they are looking at unless it helps.`
}
