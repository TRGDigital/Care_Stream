'use client'

import type { SignupContext } from '@/lib/signup-context'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PasswordInput } from '@/app/(auth)/auth-fields'
import { SiteImage } from '@/components/site-image'
import { REVIEWS } from '@/lib/reviews'
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

// What the free account includes. Four rows, a bold name and one line each.
const PERKS: Array<{ title: string; text: string }> = [
  { title: 'CPD certified training', text: 'The Care Certificate and annual refreshers for every member of staff, with certificates and a training matrix.' },
  { title: '100+ audits', text: 'Every audit template, with scoring, reports and action plans.' },
  { title: 'Policy check', text: 'Gap analysis on your first 5 policies.' },
  { title: 'Unlimited staff logins', text: 'Add as many people as you need.' },
]

type Step = 'email' | 'details'

export interface RegisterInitial {
  tier: 'free' | 'training_only' | 'full'
  source: string
  course: string
  code: string
  email: string
  ctx: SignupContext | null
}

// Everything that depends on the link (free or trial, where they came from, a pre-filled email) is worked out on the
// server and passed in, so the first paint already shows the right heading: nothing changes after the page loads.
export function RegisterForm({ initial }: { initial: RegisterInitial }) {
  const [step, setStep] = useState<Step>(initial.email ? 'details' : 'email')
  const [email, setEmail] = useState(initial.email)
  const [orgName, setOrgName] = useState('')
  const [name, setName] = useState('')
  const [careSetting, setCareSetting] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  // Training-only signup (à la carte training modules, no subscription) when the page is reached
  // as /register?tier=training_only. Read client-side to avoid an SSR/hydration mismatch.
  const [trainingOnly] = useState(initial.tier === 'training_only')
  // Free account (dark launch): /register?tier=free&code=<private preview code>. The code is read from
  // the address and sent to the API; it is never shown on the page.
  const [freeTier] = useState(initial.tier === 'free')
  const [courseSlug] = useState(initial.course)
  const [signupSource] = useState(initial.source)
  const [previewCode] = useState(initial.code)
  const [trap, setTrap] = useState('')   // honeypot: real people never fill this in
  const ctx = freeTier ? initial.ctx : null
  const orgRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

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
    const form = { org_name: orgName, name, email, password, ...(careSetting ? { care_setting: careSetting } : {}) }
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(freeTier ? { ...form, tier: 'free', preview_code: previewCode || undefined, company_website: trap || undefined, course: courseSlug || undefined, source: signupSource || undefined } : trainingOnly ? { ...form, tier: 'training_only' } : form),
      })
      const body = await res.json()
      if (!res.ok || !body.success) {
        // The free plan is dark until it launches: a closed or wrong preview code comes back as a
        // validation error, which is not a useful thing to show a person.
        setError(freeTier && body.error?.code === 'VALIDATION_ERROR'
          ? 'Free accounts are not open yet. If you were given a link, please check you copied all of it, or contact us.'
          : body.error?.message ?? 'Registration failed. Please try again.')
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
        {freeTier ? (
          <>
            <div className="rghead">
              <h1 className={ctx ? ((ctx.title.length > 46 ? 'rgh1-long ' : '') + 'rgh1-ctx') : undefined}>{ctx ? ctx.title : 'Create your free account'}</h1>
              <p className="rgsub">{ctx ? ctx.sub : 'No card needed. Free for your whole team, for as long as you like.'}</p>
            </div>
            <section className="rgperks" aria-label="What you get free">
              <p className="rgperks-h">What you get, free</p>
              <ul>
                {PERKS.map(p => (
                  <li key={p.title}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
                    <span><b>{p.title}</b><em>{p.text}</em></span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : trainingOnly ? (
          <>
            <div className="rghead">
              <h1>Start with training modules</h1>
              <p className="rgsub">No subscription. Buy the courses you need at £25.99 per staff member, per course.</p>
            </div>
          </>
        ) : (
          <>
            <div className="rghead">
              <h1>Start your 14 day free trial</h1>
              <p className="rgsub">Card required to start. No charge until day 14, cancel anytime.</p>
            </div>
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
            {freeTier && (
              <input type="text" name="company_website" tabIndex={-1} autoComplete="off" aria-hidden="true"
                     value={trap} onChange={e => setTrap(e.target.value)}
                     style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            )}
            <div className="rgfield">
              <label htmlFor="care_setting">What type of service do you run?</label>
              <select id="care_setting" value={careSetting} onChange={e => setCareSetting(e.target.value)}>
                <option value="">Choose one (you can change it later)</option>
                <option value="residential-care">Residential care home</option>
                <option value="nursing-homes">Nursing home</option>
                <option value="domiciliary-care">Home care (domiciliary)</option>
                <option value="live-in-care">Live-in care</option>
                <option value="complex-care">Complex care</option>
                <option value="shared-lives">Shared Lives</option>
                <option value="substance-misuse">Substance misuse and rehab</option>
                <option value="hospices">Hospice</option>
                <option value="independent-hospitals">Independent hospital or clinic</option>
                <option value="gp-practices">GP or primary care</option>
                <option value="dental-practices">Dental practice</option>
              </select>
              <p className="rghelp">We use this to suggest the audits and training that suit you.</p>
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
              {loading ? 'Creating account…' : success ? 'Account created' : freeTier ? 'Create free account' : 'Create account'}
            </button>
            <p className="rgalt">Already have an account? <Link href="/login">Log in</Link></p>
          </form>
        )}
        {freeTier && (
          <p className="rgpaid">Need more later? Paid plans add AI recommendations at the end of audits, more than 5 policies, staff Q&amp;A, face-to-face training and the CQC evidence pack.</p>
        )}
      </main>

      <section className="rgreviews" aria-label="Customer reviews">
        <h2>What care providers say</h2>
        <div className="rgrevs">
          {REVIEWS.map(rv => (
            <figure key={rv.name}>
              <blockquote>&ldquo;{rv.excerpt}&rdquo;</blockquote>
              <figcaption><b>{rv.name}</b>, {rv.setting}</figcaption>
            </figure>
          ))}
        </div>
      </section>

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
