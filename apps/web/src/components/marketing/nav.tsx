'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import {
  Menu, X, ChevronDown,
  GraduationCap, Users, ClipboardList, Shield, HelpCircle, RefreshCw, MessageSquare, FileText,
  Heart, UserCheck, CheckCircle2, Target, Settings, BarChart2, BookOpen, ScanSearch,
  type LucideIcon,
} from 'lucide-react'

type MenuItem = {
  href: string
  label: string
  desc: string
  Icon: LucideIcon
  badge?: string
}

const SERVICES: MenuItem[] = [
  { href: '/staff-training',        label: 'Staff Training',        desc: 'Policy answers for care staff, instantly',              Icon: GraduationCap },
  { href: '/hr-policies',           label: 'HR Policies',           desc: 'Staff handbook access in any language',                  Icon: Users },
  { href: '/care-audits',           label: 'Care Audits',           desc: 'Guided digital audits with AI recommendations',          Icon: ClipboardList },
  { href: '/cqc-compliance',        label: 'CQC & Compliance',      desc: 'Readiness tracking and evidence management',             Icon: Shield },
  { href: '/policy-gap-detection',  label: 'Policy Gap Detection',  desc: 'Find gaps, track legal changes, auto-train staff',       Icon: ScanSearch, badge: 'Pro & Enterprise' },
  { href: '/cqc-staff-questions',   label: 'CQC Staff Questions',   desc: 'inspection preparation for your whole team',             Icon: HelpCircle },
  { href: '/business-continuity',   label: 'Business Continuity',   desc: 'Plans accessible to every staff member, any time',       Icon: RefreshCw },
  { href: '/cqc-report-chat',       label: 'CQC Report Chat',       desc: 'Chat directly with your inspection reports',             Icon: MessageSquare },
  { href: '/care-policies',         label: 'Care Policies',         desc: 'Digital policy management and distribution',             Icon: FileText },
]

const WHO_FOR: MenuItem[] = [
  { href: '/staff-training',       label: 'Care Workers',          desc: 'Policy answers in seconds, in any language',            Icon: Heart },
  { href: '/care-audits',          label: 'Registered Managers',   desc: 'Run audits and get instant AI recommendations',         Icon: UserCheck },
  { href: '/hr-policies',          label: 'HR and Admin Teams',    desc: 'Handbook queries answered 24/7 in any language',        Icon: Users },
  { href: '/cqc-compliance',       label: 'Compliance Leads',      desc: 'Track CQC readiness and gather evidence easily',        Icon: CheckCircle2 },
  { href: '/cqc-staff-questions',  label: 'Preparing for CQC',     desc: 'Ensure every staff member is ready for inspection',     Icon: Target },
  { href: '/business-continuity',  label: 'Operations Teams',      desc: 'Continuity plans every staff member can access',        Icon: Settings },
  { href: '/cqc-report-chat',      label: 'Quality Managers',      desc: 'Analyse reports and surface action items instantly',    Icon: BarChart2 },
  { href: '/care-policies',        label: 'Policy Managers',       desc: 'Distribute and update policies with confidence',        Icon: BookOpen },
]

function MegaMenuGrid({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-1">
      {items.map(({ href, label, desc, Icon, badge }) => (
        <Link
          key={href}
          href={href}
          onClick={onClose}
          className="group flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-neutral-light"
        >
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-teal/10 text-teal transition-colors group-hover:bg-teal group-hover:text-white">
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <p className="text-sm font-semibold text-neutral-dark">{label}</p>
              {badge && <span className="whitespace-nowrap rounded-full bg-amber-brand/15 px-1.5 py-[3px] text-[9px] font-bold uppercase leading-none tracking-wide text-amber-brand">{badge}</span>}
            </div>
            <p className="mt-0.5 text-xs leading-snug text-neutral-mid">{desc}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

function MobileAccordion({ label, items, onClose }: { label: string; items: MenuItem[]; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
      >
        {label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="ml-4 mt-1 flex flex-col gap-0.5">
          {items.map(({ href, label: itemLabel, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark"
            >
              <Icon size={14} className="text-teal" />
              {itemLabel}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeMenu, setActiveMenu] = useState<'services' | 'who' | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const openMenu = (menu: 'services' | 'who') => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setActiveMenu(menu)
  }

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setActiveMenu(null), 150)
  }

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 shadow-elevated backdrop-blur-md'
          : 'bg-white/90 backdrop-blur-sm border-b border-gray-100/80'
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-content items-center justify-between px-6">
        {/* Logo — the SVG is ~14KB and needs no image optimizer, and is NOT marked
            high-priority, so it doesn't compete with the hero image for the LCP fetch. */}
        <Link href="/" className="flex flex-shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="CareStreamAI" width={187} height={56} className="h-14 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 xl:flex">
          <Link
            href="/about"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark"
          >
            About Care Stream
          </Link>

          <Link
            href="/how-it-works"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark"
          >
            How It Works
          </Link>

          {/* Our Services mega menu */}
          <div
            className="relative"
            onMouseEnter={() => openMenu('services')}
            onMouseLeave={scheduleClose}
          >
            <button
              className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeMenu === 'services'
                  ? 'bg-neutral-light text-neutral-dark'
                  : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'
              }`}
            >
              Our Services
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${activeMenu === 'services' ? 'rotate-180' : ''}`}
              />
            </button>

            {activeMenu === 'services' && (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 pt-2"
                onMouseEnter={() => openMenu('services')}
                onMouseLeave={scheduleClose}
              >
                <div className="w-[620px] rounded-xl border border-gray-100 bg-white p-4 shadow-elevated">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Our Services</p>
                  <MegaMenuGrid items={SERVICES} onClose={() => setActiveMenu(null)} />
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <Link
                      href="/care-policies"
                      onClick={() => setActiveMenu(null)}
                      className="text-xs font-semibold text-teal hover:underline"
                    >
                      View all features →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Who It's For mega menu */}
          <div
            className="relative"
            onMouseEnter={() => openMenu('who')}
            onMouseLeave={scheduleClose}
          >
            <button
              className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeMenu === 'who'
                  ? 'bg-neutral-light text-neutral-dark'
                  : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'
              }`}
            >
              Who It&apos;s For
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${activeMenu === 'who' ? 'rotate-180' : ''}`}
              />
            </button>

            {activeMenu === 'who' && (
              <div
                className="absolute left-1/2 top-full -translate-x-1/2 pt-2"
                onMouseEnter={() => openMenu('who')}
                onMouseLeave={scheduleClose}
              >
                <div className="w-[620px] rounded-xl border border-gray-100 bg-white p-4 shadow-elevated">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">Who It&apos;s For</p>
                  <MegaMenuGrid items={WHO_FOR} onClose={() => setActiveMenu(null)} />
                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <Link
                      href="/who-its-for"
                      onClick={() => setActiveMenu(null)}
                      className="text-xs font-semibold text-teal hover:underline"
                    >
                      See all roles →
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/pricing"
            className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark"
          >
            Pricing
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 xl:flex">
          <Link
            href="/login"
            className="text-sm font-medium text-neutral-mid hover:text-neutral-dark"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="whitespace-nowrap rounded-btn border border-teal px-5 py-2.5 text-sm font-semibold text-teal transition-colors hover:bg-teal hover:text-white"
          >
            Free Trial
          </Link>
          <Link
            href="/demo"
            className="btn-amber whitespace-nowrap rounded-btn px-5 py-2.5 text-sm"
          >
            Book a Demo
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-neutral-mid hover:bg-neutral-light xl:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white/98 px-6 py-5 shadow-elevated backdrop-blur-md xl:hidden">
          <nav className="flex flex-col gap-1">
            <Link
              href="/about"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
            >
              About Care Stream
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
            >
              How It Works
            </Link>
            <MobileAccordion label="Our Services" items={SERVICES} onClose={() => setMobileOpen(false)} />
            <MobileAccordion label="Who It's For" items={WHO_FOR} onClose={() => setMobileOpen(false)} />
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
            >
              Pricing
            </Link>
            <hr className="my-2 border-gray-100" />
            <Link href="/login" onClick={() => setMobileOpen(false)} className="px-3 py-2 text-sm font-medium text-neutral-mid">
              Sign in
            </Link>
            <Link
              href="/register"
              onClick={() => setMobileOpen(false)}
              className="mt-1 rounded-btn border border-teal px-5 py-3 text-center text-sm font-semibold text-teal"
            >
              Start Free Trial
            </Link>
            <Link
              href="/demo"
              onClick={() => setMobileOpen(false)}
              className="btn-amber mt-1 rounded-btn px-5 py-3 text-center text-sm"
            >
              Book a Demo
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
