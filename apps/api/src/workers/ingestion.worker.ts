import { Worker } from 'bullmq'
import { redisConnection } from './queue'
import { ingestDocument } from '../services/rag/ingestion'
import type { IngestionJobData } from './queue'

// §4.1.1 / §13.1 — Runs as a separate process on Railway alongside the API.
// Start with: npx tsx src/workers/ingestion.worker.ts

const worker = new Worker<IngestionJobData>(
  'document-ingestion',
  async (job) => {
    await ingestDocument(job.data)
  },
  {
    connection: redisConnection,
    concurrency: 3,  // process up to 3 documents simultaneously
  }
)

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed: policy=${job.data.policy_id}`)
})

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`)
})

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err)
})

console.log('[worker] Ingestion worker started, waiting for jobs...')
