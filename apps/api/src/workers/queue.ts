// §13.1 — BullMQ + Redis: async document processing so large uploads never block the API
// When REDIS_URL is not set (Vercel / local dev), ingestion runs inline — awaited before response.
// BullMQ and IORedis are loaded dynamically only when Redis is actually needed, so they
// never cause connection attempts or event-loop noise on Vercel.

const USE_INLINE = !process.env.REDIS_URL

export interface IngestionJobData {
  policy_id:                    string
  tenant_id:                    string
  s3_key:                       string
  document_category:            string  // built-in key or a tenant custom category
  filename:                     string
  mime_type:                    string
  version:                      number
  previous_version_policy_id?:  string
}

export async function getRedisConnection() {
  const IORedis = (await import('ioredis')).default
  return new IORedis({
    host:                 process.env.REDIS_HOST ?? 'localhost',
    port:                 Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
  })
}

export async function enqueueIngestion(data: IngestionJobData): Promise<void> {
  console.log(`[queue] enqueueIngestion USE_INLINE=${USE_INLINE} REDIS_URL=${process.env.REDIS_URL ?? 'NOT_SET'} S3_BUCKET=${process.env.S3_BUCKET ?? 'NOT_SET'}`)
  if (USE_INLINE) {
    const { ingestDocument } = await import('../services/rag/ingestion')
    await ingestDocument(data)
    return
  }
  const { Queue } = await import('bullmq')
  const connection = await getRedisConnection()
  const queue = new Queue<IngestionJobData>('document-ingestion', {
    connection,
    defaultJobOptions: {
      attempts:          3,
      backoff:           { type: 'exponential', delay: 5_000 },
      removeOnComplete:  { count: 100 },
      removeOnFail:      { count: 50 },
    },
  })
  await queue.add('ingest', data)
}
