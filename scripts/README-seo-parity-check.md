# SEO parity check

`scripts/seo-parity-check.py` is a read-only regression check for the things the SEO and schema sweep (2026-11-11) found. It needs only Python 3 (no packages). It fetches the site's sitemap (plus the `/uses/` links from the home page), reads each page as raw server HTML, and checks:

- status 200, exactly one H1, a title, a meta description, canonical equal to the URL
- every JSON-LD block parses
- every FAQPage question and answer is present in the visible HTML text
- Course and Product prices are visible on the page
- Review text is visible; any `aggregateRating` is flagged
- SoftwareApplication offers and the `/pricing` plan offers equal 85.00, 230.00, 385.00
- every BreadcrumbList target URL returns 200

Issues are `FAIL` (fix) or `WARN` (look). Raw HTML only: text that appears only after JavaScript runs is not seen, which is the point (that is what crawlers and AI answer engines read).

## Run

```
npm run seo:parity                                  # production, www.carestreamai.com
npm run seo:parity -- https://PREVIEW-URL.vercel.app
python3 scripts/seo-parity-check.py https://PREVIEW-URL.vercel.app --strict --csv /tmp/inventory.csv
```

Options: `--only /features,/uses` (path prefixes), `--ignore TEXT` (drop known issues whose message contains TEXT, repeatable), `--csv FILE` (one row per URL), `--strict` (exit 1 on any remaining FAIL). A full run reads about 350 pages and takes a minute or two.

A preview behind Vercel Deployment Protection needs the protection bypass secret: `VERCEL_AUTOMATION_BYPASS_SECRET=... npm run seo:parity -- <preview-url>`. The sitemap on a preview still lists production URLs; the script uses only their paths and fetches them from the base you pass.

## CI

`.github/workflows/seo-parity.yml` runs it on `deployment_status` for preview deployments and by hand (Actions, "SEO parity check", Run workflow, with a URL). It is informational (`continue-on-error`) until the known issues are cleared; delete that line to make it a real gate. Add the bypass secret as repository secret `VERCEL_AUTOMATION_BYPASS_SECRET` if previews are protected.

## Baseline (production, 2026-11-11, before the fix PRs)

79 FAIL: 76 breadcrumb targets that 404 (/features 53, /uses 14, /collection 9), 2 stale plan prices in the home SoftwareApplication, 1 home FAQPage not visible. Fix PRs clear them in that order; a clean run prints `0 FAIL-level issues`.
