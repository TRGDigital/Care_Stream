import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import type { Readable } from 'stream'
import fs from 'fs'
import path from 'path'

// §3.1 — All S3 paths are tenant-scoped. Files are never deleted (§10.5).
//
// Key layout:
//   tenants/{tenant_id}/policies/{policy_id}/{filename}   — live document
//   tenants/{tenant_id}/extracted/{policy_id}.txt         — plain-text cache (post-ingestion)
//   tenants/{tenant_id}/versions/{policy_id}/v{n}/{file}  — superseded versions

const USE_LOCAL = !process.env.S3_BUCKET
const LOCAL_DIR = process.env.LOCAL_STORAGE_DIR ?? '/tmp/carestreamai'

let _s3: S3Client | null = null
function getS3(): S3Client {
  if (!_s3) _s3 = new S3Client({
    region: process.env.AWS_REGION ?? 'eu-west-2',
    credentials: {
      accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
  return _s3
}

const BUCKET = process.env.S3_BUCKET!

function localPath(key: string): string {
  return path.join(LOCAL_DIR, key)
}

function localWrite(key: string, data: Buffer): void {
  const full = localPath(key)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, data)
}

function localRead(key: string): Buffer {
  return fs.readFileSync(localPath(key))
}

function localExists(key: string): boolean {
  return fs.existsSync(localPath(key))
}

function localCopy(srcKey: string, destKey: string): void {
  const dest = localPath(destKey)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(localPath(srcKey), dest)
}

// ─── Key builders ─────────────────────────────────────────────────────────────

export function buildPolicyKey(tenantId: string, policyId: string, filename: string): string {
  return `tenants/${tenantId}/policies/${policyId}/${sanitize(filename)}`
}

export function buildExtractedTextKey(tenantId: string, policyId: string): string {
  return `tenants/${tenantId}/extracted/${policyId}.txt`
}

export function buildVersionArchiveKey(
  tenantId: string,
  policyId: string,
  version: number,
  filename: string
): string {
  return `tenants/${tenantId}/versions/${policyId}/v${version}/${sanitize(filename)}`
}

function sanitize(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._\-]/g, '_').slice(0, 200)
}

// ─── Upload ───────────────────────────────────────────────────────────────────

export async function uploadPolicyFile(params: {
  tenantId:  string
  policyId:  string
  filename:  string
  buffer:    Buffer
  mimeType:  string
}): Promise<string> {
  const key = buildPolicyKey(params.tenantId, params.policyId, params.filename)

  if (USE_LOCAL) {
    localWrite(key, params.buffer)
    return key
  }

  await getS3().send(new PutObjectCommand({
    Bucket:               BUCKET,
    Key:                  key,
    Body:                 params.buffer,
    ContentType:          params.mimeType,
    ServerSideEncryption: 'AES256',   // §11.2 encryption at rest
    Metadata: {
      tenant_id: params.tenantId,
      policy_id: params.policyId,
    },
  }))

  return key
}

// Store extracted plain text alongside the original — used by the query pipeline
// for full-policy returns (§4.3) and by GET /policies/:id
export async function uploadExtractedText(
  tenantId: string,
  policyId: string,
  text: string
): Promise<void> {
  const key = buildExtractedTextKey(tenantId, policyId)

  if (USE_LOCAL) {
    localWrite(key, Buffer.from(text, 'utf-8'))
    return
  }

  await getS3().send(new PutObjectCommand({
    Bucket:               BUCKET,
    Key:                  key,
    Body:                 Buffer.from(text, 'utf-8'),
    ContentType:          'text/plain; charset=utf-8',
    ServerSideEncryption: 'AES256',
  }))
}

// ─── Download ─────────────────────────────────────────────────────────────────

export async function downloadFile(s3Key: string): Promise<Buffer> {
  if (USE_LOCAL) return localRead(s3Key)
  const response = await getS3().send(new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }))
  return streamToBuffer(response.Body as Readable)
}

export async function downloadExtractedText(
  tenantId: string,
  policyId: string
): Promise<string | null> {
  const key = buildExtractedTextKey(tenantId, policyId)

  if (USE_LOCAL) {
    if (!localExists(key)) return null
    return localRead(key).toString('utf-8')
  }

  try {
    const response = await getS3().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const buffer = await streamToBuffer(response.Body as Readable)
    return buffer.toString('utf-8')
  } catch (e: any) {
    if (e.name === 'NoSuchKey' || e.$metadata?.httpStatusCode === 404) return null
    throw e
  }
}

export async function fileExists(s3Key: string): Promise<boolean> {
  if (USE_LOCAL) return localExists(s3Key)
  try {
    await getS3().send(new HeadObjectCommand({ Bucket: BUCKET, Key: s3Key }))
    return true
  } catch {
    return false
  }
}

// ─── Versioning (§10.5) ───────────────────────────────────────────────────────
// When a policy is superseded, copy the original file to the /versions/ path.
// The original file is NOT deleted — it remains accessible by its original key.

export async function archiveVersionToS3(params: {
  sourceKey: string
  tenantId:  string
  policyId:  string
  version:   number
  filename:  string
}): Promise<string> {
  const destKey = buildVersionArchiveKey(params.tenantId, params.policyId, params.version, params.filename)

  if (USE_LOCAL) {
    localCopy(params.sourceKey, destKey)
    return destKey
  }

  await getS3().send(new CopyObjectCommand({
    Bucket:               BUCKET,
    CopySource:           `${BUCKET}/${params.sourceKey}`,
    Key:                  destKey,
    ServerSideEncryption: 'AES256',
  }))

  return destKey
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
