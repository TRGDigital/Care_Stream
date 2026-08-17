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
