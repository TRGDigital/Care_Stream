'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { clearPlatformToken } from '@/lib/platform-api'
import {
  LayoutDashboard, Building2, BarChart2, BookOpen, FileText, LogOut,
} from 'lucide-react'

const NAV = [
  { href: '/platform/dashboard',   label: 'Dashboard',    Icon: LayoutDashboard },
  { href: '/platform/clients',     label: 'Clients',      Icon: Building2       },
  { href: '/platform/usage',       label: 'Usage',        Icon: BarChart2       },
  { href: '/platform/regulations', label: 'Regulations',  Icon: BookOpen        },
  { href: '/platform/prompts',     label: 'AI Prompts',   Icon: FileText        },
]

export function PlatformShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()

  function handleSignOut() {
    clearPlatformToken()
    router.push('/platform/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-light">
      <aside className="hidden w-56 flex-shrink-0 flex-col bg-white border-r border-gray-200 md:flex">
        <div className="flex h-14 items-center border-b border-gray-200 px-5">
          <div>
            <p className="font-bold text-teal text-sm">CareStreamAI</p>
            <p className="text-xs text-neutral-mid">Platform Console</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Platform navigation">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-l-2 border-teal bg-teal-light text-teal'
                    : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={15} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-gray-200 px-3 py-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 flex-shrink-0 items-center border-b border-gray-200 bg-white px-6">
          <p className="text-sm font-semibold text-neutral-dark">Platform Owner Console</p>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
