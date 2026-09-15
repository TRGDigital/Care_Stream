import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { signPreviewToken, PREVIEW_TTL_SECONDS, type PreviewKind } from '../lib/preview-token'

// Mints a preview link for an unpublished marketing page. Platform admin only: the console
// already holds that token, and nothing else should be able to mint one.

export const previewAdminRouter = Router()
previewAdminRouter.use(requirePlatformAdmin)

// Where each family's pages live, and what a preview token for one is called. Keeping the
// path here means the console does not have to know the URL shape of every family.
const PATHS: Record<PreviewKind, (slug: string) => string> = {
  'user-case': slug => `/uses/${slug}`,
  'feature':   slug => `/features/${slug}`,
  'setting':   slug => `/${slug}`,
  // Flat, like the care settings: /our-services is the theme's grouping, not a live URL.
  'service-page': slug => `/${slug}`,
}

// POST /admin/preview { kind, slug } -> { url, expiresIn }
previewAdminRouter.post('/', (req: Request, res: Response) => {
  const kind = String(req.body?.kind ?? '') as PreviewKind
  const slug = String(req.body?.slug ?? '').trim()

  if (!PATHS[kind]) { err(res, 'BAD_REQUEST', 'Unknown page type.', 400); return }
  // The slug goes into a URL and into signed claims, so it is constrained rather than trusted.
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(slug)) {
    err(res, 'BAD_REQUEST', 'Invalid slug.', 400); return
  }

  const token = signPreviewToken(kind, slug)
  // WEB_URL holds a comma-separated list of every host the site answers on, and one entry in
  // it is missing its colon. Using it raw produced a preview link beginning
  // "https://carestreamai.com,https//www.carestreamai.com,https://care-stream-web..." which no
  // browser can open. Take the first entry that is genuinely a URL, and fall back to the
  // canonical host, which is where the site actually lives.
  const hosts = (process.env.WEB_URL ?? '')
    .split(',')
    .map(s => s.trim().replace(/\/$/, ''))
    .filter(s => /^https:\/\/[a-z0-9.-]+$/i.test(s))
  // Prefer the canonical www host. The apex is in that list too and 308s to www, and a preview
  // link that starts with a redirect is one more thing to go wrong for no benefit.
  const base = hosts.find(h => h.startsWith('https://www.'))
    ?? hosts[0]
    ?? 'https://www.carestreamai.com'
  const url = `${base}/api/preview?token=${encodeURIComponent(token)}`
      + `&path=${encodeURIComponent(PATHS[kind](slug))}`

  ok(res, { url, expiresIn: PREVIEW_TTL_SECONDS })
})
