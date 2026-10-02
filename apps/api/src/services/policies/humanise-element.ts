// The curated required_elements are written as instructions to the WRITER ("Policy
// must designate a named Safeguarding Lead…"), which is right for the verification
// gate and wrong for a buyer reading a sales page. This turns each one into a
// statement about the document they are buying ("Designates a named Safeguarding
// Lead…") for DISPLAY ONLY: the stored elements are never touched, because the gate
// compares against them.
//
// Elements already written as noun phrases ("A process for…", "Definition and
// recognition criteria…") read correctly as they are and are left alone.
function thirdPerson(verb: string): string {
  const v = verb.toLowerCase()
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`      // specify → specifies
  if (/(s|sh|ch|x|z)$/.test(v)) return `${v}es`                // address → addresses
  return `${v}s`                                                // require → requires
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Verbs that end in "ly" and so would otherwise be mistaken for adverbs —
// "Policy must comply with…" must not become "Comply withs…".
const LY_VERBS = new Set(['comply', 'apply', 'supply', 'imply', 'multiply', 'reply', 'rely'])

export function humaniseElement(element: string): string {
  const text = String(element ?? '').trim()
  const m = text.match(/^(?:the\s+)?polic(?:y|ies)\s+must\s+(.*)$/is)
  if (!m) return text

  // "also" and "not" appear in either order in the real data.
  let rest = m[1].trim()
  let negated = false
  for (;;) {
    const before = rest
    rest = rest.replace(/^also\s+/i, '')
    const neg = rest.match(/^not\s+/i)
    if (neg) { negated = true; rest = rest.slice(neg[0].length) }
    if (rest === before) break
  }

  const words = rest.split(/\s+/)
  let adverb = ''
  if (words.length > 1 && /ly$/i.test(words[0]) && !LY_VERBS.has(words[0].toLowerCase())) {
    adverb = (words.shift() as string).toLowerCase()
  }
  const verb = (words.shift() ?? '').toLowerCase()
  if (!/^[a-z]{2,}$/.test(verb)) return text

  // A paired verb straight after the first ("appoint or identify") is conjugated too,
  // so it does not read as "Appoints or identify".
  if (words.length > 1 && /^(or|and)$/i.test(words[0]) && /^[a-z]{2,}$/i.test(words[1])) {
    words[1] = thirdPerson(words[1])
  }

  const tail = words.join(' ')
  // A prohibition reads naturally with the bare verb: "Does not require staff to…"
  // rather than "Nots require…".
  const head = negated
    ? `Does not ${adverb ? `${adverb} ` : ''}${verb}`
    : adverb
      ? `${cap(adverb)} ${thirdPerson(verb)}`
      : cap(thirdPerson(verb))
  return `${head}${tail ? ` ${tail}` : ''}`.replace(/\s+/g, ' ').trim()
}
