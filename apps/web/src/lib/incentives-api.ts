// Staff incentives (Professional and Enterprise): types and API calls, shared by the admin screen (/incentives), the hub
// (My incentives for staff, Incentive approvals for care managers) and the staff record page (points history).
//
// How it works, in one paragraph: an admin builds a monthly CAMPAIGN (rules that earn points from training, onboarding
// and CPD, plus rewards with a points target and an optional limited quantity). A care manager approves the campaign before it
// goes live. CareStream records points in a ledger from real events (never by hand), works out who reached each reward
// and in what order (earliest completion time wins), and holds a place for them. A care manager approves each reward
// payout and someone marks it as given. CareStream never buys or pays anything; it records and reports.
//
// Plans: Professional and Enterprise. Any call can answer 403 FEATURE_NOT_AVAILABLE on a lower plan. Staff only ever see their own points.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type CampaignStatus = 'draft' | 'awaiting_approval' | 'live' | 'ended' | 'rejected' | 'cancelled'
/** held = reached the reward, place held, waiting for a care manager. approved = manager approved. given = reward handed over.
 *  missed = the limited places were gone. rejected = manager rejected it (the place passes to the next person). forfeited = left the home. */
export type ClaimStatus = 'held' | 'approved' | 'given' | 'missed' | 'rejected' | 'forfeited'

export type RuleEvent = 'training_completed' | 'training_on_time' | 'cpd_completed' | 'onboarding_completed' | 'practical_signed'

/** What can earn points. Defined by the API (GET /incentives/meta) so the wording lives in one place. */
export interface RuleEventDef {
  key: RuleEvent
  label: string      // "Completes a training module"
  help: string       // one sentence for the admin
  suggested_points: number
}

export interface IncentiveRule {
  id?: string
  event: RuleEvent
  points: number                   // 1 to 1000
  max_per_month: number | null     // most times this rule can earn for one person in the campaign; null = no limit
}

export interface IncentiveReward {
  id?: string
  /** Stable client key ("r1", "r2") so per person targets can refer to a reward that has not been saved yet. */
  key: string
  title: string                    // free text, for example "£25.00 M&S voucher"
  image_data: string | null        // a small image as a data URL (png, jpeg, webp or gif, at most about 150 KB), for example a logo
  target_points: number            // default points target for everyone
  quantity: number | null          // places available (first to reach it, by earliest completion time); null = everyone who qualifies
  value_pence: number | null       // optional money value per reward, for the cost view only
}

export interface IncentiveParticipant {
  user_id: string
  name?: string
  job_role?: string | null
  /** Per person target overrides, keyed by IncentiveReward.key: this person needs this many points for that reward. */
  targets: Record<string, number>
}

export interface IncentiveCampaignSummary {
  id: string
  name: string
  month: string                    // YYYY-MM
  status: CampaignStatus
  everyone: boolean
  participants_count: number
  rewards_count: number
  claims: { held: number; approved: number; given: number; missed: number }
  created_by_name: string | null
  approved_by_name: string | null
  approved_at: string | null
  rejected_reason: string | null
}

export interface IncentiveCampaignInput {
  name: string
  month: string                    // YYYY-MM
  everyone: boolean                // true = every current staff member (not agency); false = only the participants listed
  participants: Array<{ user_id: string; targets?: Record<string, number> }>   // the chosen staff, and/or per person targets
  rules: IncentiveRule[]
  rewards: IncentiveReward[]
}

export interface IncentiveCampaignDetail extends IncentiveCampaignSummary {
  period_start: string
  period_end: string
  submitted_at: string | null
  rules: IncentiveRule[]
  rewards: IncentiveReward[]
  participants: IncentiveParticipant[]      // explicit people and overrides (when everyone is true this may be empty)
}

/** One row of the admin progress table. */
export interface IncentiveProgressRow {
  user_id: string
  name: string
  job_role: string | null
  points: number
  rewards: Array<{ key: string; target: number; pct: number; claim: ClaimStatus | null; reached_at: string | null }>
}

export interface IncentiveClaim {
  id: string
  campaign_id: string
  campaign_name: string
  reward_key: string
  reward_title: string
  reward_image_data: string | null
  value_pence: number | null
  user_id: string
  user_name: string
  status: ClaimStatus
  rank: number | null              // 1 = first to reach it
  tied: boolean                    // reached at exactly the same time as the next person while only one place was left: the care manager decides
  reached_at: string
  decided_by_name: string | null
  decided_at: string | null
  reject_reason: string | null
  given_by_name: string | null
  given_at: string | null
}

/** Staff view of one reward in one campaign. */
export interface MyReward {
  key: string
  title: string
  image_data: string | null
  target_points: number            // this person's own target
  points: number
  pct: number
  places_total: number | null      // null = everyone who qualifies
  places_left: number | null
  claim: { status: ClaimStatus; rank: number | null; reached_at: string } | null
  /** Shown when the places went before they reached it (status missed): a thank you that points them back to training. */
  thank_you: string | null
}

export interface MyCampaign {
  id: string
  name: string
  month: string
  status: CampaignStatus
  points: number
  rewards: MyReward[]
  entries: Array<{ at: string; label: string; points: number }>   // their points, newest first
}

export interface StaffPointsMonth {
  month: string
  campaigns: Array<{
    id: string
    name: string
    status: CampaignStatus
    points: number
    rewards: Array<{ title: string; target: number; claim: ClaimStatus | null }>
    entries: Array<{ at: string; label: string; points: number }>
  }>
}

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined ?? {}) },
  })
  let body: any = null
  try { body = await res.json() } catch { /* leave null */ }
  if (res.status === 401 && typeof window !== 'undefined') {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`
    throw new Error('Session expired. Please sign in again.')
  }
  if (!res.ok || !body?.success) {
    const e: any = new Error(body?.error?.message ?? `Request failed (${res.status})`)
    e.code = body?.error?.code; e.status = res.status
    throw e
  }
  return body.data as T
}

export function createIncentivesClient(token: string) {
  const j = (v: unknown) => JSON.stringify(v)
  return {
    /** enabled is false on plans without the feature. is_manager = a care manager (can approve). */
    meta: () => call<{ enabled: boolean; events: RuleEventDef[]; is_admin: boolean; is_manager: boolean; max_image_bytes: number }>('/incentives/meta', token),

    // Admin: build and run campaigns
    campaigns: () => call<{ campaigns: IncentiveCampaignSummary[] }>('/incentives/campaigns', token),
    create: (data: IncentiveCampaignInput) => call<IncentiveCampaignDetail>('/incentives/campaigns', token, { method: 'POST', body: j(data) }),
    get: (id: string) => call<{ campaign: IncentiveCampaignDetail; progress: IncentiveProgressRow[]; claims: IncentiveClaim[] }>(`/incentives/campaigns/${id}`, token),
    update: (id: string, data: IncentiveCampaignInput) => call<IncentiveCampaignDetail>(`/incentives/campaigns/${id}`, token, { method: 'PUT', body: j(data) }),
    /** draft or rejected -> awaiting_approval (care managers are emailed). */
    submit: (id: string) => call<IncentiveCampaignDetail>(`/incentives/campaigns/${id}/submit`, token, { method: 'POST' }),
    cancel: (id: string) => call<IncentiveCampaignDetail>(`/incentives/campaigns/${id}/cancel`, token, { method: 'POST' }),
    remove: (id: string) => call<{ deleted: boolean }>(`/incentives/campaigns/${id}`, token, { method: 'DELETE' }),
    /** A payout report as plain CSV text for payroll. */
    exportCsv: (id: string) => call<{ filename: string; text: string }>(`/incentives/campaigns/${id}/export`, token),

    // Care manager: approvals queue (campaigns to go live, and reward payouts)
    queue: () => call<{ is_manager: boolean; campaigns: IncentiveCampaignDetail[]; claims: IncentiveClaim[]; count: number }>('/incentives/queue', token),
    approveCampaign: (id: string) => call<IncentiveCampaignDetail>(`/incentives/campaigns/${id}/approve`, token, { method: 'POST' }),
    rejectCampaign: (id: string, reason: string) => call<IncentiveCampaignDetail>(`/incentives/campaigns/${id}/reject`, token, { method: 'POST', body: j({ reason }) }),
    approveClaim: (id: string) => call<IncentiveClaim>(`/incentives/claims/${id}/approve`, token, { method: 'POST' }),
    rejectClaim: (id: string, reason: string) => call<IncentiveClaim>(`/incentives/claims/${id}/reject`, token, { method: 'POST', body: j({ reason }) }),
    /** Care manager or admin: the reward has been handed over (approved -> given). */
    markGiven: (id: string, note?: string) => call<IncentiveClaim>(`/incentives/claims/${id}/given`, token, { method: 'POST', body: j({ note }) }),

    // Staff: their own points only
    mine: () => call<{ enabled: boolean; campaigns: MyCampaign[]; outstanding_training: number }>('/incentives/me', token),

    // Admin: one person's full history, per month, per award (for the staff record page)
    staffHistory: (userId: string) => call<{ months: StaffPointsMonth[] }>(`/incentives/staff/${userId}`, token),
  }
}
