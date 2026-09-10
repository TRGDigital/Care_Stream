# Multi-site groups and the Benchmarking tab — spec

**Status: draft for Len's review · 10 Sept 2026**

The marketing page (theme preview: /features/multi-site-group-console-and-benchmarking) promises a
group console and cross-site benchmarking. This spec maps what already exists in the product,
what is genuinely missing, and how to close the gap.

## What already exists (more than expected)

| Piece | Where | State |
|---|---|---|
| Group data model | `tenants.parent_tenant_id` (null = root/standalone, set = sub-tenant) | Live |
| List sites in my group | `GET /sites` | Live |
| Switch site (multi access) | `POST /auth/switch-site` — any admin of one site in the group gets a JWT for another; no duplicate user rows needed | Live |
| Site switcher UI | Admin header dropdown ("Your sites") in `admin-shell.tsx`, shown when `sites.length > 1` | Live, but invisible — see gap 1 |
| Group console page | `/group` (admin app) — compliance rollup + per-site benchmark of training, onboarding, audits, with switch buttons | Live, reachable only when a group exists |
| Group nav item | "Group" appears at the top of Overview when multi-site | Live, same visibility condition |
| Create a NEW site in my group | `POST /sites` (creates an empty sub-tenant and switches into it) | Live |
| Benchmark endpoint | `GET /sites/overview` — per-site training completion/expiry, onboarding, audit completion | Live |

**The reason none of this is visible today: there is no way to form a group from EXISTING
companies.** `POST /sites` only creates brand-new empty sub-tenants. Two established tenants
(say Crossways and Ferndale) cannot be joined, so no real account has ever had
`sites.length > 1`, so the switcher, the Group nav item and the console have never rendered
for anyone.

## Gap 1 — form a group from existing companies

A platform-admin tool (not tenant self-serve: joining companies moves data visibility across
organisations and touches billing, so it belongs with Len).

- **Where**: Platform admin → Clients → a client's detail page → "Group" card.
- **Action**: "Link into group" — pick the group root tenant; sets `parent_tenant_id`.
  "Unlink" clears it.
- **Guardrails**:
  - Target root must itself be a root (no chains: a sub-tenant cannot be a parent).
  - A tenant with sub-tenants cannot become someone's child.
  - Both tenants must be distinct; confirm dialog names both and states what group admins
    of every other site will now be able to see and switch into.
  - Write an audit row (who linked what, when) — platform action log if one exists,
    else a `tenant_group_events` table.
- **Billing note**: each tenant keeps its own subscription for now (matches current Stripe
  setup). The group is an access/reporting construct, not a billing merge. Flag in the UI.
- **Who can switch**: `switch-site` is already admin-only. Keep that for v1. A per-user
  allowlist ("this admin may not see site X") is a later refinement if a client asks.

Effort: small. One platform endpoint + card, guardrails, and the existing machinery lights up
(switcher, Group nav, /group page) with zero further work.

## Gap 2 — the "Benchmarking" tab

Len's ask: a left-nav tab named **Benchmarking** analysing data, training performance and
questions asked in the hub, per company in the group.

- **Rename** the existing "Group" nav item to **Benchmarking** (same `/group` route, same
  visibility rule). The page keeps its site-switcher rollup at the top; benchmarking becomes
  the body rather than an afterthought.
- **New endpoint** `GET /sites/benchmarking?days=30|90` (or extend `/sites/overview`),
  returning per site:
  - **Training performance**: completion % of assigned modules, overdue count, expired count,
    average question score (from enrollment answers), renewals due in 30 days.
  - **Hub engagement**: questions asked in the hub (chat message count), weekly active staff %
    (reuse the existing engagement service's WAU logic per tenant), languages used.
  - **Audits**: completion rate (already computed in overview).
  - **Policies**: published / awaiting approval counts from policy documents.
  - **Normalisation**: every count also expressed per active staff member — a 50-bed home
    against a 20-bed home is meaningless in absolutes. League ordering uses the normalised
    figure; the absolute sits alongside.
  - **Trend**: 8 weekly buckets for the two headline series (training completion %, hub
    questions per staff) so a site's direction is visible, not just its position.
- **UI**: summary tiles for the group; a league table (one row per site, sortable, current
  site highlighted, best-in-group marked per column); two small trend charts. Site name click
  = existing switch flow.
- **Access**: group admins only (the endpoint derives the site set server-side from the
  caller's group, as `/sites/overview` already does — never trusts a site list from the
  client).

Effort: medium. The queries are aggregations over existing tables; the page shell exists.

## Gap 3 — polish that makes it feel real

- Switcher discoverability: after linking, the header shows the dropdown automatically; add a
  one-time "You can switch between your sites here" coach mark.
- The weekly manager digest gains a group edition for group admins: one email, one league
  table (reuses the benchmarking endpoint).
- CS-1001 + CS-1002 as the pilot group once Len approves — they are already sibling copies of
  the same home, ideal for testing switch + benchmarking without touching a real client.

## Phasing

1. **Phase 1 (unblocks everything)**: platform link/unlink tool + guardrails + audit trail.
   Existing switcher, nav and /group page start appearing for grouped tenants.
2. **Phase 2**: Benchmarking endpoint + renamed tab + league table + trends.
3. **Phase 3**: group digest email, coach mark, per-user site allowlist if needed.

## Open questions for Len

1. Group formation stays platform-admin-only (recommended), or should a tenant admin be able
   to request/attach a company themselves?
2. Nav name: **Benchmarking** (as asked) or keep **Group** with Benchmarking as the page
   title? (Spec assumes rename to Benchmarking.)
3. Billing stays per-tenant for v1 — confirm.
4. Pilot on CS-1001 + CS-1002 before offering to a real group?
