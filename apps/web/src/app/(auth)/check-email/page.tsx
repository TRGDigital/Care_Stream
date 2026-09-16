'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MailIcon } from '../auth-fields'

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
    <div className="lgstate">
      <div className="lgico"><MailIcon /></div>

      <h1>Check your inbox</h1>
      <p className="lgsub">We sent a verification link to</p>
      {email && <p className="lgemail">{email}</p>}
      <p className="lgsub">Click the link in the email to activate your account. The link expires in 24 hours.</p>

      {resent ? (
        <p className="lgsent" role="status">Verification email resent.</p>
      ) : (
        <>
          <p className="lghint" style={{ margin: '0 0 10px' }}>Didn&apos;t receive it?</p>
          <button type="button" className="lgbtn" onClick={handleResend} disabled={loading}>
            {loading ? 'Sending…' : 'Resend verification email'}
          </button>
        </>
      )}

      {error && <p className="lgerr" role="alert" style={{ marginTop: 12 }}>{error}</p>}

      <p className="lgalt"><Link href="/login">Back to sign in</Link></p>
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
