'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { clearPlatformToken } from '@/lib/platform-api'
import {
  LayoutDashboard, Building2, BarChart2, BookOpen, FileText, LogOut, Sparkles, PoundSterling, Newspaper, ShieldCheck, ClipboardCheck, LineChart, UserPlus, GraduationCap, Mail, Lightbulb, Award, Languages, MessageSquareText, SearchCheck, ListChecks, LifeBuoy, ShoppingCart, Milestone,
} from 'lucide-react'

// Grouped so related tools sit together: business first, then the training shop,
// then the content/seed libraries that feed tenants, then languages + operations.
const NAV_GROUPS: Array<{ title: string | null; items: Array<{ href: string; label: string; Icon: any }> }> = [
  {
    title: null,
    items: [
      { href: '/platform/dashboard',       label: 'Dashboard',        Icon: LayoutDashboard },
    ],
  },
  {
    title: 'Clients & Revenue',
    items: [
      { href: '/platform/clients',         label: 'Clients',          Icon: Building2       },
      { href: '/platform/adoption',        label: 'Adoption',         Icon: Milestone       },
      { href: '/platform/revenue',         label: 'Revenue',          Icon: PoundSterling   },
      { href: '/platform/usage',           label: 'Usage',            Icon: BarChart2       },
      { href: '/platform/analytics',       label: 'AI Analytics',     Icon: LineChart       },
      { href: '/platform/onboarding-flows', label: 'Onboarding Flows', Icon: UserPlus       },
    ],
  },
  {
    title: 'Training Shop',
    items: [
      { href: '/platform/standard-training#annual', label: 'CPD Approved', Icon: Award },
      { href: '/platform/basket-analytics', label: 'Basket Analytics', Icon: ShoppingCart   },
      { href: '/platform/standard-training', label: 'Standard Training', Icon: GraduationCap },
      { href: '/platform/programmes',        label: 'Diplomas & Pathways', Icon: Award        },
      { href: '/platform/cpd-review',       label: 'CPD Review',       Icon: Award           },
    ],
  },
  {
    title: 'Policy & Compliance',
    items: [
      { href: '/platform/regulations',     label: 'Regulations',      Icon: BookOpen        },
      { href: '/platform/quality-statements', label: 'CQC Quality Statements', Icon: ListChecks },
      { href: '/platform/policy-lint',     label: 'Policy Stale Signals', Icon: SearchCheck   },
      { href: '/platform/policy-gaps',     label: 'Policy Gaps',      Icon: SearchCheck     },
      { href: '/platform/policy-seeds',    label: 'Policy Seeds',     Icon: FileText        },
    ],
  },
  {
    title: 'Seed Libraries',
    items: [
      { href: '/platform/training-seeds',  label: 'Training Seeds',   Icon: ShieldCheck     },
      { href: '/platform/cqc-seeds',       label: 'CQC Seeds',        Icon: ClipboardCheck  },
      { href: '/platform/audit-seeds',     label: 'Audit Seeds',      Icon: ClipboardCheck  },
      { href: '/platform/seeds',           label: 'Knowledge Seeds',  Icon: Sparkles        },
    ],
  },
  {
    title: 'Languages',
    items: [
      { href: '/platform/glossary',        label: 'Translation Glossary', Icon: Languages   },
      { href: '/platform/translation-changes', label: 'Translation Changes', Icon: MessageSquareText },
    ],
  },
  {
    title: 'Marketing & Ops',
    items: [
      { href: '/platform/blog',            label: 'Blog',             Icon: Newspaper       },
      { href: '/platform/email-marketing', label: 'Email Marketing',  Icon: Mail            },
      { href: '/platform/prompts',         label: 'AI Prompts',       Icon: FileText        },
      { href: '/platform/feature-requests', label: 'Feature Requests', Icon: Lightbulb      },
      { href: '/platform/service-requests', label: 'Service Requests', Icon: LifeBuoy        },
    ],
  },
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
          <Link href="/platform/dashboard" className="flex flex-col gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-color.svg" alt="CareStreamAI" className="h-9 w-auto" />
            <span className="text-xs text-neutral-mid">Platform Console</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Platform navigation">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.title ?? gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.title && (
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-neutral-mid/70">{group.title}</p>
              )}
              {group.items.map(({ href, label, Icon }) => {
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
            </div>
          ))}
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
