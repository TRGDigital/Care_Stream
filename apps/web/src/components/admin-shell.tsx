'use client'

// §14.7 — Admin dashboard shell: 240px left sidebar + top bar.
// Sidebar collapses to hidden on mobile (nav accessible via top-bar links).

import { signIn, signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SiteImage } from '@/components/site-image'
import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import {
  LayoutDashboard, FileText, Users, BarChart2, TrendingUp, ClipboardCheck, CreditCard, MessageSquare, Settings, BookOpen, ShieldAlert, GraduationCap, ShieldCheck,
  Building2, ChevronDown, Check, Loader2, HelpCircle, ClipboardList, Menu, X, Lock, KeyRound, BadgeCheck,
  PanelLeftClose, PanelLeftOpen, Languages,
} from 'lucide-react'
import { createApiClient } from '@/lib/api-client'
import { usePlanFeatures, hasFeature } from '@/lib/use-plan-features'
import { pageCache } from '@/lib/page-cache'

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
      { href: '/workforce', label: 'Compliance', Icon: BadgeCheck, enterprise: true },
      { href: '/translation-review', label: 'Translation Review', Icon: Languages },
    ],
  },
  {
    heading: 'Reporting',
    iconColor: 'text-amber-400',
    items: [
      { href: '/analytics',            label: 'Analytics',    Icon: TrendingUp     },
      { href: '/analytics/cqc-report', label: 'CQC Reports',  Icon: ClipboardCheck },
      { href: '/gaps',                 label: 'Policy Gaps Analysis', Icon: ShieldAlert    },
    ],
  },
  {
    heading: 'Tools',
    iconColor: 'text-green-400',
    items: [
      { href: '/training',      label: 'Training',         Icon: ShieldCheck    },
      { href: '/cqc-questions', label: 'CQC Staff Prep',   Icon: ClipboardList  },
      { href: '/audits',        label: 'Monthly Audits',   Icon: ClipboardCheck },
      { href: '/onboarding',    label: 'Staff Onboarding', Icon: GraduationCap  },
    ],
  },
  {
    heading: 'Admin',
    iconColor: 'text-slate-400',
    items: [
      { href: '/billing',    label: 'Billing',       Icon: CreditCard },
      { href: '/settings',   label: 'Settings',      Icon: Settings   },
      { href: '/guides',     label: 'Help & Guides', Icon: HelpCircle },
    ],
  },
]

// Nav a training-only (gateway-tier) tenant can use. Everything else is shown
// greyed with an "Unlock with CareStream" prompt (the upsell). /licences is added
// once that page exists.
const TRAINING_ONLY_NAV = new Set(['/dashboard', '/group', '/staff', '/training', '/analytics', '/settings', '/licences', '/billing'])

interface AdminShellProps {
  userName:   string
  tenantName: string
  children:   React.ReactNode
}

export function AdminShell({ userName, tenantName, children }: AdminShellProps) {
  const pathname        = usePathname()
  const router          = useRouter()
  const { data: session } = useSession()
  const trainingOnly = session?.user?.tier === 'training_only'
  const { features } = usePlanFeatures()
  const hasWorkforce = hasFeature(features, 'has_workforce_compliance')

  const [sites,      setSites]      = useState<any[]>([])
  const [dropOpen,   setDropOpen]   = useState(false)
  const [switching,  setSwitching]  = useState<string | null>(null)
  const [mobileNav,  setMobileNav]  = useState(false)
  const [collapsed,  setCollapsed]  = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Restore the collapsed-sidebar preference once, on mount (desktop only).
  useEffect(() => {
    try { if (localStorage.getItem('cs-admin-sidebar-collapsed') === '1') setCollapsed(true) } catch {}
  }, [])
  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem('cs-admin-sidebar-collapsed', next ? '1' : '0') } catch {}
      return next
    })
  }

  // Close the mobile nav drawer whenever the route changes.
  useEffect(() => { setMobileNav(false) }, [pathname])

  // Close the mobile nav drawer on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setMobileNav(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

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
      pageCache.clear()  // drop the previous site's cached page data
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

      {/* Sidebar (desktop / tablet ≥ md) */}
      <aside className={clsx(
        'hidden flex-shrink-0 flex-col bg-[#1A0830] transition-[width] duration-200 md:flex print:hidden',
        collapsed ? 'w-16' : 'w-60',
      )}>
        <SidebarContent pathname={pathname} trainingOnly={trainingOnly} multiSite={multiSite} hasWorkforce={hasWorkforce} collapsed={collapsed} />
      </aside>

      {/* Sidebar drawer (mobile < md) */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 max-w-[82%] flex-col bg-[#1A0830] shadow-2xl">
            <button
              onClick={() => setMobileNav(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent pathname={pathname} trainingOnly={trainingOnly} multiSite={multiSite} hasWorkforce={hasWorkforce} onNavigate={() => setMobileNav(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6 print:hidden">

          <div className="flex min-w-0 items-center gap-2.5">
            {/* Hamburger — opens the nav drawer on mobile */}
            <button
              onClick={() => setMobileNav(true)}
              aria-label="Open navigation menu"
              className="-ml-1 rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark md:hidden"
            >
              <Menu size={20} />
            </button>

            {/* Collapse / expand the sidebar (desktop only) */}
            <button
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="-ml-1 hidden rounded-md p-1.5 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark md:inline-flex"
            >
              {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>

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
            <p className="truncate text-sm font-semibold text-neutral-dark">{tenantName}</p>
          )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-4 md:gap-5">
            <span className="hidden text-sm text-neutral-mid sm:inline">{userName}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm font-medium text-neutral-mid hover:text-neutral-dark"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

    </div>
  )
}

// Sidebar contents — shared by the desktop sidebar and the mobile drawer.
function SidebarContent({ pathname, trainingOnly, multiSite, hasWorkforce, collapsed, onNavigate }: { pathname: string; trainingOnly?: boolean; multiSite?: boolean; hasWorkforce?: boolean; collapsed?: boolean; onNavigate?: () => void }) {
  // Training-only tenants get a Licences item (where they allocate what they bought).
  let sections = trainingOnly
    ? NAV_SECTIONS.map(s => s.heading === 'Admin'
        ? { ...s, items: [{ href: '/licences', label: 'Licences', Icon: KeyRound }, ...s.items] }
        : s)
    : NAV_SECTIONS
  // Multi-site (group) accounts get a Group console at the top of Overview.
  if (multiSite) {
    sections = sections.map(s => s.heading === 'Overview'
      ? { ...s, items: [{ href: '/group', label: 'Group', Icon: Building2 }, ...s.items] }
      : s)
  }
  const allHrefs = sections.flatMap(s => s.items.map(i => i.href))
  const hasExactMatch = allHrefs.some(href => href === pathname)

  // Instant label tooltip for the collapsed rail. Fixed-positioned to the
  // viewport so it isn't clipped by the sidebar's own scroll/overflow.
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null)
  const tipProps = (label: string) => collapsed ? {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      setTip({ label, top: r.top + r.height / 2 })
    },
    onMouseLeave: () => setTip(null),
  } : {}

  return (
    <>
      {/* Logo */}
      <div className={clsx('border-b border-white/10', collapsed ? 'flex justify-center px-2 pb-4 pt-5' : 'px-5 pb-5 pt-6')}>
        <SiteImage src={collapsed ? '/logo-icon-white.png' : '/logo-white.png'} alt="CareStreamAI" className={clsx('w-auto max-w-full object-contain', collapsed ? 'h-9' : 'h-12')} />
        {!collapsed && (
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">
            Admin Portal
          </p>
        )}
      </div>

      {/* Nav */}
      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {sections.map(({ heading, iconColor, items }) => (
          <div key={heading} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {heading}
              </p>
            )}
            {items.map((item) => {
              const { href, label, Icon } = item
              const enterpriseItem = (item as { enterprise?: boolean }).enterprise
              // Training-only tenants see non-training features greyed (upsell), not gone.
              if (trainingOnly && !TRAINING_ONLY_NAV.has(href)) {
                return (
                  <div
                    key={href}
                    {...tipProps(`${label} — upgrade to full CareStream`)}
                    title={collapsed ? undefined : 'Upgrade to full CareStream to unlock this'}
                    className={clsx('mb-0.5 flex cursor-not-allowed items-center rounded-md py-2 text-sm font-medium text-white/30', collapsed ? 'justify-center px-0' : 'gap-3 px-3')}
                  >
                    <Icon size={16} className="text-white/20" />
                    {!collapsed && <><span className="flex-1">{label}</span><Lock size={12} className="text-white/30" /></>}
                  </div>
                )
              }
              // Enterprise-only items are shown greyed (upsell) on lower plans.
              if (enterpriseItem && !hasWorkforce) {
                return (
                  <div
                    key={href}
                    {...tipProps(`${label} — upgrade to Enterprise`)}
                    title={collapsed ? undefined : 'Upgrade to Enterprise to unlock this'}
                    className={clsx('mb-0.5 flex cursor-not-allowed items-center rounded-md py-2 text-sm font-medium text-white/30', collapsed ? 'justify-center px-0' : 'gap-3 px-3')}
                  >
                    <Icon size={16} className="text-white/20" />
                    {!collapsed && <><span className="flex-1">{label}</span><Lock size={12} className="text-white/30" /></>}
                  </div>
                )
              }
              const active = pathname === href || (!hasExactMatch && pathname.startsWith(href + '/'))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => { setTip(null); onNavigate?.() }}
                  {...tipProps(label)}
                  className={clsx(
                    'mb-0.5 flex items-center rounded-md py-2 text-sm font-medium transition-colors',
                    collapsed ? 'justify-center px-0' : 'gap-3 px-3',
                    active
                      ? clsx('bg-white/10 text-white', !collapsed && 'border-l-2 border-teal-light')
                      : 'text-white/70 hover:bg-white/10 hover:text-white',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={16} className={active ? 'text-teal-light' : iconColor} />
                  {!collapsed && label}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Back to portal */}
      <div className="border-t border-white/10 px-3 py-3">
        <Link
          href="/chat"
          onClick={() => { setTip(null); onNavigate?.() }}
          {...tipProps('Chat Hub')}
          className={clsx('flex items-center rounded-md py-2 text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white', collapsed ? 'justify-center px-0' : 'gap-3 px-3')}
        >
          <MessageSquare size={16} className="text-white/50" />
          {!collapsed && 'Chat Hub'}
        </Link>
      </div>

      {/* Instant hover label for the collapsed rail (fixed to the viewport so the
          sidebar's scroll never clips it). */}
      {collapsed && tip && (
        <div
          style={{ top: tip.top }}
          className="pointer-events-none fixed left-[68px] z-[60] -translate-y-1/2 whitespace-nowrap rounded-md bg-neutral-dark px-2.5 py-1 text-xs font-medium text-white shadow-lg"
        >
          {tip.label}
        </div>
      )}
    </>
  )
}
