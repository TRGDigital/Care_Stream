// Sample calls for the person-led staff emails, shared by the preview script and the owner-only test send route.
export function personEmailCases(out: any, base: { to: string; name: string; orgName: string; actorUserId: string }, portalUrl: string): Record<string, () => Promise<void>> {
  return {
    'allocation-training':   () => out.sendStaffAllocationEmail({ ...base, kind: 'training', portalUrl }),
    'allocation-annual':     () => out.sendStaffAllocationEmail({ ...base, kind: 'annual_training', portalUrl }),
    'allocation-induction':  () => out.sendStaffAllocationEmail({ ...base, kind: 'induction', portalUrl }),
    'allocation-cqc':        () => out.sendStaffAllocationEmail({ ...base, kind: 'cqc_prep', portalUrl }),
    'training-reminder':     () => out.sendTrainingReminderEmail({ ...base, courseName: 'Moving and Handling', dueDate: new Date(Date.now() + 14 * 864e5), kind: 'training', portalUrl }),
    'face-to-face-reminder': () => out.sendFaceToFaceReminderEmail({ ...base, title: 'Fire Safety', dateLabel: 'Tue 3 December 2026', trainerLabel: 'Mark Ellis' }),
    'cqc-prep':              () => out.sendCqcPrepEmail({ ...base, questionCount: 3, portalUrl }),
    'onboarding-update':     () => out.sendOnboardingUpdateEmail({ ...base, subject: 'Induction', portalUrl, bodyHtml: '<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">You have been enrolled on the <strong>Care Assistant</strong> induction flow with a due date of <strong>12 December 2026</strong>.</p><p style="color:#374151;font-size:15px;line-height:1.6;margin:0">Log in to the portal to get started and complete your induction steps.</p>' }),
    'audit-assigned':        () => out.sendAuditUpdateEmail({ ...base, subject: 'Audit assigned to you: Medication audit', personAction: 'has assigned you an audit: Medication audit', bodyHtml: '<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px"><strong>Medication audit</strong> has been assigned to you, due on <strong>Friday 6 December</strong>.</p><p style="color:#374151;font-size:15px;line-height:1.6;margin:0">You can start it from Audits in the hub.</p>' }),
    'supervision-booked':    () => out.sendTrainingUpdateEmail({ ...base, subject: 'Your supervision is booked', personAction: 'has booked your supervision for Monday 9 December', bodyHtml: '<p style="font-size:15px;margin:0 0 12px">Your supervision has been booked for <strong>Monday 9 December</strong> with Sarah Jones.</p><p style="font-size:14px;color:#666;margin:0">You will get a reminder the day before.</p>' }),
    'action-plan':           () => out.sendActionPlanStaffEmail({ to: base.to, staffName: base.name, orgName: base.orgName, actorUserId: base.actorUserId, actions: [
      { description: 'Update the fire evacuation plan to reflect the new bedroom layout.', priority: 'immediate', due_date: new Date(Date.now() + 7 * 864e5).toISOString(), audit_name: 'Health and Safety Audit', contractor: null },
      { description: 'Complete refresher training on safe moving and handling.', priority: 'priority', due_date: null, audit_name: 'Health and Safety Audit', contractor: null },
    ] }),
  }
}
