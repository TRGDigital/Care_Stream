// Works through ANY number of items a few at a time (in order, one call after another), so a long list is never cut short and no AI reply is asked to carry more than it was tuned for.
export async function inBatches<T, R>(items: T[], size: number, run: (chunk: T[]) => Promise<R[]>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) out.push(...await run(items.slice(i, i + size)))
  return out
}
