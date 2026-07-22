import { AsyncLocalStorage } from 'node:async_hooks'
import { prisma } from '../db/client'
import { getTenantIdOrNull } from '../db/tenant-context'

// §10.6 — Per-request LLM token + cost tracking.
//
// LLM calls happen deep in the RAG pipeline (answer generation, intent
// classification, translation) and a single query may hit more than one model.
// Rather than thread token counts through every call site, we use an
// AsyncLocalStorage context: runQueryPipeline opens a tracking scope, each
// LLM client records its usage into that scope, and saveQueryRecord reads the
// accumulated totals + a computed real cost at the end.

export interface CallUsage {
  model:                 string
  input_tokens:          number
  output_tokens:         number
  cache_read_tokens:     number
  cache_creation_tokens: number
}

interface Accumulator {
  calls: CallUsage[]
}

const als = new AsyncLocalStorage<Accumulator>()

// Per-model pricing in USD per 1,000,000 tokens. Matched by substring so the
// dated model ids (e.g. claude-haiku-4-5-20251001) resolve to the right tier.
// Historical query cost is locked in at write time, so price changes only
// affect new queries — which correctly mirrors actual billed amounts.
interface Price { input: number; output: number; cacheRead: number; cacheWrite: number }

const PRICES: Array<{ match: string; price: Price }> = [
  { match: 'opus',   price: { input: 15,   output: 75,  cacheRead: 1.5,  cacheWrite: 18.75 } },
  { match: 'sonnet', price: { input: 3,    output: 15,  cacheRead: 0.3,  cacheWrite: 3.75  } },
  { match: 'haiku',  price: { input: 0.8,  output: 4,   cacheRead: 0.08, cacheWrite: 1     } },
]
const DEFAULT_PRICE: Price = { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }

function priceFor(model: string): Price {
  const m = model.toLowerCase()
  return PRICES.find(p => m.includes(p.match))?.price ?? DEFAULT_PRICE
}

/** Run `fn` inside a fresh token-tracking scope. */
export function withTokenTracking<T>(fn: () => Promise<T>): Promise<T> {
  return als.run({ calls: [] }, fn)
}

// Feature attribution for AI usage (e.g. 'chat', 'policy_format', 'audit_recs'). Set at the
// operation entry point; read when each call is persisted. Defaults to 'other' when unset.
const featureAls = new AsyncLocalStorage<string>()
export function withAiFeature<T>(feature: string, fn: () => Promise<T>): Promise<T> {
  return featureAls.run(feature, fn)
}

// Persist one call's real usage + cost to the durable ai_usage_events log — the single source of
// truth for measured AI spend (platform + per-client). Tenant is auto-attributed from the request
// context; fire-and-forget so it never slows or fails an AI call.
function persistAiUsage(model: string, usage: {
  input_tokens?: number | null; output_tokens?: number | null
  cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null
}): void {
  const input = usage.input_tokens ?? 0
  const output = usage.output_tokens ?? 0
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheCreate = usage.cache_creation_input_tokens ?? 0
  if (!input && !output && !cacheRead && !cacheCreate) return
  const p = priceFor(model)
  const cost = (input * p.input + output * p.output + cacheRead * p.cacheRead + cacheCreate * p.cacheWrite) / 1_000_000
  ;(prisma as any).aiUsageEvent.create({
    data: {
      tenant_id: getTenantIdOrNull(),
      feature: featureAls.getStore() ?? 'other',
      model,
      input_tokens: input, output_tokens: output,
      cache_read_tokens: cacheRead, cache_creation_tokens: cacheCreate,
      cost_usd: cost,
    },
  }).catch(() => { /* never let cost logging break an AI call */ })
}

/** Record one LLM call's usage: persist it durably AND add it to the active query scope (if any). */
export function recordUsage(model: string, usage: {
  input_tokens?:          number | null
  output_tokens?:         number | null
  cache_read_input_tokens?:     number | null
  cache_creation_input_tokens?: number | null
} | null | undefined): void {
  if (usage) persistAiUsage(model, usage)
  const store = als.getStore()
  if (!store || !usage) return
  store.calls.push({
    model,
    input_tokens:          usage.input_tokens ?? 0,
    output_tokens:         usage.output_tokens ?? 0,
    cache_read_tokens:     usage.cache_read_input_tokens ?? 0,
    cache_creation_tokens: usage.cache_creation_input_tokens ?? 0,
  })
}

export interface TrackedTotals {
  promptTokens:        number   // total input (incl. cache) across all calls
  completionTokens:    number   // total output across all calls
  cacheReadTokens:     number
  cacheCreationTokens: number
  modelUsed:           string | null   // primary (most expensive) model this query
  aiCostUsd:           number          // real cost summed across every call
}

/** Read the accumulated totals + computed real cost for the active scope. */
export function getTrackedTotals(): TrackedTotals | null {
  const store = als.getStore()
  if (!store || store.calls.length === 0) return null

  let promptTokens = 0, completionTokens = 0, cacheReadTokens = 0, cacheCreationTokens = 0, aiCostUsd = 0
  let primary: { model: string; cost: number } | null = null

  for (const c of store.calls) {
    const p = priceFor(c.model)
    // Anthropic reports input_tokens as the uncached portion; cache read/write
    // are billed separately at their own rates.
    const cost =
      (c.input_tokens          * p.input     +
       c.output_tokens         * p.output    +
       c.cache_read_tokens     * p.cacheRead +
       c.cache_creation_tokens * p.cacheWrite) / 1_000_000

    promptTokens        += c.input_tokens + c.cache_read_tokens + c.cache_creation_tokens
    completionTokens    += c.output_tokens
    cacheReadTokens     += c.cache_read_tokens
    cacheCreationTokens += c.cache_creation_tokens
    aiCostUsd           += cost

    if (!primary || cost > primary.cost) primary = { model: c.model, cost }
  }

  return {
    promptTokens,
    completionTokens,
    cacheReadTokens,
    cacheCreationTokens,
    modelUsed: primary?.model ?? null,
    aiCostUsd: Math.round(aiCostUsd * 1_000_000) / 1_000_000,
  }
}
