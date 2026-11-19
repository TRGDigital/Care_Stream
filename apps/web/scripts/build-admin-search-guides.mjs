// Turns the Help & Guides page (JSX) into a plain searchable index: one entry per guide and one per titled block inside it,
// so admin search can answer "how do I invite a family member" from the guide text itself. Run: node scripts/build-admin-search-guides.mjs
// The output is committed; admin-search/guides-index.test.mjs fails if the guides change and this was not re-run.
import ts from 'typescript'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
export const SRC = join(root, 'src/app/(admin)/guides/page.tsx')
export const OUT = join(root, 'src/lib/admin-search/guides-index.json')

export function build() {
  const text = readFileSync(SRC, 'utf8')
  const sf = ts.createSourceFile('guides.tsx', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const clean = (s) => s.replace(/\s+/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&lsquo;/g, "'").replace(/&nbsp;/g, ' ').trim()
  const plain = (node) => {
    const out = []
    const walk = (n) => {
      if (ts.isJsxText(n)) out.push(n.getText())
      else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) { const p = n.parent; if (!(ts.isJsxAttribute(p) && !['title'].includes(p.name.getText()))) out.push(n.text) }
      ts.forEachChild(n, walk)
    }
    walk(node)
    return clean(out.join(' '))
  }
  const guides = []
  const visit = (n) => {
    if (ts.isVariableDeclaration(n) && n.name.getText() === 'GUIDE_SECTIONS' && n.initializer && ts.isArrayLiteralExpression(n.initializer)) {
      for (const el of n.initializer.elements) {
        if (!ts.isObjectLiteralExpression(el)) continue
        const g = { id: '', title: '', summary: '', blocks: [], text: '' }
        for (const p of el.properties) {
          if (!ts.isPropertyAssignment(p)) continue
          const k = p.name.getText()
          if ((k === 'id' || k === 'title' || k === 'summary') && ts.isStringLiteralLike(p.initializer)) g[k] = p.initializer.text
          if (k === 'content') {
            g.text = plain(p.initializer)
            const blocks = (x) => {
              if ((ts.isJsxElement(x) && x.openingElement.tagName.getText() === 'SectionBlock') || (ts.isJsxSelfClosingElement(x) && x.tagName.getText() === 'SectionBlock')) {
                const open = ts.isJsxElement(x) ? x.openingElement : x
                const t = open.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText() === 'title')
                const title = t && t.initializer && ts.isStringLiteral(t.initializer) ? t.initializer.text : ''
                if (title) g.blocks.push({ title: clean(title), text: ts.isJsxElement(x) ? plain(x.children.length ? x : x) .replace(clean(title), '').trim() : '' })
              }
              ts.forEachChild(x, blocks)
            }
            blocks(p.initializer)
          }
        }
        if (g.id) guides.push(g)
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(sf)
  return guides
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const g = build()
  writeFileSync(OUT, JSON.stringify(g, null, 1) + '\n')
  console.log(`${g.length} guides, ${g.reduce((n, x) => n + x.blocks.length, 0)} blocks, ${(JSON.stringify(g).length / 1024).toFixed(0)} KB`)
}
