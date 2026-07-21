// Renders the audit AI recommendations, which come back as light markdown (## headings,
// **bold**, - bullets), as clean formatted HTML using the shared .policy-content styles —
// instead of dumping the raw markdown into a <pre>.

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inline(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
}

export function auditRecsToHtml(md: string): string {
  const lines = (md || '').replace(/\r/g, '').split('\n')
  const out: string[] = []
  let listOpen = false
  const closeList = () => { if (listOpen) { out.push('</ul>'); listOpen = false } }

  for (const raw of lines) {
    const t = raw.trim()
    if (!t) { closeList(); continue }
    if (/^([-*_]\s*){3,}$/.test(t) || /^─{3,}$/.test(t)) { closeList(); continue } // skip horizontal rules

    let m: RegExpMatchArray | null
    if ((m = t.match(/^#{4,}\s+(.*)$/)))        { closeList(); out.push(`<h5>${inline(m[1])}</h5>`); continue }
    if ((m = t.match(/^###\s+(.*)$/)))          { closeList(); out.push(`<h4>${inline(m[1])}</h4>`); continue }
    if ((m = t.match(/^#{1,2}\s+(.*)$/)))       { closeList(); out.push(`<h3>${inline(m[1])}</h3>`); continue }
    // A whole line that is only bold text is a section heading (the platform prompt uses
    // **IMMEDIATE ACTIONS REQUIRED** style headings rather than ## ).
    if ((m = t.match(/^\*\*(.+?)\*\*[:.]?$/)))  { closeList(); out.push(`<h3>${esc(m[1])}</h3>`); continue }
    if ((m = t.match(/^[-*•]\s+(.*)$/)) || (m = t.match(/^\d+[.)]\s+(.*)$/))) {
      if (!listOpen) { out.push('<ul>'); listOpen = true }
      out.push(`<li>${inline(m[1])}</li>`); continue
    }
    closeList()
    out.push(`<p>${inline(t)}</p>`)
  }
  closeList()
  return out.join('\n')
}

export function AuditRecs({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div
      className={`policy-content text-sm leading-relaxed text-neutral-dark ${className}`}
      dangerouslySetInnerHTML={{ __html: auditRecsToHtml(text) }}
    />
  )
}
