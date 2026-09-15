import { NextRequest, NextResponse } from 'next/server'
import { draftMode, cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Opens an unpublished marketing page for the person holding a valid preview link.
//
// The link is minted by the console (POST /admin/preview), which is platform-admin only, and
// carries a token that names one page and expires in 30 minutes. This route does not judge the
// token: it stores it and turns draft mode on, and the API decides on each content fetch
// whether it is valid. A bad or expired token simply means the page renders as it does for
// everyone else.
//
// Why this exists: every public endpoint returns published rows only, which is right, but it
// meant the only way to see a draft was to publish it. That is backwards for a switchover whose
// point is checking a page before anyone else can, and it already cost us once — eight cluster
// feature pages went live rendering empty bodies, and going live is how we found out.

const COOKIE = 'cs_preview'
const MAX_AGE = 30 * 60

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') ?? ''
  const path = req.nextUrl.searchParams.get('path') ?? ''

  // Only same-site paths. Without this the route is an open redirect that anyone could point
  // at another domain.
  if (!token || !/^\/[A-Za-z0-9/_-]*$/.test(path)) {
    return NextResponse.json({ ok: false, error: 'A token and a page path are required' }, { status: 400 })
  }

  const draft = await draftMode()
  draft.enable()

  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,          // not readable by page scripts
    secure: true,
    sameSite: 'lax',         // survives the redirect below
    path: '/',
    maxAge: MAX_AGE,         // matches the token's own lifetime
  })

  return NextResponse.redirect(new URL(path, req.nextUrl.origin))
}
