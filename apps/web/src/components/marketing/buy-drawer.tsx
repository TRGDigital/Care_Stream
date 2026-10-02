'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { BuyForm } from './buy-form'
import './buy-page-v2.css'
import './buy-drawer.css'

// "Buy now" on a course page opens the buy panel as a drawer over the page, like a Shopify cart
// drawer, instead of going to /buy/<slug>. It is the same form as the buy page (BuyForm, theme
// variant), so the licences, offer, add-on, terms and checkout cannot drift apart. The /buy/
// pages stay published for search; they are just no longer a step in the purchase.
export function BuyDrawer({ slug, moduleName, unitPence }: { slug: string; moduleName: string; unitPence: number }) {
  const [open, setOpen] = useState<{ qty: number; n: number } | null>(null)

  useEffect(() => {
    const w = window as unknown as { __csBuyDrawer?: string }
    w.__csBuyDrawer = slug
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ slug: string; qty: number }>).detail
      if (d?.slug === slug) setOpen(o => ({ qty: Math.max(1, d.qty || 1), n: (o?.n ?? 0) + 1 }))
    }
    window.addEventListener('cs-buy-drawer', onOpen)
    return () => { window.removeEventListener('cs-buy-drawer', onOpen); if (w.__csBuyDrawer === slug) delete w.__csBuyDrawer }
  }, [slug])

  // Esc closes it; the page behind does not scroll while it is open.
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', key)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key) }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="bd-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(null) }}>
      <aside className="bd-panel" role="dialog" aria-modal="true" aria-label={`Buy ${moduleName}`}>
        <header className="bd-head">
          <div><b>Your order</b><span>{moduleName}</span></div>
          <button type="button" className="bd-close" aria-label="Close" onClick={() => setOpen(null)}>×</button>
        </header>
        <div className="bd-body bypage-v2">
          <div className="bybuy">
            <BuyForm key={open.n} slug={slug} moduleName={moduleName} unitPence={unitPence} variant="theme" initialQty={open.qty} />
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
