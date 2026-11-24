// Who counts as a manager for approvals. The same rule the hub already uses for policy approvals (routes/me.ts isCareManager):
// a person whose job role is a care manager or a registered manager.
export const isManagerJobRole = (jobRole: unknown): boolean => /care manager|registered manager/i.test(String(jobRole ?? ''))
