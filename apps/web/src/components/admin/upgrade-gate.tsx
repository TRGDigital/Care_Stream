'use client'

// Shared "this feature needs a higher plan" UI used to grey out and gate
// premium features across the admin console. Clicking through goes to /billing.

import Link from 'next/link'
import { Lock, Sparkles } from 'lucide-react'

// Small lock chip for tab labels / buttons.
export function LockChip({ tier = 'Enterprise' }: { tier?: string }) {
  return (
    <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
      <Lock size={9} /> {tier}
    </span>
  )
}

// Full upgrade panel — shown in place of (or over) a locked feature.
export function UpgradePanel({
  title,
  description,
  tier = 'Enterprise',
}: {
  title: string
  description: string
  tier?: string
}) {
  return (
    <div className="rounded-card border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-8 text-center shadow-card">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <Sparkles size={22} className="text-amber-600" />
      </div>
      <h3 className="mb-1.5 text-lg font-bold text-neutral-dark">{title}</h3>
      <p className="mx-auto mb-5 max-w-md text-sm leading-relaxed text-neutral-mid">{description}</p>
      <Link
        href="/billing"
        className="inline-flex items-center gap-2 rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-dark"
      >
        <Sparkles size={15} /> Upgrade to {tier}
      </Link>
      <p className="mt-3 text-xs text-neutral-mid">Unlocks instantly. Your existing data stays exactly as it is.</p>
    </div>
  )
}

// Greys out children (non-interactive) and overlays an upgrade call-to-action.
export function UpgradeOverlay({
  title,
  description,
  tier = 'Enterprise',
  children,
}: {
  title: string
  description: string
  tier?: string
  children: React.ReactNode
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1.5px]" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <UpgradePanel title={title} description={description} tier={tier} />
        </div>
      </div>
    </div>
  )
}
