'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [magicSent,    setMagicSent]    = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const router = useRouter()

  async function sendMagicLink() {
    if (!email.trim()) { setError('Enter your email address, then tap “Email me a sign-in link”.'); return }
    setError(''); setMagicLoading(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/auth/magic-link/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
      })
      setMagicSent(true)
    } catch { setMagicSent(true) /* same UX — don't reveal */ }
    finally { setMagicLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      if (result.error === 'EMAIL_NOT_VERIFIED') {
        router.push(`/check-email?email=${encodeURIComponent(email)}`)
        return
      }
      if (result.error === 'ACCOUNT_LOCKED') {
        setError('Account is temporarily locked due to too many failed attempts. Please try again in 30 minutes.')
        return
      }
      setError('Invalid email or password.')
      return
    }

    // Reload so the server layout picks up the new session
    window.location.href = '/dashboard'
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Welcome back</h1>
      <p className="mb-7 text-sm text-neutral-mid">Sign in to your CareStreamAI account</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-dark">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-neutral-dark">
              Password
            </label>
            <Link href="/forgot-password" className="text-sm font-medium text-teal hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
          />
        </div>
        {error && <p className="text-sm text-status-error">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {/* Passwordless option — easier for care staff on a phone */}
      <div className="my-5 flex items-center gap-3 text-xs text-neutral-mid">
        <span className="h-px flex-1 bg-gray-200" /> or <span className="h-px flex-1 bg-gray-200" />
      </div>
      {magicSent ? (
        <p className="rounded-lg border border-teal/20 bg-teal-light/30 px-4 py-3 text-center text-sm text-neutral-dark">
          If that email is registered, a sign-in link is on its way. Open it on your phone — no password needed.
        </p>
      ) : (
        <button
          type="button"
          onClick={sendMagicLink}
          disabled={magicLoading}
          className="w-full rounded-md border border-teal px-3 py-2.5 text-sm font-medium text-teal hover:bg-teal hover:text-white transition-colors disabled:opacity-50"
        >
          {magicLoading ? 'Sending…' : 'Email me a sign-in link'}
        </button>
      )}

      <p className="mt-6 text-center text-sm text-neutral-mid">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-medium text-teal hover:underline">
          Register your organisation
        </Link>
      </p>
    </>
  )
}
