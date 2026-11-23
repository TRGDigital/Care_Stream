// Sample calls for the person-led staff emails, shared by the preview script, the owner-only test send route, the owner-only
// test overlay route and the unit tests. The words in the overlay samples come from the SAME content builders as the emails.
import {
  allocationContent, trainingReminderContent, faceToFaceReminderContent, cqcPrepContent, onboardingContent, updateContent, actionPlanContent,
  type PersonContent,
} from './person-content'

const P = 'color:#374151;font-size:15px;line-height:1.6;margin:0'
const ONBOARDING_BODY = `<p style="${P} 0 16px">You have been enrolled on the <strong>Care Assistant</strong> induction flow with a due date of <strong>12 December 2026</strong>.</p><p style="${P}">Log in to the portal to get started and complete your induction steps.</p>`
const AUDIT_BODY = `<p style="${P} 0 16px"><strong>Medication audit</strong> has been assigned to you, due on <strong>Friday 6 December</strong>.</p><p style="${P}">You can start it from Audits in the hub.</p>`
const SUPERVISION_BODY = '<p style="font-size:15px;margin:0 0 12px">Your supervision has been booked for <strong>Monday 9 December</strong> with Sarah Jones.</p><p style="font-size:14px;color:#666;margin:0">You will get a reminder the day before.</p>'
const AUDIT_ACTION = 'has assigned you an audit: Medication audit'
const SUPERVISION_ACTION = 'has booked your supervision for Monday 9 December'
const dueIn = (days: number) => new Date(Date.now() + days * 864e5)
const ACTIONS = [
  { description: 'Update the fire evacuation plan to reflect the new bedroom layout.', priority: 'immediate', due_date: dueIn(7).toISOString(), audit_name: 'Health and Safety Audit', contractor: null },
  { description: 'Complete refresher training on safe moving and handling.', priority: 'priority', due_date: null, audit_name: 'Health and Safety Audit', contractor: null },
]

export function personEmailCases(out: any, base: { to: string; name: string; orgName: string; actorUserId: string | null }, portalUrl: string): Record<string, () => Promise<void>> {
  return {
    'allocation-training':   () => out.sendStaffAllocationEmail({ ...base, kind: 'training', portalUrl }),
    'allocation-annual':     () => out.sendStaffAllocationEmail({ ...base, kind: 'annual_training', portalUrl }),
    'allocation-induction':  () => out.sendStaffAllocationEmail({ ...base, kind: 'induction', portalUrl }),
    'allocation-cqc':        () => out.sendStaffAllocationEmail({ ...base, kind: 'cqc_prep', portalUrl }),
    'training-reminder':     () => out.sendTrainingReminderEmail({ ...base, courseName: 'Moving and Handling', dueDate: dueIn(14), kind: 'training', portalUrl }),
    'face-to-face-reminder': () => out.sendFaceToFaceReminderEmail({ ...base, title: 'Fire Safety', dateLabel: 'Tue 3 December 2026', trainerLabel: 'Mark Ellis' }),
    'cqc-prep':              () => out.sendCqcPrepEmail({ ...base, questionCount: 3, portalUrl }),
    'onboarding-update':     () => out.sendOnboardingUpdateEmail({ ...base, subject: 'Induction', portalUrl, bodyHtml: ONBOARDING_BODY }),
    'audit-assigned':        () => out.sendAuditUpdateEmail({ ...base, subject: 'Audit assigned to you: Medication audit', personAction: AUDIT_ACTION, buttonLabel: 'Open my audits', buttonPath: '/chat?view=audits', bodyHtml: AUDIT_BODY }),
    'supervision-booked':    () => out.sendTrainingUpdateEmail({ ...base, subject: 'Your supervision is booked', personAction: SUPERVISION_ACTION, buttonLabel: 'View my supervisions', buttonPath: '/chat?view=supervisions', bodyHtml: SUPERVISION_BODY }),
    'action-plan':           () => out.sendActionPlanStaffEmail({ to: base.to, staffName: base.name, orgName: base.orgName, actorUserId: base.actorUserId, actions: ACTIONS }),
  }
}

/** The other staff-facing emails (not person-led), callable with sample data. Each must end with a hub button. */
export function otherStaffEmailCases(out: any, base: { to: string; name: string; orgName: string }, portalUrl: string): Record<string, () => Promise<void>> {
  return {
    'staff-login-link':      () => out.sendStaffLoginLinkEmail({ to: base.to, name: base.name, link: `${portalUrl}/login/magic?t=sample`, expiresMins: 30 }),
    'password-reset':        () => out.sendPasswordResetEmail(base.to, base.name, `${portalUrl}/reset-password?token=sample`),
    'password-setup':        () => out.sendPasswordSetupEmail(base.to, base.name, `${portalUrl}/set-password?token=sample`),
    'staff-welcome':         () => out.sendStaffWelcomeEmail({ to: base.to, staffName: base.name, orgName: base.orgName, tempPassword: 'Sample-1234', portalUrl }),
    'follow-up':             () => out.sendStaffAllocationEmail({ ...base, kind: 'follow_up', portalUrl }),
    'incentive':             () => out.sendIncentiveEmail({ to: [base.to], subject: 'Your incentive', heading: 'You earned a reward', body: 'Well done on completing your training this month.', buttonLabel: 'See my rewards', link: `${portalUrl}/chat?view=my-incentives`, orgName: base.orgName }),
    'supervision-reminder':  () => out.sendTrainingUpdateEmail({ ...base, subject: 'Reminder: your supervision is tomorrow', bodyHtml: '<p style="font-size:15px;margin:0 0 12px">Your supervision is tomorrow.</p>', buttonLabel: 'View my supervisions', buttonPath: '/chat?view=supervisions' }),
    'credential-expiry':     () => out.sendTrainingUpdateEmail({ ...base, subject: 'Your passport is expiring soon', bodyHtml: '<p style="font-size:15px;margin:0 0 12px">Your passport is expiring soon.</p>', buttonLabel: 'Open my hub', buttonPath: '/chat' }),
    'audit-reminder':        () => out.sendAuditUpdateEmail({ ...base, subject: 'An audit is due', bodyHtml: '<p style="font-size:15px;margin:0 0 12px">Your audit is due tomorrow.</p>' }),
    // Staff birthdays (company branded, no button): what the staff member gets on the day, and the heads up to administrators 7 days ahead.
    'birthday-staff':        () => out.sendStaffBirthdayEmail({ to: base.to, name: base.name, orgName: base.orgName, actorUserId: 'preview-admin' }),
    'birthday-staff-branded': () => out.sendStaffBirthdayEmail({ to: base.to, name: base.name, orgName: base.orgName }),
    'birthday-admin-notice': () => out.sendTrainingUpdateEmail({ ...base, subject: 'Birthday coming up: Amira Khan', bodyHtml: '<p style="font-size:15px;margin:0 0 10px">A member of staff has a birthday in 7 days:</p><ul style="font-size:15px;margin:0 0 12px;padding-left:20px"><li style="margin:0 0 6px"><strong>Amira Khan</strong> on Monday 30 November, turning 34</li></ul><p style="font-size:14px;color:#666;margin:0">CareStream will send them a happy birthday email from '+base.orgName+' on the day, in case you would like to add a card or a word of your own.</p>', buttonLabel: 'Open Workforce', buttonPath: '/workforce' }),
    // The tablet PIN emails are person-led (shown as sent by an administrator) but have no hub overlay: a PIN must never be shown on screen in a notice.
    'pin-new':               () => out.sendStaffPinEmail({ ...base, actorUserId: 'preview-admin', pin: '4821', kind: 'new' }),
    'pin-resend':            () => out.sendStaffPinEmail({ ...base, actorUserId: 'preview-admin', pin: '4821', kind: 'resend' }),
    'pin-regenerated':       () => out.sendStaffPinEmail({ ...base, actorUserId: 'preview-admin', pin: '7305', kind: 'regenerated' }),
    // The same emails with no acting person (the branded layout):
    'allocation-training-branded':   () => out.sendStaffAllocationEmail({ ...base, kind: 'training', portalUrl }),
    'face-to-face-reminder-branded': () => out.sendFaceToFaceReminderEmail({ ...base, title: 'Fire Safety', dateLabel: 'Tue 3 December 2026', trainerLabel: 'Mark Ellis' }),
    'cqc-prep-branded':              () => out.sendCqcPrepEmail({ ...base, questionCount: 3, portalUrl }),
    'onboarding-update-branded':     () => out.sendOnboardingUpdateEmail({ ...base, subject: 'Induction', portalUrl, bodyHtml: ONBOARDING_BODY }),
    'action-plan-branded':           () => out.sendActionPlanStaffEmail({ to: base.to, staffName: base.name, orgName: base.orgName, actions: ACTIONS }),
    'training-reminder-branded':     () => out.sendTrainingReminderEmail({ ...base, courseName: 'Moving and Handling', dueDate: dueIn(14), kind: 'training', portalUrl }),
    'pin-new-branded':               () => out.sendStaffPinEmail({ ...base, pin: '4821', kind: 'new' }),
  }
}

/** The overlay content for each person-led sample, built by the same functions the emails use. */
export function personNoticeCases(adminName: string): Record<string, PersonContent> {
  return {
    'allocation-training':   allocationContent(adminName, 'training'),
    'allocation-annual':     allocationContent(adminName, 'annual_training'),
    'allocation-induction':  allocationContent(adminName, 'induction'),
    'allocation-cqc':        allocationContent(adminName, 'cqc_prep'),
    'training-reminder':     trainingReminderContent(adminName, { courseName: 'Moving and Handling', dueDate: dueIn(14), kind: 'training' }),
    'face-to-face-reminder': faceToFaceReminderContent(adminName, { title: 'Fire Safety', dateLabel: 'Tue 3 December 2026', trainerLabel: 'Mark Ellis' }),
    'cqc-prep':              cqcPrepContent(adminName, 3),
    'onboarding-update':     onboardingContent(adminName, ONBOARDING_BODY),
    'audit-assigned':        updateContent(adminName, { personAction: AUDIT_ACTION, bodyHtml: AUDIT_BODY, buttonLabel: 'Open my audits', path: '/chat?view=audits' }),
    'supervision-booked':    updateContent(adminName, { personAction: SUPERVISION_ACTION, bodyHtml: SUPERVISION_BODY, buttonLabel: 'View my supervisions', path: '/chat?view=supervisions' }),
    'action-plan':           actionPlanContent(adminName, ACTIONS),
  }
}
