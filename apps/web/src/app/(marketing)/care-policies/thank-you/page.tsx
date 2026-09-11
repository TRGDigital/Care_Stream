import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { PolicyPurchaseSuccess } from '@/components/marketing/policy-purchase-success'

export const metadata: Metadata = {
  title: 'Thank you | CareStreamAI',
  robots: { index: false, follow: false },
}

export default function PolicyThankYouPage() {
  return (
    <Suspense fallback={
      <section className="bg-neutral-light py-28 text-center">
        <Loader2 size={40} className="mx-auto animate-spin text-teal" />
      </section>
    }>
      <PolicyPurchaseSuccess />
    </Suspense>
  )
}
