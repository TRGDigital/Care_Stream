import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ReviewForm } from '@/components/marketing/review-form'

export const metadata: Metadata = {
  title: 'Leave a review',
  robots: { index: false, follow: false },
}

export default function ReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewForm />
    </Suspense>
  )
}
