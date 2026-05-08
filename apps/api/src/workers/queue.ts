import { Queue } from 'bullmq'
import IORedis from 'ioredis'
import type { DocumentCategory } from '../types'

// §13.1 — BullMQ + Redis: async document processing so large uploads never block the API
// When S3_BUCKET is not set (local dev), ingestion runs inline — no Redis required.

const USE_INLINE = !process.env.S3_BUCKET

let _redis: IORedis | null = null
let _queue: Queue<IngestionJobData> | null = null

function getRedis(): IORedis {
  if (!_redis) _redis = new IORedis({
    host:                 process.env.REDIS_HOST ?? 'localhost',
    port:                 Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
  })
  return _redis
}

function getQueue(): Queue<IngestionJobData> {
  if (!_queue) _queue = new Queue<IngestionJobData>('document-ingestion', {
    connection: getRedis(),
    defaultJobOptions: {
      attempts:  3,
      backoff:   { type: 'exponential', delay: 5_000 },
      removeOnComplete: { count: 100 },
      removeOnFail:     { count: 50 },
    },
  })
  return _queue
}

export function getRedisConnection(): IORedis {
  return getRedis()
}

export interface IngestionJobData {
  policy_id:                    string
  tenant_id:                    string
  s3_key:                       string
  document_category:            DocumentCategory
  filename:                     string
  mime_type:                    string
  version:                      number
  previous_version_policy_id?:  string
}

export async function enqueueIngestion(data: IngestionJobData): Promise<void> {
  if (USE_INLINE) {
    // Local dev: no Redis — import lazily to avoid circular dep, run async after response
    import('../services/rag/ingestion').then(({ ingestDocument }) => {
      ingestDocument(data).catch(e => console.error('[inline-ingest] failed:', e))
    })
    return
  }
  await getQueue().add('ingest', data)
}
