// Signatures for letters and reports. A signature is PERSONAL: only the person adds, replaces or deletes theirs, and the picture is read by the server only when a document that
// THAT person is signing is being made (they chose "Sign with my signature" for that action). It is never put in an email, a notification, an Ask answer or the assistant, and it is
// never returned to the browser except to its owner (routes/signatures.ts, no-store). Stored as a small PNG in private storage; the table row only says where.
//
// Plain SQL, no Prisma model, so nothing that loads a user can pull a signature in by accident. A test fails if another file mentions the table.

import { prisma } from '../../db/client'
import { isManagerJobRole } from '../../lib/care-manager'
import { putPrivateObject } from '../storage/s3'
import type { SignatureImage } from './layout'

const q = () => prisma as any

export const SIGNATURE_MAX_BYTES = 450 * 1024
export const SIGNATURE_MAX_W = 1200
export const SIGNATURE_MAX_H = 600

/** Who may have a signature: administrators, and managers (care manager or registered manager). */
export const canHaveSignature = (role: string | undefined, jobRole: unknown): boolean => role === 'admin' || isManagerJobRole(jobRole)

const keyFor = (tenantId: string, userId: string) => `tenants/${tenantId}/signatures/${userId}.png`

export async function signatureTableReady(): Promise<boolean> {
  try { await q().$queryRawUnsafe('select 1 from user_signatures limit 1'); return true } catch { return false }
}

/** Checks a PNG sent by the browser and returns a clean copy: metadata stripped, shape and size limited. Throws a plain message. */
export async function cleanSignaturePng(input: Buffer): Promise<{ png: Buffer; width: number; height: number }> {
  if (!input || input.length < 100) throw new Error('That picture is empty. Please try again.')
  if (input.length > SIGNATURE_MAX_BYTES) throw new Error('That picture is too big. Please draw it again, or use a smaller photo.')
  if (!(input[0] === 0x89 && input[1] === 0x50 && input[2] === 0x4e && input[3] === 0x47)) throw new Error('The signature must be a PNG picture.')
  const sharp = (await import('sharp')).default
  let meta: { width?: number; height?: number }
  try { meta = await sharp(input).metadata() } catch { throw new Error('That picture could not be read. Please try again.') }
  if (!meta.width || !meta.height) throw new Error('That picture could not be read. Please try again.')
  if (meta.width < 40 || meta.height < 20) throw new Error('That signature is too small to use.')
  const out = await sharp(input).resize({ width: SIGNATURE_MAX_W, height: SIGNATURE_MAX_H, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true })
  return { png: out.data, width: out.info.width, height: out.info.height }
}

export interface SignatureMeta { has: boolean; width: number | null; height: number | null; updated_at: string | null }

export async function getMeta(tenantId: string, userId: string): Promise<SignatureMeta> {
  try {
    const r: any[] = await q().$queryRawUnsafe('select width, height, updated_at from user_signatures where tenant_id = $1 and user_id = $2', tenantId, userId)
    if (!r[0]) return { has: false, width: null, height: null, updated_at: null }
    return { has: true, width: r[0].width ?? null, height: r[0].height ?? null, updated_at: new Date(r[0].updated_at).toISOString() }
  } catch { return { has: false, width: null, height: null, updated_at: null } }
}

export async function saveSignature(tenantId: string, userId: string, png: Buffer, width: number, height: number): Promise<void> {
  const key = keyFor(tenantId, userId)
  await putPrivateObject(key, png, 'image/png')
  await q().$executeRawUnsafe(
    `insert into user_signatures (user_id, tenant_id, storage_key, mime, width, height, size_bytes, updated_at) values ($1, $2, $3, 'image/png', $4, $5, $6, now())
     on conflict (user_id) do update set tenant_id = excluded.tenant_id, storage_key = excluded.storage_key, width = excluded.width, height = excluded.height, size_bytes = excluded.size_bytes, updated_at = now()`,
    userId, tenantId, key, width, height, png.length)
}

export async function deleteSignature(tenantId: string, userId: string): Promise<boolean> {
  const r: any[] = await q().$queryRawUnsafe('select storage_key from user_signatures where tenant_id = $1 and user_id = $2', tenantId, userId)
  if (!r[0]) return false
  try { const { deleteFile } = await import('../storage/s3'); await deleteFile(r[0].storage_key) } catch { /* the row still goes */ }
  await q().$executeRawUnsafe('delete from user_signatures where tenant_id = $1 and user_id = $2', tenantId, userId)
  return true
}

/** Who has a signature (names only, never the picture): for the administrator's overview. */
export async function holders(tenantId: string): Promise<Array<{ user_id: string; updated_at: string }>> {
  try {
    const r: any[] = await q().$queryRawUnsafe('select user_id, updated_at from user_signatures where tenant_id = $1', tenantId)
    return r.map(x => ({ user_id: x.user_id, updated_at: new Date(x.updated_at).toISOString() }))
  } catch { return [] }
}

/**
 * THE ONLY reader of a signature picture. The caller passes the id of the person who is signing, which MUST be the signed in person who chose "Sign with my signature" for this
 * action (routes pass req.user.sub, never an id from the request body). Returns null when they have none, or when anything goes wrong: the document is then made without it.
 */
export async function loadSignatureFor(tenantId: string, signerUserId: string): Promise<SignatureImage | null> {
  if (!tenantId || !signerUserId) return null
  try {
    const r: any[] = await q().$queryRawUnsafe('select storage_key, width, height from user_signatures where tenant_id = $1 and user_id = $2', tenantId, signerUserId)
    if (!r[0]) return null
    const { downloadFile } = await import('../storage/s3')
    const png = await downloadFile(r[0].storage_key)
    return { png, width: Number(r[0].width) || 400, height: Number(r[0].height) || 150 }
  } catch { return null }
}

/** The printed name and job title under a signature: the signer's own record. */
export async function signerIdentity(tenantId: string, userId: string): Promise<{ name: string; role?: string } | null> {
  try {
    const u = await q().user.findFirst({ where: { id: userId, tenant_id: tenantId, is_active: true }, select: { name: true, job_role: true } })
    return u?.name ? { name: u.name, role: u.job_role || undefined } : null
  } catch { return null }
}
