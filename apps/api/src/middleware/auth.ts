import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { tenantContext } from '../db/tenant-context'

// JWT payload shape — tenant_id and role are embedded at login time (§3.1, §11.1)
export interface JwtPayload {
  sub: string        // user UUID
  tenant_id: string
  role: 'admin' | 'staff'
  iat: number
  exp: number
}

// Extend Express Request to carry the decoded JWT
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

function extractBearer(req: Request): string | null {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

// §11.1 — Verify JWT access token, attach user to request,
// and run the remainder of the handler inside the tenant's AsyncLocalStorage context
// so getTenantId() works in all downstream service calls.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearer(req)

  if (!token) {
    res.status(401).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Authentication required.' } })
    return
  }

  let payload: JwtPayload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
  } catch {
    res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired.' } })
    return
  }

  req.user = payload

  // Run the rest of the request inside the tenant context (§3.1 isolation)
  tenantContext.run({ tenantId: payload.tenant_id }, next)
}

// §11.1 — Admin-only routes. Must be applied after requireAuth.
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required.' } })
    return
  }
  next()
}

// §11.1 — Rate-limit-aware brute-force protection helper (used in auth route)
export function isAccountLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false
  return lockedUntil > new Date()
}
