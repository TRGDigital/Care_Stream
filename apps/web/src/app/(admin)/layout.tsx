import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminShell } from '@/components/admin-shell'
import { AuthSessionProvider } from '@/components/auth-session-provider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/chat')

  return (
    <AuthSessionProvider>
      <AdminShell
        userName={session.user.name ?? ''}
        tenantName={session.user.tenantName ?? ''}
      >
        {children}
      </AdminShell>
    </AuthSessionProvider>
  )
}
