// Staff-facing "My Progress" — the signed-in user's own training & induction
// record, fully localised into their first language (UI labels + the on-screen
// explanations + module/flow names + recent activity), so it reads naturally for
// staff whose first language isn't English.

import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { buildStaffRecord } from '../lib/staff-record'
import { translateBundle, translateText, mapLimit, withTranslationBudget } from '../lib/translate'
import { languageNameForCode } from '../data/languages'
import { prisma } from '../db/client'

export const meRouter = Router()

// All on-screen text for the My Progress page. {placeholders} are filled in by
// the client and are preserved through translation.
const UI_STRINGS: Record<string, string> = {
  title:               'My Progress',
  subtitle:            'Your training and induction at a glance.',
  ring_training:       'Training',
  ring_induction:      'Induction',
  ring_score:          'Avg score',
  outstanding_title:   'You have {n} item(s) to finish',
  outstanding_caught:  "You're all caught up — everything assigned is complete.",
  btn_training:        'Training',
  btn_induction:       'Induction',
  compare_title:       'How you compare',
  compare_team:        'team',
  training_title:      'My training',
  induction_title:     'My induction',
  open:                'Open',
  none_training:       'Nothing assigned yet.',
  none_induction:      'No induction assigned.',
  steps:               '{done}/{total} steps',
  activity_title:      'Recent activity',
  status_complete:     'Done',
  status_in_progress:  'In progress',
  status_not_started:  'To do',
  status_expired:      'Renew',
  // ── Explanations (the ⓘ info bubbles) ──
  info_rings:    "These circles show how much of your training and induction you've finished, and your average quiz score. The closer to 100%, the better.",
  info_outstanding: 'These are the things still left for you to do. Tap a button to go and finish them.',
  info_compare:  "This shows how you're doing compared with the average for everyone in your team. An up arrow means you're above the team average.",
  info_training: 'Your training modules and whether each one is done. Tap Open to read the material and answer the questions.',
  info_induction: 'Your induction steps — reading policies and answering a few questions. Tap Open to carry on where you left off.',
  info_activity: 'The most recent things you have completed.',
}

meRouter.get('/progress', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const record = await buildStaffRecord(tenantId, userId, { includeTeam: true })
  if (!record) { err(res, 'NOT_FOUND', 'Record not found.', 404); return }

  // Localise into the staff member's first language when their comms toggle is on.
  const langCode = record.user.comms_always_first_language === false ? 'eng' : ((record.user.first_language as string) ?? 'eng')
  if (langCode === 'eng') { ok(res, { ...record, ui: UI_STRINGS }); return }

  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null)
  const langName = languageNameForCode(langCode, tenant?.custom_languages)

  const localise = (async () => {
    const [ui, tItems, oItems, timeline] = await Promise.all([
      translateBundle(UI_STRINGS, langCode, langName),
      mapLimit(record.training.items, 6, async (m: any) => ({ ...m, module_name: await translateText(m.module_name, langCode, langName) })),
      mapLimit(record.onboarding.items, 6, async (f: any) => ({ ...f, flow_name: await translateText(f.flow_name, langCode, langName) })),
      mapLimit(record.timeline.slice(0, 6), 6, async (e: any) => ({ ...e, label: await translateText(e.label, langCode, langName) })),
    ])
    return {
      ...record, ui,
      training:   { ...record.training,   items: tItems },
      onboarding: { ...record.onboarding, items: oItems },
      timeline,
    }
  })()

  const result = await withTranslationBudget(localise, 16_000, { ...record, ui: UI_STRINGS })
  ok(res, result)
})
