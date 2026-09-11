'use client'

// Where Stripe returns a policy-shop buyer. This page is not decoration: it is what
// CALLS reconcile, so without it a payment succeeds and nothing else happens — no
// account, no order, no email. The first live test stranded exactly that way.
//
// Guarded with a ref so React's double-invoke in development cannot fire reconcile
// twice; the endpoint is idempotent anyway, but a second call would be noise.

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Loader2, Mail, AlertTriangle, FileText } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type State =
  | { status: 'working' }
  | { status: 'done'; email?: string; created: number; newAccount: boolean }
  | { status: 'error'; message: string; sessionId: string }

export function PolicyPurchaseSuccess() {
  const params = useSearchParams()
  // Stripe is told `?session=`; accept `session_id` too so a hand-built URL works.
  const sessionId = params.get('session') ?? params.get('session_id') ?? ''
  const [state, setState] = useState<State>({ status: 'working' })
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!sessionId) {
      setState({ status: 'error', message: 'This link is missing its checkout reference.', sessionId: '' })
      return
    }
    ;(async () => {
      try {
        const res = await fetch(`${API_URL}/public/policy-shop/reconcile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        const body = await res.json()
        if (!res.ok || !body?.success) {
          throw new Error(body?.error?.message ?? 'We could not confirm that payment.')
        }
        setState({
          status: 'done',
          email: body.data.email,
          created: body.data.created ?? 0,
          newAccount: !!body.data.new_account,
        })
      } catch (e: any) {
        setState({
          status: 'error',
          message: e?.message ?? 'Something went wrong confirming your purchase.',
          sessionId,
        })
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
            <p className="text-neutral-mid">A moment while we set up your policies.</p>
          </>
        )}

        {state.status === 'done' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 size={34} className="text-green-600" />
            </div>
            <h1 className="mb-3 text-3xl font-extrabold text-neutral-dark">Thank you, that&apos;s all we need</h1>
            <p className="mb-6 text-lg leading-relaxed text-neutral-mid">
              Payment received. {state.created === 1 ? 'Your policy is' : `All ${state.created} policies are`} being
              written for your organisation now, and will be ready within <strong>2 working days</strong>.
            </p>
            <div className="mb-8 inline-flex items-start gap-2.5 rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-neutral-dark shadow-card">
              <Mail size={16} className="mt-0.5 shrink-0 text-teal" />
              <span>
                We&apos;ve emailed a secure sign-in link
                {state.email ? <> to <strong>{state.email}</strong></> : null}.
                {state.newAccount
                  ? ' It sets up your account, so there is nothing to fill in.'
                  : ' It is the same account you used before, so this sits alongside what you already have.'}
              </span>
            </div>
            <div>
              <Link href="/care-policies"
                className="inline-flex items-center gap-2 rounded-btn border-2 border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-neutral-dark hover:border-teal hover:text-teal">
                <FileText size={15} /> Browse the other policies
              </Link>
            </div>
          </>
        )}

        {state.status === 'error' && (
          <>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle size={32} className="text-amber-600" />
            </div>
            <h1 className="mb-3 text-2xl font-extrabold text-neutral-dark">Your payment went through</h1>
            <p className="mb-4 leading-relaxed text-neutral-mid">
              We took the payment but could not finish setting your policies up automatically.
              Nothing is lost and you have not been charged twice — we just need to finish it by hand.
            </p>
            <p className="mb-6 text-sm text-neutral-mid">
              Email <a href="mailto:hello@carestreamai.com" className="font-semibold text-teal underline">hello@carestreamai.com</a> quoting
              this reference and we will sort it today.
            </p>
            {state.sessionId && (
              <p className="mb-6 break-all rounded-lg bg-white px-4 py-3 font-mono text-xs text-neutral-dark shadow-card">
                {state.sessionId}
              </p>
            )}
            <p className="text-xs text-neutral-mid">{state.message}</p>
          </>
        )}
      </div>
    </section>
  )
}
