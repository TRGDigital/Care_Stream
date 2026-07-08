import { prisma } from '../../db/client'
import { downloadFile, uploadExtractedText, archiveVersionToS3 } from '../storage/s3'
import { extractText, isSupportedMimeType } from './extractor'
import { stripHeadersFooters } from './stripper'
import { detectTOC } from './toc-detector'
import { chunkText, chunkHandbook } from './chunker'
import type { Chunk } from './chunker'
import { embedTexts } from './embedder'
import { detectRegulations } from './regulation-detector'
import {
  upsertPolicyVectors,
  activateStagedVectors,
  deletePolicyVectors,
  upsertChapterVectors,
  deleteChapterVectors,
  getTenantNamespace,
  getHandbookChapterNamespace,
} from '../vector/pinecone'
import type { PolicyVector, ChapterVector } from '../vector/pinecone'
import { writeAuditLog } from '../../lib/audit'
import { contentSignature, detectContentDuplicate } from '../../lib/policy-dedup'
import { generateKnowledgeForPolicy, dedupKnowledgeEntries } from '../knowledge/generator'
import type { IngestionJobData } from '../../workers/queue'
import type { HandbookMetadata } from '../../types'

// §4.1.1 — Full document ingestion pipeline (Steps 1–9).

export async function ingestDocument(job: IngestionJobData): Promise<void> {
  const {
    policy_id,
    tenant_id,
    s3_key,
    document_category,
    filename,
    mime_type,
    version,
    previous_version_policy_id,
  } = job

  console.log(`[ingestion] Starting: policy=${policy_id} tenant=${tenant_id} category=${document_category} USE_LOCAL=${!process.env.S3_BUCKET} S3_BUCKET=${process.env.S3_BUCKET ?? 'NOT SET'}`)

  // ── Step 1: Fetch raw file from S3 ──────────────────────────────────────────

  let buffer: Buffer
  try {
    buffer = await downloadFile(s3_key)
    console.log(`[ingestion] Downloaded ${buffer.length} bytes from: ${s3_key}`)
  } catch (e) {
    await markFailed(policy_id, `File download failed: ${String(e)}`)
    return
  }

  // ── Step 2: Extract text ─────────────────────────────────────────────────────

  if (!isSupportedMimeType(mime_type)) {
    await markFailed(policy_id, `Unsupported MIME type: ${mime_type}`)
    return
  }

  let rawText: string
  try {
    rawText = await extractText(buffer, mime_type)
  } catch (e) {
    await markFailed(policy_id, `Text extraction failed: ${String(e)}`)
    return
  }

  // ── Step 3: Strip headers / footers ──────────────────────────────────────────

  const cleanText = stripHeadersFooters(rawText)
  console.log(`[ingestion] ${cleanText.length} chars after stripping`)

  await uploadExtractedText(tenant_id, policy_id, cleanText)

  // Content fingerprint (for near-duplicate detection against other policies).
  const signature = contentSignature(cleanText)

  // ── Step 4: TOC detection (staff_handbook only) ───────────────────────────────

  const isHandbook = document_category === 'staff_handbook'
  let chapters: any[] = []

  if (isHandbook) {
    const tocResult = detectTOC(cleanText)
    chapters        = tocResult.chapters
    console.log(`[ingestion] TOC detected=${tocResult.detected} chapters=${chapters.length}`)
  }

  // ── Step 5: Chunk text ────────────────────────────────────────────────────────

  let chunks: Chunk[]
  if (isHandbook && chapters.length > 0) {
    chunks = chunkHandbook(cleanText, chapters)
  } else {
    chunks = chunkText(cleanText)
  }
  console.log(`[ingestion] ${chunks.length} chunks created`)

  // ── Step 6: Embed chunks ──────────────────────────────────────────────────────

  let embeddings: number[][]
  try {
    embeddings = await embedTexts(chunks.map(c => c.text))
  } catch (e) {
    await markFailed(policy_id, `Embedding failed: ${String(e)}`)
    return
  }
  console.log(`[ingestion] Embedded ${embeddings.length} chunks`)

  // ── Step 7: Detect regulation references in each chunk ───────────────────────

  const regulationMatches = await Promise.all(
    chunks.map(c => detectRegulations(c.text))
  )

  // ── Step 8: Build vectors and upsert to staging Pinecone namespace ────────────

  const policyVectors: PolicyVector[] = chunks.map((chunk, i) => ({
    id:     `${policy_id}_c${chunk.chunkIndex}`,
    values: embeddings[i],
    metadata: {
      policy_id,
      tenant_id,
      document_category,
      chunk_index:      chunk.chunkIndex,
      source_filename:  filename,
      chunk_text:       chunk.text,
      version,
      ...(regulationMatches[i].length > 0 ? { regulations_cited: regulationMatches[i] } : {}),
      ...(chunk.chapterTitle   ? { chapter_title:   chunk.chapterTitle   } : {}),
      ...(chunk.sectionHeading ? { section_heading: chunk.sectionHeading } : {}),
    },
  }))

  try {
    await upsertPolicyVectors(tenant_id, policy_id, policyVectors)
  } catch (e) {
    await markFailed(policy_id, `Pinecone upsert failed: ${String(e)}`)
    return
  }

  // Handbook chapter index (§4.6.2) — create one chapter-level vector per chapter.
  // Each chapter vector represents the heading + first 200 tokens of chapter content,
  // enabling Stage 1 of two-stage retrieval (§4.6.3).
  let handbookMeta: HandbookMetadata | undefined

  if (isHandbook && chapters.length > 0) {
    // Map chapter title → chunk IDs for metadata
    const chapterChunkIds = new Map<string, string[]>()
    for (const chunk of chunks) {
      if (!chunk.chapterTitle) continue
      const list = chapterChunkIds.get(chunk.chapterTitle) ?? []
      list.push(`${policy_id}_c${chunk.chunkIndex}`)
      chapterChunkIds.set(chunk.chapterTitle, list)
    }

    // Build chapter summary texts: heading + first ~800 chars of chapter content
    const CHAPTER_SUMMARY_CHARS = 800
    const chapterSummaryTexts: string[] = chapters.map(ch => {
      const body  = cleanText.slice(ch.startOffset, ch.endOffset)
      const intro = body.slice(0, CHAPTER_SUMMARY_CHARS).trim()
      return `${ch.title}\n\n${intro}`
    })

    let chapterEmbeddings: number[][]
    try {
      chapterEmbeddings = await embedTexts(chapterSummaryTexts)
    } catch (e) {
      // Non-fatal — fallback is available at query time (flat search)
      console.warn(`[ingestion] Chapter embedding failed (non-fatal): ${String(e)}`)
      chapterEmbeddings = []
    }

    if (chapterEmbeddings.length > 0) {
      const chapterVectors: ChapterVector[] = chapters.map((ch, i) => ({
        id:     `${policy_id}_ch${i}`,
        values: chapterEmbeddings[i],
        metadata: {
          policy_id,
          tenant_id,
          chapter_index: i,
          chapter_title: ch.title,
          chunk_ids:     chapterChunkIds.get(ch.title) ?? [],
        },
      }))

      try {
        await upsertChapterVectors(tenant_id, chapterVectors)
      } catch (e) {
        console.warn(`[ingestion] Chapter index upsert failed (non-fatal): ${String(e)}`)
      }
    }

    handbookMeta = {
      chapter_count:           chapters.length,
      toc_detected:            chapters.some(c => c.pageStart !== undefined),
      total_chunks:            chunks.length,
      chapter_index_namespace: getHandbookChapterNamespace(tenant_id),
      chapter_map:             chapters.map(ch => ({
        chapter_title: ch.title,
        page_start:    ch.pageStart ?? 0,
        page_end:      ch.pageEnd   ?? 0,
        chunk_ids:     chapterChunkIds.get(ch.title) ?? [],
      })),
    }
  }

  // ── Step 9: Atomic version swap + mark policy active (§10.5) ─────────────────
  //
  // Sequence:
  //   a. Move staged vectors → active namespace  (new version now queryable)
  //   b. Delete old version vectors              (if replacing an existing version)
  //   c. Mark old record superseded
  //   d. Archive old S3 file
  //   e. Mark new policy active in PostgreSQL
  //   f. Write audit log

  try {
    // a. Activate staged vectors
    await activateStagedVectors(tenant_id, policy_id)

    // b–d. Version swap: remove old vectors and mark old record superseded
    if (previous_version_policy_id) {
      try {
        await deletePolicyVectors(tenant_id, previous_version_policy_id)
        if (isHandbook) {
          await deleteChapterVectors(tenant_id, previous_version_policy_id)
        }
      } catch (e) {
        // Non-fatal — stale vectors don't break queries, just add noise
        console.warn(`[ingestion] Could not delete old vectors for ${previous_version_policy_id}: ${String(e)}`)
      }

      await (prisma as any).policy.update({
        where: { id: previous_version_policy_id },
        data:  { status: 'superseded', superseded_by: policy_id },
      })

      await archiveVersionToS3({
        sourceKey: s3_key,
        tenantId:  tenant_id,
        policyId:  previous_version_policy_id,
        version:   version - 1,
        filename,
      })

      console.log(`[ingestion] Superseded previous version: ${previous_version_policy_id}`)
    }

    // e. Mark new policy active
    const activeNamespace = getTenantNamespace(tenant_id)
    await (prisma as any).policy.update({
      where: { id: policy_id },
      data: {
        status:              'active',
        pinecone_namespace:  activeNamespace,
        content_signature:   signature as any,
        ...(handbookMeta ? { handbook_metadata: handbookMeta as any } : {}),
      },
    })

    // Near-duplicate detection: only for brand-new uploads (a version swap is an
    // intentional replacement, not a duplicate). Flags the new policy if its text
    // closely matches an existing active policy of the same type.
    if (!previous_version_policy_id) {
      try {
        await detectContentDuplicate({ tenantId: tenant_id, policyId: policy_id, documentCategory: document_category, signature })
      } catch (e) {
        console.error(`[ingestion] duplicate detection failed for ${policy_id}:`, e)
      }
    }

    // f. Audit log
    if (previous_version_policy_id) {
      await writeAuditLog({
        tenant_id,
        user_id:     null,
        event_type:  'policy_version_swap',
        entity_type: 'policy',
        entity_id:   policy_id,
        metadata: {
          previous_policy_id: previous_version_policy_id,
          new_version:        version,
          total_chunks:       chunks.length,
        },
      })
    }

    console.log(`[ingestion] Complete: policy=${policy_id} chunks=${chunks.length} status=active`)

    // Generate knowledge base entries in the background (non-fatal).
    // Fetch the stored policy name (set by the upload route, not the filename).
    ;(async () => {
      try {
        const policyRow = await (prisma as any).policy.findUnique({
          where:  { id: policy_id },
          select: { name: true },
        })
        await generateKnowledgeForPolicy(tenant_id, policy_id, policyRow?.name ?? filename)
        await dedupKnowledgeEntries(tenant_id)
      } catch (e) {
        console.warn(`[ingestion] Knowledge generation failed (non-fatal): ${String(e)}`)
      }
    })()

  } catch (e) {
    await markFailed(policy_id, `Activation failed: ${String(e)}`)
  }
}

async function markFailed(policyId: string, reason: string): Promise<void> {
  console.error(`[ingestion] Failed policy=${policyId}: ${reason}`)
  await (prisma as any).policy.update({
    where: { id: policyId },
    data:  { status: 'archived' },
  }).catch(() => {/* best-effort */})
}
