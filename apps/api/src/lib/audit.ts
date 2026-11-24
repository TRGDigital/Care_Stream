import { prisma } from '../db/client'

// §11.3 — Write an immutable audit log entry.
// tenant_id is nullable for platform-level events.
// Called fire-and-forget — errors are logged but do not fail the request.

type AuditEventType =
  | 'policy_upload'
  | 'policy_bulk_upload'
  | 'policy_archive'
  | 'policy_minor_edit'
  | 'policy_rename'
  | 'policy_delete'
  | 'policy_update'
  | 'policy_version_swap'
  | 'user_invite'
  | 'user_registered'
  | 'role_change'
  | 'billing_change'
  | 'tenant_registered'
  | 'tenant_group_change'
  | 'login'
  | 'login_failed'
  | 'account_locked'
  | 'platform_viewed_staff_record'
  | 'shared_tablet_created' | 'shared_tablet_connected' | 'shared_tablet_revoked' | 'shared_tablet_poster_rotated' | 'shared_tablet_session_started'   // shared tablets
  | 'staff_notification_sent' | 'staff_notification_reminded' | 'staff_notification_read'   // admin notifications to staff
  | 'holiday_requested' | 'holiday_approved' | 'holiday_rejected' | 'holiday_cancelled' | 'holiday_edited' | 'holiday_removed' | 'holiday_imported' | 'holiday_settings_changed'   // holiday tracking
  | 'staff_pin_resend' | 'staff_pin_regenerate' | 'staff_pin_show' | 'staff_pins_sent_all'   // a staff member's tablet PIN
  | 'resident_created' | 'resident_updated' | 'resident_archived' | 'resident_archive_confirmed' | 'resident_retention_changed'
  | 'resident_exported' | 'resident_deleted' | 'resident_family_invited' | 'resident_family_link_created' | 'resident_contribution_decided' | 'resident_archive_viewed'
  | 'staff_photo_set' | 'staff_photo_removed'
  | 'resident_photo_added' | 'resident_photo_decided' | 'resident_photo_deleted'
  | 'resident_reminders_changed' | 'resident_reminders_stopped' | 'resident_reminder_sent'   // family reminder settings changed, stopped by the family, or sent
  | 'resident_video_added' | 'resident_video_decided' | 'resident_video_deleted' | 'resident_video_played'
  | 'resident_video_transcribed' | 'resident_video_translation_edited' | 'resident_video_staff_text_changed'   // what is said: started by a manager, corrected, shared with staff or not
  | 'super_user_tagged' | 'super_user_untagged' | 'super_user_consent' | 'super_user_voucher_sent'   // the company's Super User
  | 'audit_run_backdated' | 'audit_run_date_changed'   // an admin started an audit for an earlier day, or changed the date of one
  | 'supervision_training_shared'   // the training detail for a supervision was printed or emailed
  | 'admin_view_as_started' | 'admin_view_as_ended' | 'admin_view_as_action'   // an admin looked at a staff member's hub (view or act mode)
  | 'platform_pushed_policy_gaps'      // TRG pushed missing policies to a client's /policies page
  | 'platform_viewed_staff_chats'      // TRG opened a staff member's chats (full text) in the platform console   // TRG looked at a staff member's activity record from the platform console

type AuditEntityType = 'policy' | 'user' | 'tenant' | 'query' | 'resident' | 'audit_run' | 'shared_device' | 'staff_notification' | 'holiday_request'

interface AuditParams {
  tenant_id?: string | null
  user_id?: string | null
  event_type: AuditEventType
  entity_type: AuditEntityType
  entity_id: string
  metadata?: Record<string, unknown>
}

/** Like writeAuditLog, but a failure is thrown. For actions that must not happen without a record (an admin viewing a staff hub). */
export async function writeAuditLogStrict(params: AuditParams): Promise<void> {
  await (prisma as any).auditLog.create({
    data: { tenant_id: params.tenant_id ?? null, user_id: params.user_id ?? null, event_type: params.event_type, entity_type: params.entity_type, entity_id: params.entity_id, metadata: params.metadata ?? {} },
  })
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
