'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { AlertCircle, Loader2 } from 'lucide-react'

function LinkConsumer() {
  const params = useSearchParams()
  const router = useRouter()
  const [error, setError] = useState(false)

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setError(true); return }
    signIn('credentials', { mode: 'magic', token, redirect: false })
      .then(res => { if (res?.ok) router.replace('/chat'); else setError(true) })
      .catch(() => setError(true))
  }, [params, router])

  if (error) {
    return (
      <div className="text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
        <p className="font-medium text-neutral-dark">This sign-in link didn&apos;t work</p>
        <p className="mt-1 text-sm text-neutral-mid">It may have expired or already been used.</p>
        <a href="/login" className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark">Go to sign in</a>
      </div>
    )
  }
  return (
    <div className="text-center">
      <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-teal" />
      <p className="text-sm text-neutral-mid">Signing you in…</p>
    </div>
  )
}

export default function MagicLinkPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-light px-6">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-teal" />}>
        <LinkConsumer />
      </Suspense>
    </div>
  )
}
