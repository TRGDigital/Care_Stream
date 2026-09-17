import type { Metadata } from 'next'
import { PolicyCheckout } from '@/components/marketing/checkout-page'

// The policy basket and checkout, in the design approved in the content theme. The basket lives
// in the browser (policy-basket); payment goes to the shop's hosted Stripe checkout, which
// re-prices every item from the catalogue.

export const metadata: Metadata = {
  title: 'Policy checkout | CareStreamAI',
  description: 'Review the policies in your basket and continue to secure payment.',
  alternates: { canonical: 'https://www.carestreamai.com/care-policies/checkout' },
  robots: { index: false, follow: true },
}

export default function PolicyCheckoutPage() {
  return <PolicyCheckout />
}
