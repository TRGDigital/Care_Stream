// Records a sign in attempt (who, when, from where, on what). Never throws and never blocks the sign in: a logging problem must not stop anyone getting in.
import type { Request } from 'express'
import { prisma } from '../db/client'
import { clientOrigin } from './client-origin'

export type SignInFailure = 'wrong_password' | 'account_locked' | 'email_not_verified' | 'account_deactivated'

export async function recordSignIn(req: Request, user: { id: string; tenant_id: string }, result: { success: true; method: 'password' | 'magic_link' | 'tablet_pin' } | { success: false; method: 'password' | 'magic_link'; reason: SignInFailure }): Promise<void> {
  try {
    const o = clientOrigin(req)
    await (prisma as any).userSignIn.create({
      data: {
        tenant_id: user.tenant_id, user_id: user.id, success: result.success, method: result.method,
        failure_reason: result.success ? null : result.reason,
        ip: o.ip, country: o.country, region: o.region, city: o.city, user_agent: o.user_agent, device: o.device, client: o.client,
      },
    })
  } catch (e) { console.error('[sign-in-log] could not record', e) }
}
