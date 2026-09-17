// Seed the onboarding_emails templates from the composed content. Idempotent:
// only inserts rows that don't already exist (so platform edits are preserved).
//
// Identity is the template_key, NOT the position. Keying on (plan, day_index)
// looked equivalent and was not: inserting an email into the middle of the list
// shifts every later one down a day, so each of those looked "new" at its fresh
// index and was inserted a second time, while the genuinely new email was
// skipped because something already sat at its index. Six duplicates were
// created that way. Positions are the platform's to change by reordering, so
// the seed only ever adds what is missing, at the end.

import { prisma } from '../../db/client'
import { SEQUENCES, PLAN_ORDER } from './content'

// Stable cross-plan identity: same subject -> same key (shared emails link up).
const keyOf = (subject: string) => subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export async function seedOnboardingEmails(): Promise<{ inserted: number; total: number }> {
  let inserted = 0, total = 0
  for (const plan of PLAN_ORDER) {
    const seq = SEQUENCES[plan]
    const existing = await (prisma as any).onboardingEmail.findMany({ where: { plan }, select: { template_key: true, day_index: true } })
    const haveKey = new Set((existing as any[]).map(r => r.template_key).filter(Boolean))
    let nextDay = (existing as any[]).reduce((max, r) => Math.max(max, r.day_index ?? 0), 0)

    for (let i = 0; i < seq.emails.length; i++) {
      total++
      const e = seq.emails[i]
      const key = keyOf(e.subject)
      if (haveKey.has(key)) continue
      const day_index = ++nextDay
      haveKey.add(key)
      await (prisma as any).onboardingEmail.create({
        data: {
          plan, day_index, subject: e.subject, preheader: e.preheader, from_email: null,
          // A draft seeds inactive: previewable and test-sendable in the editor,
          // skipped by the dispatcher until someone publishes it.
          is_active: !e.draft,
          template_key: key, sort_order: day_index * 100,
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
