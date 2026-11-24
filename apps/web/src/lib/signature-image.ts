// Pure picture helpers for signatures, so they can be tested without a browser. They work on raw RGBA pixels (the same layout as canvas ImageData).
//   whiteToTransparent  a photo of a signature on paper: near white becomes see through, darker ink stays, with a soft edge so the line does not look jagged
//   trimBounds          the box that holds the ink, plus a small margin, so the signature is not lost in empty space
//   fitWithin           scale a size down to fit a box (never up)

export interface Pixels { data: Uint8ClampedArray | number[]; width: number; height: number }

/** Makes light pixels transparent. `low` is the brightness below which a pixel is fully ink; `high` is the brightness above which it is fully paper. In between it fades. */
export function whiteToTransparent(p: Pixels, low = 150, high = 235): void {
  const d = p.data as any
  for (let i = 0; i < p.width * p.height; i++) {
    const o = i * 4
    const a = d[o + 3]
    if (a === 0) continue
    const lum = 0.299 * d[o] + 0.587 * d[o + 1] + 0.114 * d[o + 2]
    const keep = lum <= low ? 1 : lum >= high ? 0 : (high - lum) / (high - low)
    d[o + 3] = Math.round(a * keep)
    // Ink is darkened a little so a faint pencil or a grey scan still prints clearly.
    if (keep > 0) { const k = 0.55; d[o] = Math.round(d[o] * k); d[o + 1] = Math.round(d[o + 1] * k); d[o + 2] = Math.round(d[o + 2] * k) }
  }
}

/** The box around every pixel that is not (nearly) transparent, with a margin. Null when there is no ink. */
export function trimBounds(p: Pixels, margin = 6, minAlpha = 24): { x: number; y: number; w: number; h: number } | null {
  const d = p.data as any
  let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1
  for (let y = 0; y < p.height; y++) for (let x = 0; x < p.width; x++) {
    if (d[(y * p.width + x) * 4 + 3] >= minAlpha) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
  }
  if (x1 < 0) return null
  const x = Math.max(0, x0 - margin), y = Math.max(0, y0 - margin)
  return { x, y, w: Math.min(p.width, x1 + margin + 1) - x, h: Math.min(p.height, y1 + margin + 1) - y }
}

export function fitWithin(w: number, h: number, maxW: number, maxH = Infinity): { w: number; h: number } {
  const k = Math.min(1, maxW / w, maxH / h)
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/** True when the ink is a sensible amount: not an empty pad, not a speck. */
export function hasEnoughInk(p: Pixels, minPixels = 40, minAlpha = 100): boolean {
  const d = p.data as any
  let n = 0
  for (let i = 0; i < p.width * p.height; i++) if (d[i * 4 + 3] >= minAlpha && ++n >= minPixels) return true
  return false
}
