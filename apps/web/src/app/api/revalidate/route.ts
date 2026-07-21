import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'

export const dynamic = 'force-dynamic'

// On-demand cache purge for a marketing page — called by the SEO tool right after it pushes
// content_slots, so the change goes live in seconds instead of waiting for the ISR window.
// Secret-gated (REVALIDATE_SECRET).
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET
  let path = ''
  let given = ''
  try {
    const body = await req.json()
    path = String(body?.path ?? '').trim()
    given = String(body?.secret ?? '').trim()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 })
  }
  if (!secret || given !== secret) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  if (!path.startsWith('/')) return NextResponse.json({ ok: false, error: 'A page path is required' }, { status: 400 })

  revalidateTag(`slots:${path}`) // busts the cached content_slots fetch
  revalidatePath(path) // regenerates the page
  return NextResponse.json({ ok: true, revalidated: path })
}
