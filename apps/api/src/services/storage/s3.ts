import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import type { Readable } from 'stream'
import { randomUUID } from 'crypto'
import sharp from 'sharp'
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
    console.log(`[s3] LOCAL upload: ${key}`)
    localWrite(key, params.buffer)
    return key
  }

  console.log(`[s3] S3 upload to bucket=${BUCKET} key=${key}`)
  await getS3().send(new PutObjectCommand({
    Bucket:               BUCKET,
    Key:                  key,
    Body:                 params.buffer,
    ContentType:          params.mimeType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      tenant_id: params.tenantId,
      policy_id: params.policyId,
    },
  }))
  console.log(`[s3] S3 upload complete: ${key}`)

  return key
}

// Face-to-face training evidence (attendance-sheet scans, photos, trainer certs).
// Private — served back only via the authenticated download endpoint.
export async function uploadEvidenceFile(params: {
  tenantId: string; sessionId: string; key: string; buffer: Buffer; mimeType: string
}): Promise<string> {
  const s3Key = `tenants/${params.tenantId}/face_to_face/${params.sessionId}/${params.key}`
  if (USE_LOCAL) { localWrite(s3Key, params.buffer); return s3Key }
  await getS3().send(new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key, Body: params.buffer, ContentType: params.mimeType,
    ServerSideEncryption: 'AES256', Metadata: { tenant_id: params.tenantId, session_id: params.sessionId },
  }))
  return s3Key
}

// Audit evidence: an image attached to a question's answer during an audit.
export async function uploadAuditEvidence(params: {
  tenantId: string; runId: string; key: string; buffer: Buffer; mimeType: string
}): Promise<string> {
  const s3Key = `tenants/${params.tenantId}/audits/${params.runId}/${params.key}`
  if (USE_LOCAL) { localWrite(s3Key, params.buffer); return s3Key }
  await getS3().send(new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key, Body: params.buffer, ContentType: params.mimeType,
    ServerSideEncryption: 'AES256', Metadata: { tenant_id: params.tenantId, run_id: params.runId },
  }))
  return s3Key
}

// Support request: an image a tenant attaches when raising a service request.
export async function uploadSupportImage(params: {
  tenantId: string; key: string; buffer: Buffer; mimeType: string
}): Promise<string> {
  const s3Key = `tenants/${params.tenantId}/support/${params.key}`
  if (USE_LOCAL) { localWrite(s3Key, params.buffer); return s3Key }
  await getS3().send(new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key, Body: params.buffer, ContentType: params.mimeType,
    ServerSideEncryption: 'AES256', Metadata: { tenant_id: params.tenantId },
  }))
  return s3Key
}

// Workforce compliance register: a staff member's credential document
// (DBS/right-to-work/registration/reference scan).
export async function uploadCredentialFile(params: {
  tenantId: string; userId: string; key: string; buffer: Buffer; mimeType: string
}): Promise<string> {
  const s3Key = `tenants/${params.tenantId}/credentials/${params.userId}/${params.key}`
  if (USE_LOCAL) { localWrite(s3Key, params.buffer); return s3Key }
  await getS3().send(new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key, Body: params.buffer, ContentType: params.mimeType,
    ServerSideEncryption: 'AES256', Metadata: { tenant_id: params.tenantId, user_id: params.userId },
  }))
  return s3Key
}

// Stored face-to-face completion certificate (system-generated PDF). Private.
export async function uploadCertificateFile(params: {
  tenantId: string; certificateId: string; buffer: Buffer
}): Promise<string> {
  const s3Key = `tenants/${params.tenantId}/f2f_certificates/${params.certificateId}.pdf`
  if (USE_LOCAL) { localWrite(s3Key, params.buffer); return s3Key }
  await getS3().send(new PutObjectCommand({
    Bucket: BUCKET, Key: s3Key, Body: params.buffer, ContentType: 'application/pdf',
    ServerSideEncryption: 'AES256', Metadata: { tenant_id: params.tenantId, certificate_id: params.certificateId },
  }))
  return s3Key
}

export async function deleteFile(s3Key: string): Promise<void> {
  if (USE_LOCAL) { try { fs.rmSync(localPath(s3Key), { force: true }) } catch { /* ignore */ } return }
  try { await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key })) } catch { /* ignore */ }
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

// Total object count + bytes stored under a tenant's prefix (for cost insight).
export async function getTenantStorageStats(tenantId: string): Promise<{ objects: number; bytes: number }> {
  const prefix = `tenants/${tenantId}/`
  if (USE_LOCAL) return { objects: 0, bytes: 0 }

  let objects = 0
  let bytes = 0
  let token: string | undefined
  do {
    const list = await getS3().send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: prefix, ContinuationToken: token,
    }))
    for (const o of list.Contents ?? []) { objects++; bytes += o.Size ?? 0 }
    token = list.IsTruncated ? list.NextContinuationToken : undefined
  } while (token)

  return { objects, bytes }
}

// Platform-wide storage across ALL tenants (everything under tenants/).
export async function getPlatformStorageStats(): Promise<{ objects: number; bytes: number }> {
  if (USE_LOCAL) return { objects: 0, bytes: 0 }
  let objects = 0
  let bytes = 0
  let token: string | undefined
  do {
    const list = await getS3().send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: 'tenants/', ContinuationToken: token,
    }))
    for (const o of list.Contents ?? []) { objects++; bytes += o.Size ?? 0 }
    token = list.IsTruncated ? list.NextContinuationToken : undefined
  } while (token)
  return { objects, bytes }
}

// Delete every object under a tenant's prefix — policies, extracted text and
// versions all live under tenants/{id}/. Used by the platform "reset policies"
// action. Returns the number of objects deleted.
export async function deleteTenantFiles(tenantId: string): Promise<number> {
  const prefix = `tenants/${tenantId}/`

  if (USE_LOCAL) {
    try { fs.rmSync(path.join(LOCAL_DIR, prefix), { recursive: true, force: true }) } catch { /* ignore */ }
    return 0
  }

  let deleted = 0
  let token: string | undefined
  do {
    const list = await getS3().send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: prefix, ContinuationToken: token,
    }))
    const objects = (list.Contents ?? []).map(o => ({ Key: o.Key! })).filter(o => o.Key)
    if (objects.length > 0) {
      // DeleteObjects handles up to 1000 keys per request.
      await getS3().send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: objects, Quiet: true } }))
      deleted += objects.length
    }
    token = list.IsTruncated ? list.NextContinuationToken : undefined
  } while (token)

  console.log(`[s3] Deleted ${deleted} objects under ${prefix}`)
  return deleted
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

// ─── Blog image upload ────────────────────────────────────────────────────────

// Stores the image privately and returns its S3 KEY (e.g. blog/images/uuid.png).
// The bucket stays private — images are served via the public API proxy route
// GET /public/blog/image/:file (no public-read ACL, which the prod IAM user
// isn't permitted to set, and which we don't want on the private docs bucket).
export async function uploadBlogImage(params: {
  filename: string
  buffer:   Buffer
  mimeType: string
}): Promise<string> {
  // ── Upload optimisation rule ──────────────────────────────────────────────
  // EVERY uploaded image is optimised here so storage/bandwidth stays small
  // regardless of how big the source was: auto-orient via EXIF (also fixes
  // sideways phone photos), cap the largest side at 1600px, and re-encode as
  // WebP (q80). Animated GIFs pass through untouched (preserve animation).
  // Falls back to the original bytes if optimisation throws.
  let buffer      = params.buffer
  let ext         = (params.filename.split('.').pop() || 'webp').toLowerCase()
  let contentType = params.mimeType

  if (params.mimeType !== 'image/gif') {
    try {
      buffer = await sharp(params.buffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      ext         = 'webp'
      contentType = 'image/webp'
    } catch (e) {
      console.warn('[s3] image optimise failed, storing original:', String(e))
    }
  }

  const key = `blog/images/${randomUUID()}.${ext}`

  if (USE_LOCAL) {
    localWrite(key, buffer)
    return key
  }

  await getS3().send(new PutObjectCommand({
    Bucket:               BUCKET,
    Key:                  key,
    Body:                 buffer,
    ContentType:          contentType,
    ServerSideEncryption: 'AES256',
  }))

  return key
}

// Stores a training-module illustration privately and returns its S3 KEY
// (e.g. training/images/uuid.webp). Source bytes are re-encoded to WebP (q82,
// max 1024px) to keep them small. Falls back to the original bytes on failure.
export async function uploadTrainingImage(buffer: Buffer): Promise<string> {
  let body: Buffer = buffer
  let ext = 'webp'
  let contentType = 'image/webp'
  try {
    body = await sharp(buffer)
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch (e) {
    console.warn('[s3] training image optimise failed, storing original:', String(e))
    ext = 'png'; contentType = 'image/png'
  }

  const key = `training/images/${randomUUID()}.${ext}`
  if (USE_LOCAL) { localWrite(key, body); return key }
  await getS3().send(new PutObjectCommand({
    Bucket:               BUCKET,
    Key:                  key,
    Body:                 body,
    ContentType:          contentType,
    ServerSideEncryption: 'AES256',
  }))
  return key
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}
