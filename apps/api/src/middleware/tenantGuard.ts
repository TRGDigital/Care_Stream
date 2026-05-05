import { Request, Response, NextFunction } from 'express'
import { err } from '../lib/response'

// §3.1 — Hard-rejects any request where a tenant_id supplied in URL params,
// query string, or body does not match the tenant_id from the JWT claim.
//
// This prevents a valid JWT holder from probing another tenant's resources
// by crafting requests with a different tenant_id (e.g. GET /policies?tenant_id=other).
// Applied after requireAuth on all authenticated routes.

export function tenantGuard(req: Request, res: Response, next: NextFunction): void {
  const jwtTenantId = req.user?.tenant_id
  if (!jwtTenantId) {
    // requireAuth should have already caught this — belt-and-suspenders
    err(res, 'FORBIDDEN', 'Tenant context missing.', 403)
    return
  }

  const candidates = [
    req.params['tenant_id'],
    req.query['tenant_id'] as string | undefined,
    (req.body as Record<string, unknown>)?.['tenant_id'] as string | undefined,
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate !== jwtTenantId) {
      err(res, 'FORBIDDEN', 'You do not have access to this resource.', 403)
      return
    }
  }

  next()
}
