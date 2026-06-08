'use client'

import { SessionProvider } from 'next-auth/react'
import type { Session } from 'next-auth'

// Client-side next-auth session context. Only mounted in the route groups that
// actually use useSession() (auth / admin / portal) — keeps next-auth out of the
// marketing and platform bundles.
//
// `session` is the server-resolved session (from getServerSession in the layout).
// Passing it here means useSession() returns it synchronously on the very first
// client render — no /api/auth/session round-trip — so session-gated data effects
// (sidebar counts, saved policies, languages) can fire immediately instead of
// after a delay, removing the staggered "pop-in" on the hub.
export function AuthSessionProvider({ children, session }: { children: React.ReactNode; session?: Session | null }) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
