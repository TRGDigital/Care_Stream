'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { AlertCircle, Loader2, LogIn } from 'lucide-react'

// Magic-link landing. The token is SINGLE-USE, so it must only be consumed on a
// human click — email security scanners (Microsoft Safe Links etc.) pre-render
// links, and the previous auto-consume-on-load burned the token before the real
// user arrived ("this link didn't work"). A button click is invisible to scanners.
function LinkConsumer() {
  const params = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<'ready' | 'busy' | 'error'>('ready')

  const token = params.get('token')

  async function consume() {
    if (!token || state === 'busy') return
    setState('busy')
    try {
      const res = await signIn('credentials', { mode: 'magic', token, redirect: false })
      if (res?.ok) router.replace('/chat')
      else setState('error')
    } catch {
      setState('error')
    }
  }

  if (!token || state === 'error') {
    return (
      <div className="text-center">
        <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
        <p className="font-medium text-neutral-dark">This sign-in link didn&apos;t work</p>
        <p className="mt-1 text-sm text-neutral-mid">It may have expired or already been used. You can sign in with your password, or request a new link from the sign-in page.</p>
        <a href="/login" className="mt-4 inline-block rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark">Go to sign in</a>
      </div>
    )
  }

  return (
    <div className="text-center">
      <p className="mb-1 text-lg font-semibold text-neutral-dark">Sign in to CareStream</p>
      <p className="mb-5 text-sm text-neutral-mid">Click below to finish signing in securely.</p>
      <button
        onClick={consume}
        disabled={state === 'busy'}
        className="inline-flex items-center gap-2 rounded-lg bg-teal px-6 py-3 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-60"
      >
        {state === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {state === 'busy' ? 'Signing you in…' : 'Sign me in'}
      </button>
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
