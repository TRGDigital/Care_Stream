# Free tier: code map (read-only investigation)

Read from origin/main @ 4d234eaa (2026-11-11). Nothing in this branch changes code. Paths are relative to the repo root. Line numbers are from that commit and will drift.

A note on "the public /gaps page": https://www.carestreamai.com/gaps IS the logged-in admin page `apps/web/src/app/(admin)/gaps/page.tsx`. It is behind login (middleware GATED list). The marketing page is a separate route, `/policy-gap-detection`. They are different things; the 5 free policies count against the logged-in page and the API under `/analytics/gaps*`.

## 0. How a signup becomes a tenant today

| Step | Where | Behaviour |
|---|---|---|
| Register page | `apps/web/src/app/(signup)/register/page.tsx` | Two steps (email, then org name, name, password, terms tick). Posts `{org_name,name,email,password}` to `POST /auth/register`; adds `tier:'training_only'` only if `?tier=training_only` (l.53, 83). Headline "Start your 14 day free trial / Card required" (l.117). It never sends `plan_id`. |
| API register | `apps/api/src/routes/auth.ts:59-171` | Zod schema l.59-68 (`tier` enum `full|training_only`). Rejects existing email (l.82). Creates tenant + admin user in one transaction (l.97-124): `subscription_status:'trialling'`, `plan_id` null unless supplied, `tier` 'full' or 'training_only', `email_verified:false`, 24h verification token. Sends verification email (l.139), owner notification `sendNewTenantNotification` (l.147), and for non training tiers enrols the plan drip and calls `sendDayOneNow` (l.157-168). Response `email_verification_required`. |
| Slug / account number | `auth.ts:36-52`; schema `Tenant.account_number` default `CS-` + sequence | `email_domain` is set to the slug (not a real email domain). |
| Verify email | `auth.ts:370-409`; web `app/(auth)/verify-email/page.tsx` | Token lookup, marks verified, mints a 15 minute one-time login token. Web signs in with it (`signIn('credentials',{mode:'magic'})`) and sends the user to `/start`. |
| Login | `auth.ts:186-307` | Requires `email_verified`. Lockout after 5 fails. Returns `needs_billing`, `tier`, `audit_access`. |
| Magic link | `auth.ts:341-366`, `respondWithSession` `auth.ts:311-335` | Same `needsBilling` formula. |
| Refresh | `auth.ts:544-584` | Re-evaluates `needsBilling` on every refresh; returns `tier`. |
| NextAuth | `apps/web/src/lib/auth.ts` | Copies `needsBilling`, `tier`, `auditAccess` into the JWT at sign in (l.171-180) and refreshes them when the token is refreshed or `update()` is called (l.191-221). Session lasts 90 days. |
| Web gate | `apps/web/src/middleware.ts` | `GATED` routes redirect to `/start` when `token.needsBilling` (l.131-137). `training_only` is redirected away from `TRAINING_ONLY_BLOCKED`; `policies_only` is held to an allow list `POLICIES_ONLY_ALLOWED` (l.40-46, 139-150). Store app mode (Android/iOS) hides everything except the hub. |
| `/start` | `apps/web/src/app/(onboarding)/start/page.tsx` | Loads `GET /billing/plans` (only `is_active && is_public`, sorted by price asc, `billing.ts:17-30`), "Start free trial" calls `POST /billing/checkout`. If `needsBilling === false` it bounces to /dashboard (l.34-39). |

### What plan / tier a new signup gets today

A normal signup gets `tier:'full'`, `plan_id: null`, `subscription_status:'trialling'`. It has NO plan until Stripe checkout completes. `loadTenantPlan` (`apps/api/src/lib/plan-limits.ts:39`) returns `plan:null`, and `checkFeature` fails every flag (`plan-limits.ts:306-319`). Until checkout the billing gate blocks them from the app entirely (no card, no app).

### What blocks a user without a card

1. `needsBilling = !NO_SUBSCRIPTION_TIERS.has(tier) && subscription_status !== 'active' && !stripe_subscription_id`. This formula is copy pasted in four places: `auth.ts:285`, `auth.ts:322`, `auth.ts:580`, `billing.ts:70`. `NO_SUBSCRIPTION_TIERS = {training_only, policies_only}` is defined twice (`auth.ts:20`, `billing.ts:12`).
2. `apps/web/src/middleware.ts:131` redirects GATED routes to `/start` using the JWT claim.
3. There is NO API level billing gate. A tenant with a JWT but no card can call every API route that does not itself call `checkFeature`/`checkPolicyLimit`. The gate is web only.
4. Policy-only and training-only tenants are created by the shops with `subscription_status:'active'` (`routes/training-public.ts:647,820`, `routes/policy-shop-public.ts:379`). Precedent for a self serve tier with no Stripe subscription.

## 1. Plans, flags and billing

| Item | Where | Notes |
|---|---|---|
| Plan model | `apps/api/prisma/schema.prisma:138-168` | `monthly_query_limit` is a non null Int. `max_policies`, `max_staff_users`, `max_handbooks`, `max_manual_knowledge_entries` nullable (null = unlimited). Flags: `has_advanced_analytics, has_cqc_report, has_gap_detection, has_face_to_face, has_custom_audits, has_effectiveness, has_training_impact, has_workforce_compliance`. `monthly_ai_credit_limit` (legacy), `monthly_ai_token_limit`, `monthly_annual_license_limit`. `is_public=false` hides a plan from the chooser. |
| Plan rows | No seed in the repo | Starter, Professional, Enterprise (and an internal Sandbox plan) exist only in the database. Token limits set by `prisma/sql/2026-09-17_ai_token_allowance.sql` (6M, 18M, 30M, unlimited for Sandbox). Verify live rows before the migration. |
| Tenant model | `schema.prisma:268-326` | `tier` default 'full', `subscription_status` default 'trialling', `feature_flags` Json (per tenant beta flags). |
| plan-limits | `apps/api/src/lib/plan-limits.ts` | `checkFeature` (l.306), `checkPolicyLimit` (l.168; counts non archived internal policies, handbooks separately), `remainingPolicySlots` (l.209), `checkUserLimit` (l.230; excludes agency), `checkQueryLimit` (l.144), `checkAiCreditLimit` (l.119; includes `checkAiTokenLimit`), `trackAiAction` (l.139, non billable log), `logAiCredit` (l.133), `getPlanFeatures` (l.339), `tenantHasFlag/requireTenantFlag` (l.294-303), `FEATURE_TIER` upgrade copy (l.279). `assertNotCancelled` blocks only 'cancelled'. |
| AI token meter | `apps/api/src/lib/ai-tokens.ts`; `lib/token-usage.ts` | Every Claude call is logged to `ai_usage_events` with tenant, feature, model, tokens and `cost_usd` (`token-usage.ts:104-128`, async fire and forget). Monthly window only. `checkAiTokenLimit` throws `AI_TOKEN_LIMIT_REACHED`. Price table `token-usage.ts:39-53`. |
| Billing routes | `apps/api/src/routes/billing.ts` | `/plans` l.17, `/checkout` l.34 (admin), `/sync` l.50 (reconciles from Stripe, refreshes the drip plan), `/cancel`, `/close-account`, `/summary` l.118, `/portal` l.196, webhook l.217. |
| Stripe | `apps/api/src/services/billing/stripe.ts` | `ensurePlanPrice` (l.72) throws if price is 0/unset, so a Free plan can never be passed to checkout. `createCheckoutSession` (l.102): 14 day trial, card up front (l.133-135). Webhook (l.965) and `reconcileTenantBilling` (l.854) set `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, `plan_id` from subscription metadata. They never touch `tenant.tier`. `customer.subscription.deleted` sets 'cancelled' (l.1030). |
| Web gating helpers | `apps/web/src/lib/use-plan-features.ts`; `components/admin/upgrade-gate.tsx` | `usePlanFeatures` reads `/billing/summary.features`; `UpgradePanel`, `UpgradeOverlay`, `LockChip` link to `/billing`. `hasFeature` defaults to true while loading. |
| Billing page | `apps/web/src/app/(admin)/billing/page.tsx` | Shows "Upgrade to X" for plans priced above the current plan (l.339) and a start trial chooser when status is not active (l.392). Works with a Free plan priced 0 as current. |
| Admin shell | `apps/web/src/components/admin-shell.tsx:100-102` | Per tier nav (training only, policies only) with locked items opening a tier overlay. The pattern to copy for a `free` tier. |

## 2. Audits

Key finding: **running audits is not plan gated at all today.** There is no `has_audits` flag. Anyone past the web billing gate can run every platform audit template. Only (a) building or editing custom audits (`has_custom_audits`, Enterprise), (b) linking audits to training (`has_training_impact`) and (c) the AI import are flag gated. So "audits become free" is mostly a gating and cost question, not a feature unlock.

| Thing | Where |
|---|---|
| Router | `apps/api/src/routes/audits.ts` (2525 lines), mounted `app.ts:239` behind `requireAuth` + `tenantGuard`. |
| Auth | `requireAuditAccess` (`middleware/auth.ts:68`): admins get `all`; staff need `audit_template_ids` ("Staff + Audits"). `auditTemplateAllowed` l.93. |
| Models | `AuditTemplate/Section/Question/Run/Answer/AnswerEvidence/Action`, `schema.prisma`. Platform templates have `tenant_id null`, seeded lazily by `ensurePlatformTemplatesSeeded` (`audits.ts:1250`, called from `GET /templates` l.1335). |
| List templates | `GET /audits/templates` l.1334 (all active platform + own, minus hidden). |
| Start a run | `POST /audits/runs` l.1790. One run per template, period and subject. |
| Answers, evidence | `POST /runs/:id/answers` l.1928; evidence upload l.1980 (S3, image only). |
| Complete | `POST /audits/runs/:id/complete` l.2185-2250. Validates all questions answered, then ALWAYS calls `generateAuditRecommendations` (l.2224 approval path, l.2239 direct path) and then builds the PDF report and emails admins. |
| AI recommendations | `generateAuditRecommendations` `audits.ts:2083-2181`. Reads the editable prompt `aiPrompt usage 'audit_recommendations'` or `DEFAULT_AUDIT_RECOMMENDATIONS_PROMPT` (l.1183), calls Claude (default model, Sonnet 4.5, maxTokens 1200, feature `audit_recs`, l.2173), and in parallel `scoreAuditDomains` (`services/analytics/readiness.ts:33`, Claude, feature `readiness`). Saves `AuditRun.ai_recommendations` + `readiness_scores`. Logs `trackAiAction` (non billable). **No credit or token check, no plan check.** Estimated cost about $0.03 to $0.06 per completed audit. |
| Where recommendations are read | `GET /runs/:id` (whole run row, l.1868) and the `complete` response; `services/audits/report.ts:59` (report JSON, used by `GET /runs/:id/report` and the PDF `report-pdf.ts:175`); `routes/me.ts:453,480` (care manager approval detail and approve guard); `services/audits/action-plan.ts:55-60` (AI action plan is extracted from the recommendations and refuses to run without them); `services/rag/query.ts:1014-1058` (the staff chat "auditing" category uses recommendations as context); readiness analytics (`readiness.ts:85`). |
| UI | Admin: `apps/web/src/app/(admin)/audits/page.tsx` (list, start, builder; `LockChip` for Enterprise at l.236, 373, 632), `audits/[id]/page.tsx` (complete button text "Complete & get AI recommendations" l.704; the collapsible recommendations card l.720-735; `AuditActionPlan canGenerate` l.737). Hub (staff): `components/hub/audits-view.tsx` (recommendations l.530, action plan l.535, button copy l.512-520). Renderer `components/audit-recs.tsx`. Builder `components/admin/audit-builder.tsx`. |
| Custom audits | `POST /templates` l.1407, `/templates/import` l.1441 (also `checkAiCreditLimit` and logs a credit), `PUT /templates/:id` l.1475, `/templates/:id/copy` l.1492 all `checkFeature has_custom_audits`; `PATCH /templates/:id` (link training) `has_training_impact` l.1555. Hiding platform templates, rooms, assignments, insights, action plans have no flag. |
| Other AI in the audit feature | `action-plan.ts:27` (feature `action_plan`, Claude on demand); `import.ts` (AI import). Everything else is deterministic. |
| Side effects at completion | PDF to S3, email to admins (`generateAndStoreAuditReport`), assignments, approval workflow. Daily cron `/cron/audit-reminders` emails admins. |

Marketing: `apps/web/src/app/(marketing)/care-audits/page.tsx`, `lib/audit-questions.ts`.

## 3. Policy gap analysis (the /gaps page)

### UI

`apps/web/src/app/(admin)/gaps/page.tsx` (1783 lines). Locked check at l.176-177 (`!features.has_gap_detection`) renders an `UpgradePanel` titled "Policy gap analysis ... Available on the Professional and Enterprise plans" (l.426-432). It is Professional and above only today; Starter does not have it (`FEATURE_TIER`, `plan-limits.ts:280`).

Four steps ("pipeline"), each its own section and run button:

| Step | UI | API | What is analysed | AI? |
|---|---|---|---|---|
| 1 Regulation coverage | page body l.560-800, `runAnalysis` l.330, `driveCoverageBatches` l.314 | `POST /analytics/gaps/analyse/start` `analytics.ts:582`, `/analyse/batch` l.602 (loop until remaining 0), legacy `/analyse` l.621, `GET /analytics/gaps` l.301 | The regulations in scope for the tenant (`getScopedRegulations`, `regulation-coverage.ts:194`, filtered by care setting and service profile) against ALL the tenant's policies with `status:'active'` (`regulation-coverage.ts:432-436`). One regulation = one unit; 12 per batch (`COVERAGE_BATCH`). | Per regulation: vector search over the tenant's whole Pinecone namespace (`WIDE_K` 24), shortlist, 1 Haiku "subject" call (`regulation-coverage.ts:345`), and if a policy is on subject 1 Sonnet "required elements" call that reads the whole policy up to 60k chars (`:249`). A regulation with no shortlist costs nothing but an embedding. |
| 2 Out of date content | `PolicyHealthSection` l.1073 | `GET /analytics/policy-lint` l.675, `POST /policy-lint/scan` l.690 (`scanTenantPolicies`, `policy-lint.ts:204`; optional `policyIds`) | All `status:'active'` policies, text only. | No AI (deterministic signal catalogue). |
| 3 Cross policy consistency | `PolicyConsistencySection` l.1455 | `/analytics/consistency/scan/start|batch` l.788-806, `/consistency/detect` l.841 (`policy-consistency.ts:466`, calls `checkAiCreditLimit` l.466) | `claimSourcePolicies` = all active policies that are real policy documents (`policy-consistency.ts:240`). Claims extracted per policy (Haiku, `:202`), then conflicts detected across topic groups (`:419`, `:438`). | Yes, Haiku per policy plus per group; resolve button is another call (`:570`). |
| 4 CQC wording alignment | `PolicyWordingAlignmentSection` l.1623 | `/analytics/wording-alignment/start|batch` l.996-1005 (`saf.ts:332,343`) | All active policies, one at a time, batch of 3. Policies with no linked quality statement cost nothing. | Yes, two Sonnet calls per policy (`saf.ts:172,200`), `checkAiCreditLimit` per policy (l.367). |

So: **every section reads the tenant's whole set of active policies in one run. Nothing in the code is "per selected policy".** The only targeted entry is `scanTenantPolicies(tenantId, policyIds)` for lint. There is no existing "policy analysed" counter.

Other `/analytics/gaps*` surfaces (all behind `checkFeature has_gap_detection`, 30 call sites in `analytics.ts`):
- Drill in "what to add with example wording": `POST /gaps/:reference_key/detail` l.1296 -> `gap-detail.ts getGapDetail` (about 4 to 5 Sonnet calls per gap, cached in `gapDetailCache`; `/gaps/pregenerate` l.649 warms 8 at a time). **This is the expensive part**: a tenant with 60 gaps who opens all of them costs roughly $6 to $12.
- Adopt a fix into a policy, tracked changes, publish, approvals, external review, republish: l.920-1230 (`policy-adoption.ts`). Mutates policies, reindexes (embedding cost), sends emails.
- Decisions, training module and onboarding generation from a gap: l.1330-1480 (`checkAiCreditLimit` l.1392).
- SAF alignment per regulation l.982, policy matrix l.1229, due for review l.1242, versions, remind.
- `GET /analytics/gaps/missing-policies` l.553 (no plan check; free; derived from stored coverage; `missing-policies.ts`; banner `components/admin/missing-policies-banner.tsx`). Useful free upsell hook toward the policy shop.
- Lint ignore feature: l.747-786, `services/analytics/lint-ignores.ts`, table `policy_lint_ignores` (manual SQL `prisma/migrations/manual_policy_lint_ignores.sql`).
- Section run stamps: `gapsSectionRun`, pipeline staleness `GET /gaps/pipeline` l.507.
- First run gates on the page: organisation details, remediation disclaimer, "AI credits" notice (`page.tsx` l.195, 396-415).

Result storage: `regulation_coverage` (per tenant per regulation, upserted per batch, `regulation-coverage.ts:451-466`), `gap_detail_cache`, `policy_lint_results`, `policy_claims` + consistency sets/conflicts, `policy_wording_alignment`, `gaps_section_runs`. A fresh coverage run deletes the old rows first (`startCoverageAnalysis` l.393-400) and invalidates cached detail.

What counts as "one policy analysed": nothing counts it today. A coverage run touches a policy only when it is shortlisted as evidence for a regulation. Lint and wording touch every active policy. Consistency touches every real policy document.

Credit and token checks in the gap pipeline today: wording (per policy), consistency detect and resolve, gap training module. **Coverage start and batch have NO `checkAiCreditLimit`** (`analytics.ts:582-646`), so a paid tenant can overspend its token allowance on coverage; for a free tier that must be closed.

Platform side: admin policy gap catalogue `routes/platform-policy-gaps.ts` (regulations, signals) and a private explainer artifact "CareStream Gap Judges" (memory reference).

### Policy upload, which decides how a free tenant gets policies into the analysis

`apps/api/src/routes/policies.ts`: `POST /` l.280 (single upload; `checkPolicyLimit` l.303; S3, `policy.create` status `processing`, content hash `sha256`, `enqueueIngestion`); `POST /bulk` l.513 (`remainingPolicySlots` l.535); `POST /:id/version` l.415 (creates a NEW policy row with version+1 and same name; old row superseded after ingestion); `DELETE /:id` archives (l.1044); `POST /:id/delete` permanently deletes a non active row (l.1086); `POST /:id/retry` l.1135; `GET /intake`/`POST /intake` l.152-162 (the paid policy writer, expensive AI); `POST /check` l.107 (duplicate check by hash). Statuses: processing, active, archived, superseded, failed (comment says four but `failed` is used). Ingestion embeds with OpenAI text-embedding-3-small into Pinecone namespace per tenant. Prisma tenant scoping middleware covers only 6 models (`db/client.ts:43`); all other routes hand write `tenant_id`.

Because archiving removes a row from `checkPolicyLimit` and permanent delete removes it entirely, a pure "count rows in policies" limit can be gamed (upload, analyse, delete, repeat). A lifetime counter must not depend on the policies table.

## 4. Pricing page and marketing mentions

| Item | Where | Notes |
|---|---|---|
| Live pricing page | `apps/web/src/app/(marketing)/pricing/page.tsx` -> `PricingPageV2` | The `'one-offs'` family is LIVE in `lib/v2-rollout.ts`, so the rebuilt page renders; the 400 line legacy page (own `PLANS`, `MATRIX`, DB driven `PRICING_SLOTS`) is only used with `?v2=0`. |
| Data | `apps/web/src/lib/pricing-data.ts` | Header says GENERATED by `carestream-theme-preview/gen_pricing_data.py` (not in this repo). Three plans, 11 groups (about 52 rows), each row `values` array of 3. The generator must be updated too or the next regeneration deletes the Free column. |
| Component | `components/marketing/pricing-page-v2.tsx` + `.css` | Cards render `PRICING.plans`; CSS `grid-template-columns: repeat(3,1fr)` (`pricing-page-v2.css:67`, collapses at l.140); table section row `colSpan={4}`; header cells from `PRICING.plans`. |
| JSON-LD | `pricing/page.tsx` parses `£` prices out of the plan strings into `pricingProductSchema` | A "£0" parses to 0 pence. |
| Other price text | `lib/page-slots/pricing.ts` (legacy page copy, DB overridable), `lib/page-slots/faq.ts:66-68,86-87` (FAQ says two plans, trial needs card), `lib/page-slots/home.ts:165+` (legacy home pricing; live home is `home-page-v2` and has no price block but `stats.s4.num` £85), `app/llms.txt/route.ts:25` ("Starter £85 and Professional £230"), `lib/agent-tools.ts:16-30,71` (STALE: £49 and £129; trial copy), `lib/schema.ts:98` (STALE: Starter £49), `components/admin/training-only-dashboard.tsx`, `app/(admin)/onboarding/page.tsx`, `(marketing)/policy-gap-detection/page.tsx` and `lib/page-slots/policy-gap-detection.ts:103` (availability copy), `(marketing)/care-audits/page.tsx`, `/faq` (`lib/faq-v2.ts`). Home hero form posts to `/register` (`home-page-v2.tsx:222`). |
| Existing pricing FAQ | `pricing-data.ts` faqs: "Is there a setup fee? Every plan includes a fourteen day free trial". Needs a Free answer. |

## 5. Onboarding email engine

| Piece | Where | Behaviour |
|---|---|---|
| Content | `apps/api/src/services/onboarding/content.ts` (`SEQUENCES`, `PLAN_ORDER` l.519-537), `drafts.ts` (`DRAFTS_CORE/PRO/ENTERPRISE`, `draftsFor` l.642), `campaigns.ts` (`CAMPAIGNS`, `CAMPAIGN_ORDER` l.305-320: `training_shop`, `policy_shop`) | Plans are cumulative (Starter emails also in Pro and Enterprise). Each email: subject, preheader, headline, intro[], steps[], tip, ctaLabel, ctaHref, `draft:true`. House style: no dashes. |
| Seed | `seed.ts` | Identity is `template_key` = slug of subject; inserts only missing keys at the end; drafts seed with `is_active:false`. Campaigns are stored in the same table with `plan` = campaign key. Daily cron self heals the seed (`routes/cron.ts:160-164`). |
| Tables | `schema.prisma:2716-2801` | `onboarding_emails` (unique plan+day_index; `condition`, `condition_unmet`, `hold_max_days`), `onboarding_enrolments` (unique tenant+campaign, `plan`, `campaign`, `start_date`, `status`), `onboarding_sends` (unique tenant+email+recipient; open/click/bounce stats). |
| Enrol | `dispatch.ts:147` `enrolTenant` (campaign 'plan', plan from `planKeyOf`, which maps anything unknown, including null, to 'starter'), `:164` `enrolInCampaign`. Register enrols and sends day 1 (`auth.ts:157-168`). `billing.ts:57-65` refreshes the plan after checkout. |
| Dispatch | `dispatch.ts:186-278` `dispatchDue`: cron at 09:00 and 10:00 UTC, sends only at 10am UK on working days (`:188`). Day index = working days since start. Catch up max 3 per run. Sends to every ACTIVE ADMIN of the tenant (`:77`). Condition predicates (`conditions.ts`) with skip or wait. Enrolment completes after the last email. |
| Predicates | `conditions.ts:24-121` (licence, training, policy purchase, `no_plan_yet`). None for audits or gap usage yet. Unknown names evaluate true. |
| Unsubscribe | `routes/onboarding-public.ts`: GET confirms, POST sets the enrolment `cancelled` (HMAC token). Stats webhook `/onboarding/events`. Footer link rendered by `render.ts`. |
| Platform admin | `routes/admin.ts:3805-3935`: `GET /admin/onboarding/emails?plan=`, preview, test send, `PATCH` (subject, preheader, `is_active` publish, image), `POST /emails/sync`, `/emails/reorder`, `GET /enrolments`, `POST /dispatch-now` (force, optional single tenant), `GET /admin/tenants/:id/onboarding`. UI `apps/web/src/app/(platform)/platform/email-marketing/page.tsx`: `PLANS` l.51 and `CAMPAIGNS` l.60 tabs; Sync new emails button l.295; helper text per tab l.350+. API client `lib/platform-api.ts:717-737`. |
| Suspected existing bug | `dispatch.ts:177` `sendDayOneNow` calls `onboardingEnrolment.findUnique({ where: { tenant_id } })`, but the unique key is now `(tenant_id, campaign)`. Prisma `findUnique` on a non unique field throws; the call is `as any` so it compiles. The exception is caught in `auth.ts:166`, so the immediate welcome email may never send at signup (day 1 would then go out at the next 10am run via `dispatchDue`). Verify in production (`onboarding_sends` rows with `day_index=1` vs `tenants.created_at`) before relying on it. |
| Recipients for a free tenant | Only admins are emailed, not staff. |

## 6. Abuse patterns in existing public and lead flows

- `authLimiter` 10 requests per minute per IP across all `/auth/*` (`middleware/rateLimiter.ts:14`). No daily or per domain limit, no CAPTCHA, no disposable email check, no email domain uniqueness on register.
- `publicLimiter` 60 per minute per IP on `/public`, `/onboarding`, `/feedback` (`app.ts:126-128`).
- Shop capture, share basket, review use per route `express-rate-limit` (`routes/shop-extras.ts`); landing form has a honeypot field `company_website` (`routes/lp-public.ts:51`).
- Email deliverability: `services/shop/email-capture.ts:34-39` calls Ideal Postcodes email validation (key `IDEAL_POSTCODES_KEY`, already set on the API) and treats `disposable` as undeliverable. Reusable for register.
- Staff invites (`routes/users.ts:319`) create users with `email_verified:true` and no email; separate calls send credentials or login links (`/:id/send-credentials` l.660, `/:id/login-link` l.634, `/:id/reset-password` l.706) through SendGrid. With no seat limit a free tenant could use these as an email relay. Needs a per tenant daily cap (see DESIGN).
- Unverified registrations cost nothing (login blocked until email verified) but each one fires `sendNewTenantNotification` to the owner and a verification email.

## 7. Database changes: how they are applied in this repo

- `prisma migrate` is NOT used. `apps/api/package.json` build is `prisma generate && tsc`. There is no `prisma/migrations/<timestamp>` folder; `apps/api/prisma/migrations/` holds hand written `manual_*.sql` files and `apps/api/prisma/sql/` holds dated ones (`2026-09-17_ai_token_allowance.sql`).
- Convention (from the file headers): idempotent SQL (`IF NOT EXISTS`, wrapped in `BEGIN/COMMIT`) run in the Supabase SQL editor for project `shjpatdojoigcgmaewbg` BEFORE the code deploy; the Prisma model is then added by hand to `schema.prisma` and `prisma generate` runs in the build.
- `supabase/README.md` documents the older `migrate deploy` + `rls.sql` flow; it is stale.
- Rule from the 2026-09-13 security sweep: every new table needs `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in the same change (the app connects as postgres and bypasses RLS, so nothing else will tell you). Run the Supabase security advisor afterwards.
- Plans are rows in the DB (no seed code). Changing a plan is a SQL `UPDATE`/`INSERT`.

## 8. Tests present

Only four: `apps/api/src/lib/document-kind.test.ts`, `services/analytics/policy-lint-signals.test.ts`, `services/analytics/role-name.test.mjs`, `apps/web/src/lib/policy-names.test.mjs`. No runner is configured in the `package.json` files (no `test` script); the memory note mentions `scripts/sectionRegistry.test.mjs` for another repo. CI is two deploy workflows (`.github/workflows/api-deploy.yml`, `web-deploy.yml`). The free tier work should add `node --test` style `.test.mjs` files next to the pure functions (allowance arithmetic, disposable domain check, predicates) and a manual script (PLAN.md).
