// Settings for the support menu in the admin header (components/admin/support-menu.tsx).

/** The support phone number, shown to paid plans only. null hides the phone line until a number is supplied. */
export const SUPPORT_PHONE: string | null = '020 8064 1596'
export const SUPPORT_EMAIL = 'support@carestreamai.com'

const SELF_SERVE = new Set(['free', 'training_only', 'policies_only'])
/** Starter, Professional and Enterprise. Free and the shop only accounts are not paid plans. */
export const isPaidTier = (tier?: string | null): boolean => !SELF_SERVE.has(String(tier ?? 'full'))

export function mailtoSupport(customerRef?: string | null): string {
  const subject = customerRef ? `Support request: ${customerRef}` : 'Support request'
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`
}

/** True when there is a release newer than the one the person last opened. `lastSeen` is the id (its date) of the newest release they have seen. */
export const hasUnreadRelease = (newestId: string | null | undefined, lastSeen: string | null | undefined): boolean =>
  !!newestId && newestId !== lastSeen
