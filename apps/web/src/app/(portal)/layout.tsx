import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PortalNav } from '@/components/portal-nav'
import { AuthSessionProvider } from '@/components/auth-session-provider'
import { TenantAgentTools } from '@/components/agent/tenant-agent-tools'
import { PwaRegister } from '@/components/pwa/pwa-register'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { NotificationsOptIn } from '@/components/pwa/notifications-optin'
import { HubPrefsApplier } from '@/components/hub/hub-prefs-applier'
import type { Metadata } from 'next'

// Logged-in app route: never meant for search results. robots.txt already disallows these paths,
// but a crawler that is blocked can't read this tag, and one that learns the URL elsewhere (a
// link, a share) still sees a page indexed by the root layout default. This keeps it out.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <AuthSessionProvider session={session}>
      <HubPrefsApplier />
      <TenantAgentTools />
      <PwaRegister />
      <InstallPrompt />
      <NotificationsOptIn />
      <div className="flex h-[100dvh] flex-col bg-neutral-light">
        <PortalNav
          userName={session.user.name ?? ''}
          userRole={session.user.role}
        />
        <main className="flex flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </AuthSessionProvider>
  )
}
