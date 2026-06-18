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
import { withTokenTracking, getTrackedTotals } from '../../lib/token-usage'
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

// System prompt used when staff chat about training topics
const TRAINING_SYSTEM_PROMPT = `You are a training support assistant for a UK care home. You help staff understand their mandatory and specialist training topics so they are well-prepared and knowledgeable in their work.

Your role is to be educational, clear, and encouraging. Staff may ask questions to deepen their understanding of their training topics — explain concepts thoroughly, connect them to real care home scenarios, and highlight why each topic matters for resident safety and wellbeing.

Draw on the provided [TRAINING KNOWLEDGE BASE] and [YOUR ORGANISATION'S KNOWLEDGE] to give accurate, contextualised answers. If the question touches a topic not explicitly in the materials, use your knowledge of UK care sector best practice.

Format responses as clean, readable HTML using <p>, <ul>, <li>, <strong> tags. Keep answers practical and accessible.

Address the [STAFF MEMBER NAME] by name if provided.

At the end of your response, append this comment (do not display it to the user):
<!--FOLLOWUP:["follow-up question 1","follow-up question 2","follow-up question 3"]-->`

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
  responseStyle?:      'standard' | 'concise'  // tenant preference; WhatsApp/voice always concise
  policyId?:           string          // caller may pre-specify a policy
  priorCategory?:      DocumentCategory // from prior email thread turn
  selectedCategory?:   DocumentCategory // explicitly chosen by user before chat starts
  chatSessionId?:      string           // groups all turns of one chat into one session
  // §8.2 — prior email thread turns passed to Claude for multi-turn continuity
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  // Staff explicitly chose a reply language in the portal — overrides detection
  forcedLanguage?:      { code: string; name: string }
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
  queryId:            string | null
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

// Returns the verbosity instruction for a given channel + tenant preference.
// WhatsApp and voice are always concise regardless of the tenant setting.
export function resolveVerbosity(
  channel:       QueryChannel,
  responseStyle: 'standard' | 'concise' = 'standard',
): 'standard' | 'concise' {
  if (channel === 'whatsapp' || channel === 'voice') return 'concise'
  return responseStyle
}

const VERBOSITY_INSTRUCTIONS: Record<'standard' | 'concise', string> = {
  standard: 'Provide a thorough, fully referenced response. Include a clear policy summary, all key points with bullet points, relevant regulatory context, and a brief practical summary paragraph.',
  concise:  'Provide a brief, focused response. Give 2-3 key points only — no lengthy prose, no regulatory deep-dives. Lead with the most actionable guidance and cite the policy name. Keep the total response under 200 words.',
}

function buildContextBlock(
  chunks:        RetrievedChunk[],
  regulations:   RegulationContext[],
  knowledge:     KnowledgeEntry[],
  policyMap:     Map<string, { name: string; version: number; document_category: DocumentCategory }>,
  staffName?:    string,
  queryText?:    string,
  verbosity?:    'standard' | 'concise',
): string {
  const parts: string[] = []

  if (queryText) {
    parts.push(`[QUERY]\n${queryText}`)
  }
  if (staffName) {
    parts.push(`[STAFF MEMBER NAME]\n${staffName}`)
  }
  if (verbosity) {
    parts.push(`[RESPONSE STYLE]\n${VERBOSITY_INSTRUCTIONS[verbosity]}`)
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

export function runQueryPipeline(input: QueryInput): Promise<QueryOutput> {
  // Open a per-request LLM token-tracking scope; saveQueryRecord reads the
  // accumulated tokens + real cost at the end (§10.6).
  return withTokenTracking(() => runQueryPipelineInner(input))
}

async function runQueryPipelineInner(input: QueryInput): Promise<QueryOutput> {
  const start = Date.now()
  const { queryText, tenantId, userId, staffName, channel, responseStyle, policyId, priorCategory, selectedCategory, chatSessionId, conversationHistory, forcedLanguage } = input
  const verbosity = resolveVerbosity(channel, responseStyle)

  // 1. Detect language (§5.1)
  const langDetection  = await detectLanguage(queryText)
  let   langResolution = resolveLanguagePattern(langDetection, queryText)

  // The staff member explicitly picked a reply language in the portal — that
  // overrides auto-detection. English → reply in English; anything else →
  // force the reply into that language (Pattern 2).
  if (forcedLanguage?.code) {
    ;(langDetection as any).code = forcedLanguage.code
    langResolution = forcedLanguage.code === 'eng'
      ? { pattern: 1 }
      : { pattern: 2, requestedLanguage: forcedLanguage.name }
  }

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

        const savedQueryId = await saveQueryRecord({
          tenantId, userId, channel, queryText,
          responseHtml,
          intentType: 'full_policy',
          documentCategoryQueried: policyRow.document_category as DocumentCategory,
          policyIdsCited: [policyRow.id],
          noMatch: false,
          languageDetected: langDetection.code,
          responseTimeMs: Date.now() - start,
          chatSessionId,
        })

        return {
          responseHtml,
          intentType:         'full_policy',
          citations:          [{ policy_id: policyRow.id, policy_name: policyRow.name, version: policyRow.version, document_category: policyRow.document_category }],
          noMatch:            false,
          languageDetected:   langDetection.code,
          responseTimeMs:     Date.now() - start,
          suggestedQuestions: [],
          queryId:            savedQueryId,
        }
      }
    }
  }

  // ─── Training module chat path ─────────────────────────────────────────────
  // Staff ask questions about training topics; context comes from training seeds
  // stored in Postgres (not Pinecone). All interactions are tracked as QueryRecords.

  if (selectedCategory === 'training_module') {
    // Fetch all active seeds + module index in parallel with query embedding
    const [seeds, modules, queryEmbeddingForKB] = await Promise.all([
      (prisma as any).trainingSeed.findMany({
        where:   { is_active: true },
        select:  { training_type: true, also_known_as: true, summary: true, care_context: true, care_company_interaction: true, practical_meaning: true },
        orderBy: { training_type: 'asc' },
      }),
      (prisma as any).trainingModule.findMany({
        // Canonical catalog (shared templates) — descriptive context only, no enrollment join.
        where:   { tenant_id: null, is_active: true },
        select:  { name: true, description: true, category: true },
        orderBy: { sort_order: 'asc' },
      }),
      embedText(queryText),
    ])

    // Identify directly relevant seeds via keyword match on training_type / also_known_as
    const queryLower  = queryText.toLowerCase()
    const queryWords  = queryLower.split(/\s+/).filter(w => w.length > 3)
    const relevantSeeds = (seeds as any[]).filter((s: any) => {
      const name    = (s.training_type as string).toLowerCase()
      const aliases = ((s.also_known_as ?? []) as string[]).map((a: string) => a.toLowerCase())
      return queryWords.some(w => name.includes(w)) || aliases.some(a => queryWords.some(w => a.includes(w)))
    })
    // Use matched seeds in full; fall back to all seeds if nothing matched
    const seedsToUse: any[] = relevantSeeds.length > 0 ? relevantSeeds : seeds as any[]

    // Build context
    const parts: string[] = []
    if (queryText)  parts.push(`[STAFF QUESTION]\n${queryText}`)
    if (staffName)  parts.push(`[STAFF MEMBER NAME]\n${staffName}`)

    if ((modules as any[]).length > 0) {
      parts.push(
        '[CARE TRAINING MODULES]\n' +
        (modules as any[]).map((m: any) => `• ${m.name} (${m.category}): ${m.description}`).join('\n'),
      )
    }

    if (seedsToUse.length > 0) {
      parts.push('[TRAINING KNOWLEDGE BASE]')
      for (const seed of seedsToUse) {
        const lines = [
          `--- ${seed.training_type} ---`,
          seed.summary              && `Overview: ${seed.summary}`,
          seed.care_context         && `In a care home context: ${seed.care_context}`,
          seed.care_company_interaction && `Organisation responsibilities: ${seed.care_company_interaction}`,
          seed.practical_meaning    && `What staff need to know in practice: ${seed.practical_meaning}`,
        ].filter(Boolean) as string[]
        parts.push(lines.join('\n'))
      }
    }

    // Also include approved tenant knowledge entries (vector search)
    try {
      const kbResults = await queryKnowledgeVectors(tenantId, queryEmbeddingForKB, TOP_K_KNOWLEDGE * 2)
      const candidates = kbResults.filter(r => r.score >= KNOWLEDGE_MIN_SCORE)
      if (candidates.length > 0) {
        const entryIds = candidates.map(r => r.metadata.entry_id).filter(Boolean)
        const approvedRows = await (prisma as any).knowledgeEntry.findMany({
          where:  { id: { in: entryIds }, tenant_id: tenantId, approved: true },
          select: { id: true },
        })
        const approvedSet = new Set(approvedRows.map((r: any) => r.id as string))
        const knowledgeEntries = candidates
          .filter(r => approvedSet.has(r.metadata.entry_id))
          .slice(0, TOP_K_KNOWLEDGE)
        if (knowledgeEntries.length > 0) {
          parts.push(
            "[YOUR ORGANISATION'S KNOWLEDGE]\n" +
            knowledgeEntries.map(r => `Q: ${r.metadata.question}\nA: ${r.metadata.answer}`).join('\n\n'),
          )
        }
      }
    } catch {
      // Non-fatal — knowledge namespace may not exist yet
    }

    const context      = parts.join('\n\n')
    const systemPrompt = appendLanguageInstruction(
      await getAiPrompt('training_chat', TRAINING_SYSTEM_PROMPT),
      langResolution.pattern,
      langResolution.requestedLanguage,
    )

    let responseHtml: string
    if (conversationHistory && conversationHistory.length > 0) {
      const messages = [
        ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: context },
      ]
      responseHtml = await callClaudeWithHistory(systemPrompt, messages, { maxTokens: 4096, temperature: 0.3 })
    } else {
      responseHtml = await callClaude(systemPrompt, context, { maxTokens: 4096, temperature: 0.3 })
    }

    const { html: cleanedHtml, suggestions } = extractSuggestions(responseHtml)

    const savedQueryId = await saveQueryRecord({
      tenantId, userId, channel, queryText,
      responseHtml:            cleanedHtml,
      intentType:              'summary',
      documentCategoryQueried: 'training_module',
      policyIdsCited:          [],
      noMatch:                 false,
      languageDetected:        langDetection.code,
      responseTimeMs:          Date.now() - start,
      chatSessionId,
    })

    return {
      responseHtml:       cleanedHtml,
      intentType:         'summary',
      citations:          [],
      noMatch:            false,
      languageDetected:   langDetection.code,
      responseTimeMs:     Date.now() - start,
      suggestedQuestions: suggestions,
      queryId:            savedQueryId,
    }
  }

  // ─── CQC compliance chat path ──────────────────────────────────────────────
  // Multi-source retrieval: CQC uploaded report + internal policies + handbook
  // + CQC framework seeds from DB. No single-category restriction.

  if (selectedCategory === 'cqc_report') {
    const queryEmbedding = await embedText(queryText)

    // Parallel: search all 3 Pinecone sources + load CQC seeds + knowledge entries
    const queryLower = queryText.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter((w: string) => w.length > 3)

    const [cqcChunks, policyChunks, handbookChunks, allSeeds] = await Promise.all([
      retrievePolicyChunks(tenantId, queryEmbedding, { document_category: 'cqc_report' }),
      retrievePolicyChunks(tenantId, queryEmbedding, { document_category: 'internal_policy' }),
      retrieveHandbookChunks(tenantId, queryEmbedding),
      (prisma as any).cqcSeed.findMany({
        where:   { is_active: true },
        orderBy: { framework_area: 'asc' },
      }),
    ])

    // Identify directly relevant seeds via keyword match on framework_area / also_known_as
    const relevantSeeds = (allSeeds as any[]).filter((s: any) => {
      const area    = (s.framework_area as string).toLowerCase()
      const aliases = ((s.also_known_as ?? []) as string[]).map((a: string) => a.toLowerCase())
      return queryWords.some((w: string) => area.includes(w)) ||
             aliases.some((a: string) => queryWords.some((w: string) => a.includes(w)))
    })
    const seedsToUse: any[] = relevantSeeds.length > 0 ? relevantSeeds : allSeeds as any[]

    // Combine and deduplicate policy chunks, keeping best score per chunk
    const chunkMap = new Map<string, RetrievedChunk>()
    for (const chunk of [...cqcChunks, ...policyChunks, ...handbookChunks]) {
      const key      = chunk.metadata.policy_id + '_' + chunk.metadata.chunk_index
      const existing = chunkMap.get(key)
      if (!existing || chunk.score > existing.score) chunkMap.set(key, chunk)
    }
    const ranked = [...chunkMap.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K_CHUNKS * 2)

    // Load policy metadata for citations
    const uniquePolicyIds = [...new Set(ranked.map(c => c.metadata.policy_id))]
    const policyMeta      = await loadPolicyMeta(tenantId, uniquePolicyIds)

    // Retrieve approved knowledge entries
    let knowledgeEntries: KnowledgeEntry[] = []
    try {
      const kbResults = await queryKnowledgeVectors(tenantId, queryEmbedding, TOP_K_KNOWLEDGE * 2)
      const candidates = kbResults.filter(r => r.score >= KNOWLEDGE_MIN_SCORE)
      if (candidates.length > 0) {
        const entryIds = candidates.map(r => r.metadata.entry_id).filter(Boolean)
        const approvedRows = await (prisma as any).knowledgeEntry.findMany({
          where:  { id: { in: entryIds }, tenant_id: tenantId, approved: true },
          select: { id: true },
        })
        const approvedSet = new Set(approvedRows.map((r: any) => r.id as string))
        knowledgeEntries = candidates
          .filter(r => approvedSet.has(r.metadata.entry_id))
          .slice(0, TOP_K_KNOWLEDGE)
          .map(r => ({ question: r.metadata.question, answer: r.metadata.answer, source_name: r.metadata.source_name }))
      }
    } catch { /* non-fatal */ }

    // Build regulation context for any explicitly cited regulations
    let regulationContext: RegulationContext[] = []
    try {
      regulationContext = await fetchRegulationContextByQueryText(queryText)
    } catch { /* non-fatal */ }

    // Build the context block with labelled sections
    const parts: string[] = []
    parts.push(`[CHANNEL]\n${channel}`)
    if (queryText)  parts.push(`[COMPLIANCE QUERY]\n${queryText}`)
    if (staffName)  parts.push(`[STAFF MEMBER]\n${staffName}`)

    // CQC report chunks
    const cqcReportChunks = ranked.filter(c => c.metadata.document_category === 'cqc_report')
    if (cqcReportChunks.length > 0) {
      parts.push('[CQC INSPECTION REPORT]')
      for (const chunk of cqcReportChunks) {
        const info  = policyMeta.get(chunk.metadata.policy_id)
        const label = info ? `${info.name} (v${info.version})` : `CQC Report`
        parts.push(`--- ${label} ---\n${chunk.metadata.chunk_text}`)
      }
    }

    // Internal policy chunks
    const internalChunks = ranked.filter(c => c.metadata.document_category === 'internal_policy')
    if (internalChunks.length > 0) {
      parts.push('[INTERNAL POLICIES & PROCEDURES]')
      for (const chunk of internalChunks) {
        const info  = policyMeta.get(chunk.metadata.policy_id)
        const label = info ? `${info.name} (v${info.version})` : 'Policy'
        parts.push(`--- ${label} ---\n${chunk.metadata.chunk_text}`)
      }
    }

    // Handbook chunks
    const hbChunks = ranked.filter(c => c.metadata.document_category === 'staff_handbook')
    if (hbChunks.length > 0) {
      parts.push('[STAFF HANDBOOK]')
      for (const chunk of hbChunks) {
        const info  = policyMeta.get(chunk.metadata.policy_id)
        const label = info ? info.name : 'Handbook'
        parts.push(`--- ${label} ---\n${chunk.metadata.chunk_text}`)
      }
    }

    // CQC framework seeds
    if (seedsToUse.length > 0) {
      parts.push('[CQC REGULATORY FRAMEWORK]')
      for (const seed of seedsToUse) {
        const lines = [
          `--- ${seed.framework_area} ---`,
          seed.description       && `Overview: ${seed.description}`,
          seed.inspector_focus   && `What inspectors look for: ${seed.inspector_focus}`,
          seed.evidence_expected && `Expected evidence: ${seed.evidence_expected}`,
          seed.rating_indicators && `Good/Outstanding indicators: ${seed.rating_indicators}`,
        ].filter(Boolean) as string[]
        parts.push(lines.join('\n'))
      }
    }

    // Knowledge base entries
    if (knowledgeEntries.length > 0) {
      parts.push('[KNOWLEDGE BASE]')
      for (const k of knowledgeEntries) {
        parts.push(`Q: ${k.question}\nA: ${k.answer}`)
      }
    }

    // Regulatory context
    if (regulationContext.length > 0) {
      parts.push('[RELATED REGULATIONS]')
      for (const reg of regulationContext) {
        parts.push(`--- ${reg.official_name} ---\n${reg.summary}\nCare context: ${reg.care_home_context}`)
      }
    }

    const context = parts.join('\n\n')

    const DEFAULT_CQC_PROMPT = `You are a specialist CQC Compliance Director assistant for UK adult social care providers. You help care home managers and owners prepare for CQC inspections, challenge draft inspection reports, and strengthen their compliance posture.

You have access to the provider's uploaded CQC inspection report, their internal policies and procedures, and the CQC regulatory framework knowledge base.

Your role is to:
1. Cross-reference the provider's policies and practices against CQC framework requirements
2. Identify compliance gaps and recommend targeted improvements
3. Help managers draft factual accuracy challenge responses, citing specific policy sections and evidence
4. Advise on cultural and operational changes aligned with current CQC inspection methodology (Better Regulation, Better Care)

Always cite specific documents, policy sections, and CQC standards when making recommendations. Be precise, professional, and actionable.

Format responses as clean, readable HTML using <p>, <ul>, <li>, <strong> tags.

At the end of your response, append this comment (do not display it):
<!--FOLLOWUP:["follow-up question 1","follow-up question 2","follow-up question 3"]-->`

    const systemPrompt = appendLanguageInstruction(
      await getAiPrompt('cqc_query', DEFAULT_CQC_PROMPT),
      langResolution.pattern,
      langResolution.requestedLanguage,
    )

    let responseHtml: string
    if (conversationHistory && conversationHistory.length > 0) {
      const messages = [
        ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: context },
      ]
      responseHtml = await callClaudeWithHistory(systemPrompt, messages, { maxTokens: 4096, temperature: 0.3 })
    } else {
      responseHtml = await callClaude(systemPrompt, context, { maxTokens: 4096, temperature: 0.3 })
    }

    const { html: cleanedHtml, suggestions } = extractSuggestions(responseHtml)

    const citations: Citation[] = uniquePolicyIds
      .map(id => {
        const meta = policyMeta.get(id)
        if (!meta) return null
        return { policy_id: id, policy_name: meta.name, version: meta.version, document_category: meta.document_category }
      })
      .filter((c): c is Citation => c !== null)

    const savedQueryId = await saveQueryRecord({
      tenantId, userId, channel, queryText,
      responseHtml:            cleanedHtml,
      intentType:              'summary',
      documentCategoryQueried: 'cqc_report',
      policyIdsCited:          citations.map(c => c.policy_id),
      noMatch:                 ranked.length === 0,
      languageDetected:        langDetection.code,
      responseTimeMs:          Date.now() - start,
      chatSessionId,
    })

    return {
      responseHtml:       cleanedHtml,
      intentType:         'summary',
      citations,
      noMatch:            ranked.length === 0,
      languageDetected:   langDetection.code,
      responseTimeMs:     Date.now() - start,
      suggestedQuestions: suggestions,
      queryId:            savedQueryId,
    }
  }

  // ─── Audit report chat path ───────────────────────────────────────────────
  // Context comes from AuditRun.ai_recommendations stored in Postgres — no
  // Pinecone search needed. Fetches up to 6 most recent completed runs.

  if (selectedCategory === 'audit_report') {
    const auditRuns = await (prisma as any).auditRun.findMany({
      where: {
        tenant_id:          tenantId,
        status:             'completed',
        ai_recommendations: { not: null },
      },
      select: {
        id:                 true,
        audit_month:        true,
        ai_recommendations: true,
        template:           { select: { name: true } },
      },
      orderBy: { audit_month: 'desc' },
      take: 6,
    })

    const DEFAULT_AUDIT_PROMPT = `You are an audit analysis assistant for a UK adult social care provider. You help care home managers and staff understand the findings and recommendations from their completed monthly audits.

Your role is to:
1. Answer questions about specific audit findings, compliance gaps, and recommended actions
2. Identify recurring themes or patterns across multiple audits
3. Explain what the AI-generated recommendations mean in practice and how to implement them
4. Connect audit findings to CQC Key Lines of Enquiry (Safe, Effective, Caring, Responsive, Well-led)
5. Help prioritise actions based on risk and CQC significance

Draw on the provided [COMPLETED AUDIT REPORTS] to give accurate, evidence-based answers. Reference specific audit types and months where relevant.

Format responses as clean, readable HTML using <p>, <ul>, <li>, <strong> tags. Keep answers practical and actionable.

At the end of your response, append this comment (do not display it to the user):
<!--FOLLOWUP:["follow-up question 1","follow-up question 2","follow-up question 3"]-->`

    const parts: string[] = []
    if (queryText) parts.push(`[STAFF QUESTION]\n${queryText}`)
    if (staffName) parts.push(`[STAFF MEMBER NAME]\n${staffName}`)

    if ((auditRuns as any[]).length > 0) {
      parts.push('[COMPLETED AUDIT REPORTS]')
      for (const run of auditRuns as any[]) {
        const month = new Date(run.audit_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        parts.push(`--- ${run.template?.name ?? 'Audit'} — ${month} ---\n${run.ai_recommendations}`)
      }
    } else {
      parts.push('[NOTE]\nNo completed audits with AI recommendations are available yet for this organisation.')
    }

    const context = parts.join('\n\n')
    const systemPrompt = appendLanguageInstruction(
      await getAiPrompt('audit_report_chat', DEFAULT_AUDIT_PROMPT),
      langResolution.pattern,
      langResolution.requestedLanguage,
    )

    let responseHtml: string
    if (conversationHistory && conversationHistory.length > 0) {
      const messages = [
        ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: context },
      ]
      responseHtml = await callClaudeWithHistory(systemPrompt, messages, { maxTokens: 4096, temperature: 0.3 })
    } else {
      responseHtml = await callClaude(systemPrompt, context, { maxTokens: 4096, temperature: 0.3 })
    }

    const { html: cleanedHtml, suggestions } = extractSuggestions(responseHtml)

    const savedQueryId = await saveQueryRecord({
      tenantId, userId, channel, queryText,
      responseHtml:            cleanedHtml,
      intentType:              'summary',
      documentCategoryQueried: 'audit_report',
      policyIdsCited:          [],
      noMatch:                 (auditRuns as any[]).length === 0,
      languageDetected:        langDetection.code,
      responseTimeMs:          Date.now() - start,
      chatSessionId,
    })

    return {
      responseHtml:       cleanedHtml,
      intentType:         'summary',
      citations:          [],
      noMatch:            (auditRuns as any[]).length === 0,
      languageDetected:   langDetection.code,
      responseTimeMs:     Date.now() - start,
      suggestedQuestions: suggestions,
      queryId:            savedQueryId,
    }
  }

  // ─── Business Continuity chat path ───────────────────────────────────────
  // Context comes from approved KnowledgeEntry records tagged 'business_continuity'
  // stored in Postgres — no Pinecone search needed.

  if (selectedCategory === 'business_continuity') {
    const bcEntries = await (prisma as any).knowledgeEntry.findMany({
      where: {
        tenant_id:          tenantId,
        knowledge_category: 'business_continuity',
        approved:           true,
      },
      select: { question: true, answer: true, source_name: true },
      orderBy: { created_at: 'asc' },
    })

    const DEFAULT_BC_PROMPT = `You are a Business Continuity assistant for a UK adult social care provider. You help care home managers and staff understand and act on the organisation's business continuity plans, emergency procedures, and contingency arrangements.

Your role is to:
1. Answer questions about specific business continuity procedures, emergency contacts, and contingency plans
2. Help staff understand what to do in scenarios such as staff shortages, IT outages, utility failures, adverse weather, or building evacuations
3. Clarify escalation routes and responsible persons for each type of incident
4. Remind staff of key priorities (resident safety, regulatory notification, communication)

Draw on the provided [BUSINESS CONTINUITY KNOWLEDGE BASE] to give accurate, organisation-specific answers. If a scenario is not covered, advise on the general principles of maintaining safe care.

Format responses as clean, readable HTML using <p>, <ul>, <li>, <strong> tags. Keep answers clear and actionable.

At the end of your response, append this comment (do not display it to the user):
<!--FOLLOWUP:["follow-up question 1","follow-up question 2","follow-up question 3"]-->`

    const parts: string[] = []
    if (queryText) parts.push(`[STAFF QUESTION]\n${queryText}`)
    if (staffName) parts.push(`[STAFF MEMBER NAME]\n${staffName}`)

    if ((bcEntries as any[]).length > 0) {
      parts.push('[BUSINESS CONTINUITY KNOWLEDGE BASE]')
      for (const entry of bcEntries as any[]) {
        parts.push(`Q: ${entry.question}\nA: ${entry.answer}${entry.source_name && entry.source_name !== 'Manual entry' ? `\nSource: ${entry.source_name}` : ''}`)
      }
    } else {
      parts.push('[NOTE]\nNo business continuity entries have been added yet. Please add entries via the Knowledge Base page, selecting the Business Continuity category.')
    }

    const context = parts.join('\n\n')
    const systemPrompt = appendLanguageInstruction(
      await getAiPrompt('business_continuity_chat', DEFAULT_BC_PROMPT),
      langResolution.pattern,
      langResolution.requestedLanguage,
    )

    let responseHtml: string
    if (conversationHistory && conversationHistory.length > 0) {
      const messages = [
        ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: context },
      ]
      responseHtml = await callClaudeWithHistory(systemPrompt, messages, { maxTokens: 4096, temperature: 0.3 })
    } else {
      responseHtml = await callClaude(systemPrompt, context, { maxTokens: 4096, temperature: 0.3 })
    }

    const { html: cleanedHtml, suggestions } = extractSuggestions(responseHtml)

    const savedQueryId = await saveQueryRecord({
      tenantId, userId, channel, queryText,
      responseHtml:            cleanedHtml,
      intentType:              'summary',
      documentCategoryQueried: 'business_continuity',
      policyIdsCited:          [],
      noMatch:                 (bcEntries as any[]).length === 0,
      languageDetected:        langDetection.code,
      responseTimeMs:          Date.now() - start,
      chatSessionId,
    })

    return {
      responseHtml:       cleanedHtml,
      intentType:         'summary',
      citations:          [],
      noMatch:            (bcEntries as any[]).length === 0,
      languageDetected:   langDetection.code,
      responseTimeMs:     Date.now() - start,
      suggestedQuestions: suggestions,
      queryId:            savedQueryId,
    }
  }

  // ─── Summary / question path ───────────────────────────────────────────────

  // 3. Route query
  const route = routeQuery(queryText, tenantId)

  // If the user explicitly selected a category before starting chat, restrict to it
  if (selectedCategory) {
    route.tenantCategories = [selectedCategory]
  } else if (priorCategory && !route.tenantCategories.includes(priorCategory)) {
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

  // 8b. Retrieve relevant knowledge base entries (approved only)
  let knowledgeEntries: KnowledgeEntry[] = []
  try {
    const kbResults = await queryKnowledgeVectors(tenantId, queryEmbedding, TOP_K_KNOWLEDGE * 2)
    const candidates = kbResults.filter(r => r.score >= KNOWLEDGE_MIN_SCORE)

    if (candidates.length > 0) {
      // Cross-reference with Postgres to enforce approval gate
      const entryIds = candidates.map(r => r.metadata.entry_id).filter(Boolean)
      const approvedRows = await (prisma as any).knowledgeEntry.findMany({
        where:  { id: { in: entryIds }, tenant_id: tenantId, approved: true },
        select: { id: true },
      })
      const approvedSet = new Set(approvedRows.map((r: any) => r.id as string))

      knowledgeEntries = candidates
        .filter(r => approvedSet.has(r.metadata.entry_id))
        .slice(0, TOP_K_KNOWLEDGE)
        .map(r => ({
          question:    r.metadata.question,
          answer:      r.metadata.answer,
          source_name: r.metadata.source_name,
        }))
    }
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
    verbosity,
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

  const savedQueryId = await saveQueryRecord({
    tenantId, userId, channel, queryText,
    responseHtml: cleanedHtml,
    intentType: 'summary',
    documentCategoryQueried: primaryCategory,
    policyIdsCited: citations.map(c => c.policy_id),
    noMatch,
    languageDetected: langDetection.code,
    responseTimeMs: Date.now() - start,
    chatSessionId,
  })

  return {
    responseHtml:       cleanedHtml,
    intentType:         'summary',
    citations,
    noMatch,
    languageDetected:   langDetection.code,
    responseTimeMs:     Date.now() - start,
    suggestedQuestions: suggestions,
    queryId:            savedQueryId,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAiPrompt(usage: string, fallback: string): Promise<string> {
  try {
    const prompt = await (prisma as any).aiPrompt.findUnique({ where: { usage } })
    if (prompt?.content) return prompt.content
  } catch { /* fall through */ }
  return fallback
}

async function getTenantBrandingSignoff(tenantId: string): Promise<string> {
  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { branding_signoff: true },
  })
  return tenant?.branding_signoff ?? 'The CareStream Team'
}

interface SaveQueryParams {
  tenantId:                string
  userId?:                 string | null
  channel:                 QueryChannel
  queryText:               string
  responseHtml:            string
  intentType:              IntentType
  documentCategoryQueried: string | null  // built-in key or a tenant custom category
  policyIdsCited:          string[]
  noMatch:                 boolean
  languageDetected:        string
  responseTimeMs:          number
  chatSessionId?:          string | null
}

async function saveQueryRecord(params: SaveQueryParams): Promise<string | null> {
  try {
    const usage = getTrackedTotals()
    const record = await (prisma as any).queryRecord.create({
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
        chat_session_id:          params.chatSessionId ?? null,
        prompt_tokens:            usage?.promptTokens        ?? null,
        completion_tokens:        usage?.completionTokens    ?? null,
        cache_read_tokens:        usage?.cacheReadTokens     ?? null,
        cache_creation_tokens:    usage?.cacheCreationTokens ?? null,
        model_used:               usage?.modelUsed           ?? null,
        ai_cost_usd:              usage?.aiCostUsd           ?? null,
      },
    })
    return record.id as string
  } catch (e) {
    console.error('[query] Failed to save QueryRecord:', e)
    return null
  }
}
