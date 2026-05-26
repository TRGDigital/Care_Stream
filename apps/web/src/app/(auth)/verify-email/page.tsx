'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'expired' | 'error'>('idle')

  async function handleVerify() {
    if (!token) { setStatus('error'); return }
    setStatus('loading')
    try {
      const res  = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
      const body = await res.json()
      if (!body.success) {
        setStatus(body?.error?.code === 'TOKEN_EXPIRED' ? 'expired' : 'error')
        return
      }
      setStatus(body.data?.already_verified ? 'already' : 'success')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'idle') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
          <svg className="h-8 w-8 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Verify your email</h1>
        <p className="mb-8 text-sm text-neutral-mid">
          Click the button below to confirm your email address and activate your account.
        </p>
        <Button className="w-full" size="lg" onClick={handleVerify}>
          Confirm my email address
        </Button>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-teal border-t-transparent" />
        <p className="text-sm text-neutral-mid">Verifying your email address…</p>
      </div>
    )
  }

  if (status === 'success' || status === 'already') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Email verified</h1>
        <p className="mb-8 text-sm text-neutral-mid">
          {status === 'already'
            ? 'Your email address has already been verified.'
            : 'Your email address has been confirmed. You can now sign in.'}
        </p>
        <Link href="/login">
          <Button className="w-full">Sign in to your account</Button>
        </Link>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
          <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Link expired</h1>
        <p className="mb-8 text-sm text-neutral-mid">
          This verification link has expired. Request a new one and we&apos;ll send a fresh email.
        </p>
        <Link href="/check-email">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
        <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Verification failed</h1>
      <p className="mb-8 text-sm text-neutral-mid">
        This link is invalid or has already been used. Try requesting a new verification email.
      </p>
      <Link href="/check-email">
        <Button variant="secondary" className="w-full">Request a new link</Button>
      </Link>
      <p className="mt-4 text-sm text-neutral-mid">
        <Link href="/login" className="font-medium text-teal hover:underline">Back to sign in</Link>
      </p>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  )
}
