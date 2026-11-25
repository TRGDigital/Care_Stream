// The organisation's brand colour (Settings > Letterhead and company details > Brand colour).
// Pure helpers, no database: normalise what a person typed, check it is readable on white, and swap it into an email.
//   "#0f6" and "0F6" both become "#00FF66"; a colour that is too pale to read on white is refused with a plain message.
// No dashes in anything this file writes to a person.

import { contrast } from '../services/ask-docs/newsletter-design'

export const DEFAULT_BRAND = '#0F766E'   // CareStream teal
export const MIN_CONTRAST = 4.5          // against white, the same bar the designed newsletters use
export const SWATCHES = ['#0F766E', '#1D4E89', '#7C3AED', '#B4411E', '#BE185D', '#15803D', '#B45309', '#334155'] as const

/** "#abc", "abc", "#AABBCC" and " aabbcc " become "#AABBCC". Anything else is null. */
export function normaliseHex(input: unknown): string | null {
  const s = String(input ?? '').trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(s)) return '#' + s.split('').map(c => c + c).join('').toUpperCase()
  if (/^[0-9a-f]{6}$/i.test(s)) return '#' + s.toUpperCase()
  return null
}

export type BrandCheck = { ok: true; value: string | null } | { ok: false; message: string }

/** Empty means "go back to the default". Otherwise it must be a hex colour that reads on white. */
export function validateBrandColour(input: unknown): BrandCheck {
  const raw = String(input ?? '').trim()
  if (!raw) return { ok: true, value: null }
  const h = normaliseHex(raw)
  if (!h) return { ok: false, message: 'That does not look like a colour. Use a hex colour such as #0F766E.' }
  if (contrast(h, '#FFFFFF') < MIN_CONTRAST) return { ok: false, message: 'That colour is too pale to read on white paper or a screen. Please choose a darker one.' }
  return { ok: true, value: h }
}

/** A stored value that is still safe to use (it may have been saved before the rules changed). */
export function usableBrand(v: unknown): string | null {
  const c = validateBrandColour(v)
  return c.ok ? c.value : null
}

/** Staff and family emails use the CareStream purple for the button and the small logo fallback: swap it for the organisation's colour. Nothing else changes. */
export function applyBrandAccent(html: string, brand: string | null | undefined): string {
  const c = usableBrand(brand)
  if (!c || typeof html !== 'string') return html
  return html.replace(/#9B52B5/gi, c)
}
