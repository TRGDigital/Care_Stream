import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import type { DocumentCategory } from '../types'

// §13.1 — BullMQ + Redis: async document processing so large uploads never block the API

const redisConnection = new IORedis({
  host:                  process.env.REDIS_HOST ?? 'localhost',
  port:                  Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest:  null,  // required by BullMQ
})

export { redisConnection }

export interface IngestionJobData {
  policy_id:                    string
  tenant_id:                    string
  s3_key:                       string
  document_category:            DocumentCategory
  filename:                     string
  mime_type:                    string
  version:                      number
  previous_version_policy_id?:  string  // §10.5 — set when replacing an existing version
}

export const ingestionQueue = new Queue<IngestionJobData>('document-ingestion', {
  connection:       redisConnection,
  defaultJobOptions: {
    attempts:  3,
    backoff:   { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 50 },
  },
})

export async function enqueueIngestion(data: IngestionJobData): Promise<void> {
  await ingestionQueue.add('ingest', data)
}
