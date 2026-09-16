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
  | 'blog-posts'    // /blog/*

const LIVE: ReadonlySet<V2Family> = new Set<V2Family>([
  // Batch 1: families already published and checked against the deployment.
  'features',
  'legal',
  'one-offs',
  'collections',
  // Batch 2a: the 11 care-setting pages, published and matching the theme with no differences.
  'settings',
  // Batch 2b: the 7 Our Services pages and /how-it-works, re-imported with parts and matching
  // the theme on the deployment (class counts, block order, every run of theme copy), and the
  // web chat feature page, re-imported and matching once its closing buttons were fixed.
  'services',
  'web-chat',
  // Batch 3: the /staff-training and /care-policies index pages, matching the theme on the
  // deployment once the library, demo, basket and pack cards were brought into line.
  'indexes',
  // Batch 4: the 98 /staff-training/<slug> module pages, on the theme's copy with Course and
  // FAQPage kept, checked against their theme pages on the deployment.
  'modules',
  // Batch 5: the 66 /care-policies/<slug> pages, matching their theme pages on class counts
  // and block order, with Product and FAQPage kept.
  'policies',
  // Batch 6: the 98 /buy/<slug> pages, matching their theme pages on class counts and block
  // order; only the related-module picks differ (chosen by rule, not hard-coded).
  'buy',
  // Batch 7: the home page, rebuilt block by block from the theme and matching it.
  'home',
  // Batch 8: the blog post template, checked on all 41 published posts on the deployment
  // (template, title, BlogPosting, related articles) with the same structured data as before.
  'blog-posts',
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
