# Free tier: build plan, dark launch, testing, rollback, open questions

Read DESIGN.md first. Rules that apply to every PR: stage exact paths only; deploy only by `git push origin main` (previews do not work for this project); no `vercel --prod`; no dashes in any copy; every new table has RLS enabled in the same SQL; migrations run BEFORE the code that needs them.

## 1. How database changes are applied here (recorded)

No `prisma migrate`. Write idempotent SQL in `apps/api/prisma/sql/2026-11-xx_free_tier_*.sql` (header comment, `BEGIN/COMMIT`, `IF NOT EXISTS`), Len or I run it in the Supabase SQL editor (project `shjpatdojoigcgmaewbg`), then add the matching models/columns by hand to `apps/api/prisma/schema.prisma`; `prisma generate` runs in the build. After the SQL run `get_advisors(security)` to confirm RLS is on for every new table. Because the columns are additive with safe defaults, applying the SQL before the code deploys cannot break the running app.

## 2. Dark launch mechanism

Three switches, all default OFF, all inert for existing tenants:

1. **API env `FREE_TIER_ENABLED`** (Vercel, API project). While false, `POST /auth/register` with `tier:'free'` is rejected with the same error as an unknown tier unless the body carries `preview_code` equal to env `FREE_TIER_PREVIEW_CODE`. The Free plan row has `is_public=false`, so nothing lists it.
2. **Web `lib/free-rollout.ts`** (modelled on `lib/v2-rollout.ts`): `FREE_LIVE = false` plus a `?free=1` query override. It controls: the Free card and column on `/pricing`, the "start free" links, the register page copy. With the flag off, `/register?tier=free` renders the normal paid trial page unless `?code=<preview code>` is present; the code is passed through to the API as `preview_code`.
3. **Per tenant** nothing else is needed: every free rule is guarded by `tenant.tier === 'free'` (or `policies_lifetime_limit !== null`), so the code paths are unreachable for existing paid tenants even after deploy.

**Len tests on production by signing up**: visit `https://www.carestreamai.com/register?tier=free&code=<code Len is given>` (code set in Vercel env; I never print it), sign up with a real address of his (use `len@orreryintelligence.com` style test addresses, not the Crossways one), verify the email, and land on the free dashboard. Pricing preview: `https://www.carestreamai.com/pricing?free=1`. To go public: set `FREE_TIER_ENABLED=true`, flip `FREE_LIVE` to true in a one line PR, and push to main.

Test tenants are cleaned up with the existing closure flow (`/billing/close-account`) or a platform delete; the owner notification email for each signup (`sendNewTenantNotification`) is expected.

## 3. Ordered PRs

Each PR is small, merges to main on its own, and changes nothing user visible for existing tenants until PR 11.

| PR | Contents | Risk | Verify |
|---|---|---|---|
| 0 | **SQL migration file only** + schema.prisma additions (plans.`has_audit_recommendations` default true, tenants columns, `policy_creation_ledger`, `free_usage_counters`, `signup_attempts`), RLS on, Free plan INSERT (`is_public=false`). Run the SQL first. | additive | advisor clean; `SELECT name, has_audit_recommendations FROM plans` shows true for the paid plans |
| 1 | `lib/tiers.ts` (single `NO_SUBSCRIPTION_TIERS`, `isFreeTier`, `tierOf(tenantId)` with 30 s cache) replacing the 4 copies; add `'free'`; web middleware lists. No behaviour change. | low | grep shows no remaining copies; login for a training_only account unchanged |
| 2 | Plan flag plumbing: `has_audit_recommendations` in `PlanFeature`, `getPlanFeatures`, `/billing/summary`, web `PlanFeatures` type; `requirePaidTier`; `checkFreeAiBudget` inside `checkAiCreditLimit` (no effect while no tenant is free); add the missing `checkAiCreditLimit` to coverage start/batch/analyse. | low (paid tenants with a token cap now get checked on coverage; flag to Len, it can surface `AI_TOKEN_LIMIT_REACHED` earlier for heavy tenants) | unit tests below |
| 3 | Audit recommendation lock: early return in `generateAuditRecommendations`; `recommendations_locked` and `findings_summary` in the complete response; relax `me.ts:480` approval guard; locked action plan route; `POST /runs/:id/recommendations` retroactive generate; web: button copy, locked card with sample, hub view. | medium (touches the audit complete path) | paid tenant audit still produces recs; run with `has_audit_recommendations=false` on a Sandbox tenant to verify without any free signup |
| 4 | Policy allowance: `lib/policy-allowance.ts` (`claimPolicySlot`, `releasePolicySlot`), calls in `POST /policies`, `/bulk` (incl. `skipped_for_limit`), release in `/:id/delete` and ingestion failure; `GET /policies/allowance` for the UI. Inert while `policies_lifetime_limit` is NULL. | medium | tests; Sandbox tenant with the limit set to 5 by SQL |
| 5 | Gap pipeline guards: `requirePaidTier` on the paid route groups; drill in taster counter; re-run rule R1 (or whatever Len chooses) on the three start endpoints. | medium | route table test; tenant with `tier='free'` set by SQL on a test tenant |
| 6 | `tierGuard` API middleware (allow list for free) after `tenantGuard`; 402 `UPGRADE_REQUIRED` body; web `api-client` maps codes to the upgrade panel. | medium (global middleware; a bug here affects every request, so it first reads tier through `tierOf` and returns next() immediately for non free) | request matrix test |
| 7 | Register changes: `tier:'free'` in the Zod schema behind `FREE_TIER_ENABLED`/`preview_code`, abuse controls (disposable check, domain rule, IP limiter, honeypot, `signup_attempts`), enrol `free_plan` campaign, fix `sendDayOneNow` key, `registerFree` events. | medium | signup with preview code on production |
| 8 | Web: register page (free copy, honeypot, consent line), middleware allow list, admin shell free nav, free dashboard, `/policies` allowance strip and disabled upload, `/gaps` banner, upgrade panels with click events, billing page copy for free. Behind the tier check. | medium | click through as the test tenant |
| 9 | Upgrade path: set `tier='full'` on paid `plan_id` in `reconcileTenantBilling` and the webhook; clear tier cache; cancel `free_plan` enrolment and enrol the plan drip; `/billing` copy. Test with Stripe test card. | medium (billing) | Stripe test mode: free -> Starter: data kept, flags unlock, tier flips |
| 10 | Email: `free_plan` campaign (drafts only), predicates in `conditions.ts`, `sendCampaignEmailNow`, `email-marketing/page.tsx` tab and helper text. Nothing sends until Len publishes each email on that page. | low | Sync new emails button; preview and test send each draft to `len@orreryintelligence.com` |
| 11 | Marketing: pricing data + component + CSS (4 columns), FAQ, llms.txt, agent-tools (also fixes stale £49/£129), schema.ts stale price, policy-gap-detection and care-audits copy, home secondary link; all behind `FREE_LIVE`. Update `gen_pricing_data.py` outside the repo in the same sitting. | low | `/pricing?free=1` |
| 12 | Platform dashboard "Free tier" panel and `free_funnel_v` view; exclude `tier='free'` from MRR/trial stats. | low | |
| 13 | Go live: set `FREE_TIER_ENABLED=true` and `FREE_LIVE=true`. v2 of emails (event driven) after a week. | | |

## 4. Rollback

- **Before go live**: nothing to roll back for users; revert any PR with `git revert` and push (no schema revert needed, all additions are nullable or defaulted).
- **After go live**: set `FREE_TIER_ENABLED=false` (stops new signups instantly, existing free tenants keep working) and `FREE_LIVE=false`. To pause the AI spend only: set `FREE_GLOBAL_DAILY_BUDGET_USD=0`. Emergency freeze of a single tenant: `UPDATE tenants SET free_ai_budget_usd=0 WHERE id=...`.
- **Audit lock**: reverting PR 3 restores recommendations for everyone; a free tenant's already completed audits have null recommendations and can be backfilled by the retroactive generate endpoint once they upgrade.
- Plan row and ledger tables can stay in place; they are inert.
- Do not delete free tenants' data on rollback; if the offer is withdrawn, move them to a read only state by email to the admins first.

## 5. Test plan

**Unit tests to add** (`node --test` `.test.mjs` next to pure functions, matching the existing `role-name.test.mjs` style; there is no test runner configured, so add an `npm test` script to `apps/api/package.json` that runs `node --test`): allowance arithmetic as a pure function (claim, duplicate hash, limit, release only when never active, bulk partial acceptance order); disposable and webmail domain classification; `registerFreeLimiter` windowing; free route allow list (path -> allowed/denied matrix, including `/analytics/gaps/adopt` denied and `/analytics/gaps` allowed); predicate truth tables for the new email conditions using an injected counts object; `needsBilling` helper for every tier; pricing data shape (every row has the same number of values as plans; no dashes in strings).

**Integration (manual against a Sandbox/test tenant with SQL set flags)**: race test of `claimPolicySlot` with 8 parallel calls on a limit of 5 (expect exactly 5 succeed); recommendations skipped for a plan without the flag and no `ai_usage_events` rows for `audit_recs`/`readiness`.

**Manual test script (Len, on production after PR 8 and with flags still off)**
1. Open `/pricing` normally: no Free card. Open `/pricing?free=1`: Free card first, 4 columns, correct on mobile.
2. Open `/register?tier=free&code=...`, sign up with a test address, tick the terms, create. Expect the check your email page.
3. Open the verification email, click. Expect to land on the free dashboard, not `/start` and not asked for a card.
4. Sidebar: only Dashboard, Audits, Policy gap analysis, Policies, Staff, Settings, Billing unlocked; others show the upgrade overlay. Type `/training` in the address bar: redirected to dashboard.
5. Audits: all platform templates listed; "Build your own audit" shows the Enterprise lock. Start one, answer, add a photo, sign, complete. Expect: no waiting for AI, a findings summary, a locked AI recommendations card with the sample and a See plans button, PDF downloads, manual action works, "generate draft plan with AI" is locked.
6. Staff: invite 3 staff (no cap), send a login link to one, open it on a phone, run an audit from the hub. Try the 51st credential email in a day (cap message).
7. Policies: header says "0 of 5 used". Upload 2 files, then a bulk of 5. Expect 3 added and 2 skipped with the message, strip "5 of 5", upload disabled, upgrade panel. Delete one: still "5 of 5". Upload a new version of one: still 5 of 5, allowed. Re-upload an identical file: no error and no extra use.
8. Gap analysis: banner "covers the policies you have uploaded (5 of 5)". Run all four sections. Expect results, no credit cards prompts. Run coverage again immediately: expect the "nothing has changed" message (rule R1). Open 3 gap drill ins: examples shown; open a 4th: locked with upgrade. Try Adopt: locked.
9. Click See plans, go to Billing, upgrade to Starter in Stripe test mode. Expect tier flips, recommendations button appears on the earlier audits, the policy limit is lifted, no data lost.
10. Emails: in `platform/email-marketing` open the new "Free account" tab, press Sync new emails: 10 drafts appear inactive. Preview each, test send to your address. Publish only email 1, sign up another test tenant and confirm only that one arrives, with the unsubscribe link working.
11. Existing paid tenant (use the Sandbox or a test tenant): audits still produce AI recommendations, gap analysis unchanged, pricing unchanged.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Free AI cost runaway (bot signups, re-runs) | lifetime budget per tenant, global daily budget, signup limits, R1 re-run rule, kill switch |
| Missed API route lets free tenants reach an AI feature (API had no tier gate; web only) | allow list middleware default closed; request matrix test; AI spend panel with alert |
| A bug in the global middleware affects paid tenants | non free path returns immediately; ship in its own PR; cache keyed by tenant |
| Free tenants cannibalise Starter (the audits and gap detection are currently paid; gap detection is Professional and above) | the limits (5 policies, no recommendations, no fixes, no chat, no training) keep the paid value; measure conversion and Starter signups; the pricing page must say clearly what Starter adds |
| Pricing data is generated from a file outside the repo | update the generator in the same change or the Free column disappears |
| `sendDayOneNow` bug may already be dropping welcome emails | check in production first (CODE-MAP section 5); it affects paid signups today |
| Marketing email rules (PECR) | consent wording, unsubscribe, publish upsell emails only after review |
| Coverage runs on unchanged policies are full price each time | R1 |
| Tier cache staleness on upgrade (30 s) | clear cache in reconcile/webhook; the web refreshes the session after checkout |
| New free users are mostly small homes on Gmail: domain rule must not block them | webmail list by exact address only |
| `customer.subscription.deleted` sets 'cancelled' for a tenant who upgraded then cancelled: they are locked rather than returned to Free | decide (open question 8) |

## 7. OPEN QUESTIONS for Len

Decided already (recorded): unlimited staff logins with light safeguards; 5 policy lifetime allowance counted at policy creation, new versions and re-uploads do not count, translations do not count, deleting does not refund; all platform audit templates are free; AI recommendations at the end of audits stay paid; custom audits stay Enterprise; /gaps is the logged in page and the 5 policies count against it.

Still to decide (my default in brackets):

1. **Re-runs of the four analyses** (R1 run again only if a policy changed, plus one forced run per section per month). Or a flat monthly cap, or none?
2. **AI generated fixes inside /gaps**: coverage drill in "what to add with example wording" paid with a taster of 3 [recommended]; wording suggestions (they are the output of analysis 4) free; consistency "resolve with AI" free or paid [free]; adopt, approvals, publish, training from a gap paid. Agree?
3. **Hub chat for free tenants**: staff chat has a Sonnet cost per question. [None: 0 questions.] Or a small taster such as 20 a month?
4. **Staff hub value**: with no chat or training, free staff only see audits assigned to them. Is that enough, or should the hub show a locked preview?
5. **Free AI budget per tenant** [$6 lifetime] and the global daily cap [$40/day]. Comfortable?
6. **Policies bought in the policy shop or written by CareStream**: do not count toward the 5 [default]. Or count?
7. **Trial on upgrade**: Free to Starter currently gets the standard 14 day card up front trial (the first charge is 14 days after upgrading). Keep, or charge immediately because they have already had a free period?
8. **Cancel after upgrading**: a cancelled paid tenant is locked today. Should they drop back to Free (keeping 5 policies and audits) instead? [Not in v1.]
9. **Existing tenants**: confirm no existing tenant is moved or changed (all current rows keep `policies_lifetime_limit` NULL, `tier` unchanged). Are there trial tenants with no plan today who should be offered Free?
10. **Abuse**: one free account per organisation domain for company email domains, per address for Gmail style addresses [default]. Add a CAPTCHA later if needed?
11. **Consent wording and PECR**: unticked optional "send me product news" box plus the onboarding sequence relying on the soft opt in [default]. Who signs this off?
12. **Marketing copy and sample**: the sample AI recommendations for the locked card and email 7, and a case study for email 10, need real anonymised content from you.
13. **Inactive free tenants**: delete or archive after 12 months of no login? [Archive, email first.]
14. **Platform admin tools**: do you want a button to raise one tenant's policy limit or AI budget? [Yes, simple SQL for now.]
15. **Name**: "Free" or something warmer (Starter Free, Essentials)? Pricing page card label.
16. **Staff Q&A WhatsApp/email channels** (inbound email, WhatsApp): leave off for Free [default].

## 8. Decisions log (Len, 2026-11-11) and what changed in the design

- Re-runs: only if a policy changed plus one forced run per section per month (built, PR #360).
- AI fixes in /gaps: wording suggestions free; drill in paid with a 3 example taster; adopt, publish, approvals paid (built).
- No hub chat for free tenants (monthly_query_limit 0, API allow list).
- AI budget: nothing for audits (recommendations and readiness scoring skipped entirely). **$10 lifetime per free tenant for /gaps** (replaces the $6 in DESIGN.md section 6), plus a **$40 per day platform wide safety cap** across all free tenants (`FREE_GLOBAL_DAILY_BUDGET_USD`), both env tunable. The code shows no reason to drop the daily cap: ai_usage_events is written asynchronously, so per tenant overshoot by a batch is possible and the daily cap bounds the total.
- Shop bought policies do not count toward the 5 (the platform delivery path never claims a place).
- No trial on upgrade: Free to paid is charged straight away.
- Cancel after upgrading: the tenant drops back to Free, keeping all data. Exact rule (`downgradeToFree`): tier free, plan Free, status active, Stripe subscription cleared (customer kept), `free_since` = now so the $10 budget starts fresh, `policies_lifetime_limit` = 5, `policies_created_lifetime` = max(counter, non archived policies held). Nothing is deleted. Edge cases: a downgraded tenant with more than 5 policies keeps and analyses all of them (the $10 budget bounds the cost) and cannot add any; staff, training and audit data are kept but training and chat routes are closed by the API allow list; hub staff of that tenant lose chat; account closure still closes rather than downgrades; a cancelled tenant that resubscribes is charged straight away and set back to full.
- Consent and PECR sign-off later; email drafts stay unsent.
- Pricing page JSON-LD must match the visible content once the Free card is added (Free Offer price 0 GBP, £85/£230/£385 monthly and annual, FAQ schema equal to the visible FAQ, no stale £49/£129 in agent-tools.ts, schema.ts, llms.txt, home snapshot, faq). To do in the pricing PR.
