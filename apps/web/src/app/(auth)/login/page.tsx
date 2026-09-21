'use client'

import { useEffect, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordInput } from '../auth-fields'

// Where to land after signing in: the page the user was on when their session
// expired (?callbackUrl=), else the last console page they visited (stored by
// the admin shell), else the dashboard. Only same-site relative paths.
// Inside the store app (cs_app cookie, set by middleware) CareStream is the staff hub only, so
// everyone lands in the hub and there is no "register" link to a paid signup.
const inStoreApp = () => /(?:^|;\s*)cs_app=(android|ios)\b/.test(document.cookie)

function postLoginTarget(): string {
  if (inStoreApp()) return '/chat'
  try {
    const cb = new URLSearchParams(window.location.search).get('callbackUrl')
    const safe = (p: string | null) => (p && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/login') ? p : null)
    return safe(cb) ?? safe(localStorage.getItem('cs_last_page')) ?? '/dashboard'
  } catch { return '/dashboard' }
}

export default function LoginPage() {
  const [inApp,    setInApp]    = useState(false)
  useEffect(() => { setInApp(inStoreApp()) }, [])
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [magicSent,    setMagicSent]    = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const router = useRouter()

  async function sendMagicLink() {
    if (!email.trim()) { setError('Enter your email address, then tap "Email me a sign-in link".'); return }
    setError(''); setMagicLoading(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/auth/magic-link/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }),
      })
      setMagicSent(true)
    } catch { setMagicSent(true) /* same UX, don't reveal */ }
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

    // Reload so the server layout picks up the new session, straight back to
    // wherever the user was working, not the dashboard.
    window.location.href = postLoginTarget()
  }

  return (
    <>
      <h1>Welcome back</h1>
      <p className="lgsub">Sign in to your CareStreamAI account</p>

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

        <div className="lgfield">
          <div className="lglabelrow">
            <label htmlFor="password">Password</label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="lgerr" role="alert">{error}</p>}

        <button type="submit" className="lgbtn solid" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Passwordless option, easier for care staff on a phone */}
      <div className="lgor"><span>or</span></div>

      {magicSent ? (
        <p className="lgsent" role="status">
          If that email is registered, a sign-in link is on its way. Open it on your phone, no password needed.
        </p>
      ) : (
        <>
          <button type="button" className="lgbtn ghost" onClick={sendMagicLink} disabled={magicLoading}>
            {magicLoading ? 'Sending…' : 'Email me a sign-in link'}
          </button>
          <p className="lghint">No password needed. Open the link on your phone.</p>
        </>
      )}

      {!inApp && <p className="lgalt">New to CareStream? <Link href="/register">Register your organisation</Link></p>}
    </>
  )
}
