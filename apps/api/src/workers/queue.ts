import { Queue } from 'bullmq'

// §13.1 — BullMQ + Redis for async document processing
// Ensures large uploads never block the API
export const ingestionQueue = new Queue('document-ingestion', {
  connection: { host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT) },
})
