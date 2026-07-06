'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const FIELDS = [
  { key: 'org_name',  label: 'Organisation name',          type: 'text',     placeholder: 'Sunrise Care Home' },
  { key: 'name',      label: 'Your full name',              type: 'text',     placeholder: 'Jane Smith'        },
  { key: 'email',     label: 'Email address',               type: 'email',    placeholder: ''                  },
  { key: 'password',  label: 'Password (min. 8 characters)', type: 'password', placeholder: ''                  },
] as const

type FormKey = typeof FIELDS[number]['key']

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
    if (new URLSearchParams(window.location.search).get('tier') === 'training_only') setTrainingOnly(true)
  }, [])

  function update(key: FormKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      setError('Please confirm you have read and agree to the Terms & Conditions and Privacy Policy.')
      return
    }
    setError('')
    setLoading(true)

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

    setSuccess(true)
    setTimeout(() => router.push(`/check-email?email=${encodeURIComponent(form.email)}`), 1500)
  }

  return (
    <>
      {trainingOnly ? (
        <>
          <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Start with training modules</h1>
          <p className="mb-7 text-sm text-neutral-mid">No subscription. Create your account, then buy the training modules you need at £25.99 per staff member, per module.</p>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Start your 14-day free trial</h1>
          <p className="mb-7 text-sm text-neutral-mid">Card required to start — no charge until day 14, cancel anytime. Up and running in minutes.</p>
        </>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {FIELDS.map(({ key, label, type, placeholder }) => (
          <div key={key}>
            <label htmlFor={key} className="mb-1.5 block text-sm font-medium text-neutral-dark">
              {label}
            </label>
            <input
              id={key}
              type={type}
              required
              minLength={key === 'password' ? 8 : undefined}
              placeholder={placeholder || undefined}
              value={form[key]}
              onChange={update(key)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
            />
          </div>
        ))}
        {/* Terms & Conditions — must be ticked to create an account. */}
        <label className="flex cursor-pointer items-start gap-2.5 pt-1 text-sm text-neutral-mid">
          <input
            type="checkbox"
            checked={agreed}
            onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setError('') }}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-teal accent-teal focus:ring-teal"
          />
          <span>
            I have read and agree to the{' '}
            <Link href="/terms" target="_blank" className="font-medium text-teal hover:underline">Terms &amp; Conditions</Link>
            {' '}and{' '}
            <Link href="/privacy" target="_blank" className="font-medium text-teal hover:underline">Privacy Policy</Link>.
          </span>
        </label>
        {error && <p className="text-sm text-status-error">{error}</p>}
        {success && (
          <p className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            Account created! We&apos;ve sent a verification email — check your inbox.
          </p>
        )}
        <Button type="submit" className="w-full" size="lg" disabled={loading || success || !agreed}>
          {loading ? 'Creating account…' : success ? 'Account created!' : 'Create account'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-neutral-mid">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-teal hover:underline">
          Sign in
        </Link>
      </p>
    </>
  )
}
