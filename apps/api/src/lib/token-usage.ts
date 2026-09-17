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

// Verified against https://platform.claude.com/docs/en/about-claude/pricing on 2026-09-09.
// Order matters — the first match wins, so specific ids precede their family prefix.
// (Fixed 2026-09-09: 'haiku' was priced at 0.8/4, which is Haiku *3.5*. We run
// Haiku 4.5 at 1/5, so every Haiku cost before this date was ~20% understated.
// The bare 'opus' row was likewise the retired Opus 4.1 price, 3x the current one.)
const PRICES: Array<{ match: string; price: Price }> = [
  { match: 'claude-opus-4-1',   price: { input: 15,  output: 75, cacheRead: 1.5,  cacheWrite: 18.75 } },
  { match: 'claude-opus-5',     price: { input: 5,   output: 25, cacheRead: 0.5,  cacheWrite: 6.25  } },
  { match: 'claude-sonnet-5',   price: { input: 2,   output: 10, cacheRead: 0.2,  cacheWrite: 2.5   } },
  { match: 'claude-haiku-4-5',  price: { input: 1,   output: 5,  cacheRead: 0.1,  cacheWrite: 1.25  } },
  { match: 'claude-3-5-haiku',  price: { input: 0.8, output: 4,  cacheRead: 0.08, cacheWrite: 1     } },
  { match: 'opus',   price: { input: 5,    output: 25,  cacheRead: 0.5,  cacheWrite: 6.25  } },
  { match: 'sonnet', price: { input: 3,    output: 15,  cacheRead: 0.3,  cacheWrite: 3.75  } },
  { match: 'haiku',  price: { input: 1,    output: 5,   cacheRead: 0.1,  cacheWrite: 1.25  } },
  // OpenAI models used for indexing (embeddings). Priced per input token; no output/cache.
  { match: 'text-embedding-3-large', price: { input: 0.13, output: 0, cacheRead: 0, cacheWrite: 0 } },
  { match: 'text-embedding-3-small', price: { input: 0.02, output: 0, cacheRead: 0, cacheWrite: 0 } },
  { match: 'text-embedding',         price: { input: 0.02, output: 0, cacheRead: 0, cacheWrite: 0 } },
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

// Mirror each call to the cross-app AI Spend dashboard, which aggregates every product's
// LLM cost in one place. Entirely optional: with AI_SPEND_URL / AI_SPEND_TOKEN unset this
// is a no-op, and a failure here can never surface to the caller.
function forwardToAiSpend(model: string, cost: number, tokens: {
  input: number; output: number; cacheRead: number; cacheCreate: number
}): void {
  const url = process.env.AI_SPEND_URL
  const token = process.env.AI_SPEND_TOKEN
  if (!url || !token) return
  try {
    void fetch(`${url.replace(/\/$/, '')}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-ingest-token': token },
      body: JSON.stringify({
        app: 'carestream',
        feature: featureAls.getStore() ?? 'other',
        provider: model.startsWith('claude') ? 'anthropic' : 'openai',
        model,
        input_tokens: tokens.input,
        output_tokens: tokens.output,
        cache_read_tokens: tokens.cacheRead,
        cache_creation_tokens: tokens.cacheCreate,
        cost_usd: cost,
        tenant_ref: getTenantIdOrNull(),
      }),
    }).catch(() => {})
  } catch { /* never let cost reporting break an AI call */ }
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
  forwardToAiSpend(model, cost, {
    input, output, cacheRead, cacheCreate,
  })
}

// Persist a row with an explicit, already-computed USD cost. For models we price per-image or
// per-minute rather than per-token (image generation, speech-to-text), where token counts don't
// map to a Claude-style price. Tenant + feature are auto-attributed like recordUsage.
export function recordCostUsd(model: string, costUsd: number, tokens?: { input_tokens?: number; output_tokens?: number }): void {
  if (!(costUsd > 0)) return
  ;(prisma as any).aiUsageEvent.create({
    data: {
      tenant_id: getTenantIdOrNull(),
      feature: featureAls.getStore() ?? 'other',
      model,
      input_tokens: tokens?.input_tokens ?? 0,
      output_tokens: tokens?.output_tokens ?? 0,
      cache_read_tokens: 0, cache_creation_tokens: 0,
      cost_usd: costUsd,
    },
  }).catch(() => { /* never let cost logging break an AI call */ })
  forwardToAiSpend(model, costUsd, {
    input: tokens?.input_tokens ?? 0,
    output: tokens?.output_tokens ?? 0,
    cacheRead: 0,
    cacheCreate: 0,
  })
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
