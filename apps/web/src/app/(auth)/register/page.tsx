'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
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
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function update(key: FormKey) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res  = await fetch(`${API_URL}/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    })
    const body = await res.json()

    if (!res.ok || !body.success) {
      setError(body.error?.message ?? 'Registration failed. Please try again.')
      setLoading(false)
      return
    }

    await signIn('credentials', { email: form.email, password: form.password, redirect: false })
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-bold text-neutral-dark">Start your 14-day free trial</h1>
      <p className="mb-7 text-sm text-neutral-mid">No credit card required. Up and running in minutes.</p>
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
        {error && <p className="text-sm text-status-error">{error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
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
