// Free CPD training: one switch and three helpers for every public page that prints a CPD
// course price or a buy button.
//
// From the day this is true, the CPD certified courses (the Care Certificate and the annual
// refreshers, flagged cpd_accredited by the API) are free for any account, including the Free
// plan. The public pages show the old price struck through next to £0.00 and send "buy" to the
// free sign up instead of the basket. Courses that are not CPD certified keep their price and
// the basket exactly as before.
//
// Turning this off puts every page back to the paid shop, so it is the one line to flip.

import { UNIT_PENCE } from '@/lib/training-commerce'

export const FREE_CPD_LIVE = true

/** The price a free CPD course would have cost, struck through on the page. */
export const STANDARD_COURSE_PENCE = UNIT_PENCE
export const STANDARD_COURSE_PRICE = `£${(UNIT_PENCE / 100).toFixed(2)}`
export const FREE_COURSE_PRICE = '£0.00'

/** True for a course that is free: CPD certified, while the switch is on. */
export function isFreeCpd(m: { cpd_accredited?: boolean | null } | null | undefined): boolean {
  return FREE_CPD_LIVE && !!m?.cpd_accredited
}

/** Where "Get this course free" goes: the free account sign up, remembering which course. */
export function freeCpdHref(slug: string): string {
  return `/register?tier=free&source=cpd&course=${encodeURIComponent(slug)}`
}

/** Button and label wording, kept in one place so every page says the same thing. */
export const FREE_CPD_COPY = {
  cta: 'Get this course free',
  ctaShort: 'Get it free',
  note: 'Free with a CareStream account. No card needed. In English, with 60+ languages from the Starter plan.',
  teamNote: 'Free for every member of your team, in English. 60+ languages from the Starter plan. No card needed.',
  /** Translation has a real cost, so it starts on the Starter plan. */
  languages: 'Free in English. Available in 60+ languages from the Starter plan.',
} as const
