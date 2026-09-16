'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailIcon } from '../auth-fields'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await fetch(`${API_URL}/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="lgstate">
        <div className="lgico"><MailIcon /></div>
        <h1>Check your inbox</h1>
        <p className="lgsub">If an account exists for</p>
        <p className="lgemail">{email}</p>
        <p className="lgsub">we&apos;ve sent a password reset link. The link expires in 1 hour.</p>
        <p className="lgalt"><Link href="/login">Back to sign in</Link></p>
      </div>
    )
  }

  return (
    <>
      <h1>Reset your password</h1>
      <p className="lgsub">Enter your email address and we&apos;ll send you a link to reset your password.</p>
      <form className="lgfields" onSubmit={handleSubmit}>
        <div className="lgfield">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@yourcarehome.co.uk"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>
        {error && <p className="lgerr" role="alert">{error}</p>}
        <button type="submit" className="lgbtn solid" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p className="lgalt"><Link href="/login">Back to sign in</Link></p>
    </>
  )
}
