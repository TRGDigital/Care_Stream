'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { CrossIcon, TickIcon, WarnIcon } from '../auth-fields'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [status, setStatus] = useState<'loading' | 'success' | 'already' | 'expired' | 'error'>('loading')
  const ranRef = useRef(false)

  // Verify automatically on load (the email click IS the confirmation, no extra
  // button; email scanners don't run JS, so the single-use token stays safe). On
  // success, auto-login with the one-time token the API returns and drop the user
  // into the trial/card step.
  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    ;(async () => {
      if (!token) { setStatus('error'); return }
      try {
        const res  = await fetch(`${API_URL}/auth/verify-email?token=${encodeURIComponent(token)}`)
        const body = await res.json()
        if (!body.success) {
          setStatus(body?.error?.code === 'TOKEN_EXPIRED' ? 'expired' : 'error')
          return
        }
        if (body.data?.login_token) {
          const r = await signIn('credentials', { mode: 'magic', token: body.data.login_token, redirect: false })
          if (r?.ok) { window.location.href = '/start'; return }
        }
        // Verified, but auto-login unavailable (e.g. link re-used): fall back to manual.
        setStatus(body.data?.already_verified ? 'already' : 'success')
      } catch {
        setStatus('error')
      }
    })()
  }, [token])

  if (status === 'loading') {
    return (
      <div className="lgstate">
        <div className="lgspin" />
        <p className="lgsub">Verifying your email and signing you in…</p>
      </div>
    )
  }

  if (status === 'success' || status === 'already') {
    return (
      <div className="lgstate">
        <div className="lgico good"><TickIcon /></div>
        <h1>Email verified</h1>
        <p className="lgsub">
          {status === 'already'
            ? 'Your email address has already been verified.'
            : 'Your email address has been confirmed. You can now sign in.'}
        </p>
        <Link href="/login" className="lgbtn solid">Sign in to your account</Link>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div className="lgstate">
        <div className="lgico warn"><WarnIcon /></div>
        <h1>Link expired</h1>
        <p className="lgsub">This verification link has expired. Request a new one and we&apos;ll send a fresh email.</p>
        <Link href="/check-email" className="lgbtn solid">Request a new link</Link>
      </div>
    )
  }

  return (
    <div className="lgstate">
      <div className="lgico bad"><CrossIcon /></div>
      <h1>Verification failed</h1>
      <p className="lgsub">This link is invalid or has already been used. Try requesting a new verification email.</p>
      <Link href="/check-email" className="lgbtn">Request a new link</Link>
      <p className="lgalt"><Link href="/login">Back to sign in</Link></p>
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
