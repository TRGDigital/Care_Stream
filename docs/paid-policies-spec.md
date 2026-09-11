# Standalone paid policies — spec

**Status: agreed direction with Len, 11 Sept 2026**

Spin the tenant-facing paid policy service out as a standalone product, the way training
became the public shop: anyone in the care sector can buy individual policies or bundles
without a full CareStream licence.

## Decisions taken (Len, 11 Sept)

1. **Kept updated, not one-off**: buyers' policies are updated when legislation changes,
   as an annual renewal — recurring revenue and the natural upsell to a full licence.
2. **Bundles**: sell packs (e.g. a statutory starter pack) at a discount, alongside
   single policies.
3. **Read-only for buyers**: no editing; we approve what carries their name. They get the
   in-dashboard copy and the branded letterhead print/PDF.
4. **Turnaround promise** on the product page (we hand-read every policy): within 2
   working days of details being supplied.
5. **Stripe**: reuse the proven training-shop payment path (hosted Checkout, payment
   mode, reconcile-on-return); already tested for training modules.

## The non-negotiable: policies must be perfect

We generate from the buyer's details against legislation, CQC and law. Our own gap
analysis must never be able to fault a policy we sold. So correctness is a **hard gate in
the pipeline**, not a promise:

Generate → verify → (revise → verify)× → only then into Len's approval queue.

The verification checklist per policy:
- **Regulation coverage**: the draft covers every reference_key the catalogue entry maps
  to, judged by the existing coverage machinery.
- **Policy lint**: no placeholders, no outdated terminology (NHS Digital, pandemic-era
  wording), no orphaned sections.
- **Substitution completeness**: every intake field the product declares appears in the
  document; zero `[insert …]` / `[name]` tokens remain.
- **Identity**: buyer's legal name, address, and registration identifiers present where
  the policy requires them.

A failed check sends the draft back to the generator with the failures as instructions,
bounded (3 attempts); still-failing drafts land in the queue flagged red for a human,
never silently. The Paid Policies tab shows the green checklist beside Approve; Approve
is disabled while any check is red (platform admin can override with a logged reason).

**Calibration prerequisite**: the coverage judge has been too strict before (the 0/74
incident, Sept 2026). Before it gates real orders, run it across our known-good policy
seeds and tune until they pass clean. A gate that fails everything is as useless as no
gate.

## What already exists (verified in code)

| Piece | Where |
|---|---|
| Purchase lifecycle paid→drafting→drafted→approved | `PolicyPurchase` model + `/policy-purchases` routes |
| Stripe one-off checkout + reconcile-on-return | `createPolicyCheckoutSession` (same path as training licences) |
| Platform order queue with approve-and-deliver | `policy-orders.tsx`, currently inside /platform/policy-gaps |
| Restricted-account provisioning for public buyers | training-public.ts: pays → provisions `training_only` tenant + admin + licences, emails credentials |
| Tier-gated nav | `TRAINING_ONLY_NAV` in admin-shell — `policies_only` is the sibling |
| Canonical policy list per care setting | `expected_policy_titles` |
| Personalisation | organisation_details + role holders + policy writer substitution |
| Branded output | the shared letterhead print/PDF (policy-print.ts) |
| Legislation change monitoring | regulation source monitor + change review (weekly cron) |
| Product page template | /staff-training/[slug] on the live marketing site |

## New build

### 1. Catalogue
`policy_products`: slug, title, description, care settings it suits, reference_keys it
must cover, price_pence, active. `policy_bundles`: slug, title, product ids,
bundle_price_pence. Seeded from `expected_policy_titles`. Each product declares its
**intake schema**: shared identity fields (company legal name, trading name, address,
CQC provider/location IDs, ICO registration, nominated individual, registered manager)
plus per-policy extras, as a field list with labels, help text and validation.

### 2. Public shop
/care-policies becomes the catalogue (it exists as marketing today); /care-policies/[slug]
product pages on the /staff-training/[slug] template: what the policy covers, which
regulations, the intake fields they'll need, turnaround, single price + bundle placement.
Basket supports mixed single+bundle. Guest checkout identical to training.

### 3. Provisioning
On reconcile: create tenant with tier `policies_only` (or attach to an existing tenant
matched by email — same rule as training), admin user, purchase rows, credentials email.
`policies_only` nav: /policies only (plus billing). The /policies view for this tier
shows their orders and statuses, not the full policy-management UI.

### 4. Intake
Post-purchase, not at checkout. Dashboard shows "We need a few details before we start
writing" per order; identity fields write into organisation_details (asked once, reused
across every policy they ever buy); per-policy extras stored on the purchase. Status:
`paid` → `awaiting_details` → `drafting` → `drafted` (verified) → `approved`.

### 5. Platform: Paid Policies tab
Promote the existing order queue to a top-level /platform tab. Adds: purchase email
notification to the team (notify-admin path), the verification checklist per draft,
Generate/Regenerate actions, Approve gated on green checks, and delivery on approve
(existing behaviour).

### 6. Renewals and updates
Annual renewal per policy (or per bundle), same renewal machinery as training licences.
When the regulation monitor confirms a change affecting a sold policy's reference_keys:
regenerate → verify → re-approve → the buyer's copy updates, with an email telling them
what changed and why. Lapsed renewal: the copy stays but stops updating, clearly labelled
"no longer maintained" — never deleted.

### 7. Upsell
The buyer's tenant already exists with their policies loaded. One CTA in their dashboard
and in every update email: "This is a slice of CareStream — see what the full platform
does with your policies." Upgrading flips the tier; nothing migrates.

## Phasing

1. **Paid Policies tab + purchase notifications + verification gate** — immediately
   valuable for the existing tenant flow, and de-risks the correctness requirement first.
2. **Catalogue + intake schema + status flow** (still tenant-facing).
3. **Public shop + policies_only provisioning** — the standalone launch.
4. **Renewals + legislation-change updates + upsell surfaces.**

## Still to decide (Len)

- Bundle contents and prices; single-policy price (a flat POLICY_PENCE exists today).
- Renewal price point (suggest ~30–40% of purchase price per year).
- Which care settings at launch (all 22, or care homes first).
- Turnaround clock start: purchase, or details supplied (spec assumes details supplied).
