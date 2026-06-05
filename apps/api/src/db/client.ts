import { PrismaClient } from '@prisma/client'
import { getTenantIdOrNull } from './tenant-context'

// §3.1 — Prisma client with two isolation mechanisms:
//
// 1. Application layer: Prisma middleware automatically injects tenant_id
//    into every findMany / findFirst / count / aggregate / groupBy query.
//    This is the primary enforcement mechanism.
//
// 2. Database layer: RLS policies in supabase/rls.sql enforce tenant_id
//    at the Postgres level when connecting as carestreamai_api role.
//    RLS acts as a safety net — even if the app layer has a bug, the DB
//    rejects cross-tenant access.
//
// DATABASE_URL      = carestreamai_api role (RLS enforced) — used by the app
// DATABASE_DIRECT_URL = service_role (RLS bypassed) — used by prisma migrate

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function buildClient() {
  // Cap the per-instance connection pool. On Vercel each warm serverless
  // instance keeps its own Prisma pool; the default size (num_cpus*2+1) times
  // many concurrent instances exhausts Postgres' connection slots ("too many
  // clients"). A small fixed limit keeps total connections well under the cap.
  // (The robust fix is to point DATABASE_URL at the Supabase transaction pooler
  // on port 6543; this guard protects us regardless.)
  const baseUrl = process.env.DATABASE_URL
  const url = baseUrl && !/[?&]connection_limit=/.test(baseUrl)
    ? baseUrl + (baseUrl.includes('?') ? '&' : '?') + 'connection_limit=3&pool_timeout=20'
    : baseUrl

  const client = new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  })

  // Tenant isolation middleware — injects tenant_id into read queries automatically.
  // §3.1: "queries scoped to tenant_id... middleware rejects cross-tenant requests"
  client.$use(async (params, next) => {
    const tenantId = getTenantIdOrNull()

    // Only scope operations on tenant-owned tables (not plans or external_regulations)
    const TENANT_SCOPED_MODELS = ['User', 'Policy', 'QueryRecord', 'EmailSession', 'AuditLog', 'KnowledgeEntry']
    const isTenantModel = params.model && TENANT_SCOPED_MODELS.includes(params.model)

    if (!tenantId || !isTenantModel) {
      return next(params)
    }

    // Inject tenant_id into read operations
    if (['findMany', 'findFirst', 'findFirstOrThrow', 'count', 'aggregate', 'groupBy'].includes(params.action)) {
      params.args = params.args ?? {}
      params.args.where = { ...params.args.where, tenant_id: tenantId }
    }

    // Inject tenant_id into write operations
    if (params.action === 'create') {
      params.args.data = { ...params.args.data, tenant_id: tenantId }
    }

    if (params.action === 'createMany') {
      if (Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((row: Record<string, unknown>) => ({
          ...row,
          tenant_id: tenantId,
        }))
      }
    }

    // Scope updates and deletes to the current tenant
    if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(params.action)) {
      params.args = params.args ?? {}
      params.args.where = { ...params.args.where, tenant_id: tenantId }
    }

    return next(params)
  })

  return client
}

export const prisma = globalForPrisma.prisma ?? buildClient()

// Always reuse a single client per process (serverless instance) — prevents a
// second pool being created if this module is ever evaluated twice.
globalForPrisma.prisma = prisma

// ─── Tenant-scoped transaction helper ────────────────────────────────────────
//
// Sets app.current_tenant_id at the Postgres session level before running
// the transaction body. This activates RLS policies (Section 4 of rls.sql)
// when connecting as carestreamai_api.
//
// Usage:
//   const result = await withTenantTx(tenantId, async (tx) => {
//     return tx.policy.findMany()
//   })

export async function withTenantTx<T>(
  tenantId: string,
  fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`
    return fn(tx)
  })
}
