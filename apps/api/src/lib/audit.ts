import { prisma } from '../db/client'

// §11.3 — Write an immutable audit log entry.
// tenant_id is nullable for platform-level events.
// Called fire-and-forget — errors are logged but do not fail the request.

type AuditEventType =
  | 'policy_upload'
  | 'policy_archive'
  | 'policy_update'
  | 'policy_version_swap'
  | 'user_invite'
  | 'user_registered'
  | 'role_change'
  | 'billing_change'
  | 'tenant_registered'
  | 'login'
  | 'login_failed'
  | 'account_locked'

type AuditEntityType = 'policy' | 'user' | 'tenant' | 'query'

interface AuditParams {
  tenant_id?: string | null
  user_id?: string | null
  event_type: AuditEventType
  entity_type: AuditEntityType
  entity_id: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    // Use prisma directly (bypasses tenant middleware — audit log writes must always succeed)
    await (prisma as any).auditLog.create({
      data: {
        tenant_id: params.tenant_id ?? null,
        user_id: params.user_id ?? null,
        event_type: params.event_type,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        metadata: params.metadata ?? {},
      },
    })
  } catch (error) {
    // Audit failures must never break the request — log and continue
    console.error('[audit] Failed to write audit log:', error)
  }
}
