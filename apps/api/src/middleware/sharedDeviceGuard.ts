// Shared tablets: re-check the tablet on every request so "revoke" stops it at once, and tag chat questions with the tablet they were asked on.
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client'

const cache = new Map<string, { ok: boolean; at: number }>()   // 15 second memory, so a busy tablet does not hit the database each time
const TTL = 15_000

export async function sharedDeviceGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  const dev = req.user?.dev
  if (!dev) { next(); return }
  const hit = cache.get(dev.d)
  let ok: boolean
  if (hit && Date.now() - hit.at < TTL) ok = hit.ok
  else {
    const row = await (prisma as any).sharedDevice.findUnique({ where: { id: dev.d }, select: { revoked_at: true, tenant_id: true } }).catch(() => null)
    ok = !!row && !row.revoked_at && row.tenant_id === req.user!.tenant_id
    cache.set(dev.d, { ok, at: Date.now() })
    if (ok) void (prisma as any).sharedDevice.update({ where: { id: dev.d }, data: { last_seen_at: new Date() } }).catch(() => {})
  }
  if (!ok) { res.status(401).json({ success: false, error: { code: 'DEVICE_REVOKED', message: 'This shared tablet has been disconnected. Ask an administrator to reconnect it.' } }); return }

  // Chat questions asked on a tablet are tagged with it once the answer has been saved (the chat service itself is left alone).
  if (req.method === 'POST' && req.originalUrl.split('?')[0].startsWith('/query')) {
    const userId = req.user!.sub, tenantId = req.user!.tenant_id, deviceId = dev.d
    res.on('finish', () => {
      void (prisma as any).queryRecord.updateMany({
        where: { tenant_id: tenantId, user_id: userId, shared_device_id: null, created_at: { gte: new Date(Date.now() - 3 * 60_000) } },
        data: { shared_device_id: deviceId },
      }).catch(() => {})
    })
  }
  next()
}

export function forgetDevice(id: string) { cache.delete(id) }
