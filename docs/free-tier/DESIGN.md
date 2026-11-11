# Free tier: design

Status: proposal for Len's approval. Nothing here is built. Facts are from CODE-MAP.md. Len's answers folded in:

1. Free accounts can add as many staff logins as they like (no seat cap), with light safeguards that do not limit the number of staff.
2. The 5 policy allowance is TOTAL LIFETIME per tenant. After 5, a paid subscription is needed to analyse more.
3. Free audits include EVERY platform audit template. The AI recommendations at the end of an audit stay paid.
4. "Build your own audit" stays Enterprise only. It is a separate flag (`has_custom_audits`) from running audits, so keeping it Enterprise is a no change.
5. https://www.carestreamai.com/gaps is the logged-in admin page; the 5 free policies count against it. The marketing page is `/policy-gap-detection`.

## 1. The Free plan and how a free tenant is represented

**Plan row** (`plans`, INSERT by SQL, not in code): name `Free`, `price_monthly_pence` 0, `price_annual_pence` null, `is_active` true, `is_public` false (so `/billing/plans` and `/start` never list it; Stripe `ensurePlanPrice` would throw on a 0 price). Limits and flags:

| Column | Free | Why |
|---|---|---|
| `monthly_query_limit` | 0 | staff Q&A chat is Sonnet cost; not part of the offer (open question 4) |
| `max_policies` | 5 | concurrent cap; the lifetime counter (4.2) is the real limit |
| `max_handbooks` | 0 | handbooks use the chapter index; not in the offer |
| `max_staff_users` | null (unlimited) | Len's answer |
| `max_manual_knowledge_entries` | 0 | |
| `monthly_ai_token_limit` | 3000000 | one full pass on 5 policies is about $2 to $3, roughly 1.0M to 1.5M billed tokens at the reference rate ($1.98 per M, `ai-tokens.ts:26`); 3M leaves room for a re-run in the month. The real cap is the lifetime budget (section 6) |
| `monthly_annual_license_limit` | 0 | |
| `has_gap_detection` | true | lets existing `checkFeature` pass for the 4 analysis steps; paid only extras get a new guard (section 4) |
| `has_custom_audits`, `has_training_impact`, `has_effectiveness`, `has_face_to_face`, `has_cqc_report`, `has_advanced_analytics`, `has_workforce_compliance` | false | unchanged semantics |
| NEW `has_audit_recommendations` | false (true for every existing plan) | the one thing audits do not include |

**Tenant**: `tier = 'free'`, `plan_id = Free`, `subscription_status = 'active'` (same precedent as `policies_only`/`training_only`, and every status dependent view treats 'active' as fine; nothing outside auth/billing reads the other values). `tier` is the authoritative marker. Free tenants are excluded from MRR and trial counts on the platform dashboard by `tier`.

New tenant columns: see section 4.7 (`policies_created_lifetime`; `policies_lifetime_limit` = 5 for Free and NULL for everyone else; `free_ai_budget_usd`).

**Signup**: `POST /auth/register` accepts `tier: 'free'` (add to the Zod enum, `auth.ts:67`). `/register?tier=free` on the web (copy: "Create your free account", no card, sub line "5 policy checks and every audit, free"). The register route:
- sets `plan_id` to the Free plan (lookup by name), `tier:'free'`, `subscription_status:'active'`;
- skips the `plan` drip enrolment, enrols campaign `free_plan` instead (section 9);
- `needsBilling` becomes false because `free` joins `NO_SUBSCRIPTION_TIERS` (centralise the 4 copies into `lib/tiers.ts` first, in a no behaviour change PR);
- web verification flow is unchanged, except `verify-email` redirects free tenants to `/dashboard` rather than `/start` (the page already bounces `needsBilling:false` tenants to /dashboard, so no change is strictly needed; test it).

**Upgrade** (Free -> Starter/Pro/Enterprise): the existing `/billing` page already lists plans priced above the current plan and calls `POST /billing/checkout`; Checkout, `reconcileTenantBilling` and the webhook then set `plan_id`, `stripe_*`, status. Two additions: (a) on a paid `plan_id` set `tier='full'` in `reconcileTenantBilling` and both webhook branches (today they never touch tier), and (b) clear the tier cache and cancel the `free_plan` enrolment and enrol the plan drip (reuse the `/billing/sync` hook, `billing.ts:57-65`). All data is kept (same tenant, same rows). The 14 day card up front trial applies to the upgrade as today (open question 7). Cancellation later: current behaviour (`cancelled`, locked) is unchanged; moving back to Free is not offered in v1.

## 2. Abuse controls at signup

Threats: (1) farm many free tenants for unlimited gap analysis; (2) email relay through staff invites; (3) bot signups burning SendGrid and owner notification volume.

| Control | Rule | Why |
|---|---|---|
| Disposable email block | Reuse the Ideal Postcodes email validation already used by `services/shop/email-capture.ts` (key already on the API) plus a small static denylist (mailinator style) as fallback when the key fails. Reject with a friendly message. Fails open on timeout. | cheap, existing |
| One free tenant per email domain | For non webmail domains: one active free tenant per domain (second signup sees "your organisation already has a free account, ask {first admin initial}*** to invite you, or contact us"). For webmail (gmail, outlook, hotmail, yahoo, icloud, btinternet, sky, aol, proton, live, me, googlemail, talktalk, virginmedia): per exact address only, plus the IP limit below. | many small homes use Gmail or BT, so a blanket domain rule would block real customers; the budget cap is the real backstop |
| IP rate limit | New `registerFreeLimiter`: 3 free signups per IP per 24h and 10 per /24 per 24h, stored in a `signup_attempts` table (hashed IP, domain, outcome). The existing 10 per minute `authLimiter` stays. | Vercel `trust proxy 1` already gives `req.ip` |
| Honeypot | hidden `company_website` field as in `lp-public.ts:51` | cheap bot filter |
| Email verification | unchanged and mandatory (login blocked until verified). Verification email resend limited to 3 per hour per address. | no AI is spendable before verification |
| Global kill switch | `FREE_TIER_SIGNUPS_ENABLED` env (and a platform admin toggle later) plus a global daily free AI budget (`FREE_GLOBAL_DAILY_BUDGET_USD`, default 40). When the day's free AI spend exceeds it, free tenants see "Free analyses are paused for today, try again tomorrow or upgrade" and no AI call runs. | caps worst case regardless of signups |
| Owner notification | batch free signups into the daily summary instead of one email each once volume is above 5 per hour | avoids inbox flood |
| CAPTCHA | not in v1. Add Cloudflare Turnstile (free) if bot volume appears; the honeypot and limits come first. | |

Staff login safeguards (no cap on number of staff): (a) per tenant daily cap on outbound staff emails (`send-credentials`, `login-link`, `reset-password`, magic link request for staff): 50 per day, 200 per rolling 7 days for `tier=free`; (b) `POST /users/invite` rate limit 60 per hour per tenant; (c) staff email addresses cannot be the same domain as a disposable provider; (d) storage: audit evidence photos limited to 300 MB total per free tenant (existing image only upload; count `audit_answer_evidence.size_bytes`); (e) staff inherit the tenant's ledgers, so adding staff never creates extra free allowances; (f) the hub for free tenants exposes audits only, so unlimited staff cost no AI. AI cost exposure of unlimited staff logins is therefore nil: free tenants have `monthly_query_limit` 0, no training generation, no chat. Remaining cost is a few rows per user and the audit PDF/email per completed audit (SendGrid; PDF generation is local CPU, S3 a few hundred KB).

## 3. Audits: what is free, and how AI recommendations are locked

Free: every platform template (`GET /audits/templates` unchanged), starting and completing runs by admins and "Staff + Audits" staff, evidence photos (with the storage cap), signatures, manager approval workflow, the PDF report, manual action plans and tracking, assignments and reminders, insights that are deterministic. Nothing to unlock: running audits already has no plan gate. The work is the billing gate bypass (section 1) and the recommendations lock. Custom audits (`POST /templates`, import, edit, copy) stay behind `has_custom_audits` which Free lacks, so they correctly show "Enterprise". Linking training stays `has_training_impact`.

**Locked: AI recommendations, server side.**

1. New boolean `plans.has_audit_recommendations` (default true for all existing plans) and `PlanFeature` member. A helper `hasAuditRecommendations(tenantId)` in `plan-limits.ts`.
2. In `generateAuditRecommendations` (`audits.ts:2083`) add an early return BEFORE `callClaude` and BEFORE `scoreAuditDomains`: if the tenant lacks the flag, write nothing to `ai_recommendations` (leave null), do not score readiness, do not call `trackAiAction`, return `''`. This single choke point covers both the approval path and the direct path (`complete`, `audits.ts:2224,2239`) and any other caller. Zero AI cost for free audits.
3. `POST /runs/:id/complete` response adds `recommendations_locked: true` and a deterministic `findings_summary` (counts of NO / failing answers per section computed from the answers, no AI) so the UI has something real to show.
4. `GET /runs/:id` and `GET /runs/:id/report` add `ai_recommendations_locked` (derived from the plan) so the UI does not have to guess. Because the column stays null for free runs there is no leak path, but the PDF, `me.ts` approval detail and the action plan generator all already tolerate null (`report-pdf.ts:175` is conditional; `me.ts:481` approval refuses when null today, so the approval guard at `me.ts:480` must be relaxed to allow approving a run whose recommendations are locked (plan) rather than missing).
5. `POST /runs/:id/action-plan/generate` (AI extraction from recommendations) returns 402 `FEATURE_NOT_AVAILABLE` for free ("AI action plans come with the AI recommendations"). Manual action creation stays free (`POST /runs/:id/actions`).
6. After upgrade: new `POST /audits/runs/:id/recommendations` (admin, requires the flag, `checkAiCreditLimit`, idempotent, only for completed runs with null recommendations) generates them retroactively, so every past free audit becomes a reason to upgrade. The audit detail page shows a "Generate AI recommendations" button for these runs after upgrade, and a batch "Generate for my last 10 audits" action.

**Locked UI** (admin `audits/[id]/page.tsx` and hub `audits-view.tsx`):
- Button copy: "Complete audit" (not "Complete & get AI recommendations") when `ai_recommendations_locked`.
- After completion, in place of the AI card: a card titled "AI recommendations" with a LockChip "Paid plans", the deterministic findings summary above, a short static sample (blurred, three example recommendations taken from a fictional audit, clearly labelled "Example"), one line of benefit copy ("Prioritised actions, linked to the CQC quality statements, written from your own answers"), and an `UpgradePanel`-style button "See plans" to `/billing` (`UpgradePanel`, `upgrade-gate.tsx:19`). Track the click (section 8).
- `AuditActionPlan` shows the manual plan; the "Generate draft plan with AI" button shows the lock chip.
- Marketing and pricing rows (section 7).

## 4. Policies and gap analysis: 5 policies uploaded, lifetime (Len's decision)

**Rule**: a free company can create at most **5 policies in total, ever**. Those 5 sit in the library and are screened by all four /gaps analyses (regulation coverage, out of date content, cross policy consistency, CQC wording) with no limit on how many times a section is run, subject only to the re-run rule and AI budget in section 6. The enforced limit is on policy CREATION. Because the library can never hold more than 5 policies, every existing section already analyses "at most 5 policies" and **no analysis code needs a scope filter** (every section reads all `status:'active'` policies, CODE-MAP section 3). Upgrading removes the limit and keeps everything.

### 4.1 Every way a policy can enter a tenant's library

I searched all `policy.create` / `createMany` call sites and the ingestion queue. Policies enter a library in exactly four code places; there is no paste or text import route and no "standard policy library copy" that creates tenant policy rows (policy seeds are platform templates for training and onboarding flows, not rows in `policies`).

| # | Entry path | Where | Counts toward the 5? | Enforcement |
|---|---|---|---|---|
| 1 | Single file upload (PDF/Word) | `POST /policies`, `policies.ts:280`, `policy.create` l.330 | **Yes** (new distinct policy) | `claimPolicySlot` right after `checkPolicyLimit` (l.303), before the S3 upload |
| 2 | Bulk upload (many files) | `POST /policies/bulk`, l.513, `policy.create` l.602 | **Yes**, each distinct file | one claim per file in order (4.4); `remainingPolicySlots` (l.535) already pre computes capacity |
| 3 | New version or revision of an existing policy | `POST /policies/:id/version`, l.415 (`policy.create` l.450: a NEW row, same name, version+1) | **No** | no claim. Guard: source policy must belong to the tenant and the name is copied from it (it is), so this cannot be used to add a different policy |
| 4 | Re-upload of the identical file | 1 or 2 with the same SHA-256 | **No** | ledger unique key `(tenant, content_hash)`; `POST /policies/check` l.107 already warns |
| 5 | Re-upload of an edited file after deleting the original | 1 | **Yes** | cannot be told from a new policy; delete never refunds; UI points to "upload a new version" instead |
| 6 | Paid policy written by CareStream and delivered | `routes/platform-policy-gaps.ts:508` (`policy.create`, `carestream_written:true`, platform side after payment) | **No** by default (open question 6) | never blocked by the free cap; it is not claimed. It then also gets analysed as a 6th policy, which is trivial cost |
| 7 | Superseding rewrite of a purchased policy | same file l.499-505 (`policy.update`) | No | none |
| 8 | Adopt a gap fix, minor edit, role name change, publish | `policy-adoption.ts` | No (edits, not new policies) | paid only routes anyway (4.5) |
| 9 | Retry of failed ingestion | `POST /policies/:id/retry` l.1135 | No | same row |
| 10 | Translations | `policy_translations` (`me.ts:1614`, `policy-adoption.ts:842`, `clone.ts:124`) | No | not rows in `policies` |
| 11 | Tenant clone / sub tenant | `services/tenant/clone.ts:116` (platform only) | N/A | not reachable by a tenant; make `cloneTenant` refuse `tier='free'` |
| 12 | Handbooks | paths 1 and 2 with `staff_handbook` | not allowed on Free | `max_handbooks` 0 via `checkPolicyLimit` |
| 13 | Policy intake and writer (paid AI writer) | `GET/POST /policies/intake` l.152-162 | not available to Free | `requirePaidTier` |
| 14 | Inbound email attachments | `services/email/inbound.ts` | creates no policy rows (verified: no `policy.create` there) | none |

Delete never refunds: archive (`DELETE /policies/:id`, l.1044) and permanent delete (`POST /policies/:id/delete`, l.1086) do not touch the counter. Single exception: a slot is released if the policy **never reached `active`** (ingestion failed, then deleted), because an unreadable file could never have been analysed. Support can raise `tenants.policies_lifetime_limit` by hand.

### 4.2 The counter (server side, atomic)

Columns on `tenants`: `policies_created_lifetime INT NOT NULL DEFAULT 0` and `policies_lifetime_limit INT NULL` (NULL = no limit; set to 5 for Free tenants at registration). **Existing tenants are not affected**: they keep `policies_lifetime_limit` NULL and the guard is `if (limit !== null)`. For information, a one time backfill sets `policies_created_lifetime` to each tenant's current count of non archived policies; it is harmless because the limit is NULL. Ledger table `policy_creation_ledger` with `UNIQUE (tenant_id, content_hash)`, no foreign key to `policies` so deletes cannot erase it, RLS enabled.

`claimPolicySlot(tenantId, {contentHash, name, policyId})` in a new `lib/policy-allowance.ts`, one transaction:
1. Read `policies_lifetime_limit`; NULL: return `{counted:false}` (paid tenants, behaviour unchanged).
2. `INSERT INTO policy_creation_ledger ... ON CONFLICT (tenant_id, content_hash) DO NOTHING RETURNING id`. No row returned: this exact file was already counted, return OK without incrementing.
3. `UPDATE tenants SET policies_created_lifetime = policies_created_lifetime + 1 WHERE id=$1 AND policies_created_lifetime < policies_lifetime_limit RETURNING policies_created_lifetime`. Zero rows: roll back the whole transaction and throw `PlanLimitError('FREE_POLICY_LIMIT_REACHED', ...)`.
The conditional UPDATE takes a row lock, so two tabs or a bulk upload cannot overshoot. That is the race protection.

Routes catch `PlanLimitError` and answer `{ code:'FREE_POLICY_LIMIT_REACHED', limit:5, used:5 }`. Existing policy limit errors return HTTP 403 (`policies.ts:303-310`); keep 403 for consistency and have the web client key on `code`, not status (`api-client.ts` `apiFetch` maps that code to the upgrade panel). **The UI never enforces; the API does.** `releasePolicySlot(tenantId, policyId)` runs from `POST /:id/delete` and the ingestion failure handler only when the row never had status `active`.

### 4.3 UX for a free tenant

- /policies header strip: **"Free plan: 3 of 5 policies used"** with a progress bar and the tooltip "5 policies in total. Deleting one does not free a place. Uploading a new version of a policy does not use a place."
- Upload button and drop zone: at 5 of 5 the button is disabled and an `UpgradePanel` appears ("You have used your 5 free policies. Move to a paid plan to add more. Everything you have is kept."). The API returns the same error if called directly.
- Multi file upload over the limit: the API accepts the first N files in the order received (N = places left), stores them, and returns `skipped_for_limit: [filenames]`. The UI says "4 added. 3 were not added because a free account includes 5 policies in total" and lists the skipped names with the upgrade button. The file picker also shows "You can add 2 more" before the upload starts.
- /gaps banner for free tenants: "Gap analysis covers the policies you have uploaded (3 of 5). Add up to 2 more on the Policies page." and at 5 of 5 "You are using all 5 free policies." The existing missing policy banner stays and points to the policy shop, the natural next purchase.
- The four sections work as today; the first run gates stay (the "AI credits notice" text changes to the free allowance wording).

### 4.4 Bulk upload ordering

`POST /policies/bulk` (l.513) already dedupes by hash and has `seenInBatch` (l.594). For free tenants it claims slots file by file in upload order and stops claiming at the limit, returning the rest in `skipped_for_limit`. Duplicates in the batch never claim.

### 4.5 What stays paid inside /gaps (decision for Len, open question 5)

Where AI generated "fix" content appears:
- Step 4 wording: the suggestions ARE the output of the same per policy AI call (`saf.ts:172,200`) and cannot be separated without extra work. **Recommend free** (it is one of the four analyses).
- Step 2 out of date: findings and "superseded by" text come from the signal catalogue, no AI. Free.
- Step 3 consistency: detection is the analysis (free). The "resolve" button is a separate Haiku call (`policy-consistency.ts:570`): recommend free inside the AI budget (cheap), or paid.
- Step 1 coverage: verdict plus a one line reason is free. The drill in "what to add, with example wording, where to add it, legal basis" (`gap-detail.ts`, 4 to 5 Sonnet calls per gap at $0.10 to $0.20, tens of gaps) is the real "AI recommendation" feature. **Recommend paid, with a taster of 3 drill ins lifetime.** This matches the pricing page, where "What to add, with example wording" is its own row.
- Adopt a fix with tracked changes, approvals, external review, publish and republish, training module or onboarding generated from a gap: paid (they mutate policies, reindex, send email, spend AI).

### 4.6 Enforcement list (routes)

Paid only (`requirePaidTier`, 402 `UPGRADE_REQUIRED` for tier free): `POST /analytics/gaps/:reference_key/detail` (after the taster), `/gaps/pregenerate`, `/gaps/adopt`, `/gaps/policy-change/*`, `/gaps/policy-document/*` (publish, repropagate, submit, manager-approve, reject, external-*, remind), `/gaps/:reference_key/saf-alignment`, `/gaps/:reference_key/training-module`, `/gaps/:reference_key/onboarding`, `/policies/re-review`, policy minor edit, `/policies/intake`. Also add the missing `checkAiCreditLimit` to coverage `analyse/start|batch|analyse` (`analytics.ts:582,602,621`) so the free AI budget covers coverage.

### 4.7 Schema

```
tenants: policies_created_lifetime INT NOT NULL DEFAULT 0,
         policies_lifetime_limit INT NULL,            -- NULL = unlimited (every existing tenant)
         free_ai_budget_usd NUMERIC(8,2) NULL          -- NULL = no lifetime AI cap
policy_creation_ledger (id uuid pk, tenant_id text not null, content_hash text not null,
   policy_id text null, policy_name text, source text, created_at timestamptz default now(),
   released_at timestamptz null, UNIQUE (tenant_id, content_hash))
free_usage_counters (tenant_id text, key text, period text not null default '', n int not null default 0,
   PRIMARY KEY (tenant_id, key, period))   -- 'gap_detail_taster', 'rerun:coverage' per month
signup_attempts (id, ip_hash, email_domain, outcome, created_at)
plans: has_audit_recommendations BOOLEAN NOT NULL DEFAULT true
```
All new tables get `ENABLE ROW LEVEL SECURITY`.

## 5. What a free tenant sees in the rest of the app

Principle: allow list, default closed (like `policies_only`), enforced twice.

- **API**: a `tierGuard` middleware mounted after `tenantGuard` (`app.ts:216`). For `tier=free` (tier read from the DB with a 30 second in memory cache per tenant, flushed on upgrade) it allows only prefixes: `/audits`, `/policies` (not `/intake`, not `/:id/pdf` legislative AI extras), `/analytics/gaps*` `/analytics/policy-lint*` `/analytics/consistency*` `/analytics/wording-alignment*` `/analytics/review-resolutions` `/analytics/readiness` (read only), `/users`, `/me`, `/settings`, `/billing`, `/sites` read, `/feedback`, `/support-requests`. Everything else (`/query`, `/training`, `/knowledge`, `/onboarding`, `/face-to-face`, `/workforce`, `/cqc-questions`, `/training-matrix`, `/suggestions`, `/agent-actions`, `/translation-suggestions`, `/regulations`, `/policy-purchases` except via the shop, etc.) returns 402 `UPGRADE_REQUIRED`. Today the API has no such guard, only the web does, so this is the real protection for AI cost.
- **Web middleware**: add `FREE_ALLOWED = ['/dashboard','/audits','/gaps','/policies','/staff','/settings','/billing','/account','/start']`; other console paths redirect to `/dashboard`. Hub: `/chat`, `/cqc`, `/progress` show a locked panel; staff with audit access land on `/audits` in the hub.
- **Sidebar**: copy the `policiesOnly` branch of `admin-shell.tsx`: locked items open the tier overlay with one line each and a "See plans" button.
- **Dashboard**: a free dashboard component (like `training-only-dashboard.tsx`): audits done, policies "3 of 5 used", gaps found, a checklist (Run an audit, Add policies, Run gap analysis, Invite your team), and an upgrade card.
- **Guided tour**: off for free, as for the other self serve tiers.

## 6. AI cost exposure and hard caps

Unit costs (Sonnet 4.5 at $3/$15 per M tokens, Haiku 4.5 $1/$5, `token-usage.ts:39-53`). These are estimates from the code; confirm with 30 days of `ai_usage_events` by feature before launch (`SELECT feature, avg(cost_usd) ...`).

| Item | Estimate | Basis |
|---|---|---|
| Audit with AI recs (paid) | $0.03 to $0.06 | about 5k tokens in, 1.2k out, plus a small readiness call |
| **Free audit** | **$0** | recommendations and scoring skipped |
| Coverage run, 5 policies | $1.0 to $1.7 (upper bound $2.5) | about 90 in scope regulations (verify count) x up to 1 Haiku at about $0.008 + up to 30 Sonnet element passes at about $0.03 |
| Lint | $0 | deterministic |
| Consistency, 5 policies | about $0.15 | 5 Haiku extractions + a few detections |
| Wording, 5 policies | about $0.6 | 2 Sonnet calls per policy at about $0.06 |
| Full pass on the 5 | **about $2 to $3** | |
| One drill in "what to add" | $0.10 to $0.20 | 4 to 5 Sonnet calls; 60 gaps would be $6 to $12 |
| Upload ingestion per policy | under $0.01 | embeddings + classifier |

**Hard cap per free tenant**: a lifetime AI budget `free_ai_budget_usd` (default $6) enforced server side. New `checkFreeAiBudget(tenantId)` sums `ai_usage_events.cost_usd` for the tenant over all time (indexed on tenant_id) and throws `PlanLimitError('FREE_AI_BUDGET_REACHED')`; call it from `checkAiCreditLimit` for tier free (which most AI routes already call) and add the missing calls on coverage. A partial batch run that hits the cap stops cleanly and shows "You have used your free analysis allowance". The cap is generous for two full passes, tight enough to bound loss. The usage log is written asynchronously, so overshoot of a few cents per in flight batch is possible; acceptable.

**Exposure for 1,000 free signups**: assume 60% verify, 40% of those add policies and run gaps. 240 tenants x about $2.5 = about $600 one off, plus drill in tasters 240 x 3 x $0.15 = about $110. Worst case every one of the 1,000 uses the full $6 cap: $6,000 one off, bounded by `FREE_GLOBAL_DAILY_BUDGET_USD` ($40/day default) which makes the absolute worst case a rate not a lump. Compare: one Starter subscription is £85 a month, so converting under 1 in 100 covers the realistic case. Hosting costs of free tenants (Supabase rows, Pinecone namespace, S3) are small (a few cents a month each); add a clean up job later for free tenants inactive 12 months (open question).

### 6.1 Cost per policy and per analysis, and the re-run rule (decision for Len)

Credits: the four analyses spend through `ai_usage_events` (dollars) and, for wording, consistency and gap training, also write `ai_credit_log` rows (`logAiCredit`, which is legacy and unlimited now). The governing meter is the token allowance (`ai-tokens.ts`): billed tokens = cost / $1.98 per million.

| Analysis | AI per run | Approx cost for 5 policies | Per policy | Notes |
|---|---|---|---|---|
| 1 Regulation coverage | per REGULATION not per policy: up to 1 Haiku (about $0.008) + 1 Sonnet whole policy read (about $0.03) per regulation that has a candidate policy; about 90 regulations in scope (verify) | $1.0 to $1.7 (max about $2.5) | $0.20 to $0.35 | with only 5 policies most regulations have no on subject policy and cost only an embedding; the Pinecone namespace is searched for all regulations every run |
| 2 Out of date | none | $0 | $0 | text scan |
| 3 Consistency | 1 Haiku claim extraction per policy (cached by content hash), plus Haiku detection per topic group | about $0.15 | about $0.03 | extraction is skipped for unchanged policies |
| 4 CQC wording | 2 Sonnet calls per policy that has linked quality statements | about $0.6 | about $0.12 | results stored per policy |
| Full pass | | **$2 to $3** (1.0M to 1.5M billed tokens) | **$0.35 to $0.50** | |

Re-runs: a coverage start deletes previous rows (`startCoverageAnalysis`), so every re-run pays the full coverage cost again, while consistency claims and wording rows are reusable only if the section's start is not called. Unlimited re-runs of coverage on 5 unchanged policies would burn the budget for no new information. Options:

- **R1 (recommended): run again only if something changed.** The pipeline already knows: `GET /analytics/gaps/pipeline` computes `stale` per section from policies published or added since `ran_at` (`analytics.ts:507-546`). For tier free the start endpoints return 409 `FREE_NOTHING_CHANGED` ("Your policies have not changed since this ran on 3 Dec. Add or update a policy, or run it again next month") unless a policy was added or a new version published since the last run, with one forced re-run per section per calendar month (counter in `free_usage_counters`, key `rerun:<section>`, period `YYYY-MM`). Regulation updates are covered by the monthly forced re-run.
- R2: flat cap of 3 full runs per month per section. Simpler to explain, wastes money when nothing changed and can annoy users who just added a policy.
- R3: no cap, only the lifetime AI budget. Simplest code; the budget would be consumed in 2 to 3 full passes and the user would hit the budget wall without understanding why.

The lifetime AI budget still applies on top of whichever is chosen. Resumable runs (interrupted batches) never count as a re-run: "Resume" does not call start.

Ops: add a "Free tier" panel to the platform dashboard: signups, verified, audits run, gap policies claimed (distribution 0..5), AI spend per day vs the global budget, top spenders, conversions.

## 7. Pricing page, home, FAQ, llms.txt

**Pricing page** (`pricing-data.ts` plus the V2 component and CSS):
- Prepend a `Free` plan: price "£0", annual "Free for ever", line "Run your audits and check your first five policies, with no card.", badge "No card needed", features: "Every platform audit template, unlimited audits", "Unlimited staff logins for audits", "Policy gap analysis on your first 5 policies", "Audit PDF reports and action tracking", "Upgrade any time, your data stays", cta `Create free account` -> `/register?tier=free`. The annual toggle logic prints `p.annual`/`p.price`; give Free a price string that works for both ("£0 free for ever") or special case it so the toggle does not show "£0 / £0".
- Comparison table: every row's `values` gets a leading Free value; table header, `colSpan={5}`, and `.pplans-in` grid `repeat(4,1fr)` with the single column mobile breakpoint. New rows/changes: Plans and limits: "Policies stored: 5 in total" / "Staff users: Unlimited" / "Questions answered: Not included" / "AI tokens: Free allowance"; Audits group: add "Run every platform audit" (all true), "AI recommendations at the end of an audit" (Free false, Starter true, Pro true, Ent true), "PDF report and action plan": true; Policy gap detection: "Regulation coverage analysis" Free "Your 5 policies", the rest of the group false for Free except "Out of date content detection" and "Cross policy consistency" Free "Your 5 policies" and "What to add, with example wording" Free "3 examples"; Support: Free "Help centre"; Free trial row: Free "Free for ever". Note Starter currently shows `false` for Gap detection and the Starter column is unaffected.
- The data file header says it is generated from `carestream-theme-preview/gen_pricing_data.py`, which is outside this repo. Update that generator in the same change or the next regeneration removes the Free column. FAQ: add "Is there really a free plan?" (what is free, no card, the 5 policy lifetime limit, what happens after) and fix "Is there a setup fee? Every plan includes a fourteen day free trial" to say paid plans.
- Wording rules: no dashes in copy; say "5 policies in total", never "monthly".
- JSON-LD: `pricingProductSchema` will emit a £0 offer; acceptable and truthful. Also fix stale `lib/schema.ts:98` (Starter £49) in passing.

**Elsewhere**: homepage (`home-page-v2.tsx` hero form and CTAs go to `/register`; add a secondary "or start free" link; `lib/page-slots/home-v2.ts` copy), `lib/page-slots/faq.ts` pricing.a1/a2 and getting.a5 ("two plans", "card required"), `app/llms.txt/route.ts:25` (add "A free plan: every audit and gap analysis of your first five policies, no card"), `lib/agent-tools.ts` (stale £49/£129; replace with the live three tiers plus Free), `(marketing)/care-audits/page.tsx` and `(marketing)/policy-gap-detection/page.tsx` + `lib/page-slots/policy-gap-detection.ts:103` availability copy (add "Try it free on five policies"), register page headline and sub line, `/start` page unchanged. The `trust`, `demo` and nav "Start free trial" CTA labels stay for paid trial; add a nav secondary link only after launch. All behind the dark launch flag (PLAN.md).

## 8. Analytics and funnel events

Write one row per event with `writeAuditLog` (existing `audit_logs` table, `lib/audit.ts`), `event_type` prefixed `free_`, `metadata` json, plus the cross site Funnel Insights tracker for page level events (`components/marketing/funnel-insights-tracker.tsx`). Events: `free_signup` (tier free, domain class webmail/org, utm from query), `free_email_verified`, `free_first_login`, `free_audit_started`, `free_first_audit_completed`, `free_audit_completed` (n), `free_audit_recs_locked_viewed`, `free_policy_slot_claimed` (n=1..5), `free_gap_run` (section, run number), `free_gap_detail_taster` (1..3), `free_limit_hit` (kind: policy_slots | ai_budget | rerun_cap | detail_paid_only), `free_upgrade_click` (source: audit_recs | policy_limit | gaps_detail | nav | email), `free_upgraded` (plan, days since signup, slots used, audits completed), `free_email_sent/opened/clicked` come from `onboarding_sends`. A SQL view `free_funnel_v` (steps by tenant) feeds the platform panel. Event names in code are constants in `lib/free-events.ts`.

## 9. Email: the FREE sequence

### Mechanism

Add a campaign `free_plan` ("Free account") to `services/onboarding/campaigns.ts` (`CampaignKey`, `CAMPAIGNS`, `CAMPAIGN_ORDER`) and a tab in `email-marketing/page.tsx` (`CAMPAIGNS` array l.60 plus helper text l.350). The seed already stores campaigns as rows keyed by `plan='free_plan'`, drafts seed with `is_active:false`, and the cron plus the **Sync new emails** button insert them (`seed.ts`, `admin.ts:3910`). Nothing sends until Len publishes each email from the page (the `is_active` toggle already exists in the editor). Subjects must be unique across the whole table because identity is `template_key` = slug of subject (shared keys would link emails across plans).

Enrolment: in `register` for tier free call `enrolInCampaign(tenantId,'free_plan')` instead of `enrolTenant`/`sendDayOneNow`; email 1 is sent immediately via a new `sendCampaignEmailNow(tenantId, 'free_plan', 1, ...)` that reuses `sendToRecipient` (fixing the suspected `findUnique({tenant_id})` bug at `dispatch.ts:177` on the way: use the compound key). On upgrade: mark the `free_plan` enrolment `completed` and call `enrolTenant` with the plan name so the paid drip starts.

Recipients: active admins only (existing). Staff are never emailed by the drip.

### Day based versus usage based

The dispatcher is day based, one email per UK working day at 10am, with per email `condition` predicates and `skip` or `wait` (`dispatch.ts:240-256`). This already supports "send only if the user has done X" (`skip`) and "hold until they have" (`wait`, up to `hold_max_days`). Plan:
- **v1 (low risk, no dispatcher change)**: add predicates to `conditions.ts`: `free_no_audit_completed`, `free_audit_completed`, `free_no_policy_added`, `free_slots_partial` (1 to 3 used), `free_slots_one_left` (4 used), `free_slots_exhausted` (5 used), `free_no_staff_invited`, `free_has_locked_audit_recs` (a completed audit exists). Usage emails use `wait` with `hold_max_days` 14 so the sequence holds until the user reaches that state. Downside: because the sequence is linear and the dispatcher only moves forward, a "5 of 5 used" email waits behind earlier day emails and goes out at the next 10am working day, up to 3 days late over a weekend.
- **v2 (event driven)**: add nullable `trigger_event` to `onboarding_emails`; `dispatchDue` skips rows with a trigger (and `sequenceLength` ignores them); the event code (`claimPolicySlot`, audit complete) calls `sendTriggeredEmail(tenantId,'free_plan','slots_exhausted')` which sends at once, idempotent through the existing unique key on `onboarding_sends`, and still requires the template to be published. Recommended once v1 has run for a week.

### Consent and PECR (UK; not legal advice)

- Service and transactional messages (verification, password, "you have reached your free limit" in the product, receipts) need no marketing consent.
- Onboarding tips that also promote the paid plan are marketing. Under PECR, emails to **corporate subscribers** (limited companies, LLPs, plcs, government bodies) can be sent without prior consent if the sender is identified and an opt out is given; emails to **individual subscribers** (sole traders, many partnerships) need consent or the "soft opt in" (a sale or negotiation for a sale, similar products, opt out offered when the address was collected and in every message). Small care homes are often sole traders or partnerships, and many use personal Gmail addresses, so treat everyone as an individual to be safe.
- Recommended: on the free register form, state in the line under the button: "We will email you tips on using CareStream. You can unsubscribe in one click." and add an **unticked** optional checkbox "Also send me occasional product news" stored on the tenant admin (`marketing_consent_at`); the onboarding sequence (about the service they just signed up for) relies on the soft opt in, the extra news does not run without the tick. Every email already carries an unsubscribe link and the sender identity (`render.ts`, `onboarding-public.ts`); the unsubscribe cancels the whole `free_plan` enrolment. Keep the privacy policy's lawful basis wording aligned. Get this checked by whoever advises on data protection before publishing the upsell emails (7, 9). The first three emails are instructional and low risk.

### The emails (drafts; all seeded `draft:true` -> `is_active:false`)

House style: no dashes, benefit first, UK English, no claims the product cannot back. CTA paths are relative (`render.ts` makes them absolute). Each is shown as: trigger, subject, preheader, headline, body (intro paragraphs, steps, tip), CTA.

**1. Welcome** (trigger: immediately on verified signup; day 1)
- Subject: Your free CareStream account is ready
- Preheader: Every audit is unlocked. Here is the quickest way to start.
- Headline: You can run your first audit today
- Intro: Thanks for signing up. Your free account includes every CareStream audit, with no card and no time limit. | You can also check your first five policies against the CQC regulations. Both work straight away.
- Steps: Pick an audit. Open Audits and choose any template, from daily checks to monthly governance audits. | Answer the questions. Work through on a phone or computer, add photos as evidence, and sign at the end. | Download the report. You get a PDF you can put in your CQC evidence folder.
- Tip: Start with one audit your home already does on paper. It is the fastest way to see what you gain.
- CTA: Open your audits -> `/audits`

**2. How to run your first audit** (day 2; condition `free_no_audit_completed`, unmet: skip)
- Subject: Your first audit takes about fifteen minutes
- Preheader: A short walk through, from choosing a template to the signed report.
- Headline: Your first audit, step by step
- Intro: Most homes start with an audit they already know, so the questions feel familiar. | Here is how it works from start to finish.
- Steps: Choose the audit and the month. Resident or room based audits ask who or which room it is for. | Answer each question Yes, No or Not applicable. If the answer is No, say whether it is correct for this home or a gap, and add what you found. | Add a summary and sign. Note strengths, areas to improve and a date for the actions. | Complete the audit. Your report is saved and you can turn the gaps into an action plan.
- Tip: Staff can do audits from the hub on their phone. Open Staff, choose a person and tick which audits they can carry out.
- CTA: Start an audit -> `/audits`

**3. How to run a gap analysis** (day 3; condition `free_no_policy_added`, unmet: skip)
- Subject: See which regulations your policies cover
- Preheader: Add up to five policies and get a coverage check in a few minutes.
- Headline: Check your policies against the regulations
- Intro: Gap analysis reads inside your policies and tells you which CQC regulations they cover, where they are thin and what is out of date. | Your free account covers your first five policies in total, so choose the ones that matter most.
- Steps: Add your policies. Upload up to five as PDF or Word files from the Policies page. | Run the analysis. Open Policy gap analysis and start with regulation coverage. It runs in batches and you can watch the progress. | Read the results. Each regulation is covered, partly covered or a gap, with the reason in plain English.
- Tip: Pick policies that inspectors ask about most, such as safeguarding, medication and infection control. The five you add are the five you get, so choose with care.
- CTA: Add a policy -> `/policies`

**4. You have used N of 5** (condition `free_slots_partial`, wait, hold 14; sent after the first slots are used)
- Subject: You have started your five free policy checks
- Preheader: Here is what you have used and what is still available.
- Headline: Policies checked so far
- Intro: You have added some of your five free policies. Each one is read by every section of the analysis: coverage, out of date content, consistency and CQC wording. | Your allowance is five policies in total, for as long as the account lasts.
- Steps: Look at the out of date section. It flags superseded law and placeholders at no extra cost. | Check consistency. If two policies give different timescales, you will see it. | Use the wording check. It shows where a policy could read as more person centred for CQC.
- Tip: Deleting a policy does not give the slot back, so replace a file by uploading a new version of the same policy instead.
- CTA: Open gap analysis -> `/gaps`

**5. You have 1 left** (condition `free_slots_one_left`, wait, hold 14)
- Subject: One free policy check left
- Preheader: Make the last one count.
- Headline: One policy still to add
- Intro: You have used four of your five free policy checks. | If you have a policy you are worried about, this is the one to add. If you need more than five, a paid plan removes the limit and keeps everything you have done.
- Steps: Choose your most important remaining policy. | Upload it and run the sections you have not run yet. | Compare plans if you want to carry on beyond five.
- Tip: Moving up a plan takes a minute and nothing you have done is lost.
- CTA: Add your last policy -> `/policies`

**6. You have used all 5** (condition `free_slots_exhausted`, wait, hold 14; later event driven)
- Subject: You have used your five free policy checks
- Preheader: Your results stay. Here is how to carry on.
- Headline: Your free policy checks are complete
- Intro: Well done, all five policies have been checked. Your results stay in your account and you can keep re-running the analysis on those five. | To add more policies you will need a paid plan.
- Steps: Review your gaps. Start with the regulations marked as a gap and the policies with the most out of date findings. | See what comes with a paid plan. Unlimited policies, what to add with example wording, and adopting a fix into your policy with approvals. | Choose Starter, Professional or Enterprise. You keep all your data.
- Tip: The 14 day trial on paid plans lets you try the fixes before you are charged.
- CTA: See plans -> `/billing`

**7. What the AI recommendations add** (day 6; condition `free_audit_completed`, unmet: skip)
- Subject: What you get when an audit ends with recommendations
- Preheader: A sample, so you can judge whether it is worth it.
- Headline: From findings to a ranked action list
- Intro: Your free audits give you the answers, the evidence and the report. On a paid plan the end of every audit also gives you written recommendations. | They are based on your own answers, linked to the CQC quality statements, and ordered by risk. You can turn them into an action plan in one click. (Sample text to be supplied by Len from a real anonymised audit.)
- Steps: Immediate actions. The things to fix this week, with the evidence that prompted them. | Patterns. Where the same weakness appears across sections. | CQC notes. Which quality statements the findings touch.
- Tip: Your completed free audits are kept, so when you upgrade you can generate recommendations for them too.
- CTA: See plans -> `/billing`

**8. Use audits as CQC evidence** (day 8)
- Subject: Turn your audits into inspection evidence
- Preheader: Three habits that make an inspection easier.
- Headline: Audits that stand up on inspection day
- Intro: Inspectors look for audits that happen regularly, find real problems and lead to action. | A few habits make yours easy to show.
- Steps: Set the dates. Schedule recurring audits so the pattern is visible. | Close the loop. Turn every gap into an action with an owner and a date, then record the evidence when it is done. | Keep the reports together. Download the signed PDFs into one folder or share them with your registered manager.
- Tip: Ask your care manager to approve completed audits in the hub. The sign off is recorded in the report.
- CTA: Open your action plans -> `/audits`

**9. Invite your team** (day 10; condition `free_no_staff_invited`, unmet: skip)
- Subject: Share the audits with your team
- Preheader: There is no limit on staff logins.
- Headline: Let your team carry out audits
- Intro: You can add as many staff as you like on the free plan. | Give a team leader or deputy access to just the audits they run, and they can complete them from their phone.
- Steps: Add the person with their name and email. | Choose which audits they can carry out. | Send them a sign in link. They open it on their phone, no password to remember.
- Tip: Allocate the daily and weekly checks to the people who already do them on paper.
- CTA: Add staff -> `/staff`

**10. Nudge to upgrade** (day 14; condition `free_not_upgraded`, always; skip if paid)
- Subject: How other homes use CareStream after the free plan
- Preheader: What changes when audits end with recommendations and policies have no limit.
- Headline: When free is not enough
- Intro: Free is built to show you the value. Homes usually move to a paid plan when they want recommendations at the end of every audit, to check more than five policies, or to put their staff on a shared hub with training. (Case study to be added.)
- Steps: Compare Starter, Professional and Enterprise. | Start the 14 day trial from your account. | Keep your audits, reports and gap results, which carry straight over.
- Tip: Annual billing saves two months.
- CTA: Compare plans -> `/billing`

Emails 1 to 3 are instructional. 4 to 6 respond to usage. 7, 9 (partly), 10 are marketing and are the ones to clear for PECR.

## 10. Dark launch and flags

Everything ships inert behind flags (PLAN.md). Summary: API env `FREE_TIER_ENABLED` (default false) makes `tier:'free'` register return the same "not available" validation error as an unknown tier; `FREE_TIER_PREVIEW_CODE` lets a request that carries `preview_code` through while the flag is off; web `lib/free-rollout.ts` hides the pricing Free card and nav links unless live or `?free=1`; `/register?tier=free&code=...` works for Len on production.
