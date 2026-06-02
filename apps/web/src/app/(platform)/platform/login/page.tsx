'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { platformLogin, setPlatformToken } from '@/lib/platform-api'
import { Loader2 } from 'lucide-react'

export default function PlatformLoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const token = await platformLogin(email, password)
      setPlatformToken(token)
      router.push('/platform/dashboard')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-light p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="CareStreamAI" className="h-14 w-auto" />
          <p className="mt-3 text-sm text-neutral-mid">Platform owner access</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-dark">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your admin email"
                autoFocus
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-dark">
                Admin password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter platform admin password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal py-2.5 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
