'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CrossIcon, PasswordInput, TickIcon, WarnIcon } from '../auth-fields'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token  = searchParams.get('token') ?? ''
  const router = useRouter()

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [status,    setStatus]    = useState<'idle' | 'success' | 'expired' | 'invalid'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (!token) {
      setStatus('invalid')
      return
    }

    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/auth/reset-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, password }),
      })
      const body = await res.json()

      if (!res.ok || !body.success) {
        const code = body?.error?.code
        if (code === 'TOKEN_EXPIRED') { setStatus('expired'); return }
        setStatus('invalid')
        return
      }

      setStatus('success')
      setTimeout(() => router.push('/login'), 2500)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="lgstate">
        <div className="lgico good"><TickIcon /></div>
        <h1>Password updated</h1>
        <p className="lgsub">Your password has been changed successfully. Redirecting you to sign in…</p>
        <Link href="/login" className="lgbtn solid">Sign in now</Link>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="lgstate">
        <div className="lgico warn"><WarnIcon /></div>
        <h1>Link expired</h1>
        <p className="lgsub">This reset link has expired. Request a new one and we&apos;ll send a fresh email.</p>
        <Link href="/forgot-password" className="lgbtn solid">Request a new link</Link>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="lgstate">
        <div className="lgico bad"><CrossIcon /></div>
        <h1>Link invalid</h1>
        <p className="lgsub">This reset link is invalid or has already been used.</p>
        <Link href="/forgot-password" className="lgbtn">Request a new link</Link>
      </div>
    )
  }

  return (
    <>
      <h1>Choose a new password</h1>
      <p className="lgsub">Must be at least 8 characters.</p>
      <form className="lgfields" onSubmit={handleSubmit}>
        <div className="lgfield">
          <label htmlFor="password">New password</label>
          <PasswordInput
            id="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
        <div className="lgfield">
          <label htmlFor="confirm">Confirm new password</label>
          <PasswordInput
            id="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
        </div>
        {error && <p className="lgerr" role="alert">{error}</p>}
        <button type="submit" className="lgbtn solid" disabled={loading}>
          {loading ? 'Updating password…' : 'Set new password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  )
}
