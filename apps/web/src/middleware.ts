// Card-up-front trial hard gate. A brand-new tenant that has verified their email
// but not yet added a card (needsBilling, carried in the NextAuth JWT) is redirected
// to /billing and cannot reach the hub or console until they start their trial.
//
// Fail-open by design: logged-out visitors and exempt tenants (active / already on a
// Stripe subscription) have no needsBilling claim and pass straight through. /billing
// itself is NOT matched, so there is no redirect loop.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Gated app routes (the (portal) hub + (admin) console) for the billing gate.
const GATED = [
  '/chat', '/cqc', '/progress', '/analytics', '/audits', '/cqc-questions',
  '/dashboard', '/gaps', '/guides', '/knowledge', '/onboarding', '/policies',
  '/queries', '/settings', '/staff', '/training',
]

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const path = req.nextUrl.pathname

  // ── Landing page subdomain: demos.carestreamai.com/[campaign] -> /lp/[campaign]
  // Query string (UTMs, gclid, fbclid) is preserved by the clone.
  if (host.startsWith('demos.')) {
    if (path === '/' || path === '') {
      return NextResponse.redirect('https://www.carestreamai.com')
    }
    if (!path.startsWith('/lp/')) {
      const url = req.nextUrl.clone()
      url.pathname = `/lp${path}`
      return NextResponse.rewrite(url)
    }
    return NextResponse.next()
  }

  // ── Card-up-front trial hard gate (existing behaviour, gated app routes only).
  if (GATED.some(p => path === p || path.startsWith(p + '/'))) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (token?.needsBilling) {
      const url = req.nextUrl.clone()
      url.pathname = '/start'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

// Run on everything except Next internals, the web API, and static files.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|.*\\.[\\w]+$).*)'],
}
