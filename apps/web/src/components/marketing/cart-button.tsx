'use client'

import Link from 'next/link'
import { ShoppingCart, Bookmark } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { useSavedCourses } from '@/lib/saved-courses'
import { gbp } from '@/lib/training-commerce'

// Floating basket button — appears once there's something in the cart. When the
// cart is empty but courses have been saved for later, it becomes the way back to
// them (they live on /basket); without this a saved course would be unreachable.
export function CartButton() {
  const { totalQty, net } = useCart()
  const { items: saved } = useSavedCourses()

  if (totalQty === 0) {
    if (saved.length === 0) return null
    return (
      <Link
        href="/basket"
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full bg-neutral-dark px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-neutral-dark/25 transition-colors hover:bg-neutral-mid"
      >
        <span className="relative">
          <Bookmark size={20} />
          <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-neutral-dark">{saved.length}</span>
        </span>
        {saved.length === 1 ? '1 saved course' : `${saved.length} saved courses`}
      </Link>
    )
  }

  return (
    <Link
      href="/basket"
      className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-3 rounded-full bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-xl shadow-blue-600/30 transition-colors hover:bg-blue-700"
    >
      <span className="relative">
        <ShoppingCart size={20} />
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-blue-700">{totalQty}</span>
      </span>
      View basket · {gbp(net)}
      {saved.length > 0 && <span className="border-l border-white/30 pl-3 text-xs font-medium text-white/80">{saved.length} saved</span>}
    </Link>
  )
}
