// The brand colour in Settings: the same rules the server applies (apps/api/src/lib/brand-colour.ts), so the screen can say what is wrong as someone types.
// The server checks it again on save.

export const DEFAULT_BRAND = '#0F766E'
export const MIN_CONTRAST = 4.5

export function normaliseHex(input: string): string | null {
  const s = String(input ?? '').trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(s)) return '#' + s.split('').map(c => c + c).join('').toUpperCase()
  if (/^[0-9a-f]{6}$/i.test(s)) return '#' + s.toUpperCase()
  return null
}
function luminance(h: string): number {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
  const n = parseInt(h.slice(1), 16)
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255)
}
export const contrastOnWhite = (h: string) => 1.05 / (luminance(h) + 0.05)

/** '' = the default. Otherwise a message when the colour cannot be used, or null when it is fine. */
export function brandProblem(input: string): string | null {
  if (!input.trim()) return null
  const h = normaliseHex(input)
  if (!h) return 'Use a hex colour such as #0F766E.'
  if (contrastOnWhite(h) < MIN_CONTRAST) return 'That colour is too pale to read on white. Please choose a darker one.'
  return null
}
