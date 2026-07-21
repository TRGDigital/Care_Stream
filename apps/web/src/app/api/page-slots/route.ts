import { NextRequest, NextResponse } from 'next/server'
import { slotsForPath, getContentSlots } from '@/lib/page-slots'

export const dynamic = 'force-dynamic'

// Returns a page's content sections (slot definitions) + current values, so the SEO tool
// (meta generator) can rewrite each section and push the changes back into content_slots.
// Exposes only the same copy that's already public on the live page — no secrets.
export async function GET(req: NextRequest) {
  const path = (req.nextUrl.searchParams.get('path') || '').trim()
  const defs = path ? slotsForPath(path) : null
  if (!defs) {
    return NextResponse.json(
      { ok: true, supported: false, path, slots: [], overrides: {} },
      { headers: { 'Access-Control-Allow-Origin': '*' } },
    )
  }

  const overrides = await getContentSlots(path)
  const slots = defs.map((d) => {
    const ov = overrides[d.key]
    const overridden = typeof ov === 'string' && ov.trim() !== ''
    return {
      key: d.key,
      label: d.label,
      group: d.group ?? null,
      rich: !!d.rich,
      multiline: !!d.multiline,
      default: d.default,
      value: overridden ? ov : d.default,
      overridden,
    }
  })

  return NextResponse.json(
    { ok: true, supported: true, path, slots, overrides },
    { headers: { 'Access-Control-Allow-Origin': '*' } },
  )
}
