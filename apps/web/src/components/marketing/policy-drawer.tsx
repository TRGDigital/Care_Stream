'use client'

import { useEffect } from 'react'
import { CartDrawer } from './buy-drawer'
import { PolicyCheckout } from './checkout-page'
import { ensureInPolicyBasket } from './policy-basket'
import './checkout-page.css'

/** The policy page's cart drawer: the policy basket (with its free policy picker, the offer, the
 *  priority add-on, details and checkout) in one column. Buy now adds the policy, then opens it. */
export function PolicyDrawer({ slug, title, pricePence }: { slug: string; title: string; pricePence: number }) {
  // Arriving on this policy's /cart address (a reload, a shared link): this policy is the order.
  useEffect(() => {
    if (location.pathname.endsWith('/cart')) ensureInPolicyBasket({ slug, title, price_pence: pricePence })
  }, [slug, title, pricePence])
  return (
    <CartDrawer slug={slug} base={`/care-policies/${slug}`} flag="__csPolicyDrawer" event="cs-policy-drawer"
                title="Your policy basket" subtitle={title}>
      {o => <PolicyCheckout key={o.n} compact onProgress={o.onProgress} />}
    </CartDrawer>
  )
}
