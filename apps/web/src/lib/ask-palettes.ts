// The colour sets offered for a newsletter, for the swatch strip on the colour option cards. These mirror the server list (apps/api newsletter-edit.ts PALETTES); a test keeps them equal.
export const NEWSLETTER_PALETTES: Array<{ id: string; label: string; accent: string }> = [
  { id: 'teal', label: 'CareStream teal', accent: '#0F766E' },
  { id: 'ocean', label: 'Ocean blue', accent: '#1D4E89' },
  { id: 'forest', label: 'Forest green', accent: '#15803D' },
  { id: 'plum', label: 'Plum', accent: '#7C3AED' },
  { id: 'berry', label: 'Berry', accent: '#BE185D' },
  { id: 'terracotta', label: 'Terracotta', accent: '#B4411E' },
  { id: 'bronze', label: 'Bronze', accent: '#B45309' },
  { id: 'slate', label: 'Slate', accent: '#334155' },
]
/** The swatch colours for one colour option (a palette id); brand and category have no fixed colour on the screen, so they show a neutral strip with their name. */
export const paletteAccent = (id: string | null | undefined): string | null => NEWSLETTER_PALETTES.find(p => p.id === String(id ?? '').toLowerCase())?.accent ?? null
