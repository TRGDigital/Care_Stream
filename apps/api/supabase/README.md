# Supabase Setup

## Deployment order

Run these steps in order. Each step depends on the previous one.

### 1. Prisma migration (creates tables)

```bash
# Uses DATABASE_DIRECT_URL (service_role) — bypasses RLS
npx prisma migrate deploy
```

### 2. RLS policies, indexes & triggers

```bash
# Apply via Supabase CLI
supabase db push --db-url $DATABASE_DIRECT_URL < supabase/rls.sql

# Or paste into Supabase Dashboard > SQL Editor and run
```

### 3. Create the application database user

The `rls.sql` script creates the `carestreamai_api` role with a placeholder password.
Set a strong password in Supabase Dashboard > Database > Roles, then update `DATABASE_URL`.

## Two connection strings

| Variable | Role | RLS | Used by |
|---|---|---|---|
| `DATABASE_URL` | `carestreamai_api` | Enforced | Running application |
| `DATABASE_DIRECT_URL` | `postgres` (service_role) | Bypassed | Prisma migrations only |

## How tenant isolation works

1. **Application layer** — Prisma middleware in `src/db/client.ts` automatically injects
   `tenant_id` into every query for tenant-scoped models. This is the primary mechanism.

2. **Database layer** — RLS policies in `rls.sql` enforce `tenant_id = get_current_tenant_id()`
   at the Postgres level. The app sets `app.current_tenant_id` per-transaction via
   `withTenantTx()`. This is a safety net: even if app code has a bug, the DB rejects
   cross-tenant access.

## Immutable audit log

`audit_logs` has a trigger (`prevent_audit_log_mutation`) that raises an exception on any
UPDATE or DELETE, regardless of role. Only INSERT is permitted.
