// §4.1.2 — RAG query pipeline.
//
// Steps:
//  1.  Detect language (§5.1)
//  2.  Classify intent: full_policy or summary/question (§4.3.1)
//  3.  Route query to correct namespace(s) (§4.6.5)
//  4.  Full-policy path: fetch S3 text → Prompt B → return
//  5.  Embed query (text-embedding-3-small)
//  6.  Retrieve chunks from Pinecone (top 5–8 per namespace)
//      - Handbook: two-stage retrieval via chapter index (§4.6.3)
//  7.  Collect regulation citations from chunk metadata → fetch KB text (§6.4)
//  8.  If explicit regulation query: also query platform KB namespace
//  9.  Assemble context block
//  10. Build system prompt + call Claude (Prompt A or B)
//  11. Save QueryRecord, return response + citations

import { prisma } from '../../db/client'
import { downloadExtractedText } from '../storage/s3'
import { embedText } from './embedder'
import {
  queryVectors,
  queryKnowledgeVectors,
  getTenantNamespace,
  getHandbookChapterNamespace,
} from '../vector/pinecone'
import type { PolicyVectorMetadata } from '../vector/pinecone'
import { routeQuery } from './router'
import { detectRegulations } from './regulation-detector'
import { detectLanguage, resolveLanguagePattern } from '../language/detector'
import { callClaude, callClaudeWithHistory } from '../ai/claude'
import { buildPromptA, appendLanguageInstruction, PROMPT_B } from '../ai/prompts'
import type { DocumentCategory, IntentType, QueryChannel } from '../../types'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOP_K_CHUNKS         = 6    // chunks retrieved per namespace
const TOP_K_CHAPTERS       = 3    // chapter-index matches for two-stage retrieval
const TOP_K_KNOWLEDGE      = 3    // knowledge base entries retrieved
const MIN_SIMILARITY       = 0.5  // below this score → no_match
const CHAPTER_STAGE1_MIN   = 0.75 // below this → skip chapter filtering, flat search
const KNOWLEDGE_MIN_SCORE  = 0.75 // knowledge entries below this are excluded

// Keywords that indicate the staff member wants the full document, not a summary
const FULL_POLICY_SIGNALS = [
  'send me the full', 'send the full', 'full policy', 'complete policy',
  'entire policy', 'whole policy', 'full document', 'full text',
  'the full', 'full version', 'all of the policy', 'full copy',
  'complete document', 'entire document',
]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QueryInput {
  queryText:           string
  tenantId:            string
  userId?:             string | null
  staffName?:          string          // injected into greeting in Prompt A
  channel:             QueryChannel
  policyId?:           string          // caller may pre-specify a policy
  priorCategory?:      DocumentCategory // from prior email thread turn
  // §8.2 — prior email thread turns passed to Claude for multi-turn continuity
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface Citation {
  policy_id:         string
  policy_name:       string
  version:           number
  document_category: DocumentCategory
}

export interface QueryOutput {
  responseHtml:       string
  intentType:         IntentType
  citations:          Citation[]
  noMatch:            boolean
  languageDetected:   string
  responseTimeMs:     number
  suggestedQuestions: string[]
}

// ─── Full-policy text helpers ─────────────────────────────────────────────────

// Strip the document letterhead (care home name, address, contact info) that
// precedes the actual policy title in extracted PDFs.
function stripDocumentHeader(text: string, policyName: string): string {
  const idx = text.toLowerCase().indexOf(policyName.toLowerCase())
  if (idx <= 0) return text
  // Walk back up to 10 chars to capture any leading doc-reference number (e.g. "132 ")
  const lookback = text.slice(Math.max(0, idx - 10), idx)
  const numMatch  = lookback.match(/\d+\s*$/)
  const startIdx  = numMatch ? idx - numMatch[0].length : idx
  return text.slice(startIdx).trimStart()
}

// Claude sometimes wraps its response in ```html … ``` despite instructions.
// Strip those fences so dangerouslySetInnerHTML receives clean HTML.
function stripMarkdownFence(text: string): string {
  const match = text.match(/^```(?:html)?\s*([\s\S]*?)\s*```\s*$/s)
  return match ? match[1].trim() : text
}

// Extract the <!--FOLLOWUP:[...]-->  block Claude appends to Prompt A responses.
// Returns the cleaned HTML and the parsed question strings (up to 3).
function extractSuggestions(html: string): { html: string; suggestions: string[] } {
  const match = html.match(/<!--FOLLOWUP:(\[[\s\S]*?\])-->/)
  if (!match) return { html, suggestions: [] }
  let suggestions: string[] = []
  try {
    const parsed = JSON.parse(match[1])
    if (Array.isArray(parsed)) suggestions = parsed.slice(0, 3).map(String)
  } catch { /* malformed JSON — skip */ }
  return { html: html.replace(/<!--FOLLOWUP:[\s\S]*?-->/, '').trimEnd(), suggestions }
}

// ─── Intent classification ────────────────────────────────────────────────────

function classifyIntent(queryText: string): 'full_policy' | 'summary' {
  const lower = queryText.toLowerCase()
  return FULL_POLICY_SIGNALS.some(s => lower.includes(s)) ? 'full_policy' : 'summary'
}

// ─── Policy name extraction (for full-policy requests without a policyId) ────

function extractPolicyNameHint(queryText: string): string {
  let hint = queryText
  for (const sig of FULL_POLICY_SIGNALS) {
    hint = hint.replace(new RegExp(sig, 'gi'), '').trim()
  }
  // Strip "the", "our", "your", "a/an" from start
  hint = hint.replace(/^(the|our|your|a|an)\s+/i, '').trim()
  return hint || queryText
}

// ─── Chunk retrieval ──────────────────────────────────────────────────────────

interface RetrievedChunk {
  score:    number
  metadata: PolicyVectorMetadata
}

// Two-stage retrieval for handbooks (§4.6.3):
//   Stage 1: query chapter index → identify most relevant chapters
//   Stage 2: query passage vectors filtered by matched chapters
async function retrieveHandbookChunks(
  tenantId:  string,
  embedding: number[],
): Promise<RetrievedChunk[]> {
  const chapterNs = getHandbookChapterNamespace(tenantId)
  const activeNs  = getTenantNamespace(tenantId)

  // Stage 1 — find best chapters
  const chapterMatches = await queryVectors(chapterNs, embedding, TOP_K_CHAPTERS)
  const bestChapters   = chapterMatches
    .filter(m => (m.score ?? 0) >= CHAPTER_STAGE1_MIN)
    .map(m => (m.metadata as any).chapter_title as string)
    .filter(Boolean)

  if (bestChapters.length > 0) {
    // Stage 2 — search within matched chapters only
    const results = await queryVectors(
      activeNs,
      embedding,
      TOP_K_CHUNKS,
      {
        document_category: 'staff_handbook',
        chapter_title: { $in: bestChapters },
      },
    )
    if (results.length > 0) return results
    // Fall through to flat search if the filtered query returned nothing
  }

  // Fallback: flat search across all handbook chunks
  return queryVectors(activeNs, embedding, TOP_K_CHUNKS, {
    document_category: 'staff_handbook',
  })
}

async function retrievePolicyChunks(
  tenantId:  string,
  embedding: number[],
  filter?:   Record<string, unknown>,
): Promise<RetrievedChunk[]> {
  return queryVectors(getTenantNamespace(tenantId), embedding, TOP_K_CHUNKS, filter)
}

// ─── Regulation knowledge-base lookup ────────────────────────────────────────

interface RegulationContext {
  official_name:        string
  summary:              string
  care_home_context:    string
  practical_meaning:    string
  source_urls:          string[]
}

async function fetchRegulationContextByKeys(keys: string[]): Promise<RegulationContext[]> {
  if (keys.length === 0) return []
  const rows = await (prisma as any).externalRegulation.findMany({
    where: { reference_key: { in: keys }, is_active: true },
    select: {
      official_name:     true,
      summary:           true,
      care_home_context: true,
      practical_meaning: true,
      source_urls:       true,
    },
  })
  return rows as RegulationContext[]
}

// Text-match the query against DB regulation terms (reference_key + official_name + also_known_as).
// Returns up to 3 best-matching regulations so Claude has focused context.
async function fetchRegulationContextByQueryText(queryText: string): Promise<RegulationContext[]> {
  const keys = await detectRegulations(queryText)
  return fetchRegulationContextByKeys(keys.slice(0, 3))
}

// ─── Context block assembly ───────────────────────────────────────────────────

interface KnowledgeEntry {
  question:    string
  answer:      string
  source_name: string
}

function buildContextBlock(
  chunks:      RetrievedChunk[],
  regulations: RegulationContext[],
  knowledge:   KnowledgeEntry[],
  policyMap:   Map<string, { name: string; version: number; document_category: DocumentCategory }>,
  staffName?:  string,
  queryText?:  string,
): string {
  const parts: string[] = []

  if (queryText) {
    parts.push(`[QUERY]\n${queryText}`)
  }
  if (staffName) {
    parts.push(`[STAFF MEMBER NAME]\n${staffName}`)
  }

  if (chunks.length > 0) {
    parts.push('[RETRIEVED POLICY CONTENT]')
    for (const chunk of chunks) {
      const m    = chunk.metadata
      const info = policyMap.get(m.policy_id)
      const label = info
        ? `Policy: ${info.name} (v${info.version})`
        : `Policy ID: ${m.policy_id}`
      parts.push(`--- ${label} ---\n${m.chunk_text}`)
    }
  }

  if (knowledge.length > 0) {
    parts.push('[KNOWLEDGE BASE]')
    for (const k of knowledge) {
      parts.push(`Q: ${k.question}\nA: ${k.answer}\nSource: ${k.source_name}`)
    }
  }

  if (regulations.length > 0) {
    parts.push('[RELATED REGULATORY GUIDANCE]')
    for (const reg of regulations) {
      const source = reg.source_urls[0] ?? ''
      parts.push(
        `--- ${reg.official_name} ---\n` +
        `Summary: ${reg.summary}\n` +
        `Care Home Context: ${reg.care_home_context}\n` +
        `Practical Meaning: ${reg.practical_meaning}` +
        (source ? `\nSource: ${source}` : ''),
      )
    }
  }

  return parts.join('\n\n')
}

// ─── Policy metadata loader ───────────────────────────────────────────────────

async function loadPolicyMeta(
  tenantId:  string,
  policyIds: string[],
): Promise<Map<string, { name: string; version: number; document_category: DocumentCategory }>> {
  if (policyIds.length === 0) return new Map()

  const rows = await (prisma as any).policy.findMany({
    where:  { id: { in: policyIds }, tenant_id: tenantId },
    select: { id: true, name: true, version: true, document_category: true },
  })

  return new Map(
    rows.map((r: any) => [
      r.id as string,
      { name: r.name as string, version: r.version as number, document_category: r.document_category as DocumentCategory },
    ]),
  )
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

export async function runQueryPipeline(input: QueryInput): Promise<QueryOutput> {
  const start = Date.now()
  const { queryText, tenantId, userId, staffName, channel, policyId, priorCategory, conversationHistory } = input

  // 1. Detect language (§5.1)
  const langDetection  = await detectLanguage(queryText)
  const langResolution = resolveLanguagePattern(langDetection, queryText)

  // §5.1 — flag low-confidence detections for review (defaulted to English)
  if (langDetection.lowConfidence) {
    console.warn(`[query] Low-confidence language detection for tenant=${tenantId} confidence=${langDetection.confidence.toFixed(2)} defaulting to English`)
  }

  // 2. Classify intent
  const rawIntent = classifyIntent(queryText)

  // ─── Full policy path ──────────────────────────────────────────────────────
  if (rawIntent === 'full_policy') {
    let targetPolicyId = policyId

    // Find policy by ID or by name if not explicitly provided
    if (!targetPolicyId) {
      const nameHint = extractPolicyNameHint(queryText)
      const match    = await (prisma as any).policy.findFirst({
        where: {
          tenant_id: tenantId,
          status:    'active',
          name:      { contains: nameHint, mode: 'insensitive' },
        },
        select: { id: true },
      })
      targetPolicyId = match?.id
    }

    // If still not resolved, scan prior user messages to find any policy name
    // mentioned in them — handles "send me the full policy" after a summary.
    if (!targetPolicyId && conversationHistory) {
      const activePolicies = await (prisma as any).policy.findMany({
        where:  { tenant_id: tenantId, status: 'active' },
        select: { id: true, name: true },
      })
      const priorUserMessages = conversationHistory.filter(m => m.role === 'user').reverse()
      outer: for (const msg of priorUserMessages) {
        const msgLower = msg.content.toLowerCase()
        for (const policy of activePolicies) {
          if (msgLower.includes((policy.name as string).toLowerCase())) {
            targetPolicyId = policy.id as string
            break outer
          }
        }
      }
    }

    if (!targetPolicyId) {
      // No matching policy found — fall through to summary pipeline so Claude
      // can give a polite "not found" response
    } else {
      const policyRow = await (prisma as any).policy.findFirst({
        where:  { id: targetPolicyId, tenant_id: tenantId, status: 'active' },
        select: { id: true, name: true, version: true, document_category: true },
      })

      if (policyRow) {
        const rawText  = await downloadExtractedText(tenantId, policyRow.id)
        const bodyText = rawText ? stripDocumentHeader(rawText, policyRow.name as string) : null
        const userMsg  = bodyText
          ? `Please format the following policy document as clean HTML:\n\n${bodyText}`
          : `The policy "${policyRow.name}" was requested but its text could not be retrieved.`

        let responseHtml = await callClaude(PROMPT_B, userMsg, {
          maxTokens:   16_384,
          temperature: 0,
        })
        responseHtml = stripMarkdownFence(responseHtml)

        await saveQueryRecord({
          tenantId, userId, channel, queryText,
          responseHtml,
          intentType: 'full_policy',
          documentCategoryQueried: policyRow.document_category as DocumentCategory,
          policyIdsCited: [policyRow.id],
          noMatch: false,
          languageDetected: langDetection.code,
          responseTimeMs: Date.now() - start,
        })

        return {
          responseHtml,
          intentType:         'full_policy',
          citations:          [{ policy_id: policyRow.id, policy_name: policyRow.name, version: policyRow.version, document_category: policyRow.document_category }],
          noMatch:            false,
          languageDetected:   langDetection.code,
          responseTimeMs:     Date.now() - start,
          suggestedQuestions: [],
        }
      }
    }
  }

  // ─── Summary / question path ───────────────────────────────────────────────

  // 3. Route query
  const route = routeQuery(queryText, tenantId)

  // If the query came from a thread with a prior category, prioritise it
  if (priorCategory && !route.tenantCategories.includes(priorCategory)) {
    route.tenantCategories.unshift(priorCategory)
  }

  // 4. Embed query
  const queryEmbedding = await embedText(queryText)

  // 5. Retrieve chunks
  const allChunks: RetrievedChunk[] = []

  for (const category of route.tenantCategories) {
    if (category === 'staff_handbook') {
      const chunks = await retrieveHandbookChunks(tenantId, queryEmbedding)
      allChunks.push(...chunks)
    } else {
      const filter: Record<string, unknown> = { document_category: category }
      if (policyId) filter.policy_id = policyId
      const chunks = await retrievePolicyChunks(tenantId, queryEmbedding, filter)
      allChunks.push(...chunks)
    }
  }

  // Deduplicate by chunk ID, keep highest score
  const chunkMap = new Map<string, RetrievedChunk>()
  for (const chunk of allChunks) {
    const existing = chunkMap.get(chunk.metadata.policy_id + '_' + chunk.metadata.chunk_index)
    if (!existing || chunk.score > existing.score) {
      chunkMap.set(chunk.metadata.policy_id + '_' + chunk.metadata.chunk_index, chunk)
    }
  }

  const ranked = [...chunkMap.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K_CHUNKS)

  const noMatch = ranked.length === 0 || ranked[0].score < MIN_SIMILARITY

  // 6. Collect regulation keys from chunk metadata
  const citedRegKeys = new Set<string>()
  for (const chunk of ranked) {
    for (const key of chunk.metadata.regulations_cited ?? []) {
      citedRegKeys.add(key)
    }
  }

  // 7. Fetch regulation context
  let regulationContext: RegulationContext[] = []
  if (citedRegKeys.size > 0) {
    regulationContext = await fetchRegulationContextByKeys([...citedRegKeys])
  }
  // If the query explicitly mentions a regulation, look it up directly in the DB
  if (route.includeRegulations) {
    const directRegs = await fetchRegulationContextByQueryText(queryText)
    for (const reg of directRegs) {
      if (!regulationContext.some(r => r.official_name === reg.official_name)) {
        regulationContext.push(reg)
      }
    }
  }

  // 8. Load policy metadata for citations
  const uniquePolicyIds = [...new Set(ranked.map(c => c.metadata.policy_id))]
  const policyMeta      = await loadPolicyMeta(tenantId, uniquePolicyIds)

  // 8b. Retrieve relevant knowledge base entries
  let knowledgeEntries: KnowledgeEntry[] = []
  try {
    const kbResults = await queryKnowledgeVectors(tenantId, queryEmbedding, TOP_K_KNOWLEDGE)
    knowledgeEntries = kbResults
      .filter(r => r.score >= KNOWLEDGE_MIN_SCORE)
      .map(r => ({
        question:    r.metadata.question,
        answer:      r.metadata.answer,
        source_name: r.metadata.source_name,
      }))
  } catch (e) {
    // Non-fatal — knowledge namespace may not exist yet for this tenant
    console.warn(`[query] Knowledge retrieval failed (non-fatal): ${String(e)}`)
  }

  // 9. Assemble context block
  const context = buildContextBlock(
    ranked,
    regulationContext,
    knowledgeEntries,
    policyMeta,
    staffName,
    queryText,
  )

  // 10. Build system prompt
  let systemPrompt = buildPromptA(
    await getTenantBrandingSignoff(tenantId),
  )
  systemPrompt = appendLanguageInstruction(
    systemPrompt,
    langResolution.pattern,
    langResolution.requestedLanguage,
  )

  // Call Claude — use multi-turn when the caller supplies conversation history (§8.2)
  let responseHtml: string
  if (conversationHistory && conversationHistory.length > 0) {
    const messages = [
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: context },
    ]
    responseHtml = await callClaudeWithHistory(systemPrompt, messages, {
      maxTokens:   4096,
      temperature: 0.3,
    })
  } else {
    responseHtml = await callClaude(systemPrompt, context, {
      maxTokens:   4096,
      temperature: 0.3,
    })
  }

  // 11. Extract suggested questions, build citations, and save record
  const { html: cleanedHtml, suggestions } = extractSuggestions(responseHtml)

  const citations: Citation[] = uniquePolicyIds
    .map(id => {
      const meta = policyMeta.get(id)
      if (!meta) return null
      return { policy_id: id, policy_name: meta.name, version: meta.version, document_category: meta.document_category }
    })
    .filter((c): c is Citation => c !== null)

  const primaryCategory = ranked[0]?.metadata.document_category ?? route.tenantCategories[0] ?? null

  await saveQueryRecord({
    tenantId, userId, channel, queryText,
    responseHtml: cleanedHtml,
    intentType: 'summary',
    documentCategoryQueried: primaryCategory,
    policyIdsCited: citations.map(c => c.policy_id),
    noMatch,
    languageDetected: langDetection.code,
    responseTimeMs: Date.now() - start,
  })

  return {
    responseHtml:       cleanedHtml,
    intentType:         'summary',
    citations,
    noMatch,
    languageDetected:   langDetection.code,
    responseTimeMs:     Date.now() - start,
    suggestedQuestions: suggestions,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTenantBrandingSignoff(tenantId: string): Promise<string> {
  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { branding_signoff: true },
  })
  return tenant?.branding_signoff ?? 'The CareStreamAI Team'
}

interface SaveQueryParams {
  tenantId:                string
  userId?:                 string | null
  channel:                 QueryChannel
  queryText:               string
  responseHtml:            string
  intentType:              IntentType
  documentCategoryQueried: DocumentCategory | null
  policyIdsCited:          string[]
  noMatch:                 boolean
  languageDetected:        string
  responseTimeMs:          number
}

async function saveQueryRecord(params: SaveQueryParams): Promise<void> {
  try {
    await (prisma as any).queryRecord.create({
      data: {
        tenant_id:                params.tenantId,
        user_id:                  params.userId ?? null,
        channel:                  params.channel,
        query_text:               params.queryText,
        response_text:            params.responseHtml,
        intent_type:              params.intentType,
        document_category_queried: params.documentCategoryQueried,
        policy_ids_cited:         params.policyIdsCited,
        no_match:                 params.noMatch,
        language_detected:        params.languageDetected,
        response_time_ms:         params.responseTimeMs,
      },
    })
  } catch (e) {
    // Non-fatal — query was served; logging failure must not break the response
    console.error('[query] Failed to save QueryRecord:', e)
  }
}
