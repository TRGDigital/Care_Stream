// Test 1: headline first on mobile, on the Care Certificate course page.
//
// Variant B (phones only, under 760px; desktop is unchanged): the ad group's headline, its one
// line subhead and three short proof points open the page, a one line offer under them, then the
// buy box, and a bar along the bottom of the screen with the price and Add to basket once the buy
// box has scrolled away. Variant A is the page as it is today.
//
//   ?ab=t1b  forces B, for review
//   ?ab=t1a  forces A
//   neither  everyone gets A while TEST1_LIVE is false (nothing is reported to Funnel Insights)
//
// Turning on a 50/50 split is the one line below. When it is on, a visit without ?ab= is given A
// or B at random when the page is rendered (the route reads searchParams, so it renders per
// request), and Test1Assign keeps that choice for the rest of the tab's visit in memory only: no
// cookie, no localStorage, the same way the Funnel Insights tracker keeps ?fis= in window.__fis.
//
// Funnel Insights reads the assignment from two meta tags, beside the fi-variant tag the page
// already sets for ?intent=:
//   <meta name="fi-ab-test" content="care-cert-mobile-headline">
//   <meta name="fi-ab-variant" content="A" | "B">
// and the same pair is on window.__fiTest = { test, variant } and on <html> as
// data-fi-ab-test / data-fi-ab-variant. Pages outside the test carry none of them.

export const TEST1_LIVE = true

export const TEST1_ID = 'care-cert-mobile-headline'
export const TEST1_SLUG = 'care-certificate'

export type Test1Variant = 'A' | 'B'
export interface Test1Assignment { test: typeof TEST1_ID; variant: Test1Variant; forced: boolean }

/** The visit's variant of test 1 on this course page, or null when the visit is not in the test. */
export function test1Assignment(
  slug: string,
  sp: Record<string, string | string[] | undefined> | undefined,
): Test1Assignment | null {
  if (slug !== TEST1_SLUG) return null
  const ab = typeof sp?.ab === 'string' ? sp.ab.toLowerCase() : ''
  if (ab === 't1a') return { test: TEST1_ID, variant: 'A', forced: true }
  if (ab === 't1b') return { test: TEST1_ID, variant: 'B', forced: true }
  if (!TEST1_LIVE) return null
  return { test: TEST1_ID, variant: Math.random() < 0.5 ? 'A' : 'B', forced: false }
}
