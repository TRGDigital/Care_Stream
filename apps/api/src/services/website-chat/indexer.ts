import crypto from 'crypto'
import { prisma } from '../../db/client'
import { embedTexts } from '../rag/embedder'
import { replacePublicSiteVectors, deletePublicSiteVectors, type PublicSiteVector } from '../vector/pinecone'

// Indexes the PUBLIC marketing site for the website AI chat.
//
// The source is the rendered page, read from the live site through its sitemap, not the database
// records behind it. That is deliberate: the site is built from half a dozen stores (service pages,
// user cases, features, care settings, the blog, the policy shop, the training catalogue) plus pages
// whose copy lives in code, and reading the page a visitor reads is the only way the chat is
// guaranteed to know exactly what the site says, no more and no less.
//
// Every page is split by its headings into passages, embedded, and written to the public_site
// Pinecone namespace. A page is only re-embedded when its text has changed.

const SITE = (process.env.WEBSITE_CHAT_SITE_URL ?? 'https://www.carestreamai.com').replace(/\/$/, '')

/** Pages that are not content, or are checkout steps the chat should not describe from the page. */
const EXCLUDE = [/^\/basket\b/, /^\/care-policies\/checkout\b/, /^\/register\b/, /^\/login\b/,
  /^\/check-email\b/, /^\/buy\//, /^\/help(\/|$)/, /^\/platform\b/, /^\/api\//]

export const isIndexablePath = (path: string) => path.startsWith('/') && !EXCLUDE.some(r => r.test(path))

/** How long a publish waits before its page is re-read, so the page cache has refreshed first. */
export const QUEUE_DELAY_MS = 90_000

const CHUNK_MAX = 1400
const CHUNK_MIN = 120

// ── Reading a page ───────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', pound: '£', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', middot: '·' }
function decode(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
}

const clean = (s: string) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()

export interface ExtractedPage {
  title:     string
  noindex:   boolean
  sections:  { heading: string; text: string }[]
  fullText:  string
}

export function extractPage(html: string): ExtractedPage {
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
  const docTitle = clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ?? [])[1] ?? '')
    .replace(/\s*\|\s*CareStream(AI)?\s*$/i, '')

  // The page's own content lives in <main>; the site header, menus and footer sit outside it.
  // A page without a <main> falls back to the body with the site chrome removed.
  let body = (html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i) ?? [])[1]
    ?? (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) ?? [])[1] ?? html
  body = body
    .replace(/<(script|style|noscript|svg|template|iframe|video|audio|canvas|select)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
  if (!/<main\b/i.test(html)) {
    body = body.replace(/<(header|nav|footer)\b[\s\S]*?<\/\1>/gi, ' ')
  }
  // Blocks become line breaks and headings become markers, so passages can be split by heading.
  body = body
    .replace(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, l, t) => `\nH${l}${clean(t)}\n`)
    .replace(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi, (_, t) => `\nH4${clean(t)}\n`)
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|section|article|li|tr|td|th|dd|dt|blockquote|figcaption|details|ul|ol|table)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
  const lines = decode(body.replace(/<[^>]+>/g, ' '))
    .split('\n').map(l => l.replace(/[ \t ]+/g, ' ').trim()).filter(Boolean)

  let title = ''
  const sections: { heading: string; text: string }[] = []
  let current = { heading: '', text: '' }
  const seen = new Set<string>()
  for (const line of lines) {
    const h = line.match(/^H([1-4])(.*)$/)
    if (h) {
      if (h[1] === '1' && !title) title = h[2]
      if (current.text.trim()) sections.push(current)
      current = { heading: h[2], text: '' }
      continue
    }
    // Repeated boilerplate (the same button label on every card) adds nothing to a passage.
    if (line.length < 40 && seen.has(line)) continue
    if (line.length < 40) seen.add(line)
    current.text += (current.text ? '\n' : '') + line
  }
  if (current.text.trim()) sections.push(current)

  const fullText = sections.map(s => `${s.heading}\n${s.text}`).join('\n\n')
  return { title: title || docTitle, noindex, sections, fullText }
}

/** Passages of a readable size, each carrying its heading. */
export function chunkPage(page: ExtractedPage): { heading: string; text: string }[] {
  const out: { heading: string; text: string }[] = []
  for (const s of page.sections) {
    const paras = s.text.split('\n')
    let buf = ''
    for (const p of paras) {
      if (buf && (buf.length + p.length + 1) > CHUNK_MAX) {
        out.push({ heading: s.heading, text: buf })
        buf = ''
      }
      buf += (buf ? '\n' : '') + p
    }
    if (buf) out.push({ heading: s.heading, text: buf })
  }
  // A passage too short to stand alone joins the one before it.
  const merged: typeof out = []
  for (const c of out) {
    const prev = merged[merged.length - 1]
    if (prev && c.text.length < CHUNK_MIN && prev.text.length + c.text.length < CHUNK_MAX) {
      prev.text += `\n${c.heading ? `${c.heading}: ` : ''}${c.text}`
    } else {
      merged.push({ ...c })
    }
  }
  return merged
}

const pathKey = (path: string) => crypto.createHash('sha1').update(path).digest('hex').slice(0, 16)
const sectionOf = (path: string) => (path === '/' ? 'home' : path.split('/')[1] || 'home')

// ── Indexing ─────────────────────────────────────────────────────────────────

export async function sitemapPaths(): Promise<string[]> {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { 'User-Agent': 'CareStreamChatIndexer/1.0' } })
  if (!res.ok) throw new Error(`Sitemap returned ${res.status}`)
  const xml = await res.text()
  const paths = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)]
    .map(m => { try { return new URL(m[1]).pathname.replace(/\/$/, '') || '/' } catch { return '' } })
    .filter(p => p && isIndexablePath(p))
  return [...new Set(paths)].sort()
}

export interface IndexResult { path: string; status: 'indexed' | 'unchanged' | 'removed' | 'error'; chunks?: number; error?: string }

export async function indexPath(path: string, opts: { force?: boolean } = {}): Promise<IndexResult> {
  const db = prisma as any
  const prefix = `site_${pathKey(path)}_`
  try {
    if (!isIndexablePath(path)) throw new Error('This page is excluded from the chat index')
    const res = await fetch(`${SITE}${path}`, {
      headers: { 'User-Agent': 'CareStreamChatIndexer/1.0' },
      redirect: 'follow',
    })
    const finalPath = new URL(res.url).pathname.replace(/\/$/, '') || '/'
    // A page that has gone, or now redirects elsewhere, leaves the index.
    if (res.status === 404 || res.status === 410 || finalPath !== path) {
      await deletePublicSiteVectors(prefix)
      await db.websiteChatPage.upsert({
        where: { path },
        update: { status: 'removed', chunk_count: 0, queued_at: null, error: finalPath !== path ? `Redirects to ${finalPath}` : `HTTP ${res.status}` },
        create: { path, section: sectionOf(path), status: 'removed', error: `HTTP ${res.status}` },
      })
      return { path, status: 'removed' }
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const page = extractPage(await res.text())
    if (page.noindex) {
      await deletePublicSiteVectors(prefix)
      await db.websiteChatPage.upsert({
        where: { path },
        update: { status: 'removed', chunk_count: 0, queued_at: null, error: 'Marked noindex' },
        create: { path, section: sectionOf(path), status: 'removed', error: 'Marked noindex' },
      })
      return { path, status: 'removed' }
    }

    const hash = crypto.createHash('sha1').update(page.fullText).digest('hex')
    const existing = await db.websiteChatPage.findUnique({ where: { path } })
    if (!opts.force && existing?.status === 'indexed' && existing.content_hash === hash) {
      await db.websiteChatPage.update({ where: { path }, data: { queued_at: null, indexed_at: new Date() } })
      return { path, status: 'unchanged', chunks: existing.chunk_count }
    }

    const chunks = chunkPage(page)
    const vectors: PublicSiteVector[] = []
    if (chunks.length) {
      const embeddings = await embedTexts(chunks.map(c => `${page.title}\n${c.heading}\n${c.text}`))
      chunks.forEach((c, i) => vectors.push({
        id: `${prefix}${i}`,
        values: embeddings[i],
        metadata: { path, title: page.title, heading: c.heading, text: c.text.slice(0, 3500) },
      }))
    }
    await replacePublicSiteVectors(prefix, vectors)
    await db.websiteChatPage.upsert({
      where: { path },
      update: { title: page.title, section: sectionOf(path), content_hash: hash, chunk_count: vectors.length, status: 'indexed', error: null, queued_at: null, indexed_at: new Date() },
      create: { path, title: page.title, section: sectionOf(path), content_hash: hash, chunk_count: vectors.length, status: 'indexed', indexed_at: new Date() },
    })
    return { path, status: 'indexed', chunks: vectors.length }
  } catch (e: any) {
    const message = String(e?.message ?? e).slice(0, 500)
    await db.websiteChatPage.upsert({
      where: { path },
      update: { status: 'error', error: message },
      create: { path, section: sectionOf(path), status: 'error', error: message },
    }).catch(() => {})
    return { path, status: 'error', error: message }
  }
}

/** Ask for a page to be re-read shortly, after a publish. Never throws: indexing is a side effect
 *  of publishing, and a failure here must not fail the publish. */
export async function queueWebsiteReindex(path: string): Promise<void> {
  try {
    if (!isIndexablePath(path)) return
    await (prisma as any).websiteChatPage.upsert({
      where: { path },
      update: { queued_at: new Date() },
      create: { path, section: sectionOf(path), status: 'pending', queued_at: new Date() },
    })
  } catch (e) {
    console.warn('[website-chat] could not queue a reindex:', (e as Error)?.message)
  }
}

/** Re-read pages whose publish has had time to reach the live site. */
export async function processDueQueue(max = 2): Promise<IndexResult[]> {
  const due = await (prisma as any).websiteChatPage.findMany({
    where: { queued_at: { lte: new Date(Date.now() - QUEUE_DELAY_MS) } },
    orderBy: { queued_at: 'asc' },
    take: max,
    select: { path: true },
  })
  const out: IndexResult[] = []
  for (const d of due) out.push(await indexPath(d.path, { force: false }))
  return out
}

/** One batch of a full sync. Sitemap order is stable, so the console walks it with an offset.
 *  The first batch also retires pages that have left the sitemap. */
export async function syncBatch(offset: number, limit: number, force: boolean): Promise<{
  total: number; next: number | null; results: IndexResult[]
}> {
  const paths = await sitemapPaths()
  if (offset === 0) {
    const listed = new Set(paths)
    const known = await (prisma as any).websiteChatPage.findMany({
      where: { status: { not: 'removed' } }, select: { path: true },
    })
    for (const k of known as { path: string }[]) {
      if (!listed.has(k.path)) {
        await deletePublicSiteVectors(`site_${pathKey(k.path)}_`)
        await (prisma as any).websiteChatPage.update({
          where: { path: k.path }, data: { status: 'removed', chunk_count: 0, error: 'No longer in the sitemap' },
        })
      }
    }
  }
  const slice = paths.slice(offset, offset + limit)
  const results: IndexResult[] = []
  const started = Date.now()
  for (const p of slice) {
    results.push(await indexPath(p, { force }))
    // Paced: this reads the live site, which must never feel it.
    await new Promise(r => setTimeout(r, 250))
    if (Date.now() - started > 200_000) break
  }
  const done = offset + results.length
  return { total: paths.length, next: done < paths.length ? done : null, results }
}
