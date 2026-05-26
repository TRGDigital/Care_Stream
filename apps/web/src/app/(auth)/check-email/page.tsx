'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function CheckEmailContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [resent,   setResent]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleResend() {
    setLoading(true)
    setError('')
    try {
      await fetch(`${API_URL}/auth/resend-verification`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      setResent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
        <svg className="h-8 w-8 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>

      <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Check your inbox</h1>
      <p className="mb-2 text-sm text-neutral-mid">
        We sent a verification link to
      </p>
      {email && (
        <p className="mb-6 font-medium text-neutral-dark">{email}</p>
      )}
      <p className="mb-8 text-sm text-neutral-mid">
        Click the link in the email to activate your account. The link expires in 24 hours.
      </p>

      {resent ? (
        <p className="mb-4 text-sm font-medium text-teal">Verification email resent.</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-neutral-mid">Didn&apos;t receive it?</p>
          <Button variant="outline" onClick={handleResend} disabled={loading} className="w-full">
            {loading ? 'Sending…' : 'Resend verification email'}
          </Button>
        </>
      )}

      {error && <p className="mt-3 text-sm text-status-error">{error}</p>}

      <p className="mt-6 text-sm text-neutral-mid">
        <Link href="/login" className="font-medium text-teal hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  )
}
