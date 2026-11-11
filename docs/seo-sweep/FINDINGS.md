# CareStream SEO sweep: findings

Audit date 2026-11-11. Source: origin/main at 4d234eaa, live site https://www.carestreamai.com. Method: all 337 sitemap URLs plus the 14 /uses/ pages (351 total) fetched as raw server HTML (cache reload) and parsed; 66 template samples also loaded in a hydrated iframe and compared sentence by sentence with the raw text; code read for client components. Read only: no code, DB or deploy changes. Re-run any time with `python3 docs/seo-sweep/seo-parity-check.py --csv INVENTORY.csv`.

## Executive summary

The site is in good shape. Everything meaningful is in the server HTML: 351/351 URLs return 200, no redirects or noindex in the sitemap, one H1 and a unique title, description and canonical on every page, all JSON-LD parses, and every course price, policy price, FAQ question and answer in the schema is visible in the raw HTML (296 FAQPage blocks, 2,761 questions checked; the 10 home questions are the one failure). Sampling 66 pages, nothing meaningful appears only after JavaScript (see JS-CONTENT.md). Real problems are few and mostly one-line fixes:

| # | Issue | Pages | Severity |
|---|---|---|---|
| 1 | Home FAQPage schema has 10 questions that are not on the page | 1 (home) | High: breaks Google's "markup must match visible content" rule |
| 2 | Home SoftwareApplication schema still says Starter 49.00 and Professional 129.00 (live: 85 / 230, plus Enterprise 385) | 1 (home) | High: wrong price on the most important page |
| 3 | `agent-tools.ts` (WebMCP pricing tool) still has priceGBP 49 and 129 | every marketing page (tool registered site wide) | High: AI agents are told the old price |
| 4 | Breadcrumb JSON-LD points to three URLs that return 404: /features (53 pages), /uses (14), /collection (9) | 76 | Medium-high |
| 5 | 14 indexable /uses/* pages are linked from the nav of every page but absent from the sitemap | 14 | Medium |
| 6 | Home FAQ copy contradicts the pricing page: "unlimited staff users... no card needed" vs Starter "10 staff users" and "no charge until day 14" | home schema | Medium (content) |
| 7 | Review markup on /care-policies/data-protection-gdpr uses an invented 5 star rating (`rating ?? 5`) | 1 | Medium: self-serving/fabricated rating risk |
| 8 | Sitemap lastmod is the request time for every URL | all | Low-medium: Google learns to ignore lastmod |
| 9 | llms.txt: no Enterprise, no training/CPD/policy shop, "50+ languages" and em dashes | 1 | Low-medium |
| 10 | Language claim inconsistent: "60+" on all pages, "50+" / "over 50" on /faq and /who-its-for | 2 | Low |
| 11 | One broken link: blog body has relative href `england.nhs.uk/...` (404) | 1 | Low (content, DB) |
| 12 | Pricing page has no FAQPage/offer for the £25.99 module although both are visible; FAQ is in `<details>` | 1 | Low (opportunity) |
| 13 | No visible breadcrumb on any page although BreadcrumbList is emitted | 336 | Low |
| 14 | /gaps, /audits, /policies, /platform/email-marketing, /login, /register return `index, follow`, no canonical, generic or home title | 6 | Low (robots.txt already disallows) |
| 15 | Titles over 65 chars on 114 pages, descriptions over 165 on 91 | 114 / 91 | Low |
| 16 | Em/en dashes in visible copy on 146 pages (against house style), incl. pricing hero | 146 | Low (content) |

## Detail per issue

### 1. Home FAQPage with no visible FAQ (High, content/template)
- `apps/web/src/app/page.tsx` lines 1093 and 1104: `<JsonLd data={[webApplicationSchema(), faqPageSchema(faqs)]} />`. `faqs` comes from `getHomeFaqs()` (line 1022, DB then `DEFAULT_HOME_FAQS` line 1009).
- The live home is HomePageV2 (`isV2('home')` is LIVE in `lib/v2-rollout.ts`), which has no FAQ section (no match for faq in `components/marketing/home-page-v2.tsx`). Raw and hydrated text both lack "What is CareStream?" and the other nine.
- Fix: remove `faqPageSchema(faqs)` from the v2 branch (line 1093), keeping `webApplicationSchema()`. Or add a visible FAQ section using `<HomeFaq>`. Note `HomeFaq`/`FaqAccordion` (components/marketing/home-faq.tsx) renders answers only when `open` is true (answer text not in the HTML) and emits its own second FAQPage script: do not reuse it as is; use `<details>` like pricing-page-v2.
- Risk: very low. Template fix (one line).

### 2. Stale prices in SoftwareApplication (High, template)
- `apps/web/src/lib/schema.ts` lines 98 and 99: price '49.00' and '129.00', only two offers, no Enterprise.
- Fix: derive from `PRICING.plans` in `lib/pricing-data.ts` (same regex as `pricing/page.tsx` line 195) or use an `AggregateOffer` (lowPrice 85, highPrice 385, offerCount 3, priceCurrency GBP). Add `unitText: 'month'`. Also consider dropping `offers` here and relying on the /pricing Product, so there is one source.
- Risk: low. Template fix.

### 3. Stale prices in the WebMCP tool (High, template)
- `apps/web/src/lib/agent-tools.ts` lines 17-25 (`PLANS`): Starter 49, Professional 129, no Enterprise; "50+ languages" at lines 18 and about 55; used by `components/agent/marketing-agent-tools.tsx` (registered in the marketing layout, so on every marketing page).
- Fix: build `PLANS` from `PRICING.plans`; add Enterprise, annual price, £25.99 module. Align language count.
- Risk: low.

### 4. Breadcrumb targets return 404 (Medium-high, template)
- `apps/web/src/components/breadcrumbs-json-ld.tsx` builds crumbs from every path segment, so /features/x emits item https://www.carestreamai.com/features (404), /collection/x emits /collection (404), /uses/x emits /uses (404). Count: 53 + 9 + 14 = 76 pages. Also segment names are title-cased slugs ("Moving And Handling Of People") that differ from the H1 and title, and no visible breadcrumb exists to match.
- Fix: a map of segment to {name, path} for real parents (/features becomes /how-it-works or omit; /collection becomes /collections; /uses omit or create an index page; staff-training, care-policies, blog, who-its-for are real). For leaf names use the page's own H1/short title instead of the slug. Skip a crumb when its target is not a real page.
- Risk: low; verify with the parity script (`breadcrumb target ... is 404` should reach 0).

### 5. /uses/* missing from the sitemap (Medium, template)
- 14 pages (e.g. /uses/policy-gaps, /uses/staff-compliance) are 200, indexable, canonical, with FAQPage and BreadcrumbList, linked from the nav on all 351 pages, but `apps/web/src/app/sitemap.ts` does not list them.
- Fix: add them to `MARKETING` in sitemap.ts (source them from the same list that builds the nav/route, not by hand; see `app/(marketing)/uses/[slug]/page.tsx`). Also their titles are thin ("Staff Compliance | CareStreamAI", "Adhoc Training | CareStreamAI"): content fix, give each a descriptive title and description.
- Risk: low.

### 6. Home FAQ copy conflicts with live plans (Medium, content)
- "Pricing is per home with unlimited staff users, so there are no per user fees... no card is needed to begin" (home FAQ in DB / `DEFAULT_HOME_FAQS`). Starter in the live matrix has "10 staff users" and the pricing hero says "No charge until day 14", which implies a card. Moot if issue 1 removes the schema; still correct the copy wherever it is shown (DB site_pages for path `/`).
- llms.txt and agent-tools also say "per home". Pricing page says "per service". Use one term.

### 7. Review markup with an assumed rating (Medium, template)
- `lib/schema.ts` line 515: `ratingValue: opts.review.rating ?? 5`. The review is genuine, verbatim (lib/reviews.ts `policies[slug]`), named and visible on /care-policies/data-protection-gdpr, but the customer gave no star score. An invented 5 is exactly what Google's review spam policy targets, and a self-served review on the seller's own product page is not eligible for stars anyway.
- Fix: drop `reviewRating` unless a real score exists (reviewRating is required for a Review in Product snippets, so simplest is to emit no `review` at all, keep the quote visible). No aggregateRating is used anywhere on the site (good).
- Risk: none.

### 8. Sitemap lastmod (Low-medium, template)
- `app/sitemap.ts` lines 187 and 198: `lastModified: now`. Use real dates (blog `updated_at`, course/policy `updated_at`, otherwise omit lastmod).

### 9. llms.txt (Low-medium, content)
- `apps/web/src/app/llms.txt/route.ts`: mentions only Starter and Professional; no Enterprise, no £25.99 CPD courses, no policy shop, no collections, no /cpd-certified; "50+ languages"; three em dashes. Add Enterprise £385, annual prices, training £25.99 per staff member, links to /staff-training, /care-policies, /cpd-certified.

### 10. Language count (Low, content)
- "60+ languages" on all 337 pages; "50+ languages" on /faq and "over 50 languages" on /who-its-for, plus agent-tools and llms.txt. Pick one figure.

### 11. Broken relative link in a blog body (Low, content/DB)
- /blog/infection-control-training-for-care-staff-a-guide-for-managers links to `england.nhs.uk/national-infection-prevention-and-control-manual-nipcm-for-england` with no `https://www.`, so it resolves to /blog/england.nhs.uk/... (404). The correct URL is the one in `lib/course-cro-cpd.ts` line 138. Fix in the blog post body (DB).

### 12. Pricing schema gaps (Low, template). See SCHEMA-MATRIX.md for the current shape.
- Only monthly price in the Offers; the annual price (£850 / £2,300 / £3,850) and the £25.99 module are visible but not in schema. FAQ (9 questions in `<details>`, all in the HTML) has no FAQPage. Note Google now shows FAQ rich results only for well known government and health sites, so FAQPage is for AI/answer engines, not snippets.
- The Free plan work (branch free-tier-design) will hit four things: see PLAN.md step 6.

### 13. No visible breadcrumbs (Low, template)
BreadcrumbList is emitted without a visible trail on any page. Google tolerates this but prefers parity; add a small visible trail on course, policy, feature, blog pages, or accept it.

### 14. App routes served as indexable (Low)
/gaps and /audits have the home page title and `robots: index, follow`, /policies the same, /platform/email-marketing "Platform Console" title; /login and /register are `index, follow` with no canonical. robots.ts disallows all of them, so Google sees the URL only if linked; the meta can never be read by a blocked crawler. Add `robots: { index: false }` in their layouts as defence in depth (and keep robots.txt). /register is linked from every pricing CTA; it is correctly blocked.
No public marketing page describes /platform/email-marketing (zero mentions of "email marketing" in the 351 pages), so nothing to reconcile. Gap detection and audits are described on /policy-gap-detection, /care-audits and the pricing matrix, and the descriptions match the matrix rows.

### 15 and 16. Titles, descriptions and dashes (Low, content)
Longest titles 90+ chars (blog posts, workforce-compliance-register feature page). Google truncates, not penalises. Em/en dashes appear in the visible text of 146 pages, including the pricing hero "No charge until day 14 — cancel anytime"; house rule is no dashes in copy.

## Things checked and found clean
Course JSON-LD: all 98 have provider, offers (GBP, price visible on page), hasCourseInstance, description. Policy Product: all 66 have offers with shipping and return policy, price visible. BlogPosting: all 56 have headline, image, datePublished, dateModified, named Person author, publisher; HyperToc present. No aggregateRating anywhere. Org identity (address, Companies House 11731704, CPD 50224) matches the footer. Logo URL 200. No hreflang (single locale, fine). robots.txt and sitemap host are www. Nav, footer and pricing CTAs are real `<a href>` in raw HTML. No image lacks an alt attribute (`/care-policies` has 67 decorative empty alts out of 80 images, worth reviewing since they may be product thumbnails).
