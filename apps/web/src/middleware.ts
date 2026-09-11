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
// Policies-only tenants bought one-off policies from the shop and have no hub. They
// get /policies and the two pages that serve it — Settings, because the organisation
// details there are what their policies are written from, and Billing for the invoice.
//
// An ALLOW-list rather than a block-list on purpose: this tier should default to
// closed, so a route added later is shut until somebody decides otherwise.
const POLICIES_ONLY_ALLOWED = ['/policies', '/settings', '/billing', '/account', '/start']
// Every console route this tier might try to reach, so the gate above actually runs
// for them rather than only on the training-only list.
const POLICIES_ONLY_BLOCKED_SCAN = ['/dashboard', '/chat', '/staff', '/training', '/licences',
  '/group', '/workforce', '/translation-review', '/analytics', '/queries', '/knowledge',
  '/cqc-questions', '/audits', '/gaps', '/onboarding', '/guides']

const matches = (path: string, list: string[]) => list.some(p => path === p || path.startsWith(p + '/'))

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const path = req.nextUrl.pathname

  // ── Canonical host backstop: apex -> www in a single 308 hop, preserving path + query. Vercel
  // normally handles this at the edge; codifying it here means the canonical host can't silently
  // regress during a migration. Only fires on the bare apex, so it never loops and never touches
  // the demos subdomain or *.vercel.app preview hosts.
  if (host === 'carestreamai.com') {
    const url = req.nextUrl.clone()
    url.protocol = 'https'
    url.host = 'www.carestreamai.com'
    return NextResponse.redirect(url, 308)
  }

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
  if (matches(path, GATED) || matches(path, TRAINING_ONLY_BLOCKED) || matches(path, POLICIES_ONLY_BLOCKED_SCAN)) {
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
    // Policies-only tenants land on /policies and stay there. The sidebar shows the
    // rest locked with an upgrade overlay, so this is the backstop for a typed URL.
    if (token?.tier === 'policies_only' && !matches(path, POLICIES_ONLY_ALLOWED)) {
      const url = req.nextUrl.clone()
      url.pathname = '/policies'
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
