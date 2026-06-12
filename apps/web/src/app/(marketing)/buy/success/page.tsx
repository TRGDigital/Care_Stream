import type { Metadata } from 'next'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { BuySuccess } from '@/components/marketing/buy-success'

export const metadata: Metadata = {
  title: 'Purchase complete | CareStreamAI',
  robots: { index: false, follow: false },
}

export default function BuySuccessPage() {
  return (
    <Suspense fallback={
      <section className="bg-neutral-light py-28 text-center">
        <Loader2 size={40} className="mx-auto animate-spin text-teal" />
      </section>
    }>
      <BuySuccess />
    </Suspense>
  )
}
