'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordInput } from '@/app/(auth)/auth-fields'
import { SiteImage } from '@/components/site-image'
import '../signup.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// The create-account page, modelled on asana.com/create-account: the logo and nothing else at the
// top, one headline, and the work email first, so starting feels like one step. The rest of the
// details follow on the same page once the email is in. No Google or Microsoft sign-up: single
// sign-on is not set up yet.
//
// Everything the account needs is unchanged: organisation, name, email, password, the terms tick,
// the training-only tier (?tier=training_only), the email carried over from the home page form
// (?email=), and the redirect to check-email once the account exists.

// The client services shown on the home page, with the line it uses above them.
const LOGOS: [string, string][] = [
  ['/images/_shared/logo-crossways.png', 'Crossways Residential Care Home'],
  ['/images/_shared/logo-ferndale.png', 'Ferndale Nursing Home'],
  ['/images/home/laureate-court-care-home-4ef68227.png', 'Laureate Court Care Home'],
  ['/images/home/gateway-care-home-4a337d7d.png', 'Gateway Care Home'],
  ['/images/home/oakhall-nursing-home-0e95465f.png', 'Oakhall Nursing Home'],
  ['/images/home/queen-elizabeth-care-centre-9320c418.png', 'Queen Elizabeth Care Centre'],
]

type Step = 'email' | 'details'

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  // Training-only signup (à la carte training modules, no subscription) when the page is reached
  // as /register?tier=training_only. Read client-side to avoid an SSR/hydration mismatch.
  const [trainingOnly, setTrainingOnly] = useState(false)
  const orgRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get('tier') === 'training_only') setTrainingOnly(true)
    // The home page and /uses heroes ask for a work email and send it here, so the visitor goes
    // straight on to the rest of the details rather than typing it twice.
    const e = q.get('email')?.trim()
    if (e) { setEmail(e); setStep('details') }
  }, [])

  useEffect(() => {
    if (step === 'details') orgRef.current?.focus()
  }, [step])

  function continueWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setStep('details')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!agreed) {
      setError('Please confirm you have read and agree to the Terms and Conditions and Privacy Policy.')
      return
    }
    setError('')
    setLoading(true)
    const form = { org_name: orgName, name, email, password }
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trainingOnly ? { ...form, tier: 'training_only' } : form),
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
    setTimeout(() => router.push(`/check-email?email=${encodeURIComponent(email)}`), 1500)
  }

  return (
    <div className="csreg">
      <header className="rgtop">
        <Link href="/" aria-label="CareStream home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-color.svg" alt="CareStream" width={154} height={40} />
        </Link>
      </header>

      <main className="rgmain">
        {trainingOnly ? (
          <>
            <h1>Start with training modules</h1>
            <p className="rgsub">No subscription. Buy the courses you need at £25.99 per staff member, per course.</p>
          </>
        ) : (
          <>
            <h1>Start your 14 day free trial</h1>
            <p className="rgsub">Card required to start. No charge until day 14, cancel anytime.</p>
          </>
        )}

        {step === 'email' ? (
          <>
            <form className="rgemail" onSubmit={continueWithEmail}>
              <label htmlFor="email">Work email</label>
              <div className="rgjoin">
                <input
                  ref={emailRef}
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@yourcarehome.co.uk"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <button type="submit">Continue</button>
              </div>
              {/* The terms stated up front, as Asana does. The explicit tick on the next step
                  stays: it is the record that they agreed. */}
              <p className="rglegal">
                By signing up, I agree to CareStream&apos;s{' '}
                <Link href="/terms" target="_blank">Terms and Conditions</Link> and acknowledge the{' '}
                <Link href="/privacy" target="_blank">Privacy Policy</Link>.
              </p>
            </form>
            <p className="rgalt">Already have an account? <Link href="/login">Log in</Link></p>
          </>
        ) : (
          <form className="rgform" onSubmit={handleSubmit}>
            <p className="rgas">
              <span>Creating an account for <b>{email}</b></span>
              <button type="button" onClick={() => { setStep('email'); setTimeout(() => emailRef.current?.focus(), 0) }}>Change</button>
            </p>

            <div className="rgfield">
              <label htmlFor="org_name">Organisation name</label>
              <input ref={orgRef} id="org_name" type="text" required autoComplete="organization"
                     placeholder="Sunrise Care Home" value={orgName} onChange={e => setOrgName(e.target.value)} />
            </div>
            <div className="rgfield">
              <label htmlFor="name">Your full name</label>
              <input id="name" type="text" required autoComplete="name"
                     placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="rgfield">
              <label htmlFor="password">Password</label>
              <PasswordInput id="password" required minLength={8} autoComplete="new-password"
                             placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <label className="rgterms">
              <input type="checkbox" checked={agreed}
                     onChange={e => { setAgreed(e.target.checked); if (e.target.checked) setError('') }} />
              <span>
                I have read and agree to the <Link href="/terms" target="_blank">Terms and Conditions</Link> and{' '}
                <Link href="/privacy" target="_blank">Privacy Policy</Link>.
              </span>
            </label>

            {error && <p className="rgerr" role="alert">{error}</p>}
            {success && <p className="rgok" role="status">Account created. We&apos;ve sent a verification email, check your inbox.</p>}

            <button type="submit" className="rgbtn" disabled={loading || success || !agreed}>
              {loading ? 'Creating account…' : success ? 'Account created' : 'Create account'}
            </button>
            <p className="rgalt">Already have an account? <Link href="/login">Log in</Link></p>
          </form>
        )}
      </main>

      <section className="rgtrust" aria-label="Services using CareStream">
        <h2>Trusted by CQC-registered services across England</h2>
        <div className="rglogos">
          {LOGOS.map(([src, alt]) => (
            <span className="rglogo" key={src}><SiteImage src={src} alt={alt} /></span>
          ))}
        </div>
      </section>

      <footer className="rgfoot">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/contact">Contact</Link>
      </footer>
    </div>
  )
}
