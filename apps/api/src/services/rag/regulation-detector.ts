import { prisma } from '../../db/client'

// §6.4 — During ingestion, scan each chunk for references to known external
// regulations.  Matched keys are stored as Pinecone vector metadata so that
// at query time the relevant knowledge base entry is automatically surfaced —
// staff never need to explicitly ask about a regulation.
//
// Terms are loaded once per worker process and cached.  Call
// clearRegulationCache() in tests to reset state between runs.

interface RegulationTerms {
  reference_key: string
  terms: string[]  // reference_key + official_name + also_known_as, all lowercased
}

let cachedTerms: RegulationTerms[] | null = null

async function loadTerms(): Promise<RegulationTerms[]> {
  if (cachedTerms) return cachedTerms

  const rows = await (prisma as any).externalRegulation.findMany({
    where:  { is_active: true },
    select: { reference_key: true, official_name: true, also_known_as: true },
  })

  cachedTerms = rows.map((r: any) => ({
    reference_key: r.reference_key as string,
    terms: [
      (r.reference_key as string).toLowerCase(),
      (r.official_name as string).toLowerCase(),
      ...(r.also_known_as as string[]).map((t: string) => t.toLowerCase()),
    ],
  }))

  return cachedTerms!
}

// Returns reference_keys of any regulations whose name or alias appears in the chunk.
export async function detectRegulations(chunkText: string): Promise<string[]> {
  const terms = await loadTerms()
  if (terms.length === 0) return []

  const lower   = chunkText.toLowerCase()
  const matched: string[] = []

  for (const reg of terms) {
    for (const term of reg.terms) {
      if (lower.includes(term)) {
        matched.push(reg.reference_key)
        break  // one match per regulation is enough
      }
    }
  }

  return matched
}

export function clearRegulationCache(): void {
  cachedTerms = null
}
