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

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (token?.needsBilling) {
    const url = req.nextUrl.clone()
    url.pathname = '/billing'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

// Gated app routes: the (portal) hub + (admin) console, EXCEPT /billing.
export const config = {
  matcher: [
    '/chat/:path*',
    '/cqc/:path*',
    '/progress/:path*',
    '/analytics/:path*',
    '/audits/:path*',
    '/cqc-questions/:path*',
    '/dashboard/:path*',
    '/gaps/:path*',
    '/guides/:path*',
    '/knowledge/:path*',
    '/onboarding/:path*',
    '/policies/:path*',
    '/queries/:path*',
    '/settings/:path*',
    '/staff/:path*',
    '/training/:path*',
  ],
}
