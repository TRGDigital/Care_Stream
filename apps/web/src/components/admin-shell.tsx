'use client'

// §14.7 — Admin dashboard shell: 240px left sidebar + top bar.
// Sidebar collapses to hidden on mobile (nav accessible via top-bar links).

import { signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import {
  LayoutDashboard, FileText, Users, BarChart2, TrendingUp, ClipboardCheck, CreditCard, MessageSquare, Settings, BookOpen,
} from 'lucide-react'

const NAV = [
  { href: '/dashboard',             label: 'Dashboard',       Icon: LayoutDashboard },
  { href: '/policies',              label: 'Policies',        Icon: FileText        },
  { href: '/knowledge',             label: 'Knowledge Base',  Icon: BookOpen        },
  { href: '/staff',                 label: 'Staff',           Icon: Users           },
  { href: '/queries',               label: 'Query history',   Icon: BarChart2       },
  { href: '/analytics',             label: 'Analytics',       Icon: TrendingUp      },
  { href: '/analytics/cqc-report',  label: 'CQC Report',      Icon: ClipboardCheck  },
  { href: '/billing',               label: 'Billing',         Icon: CreditCard      },
  { href: '/settings',              label: 'Settings',        Icon: Settings        },
]

interface AdminShellProps {
  userName:   string
  tenantName: string
  children:   React.ReactNode
}

export function AdminShell({ userName, tenantName, children }: AdminShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-light">

      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col bg-neutral-light md:flex print:hidden">
        {/* Logo */}
        <div className="flex h-14 items-center border-b border-gray-200 bg-white px-5">
          <span className="font-bold text-teal">CareStreamAI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
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
                    : 'text-neutral-mid hover:bg-white hover:text-neutral-dark',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Back to portal */}
        <div className="border-t border-gray-200 px-3 py-3">
          <Link
            href="/chat"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-mid hover:bg-white hover:text-neutral-dark"
          >
            <MessageSquare size={16} />
            Chat portal
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 print:hidden">
          <p className="text-sm font-semibold text-neutral-dark">{tenantName}</p>
          <div className="flex items-center gap-5">
            <span className="text-sm text-neutral-mid">{userName}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm font-medium text-neutral-mid hover:text-neutral-dark"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>

    </div>
  )
}
