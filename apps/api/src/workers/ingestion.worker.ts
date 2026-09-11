import { Worker } from 'bullmq'
import { getRedisConnection, type IngestionJobData } from './queue'
import { ingestDocument } from '../services/rag/ingestion'

// §4.1.1 / §13.1 — Runs as a separate process on Railway alongside the API.
// Start with: npx tsx src/workers/ingestion.worker.ts
//
// getRedisConnection() is async. This file passed the PROMISE straight to BullMQ as
// its connection, which tsc has been reporting and which would have failed the moment
// anyone actually started the worker: BullMQ wants a connection, not a promise of one.
// It never bit because production has no REDIS_URL, so enqueueIngestion runs inline in
// the request instead (see USE_INLINE in queue.ts) and this process is never started.
//
// Wrapped in an async main so the connection is awaited before the Worker is built.

async function main(): Promise<void> {
  const connection = await getRedisConnection()

  const worker = new Worker<IngestionJobData>(
    'document-ingestion',
    async (job) => {
      await ingestDocument(job.data)
    },
    {
      connection,
      concurrency: 3,
    },
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
}

// A worker that cannot connect must exit loudly rather than sit there looking alive.
main().catch((e) => {
  console.error('[worker] Failed to start:', e)
  process.exit(1)
})
