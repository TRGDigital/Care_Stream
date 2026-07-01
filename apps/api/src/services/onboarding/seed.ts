// Seed the onboarding_emails templates from the composed content. Idempotent:
// only inserts rows that don't already exist (so platform edits are preserved).

import { prisma } from '../../db/client'
import { SEQUENCES, PLAN_ORDER } from './content'

// Stable cross-plan identity: same subject -> same key (shared emails link up).
const keyOf = (subject: string) => subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export async function seedOnboardingEmails(): Promise<{ inserted: number; total: number }> {
  let inserted = 0, total = 0
  for (const plan of PLAN_ORDER) {
    const seq = SEQUENCES[plan]
    for (let i = 0; i < seq.emails.length; i++) {
      total++
      const day_index = i + 1
      const e = seq.emails[i]
      const exists = await (prisma as any).onboardingEmail.findUnique({ where: { plan_day_index: { plan, day_index } } })
      if (exists) continue
      await (prisma as any).onboardingEmail.create({
        data: {
          plan, day_index, subject: e.subject, preheader: e.preheader, from_email: null,
          template_key: keyOf(e.subject), sort_order: day_index * 100,
          body: {
            headline:  e.headline,
            intro:     e.intro,
            steps:     e.steps,
            tip:       e.tip ?? null,
            ctaLabel:  e.ctaLabel,
            ctaHref:   e.ctaHref,
            where:     e.where ?? null,
            imageSrc:  e.imageSrc ?? null,
            badge:     e.badge ?? null,
          },
        },
      })
      inserted++
    }
  }
  return { inserted, total }
}
