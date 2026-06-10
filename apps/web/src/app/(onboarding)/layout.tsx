// Minimal, full-screen onboarding shell — no console sidebar. Used for the
// "choose your plan / start your trial" step a new tenant sees after verifying
// their email, before they reach the dashboard.

import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { AuthSessionProvider } from '@/components/auth-session-provider'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <AuthSessionProvider session={session}>
      <div className="min-h-screen bg-neutral-50">
        <header className="flex justify-center border-b border-gray-100 bg-white py-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.png" alt="CareStreamAI" className="h-12 w-auto" />
        </header>
        <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-14">{children}</main>
      </div>
    </AuthSessionProvider>
  )
}
