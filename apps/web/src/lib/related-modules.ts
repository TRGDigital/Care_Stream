// Shared internal-linking helper for the per-module pages (/staff-training/[slug]
// and /buy/[slug]). Both link out to a set of sibling modules so every module
// page receives several dofollow internal links — never just one.
//
// The linking graph is built from a deterministic ROTATING WINDOW over the fixed
// module order: module at position i links to i+1, i+2, … (wrapping around). That
// makes every module the target of exactly `windowCount` other modules, evenly
// distributed with no orphaned tail pages — which a "same-group first, slice(0,N)"
// approach can't guarantee (the tail of the list never gets picked). Same-group
// siblings are surfaced first for topical relevance, on top of that backbone.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type ModuleLink = { slug: string; title: string; group_key: string; group_label?: string }

// The full, stable-ordered module catalogue used to compute related links.
export async function fetchModules(): Promise<ModuleLink[]> {
  try {
    const res = await fetch(`${API_URL}/public/training/standard-modules`, { next: { revalidate: 900 } })
    if (!res.ok) return []
    const body = await res.json()
    const topics = (body?.data?.topics ?? []) as Array<{ slug: string; title: string; group_key: string }>
    const groups = (body?.data?.groups ?? {}) as Record<string, string>
    return topics
      .filter((t) => t.slug)
      .map((t) => ({ slug: t.slug, title: t.title, group_key: t.group_key, group_label: groups[t.group_key] }))
  } catch {
    return []
  }
}

// Related modules for `currentSlug`. Always emits the rotating-window neighbours
// (the coverage backbone), with up to `sameGroup` topical siblings shown first.
export function relatedModules(
  all: ModuleLink[],
  currentSlug: string,
  opts?: { sameGroup?: number; windowCount?: number },
): ModuleLink[] {
  const sameGroupMax = opts?.sameGroup ?? 2
  const windowCount = opts?.windowCount ?? 4
  const n = all.length
  const idx = all.findIndex((m) => m.slug === currentSlug)
  if (idx < 0 || n <= 1) return []

  const current = all[idx]
  const seen = new Set<string>([currentSlug])

  // 1) Rotating window — always fully emitted, so every module's in-degree is
  //    guaranteed to be `take`. This is what fixes "only one internal link".
  const take = Math.min(windowCount, n - 1)
  const windowItems: ModuleLink[] = []
  for (let k = 1; k <= take; k++) {
    const item = all[(idx + k) % n]
    if (!seen.has(item.slug)) {
      seen.add(item.slug)
      windowItems.push(item)
    }
  }

  // 2) Same-group siblings for relevance (extra links, shown first).
  const sameGroup = all
    .filter((m) => m.group_key === current.group_key && !seen.has(m.slug))
    .slice(0, sameGroupMax)

  return [...sameGroup, ...windowItems]
}
