import { prisma } from '../db/client'
import { TRAINING_MODULES } from '../data/training-modules'

export async function seedTrainingModulesIfEmpty(): Promise<void> {
  try {
    // Seed only the shared platform templates (tenant_id = null); tenants get their
    // own copies cloned on first access (see ensureTenantModules in routes/training.ts).
    const count = await (prisma as any).trainingModule.count({ where: { tenant_id: null } })
    if (count > 0) return
    await (prisma as any).trainingModule.createMany({
      data: TRAINING_MODULES.map(m => ({
        tenant_id:   null,
        slug:        m.slug,
        name:        m.name,
        description: m.description,
        category:    m.category,
        questions:   m.questions,
        is_annual:   true,
        sort_order:  m.sort_order,
        is_active:   true,
      })),
      skipDuplicates: true,
    })
    console.log(`Seeded ${TRAINING_MODULES.length} training modules`)
  } catch (e) {
    console.error('Training module seed error:', e)
  }
}
