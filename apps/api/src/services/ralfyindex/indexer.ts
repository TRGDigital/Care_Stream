import { prisma } from '../../db/client'
import { ralfyCreateProject, ralfyBalance } from './client'

type Config = {
  api_key: string | null
  enabled: boolean
  instant_index: boolean
  project_prefix: string
}

async function getConfig(): Promise<Config | null> {
  return (prisma as any).ralfyIndexConfig.findUnique({ where: { id: 'singleton' } })
}

// RalfyIndex project names allow [a-zA-Z0-9 _.-] only.
function sanitiseProjectName(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _.-]/g, '-').slice(0, 60)
}

// Drop URLs we've already successfully submitted (avoids wasting credits on re-saves).
async function filterNew(urls: string[]): Promise<string[]> {
  const existing = await (prisma as any).ralfyIndexSubmission.findMany({
    where: { url: { in: urls }, status: 'submitted' },
    select: { url: true },
  })
  const seen = new Set(existing.map((r: { url: string }) => r.url))
  return Array.from(new Set(urls.filter(u => !seen.has(u))))
}

/**
 * Submit one or more public URLs to RalfyIndex for automatic indexing, logging
 * each to ralfyindex_submissions. Fire-and-forget safe: never throws, so callers
 * (e.g. blog publish) are never blocked by an indexing failure.
 */
export async function submitUrlsForIndexing(
  urls: string[],
  opts: { source?: 'blog' | 'page'; blogPostId?: string | null } = {},
): Promise<void> {
  try {
    const clean = urls.map(u => u?.trim()).filter((u): u is string => !!u && /^https?:\/\//.test(u))
    if (!clean.length) return

    const cfg = await getConfig()
    if (!cfg || !cfg.enabled || !cfg.api_key) return

    const fresh = await filterNew(clean)
    if (!fresh.length) return

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '_')
    const projectName = sanitiseProjectName(`${cfg.project_prefix || 'CareStream'}_${stamp}`)

    const resp = await ralfyCreateProject(cfg.api_key, projectName, fresh, cfg.instant_index)
    const okStatus = resp?.status === 'ok'
    const perUrl = cfg.instant_index ? 10 : 1

    await (prisma as any).ralfyIndexSubmission.createMany({
      data: fresh.map(url => ({
        url,
        source: opts.source ?? 'blog',
        blog_post_id: opts.blogPostId ?? null,
        project_name: projectName,
        status: okStatus ? 'submitted' : 'failed',
        credits_used: okStatus ? perUrl : null,
        error: okStatus ? null : (resp?.message ?? (resp?.errorCode ? `errorCode ${resp.errorCode}` : 'Unknown error')),
      })),
    })

    if (!okStatus) {
      console.error('[ralfyindex] submission failed', { projectName, count: fresh.length, resp })
    }
  } catch (e) {
    console.error('[ralfyindex] submitUrlsForIndexing error', e)
  }
}

// Count of pages successfully pushed through the API (for the dashboard).
export async function countIndexedPages(): Promise<number> {
  try {
    return await (prisma as any).ralfyIndexSubmission.count({ where: { status: 'submitted' } })
  } catch {
    return 0
  }
}

// Best-effort remaining credit balance (null if unavailable). Used on the dashboard.
export async function ralfyIndexBalance(): Promise<number | null> {
  try {
    const cfg = await getConfig()
    if (!cfg?.api_key) return null
    const resp = await ralfyBalance(cfg.api_key)
    return typeof resp?.balance === 'number' ? resp.balance : null
  } catch {
    return null
  }
}
