'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import { gbp } from '@/lib/training-commerce'

// Floating basket button — appears once there's something in the cart.
export function CartButton() {
  const { totalQty, net } = useCart()
  if (totalQty === 0) return null
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
    </Link>
  )
}
