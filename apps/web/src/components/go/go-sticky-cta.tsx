'use client'

import Link from 'next/link'

// Always-on-screen conversion bar for mobile PPC traffic, once the hero CTAs
// scroll away. Hidden on desktop (lg+), where the CTAs stay in view.
export function GoStickyCta({ buyHref }: { buyHref: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
      <Link
        href={buyHref}
        className="block w-full rounded-btn bg-blue-600 px-4 py-3.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Buy now for your team
      </Link>
    </div>
  )
}
