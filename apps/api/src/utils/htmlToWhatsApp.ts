// Converts the HTML responses produced by the RAG pipeline into WhatsApp-compatible
// plain text. WhatsApp supports a small subset of markdown:
//   *bold*  _italic_  ~strikethrough~  ```monospace```
// All other HTML is stripped or converted to readable equivalents.
//
// Long responses are split into multiple chunks (≤ WHATSAPP_CHUNK_CHARS each) by
// splitIntoChunks() so the caller can send them as sequential messages.

const WHATSAPP_CHUNK_CHARS = 1500  // leave headroom below Twilio's 1,600 limit

export function htmlToWhatsApp(html: string): string {
  let text = html

  // Block elements — convert to line-separated text before stripping tags
  text = text.replace(/<\/?(h[1-6])[^>]*>/gi, '\n')           // headings → newlines
  text = text.replace(/<br\s*\/?>/gi, '\n')                    // <br> → newline
  text = text.replace(/<\/p>/gi, '\n\n')                       // </p> → paragraph break
  text = text.replace(/<p[^>]*>/gi, '')                        // <p> opening → nothing
  text = text.replace(/<\/?(ul|ol)[^>]*>/gi, '\n')             // list wrappers → newline
  text = text.replace(/<li[^>]*>/gi, '\n• ')                   // <li> → bullet
  text = text.replace(/<\/li>/gi, '')
  text = text.replace(/<\/?(div|section|article)[^>]*>/gi, '\n')

  // Inline formatting — map to WhatsApp markdown
  text = text.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '*$1*')
  text = text.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '*$1*')
  text = text.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '_$1_')
  text = text.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '_$1_')
  text = text.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '```$1```')

  // Links — keep the text, discard the href
  text = text.replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1')

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&apos;/g, "'")
  text = text.replace(/&nbsp;/g, ' ')

  // Normalise whitespace — collapse 3+ consecutive newlines to 2
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()

  return text
}

// Splits a plain-text WhatsApp string into chunks that each fit within
// WHATSAPP_CHUNK_CHARS. Prefers to break at paragraph boundaries, then line
// breaks, then word boundaries, falling back to a hard cut only if necessary.
export function splitIntoChunks(text: string, maxChars = WHATSAPP_CHUNK_CHARS): string[] {
  if (text.length <= maxChars) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > maxChars) {
    let splitAt = -1

    // 1. Paragraph break
    const paraBreak = remaining.lastIndexOf('\n\n', maxChars)
    if (paraBreak > maxChars * 0.5) {
      splitAt = paraBreak
    }

    // 2. Line break
    if (splitAt === -1) {
      const lineBreak = remaining.lastIndexOf('\n', maxChars)
      if (lineBreak > maxChars * 0.5) {
        splitAt = lineBreak
      }
    }

    // 3. Word boundary
    if (splitAt === -1) {
      const wordBreak = remaining.lastIndexOf(' ', maxChars)
      if (wordBreak > maxChars * 0.5) {
        splitAt = wordBreak
      }
    }

    // 4. Hard cut
    if (splitAt === -1) {
      splitAt = maxChars
    }

    chunks.push(remaining.slice(0, splitAt).trimEnd())
    remaining = remaining.slice(splitAt).trimStart()
  }

  if (remaining.length > 0) {
    chunks.push(remaining)
  }

  return chunks
}
