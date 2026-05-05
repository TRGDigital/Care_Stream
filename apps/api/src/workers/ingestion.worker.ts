import { Worker } from 'bullmq'
import { ingestDocument } from '../services/rag/ingestion'

// §4.1.1 / §13.1 — BullMQ worker: processes queued document ingestion jobs
new Worker('document-ingestion', async (job) => {
  await ingestDocument(job.data)
}, {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) },
})
