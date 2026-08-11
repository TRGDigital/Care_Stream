// Split a blog post's HTML body into (slots + 1) chunks at paragraph boundaries near evenly-spaced
// positions, so CTAs can be woven in between. Cuts only ever fall right after a top-level </p>, so
// no element is broken. Returns [html] unchanged when the post is too short to split cleanly.
export function splitHtmlForCtas(html: string, slots = 2): string[] {
  const ends: number[] = []
  const re = /<\/p>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) ends.push(m.index + m[0].length)

  const total = html.length
  // Need enough paragraphs, and enough length, to place cuts with breathing room.
  if (ends.length < slots + 2 || total < 1500) return [html]

  const minPos = total * 0.15
  const maxPos = total * 0.85
  const minGap = (total / (slots + 1)) * 0.6 // keep CTAs from bunching up

  const cuts: number[] = []
  for (let k = 1; k <= slots; k++) {
    const target = (total * k) / (slots + 1)
    let best = -1
    let bestDist = Infinity
    for (const e of ends) {
      if (e < minPos || e > maxPos) continue
      if (cuts.some((c) => Math.abs(c - e) < minGap)) continue
      const dist = Math.abs(e - target)
      if (dist < bestDist) {
        bestDist = dist
        best = e
      }
    }
    if (best >= 0) cuts.push(best)
  }
  if (!cuts.length) return [html]

  cuts.sort((a, b) => a - b)
  const parts: string[] = []
  let prev = 0
  for (const c of cuts) {
    parts.push(html.slice(prev, c))
    prev = c
  }
  parts.push(html.slice(prev))
  return parts
}
