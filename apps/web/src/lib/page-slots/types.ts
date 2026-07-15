// "Content slots" make a hard-coded page's copy editable WITHOUT changing its
// design: every headline/paragraph is referenced by a key, its current copy is the
// default (kept in code), and the CMS stores only per-slot overrides. The page
// renders `slot(key)` = override ?? default, so the layout is untouched.

export type SlotDef = {
  key: string
  /** Editor label. */
  label: string
  /** Current copy — shown in the editor pre-filled and used when no override is set. */
  default: string
  /** Value is HTML (supports links) — edited with the rich editor, rendered as HTML. */
  rich?: boolean
  /** Plain text but long — edited with a textarea. */
  multiline?: boolean
  /** Group heading in the editor (e.g. "Hero", "Origin"). */
  group?: string
}

// Build a getter from the manifest defaults + saved overrides.
export function makeSlot(defs: SlotDef[], overrides?: Record<string, string> | null) {
  const defaults: Record<string, string> = {}
  for (const d of defs) defaults[d.key] = d.default
  const ov = overrides ?? {}
  return (key: string): string => {
    const v = ov[key]
    return typeof v === 'string' && v.trim() !== '' ? v : (defaults[key] ?? '')
  }
}
