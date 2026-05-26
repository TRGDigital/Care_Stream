'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Password updated</h1>
        <p className="mb-8 text-sm text-neutral-mid">
          Your password has been changed successfully. Redirecting you to sign in…
        </p>
        <Link href="/login">
          <Button className="w-full">Sign in now</Button>
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
          This reset link has expired. Request a new one and we&apos;ll send a fresh email.
        </p>
        <Link href="/forgot-password">
          <Button className="w-full">Request a new link</Button>
        </Link>
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Link invalid</h1>
        <p className="mb-8 text-sm text-neutral-mid">
          This reset link is invalid or has already been used.
        </p>
        <Link href="/forgot-password">
          <Button variant="secondary" className="w-full">Request a new link</Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Choose a new password</h1>
      <p className="mb-7 text-sm text-neutral-mid">Must be at least 8 characters.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-neutral-dark">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
        <div>
          <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-neutral-dark">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
        {error && <p className="text-sm text-status-error">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Updating password…' : 'Set new password'}
        </Button>
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
