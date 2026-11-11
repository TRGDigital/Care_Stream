# Free tier test script (for Len)

Test address: len@orreryintelligence.com. For more tests use plus addresses on the same inbox, for example len+free2@orreryintelligence.com (works if your mail host supports plus addressing, which Google Workspace does by default). Each test signup needs its own address because an email can belong to only one account.

## Before you start (once)
1. SQL applied (`sh ~/apply-free-tier-sql.sh --apply`), and the API env `FREE_TIER_PREVIEW_CODE` set to a secret string. Leave `FREE_TIER_ENABLED` unset so the public cannot sign up.
2. Use a fresh private window for each test so you are not signed in to another account.

## The URL
`https://www.carestreamai.com/register?tier=free&code=<your code>`
The code is never shown on the page. A missing or wrong code shows "Free accounts are not open yet".

## What a test signup does
- Made with the code, it is a TEST tenant: the organisation name gets the prefix `TEST `, it is flagged `is_test`, and it is kept out of the free email sequence and any future metrics.
- The per company domain rule, the 3 per IP per day limit and the 1 per domain rule are skipped, so you can repeat it. Disposable email addresses are still refused, the hidden spam field still applies, and you must still click the verification email.
- A signup WITHOUT the code (after launch) is a normal free tenant and is limited to one free account per company email domain, 3 per connection per day, and Gmail style addresses one per address.

## Steps and what you should see
1. **Sign up**: organisation, name, your address, password, tick the terms, Create free account. Expect the "check your email" page.
2. **Email**: the verification email comes from the platform sender (the API's `SENDGRID_FROM_ADDRESS`; if that is not set, noreply at the inbound domain). Click it. Expect to be signed in and land on the dashboard, with no card step. You also get no welcome sequence email (test tenants are not enrolled).
3. **Dashboard**: "Welcome", four cards (audit, policies, gap analysis, team), a plan card "Free" with **Upgrade to Starter**. Sidebar: Dashboard, Audits, Policy gap analysis, Policies, Staff, Settings, Billing, Help are normal; the rest show a lock and open the paid plans overlay. Type `/training` in the address bar: you are returned to the dashboard.
4. **Policies: 5 and the 6th**: header "Free plan: 0 of 5 policies used". Upload one file (1 of 5). Bulk upload six more files: four are added, two are listed as not added with the amber note and a See plans link. Now 5 of 5, both upload buttons disabled, Upgrade button shown. Delete one: still 5 of 5. Upload a new version of one: allowed, still 5 of 5. Upload the same file again: no extra place used.
5. **Audit with locked recommendations**: Audits shows every template ("Build your own audit" has the Enterprise lock). Run one, add a photo, sign, **Complete audit**. Expect: no wait for AI, report saved, "Your findings" counts per section, a blurred "Example only", an Upgrade button, PDF downloads, manual action works, "generate with AI" refused.
6. **Gap analysis on the 5 policies**: banner "covers the policies you have uploaded". Run all four (coverage, out of date, consistency, wording). Open three gaps (example wording shows); the fourth says it is part of the paid plans. Run coverage again straight away: a calm "policies have not changed" notice above the results. Add or replace a policy and run again: allowed. (Replace a policy with a new version; the 5 place limit means you cannot add a sixth.)
7. **Staff**: add two staff with "Staff + Audits", send one a sign in link, open it on a phone: the hub shows Audits only, everything else locked.
8. **Upgrade**: Dashboard or Billing, Upgrade to Starter. Stripe Checkout charges straight away (no trial): use a Stripe test card only if the API is on test keys; otherwise stop at the Stripe page. After paying: the sidebar unlocks, the 5 policy strip is gone, the tenant is no longer limited.
9. **Downgrade** (optional, needs `FREE_TIER_ENABLED=true`): cancel on Billing; the tenant returns to Free and keeps everything.

## Cleaning up test tenants
Hard delete is not possible (the audit log is append only and points at the tenant). Retire instead: it deactivates every login, marks the tenant closed, prefixes the name `CLOSED `, and renames the user emails so the address can sign up again.

    curl -X POST https://api.carestreamai.com/admin/tenants/<tenant id>/retire-test \
      -H "Authorization: Bearer $PLATFORM_ADMIN_TOKEN"

The tenant id is on the Platform > Clients page (look for names starting `TEST `). It refuses any tenant that is not a test tenant, and any with a Stripe subscription (cancel that first).

## What to tell me if something is off
The step number, the address you used, and a screenshot. Errors from the plan limits always say what happened and offer the Upgrade button.
