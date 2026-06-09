'use client'

import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { SiteImage } from '@/components/site-image'

interface Props {
  userName: string
  userRole: 'admin' | 'staff'
}

export function PortalNav({ userName, userRole }: Props) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const pathname = usePathname()
  const [pendingCqc, setPendingCqc] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    createApiClient(token).cqcQuestions.myDeliveries()
      .then(res => setPendingCqc(res.deliveries.filter((d: any) => d.status === 'pending').length))
      .catch(() => {})
  }, [token])

  // Close the mobile menu on navigation.
  useEffect(() => { setOpen(false) }, [pathname])

  const links = [
    { href: '/chat',     label: 'Chat Hub'    },
    { href: '/progress', label: 'My Progress' },
    { href: '/chat?view=cqc', label: 'CQC Prep', badge: pendingCqc },
    ...(userRole === 'admin' ? [{ href: '/dashboard', label: 'Admin' }] : []),
  ]

  return (
    <header className="relative flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:h-20 md:px-6">
      <Link href="/chat">
        <SiteImage src="/logo-color.png" alt="CareStreamAI" className="h-9 w-auto md:h-16" />
      </Link>

      {/* Desktop nav */}
      <nav className="hidden items-center gap-5 md:flex">
        {links.map(l => (
          <Link key={l.href} href={l.href} className="flex items-center gap-1.5 text-sm font-medium text-neutral-mid hover:text-teal">
            {l.label}
            {!!l.badge && l.badge > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{l.badge}</span>
            )}
          </Link>
        ))}
        <span className="text-sm text-neutral-mid">{userName}</span>
        <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm font-medium text-neutral-mid hover:text-neutral-dark">
          Sign out
        </button>
      </nav>

      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="relative rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark md:hidden"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
        {!open && pendingCqc > 0 && <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-rose-500" />}
      </button>

      {/* Mobile dropdown menu */}
      {open && (
        <>
          <div className="fixed inset-0 top-14 z-40 bg-black/20 md:hidden" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 right-0 top-full z-50 border-b border-gray-200 bg-white py-2 shadow-lg md:hidden">
            {links.map(l => (
              <Link key={l.href} href={l.href} className="flex items-center justify-between px-5 py-3 text-sm font-medium text-neutral-dark hover:bg-neutral-light">
                <span>{l.label}</span>
                {!!l.badge && l.badge > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{l.badge}</span>
                )}
              </Link>
            ))}
            <div className="mt-1 flex items-center justify-between border-t border-gray-100 px-5 pt-3">
              <span className="truncate text-sm text-neutral-mid">{userName}</span>
              <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-sm font-medium text-teal">
                Sign out
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  )
}
