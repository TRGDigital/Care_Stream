import Link from 'next/link'
import type { ReactNode } from 'react'
import { SHOP_INFO_LINKS } from '@/lib/shop-info-links'
import './shop-info.css'

// The buyer information pages linked from the footer's "Buying training" column: what someone
// checks when they come back after an ad (the offer, team prices, refunds, CPD certification).
// Each ends with links to the others, so a returning buyer can find all of it.


export function ShopInfoPage({ eyebrow, title, lead, path, children }: { eyebrow: string; title: string; lead: ReactNode; path: string; children: ReactNode }) {
  return (
    <main className="shopinfo">
      <div className="si-wrap">
        <p className="si-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="si-lead">{lead}</p>
        {children}
        <nav className="si-related" aria-label="Buying training">
          {SHOP_INFO_LINKS.filter(l => l.href !== path).map(l => <Link key={l.href} href={l.href}>{l.label}</Link>)}
          <Link href="/staff-training">All courses</Link>
          <Link href="/contact">Contact us</Link>
        </nav>
      </div>
    </main>
  )
}

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

/** The price of one training licence, as the shop charges it. */
export async function getUnitPence(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/public/training/licence-price`, { next: { revalidate: 300 } })
    if (res.ok) return Number((await res.json())?.data?.unit_pence) || 2599
  } catch { /* fall through */ }
  return 2599
}
