'use client'

import { SessionProvider } from 'next-auth/react'

// Client-side next-auth session context. Only mounted in the route groups that
// actually use useSession() (auth / admin / portal) — keeps next-auth out of the
// marketing and platform bundles.
export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
