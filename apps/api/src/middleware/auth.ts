import { Request, Response, NextFunction } from 'express'

// §3.1 / §11 — Verify JWT, extract tenant_id + role, attach to req
// Rejects any request where tenant_id claim is missing or mismatched
export function requireAuth(_req: Request, _res: Response, next: NextFunction) {
  next() // placeholder
}

export function requireAdmin(_req: Request, _res: Response, next: NextFunction) {
  next() // placeholder
}
