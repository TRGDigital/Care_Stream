// A small, safe renderer for agent answers: paragraphs, bullet and numbered lists, tables, **bold** and nothing else. It builds React elements only
// (never inserts HTML), so nothing in an answer can run as a script or a link.
import React from 'react'

function inline(text: string, key: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => (/^\*\*[^*]+\*\*$/.test(p) ? <strong key={`${key}-${i}`}>{p.slice(2, -2)}</strong> : <React.Fragment key={`${key}-${i}`}>{p}</React.Fragment>))
}

export function parseBlocks(src: string): Array<{ kind: 'p' | 'ul' | 'ol' | 'table' | 'h'; lines: string[] }> {
  const lines = src.replace(/\r/g, '').split('\n')
  const out: Array<{ kind: 'p' | 'ul' | 'ol' | 'table' | 'h'; lines: string[] }> = []
  let cur: { kind: 'p' | 'ul' | 'ol' | 'table' | 'h'; lines: string[] } | null = null
  const push = () => { if (cur) { out.push(cur); cur = null } }
  for (const raw of lines) {
    const l = raw.trimEnd()
    if (!l.trim()) { push(); continue }
    const kind = /^\s*[-*•]\s+/.test(l) ? 'ul' : /^\s*\d+[.)]\s+/.test(l) ? 'ol' : /^\s*\|.*\|\s*$/.test(l) ? 'table' : /^#{1,4}\s+/.test(l) ? 'h' : 'p'
    if (kind === 'h') { push(); out.push({ kind: 'h', lines: [l.replace(/^#{1,4}\s+/, '')] }); continue }
    if (!cur || cur.kind !== kind) { push(); cur = { kind, lines: [] } }
    cur.lines.push(l)
  }
  push()
  return out
}

export function MarkdownLite({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-neutral-dark">
      {parseBlocks(text).map((b, i) => {
        if (b.kind === 'h') return <p key={i} className="font-bold">{inline(b.lines[0], `h${i}`)}</p>
        if (b.kind === 'ul') return <ul key={i} className="list-disc space-y-1 pl-5">{b.lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ''), `u${i}${j}`)}</li>)}</ul>
        if (b.kind === 'ol') return <ol key={i} className="list-decimal space-y-1 pl-5">{b.lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''), `o${i}${j}`)}</li>)}</ol>
        if (b.kind === 'table') {
          const rows = b.lines.filter(l => l.replace(/[|:\s-]/g, '') !== '')   // drop the ---|--- separator row
          const cells = rows.map(l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim()))
          const [head, ...body] = cells
          return (
            <div key={i} className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full text-sm">
                {head && <thead className="bg-neutral-light"><tr>{head.map((c, j) => <th key={j} className="px-3 py-1.5 text-left font-semibold">{inline(c, `th${i}${j}`)}</th>)}</tr></thead>}
                <tbody>{body.map((r, j) => <tr key={j} className="border-t border-gray-100">{r.map((c, k) => <td key={k} className="px-3 py-1.5">{inline(c, `td${i}${j}${k}`)}</td>)}</tr>)}</tbody>
              </table>
            </div>
          )
        }
        return <p key={i}>{b.lines.map((l, j) => <React.Fragment key={j}>{j > 0 && <br />}{inline(l, `p${i}${j}`)}</React.Fragment>)}</p>
      })}
    </div>
  )
}
