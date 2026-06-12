'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, Mail, AlertTriangle } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type State = { status: 'working' | 'done' | 'error'; email?: string; message?: string }

export function BuySuccess() {
  const params = useSearchParams()
  const sessionId = params.get('session_id') ?? ''
  const [state, setState] = useState<State>({ status: 'working' })
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!sessionId) { setState({ status: 'error', message: 'Missing checkout reference.' }); return }
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/public/training/checkout/reconcile`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ session_id: sessionId }),
        })
        const body = await res.json()
        if (!res.ok || !body?.data?.provisioned) throw new Error(body?.error ?? 'We could not confirm your payment.')
        setState({ status: 'done', email: body.data.email })
      } catch (e: any) {
        setState({ status: 'error', message: e?.message ?? 'Something went wrong confirming your purchase.' })
      }
    })()
  }, [sessionId])

  return (
    <section className="bg-neutral-light py-20 md:py-28">
      <div className="mx-auto max-w-lg px-6 text-center">
        {state.status === 'working' && (
          <>
            <Loader2 size={40} className="mx-auto mb-6 animate-spin text-teal" />
            <h1 className="mb-2 text-2xl font-extrabold text-neutral-dark">Confirming your payment…</h1>
            <p className="text-neutral-mid">Just a moment while we set up your account.</p>
          </>
        )}

        {state.status === 'done' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={34} className="text-green-600" />
            </div>
            <h1 className="mb-3 text-3xl font-extrabold text-neutral-dark">You&apos;re all set!</h1>
            <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
              Payment received and your training account is ready. We&apos;ve emailed a secure sign-in link
              {state.email ? <> to <strong>{state.email}</strong></> : null}.
            </p>
            <div className="mb-8 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-neutral-dark shadow-card">
              <Mail size={16} className="text-teal" /> Check your inbox to sign in and assign your licences to staff.
            </div>
            <div>
              <Link href="/login" className="btn-amber rounded-btn px-8 py-3.5 text-sm">Go to sign in</Link>
            </div>
          </>
        )}

        {state.status === 'error' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle size={32} className="text-amber-600" />
            </div>
            <h1 className="mb-3 text-2xl font-extrabold text-neutral-dark">We hit a snag</h1>
            <p className="mb-6 leading-relaxed text-neutral-mid">
              {state.message} If you were charged, don&apos;t worry — email{' '}
              <a href="mailto:hello@carestreamai.com" className="font-semibold text-teal hover:underline">hello@carestreamai.com</a>{' '}
              and we&apos;ll sort it out straight away.
            </p>
            <Link href="/staff-training" className="rounded-btn border border-gray-200 px-8 py-3.5 text-sm font-semibold text-neutral-dark transition-colors hover:border-teal/40 hover:text-teal">Back to training</Link>
          </>
        )}
      </div>
    </section>
  )
}
