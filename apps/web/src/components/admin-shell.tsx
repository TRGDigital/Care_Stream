'use client'

// §14.7 — Admin dashboard shell: 240px left sidebar + top bar.
// Sidebar collapses to hidden on mobile (nav accessible via top-bar links).

import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard, FileText, Users, BarChart2, TrendingUp, ClipboardCheck, CreditCard, MessageSquare, Settings, BookOpen, ShieldAlert, GraduationCap, ShieldCheck,
  Building2, ChevronDown, Check, Loader2, HelpCircle, ClipboardList,
} from 'lucide-react'
import { createApiClient } from '@/lib/api-client'

const NAV_SECTIONS = [
  {
    heading: 'Overview',
    iconColor: 'text-teal-light',
    items: [
      { href: '/dashboard', label: 'Dashboard',     Icon: LayoutDashboard },
      { href: '/queries',   label: 'Query history', Icon: BarChart2       },
    ],
  },
  {
    heading: 'Content',
    iconColor: 'text-blue-400',
    items: [
      { href: '/policies',  label: 'Policies',      Icon: FileText  },
      { href: '/knowledge', label: 'Knowledge Base', Icon: BookOpen },
    ],
  },
  {
    heading: 'Team',
    iconColor: 'text-purple-400',
    items: [
      { href: '/staff', label: 'Staff', Icon: Users },
    ],
  },
  {
    heading: 'Reporting',
    iconColor: 'text-amber-400',
    items: [
      { href: '/analytics',            label: 'Analytics',      Icon: TrendingUp     },
      { href: '/analytics/cqc-report', label: 'CQC Report',     Icon: ClipboardCheck },
      { href: '/gaps',                 label: 'Policy Gaps',    Icon: ShieldAlert    },
      { href: '/training',             label: 'Training',       Icon: ShieldCheck    },
      { href: '/cqc-questions',        label: 'CQC Staff Prep', Icon: ClipboardList  },
      { href: '/audits',               label: 'Monthly Audits', Icon: ClipboardCheck },
    ],
  },
  {
    heading: 'Admin',
    iconColor: 'text-slate-400',
    items: [
      { href: '/onboarding', label: 'Onboarding',    Icon: GraduationCap },
      { href: '/billing',    label: 'Billing',       Icon: CreditCard    },
      { href: '/settings',   label: 'Settings',      Icon: Settings      },
      { href: '/guides',     label: 'Help & Guides', Icon: HelpCircle    },
    ],
  },
]

interface AdminShellProps {
  userName:   string
  tenantName: string
  children:   React.ReactNode
}

export function AdminShell({ userName, tenantName, children }: AdminShellProps) {
  const pathname        = usePathname()
  const router          = useRouter()
  const { data: session } = useSession()

  const [sites,      setSites]      = useState<any[]>([])
  const [dropOpen,   setDropOpen]   = useState(false)
  const [switching,  setSwitching]  = useState<string | null>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  // Load sites list once the session token is available
  useEffect(() => {
    if (!session?.accessToken) return
    createApiClient(session.accessToken).sites.list()
      .then(d => setSites(d.sites))
      .catch(() => {})
  }, [session?.accessToken])

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleSwitch(targetId: string, targetName: string) {
    if (!session?.accessToken || switching) return
    setSwitching(targetId)
    setDropOpen(false)
    try {
      const result = await createApiClient(session.accessToken).sites.switch(targetId)
      await signIn('credentials', {
        redirect:      false,
        mode:          'switch',
        access_token:  result.access_token,
        refresh_token: result.refresh_token,
        tenant_name:   result.tenant.name,
        user_name:     session.user.name  ?? '',
        user_email:    session.user.email ?? '',
      })
      router.refresh()
    } catch {
      // silent — user stays on current site
    } finally {
      setSwitching(null)
    }
  }

  const multiSite = sites.length > 1

  return (
    <div className="flex h-screen overflow-hidden bg-neutral-light">

      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 flex-col bg-[#1A0830] md:flex print:hidden">
        {/* Logo */}
        <div className="border-b border-white/10 px-5 pb-5 pt-6">
          <img src="/logo-white.png" alt="CareStreamAI" className="h-12 w-auto max-w-full object-contain" />
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Admin Portal
          </p>
        </div>

        {/* Nav */}
        <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
          {NAV_SECTIONS.map(({ heading, iconColor, items }) => {
            const allHrefs = NAV_SECTIONS.flatMap(s => s.items.map(i => i.href))
            const hasExactMatch = allHrefs.some(href => href === pathname)
            return (
              <div key={heading} className="mb-4">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  {heading}
                </p>
                {items.map(({ href, label, Icon }) => {
                  const active = pathname === href || (!hasExactMatch && pathname.startsWith(href + '/'))
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={clsx(
                        'mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active
                          ? 'border-l-2 border-teal-light bg-white/10 text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon size={16} className={active ? 'text-teal-light' : iconColor} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Back to portal */}
        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/chat"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white"
          >
            <MessageSquare size={16} className="text-white/50" />
            Chat portal
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 print:hidden">

          {/* Site name / switcher */}
          {multiSite ? (
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen(v => !v)}
                className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-semibold text-neutral-dark hover:bg-neutral-light"
              >
                <Building2 size={14} className="text-teal" />
                {tenantName}
                <ChevronDown size={13} className={`text-neutral-mid transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
              </button>

              {dropOpen && (
                <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                  <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-neutral-mid">
                    Your sites
                  </p>
                  {sites.map(s => (
                    <button
                      key={s.id}
                      onClick={() => !s.is_current && handleSwitch(s.id, s.name)}
                      disabled={s.is_current || !!switching}
                      className={clsx(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                        s.is_current
                          ? 'cursor-default font-medium text-teal'
                          : 'text-neutral-dark hover:bg-neutral-light',
                      )}
                    >
                      {switching === s.id ? (
                        <Loader2 size={14} className="animate-spin text-neutral-mid" />
                      ) : s.is_current ? (
                        <Check size={14} className="text-teal" />
                      ) : (
                        <Building2 size={14} className="text-neutral-mid" />
                      )}
                      <span className="flex-1 truncate text-left">{s.name}</span>
                      {!s.is_root && (
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">site</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-gray-100 px-3 pb-1 pt-2">
                    <Link
                      href="/settings"
                      onClick={() => setDropOpen(false)}
                      className="text-xs text-neutral-mid hover:text-teal"
                    >
                      Manage sites →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm font-semibold text-neutral-dark">{tenantName}</p>
          )}

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
