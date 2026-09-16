// Which families of pages render the rebuilt theme by default.
//
// Until now every rebuilt page was opt-in with ?v2=1, checked separately in 45 routes. Going
// live family by family would have meant editing those checks batch by batch, and undoing a
// batch meant finding them all again. The decision lives here instead: adding a family to
// LIVE switches it on across every page in it, and taking it out switches it back, so each
// batch, and each rollback, is a one-line change.
//
// The query string still wins over this list, in both directions:
//   ?v2=1  shows the rebuilt page even for a family that is not live yet, for review;
//   ?v2=0  shows the current page even for a family that is live, for comparison.

export type V2Family =
  | 'features'      // /features/*, 52 pages
  | 'web-chat'      // /features/web-chat-interface, switched separately: it goes live only once
                    // its content has been re-imported, and would otherwise be near-empty
  | 'legal'         // /privacy /terms /cookies /dpa /client-services-agreement
  | 'one-offs'      // /about /pricing /languages /rag /regulatory-knowledge /trust /contact
                    // /demo /blog /faq /who-we-serve /who-its-for /training-platform
  | 'collections'   // /collection/*
  | 'services'      // the 7 flat Our Services pages and /how-it-works
  | 'settings'      // the 11 care-setting pages
  | 'modules'       // /staff-training/*
  | 'policies'      // /care-policies/*
  | 'buy'           // /buy/*
  | 'indexes'       // /staff-training and /care-policies
  | 'home'          // /

const LIVE: ReadonlySet<V2Family> = new Set<V2Family>([
  // Batch 1: families already published and checked against the deployment.
  'features',
  'legal',
  'one-offs',
  'collections',
  // Batch 2a: the 11 care-setting pages, published and matching the theme with no differences.
  // Our Services, the other half of batch 2, is held back for fixes.
  'settings',
])

type Params = Record<string, string | string[] | undefined> | undefined

/** Whether this request should render the rebuilt page for `family`. Accepts the page's
 *  searchParams either as the promise Next passes in or already awaited. */
export async function isV2(family: V2Family, params: Params | Promise<Params>): Promise<boolean> {
  const sp = await params
  const raw = sp?.v2
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v === '0') return false
  if (v === '1') return true
  return LIVE.has(family)
}
