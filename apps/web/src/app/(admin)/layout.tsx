import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin-shell'
import { AuthSessionProvider } from '@/components/auth-session-provider'
import { TenantAgentTools } from '@/components/agent/tenant-agent-tools'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/chat')

  return (
    <AuthSessionProvider>
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
