import { NextRequest, NextResponse } from 'next/server'
import { draftMode, cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Leaves preview. The token expires on its own after 30 minutes, but someone checking a page
// should be able to get back to what a visitor sees without waiting or clearing cookies.
export async function GET(req: NextRequest) {
  const draft = await draftMode()
  draft.disable()
  const jar = await cookies()
  jar.delete('cs_preview')

  const path = req.nextUrl.searchParams.get('path')
  const target = path && /^\/[A-Za-z0-9/_-]*$/.test(path) ? path : '/'
  return NextResponse.redirect(new URL(target, req.nextUrl.origin))
}
