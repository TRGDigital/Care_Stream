// Platform knowledge seeder — plants the 32 generic UK care sector Q&A pairs
// into a tenant's KnowledgeEntry table and Pinecone namespace.
//
// Idempotent: uses source_type='platform' + source_id='seed_<slug>' as the
// unique key, so re-running is safe and only adds missing entries.

import { prisma } from '../../db/client'
import { embedTexts } from '../rag/embedder'
import { upsertKnowledgeVectors, type KnowledgeVector } from '../vector/pinecone'
import { PLATFORM_KNOWLEDGE_SEEDS } from '../../data/platform-knowledge-seeds'

export async function seedTenantKnowledge(
  tenantId: string,
): Promise<{ seeded: number; skipped: number }> {
  let seeded  = 0
  let skipped = 0

  const customSeeds = await (prisma as any).platformCustomSeed.findMany()
  const allSeeds = [
    ...PLATFORM_KNOWLEDGE_SEEDS,
    ...customSeeds.map((s: any) => ({
      slug:        s.slug,
      category:    s.category,
      question:    s.question,
      answer:      s.answer,
      source_name: s.source_name,
    })),
  ]

  for (const seed of allSeeds) {
    const sourceId = `seed_${seed.slug}`

    const existing = await (prisma as any).knowledgeEntry.findFirst({
      where: { tenant_id: tenantId, source_type: 'platform', source_id: sourceId },
      select: { id: true },
    })

    if (existing) {
      skipped++
      continue
    }

    const entry = await (prisma as any).knowledgeEntry.create({
      data: {
        tenant_id:   tenantId,
        question:    seed.question,
        answer:      seed.answer,
        source_type: 'platform',
        source_id:   sourceId,
        source_name: seed.source_name,
      },
    })

    const [embedding] = await embedTexts([seed.question])
    const vectorId    = `kb_${entry.id}`

    const vector: KnowledgeVector = {
      id:     vectorId,
      values: embedding,
      metadata: {
        tenant_id:   tenantId,
        entry_id:    entry.id,
        question:    seed.question,
        answer:      seed.answer,
        source_type: 'platform',
        source_id:   sourceId,
        source_name: seed.source_name,
      },
    }

    await upsertKnowledgeVectors(tenantId, [vector])

    await (prisma as any).knowledgeEntry.update({
      where: { id: entry.id },
      data:  { vector_id: vectorId },
    })

    seeded++
  }

  console.log(`[seeder] tenant=${tenantId} seeded=${seeded} skipped=${skipped}`)
  return { seeded, skipped }
}

// Seed a single custom seed entry to every existing tenant. Idempotent.
export async function seedCustomSeedToAllTenants(
  seed: { slug: string; category: string; question: string; answer: string; source_name: string },
): Promise<{ tenants: number; total_seeded: number }> {
  const tenants = await (prisma as any).tenant.findMany({ select: { id: true } })
  let totalSeeded = 0

  for (const tenant of tenants) {
    const sourceId = `seed_${seed.slug}`
    const existing = await (prisma as any).knowledgeEntry.findFirst({
      where: { tenant_id: tenant.id, source_type: 'platform', source_id: sourceId },
      select: { id: true },
    })
    if (existing) continue

    const entry = await (prisma as any).knowledgeEntry.create({
      data: {
        tenant_id:   tenant.id,
        question:    seed.question,
        answer:      seed.answer,
        source_type: 'platform',
        source_id:   sourceId,
        source_name: seed.source_name,
      },
    })

    const [embedding] = await embedTexts([seed.question])
    const vectorId    = `kb_${entry.id}`

    await upsertKnowledgeVectors(tenant.id, [{
      id:     vectorId,
      values: embedding,
      metadata: {
        tenant_id:   tenant.id,
        entry_id:    entry.id,
        question:    seed.question,
        answer:      seed.answer,
        source_type: 'platform',
        source_id:   sourceId,
        source_name: seed.source_name,
      },
    }])

    await (prisma as any).knowledgeEntry.update({
      where: { id: entry.id },
      data:  { vector_id: vectorId },
    })

    totalSeeded++
  }

  console.log(`[seeder] custom seed=${seed.slug} seeded=${totalSeeded} tenants`)
  return { tenants: tenants.length, total_seeded: totalSeeded }
}

export async function seedAllTenants(): Promise<{ tenants: number; total_seeded: number }> {
  const tenants = await (prisma as any).tenant.findMany({ select: { id: true } })
  let totalSeeded = 0

  for (const tenant of tenants) {
    try {
      const { seeded } = await seedTenantKnowledge(tenant.id as string)
      totalSeeded += seeded
    } catch (e) {
      console.error(`[seeder] Failed for tenant=${tenant.id}: ${String(e)}`)
    }
  }

  return { tenants: tenants.length, total_seeded: totalSeeded }
}
