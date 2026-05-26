import { prisma } from '../db/client'
import { TRAINING_MODULES } from '../data/training-modules'

export async function seedTrainingModulesIfEmpty(): Promise<void> {
  try {
    const count = await (prisma as any).trainingModule.count()
    if (count > 0) return
    for (const m of TRAINING_MODULES) {
      await (prisma as any).trainingModule.upsert({
        where:  { slug: m.slug },
        update: {},
        create: {
          slug:        m.slug,
          name:        m.name,
          description: m.description,
          category:    m.category,
          questions:   m.questions,
          is_annual:   true,
          sort_order:  m.sort_order,
          is_active:   true,
        },
      })
    }
    console.log(`Seeded ${TRAINING_MODULES.length} training modules`)
  } catch (e) {
    console.error('Training module seed error:', e)
  }
}
