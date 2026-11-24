// The guardrail switches for Ask CareStream actions. All OFF by default. Raw SQL; a missing table means "everything off", never an error.
import { prisma } from '../../../db/client'
import { DEFAULT_SETTINGS, ACTION_SWITCH, type ActionType, type AskSettings } from './types'
const q = () => prisma as any
export const missingTable = (e: any) => /ask_settings|ask_actions|notification_withdrawals|does not exist|42P01|P2010/i.test(String(e?.message ?? e))

export const clampMax = (n: unknown) => Math.max(1, Math.min(500, Math.round(Number(n) || DEFAULT_SETTINGS.max_recipients)))
export const clampGap = (n: unknown) => Math.max(0, Math.min(60, Math.round(Number.isFinite(Number(n)) ? Number(n) : DEFAULT_SETTINGS.min_gap_minutes)))

export async function loadAskSettings(tenantId: string): Promise<AskSettings> {
  try {
    const r: any[] = await q().$queryRawUnsafe('select actions_enabled, notifications_enabled, training_enabled, emails_enabled, max_recipients, min_gap_minutes, managers_can_use from public.ask_settings where tenant_id = $1', tenantId)
    const x = r[0]; if (!x) return { ...DEFAULT_SETTINGS }
    return { actions_enabled: !!x.actions_enabled, notifications_enabled: !!x.notifications_enabled, training_enabled: !!x.training_enabled, emails_enabled: !!x.emails_enabled, max_recipients: clampMax(x.max_recipients), min_gap_minutes: clampGap(x.min_gap_minutes), managers_can_use: !!x.managers_can_use }
  } catch { return { ...DEFAULT_SETTINGS } }
}

export async function saveAskSettings(tenantId: string, patch: Partial<AskSettings>): Promise<AskSettings> {
  const cur = await loadAskSettings(tenantId)
  const next: AskSettings = {
    actions_enabled: patch.actions_enabled ?? cur.actions_enabled, notifications_enabled: patch.notifications_enabled ?? cur.notifications_enabled,
    training_enabled: patch.training_enabled ?? cur.training_enabled, emails_enabled: patch.emails_enabled ?? cur.emails_enabled,
    max_recipients: patch.max_recipients != null ? clampMax(patch.max_recipients) : cur.max_recipients, min_gap_minutes: patch.min_gap_minutes != null ? clampGap(patch.min_gap_minutes) : cur.min_gap_minutes,
    managers_can_use: patch.managers_can_use ?? cur.managers_can_use,
  }
  await q().$executeRawUnsafe(`insert into public.ask_settings (tenant_id, actions_enabled, notifications_enabled, training_enabled, emails_enabled, max_recipients, min_gap_minutes, managers_can_use, updated_at)
    values ($1,$2,$3,$4,$5,$6,$7,$8, now()) on conflict (tenant_id) do update set actions_enabled=$2, notifications_enabled=$3, training_enabled=$4, emails_enabled=$5, max_recipients=$6, min_gap_minutes=$7, managers_can_use=$8, updated_at=now()`,
    tenantId, next.actions_enabled, next.notifications_enabled, next.training_enabled, next.emails_enabled, next.max_recipients, next.min_gap_minutes, next.managers_can_use)
  return next
}

/** Whether an action type may be proposed or confirmed: the master switch AND the type's own switch. Returns a plain reason when not. */
export function actionAllowed(s: AskSettings, type: ActionType): { ok: true } | { ok: false; reason: string } {
  if (!s.actions_enabled) return { ok: false, reason: 'Actions are switched off. An administrator can turn on "Let Ask CareStream take actions" in Settings.' }
  const sw = ACTION_SWITCH[type]
  if (!s[sw]) return { ok: false, reason: sw === 'notifications_enabled' ? 'Sending notifications from Ask CareStream is switched off in Settings.' : 'Allocating training from Ask CareStream is switched off in Settings.' }
  return { ok: true }
}
