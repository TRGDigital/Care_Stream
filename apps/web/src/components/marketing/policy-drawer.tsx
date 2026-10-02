'use client'

import { CartDrawer } from './buy-drawer'
import { PolicyCheckout } from './checkout-page'
import './checkout-page.css'

/** The policy page's cart drawer: the policy basket (with its free policy picker, the offer, the
 *  priority add-on, details and checkout) in one column. Buy now adds the policy, then opens it. */
export function PolicyDrawer({ slug, title }: { slug: string; title: string }) {
  return (
    <CartDrawer slug={slug} base={`/care-policies/${slug}`} flag="__csPolicyDrawer" event="cs-policy-drawer"
                title="Your policy basket" subtitle={title}>
      {o => <PolicyCheckout key={o.n} compact onProgress={o.onProgress} />}
    </CartDrawer>
  )
}
