import { prisma } from '../../db/client'
import { downloadFile, uploadExtractedText, archiveVersionToS3 } from '../storage/s3'
import { extractText, stripHeadersFooters, isSupportedMimeType } from './extractor'
import type { IngestionJobData } from '../../workers/queue'

// §4.1.1 — Document ingestion pipeline
// Steps 1–3 implemented here.
// Steps 4–9 (chunking, embedding, Pinecone) implemented in the RAG pipeline section.

export async function ingestDocument(job: IngestionJobData): Promise<void> {
  const { policy_id, tenant_id, s3_key, document_category, filename, mime_type, version, previous_version_policy_id } = job

  console.log(`[ingestion] Starting: policy=${policy_id} tenant=${tenant_id} category=${document_category}`)

  // ── Step 1: Fetch raw file from S3 ──────────────────────────────────────────

  const buffer = await downloadFile(s3_key)
  console.log(`[ingestion] Downloaded from S3: ${s3_key} (${buffer.length} bytes)`)

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
  console.log(`[ingestion] Extracted ${cleanText.length} chars after stripping`)

  // Store the cleaned text in S3 — used by GET /policies/:id and full-policy RAG returns (§4.3)
  await uploadExtractedText(tenant_id, policy_id, cleanText)

  // ── Steps 4–9: Pending RAG pipeline section ───────────────────────────────
  // 4. For staff_handbook: detect TOC, build chapter map (§4.6.2)
  // 5. Chunk text (~500 tokens, 10% overlap, chapter-boundary-aware for handbooks)
  // 6. Embed each chunk via text-embedding-3-small
  // 7. Scan chunks for regulation references → store as Pinecone metadata (§6.4)
  // 8. Upsert vectors to tenant Pinecone namespace
  // 9. Atomic version swap + mark policy active (§10.5)
  //
  // Until the RAG section is complete, policy status stays 'processing'.
  // The extracted text is stored in S3 and available for admin preview.

  console.log(`[ingestion] Text extraction complete for policy=${policy_id}. Chunking/embedding pending.`)

  // ── Version swap stub (§10.5) ─────────────────────────────────────────────
  // When the full RAG pipeline is in place, this swap happens AFTER Pinecone
  // indexing completes — ensuring no gap between old and new version.
  // Storing the previous_version_policy_id here so the next section can use it.
  if (previous_version_policy_id) {
    await (prisma as any).policy.update({
      where: { id: previous_version_policy_id, tenant_id },
      data: { status: 'superseded', superseded_by: policy_id },
    })
    await archiveVersionToS3({
      sourceKey: job.s3_key,
      tenantId: tenant_id,
      policyId: previous_version_policy_id,
      version: version - 1,
      filename,
    })
    console.log(`[ingestion] Superseded previous version: ${previous_version_policy_id}`)
  }
}

async function markFailed(policyId: string, reason: string): Promise<void> {
  console.error(`[ingestion] Failed for policy=${policyId}: ${reason}`)
  await (prisma as any).policy.update({
    where: { id: policyId },
    data: { status: 'archived' },  // archived = failed, not user-facing
  }).catch(() => {/* best-effort */})
}
