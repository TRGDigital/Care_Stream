// Free account tours (audits, training, policies). Which tour a new free account signed up for, and which tours they
// have started and finished, so the first login opens the right tour once and the "Take the tour" chooser can show
// what is done. Stored on the tenant (tenants.training_settings.free_tours) so it follows the account across devices.
import { Router, Request, Response } from 'express'
import { requireAdmin } from '../middleware/auth'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { freeCampaignFor } from '../services/onboarding/free-track'

export const freeTourRouter = Router()
const TOURS = ['audits', 'training', 'policies'] as const
type Tour = typeof TOURS[number]
const CAMPAIGN_TO_TOUR: Record<string, Tour | null> = { free_audits: 'audits', free_training: 'training', free_policies: 'policies', free_general: null }

// GET /free-tour → { track, tours: { audits?: { started_at, finished_at }, ... }, auto_opened, is_new }
freeTourRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  const t = await (prisma as any).tenant.findUnique({ where: { id: req.user!.tenant_id }, select: { signup_meta: true, training_settings: true, created_at: true } })
  const meta = (t?.signup_meta as any) ?? {}
  const track = CAMPAIGN_TO_TOUR[freeCampaignFor({ source: meta.source, course: meta.course, track: meta.track })] ?? null
  const state = ((t?.training_settings as any)?.free_tours ?? {}) as { tours?: Record<string, any>; auto_opened?: boolean }
  // Only a genuinely new account gets the tour opened for it; an older free account just has the button.
  const isNew = !!t?.created_at && Date.now() - new Date(t.created_at).getTime() < 14 * 86_400_000
  ok(res, { track, tours: state.tours ?? {}, auto_opened: !!state.auto_opened, is_new: isNew })
})

// POST /free-tour/event { tour?, event: 'started' | 'finished' | 'auto_opened' }
freeTourRouter.post('/event', requireAdmin, async (req: Request, res: Response) => {
  const event = String(req.body?.event ?? '')
  const tour = String(req.body?.tour ?? '') as Tour
  if (!['started', 'finished', 'auto_opened'].includes(event)) return err(res, 'VALIDATION_ERROR', 'Unknown event', 400)
  if (event !== 'auto_opened' && !TOURS.includes(tour)) return err(res, 'VALIDATION_ERROR', 'Unknown tour', 400)
  const tenantId = req.user!.tenant_id
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { training_settings: true } })
  const current = (t?.training_settings as any) ?? {}
  const state = { tours: {}, auto_opened: false, ...(current.free_tours ?? {}) } as { tours: Record<string, any>; auto_opened: boolean }
  const now = new Date().toISOString()
  if (event === 'auto_opened') state.auto_opened = true
  else {
    const cur = state.tours[tour] ?? {}
    state.tours[tour] = event === 'started' ? { ...cur, started_at: cur.started_at ?? now } : { ...cur, started_at: cur.started_at ?? now, finished_at: now }
  }
  await (prisma as any).tenant.update({ where: { id: tenantId }, data: { training_settings: { ...current, free_tours: state } } })
  ok(res, state)
})
