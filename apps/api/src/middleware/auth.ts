import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { tenantContext } from '../db/tenant-context'
import { prisma } from '../db/client'

// JWT payload shape — tenant_id and role are embedded at login time (§3.1, §11.1)
export interface JwtPayload {
  sub: string        // user UUID
  tenant_id: string
  role: 'admin' | 'staff'
  iat: number
  exp: number
}

// Extend Express Request to carry the decoded JWT + audit scope
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
      // Set by requireAuditAccess: 'all' for admins, else the allocated template ids.
      auditAllowed?: 'all' | string[]
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

// Audit access: admins (all audits) OR "Staff + Audits" members (their allocated
// templates). Sets req.auditAllowed = 'all' | string[]. Apply after requireAuth.
export async function requireAuditAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, error: { code: 'MISSING_TOKEN', message: 'Authentication required.' } })
    return
  }
  if (req.user.role === 'admin') {
    req.auditAllowed = 'all'
    next()
    return
  }
  try {
    const u = await (prisma as any).user.findUnique({ where: { id: req.user.sub }, select: { audit_template_ids: true } })
    const ids: string[] = u?.audit_template_ids ?? []
    if (!ids.length) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'You do not have audit access.' } })
      return
    }
    req.auditAllowed = ids
    next()
  } catch {
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Could not verify audit access.' } })
  }
}

// True if the request's audit scope permits this template (admins = always).
export function auditTemplateAllowed(req: Request, templateId: string | null | undefined): boolean {
  const a = req.auditAllowed
  if (a === 'all') return true
  if (!a || !templateId) return false
  return a.includes(templateId)
}

// §6.5 — Platform admin routes (Google Sheets sync, super-admin operations).
// Uses a long-lived Bearer token stored as PLATFORM_ADMIN_TOKEN env var,
// separate from tenant JWTs. Registered before requireAuth in app.ts.
export function requirePlatformAdmin(req: Request, res: Response, next: NextFunction): void {
  const token         = process.env.PLATFORM_ADMIN_TOKEN
  const authorization = req.headers.authorization

  if (!token) {
    res.status(503).json({ success: false, error: { code: 'NOT_CONFIGURED', message: 'Platform admin token not configured.' } })
    return
  }

  if (!authorization || authorization !== `Bearer ${token}`) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid platform admin token.' } })
    return
  }

  next()
}

// §11.1 — Rate-limit-aware brute-force protection helper (used in auth route)
export function isAccountLocked(lockedUntil: Date | null): boolean {
  if (!lockedUntil) return false
  return lockedUntil > new Date()
}
