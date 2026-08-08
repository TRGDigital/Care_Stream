export type TocHeading = { level: number; id: string; text: string }

/**
 * Builds a linked Table of Contents from a blog post's stored HTML body.
 *
 *  - Assigns a stable slug `id` to every h2/h3/h4 (preserving any existing id),
 *    so the ToC links can jump to each section.
 *  - Injects a ToC block (nested list of anchor links) immediately before the
 *    first <h2>, after any intro paragraphs.
 *  - Returns the same heading list so the page can emit matching HyperToc
 *    structured data (the ids here are the anchor targets the schema links to).
 *
 * Pure string transform, so it runs in a server component and applies to every
 * current and future post automatically with no data migration. Styling lives
 * in globals.css under `.cs-toc`.
 */
export function buildBlogToc(html: string): { html: string; headings: TocHeading[] } {
  if (!html) return { html, headings: [] }

  // The page renders the post title as the single <h1>; demote any stray <h1> in
  // the body to <h2> (it then becomes a normal section, picked up by the ToC).
  html = html.replace(/<(\/?)h1(\s|>)/gi, '<$1h2$2')

  const used = new Set<string>()
  const headings: TocHeading[] = []

  const slugify = (s: string) => {
    const base =
      s
        .toLowerCase()
        .replace(/&[a-z]+;/gi, ' ') // strip HTML entities
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'section'
    let slug = base
    let n = 2
    while (used.has(slug)) slug = `${base}-${n++}`
    used.add(slug)
    return slug
  }

  // Walk every h2/h3/h4: capture its text and ensure it carries an id.
  const withIds = html.replace(/<h([234])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, lvl, attrs, inner) => {
    const text = String(inner).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (!text) return match

    const existing = /\bid\s*=\s*["']([^"']+)["']/i.exec(attrs)
    let newAttrs = attrs
    let id: string
    if (existing) {
      id = existing[1]
      used.add(id)
    } else {
      id = slugify(text)
      newAttrs = `${attrs} id="${id}"`
    }
    headings.push({ level: Number(lvl), id, text })
    return `<h${lvl}${newAttrs}>${inner}</h${lvl}>`
  })

  // A ToC only earns its place when there are a couple of sections to jump to.
  if (headings.length < 2) return { html: withIds, headings: [] }

  const minLevel = Math.min(...headings.map(h => h.level))
  const items = headings
    .map(h => `<li class="cs-toc-item cs-toc-l${h.level - minLevel}"><a href="#${h.id}">${h.text}</a></li>`)
    .join('')

  const toc =
    '<nav class="cs-toc not-prose" aria-label="Table of contents">' +
    '<p class="cs-toc-title">On this page</p>' +
    `<ul class="cs-toc-list">${items}</ul>` +
    '</nav>'

  // Sit the ToC directly above the first <h2> (after the intro copy).
  const firstH2 = withIds.search(/<h2[\s>]/i)
  const body = firstH2 === -1 ? toc + withIds : withIds.slice(0, firstH2) + toc + withIds.slice(firstH2)
  return { html: body, headings }
}
