// Apply adopted policy changes to a rendered (formatted) policy DOM: amend replaces its
// block, a subsection lands under its heading, a new section lands above the sign-off/dates.
// Tracked mode marks changes green; clean mode reads like the finished policy. Shared by the
// admin review modal and the care-manager hub. Pure DOM, no AI.

export type PolicyChange = { placement: string; old_text: string; new_text: string; section_title: string }

const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

function findBlock(root: HTMLElement, anchor: string): HTMLElement | null {
  const needle = norm(anchor)
  if (needle.length < 6) return null
  const blocks = Array.from(root.querySelectorAll('p,li,td,blockquote')) as HTMLElement[]
  let target: HTMLElement | null = null
  for (const b of blocks) {
    if (norm(b.textContent || '').includes(needle)) {
      if (!target || (b.textContent?.length ?? 0) < (target.textContent?.length ?? 0)) target = b
    }
  }
  return target
}

function findHeading(root: HTMLElement, anchor: string): HTMLElement | null {
  const q = norm(anchor)
  if (!q) return null
  return (Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[]).find(h => {
    const ht = norm(h.textContent || '')
    return ht === q || (q.length >= 6 && ht.length >= 6 && (ht.includes(q) || q.includes(ht)))
  }) ?? null
}

const END_MATTER_RE = /\b(signed|signature|date|dated|reviewed|review date|next review|policy review|version|approved by|authorised by|policy owner|source url|declaration|registered (office|number|charity)|company (number|registration)|telephone|©|copyright|\bltd\b|limited)\b/i
function endMatterAnchor(root: HTMLElement): HTMLElement | null {
  const blocks = Array.from(root.children) as HTMLElement[]
  let anchor: HTMLElement | null = null
  for (let i = blocks.length - 1; i >= 0; i--) {
    const t = norm(blocks[i].textContent || '')
    if (!t) continue
    if (t.length <= 240 && END_MATTER_RE.test(t)) { anchor = blocks[i]; continue }
    break
  }
  return anchor
}
function insertBeforeEndMatter(root: HTMLElement, node: HTMLElement) {
  const anchor = endMatterAnchor(root)
  if (anchor && anchor.parentNode === root) root.insertBefore(node, anchor)
  else root.appendChild(node)
}

function stripSourceUrl(root: HTMLElement) {
  for (const el of Array.from(root.querySelectorAll('p,li,div')) as HTMLElement[]) {
    if (/^\s*source url\s*[:>]/i.test(el.textContent || '')) el.remove()
  }
}

function contentBlock(text: string, tracked: boolean): HTMLElement {
  const p = document.createElement('p')
  p.textContent = text
  p.className = tracked ? 'rounded bg-green-100 px-1 py-0.5 whitespace-pre-line' : 'whitespace-pre-line'
  return p
}
function sectionBlock(title: string, text: string, tracked: boolean): HTMLElement {
  const wrap = document.createElement('div')
  if (tracked) wrap.className = 'my-2 border-l-4 border-green-400 pl-3'
  if (title) { const h = document.createElement('h2'); h.textContent = title; wrap.appendChild(h) }
  const p = document.createElement('p')
  p.textContent = text
  p.className = tracked ? 'rounded bg-green-100 px-1 py-0.5 whitespace-pre-line' : 'whitespace-pre-line'
  wrap.appendChild(p)
  return wrap
}

export function applyChanges(root: HTMLElement, changes: PolicyChange[], tracked: boolean) {
  stripSourceUrl(root)
  for (const c of changes) {
    if (c.placement === 'amend' && c.old_text) {
      const block = findBlock(root, c.old_text)
      if (block) {
        block.textContent = c.new_text
        if (tracked) block.classList.add('bg-green-100', 'rounded', 'px-1', 'py-0.5')
        block.classList.add('whitespace-pre-line')
      } else {
        insertBeforeEndMatter(root, contentBlock(c.new_text, tracked))
      }
    } else if (c.placement === 'add_under_heading' && c.old_text) {
      const heading = findHeading(root, c.old_text)
      const node = contentBlock(c.new_text, tracked)
      if (heading) heading.after(node)
      else insertBeforeEndMatter(root, node)
    } else {
      insertBeforeEndMatter(root, sectionBlock(c.section_title, c.new_text, tracked))
    }
  }
}
