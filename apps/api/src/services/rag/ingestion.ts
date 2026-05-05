// §4.1.1 — Document ingestion pipeline
// 1. Fetch from S3
// 2. Extract text: pdf-parse (PDF) | mammoth (DOCX)
// 3. Strip headers/footers
// 4. For staff_handbook: detect TOC, build chapter map (§4.6.2)
// 5. Chunk: ~500 tokens, 10% overlap, chapter-boundary-aware for handbooks
// 6. Embed each chunk via text-embedding-3-small
// 7. Scan chunks for regulation references → store as metadata (§6.4)
// 8. Upsert vectors to tenant Pinecone namespace
// 9. Update policy record status to 'active' in PostgreSQL
export async function ingestDocument(_jobData: unknown): Promise<void> {
  throw new Error('Not implemented')
}
