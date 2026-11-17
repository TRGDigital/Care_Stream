// "This is me" chat: tidy the way an answer is laid out.
//
// Families and staff often write a profile with bullet characters, asterisks or numbering. The assistant is told to answer in
// HTML, but it sometimes copies what it was given, so the hub received plain text such as "**Favourite meals:** • Fish and chips • Roast beef".
// The hub shows that as one run of text with the asterisks visible. These two functions make sure staff always see a proper
// layout, whatever the source looked like:
//
//   tidyResidentSource()   before the model sees a profile: bullets become one per line, so the structure is clear
//   formatResidentAnswer() after the model answers: any bullets, bold markers, numbering or headings become real HTML

const BULLET = /^\s*(?:[•▪◦·‣⁃–]|-(?!-)|\*(?!\*))\s+/
const NUMBERED = /^\s*\d{1,2}[.)]\s+/

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Put each bullet on its own line and each bold "Heading:" on a new line, so a list that was written inline is still a list. */
function splitInline(text: string): string {
  return text
    .replace(/[ \t]+([•▪◦‣])[ \t]+/g, '\n$1 ')            // "... food • Roast beef • Pie" -> separate lines
    .replace(/([^\n])[ \t]+(\*\*[^*\n]{2,60}:\*\*)/g, '$1\n$2')                // "... done. **Breakfast:** ..." -> heading on its own line
}

/** Inline marks: **bold** and *italic*. Applied to text that is already safe HTML. */
function inlineMarks(html: string): string {
  return html
    .replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g, '$1<em>$2</em>')
}

/** Lines of (already safe) text -> paragraphs, bullet lists and numbered lists. */
function blocks(lines: string[]): string {
  const out: string[] = []
  let list: 'ul' | 'ol' | null = null
  const close = () => { if (list) { out.push(`</${list}>`); list = null } }
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) { close(); continue }
    if (BULLET.test(line)) {
      if (list !== 'ul') { close(); out.push('<ul>'); list = 'ul' }
      out.push(`<li>${inlineMarks(line.replace(BULLET, ''))}</li>`)
    } else if (NUMBERED.test(line)) {
      if (list !== 'ol') { close(); out.push('<ol>'); list = 'ol' }
      out.push(`<li>${inlineMarks(line.replace(NUMBERED, ''))}</li>`)
    } else {
      close()
      out.push(`<p>${inlineMarks(line)}</p>`)
    }
  }
  close()
  return out.join('')
}

/** Plain text or markdown in, safe HTML out. */
function fromPlain(text: string): string {
  return blocks(splitInline(escapeHtml(text)).split('\n'))
}

/** Answer text that is already HTML but still has stray markers: fix the paragraphs that hold bullets, then the inline marks. */
function fixHtml(html: string): string {
  const fixed = html.replace(/<p>([\s\S]*?)<\/p>/gi, (whole, inner: string) => {
    const hasBullets = /(^|\s)[•▪◦‣]\s/.test(inner) || /\n\s*(?:[-*–]\s|\d{1,2}[.)]\s)/.test(inner)
    if (!hasBullets) return whole
    return blocks(splitInline(inner).split('\n'))
  })
  // Marks inside tags the model already wrote (for example <li>**Tea**</li>).
  return inlineMarks(fixed)
}

/** The answer as clean HTML: paragraphs, bold, and real bullet lists. */
export function formatResidentAnswer(input: string): string {
  let t = (input ?? '').replace(/\r\n/g, '\n').trim()
  if (!t) return t
  const fence = t.match(/^```(?:html|markdown|md)?\s*([\s\S]*?)\s*```$/)
  if (fence) t = fence[1].trim()
  return /<(p|ul|ol|li|h[1-6]|br)\b/i.test(t) ? fixHtml(t) : fromPlain(t)
}

/** A profile or family answer written with assorted bullet marks: one bullet per line, written the same way. */
export function tidyResidentSource(text: string): string {
  if (!text) return text
  return splitInline(text.replace(/\r\n/g, '\n'))
    .split('\n')
    .map(l => (BULLET.test(l) ? l.replace(BULLET, '- ') : l))
    .join('\n')
}
