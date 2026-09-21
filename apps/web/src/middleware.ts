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

// ── Store app mode. The Android (Trusted Web Activity) and iOS apps open the site with
// ?app=android|ios, remembered in a cookie. Inside the app CareStream is the STAFF HUB only:
// Google Play and the App Store both require digital purchases made in an app to use their own
// billing, so nothing that sells (pricing, shop, register, billing, licences, trial start) may
// be reachable there. An allow-list on purpose, so a page added later stays out of the app
// until someone decides otherwise. ?app=off clears it (for testing on a phone browser).
const APP_COOKIE = 'cs_app'
const APP_ALLOWED = [
  '/chat', '/cqc', '/progress',                                              // the staff hub
  '/login', '/check-email', '/forgot-password', '/reset-password', '/verify-email', '/auth',
  '/privacy', '/terms', '/cookies',                                          // linked from sign-in
  '/app-console',                                                            // "use a browser" notice
]
// The admin console and anything that takes payment: shown the notice rather than bounced to
// the hub, so a manager who signs in to the app is told where the console is.
const APP_CONSOLE = [
  '/dashboard', '/analytics', '/audits', '/cqc-questions', '/gaps', '/guides', '/knowledge',
  '/onboarding', '/policies', '/queries', '/settings', '/staff', '/training', '/billing',
  '/licences', '/group', '/workforce', '/translation-review', '/start', '/platform', '/account',
]

function appMode(req: NextRequest, path: string): NextResponse | null {
  const param = req.nextUrl.searchParams.get('app')
  if (param === 'off') {
    const res = NextResponse.next()
    res.cookies.delete(APP_COOKIE)
    return res
  }
  const platform = param === 'android' || param === 'ios' ? param : req.cookies.get(APP_COOKIE)?.value
  if (platform !== 'android' && platform !== 'ios') return null

  let res: NextResponse | null = null
  if (!matches(path, APP_ALLOWED)) {
    const url = req.nextUrl.clone()
    url.pathname = matches(path, APP_CONSOLE) ? '/app-console' : '/chat'
    url.search = ''
    res = NextResponse.redirect(url)
  }
  if (param === 'android' || param === 'ios') {
    res = res ?? NextResponse.next()
    res.cookies.set(APP_COOKIE, param, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: true })
  }
  return res
}

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

  // ── Store app: hub only (see appMode). Runs before the gates so the app never lands on a
  // billing or trial-start page.
  const app = appMode(req, path)
  if (app) return app

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
