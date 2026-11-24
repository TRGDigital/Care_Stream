// The pure rules of the Ask CareStream side panel: how wide it may be, what is remembered between visits, which layout a screen gets, and which agent and
// starter questions suit the page the admin is on. No React and no browser here, so it is easy to test.

export const MIN_W = 420
export const MAX_W = 960
export const DEFAULT_W = 720      // the wide view is the default (like the wide Orrery panel); it can still be dragged narrower or wider
export const WIDE_FROM = 1280      // from this width the panel pushes the page across; below it the panel sits over the page
export const PHONE_BELOW = 640     // below this width it is a full screen sheet

export type PanelLayout = 'phone' | 'narrow' | 'wide'
export const layoutFor = (viewportWidth: number): PanelLayout => (viewportWidth < PHONE_BELOW ? 'phone' : viewportWidth < WIDE_FROM ? 'narrow' : 'wide')

/** Keeps the width inside the allowed range (and never wider than 90 percent of a small screen). */
export function clampWidth(w: number, viewportWidth?: number): number {
  const n = Number.isFinite(w) ? Math.round(w) : DEFAULT_W
  const max = viewportWidth ? Math.max(MIN_W, Math.min(MAX_W, Math.floor(viewportWidth * 0.9))) : MAX_W
  return Math.min(max, Math.max(MIN_W, n))
}

export interface PanelPrefs { open: boolean; width: number }
export const prefsKey = (who: string) => `cs-ask-panel-v2:${String(who || 'guest').toLowerCase()}`
export function parsePrefs(raw: string | null | undefined): PanelPrefs {
  try {
    const v = JSON.parse(String(raw ?? ''))
    return { open: v?.open === true, width: clampWidth(Number(v?.width)) }
  } catch { return { open: false, width: DEFAULT_W } }
}
export const serializePrefs = (p: PanelPrefs): string => JSON.stringify({ open: !!p.open, width: clampWidth(p.width) })

/** Reads and writes the remembered state without ever throwing (storage can be blocked). */
export function loadPrefs(who: string, storage: Pick<Storage, 'getItem'> | null): PanelPrefs {
  try { return parsePrefs(storage?.getItem(prefsKey(who))) } catch { return { open: false, width: DEFAULT_W } }
}
export function savePrefs(who: string, p: PanelPrefs, storage: Pick<Storage, 'setItem'> | null): void {
  try { storage?.setItem(prefsKey(who), serializePrefs(p)) } catch { /* storage blocked */ }
}

// ── Page context ────────────────────────────────────────────────────────────
export type ContextPageName = 'holiday-matrix' | 'holiday-calendar' | 'holiday-requests' | 'staff-list' | 'staff-member' | 'residents' | 'notifications' | 'dashboard'
export interface AskPageContext { page: ContextPageName; label: string; staffUserId?: string; staffName?: string; residentId?: string; year?: number; month?: string }

/** The agent that suits a page, or null when none does. */
export function agentForPage(page: ContextPageName): string | null {
  switch (page) {
    case 'holiday-matrix': case 'holiday-calendar': case 'holiday-requests': return 'holiday'
    case 'staff-list': case 'staff-member': return 'staff'
    case 'notifications': return 'notifications'
    case 'residents': return 'pay'
    default: return null
  }
}

const first = (name?: string) => (name ?? '').trim().split(/\s+/)[0] || 'this person'

/** Two or three starter questions that fit the page. */
export function contextStarters(ctx: AskPageContext): string[] {
  switch (ctx.page) {
    case 'holiday-matrix': return ['Who is over their allowance this year?', 'Who has taken the least holiday so far?', 'What is our holiday liability in pounds?']
    case 'holiday-calendar': return ['Which are the busiest weeks coming up?', 'Who is off next week?', 'Which days have the most people off?']
    case 'holiday-requests': return ['Which waiting requests would take someone over their allowance?', 'Which weeks do the waiting requests fall in?', 'How many people are off in the busiest week?']
    case 'staff-member': return ctx.staffName ? [`Summarise ${first(ctx.staffName)}'s holiday this year`, `What does ${first(ctx.staffName)} cost per week?`, `Is ${first(ctx.staffName)} paid at or above the National Living Wage?`] : ['Which staff are missing details?']
    case 'staff-list': return ['Which staff are missing key details?', 'Whose credentials are due to expire soon?', 'What is the average hourly rate we pay?']
    case 'notifications': return ['Draft a notification reminding staff about holiday requests', 'Draft a thank you to the team', 'Draft a reminder about overdue training']
    case 'residents': return ['What is our weekly income by funding type?', 'Which fee reviews are due in the next 30 days?', 'What would a 5% fee rise bring in each week?']
    default: return []
  }
}

/** What the browser sends with a question: ids and numbers only (the server ignores any text and builds its own label). */
export function toWireContext(ctx: AskPageContext | null | undefined) {
  if (!ctx) return undefined
  const w: { page: ContextPageName; staffUserId?: string; residentId?: string; year?: number; month?: string } = { page: ctx.page }
  if (ctx.staffUserId) w.staffUserId = ctx.staffUserId
  if (ctx.residentId) w.residentId = ctx.residentId
  if (typeof ctx.year === 'number') w.year = ctx.year
  if (ctx.month) w.month = ctx.month
  return w
}

export const sameContext = (a: AskPageContext | null, b: AskPageContext | null): boolean =>
  a === b || (!!a && !!b && a.page === b.page && a.staffUserId === b.staffUserId && a.residentId === b.residentId && a.year === b.year && a.month === b.month && a.label === b.label)
