'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import './shop-questions.css'
import './review-form.css'

// The review form linked from the review request email, 7 days after an order
// (services/shop/review-requests.ts). The link carries the order's token; the email's stars carry
// a starting rating. What is written goes to Funnel Insights › Feedback, and only appears on the
// site if the buyer ticks the consent box and Len approves it.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const SETTINGS = ['Care home', 'Nursing home', 'Home care', 'Supported living', 'Learning disability service', 'Other care service']

type Req = { product_name: string; name: string; org: string; done: boolean; preview: boolean }

/** "Sam Taylor" → "S. Taylor", the way reviews are credited on the site. */
const credit = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts.length > 1 ? `${parts[0]![0]}. ${parts[parts.length - 1]}` : parts[0] ?? ''
}

export function ReviewForm() {
  const params = useSearchParams()
  const token = params.get('t') ?? ''
  const [req, setReq] = useState<Req | null>(null)
  const [error, setError] = useState('')
  const [rating, setRating] = useState(() => Math.min(5, Math.max(0, Number(params.get('stars')) || 0)))
  const [hover, setHover] = useState(0)
  const [body, setBody] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [setting, setSetting] = useState('')
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<'form' | 'sending' | 'done'>('form')
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    if (!token) { setError('This review link is not complete. Please use the link in your email.'); return }
    // The preview email's link: show the form with a sample order and save nothing.
    if (token === 'preview') {
      setReq({ product_name: 'Care Certificate', name: 'Sam Taylor', org: 'Oakhaven Care Home', done: false, preview: true })
      setDisplayName('S. Taylor')
      return
    }
    fetch(`${API_URL}/public/shop/review?t=${encodeURIComponent(token)}`)
      .then(async r => {
        const b = await r.json().catch(() => null)
        if (!r.ok || !b?.data) throw new Error(b?.error ?? 'This review link is not valid.')
        setReq(b.data)
        setDisplayName(credit(b.data.name || ''))
      })
      .catch(e => setError(e?.message ?? 'This review link is not valid.'))
  }, [token])

  const send = async () => {
    setState('sending'); setError('')
    if (req?.preview) { setPreview(true); setState('done'); return }
    try {
      const r = await fetch(`${API_URL}/public/shop/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: token, rating, body, display_name: displayName, setting, consent }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error ?? 'We could not save your review. Please try again.')
      setPreview(!!b?.data?.preview)
      setState('done')
    } catch (e: any) {
      setError(e?.message ?? 'We could not save your review. Please try again.')
      setState('form')
    }
  }

  return (
    <section className="rvf">
      <div className="sq-card rvf-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sq-logo" src="/logo-color.svg" alt="CareStream" />
        {!req && !error && <p className="rvf-muted">Loading…</p>}
        {!req && error && <p className="rvf-err">{error} If you need help, email <a href="mailto:hello@carestreamai.com">hello@carestreamai.com</a>.</p>}

        {req && state === 'done' && (
          <>
            <h1>Thank you{req.name ? `, ${req.name.split(/\s+/)[0]}` : ''}</h1>
            <p>Your review helps other care managers choose the right training.{preview ? ' (Preview: nothing was saved.)' : ''}</p>
            {rating <= 3 && <p>We are sorry it was not better. A real person will read this and may get in touch to put it right.</p>}
            <Link href="/staff-training" className="sq-send rvf-link">Back to CareStream</Link>
          </>
        )}

        {req && state !== 'done' && (
          <>
            <h1>How is {req.product_name} going?</h1>
            <p className="rvf-muted">{req.done ? 'You have already left a review. Sending this again replaces it.' : 'Under a minute. Your answers help other care managers choose.'}</p>

            <p className="rvf-label">Your rating</p>
            <div className="rvf-stars" role="radiogroup" aria-label="Star rating" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map(n => (
                <button type="button" key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        className={(hover || rating) >= n ? 'on' : ''} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>★</button>
              ))}
            </div>

            <label className="rvf-label" htmlFor="rvf-body">Your review</label>
            <textarea id="rvf-body" value={body} onChange={e => setBody(e.target.value)} rows={5} maxLength={2000}
                      placeholder="What did your team think? What helped most?" />

            <div className="rvf-row">
              <div>
                <label className="rvf-label" htmlFor="rvf-name">Shown as</label>
                <input id="rvf-name" value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} placeholder="For example S. Taylor" />
              </div>
              <div>
                <label className="rvf-label" htmlFor="rvf-setting">Your service</label>
                <select id="rvf-setting" value={setting} onChange={e => setSetting(e.target.value)}>
                  <option value="">Choose one</option>
                  {SETTINGS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <label className="rvf-consent">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              <span>CareStream may show my review, with the name and service above, on its website.</span>
            </label>

            {error && <p className="rvf-err">{error}</p>}
            <button type="button" className="sq-send" disabled={!rating || body.trim().length < 3 || state === 'sending'} onClick={send}>
              {state === 'sending' ? 'Sending…' : 'Send my review'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
