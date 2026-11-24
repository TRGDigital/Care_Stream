// Ask CareStream actions: the shapes. The agent only PROPOSES; a person pressing Confirm on the card is what makes anything happen (see execute.ts).
// Tier A actions only. Anything that changes pay, approves or edits holiday, removes or archives staff, changes permissions, touches sickness or is financial is NEVER an
// action type (tier-c.ts lists them so the agent can answer with a link instead, and a test checks no such type exists).

export const ACTION_TYPES = ['send_staff_notification', 'remind_unread_notification', 'allocate_training', 'send_training_reminders'] as const
export type ActionType = (typeof ACTION_TYPES)[number]
export type ActionStatus = 'proposed' | 'confirmed' | 'cancelled' | 'expired' | 'failed' | 'done'

export const ACTION_LABEL: Record<ActionType, string> = {
  send_staff_notification: 'Send a staff notification',
  remind_unread_notification: 'Remind people who have not read a notification',
  allocate_training: 'Allocate training',
  send_training_reminders: 'Send training reminders',
}
/** Which Settings switch each type needs (on top of the master switch). */
export const ACTION_SWITCH: Record<ActionType, 'notifications_enabled' | 'training_enabled'> = {
  send_staff_notification: 'notifications_enabled',
  remind_unread_notification: 'notifications_enabled',
  allocate_training: 'training_enabled',
  send_training_reminders: 'training_enabled',
}

export interface NotificationPayload { title: string; body: string; user_ids: string[]; suggested_ids: string[]; all_staff: boolean; email: boolean; reason?: string }
export interface UnreadReminderPayload { notification_id: string; notification_title: string; user_ids: string[]; suggested_ids: string[] }
export interface TrainingPayload { module_ids: string[]; module_names: string[]; user_ids: string[]; suggested_ids: string[]; due_date: string | null }
export interface TrainingReminderPayload { scope: 'overdue' | 'due_soon'; within_days: number; user_ids: string[]; suggested_ids: string[]; enrollment_ids: string[] }
export type ActionPayload = NotificationPayload | UnreadReminderPayload | TrainingPayload | TrainingReminderPayload

export interface ActionRow { id: string; tenant_id: string; user_id: string; conversation_id: string | null; message_id: string | null; type: ActionType; payload: any; status: ActionStatus; result: any; created_at: string; expires_at: string; confirmed_at: string | null; confirmed_by: string | null }

export interface AskSettings { actions_enabled: boolean; notifications_enabled: boolean; training_enabled: boolean; emails_enabled: boolean; max_recipients: number; min_gap_minutes: number; managers_can_use: boolean }
export const DEFAULT_SETTINGS: AskSettings = { actions_enabled: false, notifications_enabled: false, training_enabled: false, emails_enabled: false, max_recipients: 100, min_gap_minutes: 2, managers_can_use: false }

export const PROPOSAL_MINUTES = 30
