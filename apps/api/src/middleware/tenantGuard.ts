import { Request, Response, NextFunction } from 'express'

// §3.1 — Ensures every DB/Pinecone/S3 operation is scoped to the JWT tenant_id
// Hard-rejects any attempt to access another tenant's data
export function tenantGuard(_req: Request, _res: Response, next: NextFunction) {
  next() // placeholder
}
