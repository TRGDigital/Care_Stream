// The "Part of our ... guides" block as an HTML string, injected into the article or collection body just
// above its first heading, so it sits inside the content and the links are in the server HTML.
// Pure and framework free: used by the server pages and the platform draft preview.

export interface RelatedItem { title: string; url: string; draft?: boolean }
export interface RelatedBlock { label: string; intro: string; items: RelatedItem[]; total: number; hub_url: string | null }

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function relatedBlockHtml(b: RelatedBlock): string {
  if (!b.items.length) return ''
  const li = (i: RelatedItem) =>
    `<li style="margin:0;padding:0;list-style:none"><a href="${esc(i.url)}" style="color:#0f766e;text-decoration:underline">${esc(i.title)}</a>` +
    (i.draft ? ' <span style="background:#FEF3C7;color:#78350F;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px">draft</span>' : '') + '</li>'
  const hub = b.hub_url
    ? `<li style="margin:0;padding:0;list-style:none;font-weight:600"><a href="${esc(b.hub_url)}" style="color:#111827;text-decoration:underline">See all ${b.total} ${esc(b.label)} guides</a></li>` : ''
  return `<aside class="not-prose" aria-label="More about ${esc(b.label)}" style="margin:24px 0;padding:16px 20px;border:1px solid #E5E7EB;border-left:4px solid #0f766e;border-radius:10px;background:#F9FAFB">` +
    `<p style="margin:0;font-size:16px;font-weight:700;color:#111827">Part of our ${esc(b.label)} guides</p>` +
    (b.intro ? `<p style="margin:4px 0 10px;font-size:14px;color:#4B5563">${esc(b.intro)}</p>` : '') +
    // The collection theme draws its own bullets with li::before; switch them off inside this block only.
    `<style>aside[aria-label^="More about"] li::before{content:none!important;display:none!important}</style>` +
    `<ul style="margin:0;padding:0;list-style:none;display:grid;gap:6px;font-size:14px">${b.items.map(li).join('')}${hub}</ul></aside>`
}

/** Insert the block just before the first <h2> (or the first heading of any level, or at the start). */
export function injectBeforeFirstHeading(html: string, block: string): string {
  if (!block) return html
  const m = html.match(/<h2[\s>]/i) ?? html.match(/<h[1-6][\s>]/i)
  return m && m.index !== undefined ? html.slice(0, m.index) + block + html.slice(m.index) : block + html
}
