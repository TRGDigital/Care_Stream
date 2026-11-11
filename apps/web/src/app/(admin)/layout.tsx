import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin-shell'
import { AuthSessionProvider } from '@/components/auth-session-provider'
import { TenantAgentTools } from '@/components/agent/tenant-agent-tools'
import type { Metadata } from 'next'

// Logged-in app route: never meant for search results. robots.txt already disallows these paths,
// but a crawler that is blocked can't read this tag, and one that learns the URL elsewhere (a
// link, a share) still sees a page indexed by the root layout default. This keeps it out.
export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/chat')

  return (
    <AuthSessionProvider session={session}>
      <TenantAgentTools />
      <AdminShell
        userName={session.user.name ?? ''}
        tenantName={session.user.tenantName ?? ''}
      >
        {children}
      </AdminShell>
    </AuthSessionProvider>
  )
}
