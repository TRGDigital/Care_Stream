# Content that depends on JavaScript

Method: 66 pages (every single-segment page plus samples from each template) loaded hydrated in an iframe after 5 seconds, split into sentences, each tested against the raw server text. Misses were all ordering or label artefacts (verified by substring tests) except those below. Link counts of `<a href>` were identical raw vs hydrated on every page (for example home 222/222, pricing 256/256). H1 text identical.

## Meaningful content not in raw HTML
None of substance. Findings:

| Block | Where | File | Status |
|---|---|---|---|
| Home FAQ accordion answers (`{open && ...}`) | Not live: HomePageV2 has no FAQ. Dormant component still used by v1 home, /go/[slug], feature-page, setting-page, trust | `components/marketing/home-faq.tsx` Item | Latent trap: answers only render on click and the component emits its own second FAQPage script. Replace with `<details>` before anyone reuses it. Live pages that use FAQs (pricing, features, courses, policies, blog, uses, trust, faq) all have answers in the raw HTML (verified, 296 pages). |
| Blog FAQ (v1) `BlogFaqs` | `components/marketing/blog-faqs.tsx` | `{isOpen && ...}` | Not used by live v2 posts (answers are in raw HTML). Dead code, same trap. |
| Monthly/annual price toggle | `pricing-page-v2.tsx` | both prices always in markup | OK |
| Basket state ("In your basket", "Add to basket", "1 in basket") | course and policy indexes | cart-store | Transactional UI, not content. OK |
| "+60 more" language chips | /staff-training, /who-its-for | client list | Native language names are in raw HTML; only the counter chip is client rendered. OK |
| Cookie banner, website chat, demo dialog, capture overlays | root and marketing layouts | client | Not content |
| Checkout, review form, buy success | `/buy/*`, `/review`, checkout pages fetch from the API in the browser | noindex or transactional | Not indexable content. OK |

## Other JS notes
- `ssr: false` is used only in admin and platform dashboards, never in marketing.
- No tabs (`role=tab` count 0 on /staff-training), no carousels that hide text from the DOM, no canvas or text-in-SVG found. Images carry alt text (no missing alt attributes; 67 of 80 images on /care-policies have empty alt).
- Breadcrumb JSON-LD comes from a client component that uses `usePathname()`; it is server rendered, so present in raw HTML (checked on 336 pages). It cannot know real page names (issue 4).
- Funnel Insights adds `?fis=` to internal links in the markup on 2 spots in raw HTML; it is stripped from the address bar. Nav also links `/contact?about=Question%20from%20a%20course%20page`; harmless but a crawlable query URL.
