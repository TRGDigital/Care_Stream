'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordInput } from '../auth-fields'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const FIELDS = [
  { key: 'org_name', label: 'Organisation name', type: 'text',  placeholder: 'Sunrise Care Home',      autoComplete: 'organization' },
  { key: 'name',     label: 'Your full name',    type: 'text',  placeholder: 'Jane Smith',             autoComplete: 'name' },
  { key: 'email',    label: 'Email address',     type: 'email', placeholder: 'you@yourcarehome.co.uk', autoComplete: 'email' },
] as const

type FormKey = typeof FIELDS[number]['key'] | 'password'

// Kept deliberately short, like a create-account page: no site header, and no Google or
// Microsoft sign-up, which is not set up yet.
export default function RegisterPage() {
  const [form, setForm]     = useState<Record<FormKey, string>>({
    org_name: '', name: '', email: '', password: '',
  })
  const [error,        setError]        = useState('')
  const [loading,      setLoading]      = useState(false)
  const [success,      setSuccess]      = useState(false)
  const [agreed,       setAgreed]       = useState(false)
  // Training-only signup (à la carte training modules, no subscription) when the
  // page is reached as /register?tier=training_only. Read client-side to avoid an
  // SSR/hydration mismatch.
  const [trainingOnly, setTrainingOnly] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('tier') === 'training_only') setTrainingOnly(true)
    // The /uses hero asks for a work email and sends it here, so the visitor does not type it
    // twice. Read the same way as tier, for the same reason: no SSR/hydration mismatch.
    const email = q.get('email')?.trim()
    if (email) setForm(prev => ({ ...prev, email }))
  }, [])

  function update(key: FormKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      setError('Please confirm you have read and agree to the Terms and Conditions and Privacy Policy.')
      return
    }
    setError('')
    setLoading(true)

    try {
      const res  = await fetch(`${API_URL}/auth/register`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(trainingOnly ? { ...form, tier: 'training_only' } : form),
      })
      const body = await res.json()

      if (!res.ok || !body.success) {
        setError(body.error?.message ?? 'Registration failed. Please try again.')
        setLoading(false)
        return
      }
    } catch {
      setError('Registration failed. Please try again.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push(`/check-email?email=${encodeURIComponent(form.email)}`), 1500)
  }

  return (
    <>
      {trainingOnly ? (
        <>
          <h1>Start with training modules</h1>
          <p className="lgsub">
            No subscription. Create your account, then buy the training modules you need at £25.99 per staff member, per module.
          </p>
        </>
      ) : (
        <>
          <h1>Start your 14 day free trial</h1>
          <p className="lgsub">Card required to start. No charge until day 14, cancel anytime. Up and running in minutes.</p>
        </>
      )}

      <form className="lgfields" onSubmit={handleSubmit}>
        {FIELDS.map(({ key, label, type, placeholder, autoComplete }) => (
          <div className="lgfield" key={key}>
            <label htmlFor={key}>{label}</label>
            <input
              id={key}
              type={type}
              required
              autoComplete={autoComplete}
              placeholder={placeholder}
              value={form[key]}
              onChange={update(key)}
            />
          </div>
        ))}

        <div className="lgfield">
          <label htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update('password')}
          />
          <p className="lgnote">Minimum 8 characters.</p>
        </div>

        {/* Terms and Conditions: must be ticked to create an account. */}
        <label className="rgterms">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setError('') }}
          />
          <span>
            I have read and agree to the{' '}
            <Link href="/terms" target="_blank">Terms and Conditions</Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank">Privacy Policy</Link>.
          </span>
        </label>

        {error && <p className="lgerr" role="alert">{error}</p>}
        {success && (
          <p className="lgok" role="status">Account created. We&apos;ve sent a verification email, check your inbox.</p>
        )}

        <button type="submit" className="lgbtn solid" disabled={loading || success || !agreed}>
          {loading ? 'Creating account…' : success ? 'Account created' : 'Create account'}
        </button>
      </form>

      <p className="lgalt">Already have an account? <Link href="/login">Sign in</Link></p>
    </>
  )
}
