// §3.1 — S3 operations; all paths scoped to tenant prefix
// Upload path: s3://bucket/tenants/{tenant_id}/policies/{filename}
// Archived versions: s3://bucket/tenants/{tenant_id}/versions/{policy_id}/v{n}
// Files are never deleted — only archived (§10.5)
export async function uploadToS3(_tenantId: string, _file: Buffer, _filename: string): Promise<string> {
  throw new Error('Not implemented')
}

export async function getFromS3(_s3Key: string): Promise<Buffer> {
  throw new Error('Not implemented')
}
