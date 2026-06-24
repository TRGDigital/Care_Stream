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

// Console routes a training-only (gateway-tier) tenant cannot use — the full-CareStream
// features. They keep Dashboard, Staff, Training, Analytics, Settings + the hub.
// NB: /billing is intentionally NOT blocked — training-only clients use it to see
// what they've purchased and download receipts.
const TRAINING_ONLY_BLOCKED = [
  '/policies', '/knowledge', '/queries', '/cqc-questions', '/audits', '/gaps',
  '/onboarding', '/guides', '/analytics/cqc-report',
]
const matches = (path: string, list: string[]) => list.some(p => path === p || path.startsWith(p + '/'))

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

  // ── Auth-gated routes: card-up-front billing gate + training-only tier gate.
  if (matches(path, GATED) || matches(path, TRAINING_ONLY_BLOCKED)) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    // Card-up-front trial hard gate (existing behaviour, gated app routes only).
    if (token?.needsBilling && matches(path, GATED)) {
      const url = req.nextUrl.clone()
      url.pathname = '/start'
      url.search = ''
      return NextResponse.redirect(url)
    }
    // Training-only tenants can't reach the full-CareStream console routes.
    if (token?.tier === 'training_only' && matches(path, TRAINING_ONLY_BLOCKED)) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
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
